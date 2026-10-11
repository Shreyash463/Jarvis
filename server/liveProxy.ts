/**
 * Gemini Live WebSocket Proxy Handler
 * Bridges client browser audio with Gemini Live API (gemini-3.8-live)
 * 
 * Features:
 * - 16 kHz 16-bit PCM input streaming from client AudioWorklet
 * - 24 kHz PCM output streaming to client gapless queue
 * - Output audio transcription + Input audio transcription for synchronized captions
 * - Barge-in interruption detection
 * - British butler Jarvis persona with Live context and Honesty Rule
 * - Session resumption and reconnection support
 */

import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

interface LiveContextPayload {
  userName?: string;
  currentTime?: string;
  events?: Array<{ title: string; start: string; end?: string; location?: string }>;
  emails?: { unreadCount: number; latest?: { from: string; subject: string; snippet?: string } };
  tasks?: Array<{ title: string; done: boolean; due?: string }>;
  weather?: { city: string; tempC: number; condition: string; humidity: number; windKph: number };
  recentTurns?: Array<{ role: "user" | "assistant"; text: string }>;
  voiceName?: string;
}

function buildLiveSystemInstruction(context?: LiveContextPayload): string {
  const userName = context?.userName?.trim() || "Shreyash";
  const currentTime =
    context?.currentTime ||
    new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  let contextDataText = `Current Local Date & Time (Asia/Kolkata): ${currentTime}\nUser Name: ${userName}\n`;

  if (context?.weather) {
    contextDataText += `Weather: ${context.weather.city}, ${context.weather.tempC}°C, ${context.weather.condition}, Humidity ${context.weather.humidity}%, Wind ${context.weather.windKph} km/h\n`;
  }

  if (context?.events && context.events.length > 0) {
    contextDataText +=
      `Today's Calendar Events:\n` +
      context.events
        .map(
          (e) =>
            `  - ${e.title} (${e.start}${e.end ? " - " + e.end : ""})${e.location ? " at " + e.location : ""}`
        )
        .join("\n") +
      "\n";
  } else {
    contextDataText += `Today's Calendar Events: None scheduled\n`;
  }

  if (context?.emails) {
    contextDataText += `Inbox: ${context.emails.unreadCount} unread email(s).`;
    if (context.emails.latest) {
      contextDataText += ` Latest from: ${context.emails.latest.from} - "${context.emails.latest.subject}"`;
    }
    contextDataText += "\n";
  }

  if (context?.tasks && context.tasks.length > 0) {
    const doneCount = context.tasks.filter((t) => t.done).length;
    contextDataText +=
      `Tasks (${doneCount}/${context.tasks.length} done):\n` +
      context.tasks
        .map(
          (t) =>
            `  - [${t.done ? "X" : " "}] ${t.title}${t.due ? " (due " + t.due + ")" : ""}`
        )
        .join("\n") +
      "\n";
  }

  if (context?.recentTurns && context.recentTurns.length > 0) {
    contextDataText += `Recent conversation context:\n`;
    for (const turn of context.recentTurns.slice(-10)) {
      contextDataText += `${turn.role === "user" ? userName : "Jarvis"}: ${turn.text}\n`;
    }
    contextDataText += "\n";
  }

  return `You are JARVIS, a calm, polite, slightly witty British AI butler. Address the user as "sir" (or by name "${userName}" occasionally).
Keep answers short and concise (1 to 3 sentences) unless the user asks for detail.
Never mention being an AI language model.
Speak naturally with smooth pacing.

REAL CONTEXT DATA:
${contextDataText}

HONESTY & CAPABILITY RULES:
You currently cannot perform actions: you cannot set reminders or alarms, send emails or messages, edit the calendar, open apps, play music, or control any device. If asked, say plainly and politely that this ability is not connected yet, and offer what you can do right now (answer from the dashboard data, explain, plan, or draft text the user can copy). Never say or imply that you will remind, have noted, have sent, or have done anything. Only claim an action if a tool result confirms it. Never invent events, times or facts that are not in the data. If something is not in the data, say you do not have access to it yet.`;
}

export function setupLiveWebSocketServer(server: any) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: any, socket: any, head: any) => {
    const pathname = (req.url ? req.url.split("?")[0] : "").replace(/\/$/, "");
    if (pathname === "/api/live" || pathname === "/live") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    }
  });

  wss.on("connection", async (clientWs: WebSocket) => {
    console.log("[LiveProxy] Client connected to Live WebSocket");
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      clientWs.send(
        JSON.stringify({
          type: "error",
          error: "GEMINI_API_KEY is not configured on the server.",
        })
      );
      clientWs.close();
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    let session: any = null;
    let isSessionReady = false;
    let pendingQueue: any[] = [];
    let initialContext: LiveContextPayload = {};
    let chosenVoice = "Charon";

    const initLiveSession = async (context: LiveContextPayload) => {
      try {
        initialContext = context;
        chosenVoice = context.voiceName || "Charon";
        console.log(`[LiveProxy] Initializing Gemini Live session with voice ${chosenVoice}...`);

        session = await ai.live.connect({
          model: "gemini-3.8-live",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: chosenVoice,
                },
              },
            },
            systemInstruction: buildLiveSystemInstruction(context),
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
          callbacks: {
            onmessage: (msg: LiveServerMessage) => {
              try {
                // 1. Audio data chunks (24 kHz PCM)
                const parts = msg.serverContent?.modelTurn?.parts;
                if (parts && parts.length > 0) {
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      clientWs.send(
                        JSON.stringify({
                          type: "audio",
                          data: part.inlineData.data,
                          mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000",
                        })
                      );
                    }
                  }
                }

                // 2. Output audio transcription (Jarvis captions)
                const outputTrans = (msg.serverContent as any)?.outputTranscription;
                if (outputTrans?.text) {
                  clientWs.send(
                    JSON.stringify({
                      type: "output_transcript",
                      text: outputTrans.text,
                    })
                  );
                }

                // 3. Input audio transcription (User captions)
                const inputTrans = (msg.serverContent as any)?.inputTranscription;
                if (inputTrans?.text) {
                  clientWs.send(
                    JSON.stringify({
                      type: "input_transcript",
                      text: inputTrans.text,
                    })
                  );
                }

                // 4. Interruption (barge-in detected by Gemini Live)
                if (msg.serverContent?.interrupted) {
                  console.log("[LiveProxy] Interruption detected from Gemini Live");
                  clientWs.send(
                    JSON.stringify({
                      type: "interrupted",
                    })
                  );
                }

                // 5. Turn complete
                if (msg.serverContent?.turnComplete) {
                  clientWs.send(
                    JSON.stringify({
                      type: "turn_complete",
                    })
                  );
                }
              } catch (msgErr) {
                console.error("[LiveProxy] Error handling Gemini Live message:", msgErr);
              }
            },
            onclose: (closeEvt: any) => {
              console.log("[LiveProxy] Gemini Live session closed:", closeEvt?.reason || "Normal closure");
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(
                  JSON.stringify({
                    type: "session_closed",
                    reason: closeEvt?.reason || "Closed",
                  })
                );
              }
            },
            onerror: (err: any) => {
              console.error("[LiveProxy] Gemini Live session error:", err?.message || err);
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(
                  JSON.stringify({
                    type: "error",
                    error: err?.message || "Gemini Live session error",
                  })
                );
              }
            },
          },
        });

        isSessionReady = true;
        console.log("[LiveProxy] Gemini Live session connected successfully");
        clientWs.send(
          JSON.stringify({
            type: "connected",
            voice: chosenVoice,
            model: "gemini-3.8-live",
          })
        );

        // Flush queued messages
        while (pendingQueue.length > 0) {
          const item = pendingQueue.shift();
          sendToSession(item);
        }
      } catch (connErr: any) {
        console.error("[LiveProxy] Failed to connect to Gemini Live:", connErr);
        clientWs.send(
          JSON.stringify({
            type: "error",
            error: connErr?.message || "Failed to establish Live session",
          })
        );
      }
    };

    const sendToSession = (payload: any) => {
      if (!session || !isSessionReady) {
        pendingQueue.push(payload);
        return;
      }

      try {
        if (payload.type === "audio") {
          session.sendRealtimeInput({
            audio: {
              data: payload.data,
              mimeType: payload.mimeType || "audio/pcm;rate=16000",
            },
          });
        } else if (payload.type === "text") {
          session.sendRealtimeInput({
            text: payload.text,
          });
        }
      } catch (sendErr) {
        console.error("[LiveProxy] Error sending to Gemini Live session:", sendErr);
      }
    };

    clientWs.on("message", async (rawMessage: Buffer) => {
      try {
        const payload = JSON.parse(rawMessage.toString());

        if (payload.type === "init") {
          await initLiveSession(payload.context || {});
        } else if (payload.type === "audio" || payload.type === "text") {
          sendToSession(payload);
        } else if (payload.type === "context_update") {
          // Re-inject updated context if requested
          if (session && payload.context) {
            initialContext = { ...initialContext, ...payload.context };
          }
        }
      } catch (parseErr) {
        console.error("[LiveProxy] Error parsing client message:", parseErr);
      }
    });

    clientWs.on("close", () => {
      console.log("[LiveProxy] Client disconnected, closing Live session");
      if (session) {
        try {
          session.close();
        } catch {}
        session = null;
      }
    });

    clientWs.on("error", (wsErr) => {
      console.error("[LiveProxy] Client WS error:", wsErr);
    });
  });

  return wss;
}

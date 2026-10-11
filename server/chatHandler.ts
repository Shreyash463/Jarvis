/**
 * Server-Side Gemini Chat Stream Handler
 * Securely communicates with the Gemini API using GEMINI_API_KEY.
 * 
 * Implements:
 * 1. Startup self-test calling Gemini ("Say hi in 3 words") with timing logs
 * 2. GET /api/chat-health endpoint testing live connectivity and returning { ok, model, ms, error }
 * 3. Step-by-step console logs (request received, body parsed, Gemini started, first chunk, finished, full stack error)
 * 4. Fastest Flash-class models: gemini-3.1-flash-lite -> gemini-flash-lite-latest -> gemini-3.5-flash
 * 5. 4-second timeout: falls back to non-streaming generateContent returned directly
 * 6. Flushed SSE streaming (Content-Type: text/event-stream, Cache-Control: no-cache, X-Accel-Buffering: no, flushHeaders)
 * 7. System prompt context injection (Asia/Kolkata date/time, user name, calendar, inbox, tasks, weather)
 * 8. thinkingBudget: 0 (thinking off/minimal) for maximum speed and zero latency penalty
 */

import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || "";
console.log(`[server] GEMINI_API_KEY status: ${apiKey ? `LOADED (length: ${apiKey.length})` : "MISSING"}`);

export const aiClient = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Verified operational Flash models ordered by latency and quota stability
export const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
];

// Active model determined by startup self-test or fallback
let activeModel = "gemini-3.1-flash-lite";

/**
 * Startup Self-Test: called on server start to verify Gemini connectivity
 */
export async function runStartupSelfTest(): Promise<{ ok: boolean; model: string; ms: number; error?: string }> {
  console.log("\n=======================================================");
  console.log("[server] RUNNING STARTUP SELF-TEST: Calling Gemini API...");
  console.log("=======================================================");

  if (!aiClient) {
    const msg = "GEMINI_API_KEY is not defined in server environment variables.";
    console.error(`[server] SELF-TEST FAILED: ${msg}`);
    return { ok: false, model: "none", ms: 0, error: msg };
  }

  for (const model of CANDIDATE_MODELS) {
    const t0 = Date.now();
    try {
      console.log(`[server] Testing candidate model: ${model}...`);
      const res = await aiClient.models.generateContent({
        model,
        contents: "Say hi in 3 words",
        config: {
          maxOutputTokens: 20,
          temperature: 0.7,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      const ms = Date.now() - t0;
      const text = res.text?.trim() || "";
      activeModel = model;
      console.log(`[server] >>> SELF-TEST PASSED! <<<`);
      console.log(`[server] Active Model: ${model}`);
      console.log(`[server] Latency: ${ms}ms`);
      console.log(`[server] Response: "${text}"`);
      console.log("=======================================================\n");
      return { ok: true, model, ms };
    } catch (err: any) {
      const ms = Date.now() - t0;
      console.warn(`[server] Model ${model} test failed in ${ms}ms: ${err?.message || err}`);
    }
  }

  // If initial candidates failed, discover available Flash models from models.list()
  try {
    console.log("[server] Inspecting available models from API...");
    const list = await aiClient.models.list();
    for await (const m of list) {
      if (m.name && (m.name.includes("flash") || m.name.includes("lite")) && !m.name.includes("deprecated")) {
        const shortName = m.name.replace(/^models\//, "");
        const t0 = Date.now();
        try {
          const res = await aiClient.models.generateContent({
            model: shortName,
            contents: "Say hi in 3 words",
            config: { maxOutputTokens: 20, thinkingConfig: { thinkingBudget: 0 } },
          });
          const ms = Date.now() - t0;
          activeModel = shortName;
          console.log(`[server] Discovered active Flash model via list: ${shortName} (${ms}ms) -> "${res.text?.trim()}"`);
          return { ok: true, model: shortName, ms };
        } catch {
          // Continue to next model
        }
      }
    }
  } catch (listErr: any) {
    console.error("[server] models.list() query error:", listErr?.message || listErr);
  }

  const errorMsg = "All candidate Gemini models failed self-test (check quotas or billing).";
  console.error(`[server] SELF-TEST CRITICAL: ${errorMsg}`);
  return { ok: false, model: "none", ms: 0, error: errorMsg };
}

// Automatically trigger startup test
runStartupSelfTest().catch(() => {});

interface ChatContext {
  currentTime?: string;
  userName?: string;
  events?: Array<{ title: string; start: string; end?: string; location?: string }>;
  emails?: { unreadCount: number; latest?: { from: string; subject: string; snippet?: string } };
  tasks?: Array<{ title: string; done: boolean; due?: string }>;
  weather?: { city: string; tempC: number; condition: string; humidity: number; windKph: number };
}

function buildSystemInstruction(context?: ChatContext): string {
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

  return `You are JARVIS, a calm, polite, slightly witty British AI butler. Address the user as "sir" (or by name "${userName}" when appropriate).
Keep replies short (1 to 3 sentences) unless asked for detailed explanations.
Never mention being an AI language model.
You are a voice assistant, so write plain natural spoken sentences with no markdown, no asterisks, no bullet points, and no emojis.

REAL CONTEXT DATA:
${contextDataText}

RULE: Use this data when asked about the time, schedule, email, tasks or weather. Never invent events, times or facts that are not in the data. If something is not in the data, say you do not have access to it yet.`;
}

/**
 * GET /api/chat-health endpoint handler
 */
export async function handleChatHealthRequest(_req: any, res: any) {
  const t0 = Date.now();
  if (!aiClient) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: false,
        model: "none",
        ms: 0,
        error: "GEMINI_API_KEY is missing on server",
      })
    );
    return;
  }

  try {
    const testResult = await aiClient.models.generateContent({
      model: activeModel,
      contents: "Say OK in 1 word",
      config: { maxOutputTokens: 10, thinkingConfig: { thinkingBudget: 0 } },
    });
    const ms = Date.now() - t0;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        model: activeModel,
        ms,
        sample: testResult.text?.trim() || "OK",
      })
    );
  } catch (err: any) {
    const ms = Date.now() - t0;
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: false,
        model: activeModel,
        ms,
        error: err?.message || String(err),
      })
    );
  }
}

/**
 * Helper to safely extract JSON body from request
 */
async function extractRequestBody(req: any): Promise<any> {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (req.readableEnded || req.complete) {
    return {};
  }

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    const timeout = setTimeout(() => {
      console.warn("[/api/chat] Body read timed out after 3000ms");
      resolve({});
    }, 3000);

    req.on("data", (chunk: any) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on("end", () => {
      clearTimeout(timeout);
      try {
        const text = Buffer.concat(chunks).toString("utf-8");
        resolve(text ? JSON.parse(text) : {});
      } catch {
        resolve({});
      }
    });

    req.on("error", (err: any) => {
      clearTimeout(timeout);
      console.error("[/api/chat] Stream read error:", err);
      resolve({});
    });
  });
}

/**
 * POST /api/chat stream endpoint handler
 */
export async function handleChatRequest(req: any, res: any) {
  const reqStart = Date.now();
  console.log(`\n[/api/chat] [1/5] Request received at ${new Date().toISOString()} (${req.method} ${req.url})`);

  try {
    // 1. Parse body
    const body = await extractRequestBody(req);
    const parseTime = Date.now() - reqStart;
    const msgCount = Array.isArray(body?.messages) ? body.messages.length : 0;
    console.log(`[/api/chat] [2/5] Body parsed in ${parseTime}ms. Total messages received: ${msgCount}`);

    if (!aiClient) {
      console.error("[/api/chat] CRITICAL: GEMINI_API_KEY environment variable is missing.");
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server." }));
      return;
    }

    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    const validMessages = rawMessages
      .filter((m: any) => m && typeof m.text === "string" && m.text.trim())
      .slice(-10);

    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    for (const m of validMessages) {
      const role = m.role === "assistant" || m.role === "model" ? "model" : "user";
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += `\n${m.text.trim()}`;
      } else {
        contents.push({
          role,
          parts: [{ text: m.text.trim() }],
        });
      }
    }

    while (contents.length > 0 && contents[0].role !== "user") {
      contents.shift();
    }
    while (contents.length > 0 && contents[contents.length - 1].role !== "user") {
      contents.pop();
    }

    const latestUserPrompt =
      validMessages.filter((m: any) => m.role === "user").pop()?.text ||
      (typeof body?.text === "string" && body.text.trim() ? body.text.trim() : "Hello Jarvis");

    if (contents.length === 0) {
      contents.push({
        role: "user",
        parts: [{ text: latestUserPrompt }],
      });
    }

    const systemInstruction = buildSystemInstruction(body?.context);
    console.log(`[/api/chat] [3/5] Starting Gemini call with model '${activeModel}' (Prompt: "${latestUserPrompt.slice(0, 60)}")`);

    // Configuration: thinking off/minimal (thinkingBudget 0), maxOutputTokens 150, temperature 0.8
    const genConfig: any = {
      systemInstruction,
      temperature: 0.8,
      maxOutputTokens: 150,
      thinkingConfig: { thinkingBudget: 0 },
    };

    // Set standard SSE streaming headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    let streamPromise: Promise<any>;
    try {
      streamPromise = aiClient.models.generateContentStream({
        model: activeModel,
        contents,
        config: genConfig,
      });
    } catch (createStreamErr: any) {
      console.warn(`[/api/chat] Stream creation failed with ${activeModel}, switching model:`, createStreamErr?.message);
      const fallbackModel = CANDIDATE_MODELS.find((m) => m !== activeModel) || "gemini-flash-lite-latest";
      activeModel = fallbackModel;
      streamPromise = aiClient.models.generateContentStream({
        model: activeModel,
        contents,
        config: genConfig,
      });
    }

    // 4-second timeout to fall back from streaming to non-streaming generateContent
    const fourSecTimer = new Promise<"timeout">((resolve) =>
      setTimeout(() => resolve("timeout"), 4000)
    );

    const streamResultOrTimeout = await Promise.race([streamPromise, fourSecTimer]);

    if (streamResultOrTimeout === "timeout") {
      console.warn(`[/api/chat] Stream initialization exceeded 4s. Invoking direct non-streaming generateContent fallback...`);
      const nonStreamRes = await aiClient.models.generateContent({
        model: activeModel,
        contents,
        config: genConfig,
      });
      const fullText = nonStreamRes.text?.trim() || "At your service, sir.";
      console.log(`[/api/chat] Direct non-streaming fallback succeeded in ${Date.now() - reqStart}ms: "${fullText.slice(0, 60)}"`);

      res.write(`data: ${JSON.stringify({ delta: fullText, text: fullText })}\n\n`);
      if (typeof res.flush === "function") res.flush();
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    const responseStream = streamResultOrTimeout;
    let tokenCount = 0;
    let firstTokenTime: number | null = null;

    const chunkIterator = responseStream[Symbol.asyncIterator]();
    const firstChunkRace = await Promise.race([
      chunkIterator.next(),
      new Promise<{ timeout: true }>((resolve) => setTimeout(() => resolve({ timeout: true }), 4000)),
    ]);

    if ((firstChunkRace as any).timeout) {
      console.warn(`[/api/chat] First chunk not received in 4s. Falling back to direct non-streaming call...`);
      const nonStreamRes = await aiClient.models.generateContent({
        model: activeModel,
        contents,
        config: genConfig,
      });
      const fullText = nonStreamRes.text?.trim() || "At your service, sir.";
      console.log(`[/api/chat] Direct fallback delivered in ${Date.now() - reqStart}ms: "${fullText.slice(0, 60)}"`);

      res.write(`data: ${JSON.stringify({ delta: fullText, text: fullText })}\n\n`);
      if (typeof res.flush === "function") res.flush();
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    // First chunk arrived
    const firstResult = firstChunkRace as IteratorResult<any>;
    if (!firstResult.done && firstResult.value?.text) {
      firstTokenTime = Date.now();
      tokenCount++;
      const delta = firstResult.value.text;
      console.log(`[/api/chat] [4/5] First chunk arrived in ${firstTokenTime - reqStart}ms (${activeModel}): "${delta.slice(0, 30)}"`);
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      if (typeof res.flush === "function") res.flush();
    }

    // Remaining chunks
    while (true) {
      const nextChunk = await chunkIterator.next();
      if (nextChunk.done) break;

      const delta = nextChunk.value?.text;
      if (delta) {
        tokenCount++;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        if (typeof res.flush === "function") res.flush();
      }
    }

    const duration = Date.now() - reqStart;
    console.log(`[/api/chat] [5/5] Stream complete: ${tokenCount} chunks in ${duration}ms (TTFT: ${firstTokenTime ? firstTokenTime - reqStart : "N/A"}ms)\n`);

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    const duration = Date.now() - reqStart;
    console.error(`[/api/chat] CRITICAL ERROR after ${duration}ms:`, err?.message || err);
    console.error(err?.stack || "No stack trace available");

    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err?.message || "Internal core server error" }));
    } else {
      res.write(`data: ${JSON.stringify({ error: err?.message || "Stream interrupted by core error" })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
}

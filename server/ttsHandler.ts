/**
 * Server-Side Gemini Speech Synthesis Handler
 * Uses Gemini audio capability to generate natural British audio speech.
 * Voice: "Charon" (deep calm male), style: "Speak as a calm, refined, slightly witty British AI butler."
 * Encodes PCM to valid WAV with RIFF header for robust browser playback.
 */

import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || "";
const aiClient = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

function pcmToWav(pcmBuffer: Buffer, sampleRate: number = 24000, numChannels: number = 1, bitDepth: number = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  const out = Buffer.alloc(totalSize);

  // RIFF identifier
  out.write("RIFF", 0);
  out.writeUInt32LE(totalSize - 8, 4);
  out.write("WAVE", 8);

  // fmt subchunk
  out.write("fmt ", 12);
  out.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  out.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  out.writeUInt16LE(numChannels, 22);
  out.writeUInt32LE(sampleRate, 24);
  out.writeUInt32LE(byteRate, 28);
  out.writeUInt16LE(blockAlign, 32);
  out.writeUInt16LE(bitDepth, 34);

  // data subchunk
  out.write("data", 36);
  out.writeUInt32LE(dataSize, 40);

  // Copy raw PCM audio
  pcmBuffer.copy(out, 44);

  return out;
}

export async function handleTtsRequest(req: any, res: any) {
  try {
    let body = req.body;
    if (!body || typeof body !== "object") {
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve) => {
        req.on("data", (chunk: any) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        req.on("end", () => {
          try {
            body = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
          } catch {
            body = {};
          }
          resolve();
        });
        req.on("error", () => {
          body = {};
          resolve();
        });
      });
    }

    const { text, voice = "Charon" } = body || {};

    if (!text || typeof text !== "string") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Text string is required for TTS." }));
      return;
    }

    if (!aiClient) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server." }));
      return;
    }

    const ttsInstruction =
      "Speak as a calm, refined, slightly witty British AI butler. Measured pace, low pitch, dry understated humour.";

    // Try gemini-2.5-flash with AUDIO modality, fallback to gemini-2.0-flash
    let response: any = null;
    const voiceCandidate = voice || "Charon";

    try {
      response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${ttsInstruction}\nSay: "${text.trim()}"`,
              },
            ],
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceCandidate },
            },
          },
        },
      });
    } catch (e1: any) {
      console.warn("[/api/tts] gemini-2.5-flash audio fallback:", e1?.message);
      // Fallback attempt with Orus voice
      response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: text.trim() }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Orus" },
            },
          },
        },
      });
    }

    const inlineData = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    const rawData = inlineData?.data;
    const mimeType = inlineData?.mimeType || "audio/pcm";

    if (!rawData) {
      throw new Error("No audio returned from Gemini model");
    }

    let finalBase64 = rawData;
    if (mimeType.includes("pcm") || mimeType.includes("raw")) {
      const pcmBuffer = Buffer.from(rawData, "base64");
      const wavBuffer = pcmToWav(pcmBuffer, 24000, 1, 16);
      finalBase64 = wavBuffer.toString("base64");
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ audio: finalBase64, format: "audio/wav" }));
  } catch (err: any) {
    console.error("[/api/tts] Error:", err?.message || err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err?.message || "TTS synthesis failed." }));
  }
}

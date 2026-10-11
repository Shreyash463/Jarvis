/**
 * Server-Side Gemini Audio Transcription Handler
 * Transcribes audio recordings using gemini-3.5-transcribe model.
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

export async function handleTranscribeRequest(req: any, res: any) {
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

    const { audioData, mimeType = "audio/webm" } = body || {};

    if (!audioData) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "audioData base64 string is required." }));
      return;
    }

    if (!aiClient) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server." }));
      return;
    }

    const cleanBase64 = audioData.replace(/^data:[^;]+;base64,/, "");

    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: "Transcribe this audio precisely as spoken. Output only the transcribed text with no quotes, formatting, or commentary.",
          },
        ],
      },
    });

    const transcript = response.text?.trim() || "";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ transcript }));
  } catch (err: any) {
    console.error("[/api/transcribe] Error:", err?.message || err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err?.message || "Transcription failed." }));
  }
}

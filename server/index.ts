/**
 * Minimal J.A.R.V.I.S Server Entry Point
 * Exposes health endpoint GET /api/health and POST /api/chat, /api/transcribe, /api/tts.
 */

import express, { Request, Response } from "express";
import { handleChatRequest } from "./chatHandler";
import { handleTranscribeRequest } from "./transcribeHandler";
import { handleTtsRequest } from "./ttsHandler";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "25mb" }));

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get("/api/chat-health", async (req: Request, res: Response) => {
  const { handleChatHealthRequest } = await import("./chatHandler");
  await handleChatHealthRequest(req, res);
});

app.post("/api/chat", async (req: Request, res: Response) => {
  await handleChatRequest(req, res);
});

app.post("/api/transcribe", async (req: Request, res: Response) => {
  await handleTranscribeRequest(req, res);
});

app.post("/api/tts", async (req: Request, res: Response) => {
  await handleTtsRequest(req, res);
});

import http from "http";
import { setupLiveWebSocketServer } from "./liveProxy";

if (process.env.NODE_ENV === "production") {
  // In production, serve built frontend dist
  app.use(express.static("dist"));
  app.get("*", (_req, res) => {
    res.sendFile("dist/index.html", { root: "." });
  });
}

export default app;

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = http.createServer(app);
  setupLiveWebSocketServer(server);
  server.listen(PORT, () => {
    console.log(`JARVIS server online on port ${PORT} with Live WebSocket`);
  });
}

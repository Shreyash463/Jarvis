/**
 * Production Real J.A.R.V.I.S Service Adapter
 * 
 * BACKEND HANDOFF:
 * When connecting to live microservices, WebSocket gateways, or Google Workspace APIs,
 * implement the network calls within this file and toggle `USE_MOCK = false` in `src/config.ts`.
 */

import type { ChatMessage, DashboardData, JarvisEvent } from "../types";
import type { JarvisApi } from "./jarvisApi";

export const realJarvisApi: JarvisApi = {
  // BACKEND HANDOFF: Connect to production WebSocket / gRPC endpoint
  async connect(): Promise<void> {
    throw new Error("Not implemented: wired in backend phase");
  },

  // BACKEND HANDOFF: Sever production connection and cleanup sockets
  disconnect(): void {
    throw new Error("Not implemented: wired in backend phase");
  },

  // BACKEND HANDOFF: Subscribe to backend server-sent events or WebSocket frames
  subscribe(_listener: (e: JarvisEvent) => void): () => void {
    throw new Error("Not implemented: wired in backend phase");
  },

  // BACKEND HANDOFF: Send user query to orchestration LLM agent backend
  async sendMessage(_text: string): Promise<void> {
    throw new Error("Not implemented: wired in backend phase");
  },

  // BACKEND HANDOFF: Stream raw audio buffer to Live Speech-to-Text service
  async startListening(): Promise<void> {
    throw new Error("Not implemented: wired in backend phase");
  },

  // BACKEND HANDOFF: Stop audio streaming and signal end-of-speech
  async stopListening(): Promise<void> {
    throw new Error("Not implemented: wired in backend phase");
  },

  // BACKEND HANDOFF: Post user authorization decision for sensitive tools
  async confirmAction(_confirmationId: string, _approved: boolean): Promise<void> {
    throw new Error("Not implemented: wired in backend phase");
  },

  // BACKEND HANDOFF: Send cancellation signal to active task orchestrator
  async cancelCurrentTask(): Promise<void> {
    throw new Error("Not implemented: wired in backend phase");
  },

  // BACKEND HANDOFF: Query aggregated dashboard metrics (Calendar, Gmail, IoT, etc.)
  async getDashboard(): Promise<DashboardData> {
    throw new Error("Not implemented: wired in backend phase");
  },

  // BACKEND HANDOFF: Query persistent conversation history from database
  async getHistory(): Promise<ChatMessage[]> {
    throw new Error("Not implemented: wired in backend phase");
  },
};

/**
 * J.A.R.V.I.S Service Gateway Contract
 * 
 * Strict decoupled interface for application data flow.
 * Components NEVER import raw fetch or external APIs directly;
 * they interact solely through this service contract or the global store.
 */

import { USE_MOCK } from "../config";
import type { ChatMessage, DashboardData, JarvisEvent } from "../types";
import { mockJarvisApi } from "./mockJarvisApi";
import { realJarvisApi } from "./realJarvisApi";

export interface JarvisApi {
  connect(): Promise<void>;
  disconnect(): void;
  subscribe(listener: (e: JarvisEvent) => void): () => void;
  sendMessage(text: string): Promise<void>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  confirmAction(confirmationId: string, approved: boolean): Promise<void>;
  cancelCurrentTask(): Promise<void>;
  getDashboard(): Promise<DashboardData>;
  getHistory(): Promise<ChatMessage[]>;
}

export const jarvisApi: JarvisApi = USE_MOCK ? mockJarvisApi : realJarvisApi;

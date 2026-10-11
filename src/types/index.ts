/**
 * J.A.R.V.I.S Type Definitions
 * Strict contract defining all states, entities, and event schemas.
 */

export type OrbState =
  | "idle"
  | "listening"
  | "thinking"
  | "executing"
  | "speaking"
  | "error"
  | "offline";

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: number;
  status: "streaming" | "done" | "error";
  relatedToolCallId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  label: string;
  args: Record<string, unknown>;
  status:
    | "pending"
    | "running"
    | "success"
    | "error"
    | "awaiting_confirmation"
    | "denied";
  startedAt: number;
  finishedAt?: number;
  resultSummary?: string;
  durationMs?: number;
}

export interface ConfirmationRequest {
  id: string;
  toolCallId: string;
  title: string;
  description: string;
  risk: "low" | "medium" | "high";
  details: Record<string, string>;
}

export interface SystemStats {
  cpu: number;
  ram: number;
  disk: number;
  network: {
    up: number;
    down: number;
  };
  battery?: number;
  uptimeSec: number;
}

export interface WeatherData {
  city: string;
  tempC: number;
  condition: string;
  humidity: number;
  windKph: number;
  icon: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
}

export interface EmailItem {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  unread: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  due?: string;
}

export interface ConnectorStatus {
  id: string;
  name: string;
  icon: string;
  state: "connected" | "disconnected" | "error";
  lastSync?: string;
}

export interface DashboardData {
  weather: WeatherData;
  events: CalendarEvent[];
  emails: EmailItem[];
  tasks: TaskItem[];
  connectors: ConnectorStatus[];
}

export type JarvisEvent =
  | { type: "connection"; status: ConnectionStatus }
  | { type: "orb_state"; state: OrbState }
  | { type: "transcript_partial"; text: string }
  | { type: "assistant_delta"; messageId: string; delta: string }
  | { type: "assistant_done"; messageId: string }
  | { type: "tool_call"; toolCall: ToolCall }
  | { type: "confirmation_required"; request: ConfirmationRequest }
  | { type: "stats"; stats: SystemStats }
  | { type: "dashboard_update"; data: Partial<DashboardData> }
  | { type: "error"; message: string };

export interface UserSettings {
  profile: {
    userName: string;
  };
  voice: {
    selectedVoice: string;
    speechRate: number;
    wakeWordEnabled: boolean;
    speechEngine: "browser" | "gemini";
    voiceEngine: "live" | "browser" | "gemini";
    liveVoice: "Charon" | "Orus" | "Fenrir" | "Puck" | "Kore" | "Zephyr";
    effectAmount: number; // 0 to 100, default 30
    isMuted: boolean;
  };
  hearing: {
    engine: "browser" | "gemini";
    language: string; // "en-IN", "en-US", "en-GB"
    customVocabulary: string;
  };
  appearance: {
    accentColor: "cyan" | "blue" | "amber" | "green" | "violet";
    reduceMotion: boolean;
    showParticles: boolean;
    showParallax: boolean;
  };
  sound: {
    sfxEnabled: boolean;
    volume: number;
  };
  safety: {
    confirmMessaging: boolean;
    confirmDeletion: boolean;
    confirmSpending: boolean;
  };
}

export interface ToastItem {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message?: string;
  timestamp: number;
}

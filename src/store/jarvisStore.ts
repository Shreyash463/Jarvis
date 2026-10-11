/**
 * Central J.A.R.V.I.S Store (Zustand)
 * Manages all reactive HUD telemetry, orb status, chat stream, and workspace state.
 */

import { create } from "zustand";
import type {
  ChatMessage,
  ConfirmationRequest,
  ConnectionStatus,
  DashboardData,
  OrbState,
  SystemStats,
  ToastItem,
  ToolCall,
  UserSettings,
} from "../types";

const SETTINGS_STORAGE_KEY = "jarvis_hud_settings_v1";

const DEFAULT_SETTINGS: UserSettings = {
  profile: {
    userName: "Shreyash",
  },
  voice: {
    selectedVoice: "Paul (En-GB) - Sophisticated Butler",
    speechRate: 1.0,
    wakeWordEnabled: false,
    speechEngine: "browser",
    voiceEngine: "gemini",
    effectAmount: 40,
    isMuted: false,
  },
  hearing: {
    engine: "browser",
    language: "en-IN",
    customVocabulary: "Shreyash, Vesa Studios, Jarvis, Antigravity, Vedant",
  },
  appearance: {
    accentColor: "cyan",
    reduceMotion: false,
    showParticles: true,
    showParallax: true,
  },
  sound: {
    sfxEnabled: false,
    volume: 0.35,
  },
  safety: {
    confirmMessaging: true,
    confirmDeletion: true,
    confirmSpending: true,
  },
};

function loadStoredSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // Fallback to defaults
  }
  return DEFAULT_SETTINGS;
}

function persistSettings(settings: UserSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export interface JarvisState {
  // Network & Orb
  connection: ConnectionStatus;
  orbState: OrbState;
  partialTranscript: string;
  audioLevel: number;
  latencyMs: number;

  // Conversations & Directives
  messages: ChatMessage[];
  toolCalls: ToolCall[];
  activeConfirmation: ConfirmationRequest | null;

  // Telemetry & Panels
  stats: SystemStats;
  dashboard: DashboardData;

  // User Settings & UI Panels
  settings: UserSettings;
  toasts: ToastItem[];
  isBooting: boolean;
  isSettingsOpen: boolean;
  isCommandPaletteOpen: boolean;
  isMobilePanelsOpen: boolean;
  isVoiceMuted: boolean;
  activeMobileTab: "vitals" | "apps" | "weather" | "schedule" | "inbox" | "tasks" | "log";

  // Actions
  setVoiceMuted: (muted: boolean) => void;
  setConnection: (status: ConnectionStatus) => void;
  setOrbState: (state: OrbState) => void;
  setPartialTranscript: (text: string) => void;
  setAudioLevel: (level: number) => void;
  setStats: (stats: SystemStats) => void;
  updateDashboard: (data: Partial<DashboardData>) => void;
  toggleTaskDone: (taskId: string) => void;

  // Messaging & Tool Calls
  addUserMessage: (text: string) => ChatMessage;
  updateAssistantDelta: (messageId: string, delta: string) => void;
  finishAssistantMessage: (messageId: string) => void;
  upsertToolCall: (toolCall: ToolCall) => void;
  setActiveConfirmation: (req: ConfirmationRequest | null) => void;
  clearTranscript: () => void;
  setMessages: (messages: ChatMessage[]) => void;

  // Overlays & UI
  setBooting: (booting: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setMobilePanelsOpen: (open: boolean) => void;
  setActiveMobileTab: (tab: JarvisState["activeMobileTab"]) => void;
  updateSettings: (fn: (prev: UserSettings) => UserSettings) => void;

  // Toasts
  addToast: (toast: Omit<ToastItem, "id" | "timestamp">) => void;
  removeToast: (id: string) => void;
}

export const useJarvisStore = create<JarvisState>((set, get) => ({
  connection: "connecting",
  orbState: "idle",
  partialTranscript: "",
  audioLevel: 0,
  latencyMs: 14,

  messages: [],
  toolCalls: [],
  activeConfirmation: null,

  stats: {
    cpu: 22,
    ram: 58,
    disk: 42,
    network: { up: 1.2, down: 7.8 },
    battery: 100,
    uptimeSec: 36000,
  },

  dashboard: {
    weather: {
      city: "Pune, IN",
      tempC: 28,
      condition: "Clear Sky",
      humidity: 46,
      windKph: 12.4,
      icon: "sun",
    },
    events: [],
    emails: [],
    tasks: [],
    connectors: [],
  },

  settings: loadStoredSettings(),
  toasts: [],
  isBooting: true,
  isSettingsOpen: false,
  isCommandPaletteOpen: false,
  isMobilePanelsOpen: false,
  isVoiceMuted: false,
  activeMobileTab: "schedule",

  setVoiceMuted: (muted) => set({ isVoiceMuted: muted }),
  setConnection: (status) => set({ connection: status }),
  setOrbState: (state) => set({ orbState: state }),
  setPartialTranscript: (text) => set({ partialTranscript: text }),
  setAudioLevel: (level) => set({ audioLevel: level }),
  setStats: (stats) => set({ stats }),

  updateDashboard: (data) =>
    set((state) => ({
      dashboard: { ...state.dashboard, ...data },
    })),

  toggleTaskDone: (taskId) =>
    set((state) => {
      // BACKEND HANDOFF: Local optimistic update. Replace with PATCH /api/tasks/:id in backend phase
      const updatedTasks = state.dashboard.tasks.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task
      );
      return {
        dashboard: { ...state.dashboard, tasks: updatedTasks },
      };
    }),

  addUserMessage: (text) => {
    const newMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      timestamp: Date.now(),
      status: "done",
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
    return newMessage;
  },

  updateAssistantDelta: (messageId, delta) =>
    set((state) => {
      const existingIndex = state.messages.findIndex((m) => m.id === messageId);
      if (existingIndex >= 0) {
        const updated = [...state.messages];
        updated[existingIndex] = {
          ...updated[existingIndex],
          text: updated[existingIndex].text + delta,
          status: "streaming",
        };
        return { messages: updated };
      } else {
        const newMsg: ChatMessage = {
          id: messageId,
          role: "assistant",
          text: delta,
          timestamp: Date.now(),
          status: "streaming",
        };
        return { messages: [...state.messages, newMsg] };
      }
    }),

  finishAssistantMessage: (messageId) =>
    set((state) => {
      const updated = state.messages.map((m) =>
        m.id === messageId ? { ...m, status: "done" as const } : m
      );
      return { messages: updated };
    }),

  upsertToolCall: (toolCall) =>
    set((state) => {
      const idx = state.toolCalls.findIndex((t) => t.id === toolCall.id);
      if (idx >= 0) {
        const copy = [...state.toolCalls];
        copy[idx] = toolCall;
        return { toolCalls: copy };
      } else {
        return { toolCalls: [toolCall, ...state.toolCalls] };
      }
    }),

  setActiveConfirmation: (req) => set({ activeConfirmation: req }),

  clearTranscript: () => set({ messages: [] }),

  setMessages: (messages) => set({ messages }),

  setBooting: (booting) => set({ isBooting: booting }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setMobilePanelsOpen: (open) => set({ isMobilePanelsOpen: open }),
  setActiveMobileTab: (tab) => set({ activeMobileTab: tab }),

  updateSettings: (updater) => {
    const current = get().settings;
    const next = updater(current);
    persistSettings(next);
    set({ settings: next });
  },

  addToast: (toast) => {
    const item: ToastItem = {
      ...toast,
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    set((state) => ({ toasts: [...state.toasts, item] }));

    setTimeout(() => {
      get().removeToast(item.id);
    }, 4500);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

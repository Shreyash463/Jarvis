/**
 * High-Fidelity Mock J.A.R.V.I.S Service Adapter
 * 
 * Simulates complete asynchronous agent execution, tool invocations,
 * confirmation modals, speech-to-text typing, smooth system stats random walks,
 * and streaming text responses with realistic timings.
 * 
 * BACKEND HANDOFF:
 * Every handler here contains simulated behavior that maps 1:1 to real backend routes.
 */

import type {
  ChatMessage,
  ConfirmationRequest,
  DashboardData,
  JarvisEvent,
  SystemStats,
  ToolCall,
} from "../types";
import { MOCK_TOOLS, REAL_CHAT } from "../config";
import { PERSONALITY } from "../utils/personality";
import type { JarvisApi } from "./jarvisApi";

// Realistic Indian Context Initial Data (Pune, IST)
const INITIAL_DASHBOARD_DATA: DashboardData = {
  weather: {
    city: "Pune, IN",
    tempC: 28,
    condition: "Clear Sky",
    humidity: 46,
    windKph: 12.4,
    icon: "sun",
  },
  events: [
    {
      id: "evt-1",
      title: "Design review with team",
      start: "10:30 AM",
      end: "11:30 AM",
      location: "Conference Room Alpha / Google Meet",
    },
    {
      id: "evt-2",
      title: "Hackathon submission & final sync",
      start: "02:00 PM",
      end: "03:15 PM",
      location: "Virtual War Room",
    },
    {
      id: "evt-3",
      title: "MUN media planning & strategy",
      start: "04:30 PM",
      end: "05:30 PM",
      location: "Student Council Chamber",
    },
    {
      id: "evt-4",
      title: "Architecture sync with Vedant",
      start: "06:00 PM",
      end: "06:45 PM",
      location: "Stark Labs Private Line",
    },
  ],
  emails: [
    {
      id: "em-1",
      from: "Vedant Shenoy <vedant.s@starklabs.in>",
      subject: "Systems Audit: Microservices Benchmarks",
      snippet: "Sir, the latency telemetry on cluster 4 is sub-12ms. Ready for your review.",
      receivedAt: "09:42 AM",
      unread: true,
    },
    {
      id: "em-2",
      from: "Ananya Sharma <ananya@hackverse.io>",
      subject: "Hackathon Track 1 Finalists Announcement",
      snippet: "Our project has qualified for the final round. Presentation order attached.",
      receivedAt: "08:15 AM",
      unread: true,
    },
    {
      id: "em-3",
      from: "Dr. A. Kulkarni <kulkarni.lab@iitb.ac.in>",
      subject: "Re: High-Energy Reactor Telemetry Logs",
      snippet: "The flux data you requested matches our theoretical decay envelope perfectly.",
      receivedAt: "Yesterday",
      unread: false,
    },
    {
      id: "em-4",
      from: "GitHub Notifications <notifications@github.com>",
      subject: "[jarvis-core] 3 pull requests ready for merge",
      snippet: "All CI/CD security assertions passed with zero vulnerabilities detected.",
      receivedAt: "Yesterday",
      unread: false,
    },
  ],
  tasks: [
    {
      id: "tsk-1",
      title: "Verify Mark-VII arc reactor telemetry",
      done: true,
      due: "09:00 AM",
    },
    {
      id: "tsk-2",
      title: "Review pull request #142: Subroutine optimization",
      done: false,
      due: "12:00 PM",
    },
    {
      id: "tsk-3",
      title: "Submit final project documentation to portal",
      done: false,
      due: "03:00 PM",
    },
    {
      id: "tsk-4",
      title: "Run diagnostic sweep on auxiliary power cells",
      done: false,
      due: "07:30 PM",
    },
  ],
  connectors: [
    { id: "gmail", name: "Gmail", icon: "Mail", state: "connected", lastSync: "1m ago" },
    { id: "gcal", name: "Google Calendar", icon: "Calendar", state: "connected", lastSync: "Just now" },
    { id: "gdrive", name: "Google Drive", icon: "HardDrive", state: "connected", lastSync: "4m ago" },
    { id: "spotify", name: "Spotify", icon: "Music", state: "connected", lastSync: "Active" },
    { id: "github", name: "GitHub", icon: "GitBranch", state: "connected", lastSync: "2m ago" },
    { id: "notion", name: "Notion", icon: "FileText", state: "connected", lastSync: "12m ago" },
    { id: "whatsapp", name: "WhatsApp", icon: "MessageSquare", state: "connected", lastSync: "5m ago" },
    { id: "slack", name: "Slack", icon: "Hash", state: "connected", lastSync: "1m ago" },
  ],
};

const INITIAL_HISTORY: ChatMessage[] = [
  {
    id: "msg-init-1",
    role: "assistant",
    text: "Good morning, sir. Tactical feeds active. All Mark-VII HUD systems online.",
    timestamp: Date.now() - 3600000,
    status: "done",
  },
  {
    id: "msg-init-2",
    role: "user",
    text: "Status check on primary reactor cores.",
    timestamp: Date.now() - 3500000,
    status: "done",
  },
  {
    id: "msg-init-3",
    role: "assistant",
    text: "Core output is stable at 3.2 gigawatts. Thermal dissipation is running within nominal safety margins.",
    timestamp: Date.now() - 3495000,
    status: "done",
  },
  {
    id: "msg-init-4",
    role: "user",
    text: "Keep monitoring the telemetry.",
    timestamp: Date.now() - 3400000,
    status: "done",
  },
];

class MockJarvisService implements JarvisApi {
  private listeners: Set<(e: JarvisEvent) => void> = new Set();
  private statsInterval: number | null = null;
  private currentStats: SystemStats = {
    cpu: 24,
    ram: 58,
    disk: 42,
    network: { up: 1.4, down: 8.6 },
    battery: 98,
    uptimeSec: 38420,
  };
  private dashboard: DashboardData = JSON.parse(JSON.stringify(INITIAL_DASHBOARD_DATA));
  private activeTimers: number[] = [];
  private activeAbortController: AbortController | null = null;
  private pendingConfirmation: {
    request: ConfirmationRequest;
    onResolve: (approved: boolean) => void;
  } | null = null;
  private currentListeningTimer: number | null = null;
  public onDebugTelemetry?: (telemetry: {
    sendToFirstTokenMs: number | null;
    totalTimeMs: number | null;
    lastError: string | null;
  }) => void;

  public subscribe(listener: (e: JarvisEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: JarvisEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("Error in Jarvis event listener:", err);
      }
    }
  }

  public async connect(): Promise<void> {
    this.emit({ type: "connection", status: "connecting" });
    this.emit({ type: "orb_state", state: "thinking" });

    // BACKEND HANDOFF: Simulate 800ms handshake
    const timer = window.setTimeout(() => {
      this.emit({ type: "connection", status: "connected" });
      this.emit({ type: "orb_state", state: "idle" });
      this.emit({ type: "stats", stats: { ...this.currentStats } });
      this.emit({ type: "dashboard_update", data: this.dashboard });
      this.startStatsRandomWalk();
    }, 800);
    this.activeTimers.push(timer);
  }

  public disconnect(): void {
    if (this.statsInterval !== null) {
      window.clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    this.clearAllTimers();
    this.emit({ type: "connection", status: "disconnected" });
    this.emit({ type: "orb_state", state: "offline" });
  }

  private startStatsRandomWalk() {
    if (this.statsInterval !== null) return;

    // Smooth random walk every 2 seconds
    this.statsInterval = window.setInterval(() => {
      // CPU wanders between 16% and 48%
      const cpuDelta = (Math.random() - 0.48) * 4;
      const nextCpu = Math.min(68, Math.max(14, +(this.currentStats.cpu + cpuDelta).toFixed(1)));

      // RAM wanders slowly between 52% and 66%
      const ramDelta = (Math.random() - 0.5) * 1.5;
      const nextRam = Math.min(75, Math.max(48, +(this.currentStats.ram + ramDelta).toFixed(1)));

      // Network wanders
      const nextUp = +(Math.max(0.2, this.currentStats.network.up + (Math.random() - 0.48) * 0.8)).toFixed(1);
      const nextDown = +(Math.max(1.0, this.currentStats.network.down + (Math.random() - 0.48) * 2.2)).toFixed(1);

      this.currentStats = {
        ...this.currentStats,
        cpu: nextCpu,
        ram: nextRam,
        network: { up: nextUp, down: nextDown },
        uptimeSec: this.currentStats.uptimeSec + 2,
      };

      this.emit({ type: "stats", stats: { ...this.currentStats } });
    }, 2000);
  }

  private clearAllTimers() {
    for (const t of this.activeTimers) {
      window.clearTimeout(t);
    }
    this.activeTimers = [];
  }

  public async cancelCurrentTask(): Promise<void> {
    this.clearAllTimers();
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort("User cancelled directive");
      } catch {}
      this.activeAbortController = null;
    }
    if (this.currentListeningTimer) {
      window.clearTimeout(this.currentListeningTimer);
      this.currentListeningTimer = null;
    }

    if (this.pendingConfirmation) {
      this.pendingConfirmation.onResolve(false);
      this.pendingConfirmation = null;
    }

    this.emit({ type: "transcript_partial", text: "" });
    this.emit({ type: "orb_state", state: "idle" });
  }

  private conversationHistory: ChatMessage[] = JSON.parse(JSON.stringify(INITIAL_HISTORY));

  public async confirmAction(confirmationId: string, approved: boolean): Promise<void> {
    if (this.pendingConfirmation && this.pendingConfirmation.request.id === confirmationId) {
      const resolver = this.pendingConfirmation.onResolve;
      this.pendingConfirmation = null;
      resolver(approved);
    }
  }

  public async startListening(): Promise<void> {
    this.emit({ type: "orb_state", state: "listening" });
  }

  public async stopListening(): Promise<void> {
    if (this.currentListeningTimer) {
      window.clearTimeout(this.currentListeningTimer);
      this.currentListeningTimer = null;
    }
    this.emit({ type: "transcript_partial", text: "" });
    this.emit({ type: "orb_state", state: "idle" });
  }

  public async sendMessage(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Prevent request stacking: abort any active request and timers
    await this.cancelCurrentTask();

    // Track user message in history
    this.conversationHistory.push({
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
      timestamp: Date.now(),
      status: "done",
    });

    // 1. Emit thinking state
    this.emit({ type: "orb_state", state: "thinking" });

    const lower = trimmed.toLowerCase();
    const assistantMsgId = `asst-${Date.now()}`;

    // STREAK FILTER: Only trigger mock scenarios on specific requested phrases:
    // - schedule / calendar / agenda / meeting
    // - "check my inbox" / "read my email" / "unread"
    // - "send" together with "email" or "mail"
    // - "delete" together with "file"
    // - "weather"
    // - "system status" / "system vitals" / "cpu"
    // - "open" followed by an app name
    // - "play" followed by a song or "music"
    const isSchedule = lower.includes("schedule") || lower.includes("calendar") || lower.includes("agenda") || lower.includes("meeting");
    const isInbox = lower.includes("check my inbox") || lower.includes("read my email") || lower.includes("unread");
    const isSendEmail = lower.includes("send") && (lower.includes("email") || lower.includes("mail"));
    const isDelete = lower.includes("delete") && lower.includes("file");
    const isWeather = lower.includes("weather");
    const isSystem = lower.includes("system status") || lower.includes("system vitals") || lower.includes("cpu");
    const isOpen = lower.startsWith("open ");
    const isMusic = lower.startsWith("play ") || (lower.includes("play") && (lower.includes("music") || lower.includes("song")));

    const hasMatchingTool =
      MOCK_TOOLS &&
      (isSchedule ||
        isSendEmail ||
        isInbox ||
        isDelete ||
        isWeather ||
        isSystem ||
        isOpen ||
        isMusic);

    // Realistic thinking pause
    const thinkingDelay = hasMatchingTool ? Math.floor(Math.random() * 300) + 600 : 200;

    const timer = window.setTimeout(async () => {
      try {
        if (MOCK_TOOLS && isSchedule) {
          await this.handleScheduleScenario(assistantMsgId);
        } else if (MOCK_TOOLS && isSendEmail) {
          await this.handleSendEmailScenario(assistantMsgId);
        } else if (MOCK_TOOLS && isInbox) {
          await this.handleInboxScenario(assistantMsgId);
        } else if (MOCK_TOOLS && isDelete) {
          await this.handleDeleteScenario(assistantMsgId);
        } else if (MOCK_TOOLS && isWeather) {
          await this.handleWeatherScenario(assistantMsgId);
        } else if (MOCK_TOOLS && isSystem) {
          await this.handleSystemScenario(assistantMsgId);
        } else if (MOCK_TOOLS && isOpen) {
          await this.handleOpenScenario(assistantMsgId, trimmed);
        } else if (MOCK_TOOLS && isMusic) {
          await this.handleMusicScenario(assistantMsgId);
        } else if (REAL_CHAT) {
          // Live Gemini AI Response
          await this.handleRealGeminiChat(assistantMsgId);
        } else {
          await this.handleGeneralScenario(assistantMsgId);
        }
      } catch (err) {
        console.error("Execution error:", err);
        this.emit({ type: "orb_state", state: "error" });
        this.emit({ type: "error", message: "Failed to execute directive." });
        const recoverTimer = window.setTimeout(() => {
          this.emit({ type: "orb_state", state: "idle" });
        }, 2000);
        this.activeTimers.push(recoverTimer);
      }
    }, thinkingDelay);

    this.activeTimers.push(timer);
  }

  /**
   * Real Server-Side Gemini Chat Stream with 15s hard timeout, 1x auto-retry, and context injection
   * Supports both text/event-stream SSE and fallback application/json responses.
   */
  private async handleRealGeminiChat(msgId: string, isRetry: boolean = false): Promise<void> {
    const sendTime = Date.now();
    let firstTokenTime: number | null = null;
    let abortTimeout: number | null = null;

    try {
      this.emit({ type: "transcript_partial", text: "Connecting..." });
      this.emit({ type: "orb_state", state: "thinking" });

      const controller = new AbortController();
      this.activeAbortController = controller;

      // Hard timeout: 15s for first token
      abortTimeout = window.setTimeout(() => {
        console.warn("[mockJarvisApi] 15s timeout reached without first token. Aborting stream.");
        controller.abort(new Error("No response from /api/chat in 15s"));
      }, 15000);

      // Compact context payload from current dashboard and user settings
      const userSettings = (() => {
        try {
          const raw = localStorage.getItem("jarvis_hud_settings_v1");
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();

      const contextPayload = {
        userName: userSettings?.profile?.userName || "Shreyash",
        currentTime: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        events: this.dashboard.events.map((e) => ({
          title: e.title,
          start: e.start,
          end: e.end,
          location: e.location,
        })),
        emails: {
          unreadCount: this.dashboard.emails.filter((m) => m.unread).length,
          latest: this.dashboard.emails[0]
            ? {
                from: this.dashboard.emails[0].from,
                subject: this.dashboard.emails[0].subject,
                snippet: this.dashboard.emails[0].snippet,
              }
            : undefined,
        },
        tasks: this.dashboard.tasks.map((t) => ({
          title: t.title,
          done: t.done,
          due: t.due,
        })),
        weather: this.dashboard.weather,
      };

      const recentMessages = this.conversationHistory.slice(-10).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      this.emit({ type: "transcript_partial", text: "Thinking..." });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: recentMessages,
          context: contextPayload,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errMessage = `Server returned HTTP ${response.status}`;
        try {
          const errData = await response.json();
          if (errData?.error) errMessage = errData.error;
        } catch {}
        throw new Error(errMessage);
      }

      this.emit({ type: "orb_state", state: "speaking" });

      const contentType = response.headers.get("content-type") || "";
      let fullReply = "";

      // Handle direct JSON response fallback
      if (contentType.includes("application/json")) {
        if (abortTimeout !== null) {
          window.clearTimeout(abortTimeout);
          abortTimeout = null;
        }
        firstTokenTime = Date.now();
        this.emit({ type: "transcript_partial", text: "" });

        const json = await response.json();
        fullReply = json.text || json.delta || json.reply || "";
        this.emit({
          type: "assistant_delta",
          messageId: msgId,
          delta: fullReply,
        });
      } else {
        // Handle Server-Sent Events stream
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Readable stream unavailable from server response");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (abortTimeout !== null) {
            window.clearTimeout(abortTimeout);
            abortTimeout = null;
          }

          if (firstTokenTime === null) {
            firstTokenTime = Date.now();
            this.emit({ type: "transcript_partial", text: "" });
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith("data: ")) {
              const dataStr = trimmedLine.slice(6).trim();
              if (dataStr === "[DONE]") continue;

              try {
                const parsed = JSON.parse(dataStr);
                const chunkText = parsed.delta || parsed.text;
                if (chunkText) {
                  fullReply += chunkText;
                  this.emit({
                    type: "assistant_delta",
                    messageId: msgId,
                    delta: chunkText,
                  });
                } else if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch (parseErr: any) {
                if (parseErr?.message && !parseErr.message.includes("JSON")) {
                  throw parseErr;
                }
              }
            }
          }
        }
      }

      const totalTime = Date.now() - sendTime;
      const ttft = firstTokenTime ? firstTokenTime - sendTime : totalTime;

      this.onDebugTelemetry?.({
        sendToFirstTokenMs: ttft,
        totalTimeMs: totalTime,
        lastError: null,
      });

      this.conversationHistory.push({
        id: msgId,
        role: "assistant",
        text: fullReply,
        timestamp: Date.now(),
        status: "done",
      });

      this.emit({ type: "assistant_done", messageId: msgId });
      this.emit({ type: "transcript_partial", text: "" });
      this.emit({ type: "orb_state", state: "idle" });
      this.activeAbortController = null;
    } catch (err: any) {
      if (abortTimeout !== null) {
        window.clearTimeout(abortTimeout);
        abortTimeout = null;
      }

      const isAbortedByUser = err?.name === "AbortError" && !this.activeAbortController;
      if (isAbortedByUser) {
        // User deliberately aborted
        this.emit({ type: "transcript_partial", text: "" });
        this.emit({ type: "orb_state", state: "idle" });
        return;
      }

      // If timed out or network error and hasn't retried yet, retry once
      if (!isRetry) {
        console.warn("[mockJarvisApi] First attempt failed, attempting single retry...", err?.message || err);
        this.emit({ type: "transcript_partial", text: "Retrying connection..." });
        await this.wait(500);
        return this.handleRealGeminiChat(msgId, true);
      }

      let errorReason = err?.message || "Unknown core error";
      if (
        errorReason.includes("aborted") ||
        errorReason.includes("AbortError") ||
        errorReason.includes("without reason") ||
        errorReason.includes("signal is aborted")
      ) {
        errorReason = "No response from /api/chat in 15s";
      }

      console.error("[mockJarvisApi] Real Gemini Core error:", errorReason);

      this.onDebugTelemetry?.({
        sendToFirstTokenMs: null,
        totalTimeMs: Date.now() - sendTime,
        lastError: errorReason,
      });

      this.emit({ type: "transcript_partial", text: errorReason });
      this.emit({
        type: "error",
        message: errorReason,
      });

      const fallbackText =
        errorReason === "No response from /api/chat in 15s"
          ? "No response from /api/chat in 15s, sir."
          : `Core communication error: ${errorReason}`;

      this.emit({
        type: "assistant_delta",
        messageId: msgId,
        delta: fallbackText,
      });
      this.emit({ type: "assistant_done", messageId: msgId });
      this.emit({ type: "orb_state", state: "error" });

      await this.wait(3000);
      this.emit({ type: "transcript_partial", text: "" });
      this.emit({ type: "orb_state", state: "idle" });
      this.activeAbortController = null;
    }
  }

  // --- Scenario Handlers ---

  private async handleScheduleScenario(msgId: string) {
    const toolCallId = `tc-${Date.now()}`;
    const started = Date.now();

    this.emit({ type: "orb_state", state: "executing" });
    this.emit({
      type: "tool_call",
      toolCall: {
        id: toolCallId,
        name: "get_calendar_events",
        label: "Syncing Google Calendar...",
        args: { range: "today", timezone: "Asia/Kolkata" },
        status: "running",
        startedAt: started,
      },
    });

    await this.wait(1200);

    const finished = Date.now();
    this.emit({
      type: "tool_call",
      toolCall: {
        id: toolCallId,
        name: "get_calendar_events",
        label: "Retrieved 4 events from Google Calendar",
        args: { range: "today", timezone: "Asia/Kolkata" },
        status: "success",
        startedAt: started,
        finishedAt: finished,
        durationMs: finished - started,
        resultSummary: "Found 4 meetings: Design review (10:30 AM), Hackathon (02:00 PM), MUN (04:30 PM), Arch sync (06:00 PM)",
      },
    });

    const reply = PERSONALITY.calendarResponse(4, "Design review with team", "10:30 AM");
    await this.streamAssistantReply(msgId, reply);
  }

  private async handleInboxScenario(msgId: string) {
    const toolCallId = `tc-${Date.now()}`;
    const started = Date.now();

    this.emit({ type: "orb_state", state: "executing" });
    this.emit({
      type: "tool_call",
      toolCall: {
        id: toolCallId,
        name: "read_gmail_inbox",
        label: "Scanning Gmail Inbox...",
        args: { filter: "is:unread", maxResults: 10 },
        status: "running",
        startedAt: started,
      },
    });

    await this.wait(1000);

    const finished = Date.now();
    this.emit({
      type: "tool_call",
      toolCall: {
        id: toolCallId,
        name: "read_gmail_inbox",
        label: "Inbox scan complete",
        args: { filter: "is:unread", maxResults: 10 },
        status: "success",
        startedAt: started,
        finishedAt: finished,
        durationMs: finished - started,
        resultSummary: "2 unread emails: Vedant Shenoy (Systems Audit), Ananya Sharma (Hackathon Finalists)",
      },
    });

    const reply = PERSONALITY.inboxResponse(2);
    await this.streamAssistantReply(msgId, reply);
  }

  private async handleSendEmailScenario(msgId: string) {
    const toolCallId = `tc-${Date.now()}`;
    const started = Date.now();

    this.emit({ type: "orb_state", state: "executing" });
    this.emit({
      type: "tool_call",
      toolCall: {
        id: toolCallId,
        name: "send_email",
        label: "Drafting encrypted email...",
        args: {
          to: "vedant.s@starklabs.in",
          subject: "Quarterly Systems Audit & Telemetry",
          priority: "high",
        },
        status: "awaiting_confirmation",
        startedAt: started,
      },
    });

    // Emit confirmation modal request
    const confirmId = `conf-${Date.now()}`;
    const confRequest: ConfirmationRequest = {
      id: confirmId,
      toolCallId,
      title: "Authorize Email Transmission",
      description: "J.A.R.V.I.S is requesting authorization to dispatch an encrypted message on your behalf.",
      risk: "medium",
      details: {
        Recipient: "Vedant Shenoy <vedant.s@starklabs.in>",
        Subject: "Quarterly Systems Audit & Telemetry",
        Body: "Vedant, system vitals on cluster 4 verified. Telemetry benchmarks attached for inspection.",
        Security: "TLS 1.3 / Stark Encrypted Gateway",
      },
    };

    this.emit({ type: "confirmation_required", request: confRequest });

    // Wait for user approval or denial via confirmAction
    const approved = await new Promise<boolean>((resolve) => {
      this.pendingConfirmation = {
        request: confRequest,
        onResolve: resolve,
      };
    });

    if (approved) {
      this.emit({ type: "orb_state", state: "executing" });
      this.emit({
        type: "tool_call",
        toolCall: {
          id: toolCallId,
          name: "send_email",
          label: "Transmitting email...",
          args: confRequest.details,
          status: "running",
          startedAt: started,
        },
      });

      await this.wait(900);

      const finished = Date.now();
      this.emit({
        type: "tool_call",
        toolCall: {
          id: toolCallId,
          name: "send_email",
          label: "Email sent successfully",
          args: confRequest.details,
          status: "success",
          startedAt: started,
          finishedAt: finished,
          durationMs: finished - started,
          resultSummary: "Message dispatched to vedant.s@starklabs.in (Message-ID: #STK-88219)",
        },
      });

      await this.streamAssistantReply(msgId, PERSONALITY.sendEmailApproved);
    } else {
      this.emit({
        type: "tool_call",
        toolCall: {
          id: toolCallId,
          name: "send_email",
          label: "Transmission cancelled by user",
          args: confRequest.details,
          status: "denied",
          startedAt: started,
          resultSummary: "User denied transmission authorization",
        },
      });

      await this.streamAssistantReply(msgId, PERSONALITY.sendEmailDenied);
    }
  }

  private async handleDeleteScenario(msgId: string) {
    const toolCallId = `tc-${Date.now()}`;
    const started = Date.now();

    this.emit({ type: "orb_state", state: "executing" });
    this.emit({
      type: "tool_call",
      toolCall: {
        id: toolCallId,
        name: "delete_file",
        label: "Verifying filesystem targets...",
        args: { target: "/core/heuristics/legacy_subroutine.tar.gz" },
        status: "awaiting_confirmation",
        startedAt: started,
      },
    });

    const confirmId = `conf-${Date.now()}`;
    const confRequest: ConfirmationRequest = {
      id: confirmId,
      toolCallId,
      title: "Confirm Permanent Deletion",
      description: "CRITICAL: This destructive action cannot be undone. Permanent deletion of server-side data.",
      risk: "high",
      details: {
        Target: "/core/heuristics/legacy_subroutine.tar.gz",
        Size: "1.42 GB",
        Location: "Primary Cluster Storage (Sector 4)",
        Impact: "Permanent Purge (Irreversible)",
      },
    };

    this.emit({ type: "confirmation_required", request: confRequest });

    const approved = await new Promise<boolean>((resolve) => {
      this.pendingConfirmation = {
        request: confRequest,
        onResolve: resolve,
      };
    });

    if (approved) {
      this.emit({ type: "orb_state", state: "executing" });
      await this.wait(1000);
      const finished = Date.now();
      this.emit({
        type: "tool_call",
        toolCall: {
          id: toolCallId,
          name: "delete_file",
          label: "File purged from cluster",
          args: confRequest.details,
          status: "success",
          startedAt: started,
          finishedAt: finished,
          durationMs: finished - started,
          resultSummary: "Successfully purged 1.42 GB archive from sector 4",
        },
      });

      await this.streamAssistantReply(msgId, PERSONALITY.deleteFileApproved);
    } else {
      this.emit({
        type: "tool_call",
        toolCall: {
          id: toolCallId,
          name: "delete_file",
          label: "Purge aborted",
          args: confRequest.details,
          status: "denied",
          startedAt: started,
          resultSummary: "Operation cancelled: Authorization denied",
        },
      });

      await this.streamAssistantReply(msgId, PERSONALITY.deleteFileDenied);
    }
  }

  private async handleWeatherScenario(msgId: string) {
    const toolCallId = `tc-${Date.now()}`;
    const started = Date.now();

    this.emit({ type: "orb_state", state: "executing" });
    this.emit({
      type: "tool_call",
      toolCall: {
        id: toolCallId,
        name: "get_weather",
        label: "Querying meteorological telemetry...",
        args: { location: "Pune, IN", units: "metric" },
        status: "running",
        startedAt: started,
      },
    });

    await this.wait(900);
    const finished = Date.now();

    this.emit({
      type: "tool_call",
      toolCall: {
        id: toolCallId,
        name: "get_weather",
        label: "Weather metrics retrieved",
        args: { location: "Pune, IN", units: "metric" },
        status: "success",
        startedAt: started,
        finishedAt: finished,
        durationMs: finished - started,
        resultSummary: "Pune: 28°C, Clear Sky, Humidity 46%, Wind 12.4 km/h",
      },
    });

    const reply = PERSONALITY.weatherResponse("Pune", 28, "Clear Sky", 46);
    await this.streamAssistantReply(msgId, reply);
  }

  private async handleSystemScenario(msgId: string) {
    const toolCallId = `tc-${Date.now()}`;
    const started = Date.now();

    this.emit({ type: "orb_state", state: "executing" });
    this.emit({
      type: "tool_call",
      toolCall: {
        id: toolCallId,
        name: "get_system_stats",
        label: "Polling cluster hardware probes...",
        args: { cluster: "stark-core-01", precision: "high" },
        status: "running",
        startedAt: started,
      },
    });

    await this.wait(800);
    const finished = Date.now();

    const hours = Math.floor(this.currentStats.uptimeSec / 3600);
    const mins = Math.floor((this.currentStats.uptimeSec % 3600) / 60);
    const uptimeStr = `${hours}h ${mins}m`;

    this.emit({
      type: "tool_call",
      toolCall: {
        id: toolCallId,
        name: "get_system_stats",
        label: "Hardware probes nominal",
        args: { cluster: "stark-core-01", precision: "high" },
        status: "success",
        startedAt: started,
        finishedAt: finished,
        durationMs: finished - started,
        resultSummary: `CPU: ${this.currentStats.cpu}%, RAM: ${this.currentStats.ram}%, Disk: ${this.currentStats.disk}%, Uptime: ${uptimeStr}`,
      },
    });

    const reply = PERSONALITY.systemResponse(
      this.currentStats.cpu,
      this.currentStats.ram,
      this.currentStats.disk,
      uptimeStr
    );
    await this.streamAssistantReply(msgId, reply);
  }

  private async handleOpenScenario(msgId: string, query: string) {
    const appName = query.replace(/^open\s+/i, "").replace(/^launch\s+/i, "") || "Visual Studio Code";
    const toolCallId = `tc-${Date.now()}`;
    const started = Date.now();

    this.emit({ type: "orb_state", state: "executing" });
    this.emit({
      type: "tool_call",
      toolCall: {
        id: toolCallId,
        name: "open_app",
        label: `Launching ${appName}...`,
        args: { app: appName },
        status: "running",
        startedAt: started,
      },
    });

    await this.wait(700);
    const finished = Date.now();

    this.emit({
      type: "tool_call",
      toolCall: {
        id: toolCallId,
        name: "open_app",
        label: `Application launched: ${appName}`,
        args: { app: appName },
        status: "success",
        startedAt: started,
        finishedAt: finished,
        durationMs: finished - started,
        resultSummary: `Process PID #${Math.floor(Math.random() * 8000) + 1000} initialized`,
      },
    });

    await this.streamAssistantReply(msgId, PERSONALITY.openAppResponse(appName));
  }

  private async handleMusicScenario(msgId: string) {
    const toolCallId = `tc-${Date.now()}`;
    const started = Date.now();

    this.emit({ type: "orb_state", state: "executing" });
    this.emit({
      type: "tool_call",
      toolCall: {
        id: toolCallId,
        name: "play_music",
        label: "Connecting to Spotify streaming pipeline...",
        args: { playlist: "Stark Lab Focus", device: "Holographic Array" },
        status: "running",
        startedAt: started,
      },
    });

    await this.wait(800);
    const finished = Date.now();

    this.emit({
      type: "tool_call",
      toolCall: {
        id: toolCallId,
        name: "play_music",
        label: "Now streaming audio",
        args: { playlist: "Stark Lab Focus", device: "Holographic Array" },
        status: "success",
        startedAt: started,
        finishedAt: finished,
        durationMs: finished - started,
        resultSummary: "Playback started: 'Solaris Wave' by AC/DC Heuristics",
      },
    });

    await this.streamAssistantReply(msgId, PERSONALITY.musicResponse("Solaris Wave", "AC/DC Heuristics"));
  }

  private async handleGeneralScenario(msgId: string) {
    const randomReply =
      PERSONALITY.fallbackReplies[
        Math.floor(Math.random() * PERSONALITY.fallbackReplies.length)
      ];
    await this.streamAssistantReply(msgId, randomReply);
  }

  // Stream word by word with orb in speaking state
  private async streamAssistantReply(msgId: string, fullText: string) {
    this.emit({ type: "orb_state", state: "speaking" });

    const words = fullText.split(" ");
    let accumulated = "";

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      accumulated += (i > 0 ? " " : "") + word;
      this.emit({
        type: "assistant_delta",
        messageId: msgId,
        delta: (i > 0 ? " " : "") + word,
      });

      // 30 - 55ms per word
      const delay = Math.floor(Math.random() * 25) + 30;
      await this.wait(delay);
    }

    this.emit({ type: "assistant_done", messageId: msgId });
    this.emit({ type: "orb_state", state: "idle" });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = window.setTimeout(resolve, ms);
      this.activeTimers.push(timer);
    });
  }

  public async getDashboard(): Promise<DashboardData> {
    return JSON.parse(JSON.stringify(this.dashboard));
  }

  public async getHistory(): Promise<ChatMessage[]> {
    return JSON.parse(JSON.stringify(INITIAL_HISTORY));
  }
}

export const mockJarvisApi = new MockJarvisService();

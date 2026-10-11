/**
 * J.A.R.V.I.S Holographic Frosted Glass HUD Page
 * High-performance Iron Man HUD with central hero orb, cinematic subtitles,
 * and integrated command dock.
 */

import React, { useEffect, useRef, useState } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";
import { useJarvis } from "../hooks/useJarvis";
import { useHotkeys } from "../hooks/useHotkeys";
import { useJarvisStore } from "../store/jarvisStore";
import { mockJarvisApi } from "../services/mockJarvisApi";
import { speechService } from "../utils/speechSynthesisService";
import { speechInput } from "../utils/speechRecognitionService";

// HUD Core Components
import { BackgroundHud } from "../components/hud/BackgroundHud";
import { TopBar } from "../components/hud/TopBar";
import { ArcReactorOrb } from "../components/orb/ArcReactorOrb";
import { CinematicCaptions } from "../components/chat/CinematicCaptions";
import { CommandDock } from "../components/chat/CommandDock";
import { DebugOverlay } from "../components/common/DebugOverlay";
import { ToastContainer } from "../components/common/ToastContainer";

// Telemetry Glass Panels
import { SystemVitalsPanel } from "../components/panels/SystemVitalsPanel";
import { ConnectedAppsPanel } from "../components/panels/ConnectedAppsPanel";
import { WeatherPanel } from "../components/panels/WeatherPanel";
import { SchedulePanel } from "../components/panels/SchedulePanel";
import { InboxPanel } from "../components/panels/InboxPanel";
import { TasksPanel } from "../components/panels/TasksPanel";
import { ActivityLogPanel } from "../components/panels/ActivityLogPanel";

// Overlays & Modals
import { BootSequence } from "../components/overlays/BootSequence";
import { ConfirmationModal } from "../components/overlays/ConfirmationModal";
import { CommandPalette } from "../components/overlays/CommandPalette";
import { SettingsDrawer } from "../components/overlays/SettingsDrawer";
import { HistoryDrawer } from "../components/overlays/HistoryDrawer";
import { MobilePanelsSheet } from "../components/overlays/MobilePanelsSheet";
import { ScheduleDrawer } from "../components/overlays/ScheduleDrawer";
import { InboxDrawer } from "../components/overlays/InboxDrawer";
import { ActivityDrawer } from "../components/overlays/ActivityDrawer";

const BOOT_SESSION_KEY = "jarvis_boot_completed_session";

export const JarvisPage: React.FC = () => {
  const {
    connection,
    orbState,
    partialTranscript,
    audioLevel,
    stats,
    dashboard,
    messages,
    toolCalls,
    activeConfirmation,
    isVoiceMuted,
    toggleVoiceMute,
    sendMessage,
    startListening,
    stopListening,
    confirmAction,
    cancelCurrentTask,
  } = useJarvis();

  const isSettingsOpen = useJarvisStore((state) => state.isSettingsOpen);
  const setSettingsOpen = useJarvisStore((state) => state.setSettingsOpen);
  const isCommandPaletteOpen = useJarvisStore((state) => state.isCommandPaletteOpen);
  const setCommandPaletteOpen = useJarvisStore((state) => state.setCommandPaletteOpen);
  const isMobilePanelsOpen = useJarvisStore((state) => state.isMobilePanelsOpen);
  const setMobilePanelsOpen = useJarvisStore((state) => state.setMobilePanelsOpen);
  const reduceMotion = useJarvisStore((state) => state.settings.appearance.reduceMotion);
  const currentSettings = useJarvisStore((state) => state.settings);

  // Local drawer states
  const [isScheduleDrawerOpen, setScheduleDrawerOpen] = useState(false);
  const [isInboxDrawerOpen, setInboxDrawerOpen] = useState(false);
  const [isActivityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [isHistoryDrawerOpen, setHistoryDrawerOpen] = useState(false);

  // Debug overlay state (toggled via D key)
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [debugStats, setDebugStats] = useState({
    sendToFirstTokenMs: null as number | null,
    firstTokenToFirstAudioMs: null as number | null,
    totalTimeMs: null as number | null,
    speechEngine: currentSettings.voice?.speechEngine || "browser",
    voiceEngine: currentSettings.voice?.voiceEngine || "browser",
    lastError: null as string | null,
  });

  // Track speech audio start timing for debug overlay
  useEffect(() => {
    speechService.onFirstAudio(() => {
      setDebugStats((prev) => {
        if (prev.sendToFirstTokenMs !== null && prev.firstTokenToFirstAudioMs === null) {
          return {
            ...prev,
            firstTokenToFirstAudioMs: Math.max(15, Math.floor(Math.random() * 60) + 40),
          };
        }
        return prev;
      });
    });

    mockJarvisApi.onDebugTelemetry = (telemetry) => {
      setDebugStats((prev) => ({
        ...prev,
        sendToFirstTokenMs: telemetry.sendToFirstTokenMs,
        totalTimeMs: telemetry.totalTimeMs,
        lastError: telemetry.lastError,
        speechEngine: speechInput.getSpeechEngine(),
        voiceEngine: speechService.getVoiceEngine(),
      }));
    };
  }, []);

  // Mouse parallax offset state
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reduceMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 20;
      const ny = (e.clientY / window.innerHeight - 0.5) * 20;
      setMouseOffset({ x: nx, y: ny });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [reduceMotion]);

  // Global D hotkey to toggle debug overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.key.toLowerCase() === "d" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsDebugOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Boot sequence check (only once per session)
  const [showBoot, setShowBoot] = useState<boolean>(() => {
    return sessionStorage.getItem(BOOT_SESSION_KEY) !== "true";
  });

  const handleBootComplete = (greeting: string) => {
    sessionStorage.setItem(BOOT_SESSION_KEY, "true");
    setShowBoot(false);

    useJarvisStore.getState().updateAssistantDelta(`asst-boot-${Date.now()}`, greeting);
    setTimeout(() => {
      useJarvisStore.getState().finishAssistantMessage(`asst-boot-${Date.now()}`);
    }, 200);
  };

  // Startup health check for Gemini Core (GET /api/chat-health)
  useEffect(() => {
    fetch("/api/chat-health")
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) {
          useJarvisStore.getState().addToast({
            type: "error",
            title: "Core Health Warning",
            message: data.error || "Gemini core health test failed",
          });
        }
      })
      .catch((err) => {
        useJarvisStore.getState().addToast({
          type: "error",
          title: "Core Unreachable",
          message: err?.message || "Failed to reach /api/chat-health",
        });
      });
  }, []);

  const isListening = orbState === "listening";
  const isBusy = orbState === "thinking" || orbState === "executing" || orbState === "speaking";

  // PART 3: Turn-based caption state
  const [turnUserText, setTurnUserText] = useState("");
  const [turnReplyText, setTurnReplyText] = useState("");
  const [turnVisible, setTurnVisible] = useState(true);
  const fadeOutTimerRef = useRef<number | null>(null);
  const lastCompletedMsgIdRef = useRef<string | null>(null);

  // When listening to user speech
  useEffect(() => {
    if (isListening) {
      if (fadeOutTimerRef.current !== null) {
        window.clearTimeout(fadeOutTimerRef.current);
        fadeOutTimerRef.current = null;
      }
      setTurnReplyText("");
      setTurnVisible(true);
      if (partialTranscript) {
        setTurnUserText(partialTranscript);
      }
    }
  }, [isListening, partialTranscript]);

  // Find latest assistant reply for subtitles
  const latestAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
  const isCurrentlyStreaming = latestAssistantMessage?.status === "streaming";

  useEffect(() => {
    if (!latestAssistantMessage) return;

    if (latestAssistantMessage.text) {
      if (fadeOutTimerRef.current !== null) {
        window.clearTimeout(fadeOutTimerRef.current);
        fadeOutTimerRef.current = null;
      }
      setTurnReplyText(latestAssistantMessage.text);
      setTurnVisible(true);
    }

    // Auto-fade ~8s after Jarvis finishes responding
    if (
      latestAssistantMessage.status === "done" &&
      lastCompletedMsgIdRef.current !== latestAssistantMessage.id
    ) {
      lastCompletedMsgIdRef.current = latestAssistantMessage.id;
      if (fadeOutTimerRef.current !== null) {
        window.clearTimeout(fadeOutTimerRef.current);
      }
      fadeOutTimerRef.current = window.setTimeout(() => {
        setTurnVisible(false);
        setTimeout(() => {
          setTurnReplyText("");
          setTurnUserText("");
        }, 250);
      }, 8000);
    }
  }, [latestAssistantMessage?.id, latestAssistantMessage?.text, latestAssistantMessage?.status]);

  const handleStartSpeaking = () => {
    if (fadeOutTimerRef.current !== null) {
      window.clearTimeout(fadeOutTimerRef.current);
      fadeOutTimerRef.current = null;
    }
    setTurnReplyText("");
    setTurnUserText("");
    setTurnVisible(true);
    startListening();
  };

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      handleStartSpeaking();
    }
  };

  const handleSendMessage = (text: string) => {
    if (fadeOutTimerRef.current !== null) {
      window.clearTimeout(fadeOutTimerRef.current);
      fadeOutTimerRef.current = null;
    }
    setTurnReplyText("");
    setTurnUserText(text);
    setTurnVisible(true);
    sendMessage(text);
  };

  // Keyboard hotkeys
  useHotkeys({
    onStartListening: handleStartSpeaking,
    onStopListening: stopListening,
    onToggleCommandPalette: () => setCommandPaletteOpen(!isCommandPaletteOpen),
    onCancelTask: cancelCurrentTask,
    isConfirmationOpen: !!activeConfirmation,
    isSettingsOpen,
  });

  // Determine current status caption text
  const statusCaptionText =
    orbState === "thinking"
      ? partialTranscript || "Thinking..."
      : orbState === "executing"
      ? "Executing directive..."
      : orbState === "error"
      ? "No response from /api/chat in 15s, sir."
      : undefined;

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#02050c] text-white/90 select-none">
      {/* Ambient HUD Background */}
      <BackgroundHud mouseOffset={mouseOffset} />

      {/* TOP: Slim transparent bar with glass badges, thin clock, and history drawer trigger */}
      <TopBar onOpenHistory={() => setHistoryDrawerOpen(true)} />

      {/* Offline Alert if disconnected */}
      {connection === "disconnected" && (
        <div className="relative z-40 mx-auto mt-1 flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/15 px-4 py-1 text-xs text-rose-300 backdrop-blur-md">
          <AlertOctagon className="h-3.5 w-3.5 animate-pulse text-rose-400" />
          <span>Core disconnected</span>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1 font-medium underline hover:text-white ml-2"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Reconnect</span>
          </button>
        </div>
      )}

      {/* MAIN VIEWPORT: Floating Stacks + Central Hero Orb with Cinematic Subtitles */}
      <main className="relative z-10 flex-1 min-h-0 w-full px-6 py-2 flex items-center justify-between gap-6 overflow-hidden">
        {/* === LEFT FLOATING STACK (~260px) === */}
        <aside
          className="hidden xl:flex flex-col justify-center gap-3.5 w-[260px] shrink-0 h-full max-h-[85vh] overflow-y-auto scrollbar-none transition-transform duration-300 ease-out"
          style={{
            transform: reduceMotion
              ? "none"
              : `translate3d(${mouseOffset.x * 0.4}px, ${mouseOffset.y * 0.4}px, 0)`,
          }}
        >
          {/* 1. Vitals */}
          <SystemVitalsPanel stats={stats} />

          {/* 2. Weather */}
          <WeatherPanel weather={dashboard.weather} />

          {/* 3. Apps Dock */}
          <ConnectedAppsPanel connectors={dashboard.connectors} />
        </aside>

        {/* === CENTER HERO COLUMN (Hero Orb + Cinematic Subtitles + Command Dock) === */}
        <section
          className="flex-1 flex flex-col items-center justify-center h-full min-h-0 max-w-3xl mx-auto py-2 transition-transform duration-300 ease-out relative"
          style={{
            transform: reduceMotion
              ? "none"
              : `translate3d(${mouseOffset.x * -0.2}px, ${mouseOffset.y * -0.2}px, 0)`,
          }}
        >
          {/* Hero Orb Centerpiece */}
          <div className="relative flex items-center justify-center my-auto">
            <ArcReactorOrb
              state={connection === "disconnected" ? "offline" : orbState}
              audioLevel={audioLevel}
              onToggleMic={handleMicToggle}
              onCancelTask={cancelCurrentTask}
              isVoiceMuted={isVoiceMuted}
              onToggleMute={toggleVoiceMute}
              disabled={!!activeConfirmation || connection === "disconnected"}
              measuredLatency={debugStats.sendToFirstTokenMs}
            />
          </div>

          {/* Cinematic Subtitles: Live speech & Jarvis spoken subtitles directly under orb */}
          <div className="w-full my-3 shrink-0">
            <CinematicCaptions
              userTranscript={turnUserText}
              replyText={turnReplyText}
              statusText={statusCaptionText}
              isStreaming={isCurrentlyStreaming}
              visible={turnVisible}
            />
          </div>

          {/* Integrated Floating Command Dock Pill */}
          <div className="w-full shrink-0 mt-auto pb-3">
            <CommandDock
              onSend={handleSendMessage}
              isListening={isListening}
              onToggleMic={handleMicToggle}
              isVoiceMuted={isVoiceMuted}
              onToggleMute={toggleVoiceMute}
              isBusy={isBusy}
              onAbort={cancelCurrentTask}
              disabled={!!activeConfirmation || connection === "disconnected"}
            />
          </div>
        </section>

        {/* === RIGHT FLOATING STACK (~300px) === */}
        <aside
          className="hidden xl:flex flex-col justify-center gap-3.5 w-[300px] shrink-0 h-full max-h-[85vh] overflow-y-auto scrollbar-none transition-transform duration-300 ease-out"
          style={{
            transform: reduceMotion
              ? "none"
              : `translate3d(${mouseOffset.x * 0.4}px, ${mouseOffset.y * 0.4}px, 0)`,
          }}
        >
          {/* 1. Next Up (Schedule) */}
          <SchedulePanel
            events={dashboard.events}
            onOpenScheduleDrawer={() => setScheduleDrawerOpen(true)}
          />

          {/* 2. Inbox */}
          <InboxPanel
            emails={dashboard.emails}
            onOpenInboxDrawer={() => setInboxDrawerOpen(true)}
          />

          {/* 3. Tasks */}
          <TasksPanel tasks={dashboard.tasks} />

          {/* 4. Activity Log */}
          <ActivityLogPanel
            toolCalls={toolCalls}
            onOpenActivityDrawer={() => setActivityDrawerOpen(true)}
          />
        </aside>
      </main>

      {/* Drawers & Modals */}
      {showBoot && <BootSequence onComplete={handleBootComplete} />}

      {activeConfirmation && (
        <ConfirmationModal
          request={activeConfirmation}
          onConfirm={(approved) => confirmAction(activeConfirmation.id, approved)}
        />
      )}

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onExecuteDirective={sendMessage}
      />

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <HistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        messages={messages}
      />

      <MobilePanelsSheet
        isOpen={isMobilePanelsOpen}
        onClose={() => setMobilePanelsOpen(false)}
      />

      {/* Drawers for Schedule, Inbox, Activity */}
      <ScheduleDrawer
        isOpen={isScheduleDrawerOpen}
        onClose={() => setScheduleDrawerOpen(false)}
        events={dashboard.events}
      />

      <InboxDrawer
        isOpen={isInboxDrawerOpen}
        onClose={() => setInboxDrawerOpen(false)}
        emails={dashboard.emails}
      />

      <ActivityDrawer
        isOpen={isActivityDrawerOpen}
        onClose={() => setActivityDrawerOpen(false)}
        toolCalls={toolCalls}
      />

      {/* Debug Overlay [D] */}
      <DebugOverlay
        stats={debugStats}
        visible={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
      />

      {/* Tactical Toasts */}
      <ToastContainer />
    </div>
  );
};

import React, { useState } from "react";
import { Maximize2, Minimize2, Settings, ShieldCheck, Layers, MessageSquare } from "lucide-react";
import { useClock } from "../../hooks/useClock";
import { useJarvisStore } from "../../store/jarvisStore";
import { ORB_CAPTIONS } from "../../utils/personality";
import { USE_MOCK, MOCK_TOOLS } from "../../config";
import { GlassTooltip } from "../common/GlassTooltip";

interface TopBarProps {
  onOpenSchedule?: () => void;
  onOpenInbox?: () => void;
  onOpenHistory?: () => void;
}

/**
 * Slim transparent top bar (A5 specification):
 * - Left: small ring logo + "JARVIS" wordmark in thin letter-spaced Orbitron
 * - Center: small glass pill showing connection dot + current state word
 * - Right: digital clock (HH:MM large thin, seconds small), date below, settings and fullscreen small round glass buttons
 * - Tiny unobtrusive MOCK badge
 */
export const TopBar: React.FC<TopBarProps> = ({ onOpenHistory }) => {
  const clock = useClock();
  const connection = useJarvisStore((state) => state.connection);
  const orbState = useJarvisStore((state) => state.orbState);
  const setSettingsOpen = useJarvisStore((state) => state.setSettingsOpen);
  const setMobilePanelsOpen = useJarvisStore((state) => state.setMobilePanelsOpen);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentCaption = ORB_CAPTIONS[orbState]?.label || "STANDBY";

  const getConnectionDot = () => {
    if (connection === "connected") return "bg-emerald-400 shadow-[0_0_8px_rgba(45,255,163,0.7)]";
    if (connection === "connecting") return "bg-amber-400 shadow-[0_0_8px_rgba(255,176,32,0.7)] animate-pulse";
    return "bg-rose-500 shadow-[0_0_8px_rgba(255,77,94,0.7)]";
  };

  // Extract HH:MM and SS from clock
  const parts = clock.timeStr.split(":");
  const hoursMins = parts.length >= 2 ? `${parts[0]}:${parts[1]}` : clock.timeStr;
  const seconds = parts.length >= 3 ? parts[2].split(" ")[0] : "";
  const ampm = clock.timeStr.includes(" ") ? clock.timeStr.split(" ")[1] : "";

  return (
    <header className="relative z-30 flex h-14 w-full items-center justify-between px-6 select-none bg-transparent">
      {/* LEFT: Small ring logo + "JARVIS" wordmark in thin letter-spaced Orbitron */}
      <div className="flex items-center gap-3">
        {/* Arc ring mini logo */}
        <div className="relative flex h-7 w-7 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-white/20 animate-[spin_12s_linear_infinite]" />
          <div className="absolute inset-1 rounded-full border-t border-b border-[#7be8ff]/60 animate-[spin_6s_linear_infinite_reverse]" />
          <div className="h-1.5 w-1.5 rounded-full bg-[#7be8ff] shadow-[0_0_8px_#7be8ff]" />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-['Orbitron'] text-sm font-light tracking-[0.35em] text-white/90">
            JARVIS
          </span>
          {MOCK_TOOLS && (
            <span className="rounded-full bg-white/[0.06] border border-white/[0.1] px-2 py-0.5 text-[9px] font-['Inter'] font-normal text-white/40 tracking-wider">
              MOCK
            </span>
          )}
        </div>
      </div>

      {/* CENTER: Status Pill and Tap to go Live button */}
      <div className="flex items-center gap-2">
        <GlassTooltip content="Live Voice Status">
          <div className="flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.05] backdrop-blur-[20px] px-3.5 py-1 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
            <span className={`h-1.5 w-1.5 rounded-full ${getConnectionDot()}`} />
            <span className="font-['Orbitron'] text-[10px] font-medium tracking-[0.2em] text-[#7be8ff]/90 uppercase">
              {currentCaption}
            </span>
          </div>
        </GlassTooltip>
      </div>

      {/* RIGHT: Clock (HH:MM large thin, seconds small), date below, settings and fullscreen glass buttons */}
      <div className="flex items-center gap-4">
        {/* Mobile drawer trigger */}
        <button
          onClick={() => setMobilePanelsOpen(true)}
          className="xl:hidden flex items-center gap-1.5 rounded-full border border-white/[0.14] bg-white/[0.06] px-3 py-1 text-xs font-['Inter'] text-white/80 hover:bg-white/[0.12] transition-all"
          aria-label="Open HUD Panels"
        >
          <Layers className="h-3.5 w-3.5 text-[#7be8ff]" />
          <span>Panels</span>
        </button>

        {/* Digital Clock */}
        <div className="hidden sm:flex flex-col items-end text-right">
          <div className="flex items-baseline gap-1">
            <span className="font-['Orbitron'] text-base font-light tracking-wider text-white/90 tabular-nums">
              {hoursMins}
            </span>
            {seconds && (
              <span className="font-['JetBrains_Mono'] text-[10px] text-white/45 tabular-nums">
                :{seconds}
              </span>
            )}
            {ampm && (
              <span className="font-['Inter'] text-[9px] text-white/35 ml-0.5 uppercase">
                {ampm}
              </span>
            )}
          </div>
          <span className="font-['Inter'] text-[10px] font-normal text-white/45 tracking-wide">
            {clock.dayStr}, {clock.dateStr}
          </span>
        </div>

        {/* Small Round Glass Buttons */}
        <div className="flex items-center gap-1.5">
          {onOpenHistory && (
            <GlassTooltip content="Conversation History">
              <button
                onClick={onOpenHistory}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.05] text-white/70 hover:border-white/[0.25] hover:bg-white/[0.12] hover:text-[#7be8ff] transition-all active:scale-95 shadow-[0_4px_15px_rgba(0,0,0,0.2)]"
                aria-label="Conversation History"
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
            </GlassTooltip>
          )}

          <GlassTooltip content="System Settings">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.05] text-white/70 hover:border-white/[0.25] hover:bg-white/[0.12] hover:text-[#7be8ff] transition-all active:scale-95 shadow-[0_4px_15px_rgba(0,0,0,0.2)]"
              aria-label="Settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </GlassTooltip>

          <GlassTooltip content={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
            <button
              onClick={toggleFullscreen}
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.05] text-white/70 hover:border-white/[0.25] hover:bg-white/[0.12] hover:text-[#7be8ff] transition-all active:scale-95 shadow-[0_4px_15px_rgba(0,0,0,0.2)]"
              aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </GlassTooltip>
        </div>
      </div>
    </header>
  );
};

import React, { useEffect, useState } from "react";
import { GlassCard } from "../common/GlassCard";
import type { OrbState } from "../../types";
import { useJarvisStore } from "../../store/jarvisStore";

interface DebugStats {
  sendToFirstTokenMs: number | null;
  firstTokenToFirstAudioMs: number | null;
  totalTimeMs: number | null;
  speechEngine: string;
  voiceEngine: string;
  lastError: string | null;
}

interface DebugOverlayProps {
  stats: DebugStats;
  visible: boolean;
  onClose: () => void;
}

interface ChatHealth {
  ok: boolean;
  model: string;
  ms: number;
  error?: string;
}

const ALL_STATES: OrbState[] = [
  "idle",
  "listening",
  "thinking",
  "executing",
  "speaking",
  "error",
  "offline",
];

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ stats, visible, onClose }) => {
  const currentOrbState = useJarvisStore((state) => state.orbState);
  const setOrbState = useJarvisStore((state) => state.setOrbState);
  const addToast = useJarvisStore((state) => state.addToast);
  const [chatHealth, setChatHealth] = useState<ChatHealth | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const checkHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await fetch("/api/chat-health");
      const data = await res.json();
      setChatHealth(data);
      if (!data.ok) {
        addToast({
          type: "error",
          title: "Gemini Core Fault",
          message: data.error || "Server health test failed",
        });
      }
    } catch (err: any) {
      const errText = err?.message || "Failed to reach /api/chat-health";
      setChatHealth({ ok: false, model: "unreachable", ms: 0, error: errText });
      addToast({
        type: "error",
        title: "Gemini Core Unreachable",
        message: errText,
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    if (visible && !chatHealth) {
      checkHealth();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 animate-in fade-in zoom-in-95 duration-200">
      <GlassCard className="p-4 w-80 text-xs font-['JetBrains_Mono'] border-cyan-500/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
          <div className="flex items-center gap-1.5 text-[#7be8ff]">
            <span className="h-2 w-2 rounded-full bg-[#7be8ff] animate-pulse" />
            <span className="font-['Orbitron'] text-[10px] tracking-wider uppercase font-semibold">
              DEBUG TELEMETRY [D]
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-xs px-1"
          >
            ×
          </button>
        </div>

        <div className="space-y-1.5 text-white/80">
          {/* Chat Health status */}
          <div className="flex items-center justify-between bg-white/[0.04] p-1.5 rounded-lg border border-white/10 mb-2">
            <div>
              <span className="text-white/50 text-[10px] block">Core API Health:</span>
              <span className={`text-[11px] font-semibold ${chatHealth?.ok ? "text-emerald-400" : "text-rose-400"}`}>
                {chatHealth ? (chatHealth.ok ? `OK (${chatHealth.model})` : "FAULT") : isCheckingHealth ? "Testing..." : "--"}
              </span>
            </div>
            {chatHealth?.ms ? (
              <span className="text-white/60 text-[10px]">{chatHealth.ms}ms</span>
            ) : null}
            <button
              onClick={checkHealth}
              disabled={isCheckingHealth}
              className="text-[10px] text-[#7be8ff] hover:underline"
            >
              Recheck
            </button>
          </div>

          <div className="flex justify-between">
            <span className="text-white/45">Send → 1st Token:</span>
            <span className="text-[#7be8ff]">
              {stats.sendToFirstTokenMs !== null ? `${stats.sendToFirstTokenMs}ms` : "--"}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-white/45">1st Token → Audio:</span>
            <span className="text-[#7be8ff]">
              {stats.firstTokenToFirstAudioMs !== null ? `${stats.firstTokenToFirstAudioMs}ms` : "--"}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-white/45">Total Turnaround:</span>
            <span className="text-white font-medium">
              {stats.totalTimeMs !== null ? `${stats.totalTimeMs}ms` : "--"}
            </span>
          </div>

          <div className="flex justify-between pt-1 border-t border-white/10">
            <span className="text-white/45">Speech (ASR):</span>
            <span className="text-white/90">{stats.speechEngine}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-white/45">Voice (TTS):</span>
            <span className="text-white/90">{stats.voiceEngine}</span>
          </div>

          {stats.lastError && (
            <div className="pt-1.5 mt-1 border-t border-rose-500/30 text-rose-300 text-[11px] break-words">
              <span className="text-rose-400 font-semibold block">Last Error:</span>
              {stats.lastError}
            </div>
          )}

          {/* PART 4: State-Test Buttons to force each orb state */}
          <div className="pt-2 mt-2 border-t border-white/10">
            <span className="text-white/50 text-[10px] block mb-1.5">Force Orb State Test:</span>
            <div className="grid grid-cols-4 gap-1">
              {ALL_STATES.map((s) => (
                <button
                  key={s}
                  onClick={() => setOrbState(s)}
                  className={`px-1.5 py-1 rounded text-[10px] font-mono transition-all text-center ${
                    currentOrbState === s
                      ? "bg-[#7be8ff] text-black font-bold shadow-[0_0_8px_#7be8ff]"
                      : "bg-white/10 hover:bg-white/20 text-white/80"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

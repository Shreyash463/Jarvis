/**
 * Tactical HUD Bottom Bar
 * Height 40px: Build version, Mock Mode badge, hotkey hints, latency metric, and encryption seal.
 */

import React from "react";
import { ShieldCheck, Zap } from "lucide-react";
import { USE_MOCK } from "../../config";
import { useJarvisStore } from "../../store/jarvisStore";

export const BottomBar: React.FC = () => {
  const latencyMs = useJarvisStore((state) => state.latencyMs);

  return (
    <footer className="relative z-30 flex h-10 w-full items-center justify-between border-t border-[var(--line)] bg-[var(--bg-1)]/80 px-4 text-xs backdrop-blur-md select-none font-['Rajdhani']">
      {/* LEFT: Version & Mode Badge */}
      <div className="flex items-center gap-2.5">
        <span className="font-['Orbitron'] text-[10px] font-bold tracking-[0.14em] text-[var(--text-mid)]">
          JARVIS v0.1 UI BUILD
        </span>

        {USE_MOCK && (
          <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-['Orbitron'] text-[9px] font-bold tracking-wider text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            MOCK MODE
          </span>
        )}
      </div>

      {/* CENTER: Hotkey hints */}
      <div className="hidden md:flex items-center gap-4 text-[11px] font-semibold text-[var(--text-low)] tracking-wider">
        <div className="flex items-center gap-1.5">
          <kbd className="rounded border border-[var(--line)] bg-[var(--bg-0)] px-1.5 py-0.5 font-['JetBrains_Mono'] text-[9px] text-[var(--cyan)]">
            SPACE
          </kbd>
          <span>HOLD TO TALK</span>
        </div>
        <span className="opacity-40">·</span>
        <div className="flex items-center gap-1.5">
          <kbd className="rounded border border-[var(--line)] bg-[var(--bg-0)] px-1.5 py-0.5 font-['JetBrains_Mono'] text-[9px] text-[var(--cyan)]">
            CTRL+K
          </kbd>
          <span>COMMANDS</span>
        </div>
        <span className="opacity-40">·</span>
        <div className="flex items-center gap-1.5">
          <kbd className="rounded border border-[var(--line)] bg-[var(--bg-0)] px-1.5 py-0.5 font-['JetBrains_Mono'] text-[9px] text-[var(--cyan)]">
            ESC
          </kbd>
          <span>CANCEL</span>
        </div>
      </div>

      {/* RIGHT: Telemetry Latency & Encryption Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-mid)]">
          <Zap className="h-3 w-3 text-[var(--cyan)] opacity-70" />
          <span className="font-['JetBrains_Mono'] text-[10px] tabular-nums text-[var(--cyan-soft)]">
            {latencyMs}ms
          </span>
        </div>

        <span className="hidden sm:block h-3 w-[1px] bg-[var(--line)]" />

        <div className="flex items-center gap-1 text-[11px] font-bold tracking-widest text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span className="hidden sm:inline font-['Orbitron'] text-[9px]">ENCRYPTED LINK</span>
        </div>
      </div>
    </footer>
  );
};

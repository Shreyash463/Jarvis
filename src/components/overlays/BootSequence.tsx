/**
 * Tactical Boot Sequence Overlay
 * Stark Industries neural interface initialization screen.
 * Typing terminal diagnostic logs, vector ring drawing, and time-aware greeting.
 * Skippable via click or keyboard key; persists per session via sessionStorage.
 */

import React, { useEffect, useState } from "react";
import { getTimeGreeting } from "../../utils/personality";

interface BootSequenceProps {
  onComplete: (greeting: string) => void;
}

const BOOT_LOGS = [
  "INITIALIZING MARK-VII HEURISTIC CORE... OK",
  "LOADING NEURAL SYNAPTIC INTERFACE... OK",
  "ESTABLISHING SECURE TELEMETRY LINK... OK",
  "SYNCING CONNECTED APPLICATIONS & WORKSPACES... OK",
  "CALIBRATING HOLOGRAPHIC HUD SENSORS... OK",
  "J.A.R.V.I.S ONLINE",
];

export const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const [isFading, setIsFading] = useState(false);

  // Skip boot sequence immediately
  const handleSkip = () => {
    setIsFading(true);
    setTimeout(() => {
      onComplete(getTimeGreeting());
    }, 400);
  };

  useEffect(() => {
    const handleKeyDown = () => handleSkip();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sequence runner
  useEffect(() => {
    if (currentLineIndex >= BOOT_LOGS.length) {
      const timer = setTimeout(() => {
        setIsFading(true);
        setTimeout(() => {
          onComplete(getTimeGreeting());
        }, 600);
      }, 700);
      return () => clearTimeout(timer);
    }

    const targetLine = BOOT_LOGS[currentLineIndex];
    let charIdx = 0;

    const charInterval = setInterval(() => {
      charIdx++;
      setTypedText(targetLine.slice(0, charIdx));

      if (charIdx >= targetLine.length) {
        clearInterval(charInterval);
        setTimeout(() => {
          setCompletedLines((prev) => [...prev, targetLine]);
          setTypedText("");
          setCurrentLineIndex((prev) => prev + 1);
        }, 140);
      }
    }, 18);

    return () => clearInterval(charInterval);
  }, [currentLineIndex, onComplete]);

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#03060d] text-[var(--cyan)] select-none transition-opacity duration-700 cursor-pointer ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background Arc Reactor Drawing Animation */}
      <div className="relative mb-8 flex h-48 w-48 items-center justify-center">
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-[var(--cyan)]/40 border-t-[var(--cyan)] animate-[spin_3s_linear_infinite]" />
        {/* Inner Ring */}
        <div className="absolute inset-4 rounded-full border border-dashed border-[var(--cyan-soft)]/60 animate-[spin_6s_linear_infinite_reverse]" />
        {/* Triangle Lattice */}
        <div className="h-16 w-16 border-2 border-[var(--cyan)] rotate-45 flex items-center justify-center shadow-[0_0_20px_var(--cyan)]">
          <div className="h-4 w-4 bg-[var(--cyan)] shadow-[0_0_15px_white]" />
        </div>
      </div>

      {/* Terminal Diagnostic Stream */}
      <div className="w-full max-w-lg px-6 font-['JetBrains_Mono'] text-xs tracking-wider">
        <div className="space-y-1.5 min-h-[140px]">
          {completedLines.map((line, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 ${
                line.includes("ONLINE")
                  ? "font-['Orbitron'] text-sm sm:text-base font-black text-white drop-shadow-[0_0_12px_var(--cyan)] pt-2"
                  : "text-[var(--text-mid)]"
              }`}
            >
              <span className="text-[var(--cyan)] opacity-70">&gt;</span>
              <span>{line}</span>
            </div>
          ))}

          {typedText && (
            <div className="flex items-center gap-2 text-[var(--cyan-soft)]">
              <span className="text-[var(--cyan)] opacity-70">&gt;</span>
              <span>{typedText}</span>
              <span className="h-3.5 w-1.5 bg-[var(--cyan)] animate-pulse" />
            </div>
          )}
        </div>

        {/* Skip hint */}
        <div className="mt-8 text-center font-['Rajdhani'] text-[11px] text-[var(--text-low)] tracking-widest uppercase">
          [ CLICK ANYWHERE OR PRESS ANY KEY TO INITIALIZE IMMEDIATELY ]
        </div>
      </div>
    </div>
  );
};

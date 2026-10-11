import React from "react";

interface CinematicCaptionsProps {
  // Live user speech or typed query for the active turn
  userTranscript?: string;
  // Current reply text from Jarvis for the active turn
  replyText?: string;
  // Fallback status caption (e.g. "Connecting...", "Thinking...")
  statusText?: string;
  isStreaming?: boolean;
  visible?: boolean;
}

/**
 * Cinematic Subtitles under the Arc Reactor Orb
 * - Shows ONLY the current turn
 * - User words show small and light
 * - Jarvis reply shows large and replaces them
 * - Fades out in 200ms when a new turn starts or ~8 seconds after Jarvis finishes
 */
export const CinematicCaptions: React.FC<CinematicCaptionsProps> = ({
  userTranscript,
  replyText,
  statusText,
  isStreaming = false,
  visible = true,
}) => {
  // Split assistant reply into visible lines (max 2 lines visible)
  const formatReplyLines = (text: string) => {
    if (!text) return [];
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (sentences.length <= 2) {
      return sentences;
    }
    return sentences.slice(-2);
  };

  const replyLines = formatReplyLines(replyText || "");
  const hasContent = Boolean(userTranscript || replyText || statusText);

  if (!hasContent || !visible) {
    return (
      <div className="h-20 flex items-center justify-center pointer-events-none select-none transition-opacity duration-200 opacity-0" />
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-[5rem] max-w-2xl mx-auto px-4 text-center pointer-events-none select-none transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* 1. Live User Speech in small light text (shown before Jarvis reply begins) */}
      {!replyText && userTranscript && (
        <div className="mb-1.5 animate-in fade-in duration-150">
          <p className="font-['Inter'] text-xs sm:text-sm font-light tracking-wide text-white/70 italic drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            &ldquo;{userTranscript}&rdquo;
          </p>
        </div>
      )}

      {/* 2. Status Caption (Connecting... / Thinking...) if no reply text yet */}
      {!replyText && statusText && (
        <div className="flex items-center gap-2 animate-in fade-in duration-150 mt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#7be8ff] animate-ping" />
          <span className="font-['Orbitron'] text-xs tracking-[0.2em] text-[#7be8ff]/90 uppercase">
            {statusText}
          </span>
        </div>
      )}

      {/* 3. Jarvis's Reply as large subtitles, replacing user speech */}
      {replyText && (
        <div className="flex flex-col items-center gap-1 w-full animate-in fade-in duration-200">
          {replyLines.length === 2 && (
            <p className="font-['Inter'] text-sm sm:text-base font-light text-white/35 tracking-wide transition-opacity duration-300 transform -translate-y-0.5 line-clamp-1">
              {replyLines[0]}
            </p>
          )}

          <p className="font-['Inter'] text-base sm:text-lg md:text-xl font-normal text-white/95 tracking-wide drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] leading-snug">
            {replyLines[replyLines.length - 1]}
            {isStreaming && (
              <span className="inline-block h-3.5 w-1.5 ml-1.5 bg-[#7be8ff] animate-pulse align-middle" />
            )}
          </p>
        </div>
      )}
    </div>
  );
};

import React, { KeyboardEvent, useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, MicOff, Square, Volume2, VolumeX } from "lucide-react";

interface CommandDockProps {
  onSend: (text: string) => void;
  isListening: boolean;
  onToggleMic: () => void;
  isVoiceMuted: boolean;
  onToggleMute: () => void;
  isBusy: boolean;
  onAbort: () => void;
  disabled?: boolean;
}

const QUICK_PROMPTS = [
  "What's on my schedule today?",
  "Check my inbox",
  "System vitals",
  "Weather update",
];

export const CommandDock: React.FC<CommandDockProps> = ({
  onSend,
  isListening,
  onToggleMic,
  isVoiceMuted,
  onToggleMute,
  isBusy,
  onAbort,
  disabled = false,
}) => {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center">
      {/* Quick Prompts (visible when idle) */}
      {!isBusy && !isListening && (
        <div className="mb-2.5 flex flex-wrap items-center justify-center gap-1.5 select-none px-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSend(prompt)}
              disabled={disabled}
              className="rounded-full border border-white/[0.12] bg-white/[0.04] backdrop-blur-md px-3 py-1 font-['Inter'] text-[11px] font-normal text-white/60 hover:border-white/[0.25] hover:bg-white/[0.1] hover:text-[#7be8ff] transition-all duration-200 active:scale-95 disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Floating Command Dock Pill */}
      <div className="relative flex w-full items-center gap-2 rounded-full border border-white/[0.16] bg-gradient-to-r from-white/[0.09] to-white/[0.04] backdrop-blur-[28px] saturate-[150%] px-3 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(123,232,255,0.05)] focus-within:border-[#7be8ff]/50 focus-within:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(123,232,255,0.2)] transition-all">
        {/* Mute toggle button */}
        <button
          type="button"
          onClick={onToggleMute}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 ${
            isVoiceMuted
              ? "border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(255,176,32,0.3)]"
              : "border-white/[0.14] bg-white/[0.05] text-white/70 hover:border-white/[0.25] hover:text-[#7be8ff] hover:bg-white/[0.1]"
          }`}
          title={isVoiceMuted ? "Unmute Voice" : "Mute Voice"}
          aria-label={isVoiceMuted ? "Unmute Voice" : "Mute Voice"}
        >
          {isVoiceMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {/* Microphone button */}
        <button
          type="button"
          onClick={onToggleMic}
          disabled={disabled}
          className={`group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 disabled:opacity-40 ${
            isListening
              ? "border-[#7be8ff] bg-[#7be8ff]/30 text-white shadow-[0_0_20px_rgba(123,232,255,0.7)] animate-pulse"
              : "border-white/[0.14] bg-white/[0.05] text-white/80 hover:border-[#7be8ff]/60 hover:text-[#7be8ff] hover:bg-white/[0.1]"
          }`}
          title={isListening ? "Stop listening (Space / Click)" : "Start speaking (Hold Space / Click)"}
          aria-label={isListening ? "Stop microphone" : "Start microphone"}
        >
          {isListening ? (
            <MicOff className="h-4 w-4 text-white drop-shadow-[0_0_6px_white]" />
          ) : (
            <Mic className="h-4 w-4 transition-transform group-hover:scale-110 text-[#7be8ff]" />
          )}
        </button>

        {/* Input box */}
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "Listening to your voice, sir..." : "Command or ask Jarvis, sir..."}
          disabled={disabled}
          className="flex-1 bg-transparent px-2 py-1 font-['Inter'] text-sm text-white/95 placeholder-white/35 focus:outline-none disabled:opacity-50 border-none ring-0"
        />

        {/* Send button */}
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={!text.trim() || disabled}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7be8ff] text-[#02050c] hover:bg-[#a8f0ff] hover:shadow-[0_0_15px_#7be8ff] transition-all duration-200 active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
          title="Send directive"
          aria-label="Send directive"
        >
          <ArrowUp className="h-4 w-4 stroke-[2.5]" />
        </button>

        {/* Abort button (visible when thinking or speaking or executing) */}
        {isBusy && (
          <button
            type="button"
            onClick={onAbort}
            className="flex items-center gap-1.5 rounded-full border border-rose-500/50 bg-rose-500/20 px-3 py-1.5 font-['Orbitron'] text-[10px] font-bold tracking-wider text-rose-300 hover:border-rose-400 hover:bg-rose-500/30 transition-all active:scale-95 shadow-[0_0_15px_rgba(255,82,99,0.4)] animate-pulse"
            title="Abort active directive (Esc)"
            aria-label="Abort active directive"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>ABORT</span>
          </button>
        )}
      </div>
    </div>
  );
};

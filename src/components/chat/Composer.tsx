import React, { KeyboardEvent, useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  isIdle?: boolean;
}

const QUICK_PROMPTS = [
  "What's on my schedule today?",
  "Check my inbox",
  "System status",
  "Weather today",
];

/**
 * Modern floating glass composer
 * Glass pill with auto-growing textarea and glowing circular send button.
 */
export const Composer: React.FC<ComposerProps> = ({
  onSend,
  disabled = false,
  isIdle = true,
}) => {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const nextHeight = Math.min(90, Math.max(36, textareaRef.current.scrollHeight));
      textareaRef.current.style.height = `${nextHeight}px`;
    }
  }, [text]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "36px";
    }
  };

  const handleChipClick = (prompt: string) => {
    if (disabled) return;
    onSend(prompt);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center">
      {/* Quick Suggestion Chips */}
      {isIdle && (
        <div className="mb-2.5 flex flex-wrap items-center justify-center gap-1.5 select-none px-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleChipClick(prompt)}
              disabled={disabled}
              className="rounded-full border border-white/[0.12] bg-white/[0.05] backdrop-blur-md px-3 py-1 font-['Inter'] text-[11px] font-normal text-white/60 hover:border-white/[0.25] hover:bg-white/[0.1] hover:text-[#7be8ff] transition-all duration-200 active:scale-95 disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Floating Glass Pill Input */}
      <div className="relative flex w-full items-center gap-2 rounded-full border border-white/[0.16] bg-gradient-to-r from-white/[0.09] to-white/[0.04] backdrop-blur-[28px] saturate-[150%] px-4 py-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(123,232,255,0.05)] focus-within:border-[#7be8ff]/50 focus-within:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(123,232,255,0.15)] transition-all">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask or command Jarvis, sir..."
          disabled={disabled}
          rows={1}
          className="max-h-[90px] min-h-[36px] flex-1 resize-none bg-transparent py-1.5 font-['Inter'] text-sm text-white/90 placeholder-white/35 focus:outline-none disabled:opacity-50"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || disabled}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7be8ff] text-[#02050c] hover:bg-[#a8f0ff] hover:shadow-[0_0_15px_#7be8ff] transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Send message"
        >
          <ArrowUp className="h-4 w-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};

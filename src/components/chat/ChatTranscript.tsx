import React, { useEffect, useRef, useState } from "react";
import { ArrowDown, Loader2, Lock, Terminal } from "lucide-react";
import type { ChatMessage, ToolCall } from "../../types";

interface ChatTranscriptProps {
  messages: ChatMessage[];
  toolCalls: ToolCall[];
  isThinking: boolean;
  onChipClick?: (prompt: string) => void;
}

/**
 * Modern floating glass transcript stream
 * Renders light, airy chat bubbles anchored to bottom with smooth scrolling.
 */
export const ChatTranscript: React.FC<ChatTranscriptProps> = ({
  messages,
  toolCalls,
  isThinking,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setIsScrolledUp(false);
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsScrolledUp(!atBottom);
  };

  useEffect(() => {
    if (!isScrolledUp) {
      scrollToBottom();
    }
  }, [messages, isThinking, isScrolledUp]);

  const activeTool = toolCalls.find(
    (tc) =>
      tc.status === "running" ||
      tc.status === "awaiting_confirmation" ||
      tc.status === "pending"
  );

  return (
    <div className="relative flex h-full flex-col font-['Inter']">
      {/* Scrollable Message Feed */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2 scroll-smooth scrollbar-thin"
        aria-live="polite"
      >
        <div className="flex min-h-full flex-col justify-end space-y-3.5">
          {messages.length === 0 && (
            <div className="flex h-20 items-center justify-center text-center text-xs text-white/35 font-light">
              <p>Ready for your command, sir.</p>
            </div>
          )}

          {messages.map((msg) => {
            if (msg.role === "system") {
              return (
                <div key={msg.id} className="flex justify-center my-1 text-[11px] text-white/35">
                  <span>{msg.text}</span>
                </div>
              );
            }

            const isUser = msg.role === "user";

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
              >
                {/* Bubble */}
                <div
                  className={`relative max-w-[85%] rounded-[18px] px-4 py-2.5 text-[13px] leading-relaxed transition-all ${
                    isUser
                      ? "bg-white/[0.12] border border-white/[0.18] text-white/95 shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-md"
                      : "bg-white/[0.05] border border-white/[0.1] text-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.25)] backdrop-blur-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Streaming indicator */}
                  {msg.status === "streaming" && (
                    <span className="inline-block h-3 w-1.5 ml-1 bg-[#7be8ff] animate-[pulse_0.8s_ease-in-out_infinite] align-middle" />
                  )}
                </div>
              </div>
            );
          })}

          {/* Inline Active Tool Chip */}
          {activeTool && (
            <div className="flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.06] backdrop-blur-md px-3.5 py-1.5 text-xs text-white/70 shadow-[0_4px_15px_rgba(0,0,0,0.2)] w-fit">
              {activeTool.status === "running" ? (
                <Loader2 className="h-3 w-3 animate-spin text-[#7be8ff]" />
              ) : activeTool.status === "awaiting_confirmation" ? (
                <Lock className="h-3 w-3 text-amber-400 animate-pulse" />
              ) : (
                <Terminal className="h-3 w-3 text-[#7be8ff]" />
              )}
              <span className="font-['Inter'] text-xs font-normal text-[#7be8ff]">
                {activeTool.label}
              </span>
            </div>
          )}

          {/* Thinking indicator */}
          {isThinking && (
            <div className="flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-3.5 py-1.5 w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7be8ff] animate-ping" />
              <span className="font-['Inter'] text-[11px] text-white/50">
                Processing...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Jump to latest pill */}
      {isScrolledUp && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-2 right-4 z-30 flex items-center gap-1.5 rounded-full border border-white/[0.2] bg-white/[0.1] backdrop-blur-md px-3 py-1 font-['Inter'] text-[10px] font-medium text-[#7be8ff] shadow-lg hover:bg-white/[0.16] transition-all"
        >
          <ArrowDown className="h-3 w-3" />
          <span>Latest</span>
        </button>
      )}
    </div>
  );
};

import React from "react";
import { MessageSquare, X, Trash2 } from "lucide-react";
import type { ChatMessage } from "../../types";
import { useJarvisStore } from "../../store/jarvisStore";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ isOpen, onClose, messages }) => {
  const clearTranscript = useJarvisStore((state) => state.clearTranscript);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end p-3 bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-200"
    >
      {/* Floating Glass Sheet (12px margin, 28px radius) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[calc(100vh-24px)] w-full max-w-md flex-col rounded-[28px] border border-white/[0.16] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.6),0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-[40px] saturate-[180%] overflow-y-auto scrollbar-none animate-in slide-in-from-right duration-300"
        style={{
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 42%, rgba(255,255,255,0.08) 100%), rgba(8,18,32,0.65)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.12] mb-4">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-4 w-4 text-[#7be8ff]" />
            <h3 className="font-['Inter'] text-base font-semibold text-white/95 tracking-tight">
              Conversation history
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={clearTranscript}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-['Inter'] text-white/60 hover:text-rose-300 hover:border-rose-400/40 transition-colors"
                title="Clear conversation history"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.05] text-white/70 hover:border-white/[0.25] hover:text-white transition-all active:scale-95"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="mt-2 space-y-4 flex-1">
          {messages.length === 0 ? (
            <div className="py-16 text-center text-xs text-white/40 font-['Inter']">
              No previous conversations recorded in this session.
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";
              const time = new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-white/40 font-['JetBrains_Mono']">
                    <span>{isUser ? "You" : "J.A.R.V.I.S"}</span>
                    <span>·</span>
                    <span>{time}</span>
                  </div>
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed font-['Inter'] ${
                      isUser
                        ? "bg-white/[0.12] border border-white/[0.18] text-white/95"
                        : "bg-white/[0.05] border border-white/[0.1] text-white/85"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

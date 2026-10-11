import React from "react";
import { Mail, X } from "lucide-react";
import type { EmailItem } from "../../types";

interface InboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  emails: EmailItem[];
}

export const InboxDrawer: React.FC<InboxDrawerProps> = ({
  isOpen,
  onClose,
  emails,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end p-3 bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[calc(100vh-24px)] w-full max-w-md flex-col rounded-[28px] border border-white/[0.16] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.6),0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-[40px] saturate-[180%] overflow-y-auto scrollbar-none animate-in slide-in-from-right duration-300 font-['Inter']"
        style={{
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 42%, rgba(255,255,255,0.08) 100%), rgba(8,18,32,0.65)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.12] mb-5">
          <div>
            <h3 className="text-base font-semibold text-white/95 tracking-tight">
              Inbox
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              Secure communications ({emails.length} messages)
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.05] text-white/70 hover:border-white/[0.25] hover:text-white transition-all active:scale-95"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Email Feed */}
        <div className="space-y-3 flex-1">
          {emails.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 transition-all ${
                item.unread
                  ? "border-[#7be8ff]/40 bg-[#7be8ff]/[0.06] shadow-[0_0_15px_rgba(123,232,255,0.06)]"
                  : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.14]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {item.unread && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7be8ff] shadow-[0_0_6px_#7be8ff] shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-white/90 truncate">
                    {item.from.split("<")[0].trim()}
                  </span>
                </div>
                <span className="font-['JetBrains_Mono'] text-[10px] text-white/40 shrink-0">
                  {item.receivedAt}
                </span>
              </div>
              <h4 className="mt-1.5 text-xs font-medium text-white/95">
                {item.subject}
              </h4>
              <p className="mt-1 text-xs text-white/50 line-clamp-2">
                {item.snippet}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

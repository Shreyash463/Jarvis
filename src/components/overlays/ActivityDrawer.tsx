import React, { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Clock, Loader2, Lock, Terminal, X, XCircle } from "lucide-react";
import type { ToolCall } from "../../types";

interface ActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  toolCalls: ToolCall[];
}

export const ActivityDrawer: React.FC<ActivityDrawerProps> = ({
  isOpen,
  onClose,
  toolCalls,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
              Activity log
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              Tool executions and directive history ({toolCalls.length})
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

        {/* Activity feed */}
        <div className="space-y-2.5 flex-1">
          {toolCalls.length === 0 ? (
            <p className="text-xs text-white/40 py-12 text-center">
              No directives executed yet, sir.
            </p>
          ) : (
            toolCalls.map((tc) => {
              const isExpanded = expandedId === tc.id;
              const isAwaiting = tc.status === "awaiting_confirmation";
              return (
                <div
                  key={tc.id}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden transition-all hover:border-white/[0.16]"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : tc.id)}
                    className="flex w-full items-center justify-between p-3.5 text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {tc.status === "running" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#7be8ff] shrink-0" />
                      ) : tc.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : tc.status === "error" || tc.status === "denied" ? (
                        <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-['JetBrains_Mono'] text-xs text-white/90 font-medium truncate">
                            {tc.name}
                          </span>
                          {isAwaiting && (
                            <span className="flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[9px] text-amber-300">
                              <Lock className="h-2.5 w-2.5" />
                              Auth
                            </span>
                          )}
                        </div>
                        {tc.resultSummary && (
                          <p className="text-[11px] text-white/50 truncate mt-0.5">
                            {tc.resultSummary}
                          </p>
                        )}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-white/40 shrink-0 ml-2" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-white/40 shrink-0 ml-2" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-white/[0.06] bg-black/30 p-3 font-['JetBrains_Mono'] text-[11px] text-white/70 space-y-2">
                      <div>
                        <span className="text-white/40 block mb-1">Arguments:</span>
                        <pre className="overflow-x-auto rounded-lg bg-black/40 p-2 text-white/80">
                          {JSON.stringify(tc.args, null, 2)}
                        </pre>
                      </div>
                      {tc.resultSummary && (
                        <div>
                          <span className="text-white/40 block mb-1">Summary:</span>
                          <p className="text-white/80">{tc.resultSummary}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

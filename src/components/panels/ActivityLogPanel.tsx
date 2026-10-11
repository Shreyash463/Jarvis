import React from "react";
import { CheckCircle2, Clock, Loader2, Lock, Terminal, XCircle } from "lucide-react";
import { GlassCard } from "../common/GlassCard";
import type { ToolCall } from "../../types";

interface ActivityLogPanelProps {
  toolCalls: ToolCall[];
  onOpenActivityDrawer?: () => void;
}

/**
 * Activity log: collapsed into a single small pill "● 3 actions run"
 * that expands into a drawer only when clicked.
 */
export const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({
  toolCalls,
  onOpenActivityDrawer,
}) => {
  const activeCount = toolCalls.filter((t) => t.status === "running").length;
  const count = toolCalls.length;

  return (
    <GlassCard
      className="p-3 cursor-pointer hover:border-[#7be8ff]/40"
      onClick={onOpenActivityDrawer}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              activeCount > 0
                ? "bg-amber-400 shadow-[0_0_8px_rgba(255,176,32,0.8)] animate-pulse"
                : "bg-emerald-400 shadow-[0_0_6px_rgba(45,255,163,0.7)]"
            }`}
          />
          <span className="font-['Inter'] text-xs font-normal text-white/80">
            {activeCount > 0 ? `${activeCount} running` : `${count} actions run`}
          </span>
        </div>

        <span className="font-['Inter'] text-[10px] text-[#7be8ff]/80">
          view log →
        </span>
      </div>
    </GlassCard>
  );
};

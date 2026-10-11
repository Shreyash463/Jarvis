import React from "react";
import { Check } from "lucide-react";
import { GlassCard } from "../common/GlassCard";
import { useJarvisStore } from "../../store/jarvisStore";
import type { TaskItem } from "../../types";

interface TasksPanelProps {
  tasks: TaskItem[];
  loading?: boolean;
}

/**
 * Tasks: compact card showing "1 of 4 done" with a thin progress line and only the top 2 tasks.
 */
export const TasksPanel: React.FC<TasksPanelProps> = ({ tasks }) => {
  const toggleTaskDone = useJarvisStore((state) => state.toggleTaskDone);

  const doneCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;
  const pct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
  const topTasks = tasks.slice(0, 2);

  return (
    <GlassCard className="p-3.5">
      <div className="flex items-center justify-between mb-2">
        <span className="font-['Inter'] text-[11px] font-normal tracking-wide text-white/55">
          tasks
        </span>
        <span className="font-['Inter'] text-[10px] text-white/45">
          {doneCount} of {totalCount} done
        </span>
      </div>

      {/* Thin progress line */}
      <div className="mb-2.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#7be8ff] to-[#2f7bff] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Top 2 Tasks */}
      <div className="space-y-1.5">
        {topTasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => toggleTaskDone(task.id)}
            className="flex w-full items-center gap-2 rounded-lg p-1 text-left hover:bg-white/[0.05] transition-all"
          >
            <div
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                task.done
                  ? "border-[#7be8ff] bg-[#7be8ff]/20 text-[#7be8ff]"
                  : "border-white/20 hover:border-white/40"
              }`}
            >
              {task.done && <Check className="h-3 w-3 stroke-[2.5]" />}
            </div>

            <span
              className={`truncate font-['Inter'] text-xs ${
                task.done ? "line-through text-white/35" : "text-white/85"
              }`}
            >
              {task.title}
            </span>
          </button>
        ))}
      </div>
    </GlassCard>
  );
};

import React from "react";
import { Clock, MapPin } from "lucide-react";
import { GlassCard } from "../common/GlassCard";
import type { CalendarEvent } from "../../types";

interface SchedulePanelProps {
  events: CalendarEvent[];
  onOpenScheduleDrawer?: () => void;
  loading?: boolean;
}

/**
 * Next up: ONE card showing only the next calendar event (time, title, location)
 * with a thin progress line showing time until it starts,
 * and a small "+3 more" button that opens the full schedule in a glass drawer.
 */
export const SchedulePanel: React.FC<SchedulePanelProps> = ({
  events,
  onOpenScheduleDrawer,
}) => {
  const nextEvent = events[0];
  const moreCount = Math.max(0, events.length - 1);

  if (!nextEvent) {
    return (
      <GlassCard className="p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="font-['Inter'] text-[11px] font-normal tracking-wide text-white/55">
            next up
          </span>
        </div>
        <p className="font-['Inter'] text-xs text-white/40 py-2">
          no events scheduled today
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-3.5">
      <div className="flex items-center justify-between mb-2">
        <span className="font-['Inter'] text-[11px] font-normal tracking-wide text-white/55">
          next up
        </span>
        {moreCount > 0 && (
          <button
            type="button"
            onClick={onOpenScheduleDrawer}
            className="rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] px-2 py-0.5 font-['Inter'] text-[10px] text-[#7be8ff]/90 transition-all"
          >
            +{moreCount} more
          </button>
        )}
      </div>

      <div className="my-1">
        <div className="flex items-baseline gap-1.5 font-['JetBrains_Mono'] text-xs text-[#7be8ff]/90">
          <Clock className="h-3 w-3 inline text-[#7be8ff]/70" />
          <span>{nextEvent.start}</span>
          <span className="text-white/30">–</span>
          <span>{nextEvent.end}</span>
        </div>

        <h4 className="mt-1 font-['Inter'] text-sm font-medium text-white/95 truncate">
          {nextEvent.title}
        </h4>

        {nextEvent.location && (
          <div className="mt-1 flex items-center gap-1 font-['Inter'] text-[11px] text-white/45 truncate">
            <MapPin className="h-3 w-3 shrink-0 text-white/35" />
            <span className="truncate">{nextEvent.location}</span>
          </div>
        )}
      </div>

      {/* Thin progress line indicating time progress */}
      <div className="mt-3">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#7be8ff] to-[#2f7bff]"
            style={{ width: "35%" }}
          />
        </div>
      </div>
    </GlassCard>
  );
};

import React from "react";
import { Clock, MapPin, X } from "lucide-react";
import type { CalendarEvent } from "../../types";

interface ScheduleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
}

export const ScheduleDrawer: React.FC<ScheduleDrawerProps> = ({
  isOpen,
  onClose,
  events,
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
              Schedule
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              Today's calendar agenda ({events.length} events)
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

        {/* Events List */}
        <div className="space-y-3 flex-1">
          {events.map((evt, idx) => {
            const isFirst = idx === 0;
            return (
              <div
                key={evt.id}
                className={`rounded-2xl border p-4 transition-all ${
                  isFirst
                    ? "border-[#7be8ff]/40 bg-[#7be8ff]/[0.08] shadow-[0_0_20px_rgba(123,232,255,0.1)]"
                    : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-['JetBrains_Mono'] text-xs text-[#7be8ff]/90">
                    <Clock className="h-3 w-3" />
                    <span>
                      {evt.start} – {evt.end}
                    </span>
                  </div>
                  {isFirst && (
                    <span className="rounded-full bg-[#7be8ff] px-2 py-0.5 text-[10px] font-semibold text-[#02050c]">
                      Next
                    </span>
                  )}
                </div>
                <h4 className="mt-2 text-sm font-medium text-white/95">
                  {evt.title}
                </h4>
                {evt.location && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-white/50">
                    <MapPin className="h-3 w-3 text-white/40" />
                    <span>{evt.location}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

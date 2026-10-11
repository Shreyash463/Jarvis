/**
 * Tactical Mobile Panels Sheet
 * Bottom slide-up drawer for responsive viewports (< 1100px)
 * Featuring tabs for Vitals, Apps, Weather, Schedule, Inbox, Tasks, and Activity Log.
 */

import React from "react";
import {
  Calendar,
  Cpu,
  Layers,
  ListTodo,
  Mail,
  Sun,
  Terminal,
  X,
} from "lucide-react";
import { useJarvisStore } from "../../store/jarvisStore";
import { SystemVitalsPanel } from "../panels/SystemVitalsPanel";
import { ConnectedAppsPanel } from "../panels/ConnectedAppsPanel";
import { WeatherPanel } from "../panels/WeatherPanel";
import { SchedulePanel } from "../panels/SchedulePanel";
import { InboxPanel } from "../panels/InboxPanel";
import { TasksPanel } from "../panels/TasksPanel";
import { ActivityLogPanel } from "../panels/ActivityLogPanel";

interface MobilePanelsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const TABS = [
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "inbox", label: "Inbox", icon: Mail },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "vitals", label: "Vitals", icon: Cpu },
  { id: "apps", label: "Apps", icon: Layers },
  { id: "weather", label: "Weather", icon: Sun },
  { id: "log", label: "Log", icon: Terminal },
] as const;

export const MobilePanelsSheet: React.FC<MobilePanelsSheetProps> = ({
  isOpen,
  onClose,
}) => {
  const activeTab = useJarvisStore((state) => state.activeMobileTab);
  const setActiveTab = useJarvisStore((state) => state.setActiveMobileTab);
  const stats = useJarvisStore((state) => state.stats);
  const dashboard = useJarvisStore((state) => state.dashboard);
  const toolCalls = useJarvisStore((state) => state.toolCalls);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] h-[650px] w-full flex-col rounded-t-xl border-t-2 border-[var(--cyan)] bg-[var(--bg-1)] shadow-2xl overflow-hidden"
      >
        {/* Header with Title and Close */}
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 bg-[var(--bg-0)]/60">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--cyan)] shadow-[0_0_8px_var(--cyan)]" />
            <h3 className="font-['Orbitron'] text-xs font-bold tracking-widest text-[var(--text-hi)] uppercase">
              TACTICAL TELEMETRY PANELS
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded text-[var(--text-low)] hover:text-white transition-colors"
            aria-label="Close Panels Sheet"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Horizontal Navigation Tabs (min 44px touch targets) */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--line)] bg-[var(--bg-0)]/80 px-2 py-1 scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded px-3 py-2 font-['Orbitron'] text-[11px] font-bold tracking-wider transition-all ${
                  isActive
                    ? "border border-[var(--cyan)] bg-[var(--cyan)]/20 text-[var(--cyan)] shadow-[0_0_10px_rgba(0,224,255,0.2)]"
                    : "border border-transparent text-[var(--text-mid)] hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Panel Content Viewport */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "schedule" && <SchedulePanel events={dashboard.events} />}
          {activeTab === "inbox" && <InboxPanel emails={dashboard.emails} />}
          {activeTab === "tasks" && <TasksPanel tasks={dashboard.tasks} />}
          {activeTab === "vitals" && <SystemVitalsPanel stats={stats} />}
          {activeTab === "apps" && <ConnectedAppsPanel connectors={dashboard.connectors} />}
          {activeTab === "weather" && <WeatherPanel weather={dashboard.weather} />}
          {activeTab === "log" && <ActivityLogPanel toolCalls={toolCalls} />}
        </div>
      </div>
    </div>
  );
};

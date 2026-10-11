import React, { useState } from "react";
import {
  Calendar,
  FileText,
  GitBranch,
  HardDrive,
  Hash,
  Layers,
  Mail,
  MessageSquare,
  Music,
} from "lucide-react";
import { GlassCard } from "../common/GlassCard";
import type { ConnectorStatus } from "../../types";

interface ConnectedAppsPanelProps {
  connectors: ConnectorStatus[];
  loading?: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Mail,
  Calendar,
  HardDrive,
  Music,
  GitBranch,
  FileText,
  MessageSquare,
  Hash,
};

/**
 * Apps dock: a 4x2 grid of round glass icon buttons (icons only, tiny green status dot,
 * name shows on hover as tooltip). No text list.
 */
export const ConnectedAppsPanel: React.FC<ConnectedAppsPanelProps> = ({ connectors }) => {
  const [hoveredApp, setHoveredApp] = useState<string | null>(null);

  return (
    <GlassCard className="p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-['Inter'] text-[11px] font-normal tracking-wide text-white/55">
          connected
        </span>
        <span className="font-['Inter'] text-[10px] text-white/35">
          {connectors.filter((c) => c.state === "connected").length}/{connectors.length}
        </span>
      </div>

      {/* 4x2 grid of round glass icon buttons */}
      <div className="grid grid-cols-4 gap-2">
        {connectors.map((app) => {
          const Icon = ICON_MAP[app.icon] || Layers;
          const isConnected = app.state === "connected";
          const isError = app.state === "error";

          const dotColor = isConnected
            ? "bg-emerald-400 shadow-[0_0_5px_rgba(45,255,163,0.8)]"
            : isError
            ? "bg-rose-400"
            : "bg-white/30";

          return (
            <div
              key={app.id}
              className="relative flex items-center justify-center"
              onMouseEnter={() => setHoveredApp(app.id)}
              onMouseLeave={() => setHoveredApp(null)}
            >
              <button
                type="button"
                className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] text-white/70 hover:border-white/[0.28] hover:bg-white/[0.1] hover:text-[#7be8ff] transition-all duration-200 active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
                aria-label={app.name}
              >
                <Icon className="h-4 w-4 transition-transform group-hover:scale-105" />
                {/* Tiny status dot on top-right */}
                <span className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${dotColor}`} />
              </button>

              {/* Tooltip on hover */}
              {hoveredApp === app.id && (
                <div className="pointer-events-none absolute -top-8 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/[0.18] bg-[#071322]/90 px-2.5 py-0.5 font-['Inter'] text-[10px] text-white/90 shadow-[0_8px_20px_rgba(0,0,0,0.5)] backdrop-blur-md">
                  <span>{app.name}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};

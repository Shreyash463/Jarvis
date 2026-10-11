/**
 * Tactical Glass HUD Panel
 * Standard Stark Industries holographic container with corner brackets,
 * Orbitron typography, subtle backdrop blur, and hover glow.
 */

import React, { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface HudPanelProps {
  title: string;
  icon?: LucideIcon;
  status?: "nominal" | "warning" | "alert" | "active" | "syncing";
  statusText?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export const HudPanel: React.FC<HudPanelProps> = ({
  title,
  icon: Icon,
  status = "nominal",
  statusText,
  headerRight,
  children,
  className = "",
  contentClassName = "",
}) => {
  const getStatusColor = () => {
    switch (status) {
      case "warning":
        return "bg-amber-400 shadow-[0_0_8px_rgba(255,176,32,0.6)]";
      case "alert":
        return "bg-rose-500 shadow-[0_0_8px_rgba(255,77,94,0.6)]";
      case "active":
        return "bg-cyan-400 shadow-[0_0_8px_rgba(0,224,255,0.7)] animate-pulse";
      case "syncing":
        return "bg-blue-400 shadow-[0_0_8px_rgba(47,123,255,0.6)]";
      case "nominal":
      default:
        return "bg-emerald-400 shadow-[0_0_8px_rgba(45,255,163,0.6)]";
    }
  };

  return (
    <div
      className={`group relative flex flex-col rounded-sm border border-[var(--line)] bg-[var(--bg-1)]/65 backdrop-blur-md transition-all duration-300 hover:border-[var(--line-strong)] hover:shadow-[0_0_20px_rgba(0,224,255,0.06)] ${className}`}
    >
      {/* 4 Corner HUD Brackets */}
      <span className="pointer-events-none absolute -top-[1px] -left-[1px] h-2.5 w-2.5 border-t-2 border-l-2 border-[var(--cyan)] transition-colors duration-200 group-hover:border-[var(--cyan-soft)]" />
      <span className="pointer-events-none absolute -top-[1px] -right-[1px] h-2.5 w-2.5 border-t-2 border-r-2 border-[var(--cyan)] transition-colors duration-200 group-hover:border-[var(--cyan-soft)]" />
      <span className="pointer-events-none absolute -bottom-[1px] -left-[1px] h-2.5 w-2.5 border-b-2 border-l-2 border-[var(--cyan)] transition-colors duration-200 group-hover:border-[var(--cyan-soft)]" />
      <span className="pointer-events-none absolute -bottom-[1px] -right-[1px] h-2.5 w-2.5 border-b-2 border-r-2 border-[var(--cyan)] transition-colors duration-200 group-hover:border-[var(--cyan-soft)]" />

      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-[var(--line)]/60 px-3.5 py-2 select-none">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5 text-[var(--cyan)] opacity-85" />}
          <span className="font-['Orbitron'] text-[11px] font-bold tracking-[0.14em] text-[var(--text-hi)] uppercase">
            {title}
          </span>
          <span className={`h-1.5 w-1.5 rounded-full ${getStatusColor()}`} />
          {statusText && (
            <span className="font-['Rajdhani'] text-[11px] font-semibold text-[var(--text-low)] uppercase">
              {statusText}
            </span>
          )}
        </div>

        {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
      </div>

      {/* Panel Body */}
      <div className={`relative flex-1 p-3 font-['Rajdhani'] text-[14px] ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};

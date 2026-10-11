import React from "react";
import { GlassCard } from "../common/GlassCard";
import type { SystemStats } from "../../types";

interface SystemVitalsPanelProps {
  stats: SystemStats;
  loading?: boolean;
}

/**
 * Vitals: ONE card with three small thin ring gauges in a row (CPU, RAM, DISK)
 * with just the number inside and the name under.
 * Underneath: one tiny line "↓ 3.6  ↑ 1.2 MB/s" (no heavy network box).
 */
export const SystemVitalsPanel: React.FC<SystemVitalsPanelProps> = ({ stats }) => {
  return (
    <GlassCard className="p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-['Inter'] text-[11px] font-normal tracking-wide text-white/55">
          vitals
        </span>
        <span className="font-['JetBrains_Mono'] text-[9px] text-white/35 tabular-nums">
          up {Math.floor(stats.uptimeSec / 3600)}h
        </span>
      </div>

      {/* 3 Thin Ring Gauges in a row */}
      <div className="flex items-center justify-around gap-2 my-1">
        <GaugeRing label="cpu" value={stats.cpu} color="#7be8ff" />
        <GaugeRing label="ram" value={stats.ram} color="#a8f0ff" />
        <GaugeRing label="disk" value={stats.disk} color="#2f7bff" />
      </div>

      {/* Underneath: One tiny line for network traffic */}
      <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center justify-center font-['JetBrains_Mono'] text-[10px] text-white/55 tracking-wider">
        <span>↓ {stats.network.down}</span>
        <span className="mx-2 text-white/20">·</span>
        <span>↑ {stats.network.up} MB/s</span>
      </div>
    </GlassCard>
  );
};

interface GaugeRingProps {
  label: string;
  value: number;
  color: string;
}

const GaugeRing: React.FC<GaugeRingProps> = ({ label, value, color }) => {
  const radius = 22;
  const stroke = 2.2;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
          <circle
            stroke="rgba(255, 255, 255, 0.08)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition: "stroke-dashoffset 0.8s ease" }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-['JetBrains_Mono'] text-[11px] font-normal text-white/90 tabular-nums">
            {Math.round(value)}
          </span>
        </div>
      </div>

      <span className="mt-1 font-['Inter'] text-[10px] font-normal text-white/45 lowercase">
        {label}
      </span>
    </div>
  );
};

import React from "react";
import { Cloud, Droplets, Sun, Wind } from "lucide-react";
import { GlassCard } from "../common/GlassCard";
import type { WeatherData } from "../../types";

interface WeatherPanelProps {
  weather: WeatherData;
  loading?: boolean;
}

/**
 * Weather: temperature large and thin, condition + city small, one tiny icon.
 */
export const WeatherPanel: React.FC<WeatherPanelProps> = ({ weather }) => {
  return (
    <GlassCard className="p-3.5">
      <div className="flex items-center justify-between">
        {/* Left: Temperature large and thin */}
        <div className="flex items-baseline gap-1">
          <span className="font-['Inter'] text-3xl font-light text-white/95 tabular-nums tracking-tight">
            {weather.tempC}
          </span>
          <span className="font-['Inter'] text-xs font-light text-[#7be8ff]/80">
            °C
          </span>
        </div>

        {/* Right: Tiny icon */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05] border border-white/[0.1] text-[#7be8ff]/90">
          <Sun className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between">
        <span className="font-['Inter'] text-xs font-normal text-white/70">
          {weather.condition}
        </span>
        <span className="font-['Inter'] text-[11px] font-normal text-white/40">
          {weather.city}
        </span>
      </div>

      <div className="mt-2 pt-1.5 border-t border-white/[0.08] flex items-center justify-between font-['JetBrains_Mono'] text-[9px] text-white/40">
        <span>hum {weather.humidity}%</span>
        <span>wind {weather.windKph} km/h</span>
      </div>
    </GlassCard>
  );
};

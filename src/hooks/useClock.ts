/**
 * Tactical Real-Time Clock Hook
 * Provides high-precision time string, date string, and day abbreviation for HUD telemetry.
 */

import { useEffect, useState } from "react";

export interface ClockState {
  timeStr: string;
  dateStr: string;
  dayStr: string;
  epoch: number;
}

export function useClock(): ClockState {
  const [clock, setClock] = useState<ClockState>(() => {
    const now = new Date();
    return {
      timeStr: formatTime(now),
      dateStr: formatDate(now),
      dayStr: formatDay(now),
      epoch: now.getTime(),
    };
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = new Date();
      setClock({
        timeStr: formatTime(now),
        dateStr: formatDate(now),
        dayStr: formatDay(now),
        epoch: now.getTime(),
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return clock;
}

function formatTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDate(d: Date): string {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDay(d: Date): string {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return days[d.getDay()];
}

/**
 * Tactical Confirmation Modal
 * Amber-bordered security modal for dangerous directives (email sending, deletion, spending).
 * Includes details table, risk badges (LOW/MEDIUM/HIGH), keyboard Esc/Enter handling,
 * and 1-second hold-to-confirm progress ring for high-risk actions.
 */

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, Check, ShieldAlert, X } from "lucide-react";
import type { ConfirmationRequest } from "../../types";

interface ConfirmationModalProps {
  request: ConfirmationRequest;
  onConfirm: (approved: boolean) => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  request,
  onConfirm,
}) => {
  const isHighRisk = request.risk === "high";
  const [holdProgress, setHoldProgress] = useState(0);
  const holdIntervalRef = useRef<number | null>(null);

  // Keyboard navigation: Esc denies; Enter approves (only if not high risk)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onConfirm(false);
      } else if (e.key === "Enter" && !isHighRisk) {
        e.preventDefault();
        onConfirm(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHighRisk, onConfirm]);

  // Hold-to-confirm handlers for high risk
  const startHold = () => {
    if (!isHighRisk) {
      onConfirm(true);
      return;
    }

    const startTime = Date.now();
    const duration = 1000; // 1 second hold

    holdIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        clearInterval(holdIntervalRef.current!);
        holdIntervalRef.current = null;
        onConfirm(true);
      }
    }, 16);
  };

  const endHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
      setHoldProgress(0);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none"
    >
      <div className="relative w-full max-w-lg rounded border-2 border-amber-500/80 bg-[var(--bg-1)] p-6 shadow-[0_0_35px_rgba(255,176,32,0.3)]">
        {/* Tactical Corner Accents */}
        <span className="absolute -top-1 -left-1 h-3 w-3 border-t-2 border-l-2 border-amber-400" />
        <span className="absolute -top-1 -right-1 h-3 w-3 border-t-2 border-r-2 border-amber-400" />
        <span className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-amber-400" />
        <span className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-amber-400" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)]/60 pb-3">
          <div className="flex items-center gap-2.5">
            {isHighRisk ? (
              <ShieldAlert className="h-5 w-5 text-rose-500 animate-pulse" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            )}
            <h3
              id="confirm-modal-title"
              className="font-['Orbitron'] text-sm sm:text-base font-bold tracking-wider text-[var(--text-hi)] uppercase"
            >
              {request.title}
            </h3>
          </div>

          {/* Risk Level Badge */}
          <span
            className={`rounded px-2 py-0.5 font-['Orbitron'] text-[10px] font-black uppercase tracking-widest ${
              request.risk === "high"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_8px_rgba(255,77,94,0.4)]"
                : request.risk === "medium"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
            }`}
          >
            {request.risk} RISK
          </span>
        </div>

        {/* Description */}
        <p className="mt-3 font-['Rajdhani'] text-sm text-[var(--text-mid)] font-medium">
          {request.description}
        </p>

        {isHighRisk && (
          <div className="mt-2.5 rounded border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-300 font-['Rajdhani'] font-semibold">
            WARNING: This operation is non-reversible. Requires active biometric confirmation override.
          </div>
        )}

        {/* Details Key-Value Table */}
        {request.details && Object.keys(request.details).length > 0 && (
          <div className="mt-4 rounded border border-[var(--line)]/60 bg-[var(--bg-0)]/80 p-3 font-['JetBrains_Mono'] text-xs">
            <div className="space-y-1.5">
              {Object.entries(request.details).map(([key, val]) => (
                <div key={key} className="flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-[var(--line)]/20 pb-1 last:border-0 last:pb-0">
                  <span className="font-['Orbitron'] text-[10px] text-[var(--text-low)] tracking-wider">
                    {key}:
                  </span>
                  <span className="font-medium text-[var(--text-hi)] text-left sm:text-right break-all">
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[var(--line)]/60">
          {/* Deny Button */}
          <button
            onClick={() => onConfirm(false)}
            className="flex items-center gap-1.5 rounded border border-[var(--line)] bg-[var(--bg-0)] px-4 py-2 font-['Orbitron'] text-xs font-bold tracking-wider text-[var(--text-mid)] hover:border-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all active:scale-95"
          >
            <X className="h-4 w-4" />
            <span>DENY (ESC)</span>
          </button>

          {/* Approve Button */}
          <button
            onMouseDown={startHold}
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchStart={startHold}
            onTouchEnd={endHold}
            onClick={() => {
              if (!isHighRisk) onConfirm(true);
            }}
            className={`relative flex items-center gap-1.5 overflow-hidden rounded px-5 py-2 font-['Orbitron'] text-xs font-bold tracking-wider text-black transition-all active:scale-95 shadow-[0_0_15px_rgba(255,176,32,0.4)] ${
              isHighRisk ? "bg-rose-400 hover:bg-rose-300" : "bg-amber-400 hover:bg-amber-300"
            }`}
          >
            {/* Progress Fill Bar for High Risk Hold */}
            {isHighRisk && (
              <span
                style={{ width: `${holdProgress}%` }}
                className="absolute inset-y-0 left-0 bg-white/40 transition-[width] duration-75 pointer-events-none"
              />
            )}

            <Check className="h-4 w-4 relative z-10 stroke-[3]" />
            <span className="relative z-10">
              {isHighRisk
                ? holdProgress > 0
                  ? `HOLDING... ${Math.round(holdProgress)}%`
                  : "HOLD 1S TO APPROVE"
                : "APPROVE DIRECTIVE"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

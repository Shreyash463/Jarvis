/**
 * Tactical HUD Toasts
 * Renders non-intrusive floating system alerts in the top-right corner.
 */

import React from "react";
import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useJarvisStore } from "../../store/jarvisStore";

export const ToastContainer: React.FC = () => {
  const toasts = useJarvisStore((state) => state.toasts);
  const removeToast = useJarvisStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-5 z-50 flex max-w-sm flex-col gap-2.5 pointer-events-none">
      {toasts.map((toast) => {
        const isError = toast.type === "error";
        const isSuccess = toast.type === "success";
        const isWarning = toast.type === "warning";

        const borderColor = isError
          ? "border-rose-500/60 shadow-[0_0_15px_rgba(255,77,94,0.3)]"
          : isSuccess
          ? "border-emerald-400/60 shadow-[0_0_15px_rgba(45,255,163,0.25)]"
          : isWarning
          ? "border-amber-400/60 shadow-[0_0_15px_rgba(255,176,32,0.25)]"
          : "border-[var(--line-strong)] shadow-[0_0_15px_rgba(0,224,255,0.2)]";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded border bg-[var(--bg-1)]/90 p-3 backdrop-blur-md transition-all duration-300 ${borderColor}`}
          >
            {isError ? (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            ) : isSuccess ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            ) : isWarning ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cyan)]" />
            )}

            <div className="flex-1 min-w-0">
              <h4 className="font-['Orbitron'] text-xs font-bold tracking-wider text-[var(--text-hi)] uppercase">
                {toast.title}
              </h4>
              {toast.message && (
                <p className="mt-0.5 font-['Rajdhani'] text-xs font-medium text-[var(--text-mid)]">
                  {toast.message}
                </p>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="rounded p-0.5 text-[var(--text-low)] hover:text-[var(--text-hi)] transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

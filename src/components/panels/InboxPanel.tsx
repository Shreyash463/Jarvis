import React from "react";
import { GlassCard } from "../common/GlassCard";
import type { EmailItem } from "../../types";

interface InboxPanelProps {
  emails: EmailItem[];
  onOpenInboxDrawer?: () => void;
  loading?: boolean;
}

/**
 * Inbox: compact glass card showing unread count as a big number
 * and the latest sender + subject on one line; click opens the full inbox in a glass drawer.
 */
export const InboxPanel: React.FC<InboxPanelProps> = ({
  emails,
  onOpenInboxDrawer,
}) => {
  const unreadCount = emails.filter((e) => e.unread).length;
  const latestEmail = emails[0];

  return (
    <GlassCard className="p-3.5" onClick={onOpenInboxDrawer}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-['Inter'] text-[11px] font-normal tracking-wide text-white/55">
          inbox
        </span>
        <span className="font-['Inter'] text-[10px] text-[#7be8ff]/80">
          open drawer →
        </span>
      </div>

      <div className="flex items-baseline gap-2.5">
        <span className="font-['Inter'] text-2xl font-light text-white/95 tabular-nums">
          {unreadCount}
        </span>
        <span className="font-['Inter'] text-xs text-white/45 font-normal">
          unread
        </span>
      </div>

      {latestEmail && (
        <div className="mt-2 pt-2 border-t border-white/[0.08] flex items-center gap-1.5 font-['Inter'] text-xs truncate">
          <span className="font-medium text-white/80 shrink-0">
            {latestEmail.from.split("<")[0].trim()}:
          </span>
          <span className="text-white/50 truncate">
            {latestEmail.subject}
          </span>
        </div>
      )}
    </GlassCard>
  );
};

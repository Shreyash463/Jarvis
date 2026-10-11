/**
 * Tactical Command Palette (Ctrl+K / Cmd+K)
 * Searchable modal overlay with fuzzy matching, arrow navigation, and direct action triggers.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Calendar,
  Command,
  Cpu,
  Mail,
  Maximize,
  Search,
  Settings,
  Sun,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { useJarvisStore } from "../../store/jarvisStore";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteDirective: (text: string) => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: "DIRECTIVE" | "SYSTEM";
  icon: React.ElementType;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onExecuteDirective,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const clearTranscript = useJarvisStore((state) => state.clearTranscript);
  const setSettingsOpen = useJarvisStore((state) => state.setSettingsOpen);
  const settings = useJarvisStore((state) => state.settings);
  const updateSettings = useJarvisStore((state) => state.updateSettings);

  const commands: CommandItem[] = [
    {
      id: "schedule",
      title: "What is on my schedule today?",
      category: "DIRECTIVE",
      icon: Calendar,
      action: () => onExecuteDirective("What is on my schedule today?"),
    },
    {
      id: "inbox",
      title: "Check my inbox and transmissions",
      category: "DIRECTIVE",
      icon: Mail,
      action: () => onExecuteDirective("Check my inbox"),
    },
    {
      id: "system",
      title: "Run diagnostic system status check",
      category: "DIRECTIVE",
      icon: Cpu,
      action: () => onExecuteDirective("System status check"),
    },
    {
      id: "email",
      title: "Send an email to Vedant Shenoy",
      category: "DIRECTIVE",
      icon: Mail,
      action: () => onExecuteDirective("Send an email to Vedant Shenoy"),
    },
    {
      id: "weather",
      title: "Query current meteorological metrics",
      category: "DIRECTIVE",
      icon: Sun,
      action: () => onExecuteDirective("What is the weather today?"),
    },
    {
      id: "fullscreen",
      title: "Toggle Fullscreen Mode",
      category: "SYSTEM",
      icon: Maximize,
      action: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      },
    },
    {
      id: "clear",
      title: "Clear Tactical Transcript",
      category: "SYSTEM",
      icon: Trash2,
      action: () => clearTranscript(),
    },
    {
      id: "settings",
      title: "Open HUD Settings Drawer",
      category: "SYSTEM",
      icon: Settings,
      action: () => setSettingsOpen(true),
    },
    {
      id: "sound",
      title: `Toggle Sound Effects (${settings.sound.sfxEnabled ? "Currently ON" : "Currently OFF"})`,
      category: "SYSTEM",
      icon: Volume2,
      action: () => {
        updateSettings((prev) => ({
          ...prev,
          sound: { ...prev.sound, sfxEnabled: !prev.sound.sfxEnabled },
        }));
      },
    },
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-md pt-[15vh] p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded border border-[var(--cyan)]/50 bg-[var(--bg-1)] shadow-[0_0_30px_rgba(0,224,255,0.25)] overflow-hidden"
      >
        {/* Search Input Box */}
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3 bg-[var(--bg-0)]/70">
          <Search className="h-4 w-4 text-[var(--cyan)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or directive..."
            className="flex-1 bg-transparent font-['JetBrains_Mono'] text-sm text-[var(--text-hi)] placeholder-[var(--text-low)] focus:outline-none"
          />
          <kbd className="rounded border border-[var(--line)] px-1.5 py-0.5 font-['JetBrains_Mono'] text-[9px] text-[var(--text-low)]">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center font-['Rajdhani'] text-xs text-[var(--text-low)]">
              No matching directives recognized.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex w-full items-center justify-between rounded px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? "bg-[var(--cyan)]/20 border border-[var(--cyan)] text-white shadow-[0_0_10px_rgba(0,224,255,0.2)]"
                      : "border border-transparent text-[var(--text-mid)] hover:bg-[var(--cyan)]/10"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-[var(--cyan-soft)]" : "text-[var(--text-low)]"}`} />
                    <span className="font-['Rajdhani'] text-xs font-bold truncate">
                      {item.title}
                    </span>
                  </div>

                  <span className="font-['Orbitron'] text-[9px] font-semibold text-[var(--text-low)] uppercase tracking-wider shrink-0 ml-2">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

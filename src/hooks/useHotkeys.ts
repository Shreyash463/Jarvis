/**
 * Global Tactical Hotkeys Hook
 * Handles Spacebar push-to-talk, Ctrl+K / Cmd+K Command Palette, and Esc task cancel.
 */

import { useEffect, useRef } from "react";
import { soundFx } from "../utils/audioSynth";

interface HotkeyOptions {
  onStartListening: () => void;
  onStopListening: () => void;
  onToggleCommandPalette: () => void;
  onCancelTask: () => void;
  isConfirmationOpen: boolean;
  isSettingsOpen: boolean;
}

export function useHotkeys({
  onStartListening,
  onStopListening,
  onToggleCommandPalette,
  onCancelTask,
  isConfirmationOpen,
  isSettingsOpen,
}: HotkeyOptions) {
  const isSpacePressedRef = useRef(false);

  useEffect(() => {
    function isInputElement(el: EventTarget | null): boolean {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        el.isContentEditable
      );
    }

    function handleKeyDown(e: KeyboardEvent) {
      // 1. Command Palette: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onToggleCommandPalette();
        return;
      }

      // 2. Escape: Close modals or Cancel active task
      if (e.key === "Escape") {
        if (!isConfirmationOpen && !isSettingsOpen) {
          onCancelTask();
        }
        return;
      }

      // 3. Spacebar: Push-to-Talk (only if NOT focused in input field and no modal open)
      if (
        e.code === "Space" &&
        !isInputElement(e.target) &&
        !isConfirmationOpen &&
        !isSettingsOpen
      ) {
        if (!isSpacePressedRef.current) {
          e.preventDefault();
          isSpacePressedRef.current = true;
          soundFx.playListenStart();
          onStartListening();
        }
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === "Space" && isSpacePressedRef.current) {
        e.preventDefault();
        isSpacePressedRef.current = false;
        onStopListening();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    onStartListening,
    onStopListening,
    onToggleCommandPalette,
    onCancelTask,
    isConfirmationOpen,
    isSettingsOpen,
  ]);
}

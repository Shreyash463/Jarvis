/**
 * Tactical Settings Drawer (Floating Liquid Glass Sheet)
 * Features:
 * - 12px margin from screen edge, 28px radius, floating glass recipe
 * - Inter font throughout, sentence-case section titles
 * - Profile, Voice (Cinematic Gemini default), Hearing, Appearance, Sound, Safety, About
 * - Persisted in localStorage
 */

import React, { useEffect, useState } from "react";
import {
  Check,
  Ear,
  Info,
  Lock,
  Mic,
  Palette,
  Shield,
  User,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { APP_CODENAME, APP_VERSION, USE_MOCK } from "../../config";
import { useJarvisStore } from "../../store/jarvisStore";
import { speechService } from "../../utils/speechSynthesisService";
import { speechInput } from "../../utils/speechRecognitionService";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACCENT_PRESETS = [
  { id: "cyan", name: "Cyan", hex: "#00e0ff", soft: "#6fefff" },
  { id: "blue", name: "Stark blue", hex: "#2f7bff", soft: "#7bb0ff" },
  { id: "amber", name: "Amber", hex: "#ffb020", soft: "#ffd276" },
  { id: "green", name: "Emerald", hex: "#2dffa3", soft: "#88ffcc" },
  { id: "violet", name: "Violet", hex: "#a855f7", soft: "#d8b4fe" },
] as const;

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const settings = useJarvisStore((state) => state.settings);
  const updateSettings = useJarvisStore((state) => state.updateSettings);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const englishVoices = voices.filter((v) => v.lang.startsWith("en"));
        setAvailableVoices(englishVoices.length > 0 ? englishVoices : voices);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  if (!isOpen) return null;

  const handleAccentChange = (accent: typeof ACCENT_PRESETS[number]) => {
    updateSettings((prev) => ({
      ...prev,
      appearance: { ...prev.appearance, accentColor: accent.id },
    }));

    document.documentElement.style.setProperty("--cyan", accent.hex);
    document.documentElement.style.setProperty("--cyan-soft", accent.soft);
  };

  const handleVoiceEngineChange = (engine: "live" | "browser" | "gemini") => {
    if (engine !== "live") {
      speechService.setVoiceEngine(engine as any);
    }
    updateSettings((prev) => ({
      ...prev,
      voice: { ...prev.voice, voiceEngine: engine },
    }));
  };

  const handleHearingEngineChange = (engine: "browser" | "gemini") => {
    speechInput.setSpeechEngine(engine);
    updateSettings((prev) => ({
      ...prev,
      hearing: { ...prev.hearing, engine },
    }));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end p-3 bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-200"
    >
      {/* Floating Glass Sheet (12px margin from edge, 28px radius) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[calc(100vh-24px)] w-full max-w-md flex-col rounded-[28px] border border-white/[0.16] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.6),0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-[40px] saturate-[180%] overflow-y-auto scrollbar-none animate-in slide-in-from-right duration-300"
        style={{
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 42%, rgba(255,255,255,0.08) 100%), rgba(8,18,32,0.65)",
        }}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-white/[0.12] pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#7be8ff] shadow-[0_0_10px_#7be8ff]" />
            <h3 className="font-['Inter'] text-base font-semibold text-white/95 tracking-tight">
              Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.05] text-white/70 hover:border-white/[0.25] hover:text-white transition-all active:scale-95"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-6 font-['Inter'] text-sm">
          {/* 1. Profile */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-white/80 font-medium text-xs uppercase tracking-wider">
              <User className="h-3.5 w-3.5 text-[#7be8ff]" />
              <span>Profile</span>
            </div>
            <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-3.5 flex flex-col gap-2">
              <label className="text-xs text-white/60">Your name</label>
              <input
                type="text"
                value={settings.profile?.userName || "Shreyash"}
                onChange={(e) =>
                  updateSettings((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, userName: e.target.value },
                  }))
                }
                placeholder="Shreyash"
                className="w-full rounded-xl border border-white/[0.14] bg-white/[0.06] px-3 py-2 text-sm text-white/95 placeholder-white/30 focus:outline-none focus:border-[#7be8ff]/60"
              />
            </div>
          </section>

          {/* 2. Voice */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-white/80 font-medium text-xs uppercase tracking-wider">
              <Volume2 className="h-3.5 w-3.5 text-[#7be8ff]" />
              <span>Voice</span>
            </div>
            <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-3.5 flex flex-col gap-3.5">
              {/* Voice Engine Picker */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-white/60">Voice engine</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleVoiceEngineChange("live")}
                    className={`rounded-xl border py-2 px-3 text-xs font-medium text-left transition-all ${
                      (settings.voice?.voiceEngine || "live") === "live"
                        ? "border-[#7be8ff]/70 bg-[#7be8ff]/15 text-[#7be8ff] shadow-[0_0_12px_rgba(123,232,255,0.2)]"
                        : "border-white/[0.1] bg-white/[0.03] text-white/65 hover:border-white/[0.2]"
                    }`}
                  >
                    <div className="font-semibold">Gemini Live (default)</div>
                    <div className="text-[10px] text-white/45 mt-0.5">Real-time bi-directional audio</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVoiceEngineChange("browser")}
                    className={`rounded-xl border py-2 px-3 text-xs font-medium text-left transition-all ${
                      settings.voice?.voiceEngine === "browser"
                        ? "border-[#7be8ff]/70 bg-[#7be8ff]/15 text-[#7be8ff] shadow-[0_0_12px_rgba(123,232,255,0.2)]"
                        : "border-white/[0.1] bg-white/[0.03] text-white/65 hover:border-white/[0.2]"
                    }`}
                  >
                    <div className="font-semibold">Classic (browser speech)</div>
                    <div className="text-[10px] text-white/45 mt-0.5">Standard speech fallback</div>
                  </button>
                </div>
              </div>

              {/* Gemini Live Prebuilt Voice Picker */}
              {(settings.voice?.voiceEngine || "live") === "live" && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-white/60">Live Voice Persona</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "Charon", label: "Charon", desc: "Deep, calm British" },
                      { id: "Orus", label: "Orus", desc: "Crisp & authoritative" },
                      { id: "Fenrir", label: "Fenrir", desc: "Warm & resonant" },
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() =>
                          updateSettings((prev) => ({
                            ...prev,
                            voice: { ...prev.voice, liveVoice: v.id as any },
                          }))
                        }
                        className={`rounded-xl border p-2 text-xs font-medium text-left transition-all ${
                          (settings.voice?.liveVoice || "Charon") === v.id
                            ? "border-[#7be8ff]/70 bg-[#7be8ff]/15 text-[#7be8ff]"
                            : "border-white/[0.1] bg-white/[0.03] text-white/65 hover:border-white/[0.2]"
                        }`}
                      >
                        <div className="font-semibold">{v.label}</div>
                        <div className="text-[9px] text-white/45">{v.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Browser Voice Dropdown (preferred male English) */}
              {settings.voice?.voiceEngine === "browser" && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-white/60">Browser voice</span>
                  <select
                    value={settings.voice.selectedVoice}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        voice: { ...prev.voice, selectedVoice: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-white/[0.14] bg-[#0c1828] px-3 py-2 text-xs text-white/90 focus:outline-none focus:border-[#7be8ff]/60"
                  >
                    {availableVoices.map((v) => (
                      <option key={v.name} value={v.name} className="bg-[#0c1828] text-white">
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Speech Rate Slider 0.7x to 1.3x */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Speech rate</span>
                  <span className="text-white/90 font-mono">
                    {(settings.voice.speechRate || 1.0).toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.05"
                  value={settings.voice.speechRate || 1.0}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      voice: { ...prev.voice, speechRate: parseFloat(e.target.value) },
                    }))
                  }
                  className="w-full accent-[#7be8ff]"
                />
              </div>

              {/* Effect Amount Slider 0 to 100 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Audio effect amount</span>
                  <span className="text-white/90 font-mono">
                    {settings.voice?.effectAmount ?? 40}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={settings.voice?.effectAmount ?? 40}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      voice: { ...prev.voice, effectAmount: parseInt(e.target.value, 10) },
                    }))
                  }
                  className="w-full accent-[#7be8ff]"
                />
              </div>

              {/* Mute toggle */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-white/75">Mute voice audio</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextMute = !settings.voice?.isMuted;
                    speechService.setMuted(nextMute);
                    updateSettings((prev) => ({
                      ...prev,
                      voice: { ...prev.voice, isMuted: nextMute },
                    }));
                  }}
                  className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
                    settings.voice?.isMuted ? "bg-amber-500/50 justify-end" : "bg-white/15 justify-start"
                  }`}
                >
                  <span className="h-5 w-5 rounded-full bg-white shadow-md" />
                </button>
              </div>
            </div>
          </section>

          {/* 3. Hearing */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-white/80 font-medium text-xs uppercase tracking-wider">
              <Ear className="h-3.5 w-3.5 text-[#7be8ff]" />
              <span>Hearing</span>
            </div>
            <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-3.5 flex flex-col gap-3.5">
              {/* Speech Recognition Engine */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-white/60">Speech recognition engine</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleHearingEngineChange("browser")}
                    className={`rounded-xl border py-2 px-3 text-xs font-medium text-left transition-all ${
                      (settings.hearing?.engine || "browser") === "browser"
                        ? "border-[#7be8ff]/70 bg-[#7be8ff]/15 text-[#7be8ff] shadow-[0_0_12px_rgba(123,232,255,0.2)]"
                        : "border-white/[0.1] bg-white/[0.03] text-white/65 hover:border-white/[0.2]"
                    }`}
                  >
                    <div className="font-semibold">Browser fast</div>
                    <div className="text-[10px] text-white/45 mt-0.5">Real-time (Default)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHearingEngineChange("gemini")}
                    className={`rounded-xl border py-2 px-3 text-xs font-medium text-left transition-all ${
                      settings.hearing?.engine === "gemini"
                        ? "border-[#7be8ff]/70 bg-[#7be8ff]/15 text-[#7be8ff] shadow-[0_0_12px_rgba(123,232,255,0.2)]"
                        : "border-white/[0.1] bg-white/[0.03] text-white/65 hover:border-white/[0.2]"
                    }`}
                  >
                    <div className="font-semibold">Accurate Gemini</div>
                    <div className="text-[10px] text-white/45 mt-0.5">gemini-3.5-transcribe</div>
                  </button>
                </div>
              </div>

              {/* Language selection */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-white/60">Language</span>
                <select
                  value={settings.hearing?.language || "en-IN"}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      hearing: { ...prev.hearing, language: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-white/[0.14] bg-[#0c1828] px-3 py-2 text-xs text-white/90 focus:outline-none focus:border-[#7be8ff]/60"
                >
                  <option value="en-IN" className="bg-[#0c1828] text-white">English (India) - en-IN</option>
                  <option value="en-US" className="bg-[#0c1828] text-white">English (US) - en-US</option>
                  <option value="en-GB" className="bg-[#0c1828] text-white">English (UK) - en-GB</option>
                </select>
              </div>

              {/* Custom Vocabulary */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-white/60">Custom vocabulary</span>
                <input
                  type="text"
                  value={
                    settings.hearing?.customVocabulary ??
                    "Shreyash, Vesa Studios, Jarvis, Antigravity, Vedant"
                  }
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      hearing: { ...prev.hearing, customVocabulary: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-white/[0.14] bg-white/[0.06] px-3 py-2 text-xs text-white/95 focus:outline-none focus:border-[#7be8ff]/60"
                />
              </div>
            </div>
          </section>

          {/* 4. Appearance */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-white/80 font-medium text-xs uppercase tracking-wider">
              <Palette className="h-3.5 w-3.5 text-[#7be8ff]" />
              <span>Appearance</span>
            </div>
            <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-3.5 flex flex-col gap-3.5">
              {/* Accent Color Presets */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-white/60">Accent color</span>
                <div className="grid grid-cols-5 gap-2">
                  {ACCENT_PRESETS.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleAccentChange(acc)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all ${
                        settings.appearance.accentColor === acc.id
                          ? "border-white/60 bg-white/[0.12] scale-105"
                          : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.2]"
                      }`}
                    >
                      <span
                        className="h-4 w-4 rounded-full shadow-md"
                        style={{ backgroundColor: acc.hex }}
                      />
                      <span className="text-[10px] text-white/70">{acc.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles: Reduce motion, Floating particles, Parallax */}
              <div className="flex flex-col gap-2 pt-1">
                <label className="flex items-center justify-between text-xs text-white/80 cursor-pointer">
                  <span>Reduce motion</span>
                  <input
                    type="checkbox"
                    checked={settings.appearance.reduceMotion}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        appearance: { ...prev.appearance, reduceMotion: e.target.checked },
                      }))
                    }
                    className="accent-[#7be8ff] h-4 w-4 rounded"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-white/80 cursor-pointer">
                  <span>Floating particles</span>
                  <input
                    type="checkbox"
                    checked={settings.appearance.showParticles}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        appearance: { ...prev.appearance, showParticles: e.target.checked },
                      }))
                    }
                    className="accent-[#7be8ff] h-4 w-4 rounded"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-white/80 cursor-pointer">
                  <span>Parallax effect</span>
                  <input
                    type="checkbox"
                    checked={settings.appearance.showParallax ?? true}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        appearance: { ...prev.appearance, showParallax: e.target.checked },
                      }))
                    }
                    className="accent-[#7be8ff] h-4 w-4 rounded"
                  />
                </label>
              </div>
            </div>
          </section>

          {/* 5. Sound */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-white/80 font-medium text-xs uppercase tracking-wider">
              <Volume2 className="h-3.5 w-3.5 text-[#7be8ff]" />
              <span>Sound</span>
            </div>
            <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-3.5 flex flex-col gap-3">
              <label className="flex items-center justify-between text-xs text-white/80 cursor-pointer">
                <span>UI sound effects</span>
                <input
                  type="checkbox"
                  checked={settings.sound.sfxEnabled}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      sound: { ...prev.sound, sfxEnabled: e.target.checked },
                    }))
                  }
                  className="accent-[#7be8ff] h-4 w-4 rounded"
                />
              </label>

              {settings.sound.sfxEnabled && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Volume</span>
                    <span className="text-white/90 font-mono">
                      {Math.round(settings.sound.volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.sound.volume}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        sound: { ...prev.sound, volume: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full accent-[#7be8ff]"
                  />
                </div>
              )}
            </div>
          </section>

          {/* 6. Safety */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-white/80 font-medium text-xs uppercase tracking-wider">
              <Shield className="h-3.5 w-3.5 text-[#7be8ff]" />
              <span>Safety</span>
            </div>
            <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-3.5 flex flex-col gap-2.5">
              <label className="flex items-center justify-between text-xs text-white/80 cursor-pointer">
                <span>Confirm messaging & emails</span>
                <input
                  type="checkbox"
                  checked={settings.safety.confirmMessaging}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      safety: { ...prev.safety, confirmMessaging: e.target.checked },
                    }))
                  }
                  className="accent-[#7be8ff] h-4 w-4 rounded"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-white/80 opacity-90 cursor-not-allowed">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-amber-400" />
                  <span>Confirm deletion (Locked ON)</span>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="accent-amber-400 h-4 w-4 rounded cursor-not-allowed"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-white/80 cursor-pointer">
                <span>Confirm financial actions</span>
                <input
                  type="checkbox"
                  checked={settings.safety.confirmSpending}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      safety: { ...prev.safety, confirmSpending: e.target.checked },
                    }))
                  }
                  className="accent-[#7be8ff] h-4 w-4 rounded"
                />
              </label>
            </div>
          </section>

          {/* 7. About */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-white/80 font-medium text-xs uppercase tracking-wider">
              <Info className="h-3.5 w-3.5 text-[#7be8ff]" />
              <span>About</span>
            </div>
            <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-3.5 flex flex-col gap-1.5 text-xs text-white/60">
              <div className="flex justify-between">
                <span>Core version</span>
                <span className="text-white/90 font-mono">{APP_VERSION}</span>
              </div>
              <div className="flex justify-between">
                <span>Codename</span>
                <span className="text-white/90">{APP_CODENAME}</span>
              </div>
              <div className="flex justify-between">
                <span>Mode</span>
                <span className="text-[#7be8ff]">Live Flash Core (Streaming SSE)</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

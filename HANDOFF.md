# J.A.R.V.I.S — Production Architecture & Backend Handoff Guide

This document outlines the architecture, service boundaries, data schemas, endpoints, and backend transition procedures for the J.A.R.V.I.S Holographic AI Assistant interface.

---

## 1. Directory Structure & Architecture

```
/
├── server/
│   ├── index.ts                 # Server entry point mounting HTTP & Live WebSocket
│   ├── liveProxy.ts             # Bidirectional WebSocket bridge to Gemini Live (gemini-3.8-live)
│   ├── chatHandler.ts           # Gemini Flash streaming SSE handler with context injection & honesty rule
│   ├── transcribeHandler.ts     # Gemini Transcribe audio recording endpoint
│   └── ttsHandler.ts            # Gemini Flash Lite TTS speech synthesis endpoint
├── public/
│   └── pcm-recorder-processor.js# AudioWorklet processor for downsampling microphone to 16 kHz 16-bit PCM
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── GlassCard.tsx        # Frosted glass card material with sheen and border glow
│   │   │   ├── GlassTooltip.tsx     # Custom glass pill tooltip (no black boxes or nested backdrop bugs)
│   │   │   ├── DebugOverlay.tsx     # Live D-key latency telemetry chip (Live Speech-End-to-Audio, voice, session)
│   │   │   └── ToastContainer.tsx   # Floating HUD alert notifications
│   │   ├── hud/
│   │   │   ├── BackgroundHud.tsx    # Drifting gradient blobs, range-finder HUD rings, vignette
│   │   │   └── TopBar.tsx           # Status pill, thin digital clock, settings and history triggers
│   │   ├── orb/
│   │   │   └── ArcReactorOrb.tsx    # Hero Arc Reactor core canvas with permanent 7-state render loop
│   │   ├── chat/
│   │   │   ├── CinematicCaptions.tsx# Clean turn-based subtitles directly under the orb
│   │   │   └── CommandDock.tsx      # Integrated floating dock: mic, text input, send, mute, and abort
│   │   ├── panels/
│   │   │   ├── SystemVitalsPanel.tsx # 3 thin ring gauges (CPU, RAM, DISK) + network line
│   │   │   ├── ConnectedAppsPanel.tsx# 4x2 grid of round glass icon buttons with tooltips
│   │   │   ├── WeatherPanel.tsx     # Current temperature, condition, humidity, wind
│   │   │   ├── SchedulePanel.tsx    # Calendar agenda card with next event countdown
│   │   │   ├── InboxPanel.tsx       # Unread email count & latest sender snippet
│   │   │   ├── TasksPanel.tsx       # Task checklist with interactive checkboxes
│   │   │   └── ActivityLogPanel.tsx # Live tool directive execution feed
│   │   └── overlays/
│   │       ├── SettingsDrawer.tsx   # Voice engine picker (Gemini Live default vs Classic), voice persona
│   │       ├── HistoryDrawer.tsx    # Slide-over full conversation history transcript
│   │       ├── CommandPalette.tsx   # Ctrl+K command search
│   │       └── ConfirmationModal.tsx# Security authorization modal with hold-to-approve
│   ├── hooks/
│   │   ├── useJarvis.ts         # Orchestration hook uniting Gemini Live and Classic engines
│   │   ├── useClock.ts          # Live digital clock (HH:MM:SS) in Asia/Kolkata
│   │   └── useHotkeys.ts        # Keyboard shortcuts (Space push-to-talk, Esc abort, D telemetry)
│   ├── services/
│   │   ├── geminiLiveService.ts # Real-time Gemini Live Web Audio client with barge-in interruption
│   │   ├── jarvisApi.ts         # Service gateway contract
│   │   └── mockJarvisApi.ts     # Disambiguated mock fallback engine
│   └── store/
│       └── jarvisStore.ts       # Zustand store with persistent user settings
```

---

## 2. Gemini Live Architecture (`gemini-3.8-live`)

### Flow:
1. **Microphone Capture**:
   - `navigator.mediaDevices.getUserMedia` with `echoCancellation: true`, `noiseSuppression: true`, and `autoGainControl: true`.
   - Captured in an `AudioWorklet` (`/public/pcm-recorder-processor.js`), converting chunks to raw 16 kHz, 16-bit little-endian PCM.
   - Streamed over secure WebSocket to `/api/live`.
2. **Server-Side WebSocket Proxy (`/server/liveProxy.ts`)**:
   - Maintains a secure server-side session via `@google/genai` `ai.live.connect` with `model: "gemini-3.8-live"`.
   - `responseModalities: [Modality.AUDIO]`.
   - Voice personas: `"Charon"` (default deep British male), `"Orus"`, `"Fenrir"`.
   - Bidirectional audio transcription: `inputAudioTranscription: {}` and `outputAudioTranscription: {}`.
   - System instruction integrates live dashboard context (Asia/Kolkata date/time, agenda, emails, tasks, weather) and the **Honesty Rule**.
3. **Low-Latency Gapless Audio Playback**:
   - Incoming chunks arrive at 24 kHz 16-bit PCM.
   - Converted to Float32 AudioBuffers and scheduled gaplessly using `AudioBufferSourceNode.start(nextStartTime)`.
   - Channeled through an `AnalyserNode` and Web Audio filter chain (high-shelf EQ boost, 25ms slap delay, reverb wet mix) scaled by the Effect Amount slider.
   - Live frequency output directly drives the Arc Reactor Orb pulsing rings.
4. **Barge-In (Interruption)**:
   - When Gemini Live detects the user speaking during model audio output, it emits `interrupted: true`.
   - `geminiLiveService.interruptPlayback()` immediately stops all active source nodes and clears the buffer queue, snapping the orb back to `listening`.
   - Pressing **Esc** immediately halts Jarvis playback while keeping the Live session open.

---

## 3. Strict Honesty Rule

Enforced across **both** Gemini Live and `/api/chat`:

> "You currently cannot perform actions: you cannot set reminders or alarms, send emails or messages, edit the calendar, open apps, play music, or control any device. If asked, say plainly and politely that this ability is not connected yet, and offer what you can do right now (answer from the dashboard data, explain, plan, or draft text the user can copy). Never say or imply that you will remind, have noted, have sent, or have done anything. Only claim an action if a tool result confirms it. Never invent events, times or facts that are not in the data."

---

## 4. UI Fixes & Lifecycle Guarantees

1. **Ghost STANDBY Removed**:
   - `CinematicCaptions` completely hides placeholder elements when no transcript is active (`opacity-0`), preventing faint duplicate labels.
2. **Glass Pill Tooltips**:
   - All interactive controls (Hero Orb canvas, microphone, mute, send, abort, app icons, top bar buttons) now use `GlassTooltip` or explicit glass styling with dark semi-transparent backdrops (`bg-[#071322]/90`) and smooth drop-shadows, eliminating native black browser rectangles.
3. **Synchronized Caption Lifecycle**:
   - Starting a new turn (speech or typing) clears previous subtitles within 200ms.
   - Captions remain visible throughout audio playback.
   - Captions auto-fade 6 seconds after audio playback concludes.

---

## 5. Antigravity Phase Transition Checklist

In the next phase (Antigravity real tool integration), the following must be connected:
1. **Google Workspace OAuth & Real APIs**:
   - Google Calendar API: replace static calendar events with live user Google Calendar sync.
   - Gmail API: replace mock inbox with real read/search and draft composition.
   - Google Tasks API: bidirectional task updates.
2. **Real Tool Calling in Gemini Live**:
   - Register function declarations (`tools: [{ functionDeclarations: [...] }]`) with `session.sendToolResponse` on `/server/liveProxy.ts` once OAuth tokens are provisioned.
3. **PC / OS Automation Agent**:
   - Safe sandbox execution for system vitals, app launching, and local playback controls.

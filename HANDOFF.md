# J.A.R.V.I.S — Production Architecture & Backend Handoff Guide

This document outlines the architecture, service boundaries, data schemas, endpoints, and backend transition procedures for the J.A.R.V.I.S Holographic AI Assistant interface.

---

## 1. Directory Structure & Ownership

```
/
├── server/
│   ├── index.ts                 # Server entry point mounting /api/health, /api/chat, /api/transcribe, /api/tts
│   ├── chatHandler.ts           # Gemini 3.8 Flash streaming SSE handler with context injection
│   ├── transcribeHandler.ts     # Gemini 3.5 Transcribe audio recording endpoint
│   └── ttsHandler.ts            # Gemini 3.8 Flash Lite TTS speech synthesis endpoint
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── GlassCard.tsx        # Modern frosted glass card material with sheen and glow
│   │   │   ├── DebugOverlay.tsx     # Live D-key latency telemetry chip (TTFT, TTS latency, engines)
│   │   │   └── ToastContainer.tsx   # Floating alert notifications
│   │   ├── hud/
│   │   │   ├── BackgroundHud.tsx    # 3 drifting gradient blobs, range-finder HUD rings, vignette
│   │   │   └── TopBar.tsx           # Transparent bar: Logo, connection pill, clock, settings, history
│   │   ├── orb/
│   │   │   └── ArcReactorOrb.tsx    # Hero Arc Reactor core canvas: min(46vh, 520px)
│   │   ├── chat/
│   │   │   ├── CinematicCaptions.tsx# Subtitles directly under orb: live user speech & elegant subtitles
│   │   │   └── CommandDock.tsx      # Integrated floating dock: mic, input, send, mute, and abort
│   │   ├── panels/
│   │   │   ├── SystemVitalsPanel.tsx # 3 thin ring gauges (CPU, RAM, DISK) + network line
│   │   │   ├── ConnectedAppsPanel.tsx# 4x2 grid of round glass icon buttons with tooltips
│   │   │   ├── WeatherPanel.tsx     # Large thin temperature, condition, city, icon
│   │   │   ├── SchedulePanel.tsx    # Next up appointment card with time progress and drawer trigger
│   │   │   ├── InboxPanel.tsx       # Unread count and latest sender + subject
│   │   │   ├── TasksPanel.tsx       # 1 of 4 done progress bar and next 2 tasks
│   │   │   └── ActivityLogPanel.tsx # Live tool directive execution feed
│   │   └── overlays/
│   │       ├── BootSequence.tsx     # Neural interface initialization screen
│   │       ├── ConfirmationModal.tsx# Centered authorization modal with 1s hold-to-approve
│   │       ├── CommandPalette.tsx   # Ctrl+K / Cmd+K searchable command overlay
│   │       ├── SettingsDrawer.tsx   # User profile, voice engines, accents, and safety rules
│   │       ├── HistoryDrawer.tsx    # Slide-over full conversation history transcript
│   │       ├── ScheduleDrawer.tsx   # Full daily agenda modal
│   │       ├── InboxDrawer.tsx      # Full email inbox modal
│   │       ├── ActivityDrawer.tsx   # Full activity log modal
│   │       └── MobilePanelsSheet.tsx# Bottom drawer for responsive viewports
│   ├── config.ts                # Application configuration & flags
│   ├── hooks/
│   │   ├── useAudioLevel.ts     # Real Web Audio AnalyserNode with simulation fallback
│   │   ├── useClock.ts          # Live digital clock and formatted date
│   │   ├── useHotkeys.ts        # Space push-to-talk, Ctrl+K commands, Esc cancel, D debug
│   │   └── useJarvis.ts         # Service bus bridge connecting JarvisApi to the UI store
│   ├── pages/
│   │   └── JarvisPage.tsx       # Primary HUD page layout
│   ├── services/
│   │   ├── jarvisApi.ts         # Service gateway contract
│   │   └── mockJarvisApi.ts     # Asynchronous engine with 10s timeout, 1x retry, context injection
│   ├── store/
│   │   └── jarvisStore.ts       # Zustand store with UserSettings persistence
│   ├── types/
│   │   └── index.ts             # Canonical TypeScript definitions
│   └── utils/
│       ├── audioSynth.ts        # Synthesized Web Audio API sound effects
│       ├── speechRecognitionService.ts # Dual ASR (Web Speech API + Gemini 3.5 Transcribe)
│       └── speechSynthesisService.ts   # Dual TTS (Web Speech API + Gemini 3.8 Flash Lite TTS)
```

---

## 2. Server Endpoints

All Gemini AI calls execute strictly on the server using `process.env.GEMINI_API_KEY`:

### 2.1 `POST /api/chat`
- **Purpose**: Generates streaming conversational responses using `gemini-3.8-flash` with minimal thinking and high responsiveness.
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "messages": [
      { "role": "user", "text": "What is on my schedule today?" }
    ],
    "context": {
      "userName": "Shreyash",
      "currentTime": "10/10/2026, 9:15:00 PM",
      "events": [
        { "title": "Design review with team", "start": "10:30 AM", "end": "11:30 AM", "location": "Conference Room Alpha" }
      ],
      "emails": {
        "unreadCount": 2,
        "latest": { "from": "Vedant Shenoy", "subject": "Systems Audit: Microservices Benchmarks" }
      },
      "tasks": [
        { "title": "Verify Mark-VII arc reactor telemetry", "done": true },
        { "title": "Review pull request #142", "done": false }
      ],
      "weather": { "city": "Pune, IN", "tempC": 28, "condition": "Clear Sky", "humidity": 46, "windKph": 12.4 }
    }
  }
  ```
- **Response**: Server-Sent Events (`text/event-stream; charset=utf-8`) with headers `X-Accel-Buffering: no`, flushing chunks `data: {"delta": "..."}\n\n` followed by `data: [DONE]\n\n`.
- **System Instruction**: Injects current local IST date and time, user's name, calendar events, unread mail, tasks, and weather into the prompt so Jarvis never hallucinates schedules.

### 2.2 `POST /api/transcribe`
- **Purpose**: Audio speech recognition for environments without browser Web Speech API.
- **Model**: `gemini-3.5-transcribe`
- **Request Body**:
  ```json
  {
    "audioData": "<base64 encoded audio>",
    "mimeType": "audio/webm"
  }
  ```
- **Response**:
  ```json
  {
    "transcript": "Transcribed user words"
  }
  ```

### 2.3 `POST /api/tts`
- **Purpose**: Server-side speech generation for natural British assistant voice.
- **Model**: `gemini-3.8-flash-lite-tts`
- **Request Body**:
  ```json
  {
    "text": "Good morning, sir. All systems nominal.",
    "voice": "Kore"
  }
  ```
- **Response**:
  ```json
  {
    "audio": "<base64 encoded WAV audio>",
    "format": "audio/wav"
  }
  ```

---

## 3. Settings Keys (`jarvis_hud_settings_v1`)

User preferences are persisted in `localStorage` under key `jarvis_hud_settings_v1`:

```json
{
  "profile": {
    "userName": "Shreyash"
  },
  "voice": {
    "selectedVoice": "Paul (En-GB) - Sophisticated Butler",
    "speechRate": 1.05,
    "wakeWordEnabled": false,
    "speechEngine": "browser",
    "voiceEngine": "browser"
  },
  "appearance": {
    "accentColor": "cyan",
    "reduceMotion": false,
    "showParticles": true
  },
  "sound": {
    "sfxEnabled": false,
    "volume: 0.35
  },
  "safety": {
    "confirmMessaging": true,
    "confirmDeletion": true,
    "confirmSpending": true
  }
}
```

- **`profile.userName`**: Used by Jarvis in conversations and context injection (default: `"Shreyash"`).
- **`voice.speechEngine`**: `"browser"` (Web Speech API) or `"gemini"` (`/api/transcribe`).
- **`voice.voiceEngine`**: `"browser"` (Web Speech Synthesis) or `"gemini"` (`/api/tts`).
- **`appearance.accentColor`**: Active HUD accent (`"cyan"`, `"blue"`, `"amber"`, `"green"`, `"violet"`).
- **`appearance.reduceMotion`**: Disables parallax and background rotation.

/**
 * Web Speech API Voice Recognition Service with Live Mode
 * Supports:
 * - Hands-free continuous Live conversation (continuous = true, auto-restart)
 * - Auto-send when speaking pauses (800ms silence after final result)
 * - Barge-in interruption with fuzzy echo-cancellation against Jarvis's current speech
 * - Echo cancellation, noise suppression, and auto gain control on mic
 * - Ignore noise / empty utterances shorter than 2 characters
 * - Server-side Gemini transcription fallback via /api/transcribe
 */

export interface SpeechRecognitionCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (errorMessage: string) => void;
  onUnsupported: () => void;
  onStart: () => void;
  onEnd: () => void;
  onBargeIn?: (text: string) => void;
}

function computeWordOverlap(recognized: string, currentSpoken: string): number {
  if (!recognized || !currentSpoken) return 0;
  const wordsA = recognized
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const wordsB = new Set(
    currentSpoken
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  if (wordsA.length === 0 || wordsB.size === 0) return 0;
  let matches = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) matches++;
  }
  return matches / wordsA.length;
}

class SpeechRecognitionManager {
  private recognition: any = null;
  private isListening: boolean = false;
  private isLiveMode: boolean = false;
  private isInputFocused: boolean = false;
  private finalTranscript: string = "";
  private silenceTimer: number | null = null;
  private autoRestartTimer: number | null = null;
  private callbacks: SpeechRecognitionCallbacks | null = null;
  private speechEngine: "browser" | "gemini" = "browser";
  private language: string = "en-IN";
  private currentSpokenText: string = "";
  private isJarvisSpeaking: boolean = false;

  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private micAudioCtx: AudioContext | null = null;
  private micAnalyser: AnalyserNode | null = null;

  public setSpeechEngine(engine: "browser" | "gemini") {
    this.speechEngine = engine;
  }

  public getSpeechEngine(): "browser" | "gemini" {
    return this.speechEngine;
  }

  public setLanguage(lang: string) {
    this.language = lang || "en-IN";
    if (this.recognition) {
      try {
        this.recognition.lang = this.language;
      } catch {}
    }
  }

  public setLiveMode(live: boolean) {
    this.isLiveMode = live;
    if (!live && this.autoRestartTimer) {
      clearTimeout(this.autoRestartTimer);
      this.autoRestartTimer = null;
    }
  }

  public getLiveMode(): boolean {
    return this.isLiveMode;
  }

  public setInputFocused(focused: boolean) {
    this.isInputFocused = focused;
  }

  public setJarvisSpeaking(speaking: boolean, currentText: string = "") {
    this.isJarvisSpeaking = speaking;
    this.currentSpokenText = currentText;
  }

  public isSupported(): boolean {
    if (typeof window === "undefined") return false;
    const hasWebSpeech = !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
    const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    return hasWebSpeech || hasMedia;
  }

  private initMicAudioChain() {
    if (this.mediaStream && !this.micAnalyser) {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.micAudioCtx = new AudioCtxClass();
          const source = this.micAudioCtx.createMediaStreamSource(this.mediaStream);
          this.micAnalyser = this.micAudioCtx.createAnalyser();
          this.micAnalyser.fftSize = 64;
          source.connect(this.micAnalyser);
        }
      } catch (err) {
        console.warn("[speechInput] Mic analyser setup warning:", err);
      }
    }
  }

  public start(callbacks: SpeechRecognitionCallbacks) {
    this.callbacks = callbacks;

    if (!this.isSupported()) {
      callbacks.onUnsupported();
      return;
    }

    if (this.autoRestartTimer) {
      clearTimeout(this.autoRestartTimer);
      this.autoRestartTimer = null;
    }

    this.stop();

    if (this.speechEngine === "gemini") {
      this.startMediaRecording();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.startMediaRecording();
      return;
    }

    // Request mic stream in background with echo cancellation to enable AnalyserNode
    if (navigator.mediaDevices?.getUserMedia && !this.mediaStream) {
      navigator.mediaDevices
        .getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
        .then((stream) => {
          this.mediaStream = stream;
          this.initMicAudioChain();
        })
        .catch(() => {});
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = this.language;

      this.finalTranscript = "";

      this.recognition.onstart = () => {
        this.isListening = true;
        this.callbacks?.onStart();
      };

      this.recognition.onresult = (event: any) => {
        let interim = "";
        let newFinal = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            newFinal += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        const rawCaptured = (
          this.finalTranscript + (newFinal ? " " + newFinal.trim() : "") + (interim ? " " + interim.trim() : "")
        ).trim();

        // 5. Barge-in detection & echo cancellation against Jarvis's current spoken words
        if (this.isJarvisSpeaking && rawCaptured.length >= 2) {
          const overlap = computeWordOverlap(rawCaptured, this.currentSpokenText);
          if (overlap > 0.6) {
            // Speaker feedback detected -> ignore
            return;
          } else {
            // Genuine user interruption!
            this.callbacks?.onBargeIn?.(rawCaptured);
          }
        }

        if (newFinal) {
          this.finalTranscript += (this.finalTranscript ? " " : "") + newFinal.trim();
        }

        const currentDisplay = (
          this.finalTranscript + (interim ? " " + interim.trim() : "")
        ).trim();

        if (currentDisplay && currentDisplay.length >= 2) {
          this.callbacks?.onInterim(currentDisplay);
        }

        // Auto-send: 800ms silence after speech pause
        if (this.silenceTimer) {
          window.clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }

        // Do not auto-send if input is focused
        if (!this.isInputFocused) {
          this.silenceTimer = window.setTimeout(() => {
            if (this.finalTranscript.trim() && this.finalTranscript.trim().length >= 2) {
              this.commitFinal();
            }
          }, 800);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn("[speechInput] Recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          this.isLiveMode = false;
          this.callbacks?.onError(
            "Live mode needs Chrome with microphone access."
          );
        } else if (event.error === "language-not-supported") {
          this.language = "en-US";
          if (this.recognition) this.recognition.lang = "en-US";
        }
      };

      this.recognition.onend = () => {
        const wasActive = this.isListening;
        this.isListening = false;
        this.callbacks?.onEnd();

        if (wasActive && this.finalTranscript.trim() && this.finalTranscript.trim().length >= 2) {
          this.commitFinal();
        }

        // If in Live Mode and not currently speaking, auto-restart recognition after 300ms
        if (this.isLiveMode && !this.isJarvisSpeaking) {
          this.autoRestartTimer = window.setTimeout(() => {
            if (this.isLiveMode && !this.isListening && !this.isJarvisSpeaking && this.callbacks) {
              this.start(this.callbacks);
            }
          }, 300);
        }
      };

      this.recognition.start();
    } catch (err: any) {
      console.warn("[speechInput] SpeechRecognition error, falling back to MediaRecorder:", err);
      this.startMediaRecording();
    }
  }

  private async startMediaRecording() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        this.callbacks?.onUnsupported();
        return;
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.initMicAudioChain();
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.mediaStream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
        this.audioChunks = [];

        if (audioBlob.size > 500) {
          this.callbacks?.onInterim("Transcribing audio core...");
          await this.transcribeAudioBlob(audioBlob);
        } else {
          this.callbacks?.onEnd();
        }
      };

      this.mediaRecorder.start(250);
      this.isListening = true;
      this.callbacks?.onStart();
    } catch (err: any) {
      console.error("[speechInput] Mic recording error:", err);
      this.callbacks?.onError(err?.message || "Failed to access microphone.");
      this.isListening = false;
      this.callbacks?.onEnd();
    }
  }

  private async transcribeAudioBlob(blob: Blob) {
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64Audio = await base64Promise;

      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioData: base64Audio, mimeType: "audio/webm" }),
      });

      if (!res.ok) {
        throw new Error(`Transcribe API error: status ${res.status}`);
      }

      const data = await res.json();
      const text = data.transcript?.trim() || "";
      if (text && text.length >= 2) {
        this.callbacks?.onFinal(text);
      } else {
        this.callbacks?.onEnd();
      }
    } catch (err: any) {
      console.error("[speechInput] Transcribe error:", err);
      this.callbacks?.onError("Server-side audio transcription failed.");
      this.callbacks?.onEnd();
    }
  }

  private cleanupStream() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.micAudioCtx) {
      try {
        this.micAudioCtx.close();
      } catch {}
      this.micAudioCtx = null;
      this.micAnalyser = null;
    }
  }

  private commitFinal() {
    const text = this.finalTranscript.trim();
    this.finalTranscript = "";
    if (this.silenceTimer) {
      window.clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    // Ignore utterances shorter than 2 characters
    if (text && text.length >= 2) {
      this.callbacks?.onFinal(text);
    }
  }

  public stop() {
    if (this.silenceTimer) {
      window.clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.autoRestartTimer) {
      window.clearTimeout(this.autoRestartTimer);
      this.autoRestartTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {}
      this.mediaRecorder = null;
    }
    this.isListening = false;
  }

  public cancel() {
    this.finalTranscript = "";
    if (this.silenceTimer) {
      window.clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.autoRestartTimer) {
      window.clearTimeout(this.autoRestartTimer);
      this.autoRestartTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {}
      this.mediaRecorder = null;
    }
    this.cleanupStream();
    this.isListening = false;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getAudioLevel(): number {
    if (!this.isListening) return 0;
    if (this.micAnalyser) {
      const data = new Uint8Array(this.micAnalyser.frequencyBinCount);
      this.micAnalyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length;
      return Math.min(1.0, (avg / 128) * 1.5);
    }
    return 0.25 + Math.sin(Date.now() * 0.01) * 0.2;
  }
}

export const speechInput = new SpeechRecognitionManager();

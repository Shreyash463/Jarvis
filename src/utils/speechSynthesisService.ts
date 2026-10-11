/**
 * Real-Time Sentence-by-Sentence Speech Synthesis Manager
 * Supports:
 * 1. Server-side Gemini TTS API (/api/tts via Gemini Charon/Orus voice)
 * 2. Sentence-by-sentence streaming queue with prefetching
 * 3. Web Audio effect chain after playback:
 *    - High-shelf EQ boost around 4 kHz
 *    - 25ms slap delay with low feedback
 *    - Reverb wet mix scaled by Effect amount slider
 *    - AnalyserNode driving the Arc Reactor orb and voice ring
 * 4. Client-side Web Speech API fallback (en-GB preference)
 */

class SpeechSynthesisManager {
  private queue: string[] = [];
  private currentBuffer: string = "";
  private isSpeaking: boolean = false;
  private isMuted: boolean = false;
  private speechRate: number = 1.0;
  private effectAmount: number = 40; // 0 to 100, default 40
  private selectedVoiceName: string = "";
  private voiceEngine: "browser" | "gemini" = "gemini";
  private onSpeakingChangeCallback: ((speaking: boolean) => void) | null = null;
  private onFirstAudioCallback: (() => void) | null = null;
  private hasEmittedFirstAudio: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];
  private activeAudioElement: HTMLAudioElement | null = null;
  private prefetchCache: Map<string, Promise<string | null>> = new Map();

  // Web Audio Chain
  private audioCtx: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;
  private eqNode: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private dryGain: GainNode | null = null;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  private initAudioContext(audioEl: HTMLAudioElement) {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }

      // Re-use or create source
      const ctx = this.audioCtx;
      const source = ctx.createMediaElementSource(audioEl);
      this.mediaSourceNode = source;

      // 1. High-shelf EQ boost around 4 kHz
      const eq = ctx.createBiquadFilter();
      eq.type = "highshelf";
      eq.frequency.value = 4000;
      eq.gain.value = 3.5 * (this.effectAmount / 100);
      this.eqNode = eq;

      // 2. 25ms slap delay with low feedback
      const delay = ctx.createDelay(0.1);
      delay.delayTime.value = 0.025; // 25ms slap delay
      this.delayNode = delay;

      const feedback = ctx.createGain();
      feedback.gain.value = 0.15 * (this.effectAmount / 100);
      this.delayFeedback = feedback;

      delay.connect(feedback);
      feedback.connect(delay);

      // Wet/Dry mix
      const wet = ctx.createGain();
      wet.gain.value = 0.22 * (this.effectAmount / 100);
      this.wetGain = wet;

      const dry = ctx.createGain();
      dry.gain.value = 1.0;
      this.dryGain = dry;

      // 3. Analyser Node (drives orb & voice ring)
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      this.analyserNode = analyser;

      // Chain connections:
      // source -> eq
      source.connect(eq);

      // eq -> dry -> analyser -> destination
      eq.connect(dry);
      dry.connect(analyser);

      // eq -> delay -> wet -> analyser
      eq.connect(delay);
      delay.connect(wet);
      wet.connect(analyser);

      analyser.connect(ctx.destination);
    } catch (err) {
      console.warn("[speechService] Web Audio setup warning:", err);
    }
  }

  public getAudioLevel(): number {
    if (!this.isSpeaking) return 0;

    if (this.analyserNode) {
      const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.analyserNode.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      return Math.min(1.0, (avg / 128) * 1.2);
    }

    // Fallback cadence simulation if Web Audio Analyser is unavailable
    return 0.35 + Math.sin(Date.now() * 0.012) * 0.25;
  }

  public setEffectAmount(amount: number) {
    this.effectAmount = Math.max(0, Math.min(100, amount));
    const factor = this.effectAmount / 100;
    if (this.eqNode) this.eqNode.gain.value = 3.5 * factor;
    if (this.delayFeedback) this.delayFeedback.gain.value = 0.15 * factor;
    if (this.wetGain) this.wetGain.gain.value = 0.22 * factor;
  }

  private loadVoices() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    this.voices = window.speechSynthesis.getVoices();
  }

  public setVoiceEngine(engine: "browser" | "gemini") {
    this.voiceEngine = engine;
  }

  public getVoiceEngine(): "browser" | "gemini" {
    return this.voiceEngine;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.cancel();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setRate(rate: number) {
    this.speechRate = Math.max(0.7, Math.min(1.5, rate));
  }

  public setVoiceName(name: string) {
    this.selectedVoiceName = name;
  }

  public onSpeakingChange(callback: (speaking: boolean) => void) {
    this.onSpeakingChangeCallback = callback;
  }

  public onFirstAudio(callback: () => void) {
    this.onFirstAudioCallback = callback;
  }

  public resetStreamTiming() {
    this.hasEmittedFirstAudio = false;
  }

  public getPreferredVoice(): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) {
      this.loadVoices();
    }
    if (this.voices.length === 0) return null;

    if (this.selectedVoiceName) {
      const match = this.voices.find(
        (v) =>
          v.name.toLowerCase().includes(this.selectedVoiceName.toLowerCase()) ||
          this.selectedVoiceName.toLowerCase().includes(v.name.toLowerCase())
      );
      if (match) return match;
    }

    // en-GB male voice preference
    const enGbVoices = this.voices.filter((v) =>
      v.lang.replace("_", "-").toLowerCase().startsWith("en-gb")
    );
    const enGbMale = enGbVoices.find(
      (v) =>
        v.name.toLowerCase().includes("male") ||
        v.name.toLowerCase().includes("george") ||
        v.name.toLowerCase().includes("oliver") ||
        v.name.toLowerCase().includes("daniel") ||
        v.name.toLowerCase().includes("paul")
    );
    if (enGbMale) return enGbMale;
    if (enGbVoices.length > 0) return enGbVoices[0];

    return this.voices[0] || null;
  }

  /**
   * Appends incoming streaming text delta and immediately speaks completed sentences.
   */
  public appendDelta(delta: string) {
    if (this.isMuted) return;

    this.currentBuffer += delta;

    const sentenceBoundaryRegex = /([.!?]+|\n+)(?:\s+|$)/;
    let match: RegExpExecArray | null;

    while ((match = sentenceBoundaryRegex.exec(this.currentBuffer)) !== null) {
      const boundaryIndex = match.index + match[0].length;
      const sentence = this.currentBuffer.slice(0, boundaryIndex).trim();
      this.currentBuffer = this.currentBuffer.slice(boundaryIndex);

      if (sentence.length > 1) {
        this.enqueueSentence(sentence);
      }
    }
  }

  public finishStream() {
    if (this.isMuted) {
      this.currentBuffer = "";
      return;
    }

    const remaining = this.currentBuffer.trim();
    this.currentBuffer = "";
    if (remaining.length > 1) {
      this.enqueueSentence(remaining);
    }
  }

  private enqueueSentence(sentence: string) {
    const clean = sentence
      .replace(/[*_#`~[\]]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!clean) return;

    this.queue.push(clean);

    // Prefetch next sentence via /api/tts in background if using Gemini voice
    if (this.voiceEngine === "gemini" && !this.prefetchCache.has(clean)) {
      this.prefetchTts(clean);
    }

    if (!this.isSpeaking) {
      this.processNextInQueue();
    }
  }

  private prefetchTts(text: string): Promise<string | null> {
    const promise = fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: "Charon" }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => (data?.audio ? `data:audio/wav;base64,${data.audio}` : null))
      .catch(() => null);

    this.prefetchCache.set(text, promise);
    return promise;
  }

  private async processNextInQueue() {
    if (this.queue.length === 0) {
      if (this.isSpeaking) {
        this.isSpeaking = false;
        this.onSpeakingChangeCallback?.(false);
      }
      return;
    }

    if (this.isMuted) {
      this.queue = [];
      this.isSpeaking = false;
      this.onSpeakingChangeCallback?.(false);
      return;
    }

    const textToSpeak = this.queue.shift();
    if (!textToSpeak) {
      this.processNextInQueue();
      return;
    }

    // Prefetch subsequent sentence in advance
    if (this.voiceEngine === "gemini" && this.queue.length > 0) {
      const nextText = this.queue[0];
      if (!this.prefetchCache.has(nextText)) {
        this.prefetchTts(nextText);
      }
    }

    if (this.voiceEngine === "gemini") {
      await this.speakViaGeminiTts(textToSpeak);
    } else {
      this.speakViaWebSpeech(textToSpeak);
    }
  }

  private speakViaWebSpeech(textToSpeak: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      this.processNextInQueue();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const voice = this.getPreferredVoice();
      if (voice) {
        utterance.voice = voice;
      }
      utterance.rate = this.speechRate;
      utterance.pitch = 0.95;

      utterance.onstart = () => {
        if (!this.hasEmittedFirstAudio) {
          this.hasEmittedFirstAudio = true;
          this.onFirstAudioCallback?.();
        }
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          this.onSpeakingChangeCallback?.(true);
        }
      };

      utterance.onend = () => {
        this.processNextInQueue();
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis error:", e);
        this.processNextInQueue();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Failed to speak utterance:", err);
      this.processNextInQueue();
    }
  }

  private async speakViaGeminiTts(textToSpeak: string) {
    try {
      let audioSrc = await (this.prefetchCache.get(textToSpeak) ?? this.prefetchTts(textToSpeak));
      this.prefetchCache.delete(textToSpeak);

      if (!audioSrc) {
        throw new Error("No audio payload returned from TTS prefetch");
      }

      const audio = new Audio(audioSrc);
      this.activeAudioElement = audio;

      // Attach Web Audio effects chain
      this.initAudioContext(audio);

      audio.onplay = () => {
        if (!this.hasEmittedFirstAudio) {
          this.hasEmittedFirstAudio = true;
          this.onFirstAudioCallback?.();
        }
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          this.onSpeakingChangeCallback?.(true);
        }
      };

      audio.onended = () => {
        this.activeAudioElement = null;
        this.processNextInQueue();
      };

      audio.onerror = (e) => {
        console.warn("Gemini TTS audio playback error, falling back to Web Speech:", e);
        this.activeAudioElement = null;
        this.speakViaWebSpeech(textToSpeak);
      };

      await audio.play();
    } catch (err) {
      console.warn("Gemini TTS error, falling back to browser speech:", err);
      this.speakViaWebSpeech(textToSpeak);
    }
  }

  public cancel() {
    this.queue = [];
    this.currentBuffer = "";
    this.prefetchCache.clear();
    if (this.activeAudioElement) {
      try {
        this.activeAudioElement.pause();
        this.activeAudioElement.src = "";
      } catch {}
      this.activeAudioElement = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (this.isSpeaking) {
      this.isSpeaking = false;
      this.onSpeakingChangeCallback?.(false);
    }
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const speechService = new SpeechSynthesisManager();

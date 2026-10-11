/**
 * Client-Side Gemini Live Audio & WebSocket Session Manager
 * 
 * Pipeline:
 * 1. Capture microphone via getUserMedia (16 kHz, echoCancellation, noiseSuppression, autoGainControl)
 * 2. AudioWorklet/ScriptProcessor to downsample to 16 kHz 16-bit PCM and stream to WebSocket
 * 3. Receive 24 kHz 16-bit PCM from server, queue gaplessly using Web Audio API AudioBufferSourceNode
 * 4. AnalyserNode driving real audio level for Orb and voice ring
 * 5. Instant playback cancellation on interruption (barge-in)
 * 6. Live bidirectional transcription for sync captions
 * 7. Auto-reconnection with backoff and turn context continuity
 */

import type { OrbState, DashboardData, UserSettings } from "../types";

export interface LiveTurnEvent {
  role: "user" | "assistant";
  text: string;
}

export interface LiveSessionCallbacks {
  onStateChange: (state: OrbState) => void;
  onAudioLevel: (level: number) => void;
  onUserTranscript: (text: string, isFinal?: boolean) => void;
  onAssistantTranscript: (delta: string, fullText: string) => void;
  onTurnComplete: (userText: string, assistantText: string) => void;
  onInterrupted: () => void;
  onError: (errorMsg: string) => void;
  onLatencyMeasured: (speechEndToAudioMs: number) => void;
  onConnectedChange: (connected: boolean) => void;
}

export class GeminiLiveService {
  private ws: WebSocket | null = null;
  private isLiveActive: boolean = false;
  private callbacks: LiveSessionCallbacks | null = null;

  // Web Audio Contexts
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private micMediaStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private workletNode: AudioNode | null = null;

  // Playback Web Audio Chain
  private outputAnalyser: AnalyserNode | null = null;
  private eqNode: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

  // Playback queue tracking for gapless playback
  private nextStartTime: number = 0;
  private activeSourceNodes: AudioBufferSourceNode[] = [];
  private isJarvisSpeaking: boolean = false;

  // Current Turn Captions & Timing
  private currentUserTranscript: string = "";
  private currentAssistantTranscript: string = "";
  private speechEndedTime: number | null = null;
  private firstAudioReceivedTime: number | null = null;
  private recentTurns: LiveTurnEvent[] = [];

  // Reconnection and Audio loop
  private reconnectAttempts: number = 0;
  private reconnectTimer: number | null = null;
  private animFrameId: number | null = null;
  private isUserSpeaking: boolean = false;
  private userSilenceTimer: number | null = null;
  private voiceName: string = "Charon";
  private effectAmount: number = 30; // 0 to 100, default 30

  // Configuration snapshot
  private cachedContext: any = null;

  public setCallbacks(cbs: LiveSessionCallbacks) {
    this.callbacks = cbs;
  }

  public setVoiceName(voice: string) {
    this.voiceName = voice || "Charon";
  }

  public setEffectAmount(amount: number) {
    this.effectAmount = Math.max(0, Math.min(100, amount));
    this.updateAudioEffects();
  }

  public isActive(): boolean {
    return this.isLiveActive;
  }

  public getVoiceName(): string {
    return this.voiceName;
  }

  public isSpeaking(): boolean {
    return this.isJarvisSpeaking;
  }

  /**
   * Start Live Conversation Session
   */
  public async startLive(dashboard?: DashboardData, settings?: UserSettings): Promise<void> {
    if (this.isLiveActive && this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.isLiveActive = true;
    this.callbacks?.onStateChange("listening");
    this.callbacks?.onConnectedChange(false);

    this.cachedContext = {
      userName: settings?.profile?.userName || "Shreyash",
      currentTime: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      events: dashboard?.events?.map((e) => ({
        title: e.title,
        start: e.startTime,
        end: e.endTime,
        location: e.location,
      })),
      emails: dashboard?.emails
        ? {
            unreadCount: dashboard.emails.filter((m) => m.unread).length,
            latest: dashboard.emails[0]
              ? {
                  from: dashboard.emails[0].sender,
                  subject: dashboard.emails[0].subject,
                  snippet: dashboard.emails[0].snippet,
                }
              : undefined,
          }
        : undefined,
      tasks: dashboard?.tasks?.map((t) => ({
        title: t.title,
        done: t.done,
        due: t.dueTime,
      })),
      weather: dashboard?.weather
        ? {
            city: dashboard.weather.city,
            tempC: dashboard.weather.temp,
            condition: dashboard.weather.condition,
            humidity: dashboard.weather.humidity,
            windKph: dashboard.weather.windSpeed,
          }
        : undefined,
      recentTurns: this.recentTurns.slice(-10),
      voiceName: this.voiceName,
    };

    try {
      // 1. Initialize Microphone AudioContext & MediaStream
      await this.initMicrophone();

      // 2. Initialize Output AudioContext
      this.initOutputAudio();

      // 3. Connect to Server WebSocket
      await this.connectWebSocket();

      // 4. Start Audio Level Polling Loop
      this.startAudioLevelLoop();
    } catch (err: any) {
      console.error("[GeminiLive] Failed to start Live session:", err);
      this.stopLive();
      const msg = err?.message || "Failed to initialize microphone or Live session.";
      this.callbacks?.onError(msg);
      throw err;
    }
  }

  /**
   * Stop Live Conversation Session
   */
  public stopLive() {
    this.isLiveActive = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopPlayback();

    // Close WebSocket
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    // Stop Microphone
    if (this.micMediaStream) {
      this.micMediaStream.getTracks().forEach((track) => track.stop());
      this.micMediaStream = null;
    }

    if (this.inputAudioCtx && this.inputAudioCtx.state !== "closed") {
      try {
        this.inputAudioCtx.close();
      } catch {}
      this.inputAudioCtx = null;
    }

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.callbacks?.onConnectedChange(false);
    this.callbacks?.onStateChange("idle");
    this.callbacks?.onAudioLevel(0);
  }

  /**
   * Stop current Jarvis playback immediately (ESC / barge-in)
   */
  public interruptPlayback() {
    this.stopPlayback();
    this.isJarvisSpeaking = false;
    this.callbacks?.onStateChange("listening");
    this.callbacks?.onInterrupted();
  }

  /**
   * Send user typed message to the Live API session
   */
  public sendTextMessage(text: string) {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();

    // Clear previous turn
    this.currentUserTranscript = cleanText;
    this.currentAssistantTranscript = "";
    this.speechEndedTime = Date.now();
    this.firstAudioReceivedTime = null;

    this.callbacks?.onUserTranscript(cleanText, true);
    this.callbacks?.onStateChange("thinking");

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "text",
          text: cleanText,
        })
      );
    }
  }

  /**
   * Initialize Microphone Stream and 16 kHz Worklet
   */
  private async initMicrophone() {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });

    if (this.inputAudioCtx.state === "suspended") {
      await this.inputAudioCtx.resume();
    }

    // Capture microphone with studio echo cancellation and noise suppression
    this.micMediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.micSource = this.inputAudioCtx.createMediaStreamSource(this.micMediaStream);

    // Mic Analyser for audio level
    this.micAnalyser = this.inputAudioCtx.createAnalyser();
    this.micAnalyser.fftSize = 64;
    this.micAnalyser.smoothingTimeConstant = 0.5;
    this.micSource.connect(this.micAnalyser);

    // Load AudioWorklet or ScriptProcessor fallback
    let useScriptProcessor = false;
    try {
      if (this.inputAudioCtx.audioWorklet) {
        await this.inputAudioCtx.audioWorklet.addModule("/pcm-recorder-processor.js");
        const node = new AudioWorkletNode(this.inputAudioCtx, "pcm-recorder-processor");
        node.port.onmessage = (e) => {
          this.handleMicPcmChunk(e.data);
        };
        this.micSource.connect(node);
        this.workletNode = node;
      } else {
        useScriptProcessor = true;
      }
    } catch (e) {
      console.warn("[GeminiLive] Worklet module load failed, using ScriptProcessor:", e);
      useScriptProcessor = true;
    }

    if (useScriptProcessor) {
      const bufferSize = 2048;
      const processor = this.inputAudioCtx.createScriptProcessor(bufferSize, 1, 1);
      processor.onaudioprocess = (e) => {
        const float32 = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        this.handleMicPcmChunk(pcm16.buffer);
      };
      this.micSource.connect(processor);
      processor.connect(this.inputAudioCtx.destination);
      this.workletNode = processor;
    }
  }

  /**
   * Encode 16-bit PCM chunk to base64 and send to WebSocket
   */
  private handleMicPcmChunk(arrayBuffer: ArrayBuffer) {
    if (!this.isLiveActive || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Convert ArrayBuffer to Base64
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Data = window.btoa(binary);

    this.ws.send(
      JSON.stringify({
        type: "audio",
        data: base64Data,
        mimeType: "audio/pcm;rate=16000",
      })
    );
  }

  /**
   * Initialize Output Audio Context (24 kHz) with Stark Voice Effect Chain
   */
  private initOutputAudio() {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });

    if (this.outputAudioCtx.state === "suspended") {
      this.outputAudioCtx.resume().catch(() => {});
    }

    const ctx = this.outputAudioCtx;

    // Master Gain
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1.0;

    // 1. High-shelf EQ boost around 4 kHz
    const eq = ctx.createBiquadFilter();
    eq.type = "highshelf";
    eq.frequency.value = 4000;
    this.eqNode = eq;

    // 2. 25ms Slap Delay with low feedback
    const delay = ctx.createDelay(0.1);
    delay.delayTime.value = 0.025;
    this.delayNode = delay;

    const feedback = ctx.createGain();
    this.delayFeedback = feedback;
    delay.connect(feedback);
    feedback.connect(delay);

    // Wet & Dry Mix
    const wet = ctx.createGain();
    this.wetGain = wet;

    const dry = ctx.createGain();
    this.dryGain = dry;

    // Output Analyser Node for Orb & Voice Ring
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.8;
    this.outputAnalyser = analyser;

    // Wire up chains
    this.masterGain.connect(eq);
    eq.connect(dry);
    eq.connect(delay);
    delay.connect(wet);

    dry.connect(analyser);
    wet.connect(analyser);
    analyser.connect(ctx.destination);

    this.updateAudioEffects();
    this.nextStartTime = ctx.currentTime;
  }

  private updateAudioEffects() {
    const factor = this.effectAmount / 100;
    if (this.eqNode) {
      this.eqNode.gain.value = 3.5 * factor;
    }
    if (this.delayFeedback) {
      this.delayFeedback.gain.value = 0.15 * factor;
    }
    if (this.wetGain) {
      this.wetGain.gain.value = 0.22 * factor;
    }
    if (this.dryGain) {
      this.dryGain.gain.value = 1.0;
    }
  }

  /**
   * Connect WebSocket to Server Live Proxy
   */
  private async connectWebSocket(): Promise<void> {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const url = `${protocol}//${host}/api/live`;

    return new Promise((resolve, reject) => {
      console.log(`[GeminiLive] Connecting to ${url}...`);
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        console.log("[GeminiLive] WebSocket opened, initializing Live session...");
        this.reconnectAttempts = 0;
        ws.send(
          JSON.stringify({
            type: "init",
            context: this.cachedContext,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleServerMessage(msg);
          if (msg.type === "connected") {
            this.callbacks?.onConnectedChange(true);
            resolve();
          }
        } catch (e) {
          console.error("[GeminiLive] Message parsing error:", e);
        }
      };

      ws.onerror = (err) => {
        console.error("[GeminiLive] WebSocket error:", err);
        if (this.reconnectAttempts === 0) {
          reject(new Error("Unable to connect to Live API server."));
        }
      };

      ws.onclose = (event) => {
        console.log("[GeminiLive] WebSocket closed:", event.reason || "code " + event.code);
        this.callbacks?.onConnectedChange(false);

        if (this.isLiveActive) {
          this.handleReconnection();
        }
      };
    });
  }

  /**
   * Process Server Live Protocol Messages
   */
  private handleServerMessage(msg: any) {
    switch (msg.type) {
      case "connected":
        console.log(`[GeminiLive] Ready with voice ${msg.voice}`);
        this.callbacks?.onStateChange("listening");
        break;

      case "input_transcript":
        // User speech transcription delta
        if (msg.text) {
          this.currentUserTranscript += msg.text;
          this.callbacks?.onUserTranscript(this.currentUserTranscript, false);
          // When user speaks, update state to listening
          this.callbacks?.onStateChange("listening");
        }
        break;

      case "output_transcript":
        // Assistant output transcription delta
        if (msg.text) {
          this.currentAssistantTranscript += msg.text;
          this.callbacks?.onAssistantTranscript(msg.text, this.currentAssistantTranscript);
        }
        break;

      case "audio":
        // 24 kHz PCM audio chunk
        if (msg.data) {
          if (!this.firstAudioReceivedTime && this.speechEndedTime) {
            this.firstAudioReceivedTime = Date.now();
            const latency = this.firstAudioReceivedTime - this.speechEndedTime;
            this.callbacks?.onLatencyMeasured(latency);
          }
          this.queueAudioChunk(msg.data);
        }
        break;

      case "interrupted":
        console.log("[GeminiLive] Interruption received, clearing playback");
        this.interruptPlayback();
        break;

      case "turn_complete":
        // Finalize turn
        if (this.currentUserTranscript || this.currentAssistantTranscript) {
          const u = this.currentUserTranscript.trim();
          const a = this.currentAssistantTranscript.trim();
          if (u) this.recentTurns.push({ role: "user", text: u });
          if (a) this.recentTurns.push({ role: "assistant", text: a });
          this.callbacks?.onTurnComplete(u, a);

          // Reset turn accumulators for next interaction
          this.currentUserTranscript = "";
          this.currentAssistantTranscript = "";
          this.speechEndedTime = null;
          this.firstAudioReceivedTime = null;
        }
        break;

      case "error":
        console.error("[GeminiLive] Server error:", msg.error);
        this.callbacks?.onError(msg.error);
        break;
    }
  }

  /**
   * Decode base64 24 kHz 16-bit PCM and schedule into Web Audio queue
   */
  private queueAudioChunk(base64Audio: string) {
    if (!this.outputAudioCtx || !this.masterGain) return;
    if (this.outputAudioCtx.state === "suspended") {
      this.outputAudioCtx.resume().catch(() => {});
    }

    try {
      // Decode base64 to Uint8Array
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert Int16 bytes to Float32 [-1, 1]
      const int16Array = new Int16Array(bytes.buffer);
      const numSamples = int16Array.length;
      const float32Array = new Float32Array(numSamples);

      for (let i = 0; i < numSamples; i++) {
        const sample = int16Array[i];
        float32Array[i] = sample < 0 ? sample / 0x8000 : sample / 0x7fff;
      }

      // Create AudioBuffer at 24000 Hz
      const audioBuffer = this.outputAudioCtx.createBuffer(1, numSamples, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      // Create BufferSourceNode
      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.masterGain);

      // Gapless scheduling
      const currentTime = this.outputAudioCtx.currentTime;
      const startTime = Math.max(currentTime, this.nextStartTime);
      source.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;

      this.activeSourceNodes.push(source);
      this.isJarvisSpeaking = true;
      this.callbacks?.onStateChange("speaking");

      source.onended = () => {
        const idx = this.activeSourceNodes.indexOf(source);
        if (idx > -1) this.activeSourceNodes.splice(idx, 1);

        if (this.activeSourceNodes.length === 0) {
          // Playback finished
          this.isJarvisSpeaking = false;
          if (this.isLiveActive) {
            this.callbacks?.onStateChange("listening");
          }
        }
      };
    } catch (decodeErr) {
      console.error("[GeminiLive] Error decoding audio chunk:", decodeErr);
    }
  }

  /**
   * Clear all queued audio playback
   */
  private stopPlayback() {
    for (const source of this.activeSourceNodes) {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    }
    this.activeSourceNodes = [];
    if (this.outputAudioCtx) {
      this.nextStartTime = this.outputAudioCtx.currentTime;
    }
    this.isJarvisSpeaking = false;
  }

  /**
   * Loop measuring real audio level for Orb
   */
  private startAudioLevelLoop() {
    const dataArray = new Uint8Array(32);

    const checkLevels = () => {
      if (!this.isLiveActive) return;

      let level = 0;

      if (this.isJarvisSpeaking && this.outputAnalyser) {
        // Measure Jarvis playback level
        this.outputAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        level = Math.min(100, Math.round((sum / dataArray.length / 255) * 100));
        this.callbacks?.onAudioLevel(level);
      } else if (this.micAnalyser) {
        // Measure User microphone level
        this.micAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        level = Math.min(100, Math.round((sum / dataArray.length / 255) * 100));
        this.callbacks?.onAudioLevel(level);

        // Track when user starts/stops speaking for thinking state & latency measurement
        if (level > 15) {
          if (!this.isUserSpeaking) {
            this.isUserSpeaking = true;
            this.callbacks?.onStateChange("listening");
          }
          if (this.userSilenceTimer !== null) {
            window.clearTimeout(this.userSilenceTimer);
            this.userSilenceTimer = null;
          }
        } else if (this.isUserSpeaking) {
          if (this.userSilenceTimer === null) {
            this.userSilenceTimer = window.setTimeout(() => {
              this.isUserSpeaking = false;
              this.speechEndedTime = Date.now();
              this.callbacks?.onStateChange("thinking");
              this.userSilenceTimer = null;
            }, 600);
          }
        }
      }

      this.animFrameId = requestAnimationFrame(checkLevels);
    };

    this.animFrameId = requestAnimationFrame(checkLevels);
  }

  /**
   * Automatic Reconnection with Exponential Backoff
   */
  private handleReconnection() {
    if (!this.isLiveActive) return;
    if (this.reconnectAttempts >= 5) {
      this.callbacks?.onError("Live session lost. Switching to Classic voice engine.");
      this.stopLive();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 8000);
    console.log(`[GeminiLive] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
    this.callbacks?.onUserTranscript("Reconnecting...", false);

    this.reconnectTimer = window.setTimeout(async () => {
      try {
        await this.connectWebSocket();
      } catch (err) {
        console.warn("[GeminiLive] Reconnection attempt failed:", err);
      }
    }, delay);
  }
}

export const geminiLiveService = new GeminiLiveService();

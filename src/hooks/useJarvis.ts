/**
 * J.A.R.V.I.S Orchestration Hook
 * Bridges Gemini Live API (default) with Classic Web Speech fallback
 * and the Zustand HUD UI state.
 */

import { useCallback, useEffect, useRef } from "react";
import { jarvisApi } from "../services/jarvisApi";
import { useJarvisStore } from "../store/jarvisStore";
import { soundFx } from "../utils/audioSynth";
import { speechService } from "../utils/speechSynthesisService";
import { speechInput } from "../utils/speechRecognitionService";
import { geminiLiveService } from "../services/geminiLiveService";

export function useJarvis() {
  const {
    connection,
    orbState,
    partialTranscript,
    audioLevel,
    stats,
    dashboard,
    messages,
    toolCalls,
    activeConfirmation,
    settings,
    isVoiceMuted,
    setVoiceMuted,
    setConnection,
    setOrbState,
    setPartialTranscript,
    setAudioLevel,
    setStats,
    updateDashboard,
    addUserMessage,
    updateAssistantDelta,
    finishAssistantMessage,
    upsertToolCall,
    setActiveConfirmation,
    setMessages,
    addToast,
    updateSettings,
  } = useJarvisStore();

  const isLiveMode = (settings.voice?.voiceEngine || "live") === "live";
  const liveTurnMsgIdRef = useRef<string | null>(null);

  // Sync soundFx config with settings
  useEffect(() => {
    soundFx.setEnabled(settings.sound.sfxEnabled);
    soundFx.setVolume(settings.sound.volume);
  }, [settings.sound.sfxEnabled, settings.sound.volume]);

  // Sync speech synthesis and recognition settings for Classic engine
  useEffect(() => {
    speechService.setRate(settings.voice.speechRate);
    speechService.setVoiceName(settings.voice.selectedVoice);
    speechService.setVoiceEngine(settings.voice.voiceEngine === "browser" ? "browser" : "gemini");
    speechService.setMuted(isVoiceMuted);
    speechInput.setSpeechEngine(settings.voice.speechEngine || "browser");
    speechService.setEffectAmount(settings.voice.effectAmount ?? 30);
  }, [
    settings.voice.speechRate,
    settings.voice.selectedVoice,
    settings.voice.voiceEngine,
    settings.voice.speechEngine,
    settings.voice.effectAmount,
    isVoiceMuted,
  ]);

  // Sync Gemini Live service settings
  useEffect(() => {
    geminiLiveService.setVoiceName(settings.voice?.liveVoice || "Charon");
    geminiLiveService.setEffectAmount(settings.voice?.effectAmount ?? 30);
  }, [settings.voice?.liveVoice, settings.voice?.effectAmount]);

  // Continuously drive real audio level into orb and voice ring
  useEffect(() => {
    let animId: number;
    const tick = () => {
      if (!isLiveMode) {
        if (orbState === "speaking") {
          setAudioLevel(speechService.getAudioLevel());
        } else if (orbState === "listening") {
          setAudioLevel(speechInput.getAudioLevel());
        } else {
          setAudioLevel(0);
        }
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isLiveMode, orbState, setAudioLevel]);

  // Hook Classic speech synthesis state to orb animation
  useEffect(() => {
    if (isLiveMode) return;
    speechService.onSpeakingChange((speaking) => {
      if (speaking) {
        setOrbState("speaking");
      } else {
        setOrbState("idle");
      }
    });
  }, [isLiveMode, setOrbState]);

  // Setup Gemini Live Callbacks
  useEffect(() => {
    geminiLiveService.setCallbacks({
      onStateChange: (state) => {
        setOrbState(state);
      },
      onAudioLevel: (level) => {
        setAudioLevel(level);
      },
      onUserTranscript: (text) => {
        setPartialTranscript(text);
      },
      onAssistantTranscript: (delta, fullText) => {
        if (!liveTurnMsgIdRef.current) {
          liveTurnMsgIdRef.current = `asst-live-${Date.now()}`;
        }
        updateAssistantDelta(liveTurnMsgIdRef.current, delta);
      },
      onTurnComplete: (userText, assistantText) => {
        if (userText) {
          addUserMessage(userText);
        }
        if (liveTurnMsgIdRef.current) {
          finishAssistantMessage(liveTurnMsgIdRef.current);
          liveTurnMsgIdRef.current = null;
        } else if (assistantText) {
          const id = `asst-live-${Date.now()}`;
          updateAssistantDelta(id, assistantText);
          finishAssistantMessage(id);
        }
      },
      onInterrupted: () => {
        if (liveTurnMsgIdRef.current) {
          finishAssistantMessage(liveTurnMsgIdRef.current);
          liveTurnMsgIdRef.current = null;
        }
        setOrbState("listening");
      },
      onError: (errMsg) => {
        addToast({
          type: "error",
          title: "Gemini Live Warning",
          message: `${errMsg} Offering Classic engine fallback.`,
        });
        setOrbState("error");
      },
      onLatencyMeasured: (ms) => {
        setStats({
          ...stats,
          latency: ms,
        });
      },
      onConnectedChange: (connected) => {
        setConnection(connected ? "connected" : "idle");
      },
    });
  }, [
    setOrbState,
    setAudioLevel,
    setPartialTranscript,
    updateAssistantDelta,
    finishAssistantMessage,
    addUserMessage,
    addToast,
    setStats,
    stats,
    setConnection,
  ]);

  // Connect Classic service and listen for background events
  useEffect(() => {
    const unsubscribe = jarvisApi.subscribe((event) => {
      switch (event.type) {
        case "connection":
          if (!isLiveMode) {
            setConnection(event.status);
          }
          break;

        case "orb_state":
          if (!isLiveMode) {
            if (!speechService.isCurrentlySpeaking() || event.state === "error" || event.state === "offline") {
              setOrbState(event.state);
            }
          }
          break;

        case "transcript_partial":
          if (!isLiveMode) {
            setPartialTranscript(event.text);
          }
          break;

        case "assistant_delta":
          if (!isLiveMode) {
            updateAssistantDelta(event.messageId, event.delta);
            speechService.appendDelta(event.delta);
          }
          break;

        case "assistant_done":
          if (!isLiveMode) {
            finishAssistantMessage(event.messageId);
            speechService.finishStream();
          }
          break;

        case "tool_call":
          upsertToolCall(event.toolCall);
          if (event.toolCall.status === "success") {
            soundFx.playSuccessChime();
          }
          break;

        case "confirmation_required":
          setActiveConfirmation(event.request);
          soundFx.playConfirmationAlert();
          break;

        case "stats":
          setStats(event.stats);
          break;

        case "dashboard_update":
          updateDashboard(event.data);
          break;

        case "error":
          addToast({
            type: "error",
            title: "Directive Error",
            message: event.message,
          });
          break;
      }
    });

    jarvisApi.connect().catch((err) => {
      console.error("Failed to connect Jarvis service:", err);
    });

    jarvisApi.getHistory().then((history) => {
      setMessages(history);
    });

    jarvisApi.getDashboard().then((dash) => {
      updateDashboard(dash);
    });

    return () => {
      unsubscribe();
      speechService.cancel();
      speechInput.cancel();
      geminiLiveService.stopLive();
    };
  }, [
    isLiveMode,
    setConnection,
    setOrbState,
    setPartialTranscript,
    setStats,
    updateDashboard,
    updateAssistantDelta,
    finishAssistantMessage,
    upsertToolCall,
    setActiveConfirmation,
    setMessages,
    addToast,
  ]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      if (isLiveMode && geminiLiveService.isActive()) {
        // Feed directly into Gemini Live session
        soundFx.playSendBlip();
        geminiLiveService.sendTextMessage(text);
        return;
      }

      // Classic route
      speechService.cancel();
      soundFx.playSendBlip();
      addUserMessage(text);
      await jarvisApi.sendMessage(text);
    },
    [isLiveMode, addUserMessage]
  );

  const startListening = useCallback(async () => {
    if (isLiveMode) {
      try {
        soundFx.playListenStart();
        await geminiLiveService.startLive(dashboard, settings);
        addToast({
          type: "success",
          title: "Gemini Live Active",
          message: `Connected to ${settings.voice?.liveVoice || "Charon"} voice pipeline.`,
        });
      } catch (err: any) {
        addToast({
          type: "warning",
          title: "Live Unavailable",
          message: `${err?.message || "Microphone permission denied"}. Switching to Classic engine.`,
        });
        updateSettings((prev) => ({
          ...prev,
          voice: { ...prev.voice, voiceEngine: "browser" },
        }));
      }
      return;
    }

    // Classic Web Speech engine
    speechService.cancel();
    soundFx.playListenStart();

    speechInput.start({
      onStart: () => {
        setOrbState("listening");
        jarvisApi.startListening();
      },
      onInterim: (text) => {
        setPartialTranscript(text);
      },
      onFinal: (text) => {
        setPartialTranscript("");
        setOrbState("idle");
        sendMessage(text);
      },
      onError: (msg) => {
        addToast({
          type: "warning",
          title: "Voice Input",
          message: msg,
        });
        setPartialTranscript("");
        setOrbState("idle");
      },
      onUnsupported: () => {
        addToast({
          type: "warning",
          title: "Browser Unsupported",
          message: "Voice input is not supported in this browser, please use Chrome.",
        });
        setOrbState("idle");
      },
      onEnd: () => {
        setPartialTranscript("");
      },
    });
  }, [isLiveMode, dashboard, settings, addToast, updateSettings, sendMessage, setOrbState, setPartialTranscript]);

  const stopListening = useCallback(async () => {
    if (isLiveMode) {
      geminiLiveService.stopLive();
      setOrbState("idle");
      return;
    }

    speechInput.stop();
    setPartialTranscript("");
    setOrbState("idle");
    await jarvisApi.stopListening();
  }, [isLiveMode, setOrbState, setPartialTranscript]);

  const confirmAction = useCallback(
    async (confirmationId: string, approved: boolean) => {
      setActiveConfirmation(null);
      if (approved) {
        soundFx.playSuccessChime();
      }
      await jarvisApi.confirmAction(confirmationId, approved);
    },
    [setActiveConfirmation]
  );

  const cancelCurrentTask = useCallback(async () => {
    if (isLiveMode && geminiLiveService.isActive()) {
      geminiLiveService.interruptPlayback();
      return;
    }

    speechService.cancel();
    speechInput.cancel();
    await jarvisApi.cancelCurrentTask();
    setActiveConfirmation(null);
    addToast({
      type: "info",
      title: "Task Cancelled",
      message: "Current directive cancelled by user.",
    });
  }, [isLiveMode, setActiveConfirmation, addToast]);

  const toggleVoiceMute = useCallback(() => {
    setVoiceMuted(!isVoiceMuted);
    if (!isVoiceMuted) {
      if (isLiveMode) {
        geminiLiveService.interruptPlayback();
      } else {
        speechService.cancel();
      }
      addToast({
        type: "info",
        title: "Voice Output",
        message: "Voice output muted.",
      });
    } else {
      addToast({
        type: "success",
        title: "Voice Output",
        message: "Voice output enabled.",
      });
    }
  }, [isLiveMode, isVoiceMuted, setVoiceMuted, addToast]);

  return {
    connection,
    orbState,
    partialTranscript,
    audioLevel,
    stats,
    dashboard,
    messages,
    toolCalls,
    activeConfirmation,
    isVoiceMuted,
    toggleVoiceMute,
    sendMessage,
    startListening,
    stopListening,
    confirmAction,
    cancelCurrentTask,
  };
}

/**
 * J.A.R.V.I.S Orchestration Hook
 * Bridges the decoupled JarvisApi service, real Web Speech voice input,
 * and sentence-by-sentence streaming speech synthesis with the Zustand UI state.
 */

import { useCallback, useEffect } from "react";
import { jarvisApi } from "../services/jarvisApi";
import { useJarvisStore } from "../store/jarvisStore";
import { soundFx } from "../utils/audioSynth";
import { speechService } from "../utils/speechSynthesisService";
import { speechInput } from "../utils/speechRecognitionService";

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
  } = useJarvisStore();

  // Sync soundFx config with settings
  useEffect(() => {
    soundFx.setEnabled(settings.sound.sfxEnabled);
    soundFx.setVolume(settings.sound.volume);
  }, [settings.sound.sfxEnabled, settings.sound.volume]);

  // Sync speech synthesis and recognition settings
  useEffect(() => {
    speechService.setRate(settings.voice.speechRate);
    speechService.setVoiceName(settings.voice.selectedVoice);
    speechService.setVoiceEngine(settings.voice.voiceEngine || "browser");
    speechService.setMuted(isVoiceMuted);
    speechInput.setSpeechEngine(settings.voice.speechEngine || "browser");
    speechService.setEffectAmount(settings.voice.effectAmount ?? 40);
  }, [
    settings.voice.speechRate,
    settings.voice.selectedVoice,
    settings.voice.voiceEngine,
    settings.voice.speechEngine,
    settings.voice.effectAmount,
    isVoiceMuted,
  ]);

  // Continuously drive real audio level into orb and voice ring
  useEffect(() => {
    let animId: number;
    const tick = () => {
      if (orbState === "speaking") {
        setAudioLevel(speechService.getAudioLevel());
      } else if (orbState === "listening") {
        setAudioLevel(speechInput.getAudioLevel());
      } else {
        setAudioLevel(0);
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [orbState, setAudioLevel]);

  // Hook speech synthesis state to orb animation
  useEffect(() => {
    speechService.onSpeakingChange((speaking) => {
      if (speaking) {
        setOrbState("speaking");
      } else {
        setOrbState("idle");
      }
    });
  }, [setOrbState]);

  // Connect service and listen for events
  useEffect(() => {
    const unsubscribe = jarvisApi.subscribe((event) => {
      switch (event.type) {
        case "connection":
          setConnection(event.status);
          if (event.status === "connected") {
            addToast({
              type: "success",
              title: "HUD Online",
              message: "Secure telemetry link established.",
            });
          } else if (event.status === "disconnected") {
            addToast({
              type: "error",
              title: "Link Severed",
              message: "Tactical connection dropped.",
            });
          }
          break;

        case "orb_state":
          // Only update orb state from server if TTS is not currently playing audio
          if (!speechService.isCurrentlySpeaking() || event.state === "error" || event.state === "offline") {
            setOrbState(event.state);
          }
          break;

        case "transcript_partial":
          setPartialTranscript(event.text);
          break;

        case "assistant_delta":
          updateAssistantDelta(event.messageId, event.delta);
          // Stream delta to speech synthesis
          speechService.appendDelta(event.delta);
          break;

        case "assistant_done":
          finishAssistantMessage(event.messageId);
          speechService.finishStream();
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
    };
  }, [
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
      // Interrupt any current speech playback
      speechService.cancel();
      soundFx.playSendBlip();
      addUserMessage(text);
      await jarvisApi.sendMessage(text);
    },
    [addUserMessage]
  );

  const startListening = useCallback(async () => {
    // Interrupt any ongoing speech output
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
  }, [sendMessage, setOrbState, setPartialTranscript, addToast]);

  const stopListening = useCallback(async () => {
    speechInput.stop();
    setPartialTranscript("");
    setOrbState("idle");
    await jarvisApi.stopListening();
  }, [setOrbState, setPartialTranscript]);

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
    speechService.cancel();
    speechInput.cancel();
    await jarvisApi.cancelCurrentTask();
    setActiveConfirmation(null);
    addToast({
      type: "info",
      title: "Task Cancelled",
      message: "Current directive cancelled by user.",
    });
  }, [setActiveConfirmation, addToast]);

  const toggleVoiceMute = useCallback(() => {
    setVoiceMuted(!isVoiceMuted);
    if (!isVoiceMuted) {
      speechService.cancel();
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
  }, [isVoiceMuted, setVoiceMuted, addToast]);

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

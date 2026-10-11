/**
 * Audio Level Analyzer Hook
 * Samples microphone input via Web Audio API AnalyserNode.
 * Smoothly falls back to synthetic envelopes during speech/listening if microphone is unavailable.
 */

import { useEffect, useRef, useState } from "react";
import type { OrbState } from "../types";

export function useAudioLevel(orbState: OrbState, isMicActive: boolean): number {
  const [level, setLevel] = useState<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const simPhaseRef = useRef<number>(0);

  useEffect(() => {
    let isCancelled = false;

    async function initMicrophone() {
      if (!isMicActive) {
        cleanupMicrophone();
        return;
      }

      try {
        if (!navigator.mediaDevices?.getUserMedia) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(new ArrayBuffer(bufferLength));
      } catch {
        // Microphone permission denied or device absent; will fall back to simulation
      }
    }

    function cleanupMicrophone() {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      dataArrayRef.current = null;
    }

    initMicrophone();

    return () => {
      isCancelled = true;
      cleanupMicrophone();
    };
  }, [isMicActive]);

  // Animation frame loop to calculate RMS audio level or synthetic modulation
  useEffect(() => {
    let isRunning = true;

    function tick() {
      if (!isRunning) return;

      if (document.hidden) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      let targetLevel = 0;

      // 1. Try reading real microphone if active & analyser available
      if (isMicActive && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          sum += dataArrayRef.current[i];
        }
        const avg = sum / dataArrayRef.current.length;
        // Normalize 0..255 to 0..1
        targetLevel = Math.min(1, Math.max(0, (avg - 10) / 90));
      } else if (orbState === "speaking") {
        // 2. Simulated speech envelope: rhythmic layered sines + micro jitter
        simPhaseRef.current += 0.12;
        const p = simPhaseRef.current;
        const wave1 = Math.sin(p * 1.8) * 0.35;
        const wave2 = Math.sin(p * 3.4) * 0.25;
        const wave3 = Math.sin(p * 0.6) * 0.2;
        const jitter = (Math.random() - 0.5) * 0.15;
        targetLevel = Math.min(1, Math.max(0.08, 0.45 + wave1 + wave2 + wave3 + jitter));
      } else if (orbState === "listening") {
        // Fallback gentle listening ripple if mic denied
        simPhaseRef.current += 0.08;
        const breath = Math.sin(simPhaseRef.current * 1.2) * 0.2 + 0.35;
        const jitter = Math.random() * 0.15;
        targetLevel = breath + jitter;
      } else if (orbState === "thinking" || orbState === "executing") {
        targetLevel = 0.15 + Math.random() * 0.1;
      } else {
        // Idle gentle breathing
        simPhaseRef.current += 0.03;
        targetLevel = 0.05 + Math.sin(simPhaseRef.current) * 0.03;
      }

      setLevel((prev) => prev * 0.75 + targetLevel * 0.25);
      animFrameRef.current = requestAnimationFrame(tick);
    }

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [orbState, isMicActive]);

  return level;
}

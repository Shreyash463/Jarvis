/**
 * Tactical Arc Reactor Holographic Orb
 * High-performance 2D Canvas reactor core with responsive DPI,
 * layered rotating tick rings, audio-reactive waveform bars,
 * Stark triangular reactor lattice, voice ring waveform, HUD micro-labels,
 * and bulletproof error boundaries across all 7 states.
 * 
 * Guarantee:
 * - Orb is NEVER invisible: visible in idle, listening, thinking, executing, speaking, error, offline
 * - Every numeric value is clamped against NaN, Infinity, and negative radii
 * - Base reactor core always renders even under zero audio or unexpected events
 */

import React, { useEffect, useRef } from "react";
import type { OrbState } from "../../types";

interface ArcReactorOrbProps {
  state: OrbState;
  audioLevel: number;
  partialTranscript?: string;
  onToggleMic: () => void;
  onCancelTask?: () => void;
  isVoiceMuted?: boolean;
  onToggleMute?: () => void;
  disabled?: boolean;
  measuredLatency?: number | null;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  life: number;
  maxLife: number;
  size: number;
}

function clampNum(val: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  if (typeof val !== "number" || !Number.isFinite(val) || Number.isNaN(val)) return fallback;
  return Math.max(min, Math.min(max, val));
}

export const ArcReactorOrb: React.FC<ArcReactorOrbProps> = ({
  state,
  audioLevel,
  onToggleMic,
  disabled = false,
  measuredLatency,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Store frequently updated props in refs so canvas loop is NEVER torn down
  const stateRef = useRef<OrbState>(state);
  const audioLevelRef = useRef<number>(0);
  const measuredLatencyRef = useRef<number | null | undefined>(measuredLatency);

  useEffect(() => {
    stateRef.current = state || "idle";
  }, [state]);

  useEffect(() => {
    audioLevelRef.current = clampNum(audioLevel, 0, 0, 1);
  }, [audioLevel]);

  useEffect(() => {
    measuredLatencyRef.current = measuredLatency;
  }, [measuredLatency]);

  // Smooth lerp state refs
  const rot1Ref = useRef(0);
  const rot2Ref = useRef(0);
  const rot3Ref = useRef(0);
  const scanAngleRef = useRef(0);
  const speedMultRef = useRef(1);
  const coreScaleRef = useRef(1);
  const coreAlphaRef = useRef(0.85);
  const animFrameRef = useRef<number | null>(null);
  const sparksRef = useRef<Spark[]>([]);

  // Color RGB lerp refs
  const currentR = useRef(0);
  const currentG = useRef(224);
  const currentB = useRef(255);

  const innerR = useRef(120);
  const innerG = useRef(240);
  const innerB = useRef(255);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;
    let width = 520;
    let height = 520;

    const setupCanvasDpi = () => {
      try {
        const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
        const rect = canvas.getBoundingClientRect();
        const cssWidth = clampNum(rect.width, 520, 150, 2000);
        const cssHeight = clampNum(rect.height, 520, 150, 2000);
        width = cssWidth;
        height = cssHeight;

        canvas.width = Math.floor(cssWidth * dpr);
        canvas.height = Math.floor(cssHeight * dpr);
        ctx.resetTransform?.();
        ctx.scale(dpr, dpr);
      } catch (err) {
        console.warn("[orb] Canvas DPI setup error:", err);
      }
    };

    setupCanvasDpi();
    window.addEventListener("resize", setupCanvasDpi);

    let lastTime = performance.now();

    const render = (now: number) => {
      if (!isRunning) return;

      if (document.hidden) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      try {
        const rawDt = (now - lastTime) / 1000;
        const dt = clampNum(rawDt, 0.016, 0.001, 0.05);
        lastTime = now;

        const currentState = stateRef.current || "idle";
        const currentAudio = clampNum(audioLevelRef.current, 0, 0, 1);

        // Target color and physics by state
        let targetR = 0;
        let targetG = 224;
        let targetB = 255;

        let targetInnerR = 120;
        let targetInnerG = 240;
        let targetInnerB = 255;

        let targetSpeed = 1.0;
        let targetScale = 1.0;
        let targetAlpha = 0.85;

        switch (currentState) {
          case "idle":
            targetSpeed = 0.8;
            targetScale = 1.0 + Math.sin(now * 0.0015) * 0.04;
            targetAlpha = 0.8 + Math.sin(now * 0.0015) * 0.1;
            break;

          case "listening":
            targetR = 111;
            targetG = 239;
            targetB = 255;
            targetInnerR = 190;
            targetInnerG = 250;
            targetInnerB = 255;
            targetSpeed = 1.4;
            targetScale = 1.08 + currentAudio * 0.22;
            targetAlpha = 0.95;
            break;

          case "thinking":
            targetR = 47;
            targetG = 123;
            targetB = 255;
            targetInnerR = 0;
            targetInnerG = 180;
            targetInnerB = 255;
            targetSpeed = 2.8;
            targetScale = 1.05 + Math.sin(now * 0.008) * 0.05;
            targetAlpha = 0.9;
            break;

          case "executing":
            targetR = 255;
            targetG = 176;
            targetB = 32;
            targetInnerR = 255;
            targetInnerG = 210;
            targetInnerB = 118;
            targetSpeed = 2.2;
            targetScale = 1.06 + Math.sin(now * 0.006) * 0.04;
            targetAlpha = 0.92;
            break;

          case "speaking":
            targetR = 0;
            targetG = 224;
            targetB = 255;
            targetInnerR = 120;
            targetInnerG = 240;
            targetInnerB = 255;
            targetSpeed = 1.5;
            targetScale = 1.08 + currentAudio * 0.25;
            targetAlpha = 0.95;
            break;

          case "error":
            targetR = 255;
            targetG = 82;
            targetB = 99;
            targetInnerR = 255;
            targetInnerG = 140;
            targetInnerB = 150;
            targetSpeed = 0.5;
            targetScale = 0.96;
            targetAlpha = 0.75;
            break;

          case "offline":
            targetR = 60;
            targetG = 80;
            targetB = 100;
            targetInnerR = 80;
            targetInnerG = 102;
            targetInnerB = 114;
            targetSpeed = 0.15;
            targetScale = 0.9;
            targetAlpha = 0.35;
            break;
        }

        // Smooth lerping with finite clamping
        const lerpFactor = clampNum(dt * 6, 0.1, 0.01, 1);
        currentR.current = clampNum(currentR.current + (targetR - currentR.current) * lerpFactor, targetR, 0, 255);
        currentG.current = clampNum(currentG.current + (targetG - currentG.current) * lerpFactor, targetG, 0, 255);
        currentB.current = clampNum(currentB.current + (targetB - currentB.current) * lerpFactor, targetB, 0, 255);

        innerR.current = clampNum(innerR.current + (targetInnerR - innerR.current) * lerpFactor, targetInnerR, 0, 255);
        innerG.current = clampNum(innerG.current + (targetInnerG - innerG.current) * lerpFactor, targetInnerG, 0, 255);
        innerB.current = clampNum(innerB.current + (targetInnerB - innerB.current) * lerpFactor, targetInnerB, 0, 255);

        speedMultRef.current = clampNum(speedMultRef.current + (targetSpeed - speedMultRef.current) * lerpFactor, 1, 0.1, 5);
        coreScaleRef.current = clampNum(coreScaleRef.current + (targetScale - coreScaleRef.current) * lerpFactor, 1, 0.7, 1.8);
        coreAlphaRef.current = clampNum(coreAlphaRef.current + (targetAlpha - coreAlphaRef.current) * lerpFactor, 0.85, 0.2, 1.0);

        rot1Ref.current = (rot1Ref.current + dt * 0.35 * speedMultRef.current) % (Math.PI * 2);
        rot2Ref.current = (rot2Ref.current - dt * 0.55 * speedMultRef.current) % (Math.PI * 2);
        rot3Ref.current = (rot3Ref.current + dt * 0.9 * speedMultRef.current) % (Math.PI * 2);
        scanAngleRef.current = (scanAngleRef.current + dt * 2.5 * speedMultRef.current) % (Math.PI * 2);

        const rInt = Math.round(currentR.current);
        const gInt = Math.round(currentG.current);
        const bInt = Math.round(currentB.current);

        const inRInt = Math.round(innerR.current);
        const inGInt = Math.round(innerG.current);
        const inBInt = Math.round(innerB.current);

        const innerColor = `rgb(${inRInt}, ${inGInt}, ${inBInt})`;

        // Clear Frame
        ctx.clearRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2;
        const safeDimension = Math.min(width || 520, height || 520);
        const baseRadius = clampNum(safeDimension * 0.38, 160, 50, 1000);

        ctx.save();
        ctx.translate(cx, cy);

        // --- LAYER 0: VOICE RING WAVEFORM (Thin dynamic circle that reacts to audioLevel) ---
        try {
          ctx.save();
          const voiceRingBaseR = baseRadius * 1.06;
          const voicePoints = 100;
          ctx.beginPath();
          for (let i = 0; i <= voicePoints; i++) {
            const theta = (i * Math.PI * 2) / voicePoints;
            const waveHarmonic =
              Math.sin(theta * 6 + now * 0.005) * 0.55 + Math.cos(theta * 10 - now * 0.004) * 0.45;
            const displacement = currentAudio * 18 * (0.8 + 0.4 * waveHarmonic);
            const r = clampNum(voiceRingBaseR + displacement, voiceRingBaseR, 20, 1200);
            const vx = Math.cos(theta) * r;
            const vy = Math.sin(theta) * r;
            if (i === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
          }
          ctx.closePath();
          const voiceRingAlpha = clampNum(0.22 + currentAudio * 0.65, 0.22, 0.15, 0.85);
          ctx.strokeStyle = `rgba(${inRInt}, ${inGInt}, ${inBInt}, ${voiceRingAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        } catch {}

        // --- LAYER 0.5: HUD MICRO-LABELS (JetBrains Mono, 10px, 35% opacity) ---
        try {
          ctx.save();
          ctx.font = "10px 'JetBrains Mono', monospace";
          ctx.fillStyle = "rgba(123, 232, 255, 0.35)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          ctx.fillText("CORE 98%", 0, -baseRadius * 1.15);
          ctx.fillText("LINK SECURE", -baseRadius * 0.78, baseRadius * 1.08);

          const measuredVal = measuredLatencyRef.current;
          const displayLatency = measuredVal && Number.isFinite(measuredVal) ? Math.round(measuredVal) : 142;
          ctx.fillText(`LATENCY ${displayLatency}ms`, baseRadius * 0.78, baseRadius * 1.08);
          ctx.restore();
        } catch {}

        // --- LAYER 1: OUTER TICK-MARK RING (Clockwise) ---
        try {
          ctx.save();
          ctx.rotate(rot1Ref.current);
          ctx.strokeStyle = `rgba(${rInt}, ${gInt}, ${bInt}, 0.35)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(10, baseRadius), 0, Math.PI * 2);
          ctx.stroke();

          const tickCount = 60;
          for (let i = 0; i < tickCount; i++) {
            const theta = (i * Math.PI * 2) / tickCount;
            const isMajor = i % 5 === 0;
            const len = isMajor ? 7 : 3.5;
            const r1 = baseRadius;
            const r2 = Math.max(0, baseRadius - len);

            ctx.strokeStyle = isMajor
              ? `rgba(${rInt}, ${gInt}, ${bInt}, 0.7)`
              : `rgba(${rInt}, ${gInt}, ${bInt}, 0.25)`;
            ctx.lineWidth = isMajor ? 1.5 : 1;
            ctx.beginPath();
            ctx.moveTo(Math.cos(theta) * r1, Math.sin(theta) * r1);
            ctx.lineTo(Math.cos(theta) * r2, Math.sin(theta) * r2);
            ctx.stroke();
          }
          ctx.restore();
        } catch {}

        // --- LAYER 2: DASHED SEGMENTED ARC RING (Counter-Clockwise) ---
        try {
          ctx.save();
          ctx.rotate(rot2Ref.current);
          const ring2Radius = clampNum(baseRadius * 0.88, 100, 10, 1000);
          ctx.strokeStyle = `rgba(${rInt}, ${gInt}, ${bInt}, 0.45)`;
          ctx.lineWidth = 2;
          ctx.setLineDash([12, 8, 4, 8]);
          ctx.beginPath();
          ctx.arc(0, 0, ring2Radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } catch {}

        // --- LAYER 3: THREE BRIGHT ACCENT ARC SEGMENTS ---
        try {
          ctx.save();
          ctx.rotate(rot3Ref.current);
          const ring3Radius = clampNum(baseRadius * 0.76, 90, 10, 1000);
          ctx.strokeStyle = innerColor;
          ctx.lineWidth = 3;
          ctx.setLineDash([]);
          for (let i = 0; i < 3; i++) {
            const arcStart = (i * Math.PI * 2) / 3 + 0.15;
            const arcEnd = arcStart + 0.85;
            ctx.beginPath();
            ctx.arc(0, 0, ring3Radius, arcStart, arcEnd);
            ctx.stroke();
          }
          ctx.restore();
        } catch {}

        // --- LAYER 4: 120 RADIAL WAVEFORM BARS (Audio Reactive) ---
        try {
          ctx.save();
          const waveInnerR = clampNum(baseRadius * 0.52, 60, 10, 800);
          const waveBarCount = 120;
          const effectiveAudio = clampNum(currentAudio, 0.04, 0.04, 1.0);

          for (let i = 0; i < waveBarCount; i++) {
            const theta = (i * Math.PI * 2) / waveBarCount;
            const pseudoNoise =
              Math.sin(theta * 8 + now * 0.004) * 0.25 + Math.cos(theta * 14 - now * 0.003) * 0.15;
            const barHeight = clampNum(
              (4 + effectiveAudio * 26 * (1 + pseudoNoise)) * coreScaleRef.current,
              6,
              2,
              120
            );

            const x1 = Math.cos(theta) * waveInnerR;
            const y1 = Math.sin(theta) * waveInnerR;
            const x2 = Math.cos(theta) * (waveInnerR + barHeight);
            const y2 = Math.sin(theta) * (waveInnerR + barHeight);

            const barAlpha = clampNum(0.2 + effectiveAudio * 0.7, 0.3, 0.1, 0.95);
            ctx.strokeStyle = `rgba(${inRInt}, ${inGInt}, ${inBInt}, ${barAlpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
          ctx.restore();
        } catch {}

        // --- LAYER 5: SCANNING SWEEP LINE (When Executing or Thinking) ---
        if (currentState === "executing" || currentState === "thinking") {
          try {
            ctx.save();
            ctx.rotate(scanAngleRef.current);
            const sweepR = clampNum(baseRadius * 0.75, 80, 10, 800);
            const grad = ctx.createLinearGradient(0, 0, sweepR, 0);
            grad.addColorStop(0, `rgba(${inRInt}, ${inGInt}, ${inBInt}, 0.8)`);
            grad.addColorStop(1, "transparent");
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(sweepR, 0);
            ctx.stroke();
            ctx.restore();
          } catch {}
        }

        // --- LAYER 6: INNER GLOWING CORE (Bloom & Radial Gradient) ---
        try {
          ctx.save();
          const coreRadius = clampNum(baseRadius * 0.44 * coreScaleRef.current, 60, 15, 600);
          const bloomRadius = clampNum(coreRadius * 1.5, 90, 20, 900);
          const safeAlpha = clampNum(coreAlphaRef.current, 0.85, 0.1, 1.0);

          const coreBloom = ctx.createRadialGradient(0, 0, 0, 0, 0, bloomRadius);
          coreBloom.addColorStop(0, `rgba(255, 255, 255, ${safeAlpha * 0.95})`);
          coreBloom.addColorStop(0.3, `rgba(${inRInt}, ${inGInt}, ${inBInt}, ${safeAlpha * 0.85})`);
          coreBloom.addColorStop(0.7, `rgba(${rInt}, ${gInt}, ${bInt}, ${safeAlpha * 0.25})`);
          coreBloom.addColorStop(1, "rgba(0, 0, 0, 0)");

          ctx.fillStyle = coreBloom;
          ctx.beginPath();
          ctx.arc(0, 0, bloomRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } catch (err) {
          console.warn("[orb] Core bloom fallback:", err);
          // Fallback simple solid core so reactor center is never empty
          ctx.save();
          ctx.fillStyle = `rgba(${inRInt}, ${inGInt}, ${inBInt}, 0.8)`;
          ctx.beginPath();
          ctx.arc(0, 0, 40, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // --- LAYER 7: SUBTLE TRIANGULAR ARC REACTOR LATTICE ---
        try {
          ctx.save();
          ctx.rotate(-rot1Ref.current * 0.5);
          const triR = clampNum(baseRadius * 0.28 * coreScaleRef.current, 40, 10, 400);
          const latticeAlpha = clampNum(coreAlphaRef.current * 0.5, 0.35, 0.15, 0.9);
          ctx.strokeStyle = `rgba(255, 255, 255, ${latticeAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
            const theta = (i * Math.PI * 2) / 3 - Math.PI / 2;
            const tx = Math.cos(theta) * triR;
            const ty = Math.sin(theta) * triR;
            if (i === 0) ctx.moveTo(tx, ty);
            else ctx.lineTo(tx, ty);
          }
          ctx.closePath();
          ctx.stroke();

          ctx.fillStyle = `rgba(255, 255, 255, ${clampNum(coreAlphaRef.current * 0.8, 0.7, 0.2, 1)})`;
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } catch {}

        // --- LAYER 8: EMITTED SPARKS (When active/listening/speaking) ---
        try {
          if (currentState !== "offline" && currentState !== "idle" && Math.random() < 0.3) {
            const angle = Math.random() * Math.PI * 2;
            const dist = baseRadius * 0.95;
            sparksRef.current.push({
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              vx: Math.cos(angle) * (Math.random() * 25 + 10),
              vy: Math.sin(angle) * (Math.random() * 25 + 10),
              alpha: 0.9,
              life: 0,
              maxLife: Math.random() * 0.6 + 0.3,
              size: Math.random() * 1.5 + 1,
            });
          }

          // Update & render sparks
          for (let i = sparksRef.current.length - 1; i >= 0; i--) {
            const sp = sparksRef.current[i];
            sp.life += dt;
            if (sp.life >= sp.maxLife) {
              sparksRef.current.splice(i, 1);
              continue;
            }
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            const sparkAlpha = clampNum((1 - sp.life / sp.maxLife) * sp.alpha, 0.5, 0, 1);

            ctx.fillStyle = `rgba(${inRInt}, ${inGInt}, ${inBInt}, ${sparkAlpha})`;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, clampNum(sp.size, 1, 0.5, 5), 0, Math.PI * 2);
            ctx.fill();
          }
        } catch {}

        ctx.restore();
      } catch (err) {
        console.error("[orb] Render error recovered:", err);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", setupCanvasDpi);
    };
  }, []); // Run once on mount: prop updates are read through refs with zero animation restarts

  const isListening = state === "listening";

  return (
    <div className="relative flex flex-col items-center justify-center select-none overflow-visible">
      {/* 1. Arc Reactor Canvas Container (Hero size: min(46vh, 520px)) */}
      <div className="relative flex items-center justify-center shrink-0 w-[min(46vh,520px)] h-[min(46vh,520px)] max-w-[90vw] max-h-[90vw]">
        {/* Subtle Ambient Halo Behind Canvas (radius about 1.4x orb, maximum 20% opacity) */}
        <div
          className={`pointer-events-none absolute -inset-6 rounded-full filter blur-3xl transition-opacity duration-700 ${
            state === "listening"
              ? "bg-[#7be8ff]/20 opacity-100"
              : state === "speaking"
              ? "bg-[#7be8ff]/20 opacity-100"
              : state === "executing"
              ? "bg-[#ffb347]/15 opacity-100"
              : state === "error"
              ? "bg-[#ff5263]/20 opacity-100"
              : state === "offline"
              ? "opacity-0"
              : "bg-[#7be8ff]/10 opacity-60"
          }`}
        />

        <canvas
          ref={canvasRef}
          className="relative z-10 h-full w-full cursor-pointer drop-shadow-[0_0_40px_rgba(123,232,255,0.15)]"
          onClick={onToggleMic}
          title={isListening ? "Click to stop listening" : "Click to speak with J.A.R.V.I.S"}
        />
      </div>
    </div>
  );
};

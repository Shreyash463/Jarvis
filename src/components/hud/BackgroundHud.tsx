import React, { useEffect, useRef } from "react";
import { useJarvisStore } from "../../store/jarvisStore";

interface BackgroundHudProps {
  mouseOffset?: { x: number; y: number };
}

/**
 * Iron Man HUD Deep Glass Background & Helmet HUD Elements
 * Specifications:
 * - Deep near-black blue base (#02050c)
 * - Drifting light streaks and soft glowing orbs behind left/right card stacks (20-35% opacity)
 * - Thin reticle arcs in the 4 corners of the screen (12-18% opacity)
 * - Pitch-ladder scale on left and right of orb
 * - Thin horizon line through orb center that tilts with mouse movement
 * - Rotating subtle concentric HUD rings and tick marks
 * - Soft vignette darkening edges
 */
export const BackgroundHud: React.FC<BackgroundHudProps> = ({ mouseOffset = { x: 0, y: 0 } }) => {
  const reduceMotion = useJarvisStore((state) => state.settings.appearance.reduceMotion);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const render = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // Center point: aligned with hero orb
      const cx = width / 2;
      const cy = height * 0.44;

      if (!reduceMotion) {
        angle += 0.0006;
      }

      // --- 1. FOUR CORNER RETICLE ARCS (12 to 18% opacity) ---
      const cornerSize = Math.min(width, height) * 0.08;
      const cornerMargin = 28;
      ctx.strokeStyle = "rgba(123, 232, 255, 0.15)";
      ctx.lineWidth = 1;

      // Top-Left Reticle
      ctx.beginPath();
      ctx.arc(cornerMargin + cornerSize, cornerMargin + cornerSize, cornerSize, Math.PI, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cornerMargin, cornerMargin + cornerSize);
      ctx.lineTo(cornerMargin, cornerMargin);
      ctx.lineTo(cornerMargin + cornerSize, cornerMargin);
      ctx.stroke();

      // Top-Right Reticle
      ctx.beginPath();
      ctx.arc(width - cornerMargin - cornerSize, cornerMargin + cornerSize, cornerSize, Math.PI * 1.5, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width - cornerMargin - cornerSize, cornerMargin);
      ctx.lineTo(width - cornerMargin, cornerMargin);
      ctx.lineTo(width - cornerMargin, cornerMargin + cornerSize);
      ctx.stroke();

      // Bottom-Left Reticle
      ctx.beginPath();
      ctx.arc(cornerMargin + cornerSize, height - cornerMargin - cornerSize, cornerSize, Math.PI * 0.5, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cornerMargin, height - cornerMargin - cornerSize);
      ctx.lineTo(cornerMargin, height - cornerMargin);
      ctx.lineTo(cornerMargin + cornerSize, height - cornerMargin);
      ctx.stroke();

      // Bottom-Right Reticle
      ctx.beginPath();
      ctx.arc(width - cornerMargin - cornerSize, height - cornerMargin - cornerSize, cornerSize, 0, Math.PI * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width - cornerMargin - cornerSize, height - cornerMargin);
      ctx.lineTo(width - cornerMargin, height - cornerMargin);
      ctx.lineTo(width - cornerMargin, height - cornerMargin - cornerSize);
      ctx.stroke();

      // --- 2. THIN HORIZON LINE THROUGH ORB CENTER (Tilts slightly with mouse) ---
      const tiltAngle = reduceMotion ? 0 : (mouseOffset.x * 0.002);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tiltAngle);

      const horizonGrad = ctx.createLinearGradient(-width * 0.35, 0, width * 0.35, 0);
      horizonGrad.addColorStop(0, "rgba(123, 232, 255, 0)");
      horizonGrad.addColorStop(0.2, "rgba(123, 232, 255, 0.12)");
      horizonGrad.addColorStop(0.4, "rgba(123, 232, 255, 0.04)");
      horizonGrad.addColorStop(0.5, "transparent"); // Center transparent for orb
      horizonGrad.addColorStop(0.6, "rgba(123, 232, 255, 0.04)");
      horizonGrad.addColorStop(0.8, "rgba(123, 232, 255, 0.12)");
      horizonGrad.addColorStop(1, "rgba(123, 232, 255, 0)");

      ctx.strokeStyle = horizonGrad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-width * 0.35, 0);
      ctx.lineTo(width * 0.35, 0);
      ctx.stroke();
      ctx.restore();

      // --- 3. PITCH-LADDER SCALE (Tick lines with tiny numbers on left and right of orb) ---
      ctx.save();
      ctx.translate(cx, cy);
      const ladderDist = Math.min(width, height) * 0.32;
      const pitchSteps = [-20, -10, 0, 10, 20];

      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      pitchSteps.forEach((val) => {
        const py = (val / 20) * 110;
        const tickWidth = val === 0 ? 20 : 12;

        // Left ladder
        ctx.strokeStyle = "rgba(123, 232, 255, 0.16)";
        ctx.beginPath();
        ctx.moveTo(-ladderDist - tickWidth, py);
        ctx.lineTo(-ladderDist, py);
        ctx.stroke();

        ctx.fillStyle = "rgba(123, 232, 255, 0.22)";
        ctx.fillText(`${val}`, -ladderDist - tickWidth - 12, py);

        // Right ladder
        ctx.strokeStyle = "rgba(123, 232, 255, 0.16)";
        ctx.beginPath();
        ctx.moveTo(ladderDist, py);
        ctx.lineTo(ladderDist + tickWidth, py);
        ctx.stroke();

        ctx.fillStyle = "rgba(123, 232, 255, 0.22)";
        ctx.fillText(`${val}`, ladderDist + tickWidth + 12, py);
      });
      ctx.restore();

      // --- 4. CONCENTRIC ROTATING HUD RINGS ---
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // Ring 1
      const r1 = Math.min(width, height) * 0.28;
      ctx.strokeStyle = "rgba(123, 232, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, r1, 0, Math.PI * 2);
      ctx.stroke();

      // Ring 2 with fine ticks
      const r2 = Math.min(width, height) * 0.42;
      ctx.strokeStyle = "rgba(123, 232, 255, 0.06)";
      ctx.beginPath();
      ctx.arc(0, 0, r2, 0, Math.PI * 2);
      ctx.stroke();

      const tickCount = 72;
      for (let i = 0; i < tickCount; i++) {
        const rad = (i * Math.PI * 2) / tickCount;
        const isMajor = i % 6 === 0;
        const len = isMajor ? 6 : 3;
        const x1 = Math.cos(rad) * r2;
        const y1 = Math.sin(rad) * r2;
        const x2 = Math.cos(rad) * (r2 + len);
        const y2 = Math.sin(rad) * (r2 + len);

        ctx.strokeStyle = isMajor ? "rgba(123, 232, 255, 0.16)" : "rgba(123, 232, 255, 0.05)";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.restore();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [reduceMotion, mouseOffset]);

  const pX = reduceMotion ? 0 : mouseOffset.x * -0.4;
  const pY = reduceMotion ? 0 : mouseOffset.y * -0.4;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none bg-[#02050c]">
      {/* 1. Large drifting cyan and deep blue gradients */}
      <div
        className="absolute -top-[10%] -left-[5%] h-[60vw] w-[60vw] max-w-[850px] max-h-[850px] rounded-full bg-[#00cfff] opacity-14 blur-[130px] transition-transform duration-1000 ease-out animate-[pulse_14s_ease-in-out_infinite]"
        style={{ transform: `translate(${pX * 0.8}px, ${pY * 0.8}px)` }}
      />
      <div
        className="absolute top-[20%] -right-[10%] h-[65vw] w-[65vw] max-w-[900px] max-h-[900px] rounded-full bg-[#1a3cff] opacity-16 blur-[140px] transition-transform duration-1000 ease-out animate-[pulse_18s_ease-in-out_infinite_2s]"
        style={{ transform: `translate(${pX * -0.6}px, ${pY * -0.6}px)` }}
      />
      <div
        className="absolute -bottom-[20%] left-[25%] h-[55vw] w-[55vw] max-w-[750px] max-h-[750px] rounded-full bg-[#00ffd0] opacity-12 blur-[130px] transition-transform duration-1000 ease-out animate-[pulse_22s_ease-in-out_infinite_4s]"
        style={{ transform: `translate(${pX * 0.5}px, ${pY * 0.5}px)` }}
      />

      {/* 2. Soft bright light streaks behind left & right card stacks for refraction (20-35% opacity) */}
      <div
        className="absolute top-[18%] left-[4%] h-[400px] w-[180px] rounded-full bg-gradient-to-b from-[#7be8ff]/25 to-[#2f7bff]/20 blur-[65px] transition-transform duration-700"
        style={{ transform: `translate(${pX * 0.6}px, ${pY * 0.6}px)` }}
      />
      <div
        className="absolute top-[25%] right-[4%] h-[450px] w-[200px] rounded-full bg-gradient-to-b from-[#7be8ff]/28 to-[#00ffd0]/18 blur-[70px] transition-transform duration-700"
        style={{ transform: `translate(${pX * -0.5}px, ${pY * -0.5}px)` }}
      />

      {/* 3. Holographic HUD Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full pointer-events-none transition-transform duration-500 ease-out"
        style={{ transform: `translate(${pX}px, ${pY}px)` }}
      />

      {/* 4. Soft Vignette darkening edges (keeping deep blue-black page) */}
      <div
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_45%,transparent_40%,rgba(2,5,12,0.88)_100%)]"
        aria-hidden="true"
      />
    </div>
  );
};

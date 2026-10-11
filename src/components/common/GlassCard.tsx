import React, { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
  pill?: boolean;
}

/**
 * Liquid Glass Material Component (iOS-style glass)
 * Specifications:
 * - background: linear-gradient(145deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 42%, rgba(255,255,255,0.10) 100%), rgba(8,18,32,0.35);
 * - backdrop-filter: blur(40px) saturate(180%) brightness(1.08); include -webkit-backdrop-filter.
 * - border-radius: 28px for cards, 999px for pills
 * - border: 1px solid rgba(255,255,255,0.16)
 * - layered box-shadow: inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(255,255,255,0.08), inset 0 0 28px rgba(255,255,255,0.05), 0 24px 60px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)
 * - ::before specular highlight: radial gradient in top-left corner
 * - ::after rim light: gradient border
 * - subtle noise grain overlay at 3% opacity
 * - text on glass: white at 95% with text-shadow: 0 1px 8px rgba(0,0,0,0.35)
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = "",
  onClick,
  hoverEffect = true,
  pill = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden transition-all duration-300 ease-out select-none ${
        pill ? "rounded-full" : "rounded-[28px]"
      } ${
        hoverEffect
          ? "hover:-translate-y-[2px] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(255,255,255,0.12),inset_0_0_35px_rgba(255,255,255,0.08),0_28px_70px_rgba(0,0,0,0.6),0_4px_12px_rgba(0,0,0,0.4)] active:scale-[0.98]"
          : ""
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 42%, rgba(255,255,255,0.10) 100%), rgba(8,18,32,0.35)",
        backdropFilter: "blur(40px) saturate(180%) brightness(1.08)",
        WebkitBackdropFilter: "blur(40px) saturate(180%) brightness(1.08)",
        border: "1px solid rgba(255,255,255,0.16)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(255,255,255,0.08), inset 0 0 28px rgba(255,255,255,0.05), 0 24px 60px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
      }}
    >
      {/* 1. Specular highlight: radial gradient in the top-left corner */}
      <div
        className="pointer-events-none absolute -top-8 -left-8 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.22)_0%,transparent_70%)] opacity-80 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden="true"
      />

      {/* 2. Rim light highlight */}
      <div
        className={`pointer-events-none absolute inset-0 ${
          pill ? "rounded-full" : "rounded-[28px]"
        } border border-transparent bg-gradient-to-br from-white/30 via-transparent to-white/10 [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [mask-composite:exclude] opacity-70 group-hover:opacity-100 transition-opacity`}
        aria-hidden="true"
      />

      {/* 3. Subtle noise grain texture overlay (3% opacity) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      {/* Content wrapper with crisp readable text */}
      <div className="relative z-10 text-white/95 [text-shadow:0_1px_8px_rgba(0,0,0,0.35)]">
        {children}
      </div>
    </div>
  );
};

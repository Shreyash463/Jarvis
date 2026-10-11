import React, { useState } from "react";

interface GlassTooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom";
  className?: string;
}

export const GlassTooltip: React.FC<GlassTooltipProps> = ({
  content,
  children,
  position = "top",
  className = "",
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && content && (
        <div
          className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/[0.18] bg-[#071322]/90 px-2.5 py-0.5 text-[10px] font-['Inter'] font-normal text-white/90 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-md animate-in fade-in duration-150 ${
            position === "top" ? "-top-8" : "-bottom-8"
          }`}
        >
          {content}
        </div>
      )}
    </div>
  );
};

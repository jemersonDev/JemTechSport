import { BadgeCheck } from "lucide-react";

export function FounderBadge() {
  return (
    <a
      href="https://www.instagram.com/_jemersonlm/"
      target="_blank"
      rel="noopener noreferrer"
      className="founder-badge group flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#00FF00]/30 bg-gradient-to-r from-[#00FF00]/5 via-[#00FF00]/10 to-[#00FF00]/5 hover:border-[#00FF00]/70 transition-all animate-fade-in"
      style={{
        boxShadow:
          "0 0 12px rgba(0,255,0,0.15), inset 0 0 12px rgba(0,255,0,0.05)",
      }}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground group-hover:text-white transition-colors">
        Fundador:
      </span>
      <span
        className="text-sm font-bold text-[#00FF00] group-hover:text-white transition-colors"
        style={{ textShadow: "0 0 8px rgba(0,255,0,0.7), 0 0 16px rgba(0,255,0,0.4)" }}
      >
        @_jemersonlm
      </span>
      <BadgeCheck
        className="w-4 h-4 text-[#1d9bf0] group-hover:animate-pulse"
        fill="#1d9bf0"
        color="#ffffff"
        strokeWidth={2.5}
        style={{
          filter:
            "drop-shadow(0 0 4px rgba(0,255,0,0.8)) drop-shadow(0 0 8px rgba(0,255,0,0.5))",
        }}
      />
    </a>
  );
}

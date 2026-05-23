import { useEffect, useMemo, useRef, useState } from "react";

import { Download, Share2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { removeBackgroundFromUrl } from "@/utils/removeBackground";
import { generateImageBlob, reportShareError } from "@/utils/shareImage";
import { ShareSheet } from "@/components/ShareSheet";

type Props = {
  displayName: string;
  avatarUrl: string | null;
  position: string;
  skillLevel?: string;
  partidas: number;
  gols: number;
  assistencias: number;
  craqueWins?: number;
  bagreWins?: number;
  clubBadgeUrl?: string | null;
  clubName?: string | null;
};

const POS_SHORT: Record<string, string> = {
  goleiro: "GOL",
  zagueiro: "ZAG",
  meia: "MEI",
  atacante: "ATA",
  linha: "LIN",
};

function computeOverall(p: number, g: number, a: number, skill?: string) {
  const base = 60;
  const perMatch = p > 0 ? (g * 1.5 + a) / p : 0;
  const skillBonus =
    skill === "craque" ? 12 : skill === "bom_de_bola" ? 7 : skill === "casual" ? 3 : 0;
  const ovr = Math.min(99, Math.round(base + perMatch * 6 + skillBonus + Math.min(p, 20) * 0.4));
  return Math.max(50, ovr);
}

// Atributos derivados (estilo FIFA) — mantidos no range 50-99
function computeAttrs(
  ovr: number,
  position: string,
  partidas: number,
  gols: number,
  assistencias: number,
) {
  const pos = position?.toLowerCase();
  const gpm = partidas > 0 ? gols / partidas : 0;
  const apm = partidas > 0 ? assistencias / partidas : 0;
  const clamp = (v: number) => Math.max(50, Math.min(99, Math.round(v)));

  // bases por posição
  const bias =
    pos === "goleiro"
      ? { PAC: -8, SHO: -20, PAS: -5, DRI: -8, DEF: 12, PHY: 6 }
      : pos === "zagueiro"
      ? { PAC: -2, SHO: -10, PAS: 0, DRI: -4, DEF: 12, PHY: 8 }
      : pos === "meia"
      ? { PAC: 2, SHO: 0, PAS: 8, DRI: 5, DEF: -2, PHY: 0 }
      : pos === "atacante"
      ? { PAC: 6, SHO: 10, PAS: -2, DRI: 6, DEF: -10, PHY: 2 }
      : { PAC: 0, SHO: 0, PAS: 0, DRI: 0, DEF: 0, PHY: 0 };

  return {
    PAC: clamp(ovr + bias.PAC + gpm * 6),
    SHO: clamp(ovr + bias.SHO + gpm * 14),
    PAS: clamp(ovr + bias.PAS + apm * 14),
    DRI: clamp(ovr + bias.DRI + (gpm + apm) * 5),
    DEF: clamp(ovr + bias.DEF - gpm * 4),
    PHY: clamp(ovr + bias.PHY + Math.min(partidas, 20) * 0.2),
  };
}

export function AthleteCard({
  displayName,
  avatarUrl,
  position,
  skillLevel,
  partidas,
  gols,
  assistencias,
  craqueWins = 0,
  bagreWins = 0,
  clubBadgeUrl = null,
  clubName = null,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBlob, setShareBlob] = useState<Blob | null>(null);
  const [cleanAvatar, setCleanAvatar] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 50, active: false });

  // Tilt 3D com mouse / touch + giroscópio
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const ry = (x - 0.5) * 22; // rotateY
    const rx = (0.5 - y) * 22; // rotateX
    setTilt({ rx, ry, mx: x * 100, my: y * 100, active: true });
  };
  const resetTilt = () =>
    setTilt({ rx: 0, ry: 0, mx: 50, my: 50, active: false });

  // Giroscópio (mobile) — só ativa se não tiver toque
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: DeviceOrientationEvent) => {
      if (tilt.active) return;
      const gamma = e.gamma ?? 0; // -90..90 (esq/dir)
      const beta = e.beta ?? 0; // -180..180 (cima/baixo)
      const ry = Math.max(-15, Math.min(15, gamma / 3));
      const rx = Math.max(-15, Math.min(15, (beta - 45) / 3));
      setTilt((t) => (t.active ? t : { ...t, rx, ry, mx: 50 + ry * 2, my: 50 - rx * 2 }));
    };
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, [tilt.active]);

  const ovr = computeOverall(partidas, gols, assistencias, skillLevel);
  const pos = POS_SHORT[position?.toLowerCase()] ?? "JOG";
  const attrs = useMemo(
    () => computeAttrs(ovr, position, partidas, gols, assistencias),
    [ovr, position, partidas, gols, assistencias],
  );

  // Tier visual
  const tier =
    ovr >= 90
      ? {
          label: ovr >= 99 ? "PERFECT" : "ICON",
          ringFrom: "#fff7c0",
          ringTo: "#6b4400",
          base: "from-[#2a1a00] via-[#6b4400] to-[#3a2200]",
          cardGradient:
            "linear-gradient(145deg, #2a1a00 0%, #6b4400 30%, #c8860a 55%, #f5c842 70%, #c8860a 85%, #3a2200 100%)",
          glow: "rgba(245,200,66,0.55)",
          accent: "#f5c842",
          animated: true,
        }
      : ovr >= 80
      ? {
          label: "OURO",
          ringFrom: "#fcd34d",
          ringTo: "#92400e",
          base: "from-yellow-900 via-amber-700 to-yellow-950",
          cardGradient:
            "linear-gradient(145deg, #3a2a00 0%, #7a5400 30%, #c8860a 60%, #7a5400 90%, #3a2200 100%)",
          glow: "rgba(250,204,21,0.45)",
          accent: "#fde047",
          animated: false,
        }
      : ovr >= 70
      ? {
          label: "PRATA",
          ringFrom: "#e5e7eb",
          ringTo: "#52525b",
          base: "from-slate-700 via-zinc-600 to-slate-900",
          cardGradient:
            "linear-gradient(145deg, #1f2937 0%, #4b5563 35%, #cbd5e1 60%, #6b7280 85%, #1f2937 100%)",
          glow: "rgba(226,232,240,0.35)",
          accent: "#e2e8f0",
          animated: false,
        }
      : {
          label: "BRONZE",
          ringFrom: "#fdba74",
          ringTo: "#7c2d12",
          base: "from-orange-900 via-amber-800 to-orange-950",
          cardGradient:
            "linear-gradient(145deg, #3a1a00 0%, #7c2d12 35%, #c2410c 60%, #7c2d12 85%, #2a1000 100%)",
          glow: "rgba(251,146,60,0.4)",
          accent: "#fed7aa",
          animated: false,
        };


  // Tenta remover fundo automaticamente quando há foto.
  // Se a URL já é o PNG limpo persistido pelo upload (card-avatar.png),
  // pula o reprocessamento e usa direto.
  useEffect(() => {
    if (!avatarUrl) {
      setCleanAvatar(null);
      return;
    }
    if (/card-avatar\.png(\?|$)/i.test(avatarUrl)) {
      setCleanAvatar(avatarUrl);
      setRemoving(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setRemoving(true);
      try {
        const out = await removeBackgroundFromUrl(avatarUrl);
        if (!cancelled) setCleanAvatar(out);
      } catch (e) {
        console.warn("bg removal failed", e);
        if (!cancelled) setCleanAvatar(avatarUrl);
      } finally {
        if (!cancelled) setRemoving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [avatarUrl]);

  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleShare = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const blob = await generateImageBlob(ref.current);
      setShareBlob(blob);
      setShareOpen(true);
    } catch (e) {
      reportShareError(e);
    } finally {
      setBusy(false);
    }
  };

  // Escudo mais alto/envolvente (curvas pelos cantos verticais)
  const shieldClip =
    "polygon(50% 0%, 92% 4%, 100% 14%, 100% 78%, 50% 100%, 0% 78%, 0% 14%, 8% 4%)";

  const NEON = "#00FF88";

  return (
    <div className="space-y-3">
      <div
        className="relative flex justify-center overflow-hidden rounded-2xl py-8"
        style={{
          perspective: 1200,
          background:
            "radial-gradient(ellipse at center, #1a1200 0%, #0a0a14 60%, #000000 100%)",
        }}
      >
        {/* Partículas douradas flutuantes */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 14 }).map((_, i) => {
            const left = (i * 37) % 100;
            const delay = (i * 0.7) % 6;
            const size = 1.5 + ((i * 7) % 3);
            return (
              <span
                key={i}
                className="absolute rounded-full animate-gold-particle"
                style={{
                  left: `${left}%`,
                  bottom: `${(i * 11) % 40}%`,
                  width: size,
                  height: size,
                  background: "#f5c842",
                  boxShadow: "0 0 6px #f5c842, 0 0 12px rgba(245,200,66,0.5)",
                  animationDelay: `${delay}s`,
                }}
              />
            );
          })}
        </div>

        <div
          ref={tiltRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetTilt}
          className="relative transition-transform duration-200 ease-out will-change-transform"
          style={{
            width: 290,
            height: 460,
            transformStyle: "preserve-3d",
            transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          }}
        >
        <div
          ref={ref}
          className="relative w-full h-full animate-neon-pulse"
          style={{
            filter: `drop-shadow(0 10px 30px ${tier.glow})`,
          }}
        >
          {/* Halo neon pulsante atrás do escudo */}
          <div
            className="absolute -inset-2 pointer-events-none"
            style={{
              clipPath: shieldClip,
              background:
                "radial-gradient(ellipse at center, rgba(0,255,136,0.35), transparent 70%)",
              filter: "blur(8px)",
            }}
          />
          {/* Borda externa (anel dourado/neon do escudo) */}
          <div
            className="absolute inset-0"
            style={{
              clipPath: shieldClip,
              background: `linear-gradient(135deg, ${tier.ringFrom} 0%, #fff7c0 18%, ${tier.ringTo} 50%, #fff7c0 78%, ${tier.ringFrom} 100%)`,
              boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.4)`,
            }}
          />
          {/* Bevel interno (sombra escura simulando profundidade) */}
          <div
            className="absolute inset-[2px] pointer-events-none"
            style={{
              clipPath: shieldClip,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 8%, transparent 92%, rgba(0,0,0,0.6) 100%)",
              mixBlendMode: "overlay",
            }}
          />
          {/* Camada interna (1px de espessura da borda) */}
          <div
            className={`absolute inset-[3px] ${tier.animated ? "animate-border-glow" : ""}`}
            style={{
              clipPath: shieldClip,
              background: tier.cardGradient,
              border: tier.animated ? "1.5px solid rgba(245,200,66,0.6)" : undefined,
            }}
          />


          {/* Texturas: raios de luz */}
          <div
            className="absolute inset-[3px] opacity-40 pointer-events-none"
            style={{
              clipPath: shieldClip,
              background: `radial-gradient(ellipse at 50% 0%, ${tier.glow}, transparent 60%),
                           conic-gradient(from 220deg at 50% 30%, transparent 0deg, rgba(255,255,255,0.18) 30deg, transparent 70deg, rgba(255,255,255,0.1) 130deg, transparent 180deg)`,
            }}
          />
          {/* Padrão geométrico */}
          <div
            className="absolute inset-[3px] opacity-15 pointer-events-none mix-blend-overlay"
            style={{
              clipPath: shieldClip,
              backgroundImage:
                "repeating-linear-gradient(60deg, rgba(255,255,255,0.4) 0 1px, transparent 1px 14px), repeating-linear-gradient(-60deg, rgba(0,0,0,0.3) 0 1px, transparent 1px 14px)",
            }}
          />

          {/* Textura metálica escovada */}
          <div
            className="absolute inset-[3px] opacity-25 pointer-events-none mix-blend-overlay"
            style={{
              clipPath: shieldClip,
              backgroundImage:
                "repeating-linear-gradient(180deg, rgba(255,255,255,0.35) 0 1px, transparent 1px 3px)",
            }}
          />

          {/* Reflexo no topo */}
          <div
            className="absolute inset-x-[3px] top-[3px] h-1/2 opacity-25 pointer-events-none"
            style={{
              clipPath: shieldClip,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.6), transparent 70%)",
            }}
          />

          {/* Feixe de luz diagonal — carta especial */}
          <div
            className="absolute inset-[3px] pointer-events-none opacity-30"
            style={{
              clipPath: shieldClip,
              background:
                "linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.55) 48%, rgba(255,255,255,0.15) 52%, transparent 65%)",
              mixBlendMode: "screen",
            }}
          />

          {/* Partículas de luz dourada */}
          <div
            className="absolute inset-[3px] pointer-events-none opacity-70"
            style={{
              clipPath: shieldClip,
              backgroundImage: `
                radial-gradient(1.5px 1.5px at 18% 22%, ${tier.accent}, transparent 60%),
                radial-gradient(1px 1px at 78% 30%, #fff8c5, transparent 60%),
                radial-gradient(1.5px 1.5px at 30% 70%, ${tier.accent}, transparent 60%),
                radial-gradient(1px 1px at 85% 78%, #fff8c5, transparent 60%),
                radial-gradient(1px 1px at 55% 18%, #fff8c5, transparent 60%),
                radial-gradient(1.5px 1.5px at 12% 55%, ${tier.accent}, transparent 60%),
                radial-gradient(1px 1px at 68% 60%, #fff8c5, transparent 60%),
                radial-gradient(1.5px 1.5px at 88% 45%, ${tier.accent}, transparent 60%)
              `,
              filter: `drop-shadow(0 0 3px ${tier.accent})`,
              mixBlendMode: "screen",
            }}
          />

          {/* OVR + posição (esquerda topo) com lens flare */}
          <div
            className="absolute top-7 left-6 leading-none select-none z-20"
            style={{ color: tier.accent, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
          >
            <div className="relative inline-block">
              {/* Lens flare atrás do número */}
              <div
                className="absolute pointer-events-none animate-lens-flare"
                style={{
                  top: "50%",
                  left: "50%",
                  width: 110,
                  height: 110,
                  transform: "translate(-50%, -50%)",
                  background:
                    "radial-gradient(circle, rgba(255,247,192,0.85) 0%, rgba(253,224,71,0.45) 25%, transparent 60%)",
                  mixBlendMode: "screen",
                  filter: "blur(2px)",
                }}
              />
              <div
                className="font-black tracking-tighter relative flex items-center gap-1"
                style={{
                  fontSize: 60,
                  fontFamily: '"Oswald", "Anton", "Bebas Neue", Impact, sans-serif',
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  color: "#ffffff",
                  textShadow:
                    "0 0 10px #fff, 0 0 20px #f5c842, 0 0 40px #c8860a, 0 0 60px rgba(200,134,10,0.5)",
                  lineHeight: 1,
                }}
              >
                {ovr}
                {ovr >= 99 && (
                  <span
                    style={{
                      fontSize: 22,
                      filter: "drop-shadow(0 0 8px #f5c842)",
                      marginLeft: 2,
                    }}
                  >
                    ⭐
                  </span>
                )}
              </div>
            </div>
            <div
              className="mt-1"
              style={{
                fontSize: 12,
                fontFamily: '"Oswald", "Rajdhani", sans-serif',
                fontWeight: 600,
                letterSpacing: "0.3em",
                color: "rgba(255,240,180,0.85)",
                textShadow: "0 1px 2px rgba(0,0,0,0.8)",
              }}
            >
              {pos}
            </div>

            <div
              className="mt-1.5 h-px w-9"
              style={{ background: tier.accent, opacity: 0.6 }}
            />
            {/* "Bandeira" + escudo do clube (simétricos) */}
            <div className="flex items-center gap-1.5 mt-2">
              <div
                className="w-5 h-3.5 rounded-sm overflow-hidden border"
                style={{ borderColor: `${tier.accent}55` }}
                title="Brasil"
              >
                <div className="h-full bg-green-600 relative">
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(135deg, transparent 35%, #fde047 35% 65%, transparent 65%)",
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-700" />
                  </div>
                </div>
              </div>
              {clubBadgeUrl ? (
                <div
                  className="relative w-5 h-5 flex items-center justify-center"
                  title={clubName ?? "Time do coração"}
                >
                  <div
                    className="absolute inset-[-3px] rounded-full pointer-events-none"
                    style={{
                      background: `radial-gradient(circle, ${tier.accent}66 0%, transparent 70%)`,
                      filter: "blur(2px)",
                    }}
                  />
                  <img
                    src={clubBadgeUrl}
                    alt={clubName ?? ""}
                    crossOrigin="anonymous"
                    className="relative w-5 h-5 object-contain"
                    style={{
                      filter: `drop-shadow(0 0 3px ${tier.accent}) drop-shadow(0 1px 1px rgba(0,0,0,0.7))`,
                    }}
                  />
                </div>
              ) : (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                  style={{
                    background: "rgba(0,0,0,0.35)",
                    border: `1px dashed ${tier.accent}55`,
                    color: `${tier.accent}aa`,
                  }}
                  title="Sem time escolhido"
                  aria-label="Sem time escolhido"
                >
                  ⚽
                </div>
              )}
            </div>
          </div>

          {/* Sombra elíptica no chão (ancora o jogador no card) */}
          <div
            className="absolute pointer-events-none z-[9]"
            style={{
              left: "18%",
              right: "18%",
              top: 258,
              height: 22,
              background:
                "radial-gradient(ellipse at center, rgba(0,0,0,0.55), transparent 70%)",
              filter: "blur(4px)",
            }}
          />
          {/* Avatar — centralizado, cabeça acima da linha do nome */}
          <div
            className="absolute pointer-events-none z-10 overflow-hidden"
            style={{
              top: 38,
              left: 22,
              right: 22,
              height: 250,
              WebkitMaskImage:
                "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.55) 6%, #000 16%, #000 82%, rgba(0,0,0,0.4) 94%, transparent 100%)",
              maskImage:
                "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.55) 6%, #000 16%, #000 82%, rgba(0,0,0,0.4) 94%, transparent 100%)",
            }}
          >
            {cleanAvatar ? (
              <img
                src={cleanAvatar}
                alt={displayName}
                crossOrigin="anonymous"
                className="absolute"
                style={{
                  top: 0,
                  left: "50%",
                  height: "100%",
                  width: "auto",
                  maxWidth: "none",
                  transform: "translateX(-46%)",
                  objectFit: "contain",
                  objectPosition: "center top",
                  filter:
                    "contrast(1.08) saturate(1.18) brightness(1.06) drop-shadow(0 0 14px rgba(255,247,192,0.45)) drop-shadow(0 18px 18px rgba(0,0,0,0.7))",
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div
                  className="text-6xl font-black"
                  style={{
                    color: tier.accent,
                    textShadow: "0 2px 8px rgba(0,0,0,0.7)",
                  }}
                >
                  {removing ? (
                    <Loader2 className="w-9 h-9 animate-spin" />
                  ) : (
                    initials || "??"
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Painel inferior: nome + stats em zona limpa, alto contraste */}
          <div
            className="absolute left-0 right-0 z-20"
            style={{ top: 278, paddingLeft: 22, paddingRight: 22 }}
          >
            {/* Divisor neon verde */}
            <div
              className="mx-auto mb-2"
              style={{
                height: 2,
                width: "78%",
                background: `linear-gradient(90deg, transparent, ${NEON}, transparent)`,
                boxShadow: `0 0 12px ${NEON}, 0 0 24px ${NEON}`,
              }}
            />
            {/* Nome */}
            <div
              className="uppercase truncate text-center"
              style={{
                fontFamily: '"Oswald", "Rajdhani", "Bebas Neue", sans-serif',
                fontWeight: 700,
                fontSize: 20,
                letterSpacing: "0.18em",
                color: "#ffffff",
                textShadow:
                  "0 0 6px rgba(245,200,66,0.7), 0 0 14px rgba(200,134,10,0.45), 0 2px 3px rgba(0,0,0,0.8)",
                lineHeight: 1.1,
                marginBottom: 10,
              }}
            >
              {displayName}
            </div>


            {/* Atributos 3x2 com barra de progresso neon */}
            <div
              className="grid grid-cols-2 gap-x-5 gap-y-2 px-2 py-2 rounded-md"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.35))",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.6)",
              }}
            >
            {(
              [
                ["PAC", attrs.PAC],
                ["DRI", attrs.DRI],
                ["SHO", attrs.SHO],
                ["DEF", attrs.DEF],
                ["PAS", attrs.PAS],
                ["PHY", attrs.PHY],
              ] as const
            ).map(([k, v]) => {
              const pct = Math.max(10, Math.min(100, ((v - 50) / 49) * 100));
              const barGradient =
                v >= 90
                  ? "linear-gradient(90deg, #f5c842, #ffffff)"
                  : v >= 80
                  ? "linear-gradient(90deg, #c8860a, #f5c842)"
                  : v < 70
                  ? "linear-gradient(90deg, #e05050, #f08080)"
                  : "linear-gradient(90deg, #94a3b8, #e2e8f0)";
              const barGlow =
                v >= 90
                  ? "0 0 8px rgba(245,200,66,0.8)"
                  : v < 70
                  ? "0 0 6px rgba(224,80,80,0.6)"
                  : "0 0 4px rgba(255,255,255,0.3)";
              return (
              <div
                key={k}
                className="flex flex-col"
                style={{
                  fontFamily: '"Oswald", "Bebas Neue", Impact, sans-serif',
                  color: "#ffffff",
                }}
              >
                <div className="flex items-center justify-between leading-none">
                  <span
                    className="text-[26px] font-black tabular-nums"
                    style={{
                      color: "#ffffff",
                      textShadow:
                        "0 0 2px rgba(0,0,0,0.95), 0 1px 2px rgba(0,0,0,0.95), 0 0 10px rgba(245,200,66,0.45)",
                    }}
                  >
                    {v}
                  </span>
                  <span
                    className="text-[11px] font-bold tracking-[0.22em]"
                    style={{ color: tier.accent, textShadow: `0 0 6px ${tier.accent}` }}
                  >
                    {k}
                  </span>
                </div>
                <div
                  className="mt-1 h-[3px] rounded-full overflow-hidden"
                  style={{ background: "rgba(0,0,0,0.6)", width: 40 }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: barGradient,
                      boxShadow: barGlow,
                    }}
                  />
                </div>
              </div>

              );
            })}
            </div>
          </div>

          {/* Selos craque/bagre */}
          {(craqueWins > 0 || bagreWins > 0) && (
            <div
              className="absolute left-0 right-0 flex justify-center gap-1.5 px-4 z-20"
              style={{ top: 408 }}
            >
              {craqueWins > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-black/70 text-yellow-300 text-[9px] font-black tracking-wider border border-yellow-500/50">
                  ⭐ CRAQUE x{craqueWins}
                </span>
              )}
              {bagreWins > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-black/70 text-orange-300 text-[9px] font-black tracking-wider border border-orange-500/50">
                  🐟 BAGRE x{bagreWins}
                </span>
              )}
            </div>
          )}

          {/* Marca */}
          <div
            className="absolute bottom-[18px] left-0 right-0 text-center text-[8px] font-black tracking-[0.4em] z-20"
            style={{ color: tier.accent, opacity: 0.55 }}
          >
            JEMTECH · {tier.label}
          </div>

          {/* ✨ Camada HOLOGRÁFICA — shimmer arco-íris que segue o cursor */}
          <div
            className="absolute inset-[3px] pointer-events-none z-30 transition-opacity duration-300"
            style={{
              clipPath: shieldClip,
              opacity: tilt.active ? 0.55 : 0.25,
              mixBlendMode: "color-dodge",
              background: `radial-gradient(circle at ${tilt.mx}% ${tilt.my}%, rgba(255,255,255,0.9) 0%, rgba(255,0,150,0.5) 15%, rgba(0,200,255,0.4) 30%, rgba(255,255,0,0.3) 45%, transparent 65%)`,
            }}
          />
          {/* Faixa diagonal arco-íris */}
          <div
            className="absolute inset-[3px] pointer-events-none z-30"
            style={{
              clipPath: shieldClip,
              opacity: 0.18,
              mixBlendMode: "screen",
              background: `linear-gradient(${110 + tilt.ry * 2}deg,
                transparent 0%,
                transparent 30%,
                #ff00cc 40%,
                #00ffff 50%,
                #ffff00 60%,
                transparent 70%,
                transparent 100%)`,
              backgroundSize: "200% 200%",
              backgroundPosition: `${tilt.mx}% ${tilt.my}%`,
            }}
          />
          {/* Brilho no ponto do cursor */}
          {tilt.active && (
            <div
              className="absolute inset-[3px] pointer-events-none z-30"
              style={{
                clipPath: shieldClip,
                background: `radial-gradient(circle at ${tilt.mx}% ${tilt.my}%, rgba(255,255,255,0.35), transparent 25%)`,
                mixBlendMode: "overlay",
              }}
            />
          )}
        </div>
        </div>
      </div>

      {removing && (
        <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1.5">
          <Sparkles className="w-3 h-3 animate-pulse" />
          Recortando sua foto…
        </p>
      )}

      {!avatarUrl && (
        <p className="text-[11px] text-center text-muted-foreground px-6">
          💡 Para melhor resultado, envie uma foto de <strong className="text-foreground">busto ou corpo inteiro</strong> (não só rosto) com fundo neutro.
        </p>
      )}

      <div className="flex gap-2 justify-center">
        <button
          onClick={(e) => {
            const el = e.currentTarget;
            el.classList.remove("animate-share-pulse");
            void el.offsetWidth;
            el.classList.add("animate-share-pulse");
            handleShare();
          }}
          disabled={busy}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider disabled:opacity-60 transition-transform"
          style={{
            background: "linear-gradient(135deg, #f5c842 0%, #c8860a 100%)",
            color: "#0a0a0a",
            boxShadow:
              "0 4px 14px rgba(245,200,66,0.4), inset 0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          Compartilhar cartão
        </button>
      </div>


      <ShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        blob={shareBlob}
        fileName={`${displayName || "card"}-card.png`}
        title="Meu Card Lendário - Joga Bola App"
        text="Confira meu card oficial no Joga Bola App! ⚽"
      />
    </div>
  );
}

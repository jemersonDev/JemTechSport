import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { removeBackgroundFromUrl } from "@/utils/removeBackground";

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
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [cleanAvatar, setCleanAvatar] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

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
          label: "ICON",
          ringFrom: "#fde68a",
          ringTo: "#b45309",
          base: "from-amber-900 via-yellow-700 to-amber-950",
          glow: "rgba(251,191,36,0.55)",
          accent: "#fde047",
        }
      : ovr >= 80
      ? {
          label: "OURO",
          ringFrom: "#fcd34d",
          ringTo: "#92400e",
          base: "from-yellow-900 via-amber-700 to-yellow-950",
          glow: "rgba(250,204,21,0.45)",
          accent: "#fde047",
        }
      : ovr >= 70
      ? {
          label: "PRATA",
          ringFrom: "#e5e7eb",
          ringTo: "#52525b",
          base: "from-slate-700 via-zinc-600 to-slate-900",
          glow: "rgba(226,232,240,0.35)",
          accent: "#e2e8f0",
        }
      : {
          label: "BRONZE",
          ringFrom: "#fdba74",
          ringTo: "#7c2d12",
          base: "from-orange-900 via-amber-800 to-orange-950",
          glow: "rgba(251,146,60,0.4)",
          accent: "#fed7aa",
        };

  // Tenta remover fundo automaticamente quando há foto
  useEffect(() => {
    if (!avatarUrl) {
      setCleanAvatar(null);
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
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(ref.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const blob: Blob = await new Promise((res) =>
        canvas.toBlob((b) => res(b as Blob), "image/png", 1),
      );
      const file = new File([blob], `${displayName}-card.png`, { type: "image/png" });
      const navAny = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (navAny.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Card de ${displayName}`,
          text: `Meu card no JemTech Sports — OVR ${ovr}`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${displayName}-card.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Card baixado!");
      }
    } catch (e) {
      toast.error("Erro ao gerar card");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  // Escudo mais alto/envolvente (curvas pelos cantos verticais)
  const shieldClip =
    "polygon(50% 0%, 92% 4%, 100% 14%, 100% 78%, 50% 100%, 0% 78%, 0% 14%, 8% 4%)";

  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <div
          ref={ref}
          className="relative"
          style={{
            width: 290,
            height: 460,
            filter: `drop-shadow(0 10px 30px ${tier.glow})`,
          }}
        >
          {/* Borda externa (anel dourado/neon do escudo) */}
          <div
            className="absolute inset-0"
            style={{
              clipPath: shieldClip,
              background: `linear-gradient(135deg, ${tier.ringFrom}, ${tier.ringTo}, ${tier.ringFrom})`,
            }}
          />
          {/* Camada interna (1px de espessura da borda) */}
          <div
            className={`absolute inset-[3px] bg-gradient-to-br ${tier.base}`}
            style={{ clipPath: shieldClip }}
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

          {/* Reflexo no topo */}
          <div
            className="absolute inset-x-[3px] top-[3px] h-1/2 opacity-25 pointer-events-none"
            style={{
              clipPath: shieldClip,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.6), transparent 70%)",
            }}
          />

          {/* OVR + posição (esquerda topo) */}
          <div
            className="absolute top-7 left-6 leading-none select-none"
            style={{ color: tier.accent, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
          >
            <div
              className="font-black tracking-tighter"
              style={{
                fontSize: 56,
                fontFamily: '"Bebas Neue", "Oswald", Impact, sans-serif',
                letterSpacing: "-0.04em",
              }}
            >
              {ovr}
            </div>
            <div
              className="font-black mt-1 tracking-[0.25em]"
              style={{
                fontSize: 13,
                fontFamily: '"Bebas Neue", "Oswald", Impact, sans-serif',
              }}
            >
              {pos}
            </div>
            <div
              className="mt-1.5 h-px w-9"
              style={{ background: tier.accent, opacity: 0.6 }}
            />
            {/* "Bandeira" + escudo do clube */}
            <div className="flex items-center gap-1 mt-2">
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
              <div
                className="w-4 h-4 rounded-sm flex items-center justify-center text-[7px] font-black"
                style={{
                  background: `linear-gradient(135deg, ${tier.ringFrom}, ${tier.ringTo})`,
                  color: "#0a0a0a",
                }}
                title="JemTech Sports"
              >
                JT
              </div>
            </div>
          </div>

          {/* Avatar (busto sem fundo, integrado, ocupa quase toda a altura) */}
          <div
            className="absolute pointer-events-none overflow-visible"
            style={{
              top: -12,
              left: 40,
              right: 0,
              height: 290,
              WebkitMaskImage:
                "linear-gradient(180deg, #000 0%, #000 78%, transparent 100%)",
              maskImage:
                "linear-gradient(180deg, #000 0%, #000 78%, transparent 100%)",
            }}
          >
            {cleanAvatar ? (
              <img
                src={cleanAvatar}
                alt={displayName}
                crossOrigin="anonymous"
                className="w-full h-full object-contain object-bottom"
                style={{
                  filter:
                    "drop-shadow(0 10px 14px rgba(0,0,0,0.7)) drop-shadow(0 2px 3px rgba(0,0,0,0.5))",
                }}
              />
            ) : (
              <div className="w-full h-full flex items-end justify-center pb-4">
                <div
                  className="text-5xl font-black"
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

          {/* Nome — alto contraste com glow neon */}
          <div className="absolute left-0 right-0 px-4 text-center z-10" style={{ top: 244 }}>
            <div
              className="font-black uppercase truncate"
              style={{
                fontFamily: '"Bebas Neue", "Oswald", Impact, sans-serif',
                fontSize: 28,
                letterSpacing: "0.08em",
                color: "#ffffff",
                textShadow: `0 0 12px ${tier.accent}, 0 0 24px ${tier.accent}, 0 2px 4px rgba(0,0,0,0.9)`,
              }}
            >
              {displayName}
            </div>
            <div
              className="h-[2px] mx-6 mt-1 rounded-full"
              style={{
                background: `linear-gradient(90deg, transparent, ${tier.accent}, transparent)`,
                boxShadow: `0 0 8px ${tier.accent}`,
              }}
            />
          </div>

          {/* Atributos 3x2 — brancos com glow neon */}
          <div
            className="absolute left-0 right-0 px-8 grid grid-cols-2 gap-x-6 gap-y-1.5 z-10"
            style={{ top: 286 }}
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
            ).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between"
                style={{
                  fontFamily: '"Bebas Neue", "Oswald", Impact, sans-serif',
                  color: "#ffffff",
                  textShadow: `0 0 8px ${tier.accent}, 0 1px 3px rgba(0,0,0,0.9)`,
                }}
              >
                <span className="text-[20px] font-black tabular-nums leading-none">{v}</span>
                <span className="text-[12px] font-bold tracking-[0.22em] opacity-95 leading-none">
                  {k}
                </span>
              </div>
            ))}
          </div>

          {/* Selos craque/bagre */}
          {(craqueWins > 0 || bagreWins > 0) && (
            <div
              className="absolute left-0 right-0 flex justify-center gap-1.5 px-4"
              style={{ top: 358 }}
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
            className="absolute bottom-[18px] left-0 right-0 text-center text-[8px] font-black tracking-[0.4em]"
            style={{ color: tier.accent, opacity: 0.55 }}
          >
            JEMTECH · {tier.label}
          </div>
        </div>
      </div>

      {removing && (
        <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1.5">
          <Sparkles className="w-3 h-3 animate-pulse" />
          Recortando sua foto…
        </p>
      )}

      <div className="flex gap-2 justify-center">
        <Button onClick={handleShare} disabled={busy} size="sm" className="gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          Compartilhar card
        </Button>
        <Button
          onClick={handleShare}
          disabled={busy}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Baixar
        </Button>
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  displayName: string;
  avatarUrl: string | null;
  position: string; // ex: "meia"
  skillLevel?: string; // ex: "craque"
  partidas: number;
  gols: number;
  assistencias: number;
};

const POS_SHORT: Record<string, string> = {
  goleiro: "GOL",
  zagueiro: "ZAG",
  meia: "MEI",
  atacante: "ATA",
  linha: "LIN",
};

// OVR estilo FIFA: pondera gols e assists por partida + bônus por habilidade
function computeOverall(p: number, g: number, a: number, skill?: string) {
  const base = 60;
  const perMatch = p > 0 ? (g * 1.5 + a) / p : 0;
  const skillBonus =
    skill === "craque" ? 12 : skill === "bom_de_bola" ? 7 : skill === "casual" ? 3 : 0;
  const ovr = Math.min(99, Math.round(base + perMatch * 6 + skillBonus + Math.min(p, 20) * 0.4));
  return Math.max(50, ovr);
}

export function AthleteCard({
  displayName,
  avatarUrl,
  position,
  skillLevel,
  partidas,
  gols,
  assistencias,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const ovr = computeOverall(partidas, gols, assistencias, skillLevel);
  const pos = POS_SHORT[position?.toLowerCase()] ?? "JOG";

  // Tier visual (cor do card) baseado no OVR
  const tier =
    ovr >= 90
      ? { from: "from-yellow-300", via: "via-amber-400", to: "to-yellow-600", label: "ICON" }
      : ovr >= 80
      ? { from: "from-amber-200", via: "via-yellow-300", to: "to-amber-500", label: "OURO" }
      : ovr >= 70
      ? { from: "from-zinc-200", via: "via-zinc-300", to: "to-zinc-500", label: "PRATA" }
      : { from: "from-orange-300", via: "via-amber-600", to: "to-orange-800", label: "BRONZE" };

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

      // Tenta share nativo
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
        // Fallback: download
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

  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <div
          ref={ref}
          className={`relative w-[260px] aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br ${tier.from} ${tier.via} ${tier.to} shadow-2xl`}
          style={{
            boxShadow:
              "0 0 30px rgba(255,200,50,0.3), inset 0 0 20px rgba(255,255,255,0.1)",
          }}
        >
          {/* Padrão decorativo */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 2px, transparent 2px, transparent 8px)",
            }}
          />

          {/* OVR + Posição */}
          <div className="absolute top-4 left-4 text-zinc-900 leading-none">
            <div className="text-5xl font-black tracking-tight">{ovr}</div>
            <div className="text-sm font-bold mt-1 tracking-widest">{pos}</div>
            <div className="mt-2 h-px w-10 bg-zinc-900/50" />
            <div className="text-[9px] font-bold mt-1 tracking-widest opacity-70">{tier.label}</div>
          </div>

          {/* Avatar central */}
          <div className="absolute top-4 right-4 left-20 flex items-center justify-center">
            <Avatar className="h-28 w-28 ring-4 ring-zinc-900/20">
              <AvatarImage src={avatarUrl ?? undefined} crossOrigin="anonymous" />
              <AvatarFallback className="bg-zinc-900 text-2xl text-white">
                {initials || "??"}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Nome */}
          <div className="absolute left-0 right-0 top-[58%] text-center px-3">
            <div className="text-zinc-900 font-black text-lg uppercase tracking-wide truncate drop-shadow">
              {displayName}
            </div>
            <div className="h-px bg-zinc-900/40 mt-1 mx-6" />
          </div>

          {/* Stats grid */}
          <div className="absolute bottom-5 left-0 right-0 px-6 grid grid-cols-3 gap-1 text-center text-zinc-900">
            <Stat label="PJ" value={partidas} />
            <Stat label="GOL" value={gols} />
            <Stat label="AST" value={assistencias} />
          </div>

          {/* Selo da marca */}
          <div className="absolute bottom-1 right-2 text-[8px] font-black tracking-widest text-zinc-900/60">
            JEMTECH
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-center">
        <Button onClick={handleShare} disabled={busy} size="sm" className="gap-2">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xl font-black leading-none">{value}</div>
      <div className="text-[9px] font-bold tracking-widest opacity-70 mt-0.5">{label}</div>
    </div>
  );
}

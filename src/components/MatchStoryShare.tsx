import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Share2, Download, Sparkles } from "lucide-react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { shareOrDownloadImage, reportShareError } from "@/utils/shareImage";

type Player = { id: string; name: string };

type Props = {
  partidaId: string;
  rachaId: string;
  rachaName: string;
  scoreA: number;
  scoreB: number;
  teamA: Player[];
  teamB: Player[];
  mvpName?: string | null;
  inviteCode?: string | null;
};

export function MatchStoryShare({
  partidaId,
  rachaName,
  scoreA,
  scoreB,
  teamA,
  teamB,
  mvpName,
  inviteCode,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [craque, setCraque] = useState<{ name: string; votes: number } | null>(null);
  const [bagre, setBagre] = useState<{ name: string; votes: number } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteLink = inviteCode ? `${origin}/r/${inviteCode}` : null;

  useEffect(() => {
    if (!inviteLink) return;
    QRCode.toDataURL(inviteLink, { width: 180, margin: 1, color: { dark: "#000", light: "#fff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [inviteLink]);

  // Apura votos craque/bagre
  useEffect(() => {
    if (!partidaId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("partida_votos")
        .select("craque_target, bagre_target")
        .eq("partida_id", partidaId);
      if (!active || !data) return;
      const cTally: Record<string, number> = {};
      const bTally: Record<string, number> = {};
      const all = [...teamA, ...teamB];
      const nameOf = (id: string | null) =>
        all.find((p) => p.id === id)?.name ?? id ?? "—";
      for (const v of data) {
        if (v.craque_target) cTally[v.craque_target] = (cTally[v.craque_target] ?? 0) + 1;
        if (v.bagre_target) bTally[v.bagre_target] = (bTally[v.bagre_target] ?? 0) + 1;
      }
      const top = (t: Record<string, number>) => {
        const e = Object.entries(t).sort((a, b) => b[1] - a[1])[0];
        return e ? { name: nameOf(e[0]), votes: e[1] } : null;
      };
      setCraque(top(cTally));
      setBagre(top(bTally));
    })();
    return () => {
      active = false;
    };
  }, [partidaId, teamA, teamB]);

  const winner =
    scoreA > scoreB
      ? "Time A venceu! 🏆"
      : scoreB > scoreA
      ? "Time B venceu! 🏆"
      : "Empate épico! ⚖️";

  const handleShare = async (download = false) => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const result = await shareOrDownloadImage({
        node: ref.current,
        fileName: `racha-${rachaName || "story"}.png`,
        title: `Resultado: ${rachaName}`,
        text: `${scoreA} × ${scoreB} — JemTech Sports ⚽`,
        forceDownload: download,
      });
      if (result === "downloaded") {
        toast.success("Story baixado! Posta no Insta 🔥");
      }
    } catch (e) {
      reportShareError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl bg-graphite border border-neon/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-neon" />
        <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
          Story automático
        </h3>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-1">
        Gere a arte 9:16 do racha pra postar no Insta/WhatsApp 📱
      </p>

      {/* Preview escalada */}
      <div className="flex justify-center overflow-hidden">
        <div
          style={{
            transform: "scale(0.42)",
            transformOrigin: "top center",
            height: 460 * 1.778 * 0.42,
          }}
        >
          <div
            ref={ref}
            className="relative overflow-hidden"
            style={{
              width: 460,
              height: 460 * 1.778, // 9:16
              background:
                "radial-gradient(ellipse at top, #0d3a1f 0%, #000 60%), linear-gradient(180deg, #001a08 0%, #000 100%)",
              fontFamily: '"Bebas Neue", "Oswald", Impact, sans-serif',
              color: "white",
            }}
          >
            {/* Linhas de campo */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent 0 60px, rgba(255,255,255,0.05) 60px 120px)",
              }}
            />
            {/* Glow neon de fundo */}
            <div
              className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-40 blur-3xl pointer-events-none"
              style={{ background: "radial-gradient(circle, #25D366 0%, transparent 70%)" }}
            />

            {/* Header */}
            <div className="relative pt-10 px-8 text-center">
              <div className="text-[14px] tracking-[0.4em] text-neon font-black opacity-90">
                JEMTECH SPORTS
              </div>
              <div className="mt-1 text-[11px] tracking-widest text-white/60">
                {new Date().toLocaleDateString("pt-BR")}
              </div>
              <h2
                className="mt-6 text-[34px] leading-none font-black uppercase truncate"
                style={{ textShadow: "0 0 20px rgba(37,211,102,0.6)" }}
              >
                {rachaName}
              </h2>
            </div>

            {/* Placar gigante */}
            <div className="relative mt-12 px-6">
              <div className="flex items-center justify-center gap-6">
                <div className="text-center flex-1">
                  <div className="text-[16px] tracking-[0.3em] text-white/70 font-bold">
                    TIME A
                  </div>
                  <div
                    className="text-[140px] leading-none font-black text-neon"
                    style={{
                      textShadow: "0 0 30px rgba(37,211,102,0.8), 0 0 60px rgba(37,211,102,0.4)",
                      fontFeatureSettings: '"tnum"',
                    }}
                  >
                    {scoreA}
                  </div>
                </div>
                <div className="text-[60px] font-black text-white/40">×</div>
                <div className="text-center flex-1">
                  <div className="text-[16px] tracking-[0.3em] text-white/70 font-bold">
                    TIME B
                  </div>
                  <div
                    className="text-[140px] leading-none font-black"
                    style={{
                      color: "#60a5fa",
                      textShadow: "0 0 30px rgba(96,165,250,0.8)",
                      fontFeatureSettings: '"tnum"',
                    }}
                  >
                    {scoreB}
                  </div>
                </div>
              </div>
              <div className="text-center mt-4 text-[20px] font-black text-yellow-300 tracking-wider">
                {winner}
              </div>
            </div>

            {/* Destaques */}
            <div className="relative mt-10 mx-8 space-y-3">
              {craque && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-yellow-500/20 to-transparent border border-yellow-400/40">
                  <div className="text-[40px]">⭐</div>
                  <div className="flex-1">
                    <div className="text-[11px] tracking-[0.3em] text-yellow-300 font-bold">
                      CRAQUE DA PARTIDA
                    </div>
                    <div className="text-[26px] font-black text-white uppercase truncate">
                      {craque.name}
                    </div>
                  </div>
                  <div className="text-[20px] font-black text-yellow-300">
                    {craque.votes}
                    <span className="text-[12px] opacity-70"> votos</span>
                  </div>
                </div>
              )}
              {mvpName && !craque && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-yellow-500/20 to-transparent border border-yellow-400/40">
                  <div className="text-[40px]">🏆</div>
                  <div className="flex-1">
                    <div className="text-[11px] tracking-[0.3em] text-yellow-300 font-bold">
                      MVP
                    </div>
                    <div className="text-[26px] font-black text-white uppercase truncate">
                      {mvpName}
                    </div>
                  </div>
                </div>
              )}
              {bagre && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-orange-500/20 to-transparent border border-orange-400/40">
                  <div className="text-[40px]">🐟</div>
                  <div className="flex-1">
                    <div className="text-[11px] tracking-[0.3em] text-orange-300 font-bold">
                      BAGRE DA RODADA
                    </div>
                    <div className="text-[26px] font-black text-white uppercase truncate">
                      {bagre.name}
                    </div>
                  </div>
                  <div className="text-[20px] font-black text-orange-300">
                    {bagre.votes}
                  </div>
                </div>
              )}
            </div>

            {/* Footer / marca d'água + convite QR */}
            <div className="absolute bottom-8 left-0 right-0 px-8">
              {qrDataUrl && inviteCode ? (
                <div className="flex items-center gap-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-3">
                  <img
                    src={qrDataUrl}
                    alt="QR convite"
                    crossOrigin="anonymous"
                    style={{ width: 80, height: 80, borderRadius: 8 }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] tracking-[0.3em] text-neon font-black">
                      VEM JOGAR COMIGO
                    </div>
                    <div className="text-[20px] font-black text-white leading-none mt-1">
                      {inviteCode}
                    </div>
                    <div className="text-[9px] text-white/60 mt-1 truncate">
                      escaneie pra entrar no racha
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="text-center mt-3">
                <div className="text-[12px] tracking-[0.5em] text-neon font-black opacity-90">
                  JEMTECH SPORTS
                </div>
                <div className="text-[9px] tracking-[0.3em] text-white/50 mt-0.5">
                  gestão de rachas · @_jemersonlm
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-center">
        <Button onClick={() => handleShare(false)} disabled={busy} size="sm" className="gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          Compartilhar story
        </Button>
        <Button
          onClick={() => handleShare(true)}
          disabled={busy}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Baixar
        </Button>
      </div>
    </section>
  );
}

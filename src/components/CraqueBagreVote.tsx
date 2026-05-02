import { useEffect, useMemo, useState } from "react";
import { Trophy, ThumbsDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

type Player = { id: string; name: string; avatar_url?: string | null };

type Props = {
  partidaId: string;
  rachaId: string;
  players: Player[]; // todos os jogadores que participaram (A + B)
};

type Tally = { craque: Record<string, number>; bagre: Record<string, number>; totalVoters: number };

export function CraqueBagreVote({ partidaId, rachaId, players }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [craque, setCraque] = useState<string | null>(null);
  const [bagre, setBagre] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tally, setTally] = useState<Tally>({ craque: {}, bagre: {}, totalVoters: 0 });

  // Carrega se já votou + tally
  useEffect(() => {
    if (!user || !partidaId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: meu }, { data: todos }] = await Promise.all([
        supabase
          .from("partida_votos")
          .select("craque_target, bagre_target")
          .eq("partida_id", partidaId)
          .eq("voter_id", user.id)
          .maybeSingle(),
        supabase
          .from("partida_votos")
          .select("craque_target, bagre_target, voter_id")
          .eq("partida_id", partidaId),
      ]);
      if (!active) return;

      const craqueMap: Record<string, number> = {};
      const bagreMap: Record<string, number> = {};
      (todos ?? []).forEach((v) => {
        if (v.craque_target) craqueMap[v.craque_target] = (craqueMap[v.craque_target] ?? 0) + 1;
        if (v.bagre_target) bagreMap[v.bagre_target] = (bagreMap[v.bagre_target] ?? 0) + 1;
      });
      setTally({ craque: craqueMap, bagre: bagreMap, totalVoters: (todos ?? []).length });

      if (meu) {
        setCraque(meu.craque_target);
        setBagre(meu.bagre_target);
        setSubmitted(true);
      } else {
        // abre automaticamente se ainda não votou
        setOpen(true);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user, partidaId]);

  const eligible = useMemo(
    () => players.filter((p) => p.id && p.id !== user?.id),
    [players, user?.id],
  );

  const submit = async () => {
    if (!user) return;
    if (!craque && !bagre) {
      toast.error("Escolha pelo menos um voto");
      return;
    }
    const { error } = await supabase.from("partida_votos").upsert(
      {
        partida_id: partidaId,
        racha_id: rachaId,
        voter_id: user.id,
        craque_target: craque,
        bagre_target: bagre,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "partida_id,voter_id" },
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubmitted(true);
    setOpen(false);
    toast.success("Voto registrado! 🗳️");
  };

  // Vencedores
  const winnerCraque = useMemo(() => {
    const e = Object.entries(tally.craque).sort((a, b) => b[1] - a[1])[0];
    return e ? { id: e[0], votes: e[1] } : null;
  }, [tally.craque]);
  const winnerBagre = useMemo(() => {
    const e = Object.entries(tally.bagre).sort((a, b) => b[1] - a[1])[0];
    return e ? { id: e[0], votes: e[1] } : null;
  }, [tally.bagre]);

  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "Jogador";

  if (loading) return null;

  return (
    <>
      <section className="rounded-2xl bg-graphite border border-neon/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-neon flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Craque & Bagre
          </h3>
          {!submitted && (
            <button
              onClick={() => setOpen(true)}
              className="px-3 py-1.5 rounded-full bg-neon text-black text-xs font-black uppercase"
            >
              Votar
            </button>
          )}
          {submitted && (
            <span className="flex items-center gap-1 text-xs text-neon font-bold">
              <Check className="w-3.5 h-3.5" /> Voto registrado
            </span>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          {tally.totalVoters} {tally.totalVoters === 1 ? "voto" : "votos"} computados
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 p-3">
            <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">🏆 Craque</p>
            <p className="text-sm font-black text-foreground mt-1 truncate">
              {winnerCraque ? nameOf(winnerCraque.id) : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {winnerCraque ? `${winnerCraque.votes} voto(s)` : "Aguardando"}
            </p>
          </div>
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/40 p-3">
            <p className="text-[10px] uppercase tracking-widest text-rose-400 font-bold">🥶 Bagre</p>
            <p className="text-sm font-black text-foreground mt-1 truncate">
              {winnerBagre ? nameOf(winnerBagre.id) : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {winnerBagre ? `${winnerBagre.votes} voto(s)` : "Aguardando"}
            </p>
          </div>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-neon" /> Vote no Craque e no Bagre
            </DialogTitle>
            <DialogDescription>
              Escolha o melhor e o pior da rodada. Você não pode votar em si mesmo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
                🏆 Craque da partida
              </p>
              <div className="grid grid-cols-2 gap-2">
                {eligible.map((p) => (
                  <button
                    key={`c-${p.id}`}
                    onClick={() => setCraque(p.id)}
                    className={`p-2 rounded-lg border text-xs font-bold text-left truncate transition ${
                      craque === p.id
                        ? "bg-emerald-500 text-white border-emerald-400"
                        : "bg-secondary border-border hover:border-emerald-500/50"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-2 flex items-center gap-1">
                <ThumbsDown className="w-3.5 h-3.5" /> Bagre da partida
              </p>
              <div className="grid grid-cols-2 gap-2">
                {eligible.map((p) => (
                  <button
                    key={`b-${p.id}`}
                    onClick={() => setBagre(p.id)}
                    className={`p-2 rounded-lg border text-xs font-bold text-left truncate transition ${
                      bagre === p.id
                        ? "bg-rose-500 text-white border-rose-400"
                        : "bg-secondary border-border hover:border-rose-500/50"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={submit}
              className="w-full py-3 rounded-xl bg-neon text-black font-black uppercase tracking-widest text-sm shadow-neon active:scale-[0.98]"
            >
              Confirmar voto
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

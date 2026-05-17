import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, Trophy, History } from "lucide-react";

type Partida = {
  id: string;
  racha_id: string;
  score_a: number;
  score_b: number;
  team_a_ids: string[];
  team_b_ids: string[];
  mvp_user_id: string | null;
  mvp_nome: string | null;
  finalizada_em: string;
  rachas?: { name: string } | null;
};

export function PlayerMatchHistory({ userId }: { userId: string }) {
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("partidas_finalizadas")
        .select("*")
        .or(`team_a_ids.cs.{${userId}},team_b_ids.cs.{${userId}}`)
        .order("finalizada_em", { ascending: false })
        .limit(10);
      const rows = (data ?? []) as Omit<Partida, "rachas">[];
      const rachaIds = Array.from(new Set(rows.map((r) => r.racha_id)));
      let nameMap = new Map<string, string>();
      if (rachaIds.length) {
        const { data: rachas } = await supabase
          .from("rachas")
          .select("id, name")
          .in("id", rachaIds);
        nameMap = new Map((rachas ?? []).map((r) => [r.id, r.name]));
      }
      if (active) {
        setPartidas(rows.map((r) => ({ ...r, rachas: { name: nameMap.get(r.racha_id) ?? "Racha" } })));
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <Card className="p-4 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (partidas.length === 0) {
    return (
      <Card className="p-6 text-center">
        <History className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Nenhuma partida finalizada ainda
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-neon" />
        <p className="text-sm font-bold">Últimas partidas</p>
      </div>
      <div className="space-y-2">
        {partidas.map((p) => {
          const inA = p.team_a_ids.includes(userId);
          const myScore = inA ? p.score_a : p.score_b;
          const oppScore = inA ? p.score_b : p.score_a;
          const result =
            myScore > oppScore
              ? { label: "Vitória", color: "text-neon", bg: "bg-neon/10 border-neon/30" }
              : myScore < oppScore
              ? { label: "Derrota", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" }
              : { label: "Empate", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" };
          const isMvp = p.mvp_user_id === userId;
          return (
            <div
              key={p.id}
              className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${result.bg}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {p.rachas?.name ?? "Racha"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(p.finalizada_em).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "2-digit",
                  })}
                </p>
              </div>
              <div className="text-center">
                <p className="text-base font-black font-mono">
                  {myScore} <span className="text-muted-foreground">×</span> {oppScore}
                </p>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${result.color}`}>
                  {result.label}
                </p>
              </div>
              {isMvp && (
                <div className="flex flex-col items-center" title="MVP">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-[9px] font-bold text-yellow-400">MVP</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

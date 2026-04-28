import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { TrendingUp, Trophy, Medal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchAssiduidadeMes, type AssiduidadeRow } from "@/hooks/usePartida";
import { supabase } from "@/integrations/supabase/client";

export function AssiduidadeRanking() {
  const [rows, setRows] = useState<AssiduidadeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      // Garante que o "Fominha do Mês" do mês corrente seja concedido (idempotente)
      try {
        await supabase.rpc("premiar_fominha_mes");
      } catch {
        // silencioso — apenas exibir ranking se a função falhar
      }
      const data = await fetchAssiduidadeMes();
      if (active) {
        setRows(data);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading || rows.length === 0) return null;

  const max = Math.max(...rows.map((r) => r.participacoes), 1);
  const mesAtual = new Date().toLocaleString("pt-BR", { month: "long" });

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-neon" />
        <h3 className="text-sm font-bold capitalize">Top assiduidade · {mesAtual}</h3>
      </div>
      <div className="space-y-2">
        {rows.slice(0, 10).map((r, idx) => {
          const pct = (r.participacoes / max) * 100;
          const medal =
            idx === 0
              ? "text-yellow-400"
              : idx === 1
                ? "text-slate-300"
                : idx === 2
                  ? "text-amber-700"
                  : "text-muted-foreground";
          return (
            <Link
              key={r.user_id}
              to="/atleta/$userId"
              params={{ userId: r.user_id }}
              className="block hover:bg-muted/30 rounded-lg p-1.5 -m-1.5 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-5">
                  {idx < 3 ? (
                    <Medal className={`w-4 h-4 ${medal}`} />
                  ) : (
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {idx + 1}
                    </span>
                  )}
                </div>
                <Avatar className="h-7 w-7">
                  <AvatarImage src={r.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {r.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold truncate">
                      {r.display_name}
                    </span>
                    <span className="text-[11px] font-bold tabular-nums shrink-0">
                      {r.participacoes}{" "}
                      <span className="text-muted-foreground font-normal">
                        racha{r.participacoes > 1 ? "s" : ""}
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-neon to-emerald-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                {idx === 0 && <Trophy className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { TrendingUp } from "lucide-react";

type Point = {
  label: string;
  vitorias: number;
  gols: number;
};

export function PlayerEvolutionChart({ userId }: { userId: string | null }) {
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: partidas } = await supabase
        .from("partidas_finalizadas")
        .select("*")
        .or(`team_a_ids.cs.{${userId}},team_b_ids.cs.{${userId}}`)
        .order("finalizada_em", { ascending: true })
        .limit(15);

      const { data: gols } = await supabase
        .from("gols_jogador")
        .select("racha_id, gols")
        .eq("user_id", userId);

      const golsPorRacha = new Map<string, number>();
      (gols ?? []).forEach((g) => {
        golsPorRacha.set(g.racha_id, (golsPorRacha.get(g.racha_id) ?? 0) + g.gols);
      });

      let vAcum = 0;
      const points: Point[] = (partidas ?? []).map((p, i) => {
        const venceu =
          (p.vencedor === "A" && p.team_a_ids.includes(userId)) ||
          (p.vencedor === "B" && p.team_b_ids.includes(userId));
        if (venceu) vAcum++;
        return {
          label: `P${i + 1}`,
          vitorias: vAcum,
          gols: golsPorRacha.get(p.racha_id) ?? 0,
        };
      });
      setData(points);
      setLoading(false);
    })();
  }, [userId]);

  if (loading || data.length < 2) return null;

  return (
    <section className="px-4 py-4 border-y border-border/40">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
          Evolução
        </h3>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line type="monotone" dataKey="vitorias" stroke="#10b981" strokeWidth={2} name="Vitórias" />
            <Line type="monotone" dataKey="gols" stroke="#f59e0b" strokeWidth={2} name="Gols" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

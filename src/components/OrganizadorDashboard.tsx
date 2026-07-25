import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { DollarSign, Users, AlertTriangle, Calendar, type LucideIcon } from "lucide-react";

export function OrganizadorDashboard({ organizadorId }: { organizadorId: string }) {
  const [stats, setStats] = useState({
    receita30d: 0,
    pagamentos30d: 0,
    devedores: 0,
    rachas30d: 0,
  });
  const [serie, setSerie] = useState<{ dia: string; valor: number }[]>([]);
  const [topJogadores, setTopJogadores] = useState<{ nome: string; n: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizadorId) return;
    (async () => {
      const desde = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

      const [pgRes, devRes, rachasRes] = await Promise.all([
        supabase
          .from("pagamentos")
          .select("valor_organizador, paid_at, created_at, status")
          .eq("organizador_id", organizadorId)
          .eq("status", "aprovado")
          .gte("created_at", desde),
        supabase
          .from("devedores")
          .select("id")
          .eq("organizador_id", organizadorId)
          .eq("status", "devendo"),
        supabase
          .from("rachas")
          .select("id, name, created_at")
          .eq("admin_id", organizadorId)
          .gte("created_at", desde),
      ]);

      const pgs = pgRes.data ?? [];
      const receita = pgs.reduce((a, p) => a + Number(p.valor_organizador || 0), 0);

      // série diária 30d
      const buckets = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 3600 * 1000);
        const k = `${d.getDate()}/${d.getMonth() + 1}`;
        buckets.set(k, 0);
      }
      pgs.forEach((p) => {
        const d = new Date(p.paid_at ?? p.created_at);
        const k = `${d.getDate()}/${d.getMonth() + 1}`;
        if (buckets.has(k)) buckets.set(k, buckets.get(k)! + Number(p.valor_organizador || 0));
      });
      setSerie(Array.from(buckets, ([dia, valor]) => ({ dia, valor })));

      // top jogadores assíduos
      const rachaIds = (rachasRes.data ?? []).map((r) => r.id);
      if (rachaIds.length) {
        const { data: inscs } = await supabase
          .from("inscricoes")
          .select("user_id")
          .in("racha_id", rachaIds);
        const counts = new Map<string, number>();
        (inscs ?? []).forEach((i) => counts.set(i.user_id, (counts.get(i.user_id) ?? 0) + 1));
        const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (top.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", top.map(([uid]) => uid));
          const nameMap = new Map((profs ?? []).map((p) => [p.user_id, p.display_name]));
          setTopJogadores(top.map(([uid, n]) => ({ nome: nameMap.get(uid) ?? "Jogador", n })));
        }
      }

      setStats({
        receita30d: receita,
        pagamentos30d: pgs.length,
        devedores: devRes.data?.length ?? 0,
        rachas30d: rachasRes.data?.length ?? 0,
      });
      setLoading(false);
    })();
  }, [organizadorId]);

  if (loading) return <p className="text-sm text-muted-foreground p-4">Carregando dashboard...</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={DollarSign} label="Receita 30d" value={`R$ ${stats.receita30d.toFixed(2)}`} color="text-green-500" />
        <StatCard icon={Calendar} label="Rachas 30d" value={String(stats.rachas30d)} color="text-blue-500" />
        <StatCard icon={Users} label="Pagamentos" value={String(stats.pagamentos30d)} color="text-purple-500" />
        <StatCard icon={AlertTriangle} label="Devedores" value={String(stats.devedores)} color="text-red-500" />
      </div>

      <Card className="p-3">
        <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">Receita diária (30d)</p>
        <div className="h-40">
          <ResponsiveContainer>
            <BarChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={9} interval={4} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={9} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => `R$ ${v.toFixed(2)}`}
              />
              <Bar dataKey="valor" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {topJogadores.length > 0 && (
        <Card className="p-3">
          <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3">
            Jogadores mais assíduos
          </p>
          <ul className="space-y-2">
            {topJogadores.map((j, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-medium">{j.nome}</span>
                <span className="text-xs text-muted-foreground">{j.n} inscrições</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </Card>
  );
}

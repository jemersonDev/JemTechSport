import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Profile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  skill_level: string | null;
  preferred_position: string | null;
};

type PlayerMarket = {
  user_id: string;
  name: string;
  avatar: string | null;
  position: string;
  partidas: number;
  gols: number;
  assists: number;
  craques: number;
  bagres: number;
  valor: number;
  trend: number; // +/- vs valor base
  skill: string;
};

const SKILL_BONUS: Record<string, number> = {
  craque: 800_000,
  bom_de_bola: 400_000,
  casual: 100_000,
  iniciante: 0,
};

function formatBRL(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function calcValor(p: Omit<PlayerMarket, "valor" | "trend" | "name" | "avatar" | "position">) {
  const base = 500_000;
  const skill = SKILL_BONUS[p.skill] ?? 0;
  const gols = p.gols * 80_000;
  const assists = p.assists * 50_000;
  const jogos = Math.min(p.partidas, 50) * 15_000;
  const craque = p.craques * 200_000;
  const bagre = p.bagres * 80_000;
  return Math.max(50_000, base + skill + gols + assists + jogos + craque - bagre);
}

export const Route = createFileRoute("/mercado")({
  component: MercadoPage,
});

function MercadoPage() {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<PlayerMarket[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);

      // Pega perfis + agrega stats em paralelo
      const [{ data: profiles }, { data: gols }, { data: trofeus }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, skill_level, preferred_position")
          .limit(500),
        supabase.from("gols_jogador").select("user_id, gols, assistencias, racha_id"),
        supabase.from("trofeus").select("user_id, tipo"),
      ]);

      if (!active || !profiles) return;

      const stats = new Map<
        string,
        { gols: number; assists: number; rachas: Set<string> }
      >();
      for (const g of gols ?? []) {
        const s = stats.get(g.user_id) ?? { gols: 0, assists: 0, rachas: new Set() };
        s.gols += g.gols ?? 0;
        s.assists += g.assistencias ?? 0;
        if (g.racha_id) s.rachas.add(g.racha_id);
        stats.set(g.user_id, s);
      }

      const trof = new Map<string, { craques: number; bagres: number }>();
      for (const t of trofeus ?? []) {
        const c = trof.get(t.user_id) ?? { craques: 0, bagres: 0 };
        if (t.tipo === "craque_mes" || t.tipo === "mvp") c.craques += 1;
        if (t.tipo === "bagre_mes") c.bagres += 1;
        trof.set(t.user_id, c);
      }

      const list: PlayerMarket[] = (profiles as Profile[]).map((p) => {
        const s = stats.get(p.user_id) ?? { gols: 0, assists: 0, rachas: new Set() };
        const t = trof.get(p.user_id) ?? { craques: 0, bagres: 0 };
        const partial = {
          user_id: p.user_id,
          partidas: s.rachas.size,
          gols: s.gols,
          assists: s.assists,
          craques: t.craques,
          bagres: t.bagres,
          skill: p.skill_level ?? "casual",
        };
        const valor = calcValor(partial);
        const base = 500_000 + (SKILL_BONUS[partial.skill] ?? 0);
        return {
          ...partial,
          name: p.display_name,
          avatar: p.avatar_url,
          position: p.preferred_position ?? "linha",
          valor,
          trend: valor - base,
        };
      });

      list.sort((a, b) => b.valor - a.valor);
      setPlayers(list);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const totalMercado = players.reduce((s, p) => s + p.valor, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/perfil"
            className="p-2 -ml-2 rounded-full hover:bg-muted"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-neon" />
              Mercado de Jogadores
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Valor calculado por performance · {players.length} atletas
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Hero stats */}
        <div className="rounded-2xl bg-gradient-to-br from-neon/20 via-graphite to-graphite border border-neon/30 p-5 animate-fade-in">
          <div className="text-[10px] tracking-[0.3em] text-muted-foreground font-bold">
            VALOR TOTAL DO MERCADO
          </div>
          <div className="text-4xl font-black text-neon mt-1 text-glow tabular-nums">
            {formatBRL(totalMercado)}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Como funciona: cada gol vale R$80k, assistência R$50k, jogo disputado
            R$15k, craque do mês +R$200k, bagre -R$80k. Skill base: craque +R$800k.
          </div>
        </div>

        {loading && (
          <div className="text-center text-muted-foreground py-12 text-sm">
            Carregando mercado...
          </div>
        )}

        {/* Top 3 pódio */}
        {!loading && players.length >= 3 && (
          <div className="grid grid-cols-3 gap-2 animate-fade-in">
            {[players[1], players[0], players[2]].map((p, i) => {
              const pos = i === 1 ? 1 : i === 0 ? 2 : 3;
              const colors = {
                1: "from-yellow-400 to-amber-600 ring-yellow-400",
                2: "from-slate-300 to-slate-500 ring-slate-300",
                3: "from-orange-400 to-orange-700 ring-orange-400",
              }[pos];
              const heights = { 1: "h-32", 2: "h-24", 3: "h-20" }[pos];
              return (
                <div key={p.user_id} className="flex flex-col items-center justify-end">
                  <div className="text-center mb-2">
                    <Avatar className={`w-14 h-14 mx-auto ring-2 ${colors.split(" ").pop()}`}>
                      <AvatarImage src={p.avatar ?? undefined} />
                      <AvatarFallback>{p.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-[11px] font-bold mt-1 truncate max-w-[90px] mx-auto">
                      {p.name}
                    </div>
                    <div className="text-[10px] font-black text-neon">
                      {formatBRL(p.valor)}
                    </div>
                  </div>
                  <div
                    className={`w-full ${heights} rounded-t-xl bg-gradient-to-b ${colors} flex items-start justify-center pt-2`}
                  >
                    {pos === 1 ? (
                      <Crown className="w-6 h-6 text-white drop-shadow" />
                    ) : (
                      <span className="text-white font-black text-xl drop-shadow">
                        {pos}º
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Lista completa */}
        <div className="space-y-2">
          <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground px-1">
            Ranking completo
          </h2>
          {players.map((p, i) => (
            <Link
              key={p.user_id}
              to="/atleta/$userId"
              params={{ userId: p.user_id }}
              className="flex items-center gap-3 p-3 rounded-xl bg-graphite border border-border hover:border-neon/40 transition-all hover-scale animate-fade-in"
              style={{ animationDelay: `${Math.min(i * 30, 600)}ms` }}
            >
              <div className="text-sm font-black text-muted-foreground w-6 text-center tabular-nums">
                {i + 1}
              </div>
              <Avatar className="w-10 h-10">
                <AvatarImage src={p.avatar ?? undefined} />
                <AvatarFallback>{p.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{p.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {p.gols}G · {p.assists}A · {p.partidas} jogos
                  {p.craques > 0 && <span className="text-yellow-400"> · ⭐{p.craques}</span>}
                  {p.bagres > 0 && <span className="text-orange-400"> · 🐟{p.bagres}</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-neon tabular-nums">
                  {formatBRL(p.valor)}
                </div>
                <div
                  className={`text-[10px] flex items-center justify-end gap-0.5 font-bold ${
                    p.trend >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {p.trend >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {formatBRL(Math.abs(p.trend))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

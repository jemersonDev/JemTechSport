import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Goal, Star, Trophy, Loader2, ArrowLeft, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ranking")({
  component: ClassificacaoPage,
  head: () => ({
    meta: [
      { title: "Classificação — JemTech Sports" },
      { name: "description", content: "Ranking mensal de assiduidade, goleadores e MVPs." },
    ],
  }),
});

type Tab = "assiduidade" | "goleadores" | "mvps";

type Row = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  pts: number;
  jogos: number;
  mvps: number;
};

const TABS: { key: Tab; label: string; icon: typeof Calendar }[] = [
  { key: "assiduidade", label: "Assiduidade", icon: Calendar },
  { key: "goleadores", label: "Goleadores", icon: Goal },
  { key: "mvps", label: "MVPs", icon: Star },
];

function ClassificacaoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("assiduidade");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const data = await fetchRanking(tab);
      if (active) {
        setRows(data);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [tab]);

  const mesAno = useMemo(() => {
    const d = new Date();
    const mes = d.toLocaleString("pt-BR", { month: "long" });
    return `Mês de ${mes.charAt(0).toUpperCase() + mes.slice(1)} ${d.getFullYear()}`;
  }, []);

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="min-h-screen bg-[#1a1a2a] pb-24 text-white">
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link to="/" aria-label="Voltar" className="rounded-full p-1.5 hover:bg-white/5">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold leading-tight">Classificação</h1>
          <p className="text-xs text-white/60">{mesAno}</p>
        </div>
        <Trophy className="h-6 w-6 text-[#22c55e]" />
      </header>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2 px-4 pt-3">
        {TABS.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all",
                active
                  ? "bg-[#22c55e] text-black shadow-[0_0_18px_rgba(34,197,94,0.55)] ring-1 ring-[#22c55e]"
                  : "bg-[#2a2a3a] text-white/70 hover:bg-[#33334a]",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2a2a3a]">
            <Trophy className="h-8 w-8 text-white/40" />
          </div>
          <p className="text-sm text-white/60">Sem dados pra esse ranking ainda.</p>
        </div>
      ) : (
        <>
          {/* Pódio */}
          <Podium top3={top3} tab={tab} />

          {/* Lista */}
          <div className="mx-4 mt-6 overflow-hidden rounded-2xl bg-[#2a2a3a]">
            {rows.map((r, idx) => {
              const isMe = user?.id === r.user_id;
              return (
                <button
                  key={r.user_id}
                  onClick={() => navigate({ to: "/atleta/$userId", params: { userId: r.user_id } })}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    idx > 0 && "border-t border-white/5",
                    isMe ? "bg-[#22c55e]/15" : "hover:bg-white/5",
                  )}
                >
                  <span className="flex w-7 shrink-0 items-center justify-center">
                    {idx < 3 ? (
                      <Medal
                        className={cn(
                          "h-5 w-5",
                          idx === 0 && "text-yellow-400",
                          idx === 1 && "text-slate-300",
                          idx === 2 && "text-amber-600",
                        )}
                      />
                    ) : (
                      <span className="text-xs font-bold text-white/50">#{idx + 1}</span>
                    )}
                  </span>
                  <Avatar name={r.display_name} url={r.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm font-bold",
                        isMe ? "text-[#22c55e]" : "text-white",
                      )}
                    >
                      {r.display_name}
                      {isMe && <span className="ml-1 text-[10px] font-semibold text-[#22c55e]/80">(você)</span>}
                    </p>
                    <p className="truncate text-[11px] text-white/50">
                      {r.jogos} jogo{r.jogos === 1 ? "" : "s"} · {r.mvps} MVP{r.mvps === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-extrabold tabular-nums text-white">
                    {r.pts}
                    <span className="ml-0.5 text-[10px] font-semibold text-white/50">pts</span>
                  </span>
                </button>
              );
            })}
          </div>

          {rest.length === 0 && top3.length > 0 && (
            <p className="mt-6 px-4 text-center text-xs text-white/40">
              Só temos {top3.length} no pódio por enquanto.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#22c55e]/20 ring-1 ring-[#22c55e]/40">
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#22c55e]">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function Podium({ top3, tab }: { top3: Row[]; tab: Tab }) {
  if (top3.length === 0) return null;
  const [first, second, third] = top3;
  const blocks: { row: Row | undefined; place: 1 | 2 | 3 }[] = [
    { row: second, place: 2 },
    { row: first, place: 1 },
    { row: third, place: 3 },
  ];

  return (
    <div className="mt-6 grid grid-cols-3 items-end gap-2 px-4">
      {blocks.map(({ row, place }) => {
        if (!row) return <div key={place} />;
        const isFirst = place === 1;
        const height = isFirst ? "h-32" : place === 2 ? "h-24" : "h-20";
        const bg =
          place === 1
            ? "bg-gradient-to-b from-[#22c55e] to-[#15803d]"
            : place === 2
              ? "bg-gradient-to-b from-[#3a3a4a] to-[#2a2a3a]"
              : "bg-gradient-to-b from-[#a16207] to-[#78350f]";
        const ptsColor =
          place === 1 ? "text-white" : place === 2 ? "text-white" : "text-orange-200";
        const nameColor =
          place === 1 ? "text-[#22c55e]" : place === 2 ? "text-slate-300" : "text-amber-500";
        const medalColor =
          place === 1
            ? "text-yellow-300"
            : place === 2
              ? "text-slate-300"
              : "text-amber-600";

        return (
          <div key={place} className="flex flex-col items-center gap-1.5">
            <Avatar name={row.display_name} url={row.avatar_url} />
            <p className={cn("max-w-full truncate text-[11px] font-bold", nameColor)}>
              {row.display_name}
            </p>
            <div
              className={cn(
                "flex w-full flex-col items-center justify-center rounded-xl px-2 shadow-lg",
                height,
                bg,
                isFirst && "shadow-[0_0_24px_rgba(34,197,94,0.45)]",
              )}
            >
              <Medal className={cn("h-4 w-4", medalColor)} />
              <span className={cn("text-2xl font-extrabold leading-none", ptsColor)}>
                {row.pts}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-white/70">
                {tabUnit(tab)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function tabUnit(tab: Tab) {
  if (tab === "goleadores") return "gols";
  if (tab === "mvps") return "mvps";
  return "pts";
}

// ============= Data fetching =============

async function fetchRanking(tab: Tab): Promise<Row[]> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const startIso = start.toISOString();

  // Coleta: jogos do mês + mvps do mês (sempre, p/ subtítulo)
  const { data: partidas } = await supabase
    .from("partidas_finalizadas")
    .select("team_a_ids, team_b_ids, mvp_user_id, finalizada_em")
    .gte("finalizada_em", startIso);

  const jogosMap = new Map<string, number>();
  const mvpsMap = new Map<string, number>();
  (partidas ?? []).forEach((p) => {
    const ids = [...(p.team_a_ids ?? []), ...(p.team_b_ids ?? [])];
    ids.forEach((id) => jogosMap.set(id, (jogosMap.get(id) ?? 0) + 1));
    if (p.mvp_user_id) mvpsMap.set(p.mvp_user_id, (mvpsMap.get(p.mvp_user_id) ?? 0) + 1);
  });

  // Métrica principal por aba
  const ptsMap = new Map<string, number>();

  if (tab === "assiduidade") {
    const { data: ins } = await supabase
      .from("inscricoes")
      .select("user_id, created_at")
      .gte("created_at", startIso);
    (ins ?? []).forEach((i) => ptsMap.set(i.user_id, (ptsMap.get(i.user_id) ?? 0) + 1));
  } else if (tab === "goleadores") {
    const { data: gols } = await supabase
      .from("gols_jogador")
      .select("user_id, gols, created_at")
      .gte("created_at", startIso);
    (gols ?? []).forEach((g) => {
      ptsMap.set(g.user_id, (ptsMap.get(g.user_id) ?? 0) + (g.gols ?? 0));
    });
  } else {
    mvpsMap.forEach((v, k) => ptsMap.set(k, v));
  }

  const ids = Array.from(ptsMap.keys()).filter((id) => (ptsMap.get(id) ?? 0) > 0);
  if (ids.length === 0) return [];

  const { data: profs } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .in("user_id", ids);

  const profMap = new Map(
    (profs ?? []).map((p) => [p.user_id, p as { user_id: string; display_name: string; avatar_url: string | null }]),
  );

  const rows: Row[] = ids.map((id) => {
    const p = profMap.get(id);
    return {
      user_id: id,
      display_name: p?.display_name ?? "Jogador",
      avatar_url: p?.avatar_url ?? null,
      pts: ptsMap.get(id) ?? 0,
      jogos: jogosMap.get(id) ?? 0,
      mvps: mvpsMap.get(id) ?? 0,
    };
  });

  rows.sort((a, b) => b.pts - a.pts);
  return rows.slice(0, 50);
}

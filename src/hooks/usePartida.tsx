import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type Trofeu = {
  id: string;
  user_id: string;
  tipo: "mvp" | "fominha_mes" | "vitoria" | "craque_mes";
  racha_id: string | null;
  partida_id: string | null;
  titulo: string;
  descricao: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PartidaFinalizada = {
  id: string;
  racha_id: string;
  score_a: number;
  score_b: number;
  team_a_ids: string[];
  team_b_ids: string[];
  vencedor: "A" | "B" | "empate" | null;
  mvp_user_id: string | null;
  mvp_nome: string | null;
  mvp_gols: number;
  mvp_assistencias: number;
  finalizada_em: string;
  created_by: string;
};

export type Devedor = {
  id: string;
  user_id: string;
  organizador_id: string;
  racha_id: string | null;
  motivo: string | null;
  valor: number;
  status: "devendo" | "pago";
  created_at: string;
  updated_at: string;
};

/* ============== Placar em tempo real ============== */
export function useLivePlacar(rachaId: string | null) {
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [matchStarted, setMatchStarted] = useState(false);

  // Carregar do servidor + assinar realtime
  useEffect(() => {
    if (!rachaId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("rachas")
        .select("score_a, score_b, match_started")
        .eq("id", rachaId)
        .maybeSingle();
      if (!active || !data) return;
      setScoreA(data.score_a ?? 0);
      setScoreB(data.score_b ?? 0);
      setMatchStarted(!!data.match_started);
    })();

    const ch = supabase
      .channel(`placar-${rachaId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rachas", filter: `id=eq.${rachaId}` },
        (payload) => {
          const r = payload.new as { score_a: number; score_b: number; match_started: boolean };
          setScoreA(r.score_a ?? 0);
          setScoreB(r.score_b ?? 0);
          setMatchStarted(!!r.match_started);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [rachaId]);

  const updateScore = useCallback(
    async (a: number, b: number, started?: boolean) => {
      if (!rachaId) return;
      const newA = Math.max(0, a);
      const newB = Math.max(0, b);
      // otimista
      setScoreA(newA);
      setScoreB(newB);
      if (typeof started === "boolean") setMatchStarted(started);
      const patch: { score_a: number; score_b: number; match_started?: boolean } = {
        score_a: newA,
        score_b: newB,
      };
      if (typeof started === "boolean") patch.match_started = started;
      await supabase.from("rachas").update(patch).eq("id", rachaId);
    },
    [rachaId],
  );

  return {
    scoreA,
    scoreB,
    matchStarted,
    incA: () => updateScore(scoreA + 1, scoreB, true),
    decA: () => updateScore(scoreA - 1, scoreB),
    incB: () => updateScore(scoreA, scoreB + 1, true),
    decB: () => updateScore(scoreA, scoreB - 1),
    resetScore: () => updateScore(0, 0, false),
    startMatch: () => updateScore(scoreA, scoreB, true),
  };
}

/* ============== Troféus do jogador ============== */
export function useTrofeusUsuario(userId: string | null) {
  const [trofeus, setTrofeus] = useState<Trofeu[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) {
      setTrofeus([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("trofeus")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setTrofeus((data as Trofeu[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { trofeus, loading, reload };
}

/* ============== Devedores do organizador ============== */
export function useDevedoresOrganizador(organizadorId: string | null) {
  const [devedores, setDevedores] = useState<Devedor[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!organizadorId) {
      setDevedores([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("devedores")
      .select("*")
      .eq("organizador_id", organizadorId)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });
    setDevedores((data as Devedor[]) ?? []);
    setLoading(false);
  }, [organizadorId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const marcarDevedor = useCallback(
    async (input: { user_id: string; racha_id?: string | null; motivo?: string; valor?: number }) => {
      if (!organizadorId) return { error: "Não autorizado" };
      const { error } = await supabase.from("devedores").upsert(
        {
          user_id: input.user_id,
          organizador_id: organizadorId,
          racha_id: input.racha_id ?? null,
          motivo: input.motivo ?? null,
          valor: input.valor ?? 0,
          status: "devendo",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,organizador_id" },
      );
      if (error) return { error: error.message };
      await reload();
      return { error: null };
    },
    [organizadorId, reload],
  );

  const quitarDivida = useCallback(
    async (devedorId: string) => {
      const { error } = await supabase
        .from("devedores")
        .update({ status: "pago", updated_at: new Date().toISOString() })
        .eq("id", devedorId);
      if (error) return { error: error.message };
      await reload();
      return { error: null };
    },
    [reload],
  );

  const removerMarcacao = useCallback(
    async (devedorId: string) => {
      const { error } = await supabase.from("devedores").delete().eq("id", devedorId);
      if (error) return { error: error.message };
      await reload();
      return { error: null };
    },
    [reload],
  );

  return { devedores, loading, reload, marcarDevedor, quitarDivida, removerMarcacao };
}

/* ============== Eu sou devedor de quem? ============== */
export function useMinhasDividas() {
  const { user } = useAuth();
  const [dividas, setDividas] = useState<Devedor[]>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("devedores")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "devendo");
      if (active) setDividas((data as Devedor[]) ?? []);
    })();

    const ch = supabase
      .channel(`minhas-dividas-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "devedores", filter: `user_id=eq.${user.id}` },
        async () => {
          const { data } = await supabase
            .from("devedores")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "devendo");
          if (active) setDividas((data as Devedor[]) ?? []);
        },
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [user]);

  return { dividas, totalDevendo: dividas.length };
}

/* ============== Finalizar racha (MVP automático + troféus) ============== */
export async function finalizarRacha(input: {
  rachaId: string;
  scoreA: number;
  scoreB: number;
  teamAIds: string[];
  teamBIds: string[];
  createdBy: string;
}) {
  const { rachaId, scoreA, scoreB, teamAIds, teamBIds, createdBy } = input;

  // Calcular MVP automaticamente: maior gols+assistencias entre todos do racha
  const { data: stats } = await supabase
    .from("gols_jogador")
    .select("user_id, gols, assistencias")
    .eq("racha_id", rachaId);

  const arr = (stats ?? []) as { user_id: string; gols: number; assistencias: number }[];
  let mvpUser: string | null = null;
  let mvpGols = 0;
  let mvpAss = 0;
  let mvpScore = 0;
  for (const s of arr) {
    const sc = (s.gols ?? 0) * 2 + (s.assistencias ?? 0);
    if (sc > mvpScore) {
      mvpScore = sc;
      mvpUser = s.user_id;
      mvpGols = s.gols ?? 0;
      mvpAss = s.assistencias ?? 0;
    }
  }

  // Buscar nome do MVP
  let mvpNome: string | null = null;
  if (mvpUser) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", mvpUser)
      .maybeSingle();
    mvpNome = prof?.display_name ?? null;
  }

  const vencedor: "A" | "B" | "empate" =
    scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "empate";

  // Criar registro de partida finalizada
  const { data: partida, error: errPart } = await supabase
    .from("partidas_finalizadas")
    .insert({
      racha_id: rachaId,
      score_a: scoreA,
      score_b: scoreB,
      team_a_ids: teamAIds,
      team_b_ids: teamBIds,
      vencedor,
      mvp_user_id: mvpUser,
      mvp_nome: mvpNome,
      mvp_gols: mvpGols,
      mvp_assistencias: mvpAss,
      created_by: createdBy,
    })
    .select("*")
    .single();

  if (errPart || !partida) {
    return { error: errPart?.message ?? "Erro ao finalizar partida" };
  }

  const trofeusToInsert: Array<{
    user_id: string;
    tipo: "mvp" | "vitoria";
    racha_id: string;
    partida_id: string;
    titulo: string;
    descricao: string | null;
    metadata: Record<string, unknown>;
  }> = [];

  // Troféu MVP
  if (mvpUser && mvpScore > 0) {
    trofeusToInsert.push({
      user_id: mvpUser,
      tipo: "mvp",
      racha_id: rachaId,
      partida_id: partida.id,
      titulo: "MVP da partida",
      descricao: `${mvpGols} gol(s) e ${mvpAss} assistência(s)`,
      metadata: { gols: mvpGols, assistencias: mvpAss },
    });
  }

  // Troféu de vitória pra todos do time vencedor (UUIDs apenas — manuais ficam de fora)
  const winners =
    vencedor === "A" ? teamAIds : vencedor === "B" ? teamBIds : [];
  const uuidWinners = winners.filter((id) => /^[0-9a-f-]{36}$/.test(id));

  for (const uid of uuidWinners) {
    trofeusToInsert.push({
      user_id: uid,
      tipo: "vitoria",
      racha_id: rachaId,
      partida_id: partida.id,
      titulo: "Vitória",
      descricao: `${scoreA} x ${scoreB}`,
      metadata: { score_a: scoreA, score_b: scoreB },
    });
  }

  if (trofeusToInsert.length > 0) {
    await supabase.from("trofeus").insert(trofeusToInsert);
  }

  // Nível dinâmico automático: MVP sobe nível, derrotado feio cai
  if (mvpUser) {
    await ajustarNivelJogador(mvpUser, "subir");
  }

  // Marcar racha como finalizado
  await supabase
    .from("rachas")
    .update({
      finalizado_em: new Date().toISOString(),
      match_started: false,
    })
    .eq("id", rachaId);

  return { error: null, partida, mvpNome, vencedor };
}

const NIVEIS_ORDEM = ["iniciante", "casual", "bom_de_bola", "craque"] as const;
type NivelTipo = (typeof NIVEIS_ORDEM)[number];

async function ajustarNivelJogador(userId: string, direcao: "subir" | "descer") {
  const { data } = await supabase
    .from("profiles")
    .select("skill_level")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return;
  const cur = (data.skill_level as NivelTipo) ?? "casual";
  const idx = NIVEIS_ORDEM.indexOf(cur);
  if (idx < 0) return;
  const nextIdx =
    direcao === "subir"
      ? Math.min(NIVEIS_ORDEM.length - 1, idx + 1)
      : Math.max(0, idx - 1);
  if (nextIdx === idx) return;
  await supabase
    .from("profiles")
    .update({ skill_level: NIVEIS_ORDEM[nextIdx] })
    .eq("user_id", userId);
}

/* ============== Ranking de assiduidade do mês ============== */
export type AssiduidadeRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  participacoes: number;
};

export async function fetchAssiduidadeMes(): Promise<AssiduidadeRow[]> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  // contar inscricoes do mês por user
  const { data: ins } = await supabase
    .from("inscricoes")
    .select("user_id, created_at")
    .gte("created_at", start.toISOString());

  const counts = new Map<string, number>();
  (ins ?? []).forEach((i) => {
    counts.set(i.user_id, (counts.get(i.user_id) ?? 0) + 1);
  });

  if (counts.size === 0) return [];

  const ids = Array.from(counts.keys());
  const { data: profs } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .in("user_id", ids);

  const profMap = new Map(
    (profs ?? []).map((p) => [p.user_id, p as { user_id: string; display_name: string; avatar_url: string | null }]),
  );

  const rows: AssiduidadeRow[] = ids.map((id) => {
    const p = profMap.get(id);
    return {
      user_id: id,
      display_name: p?.display_name ?? "Jogador",
      avatar_url: p?.avatar_url ?? null,
      participacoes: counts.get(id) ?? 0,
    };
  });
  rows.sort((a, b) => b.participacoes - a.participacoes);
  return rows.slice(0, 20);
}

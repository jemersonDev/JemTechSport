import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { TeamNamesMap } from "@/lib/teamMeta";

const ACTIVE_RACHA_KEY = "jemtech_active_racha";

export type SkillLevel = "iniciante" | "casual" | "bom_de_bola" | "craque";
export type PositionExt = "goleiro" | "zagueiro" | "meia" | "atacante";

export type Racha = {
  id: string;
  admin_id: string;
  name: string;
  location: string | null;
  address: string | null;
  scheduled_at: string | null;
  total_value: number;
  app_fee: number;
  max_players: number;
  field_mode: "futsal" | "society" | "campo";
  pix_key: string | null;
  pix_key_type: string | null;
  pix_holder: string | null;
  invite_code: string;
  finalizado_em?: string | null;
  team_names: TeamNamesMap;
};

export type Inscricao = {
  id: string;
  racha_id: string;
  user_id: string;
  position: "goleiro" | "linha";
  paid: boolean;
  paid_at: string | null;
  // joined profile
  display_name: string;
  avatar_url: string | null;
  skill_level: SkillLevel;
  preferred_position_ext: PositionExt;
};

export type JogadorManual = {
  id: string;
  racha_id: string;
  added_by: string;
  name: string;
  position: PositionExt;
  skill_level: SkillLevel;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
};

export function useUserRachas() {
  const { user } = useAuth();
  const [rachas, setRachas] = useState<Racha[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setRachas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: memberships } = await supabase
      .from("racha_membros")
      .select("racha_id")
      .eq("user_id", user.id);

    const ids = (memberships ?? []).map((m) => m.racha_id);
    if (ids.length === 0) {
      setRachas([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("rachas")
      .select("*")
      .in("id", ids)
      .order("scheduled_at", { ascending: true, nullsFirst: false });
    setRachas((data as Racha[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rachas, loading, reload };
}

export function useRacha(rachaId: string | null) {
  const { user } = useAuth();
  const [racha, setRacha] = useState<Racha | null>(null);
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [manuais, setManuais] = useState<JogadorManual[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRacha = useCallback(async () => {
    if (!rachaId) {
      setRacha(null);
      setInscricoes([]);
      setManuais([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("rachas").select("*").eq("id", rachaId).maybeSingle();
    setRacha((data as Racha) ?? null);
  }, [rachaId]);

  const loadInscricoes = useCallback(async () => {
    if (!rachaId) {
      setInscricoes([]);
      return;
    }
    const { data: ins } = await supabase
      .from("inscricoes")
      .select("*")
      .eq("racha_id", rachaId)
      .order("created_at", { ascending: true });

    const inscList = ins ?? [];
    if (inscList.length === 0) {
      setInscricoes([]);
      return;
    }

    const userIds = inscList.map((i) => i.user_id);
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, skill_level, preferred_position_ext")
      .in("user_id", userIds);

    const profMap = new Map((profs ?? []).map((p) => [p.user_id, p]));
    const merged: Inscricao[] = inscList.map((i) => {
      const p = profMap.get(i.user_id);
      return {
        id: i.id,
        racha_id: i.racha_id,
        user_id: i.user_id,
        position: i.position,
        paid: i.paid,
        paid_at: i.paid_at,
        display_name: p?.display_name ?? "Jogador",
        avatar_url: p?.avatar_url ?? null,
        skill_level: (p?.skill_level as SkillLevel) ?? "casual",
        preferred_position_ext: (p?.preferred_position_ext as PositionExt) ?? "meia",
      };
    });
    setInscricoes(merged);
  }, [rachaId]);

  const loadManuais = useCallback(async () => {
    if (!rachaId) {
      setManuais([]);
      return;
    }
    const { data } = await supabase
      .from("jogadores_manuais")
      .select("*")
      .eq("racha_id", rachaId)
      .order("created_at", { ascending: true });
    setManuais((data as JogadorManual[]) ?? []);
  }, [rachaId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([loadRacha(), loadInscricoes(), loadManuais()]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadRacha, loadInscricoes, loadManuais]);

  // Realtime
  useEffect(() => {
    if (!rachaId) return;
    const channel = supabase
      .channel(`racha-${rachaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inscricoes", filter: `racha_id=eq.${rachaId}` },
        () => loadInscricoes(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rachas", filter: `id=eq.${rachaId}` },
        () => loadRacha(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jogadores_manuais", filter: `racha_id=eq.${rachaId}` },
        () => loadManuais(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [rachaId, loadInscricoes, loadRacha, loadManuais]);

  const myInscricao = user ? inscricoes.find((i) => i.user_id === user.id) ?? null : null;
  const isAdmin = !!(user && racha && racha.admin_id === user.id);

  // ============== ACTIONS ==============
  const joinList = async (position: "goleiro" | "linha") => {
    if (!user || !rachaId) return { error: "Não logado" };
    const { error } = await supabase.from("inscricoes").insert({
      racha_id: rachaId,
      user_id: user.id,
      position,
    });
    if (error) return { error: error.message };
    await loadInscricoes();
    return { error: null };
  };

  const leaveList = async () => {
    if (!user || !rachaId) return { error: "Não logado" };
    const { error } = await supabase
      .from("inscricoes")
      .delete()
      .eq("racha_id", rachaId)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    await loadInscricoes();
    return { error: null };
  };

  const togglePaid = async (paid: boolean) => {
    if (!user || !rachaId) return { error: "Não logado" };
    const { error } = await supabase
      .from("inscricoes")
      .update({ paid, paid_at: paid ? new Date().toISOString() : null })
      .eq("racha_id", rachaId)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    await loadInscricoes();
    return { error: null };
  };

  const setMyPosition = async (position: "goleiro" | "linha") => {
    if (!user || !rachaId) return { error: "Não logado" };
    const { error } = await supabase
      .from("inscricoes")
      .update({ position })
      .eq("racha_id", rachaId)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    await loadInscricoes();
    return { error: null };
  };

  const removeInscricao = async (userId: string) => {
    if (!isAdmin || !rachaId) return { error: "Sem permissão" };
    const { error } = await supabase
      .from("inscricoes")
      .delete()
      .eq("racha_id", rachaId)
      .eq("user_id", userId);
    if (error) return { error: error.message };
    await loadInscricoes();
    return { error: null };
  };

  const updateRacha = async (patch: Partial<Racha>) => {
    if (!isAdmin || !rachaId) return { error: "Sem permissão" };
    const { error } = await supabase.from("rachas").update(patch).eq("id", rachaId);
    if (error) return { error: error.message };
    await loadRacha();
    return { error: null };
  };

  // ============== Jogadores manuais ==============
  const addManual = async (input: { name: string; position?: PositionExt; skill_level?: SkillLevel }) => {
    if (!user || !rachaId) return { error: "Sem permissão" };
    const { error } = await supabase.from("jogadores_manuais").insert({
      racha_id: rachaId,
      added_by: user.id,
      name: input.name,
      position: input.position ?? "meia",
      skill_level: input.skill_level ?? "casual",
    });
    if (error) return { error: error.message };
    await loadManuais();
    return { error: null };
  };

  const updateManual = async (id: string, patch: Partial<JogadorManual>) => {
    const { error } = await supabase.from("jogadores_manuais").update(patch).eq("id", id);
    if (error) return { error: error.message };
    await loadManuais();
    return { error: null };
  };

  const removeManual = async (id: string) => {
    const { error } = await supabase.from("jogadores_manuais").delete().eq("id", id);
    if (error) return { error: error.message };
    await loadManuais();
    return { error: null };
  };

  const toggleManualPaid = async (id: string, paid: boolean) => {
    const { error } = await supabase
      .from("jogadores_manuais")
      .update({ paid, paid_at: paid ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) return { error: error.message };
    await loadManuais();
    return { error: null };
  };

  return {
    racha,
    inscricoes,
    manuais,
    myInscricao,
    isAdmin,
    loading,
    joinList,
    leaveList,
    togglePaid,
    setMyPosition,
    removeInscricao,
    updateRacha,
    addManual,
    updateManual,
    removeManual,
    toggleManualPaid,
    refresh: () => Promise.all([loadRacha(), loadInscricoes(), loadManuais()]),
  };
}

// ============== Local active racha selection ==============
export function useActiveRachaId() {
  const [id, setId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACTIVE_RACHA_KEY);
  });

  const setActive = useCallback((newId: string | null) => {
    if (typeof window !== "undefined") {
      if (newId) localStorage.setItem(ACTIVE_RACHA_KEY, newId);
      else localStorage.removeItem(ACTIVE_RACHA_KEY);
    }
    setId(newId);
  }, []);

  return { activeRachaId: id, setActiveRachaId: setActive };
}

// ============== Create / Join ==============
export async function createRacha(input: {
  admin_id: string;
  name: string;
  location?: string;
  address?: string;
  scheduled_at?: string;
  field_mode?: "futsal" | "society" | "campo";
  max_players?: number;
}) {
  const { data, error } = await supabase
    .from("rachas")
    .insert({
      admin_id: input.admin_id,
      name: input.name,
      location: input.location ?? null,
      address: input.address ?? null,
      scheduled_at: input.scheduled_at ?? null,
      field_mode: input.field_mode ?? "society",
      max_players: input.max_players ?? 12,
    })
    .select("*")
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as Racha, error: null };
}

export async function joinByInviteCode(code: string, userId: string) {
  const cleaned = code.trim().toUpperCase();
  if (cleaned.length !== 6) return { data: null, error: "Código deve ter 6 caracteres" };

  const { data: racha, error: rachaErr } = await supabase
    .from("rachas")
    .select("*")
    .eq("invite_code", cleaned)
    .maybeSingle();

  if (rachaErr) return { data: null, error: rachaErr.message };
  if (!racha) return { data: null, error: "Código inválido" };

  const { data: existing } = await supabase
    .from("racha_membros")
    .select("id")
    .eq("racha_id", racha.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    const { error: joinErr } = await supabase.from("racha_membros").insert({
      racha_id: racha.id,
      user_id: userId,
      role: "jogador",
    });
    if (joinErr) return { data: null, error: joinErr.message };
  }

  return { data: racha as Racha, error: null };
}

// ============== Skill helpers ==============
export const SKILL_WEIGHT: Record<SkillLevel, number> = {
  iniciante: 1,
  casual: 2,
  bom_de_bola: 3,
  craque: 4,
};

export const SKILL_LABEL: Record<SkillLevel, string> = {
  iniciante: "Iniciante",
  casual: "Casual",
  bom_de_bola: "Bom de Bola",
  craque: "Craque",
};

export const POSITION_LABEL: Record<PositionExt, string> = {
  goleiro: "Goleiro",
  zagueiro: "Zagueiro",
  meia: "Meia",
  atacante: "Atacante",
};

export const POSITION_EMOJI: Record<PositionExt, string> = {
  goleiro: "🧤",
  zagueiro: "🛡️",
  meia: "🎯",
  atacante: "⚡",
};

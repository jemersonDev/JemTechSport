import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy } from "lucide-react";

type Stats = {
  totalRachas: number;
  totalGols: number;
  totalAssist: number;
  ultimosRachas: { id: string; name: string; gols: number; assist: number; data: string | null }[];
};

export function PlayerStats({ userId }: { userId: string }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const isOwner = user?.id === userId;

  const load = async () => {
    setLoading(true);

    const { data: membros } = await supabase
      .from("racha_membros")
      .select("racha_id, rachas(id, name, scheduled_at)")
      .eq("user_id", userId);

    const rachaIds = (membros ?? []).map((m) => m.racha_id);

    const { data: gols } = await supabase
      .from("gols_jogador")
      .select("racha_id, gols, assistencias")
      .eq("user_id", userId);

    type GolRow = { racha_id: string; gols: number; assistencias: number };
    const golsArr = (gols ?? []) as GolRow[];
    const golsMap = new Map(golsArr.map((g) => [g.racha_id, { gols: g.gols, assist: g.assistencias ?? 0 }]));
    const totalGols = golsArr.reduce((s, g) => s + (g.gols ?? 0), 0);
    const totalAssist = golsArr.reduce((s, g) => s + (g.assistencias ?? 0), 0);

    type MembroRow = {
      racha_id: string;
      rachas: { id: string; name: string; scheduled_at: string | null } | null;
    };

    const ultimos = ((membros ?? []) as MembroRow[])
      .map((m) => {
        const v = golsMap.get(m.racha_id);
        return {
          id: m.racha_id,
          name: m.rachas?.name ?? "Racha",
          gols: v?.gols ?? 0,
          assist: v?.assist ?? 0,
          data: m.rachas?.scheduled_at ?? null,
        };
      })
      .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))
      .slice(0, 5);

    setStats({
      totalRachas: rachaIds.length,
      totalGols,
      totalAssist,
      ultimosRachas: ultimos,
    });
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [userId]);

  const registrar = async (rachaId: string, gols: number, assist: number) => {
    if (!isOwner) return;
    const { error } = await supabase
      .from("gols_jogador")
      .upsert(
        {
          racha_id: rachaId,
          user_id: userId,
          gols: Math.max(0, gols),
          assistencias: Math.max(0, assist),
        } as never,
        { onConflict: "racha_id,user_id" },
      );
    if (!error) load();
  };

  if (loading) {
    return (
      <Card className="p-4 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="text-xl font-bold">{stats.totalRachas}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Partidas</p>
        </Card>
        <Card className="p-3 text-center">
          <Trophy className="w-4 h-4 mx-auto mb-0.5 text-neon" />
          <p className="text-xl font-bold">{stats.totalGols}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Gols</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold">{stats.totalAssist}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Assist.</p>
        </Card>
      </div>

      {stats.ultimosRachas.length > 0 && (
        <Card className="p-4 space-y-3">
          <p className="text-sm font-bold">Últimos rachas</p>
          {stats.ultimosRachas.map((r) => (
            <div key={r.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.name}</p>
                  {r.data && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.data).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Counter
                  label="⚽ Gols"
                  value={r.gols}
                  isOwner={isOwner}
                  onChange={(v) => registrar(r.id, v, r.assist)}
                />
                <Counter
                  label="🅰️ Assist."
                  value={r.assist}
                  isOwner={isOwner}
                  onChange={(v) => registrar(r.id, r.gols, v)}
                />
              </div>
            </div>
          ))}
          {isOwner && (
            <p className="text-[10px] text-muted-foreground text-center pt-1">
              Toque em + ou − pra registrar
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

function Counter({
  label,
  value,
  isOwner,
  onChange,
}: {
  label: string;
  value: number;
  isOwner: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-between rounded-md border border-border px-2 py-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {isOwner ? (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => onChange(value - 1)}
            disabled={value === 0}
          >
            −
          </Button>
          <span className="w-5 text-center font-bold text-neon">{value}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => onChange(value + 1)}
          >
            +
          </Button>
        </div>
      ) : (
        <span className="font-bold text-neon">{value}</span>
      )}
    </div>
  );
}

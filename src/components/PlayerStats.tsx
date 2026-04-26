import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy } from "lucide-react";

type Stats = {
  totalRachas: number;
  totalGols: number;
  ultimosRachas: { id: string; name: string; gols: number; data: string | null }[];
};

export function PlayerStats({ userId }: { userId: string }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const isOwner = user?.id === userId;

  const load = async () => {
    setLoading(true);

    // Rachas que o usuário participou
    const { data: membros } = await supabase
      .from("racha_membros")
      .select("racha_id, rachas(id, name, scheduled_at)")
      .eq("user_id", userId);

    const rachaIds = (membros ?? []).map((m) => m.racha_id);

    // Gols por racha
    const { data: gols } = await supabase
      .from("gols_jogador")
      .select("racha_id, gols")
      .eq("user_id", userId);

    const golsMap = new Map((gols ?? []).map((g) => [g.racha_id, g.gols]));
    const totalGols = (gols ?? []).reduce((s, g) => s + g.gols, 0);

    type MembroRow = {
      racha_id: string;
      rachas: { id: string; name: string; scheduled_at: string | null } | null;
    };

    const ultimos = ((membros ?? []) as MembroRow[])
      .map((m) => ({
        id: m.racha_id,
        name: m.rachas?.name ?? "Racha",
        gols: golsMap.get(m.racha_id) ?? 0,
        data: m.rachas?.scheduled_at ?? null,
      }))
      .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))
      .slice(0, 5);

    setStats({
      totalRachas: rachaIds.length,
      totalGols,
      ultimosRachas: ultimos,
    });
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [userId]);

  const registrarGol = async (rachaId: string, novoTotal: number) => {
    if (!isOwner) return;
    const { error } = await supabase
      .from("gols_jogador")
      .upsert(
        { racha_id: rachaId, user_id: userId, gols: Math.max(0, novoTotal) },
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
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <Trophy className="w-5 h-5 mx-auto mb-1 text-neon" />
          <p className="text-2xl font-bold">{stats.totalGols}</p>
          <p className="text-xs text-muted-foreground">gols ⚽</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{stats.totalRachas}</p>
          <p className="text-xs text-muted-foreground">rachas jogados</p>
        </Card>
      </div>

      {stats.ultimosRachas.length > 0 && (
        <Card className="p-4 space-y-3">
          <p className="text-sm font-bold">Últimos rachas</p>
          {stats.ultimosRachas.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
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
              {isOwner ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                    onClick={() => registrarGol(r.id, r.gols - 1)}
                    disabled={r.gols === 0}
                  >
                    −
                  </Button>
                  <span className="w-6 text-center font-bold text-neon">{r.gols}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                    onClick={() => registrarGol(r.id, r.gols + 1)}
                  >
                    +
                  </Button>
                </div>
              ) : (
                <span className="font-bold text-neon">
                  {r.gols} ⚽
                </span>
              )}
            </div>
          ))}
          {isOwner && (
            <p className="text-[10px] text-muted-foreground text-center pt-1">
              Toque em + ou − pra registrar seus gols
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

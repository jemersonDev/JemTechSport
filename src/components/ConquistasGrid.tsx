import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Trophy, Crown, Flame, Zap, Shield, ShieldCheck, Target, Flag, Lock,
} from "lucide-react";

type Conquista = {
  code: string;
  titulo: string;
  descricao: string;
  icone: string;
  raridade: string;
  ordem: number;
};

const ICONS: Record<string, any> = {
  trophy: Trophy, crown: Crown, flame: Flame, zap: Zap,
  shield: Shield, "shield-check": ShieldCheck, target: Target, flag: Flag,
};

const RARIDADE_STYLES: Record<string, string> = {
  comum: "from-slate-400 to-slate-600 ring-slate-400/30",
  raro: "from-blue-400 to-indigo-600 ring-blue-400/40",
  epico: "from-fuchsia-400 to-purple-600 ring-fuchsia-400/40",
  lendario: "from-yellow-400 to-amber-600 ring-yellow-400/50",
};

export function ConquistasGrid({ userId }: { userId: string | null }) {
  const [conquistas, setConquistas] = useState<Conquista[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [{ data: all }, { data: mine }] = await Promise.all([
        supabase.from("conquistas").select("*").order("ordem"),
        supabase.from("conquistas_usuario").select("conquista_code").eq("user_id", userId),
      ]);
      setConquistas((all ?? []) as Conquista[]);
      setUnlocked(new Set((mine ?? []).map((m: any) => m.conquista_code)));
      setLoading(false);
    })();
  }, [userId]);

  if (loading || conquistas.length === 0) return null;
  const total = conquistas.length;
  const got = unlocked.size;

  return (
    <section className="px-4 py-4 border-y border-border/40">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
            Conquistas
          </h3>
        </div>
        <span className="text-xs font-bold text-foreground">{got}/{total}</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {conquistas.map((c) => {
          const Icon = ICONS[c.icone] ?? Trophy;
          const isOn = unlocked.has(c.code);
          const style = RARIDADE_STYLES[c.raridade] ?? RARIDADE_STYLES.comum;
          return (
            <div key={c.code} className="flex flex-col items-center" title={c.descricao}>
              <div
                className={`relative h-14 w-14 rounded-full flex items-center justify-center shadow-lg ring-2 ${
                  isOn ? `bg-gradient-to-br ${style}` : "bg-muted ring-border/40 grayscale opacity-40"
                }`}
              >
                {isOn ? (
                  <Icon className="h-7 w-7 text-white drop-shadow" />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <span className={`mt-1.5 text-[10px] font-semibold text-center leading-tight ${
                isOn ? "text-foreground" : "text-muted-foreground"
              }`}>
                {c.titulo}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

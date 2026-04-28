import { Trophy, Star, Crown, Flame } from "lucide-react";
import { useTrofeusUsuario, type Trofeu } from "@/hooks/usePartida";

const TIPO_META: Record<
  string,
  { label: string; icon: typeof Trophy; gradient: string; ring: string }
> = {
  mvp: {
    label: "MVP",
    icon: Crown,
    gradient: "from-yellow-400 to-amber-600",
    ring: "ring-yellow-400/40",
  },
  vitoria: {
    label: "Vitória",
    icon: Trophy,
    gradient: "from-emerald-400 to-green-600",
    ring: "ring-emerald-400/40",
  },
  fominha_mes: {
    label: "Fominha",
    icon: Flame,
    gradient: "from-orange-400 to-red-600",
    ring: "ring-orange-400/40",
  },
  craque_mes: {
    label: "Craque",
    icon: Star,
    gradient: "from-fuchsia-400 to-purple-600",
    ring: "ring-fuchsia-400/40",
  },
};

function badgeOf(tipo: string) {
  return TIPO_META[tipo] ?? TIPO_META.vitoria;
}

export function TrofeusShelf({ userId }: { userId: string | null }) {
  const { trofeus, loading } = useTrofeusUsuario(userId);

  if (loading) return null;
  if (!trofeus || trofeus.length === 0) return null;

  // Agrupar por tipo, mostrando contagem
  const grupos = new Map<string, { tipo: string; count: number; ultimo: Trofeu }>();
  for (const t of trofeus) {
    const g = grupos.get(t.tipo);
    if (g) {
      g.count += 1;
    } else {
      grupos.set(t.tipo, { tipo: t.tipo, count: 1, ultimo: t });
    }
  }

  const lista = Array.from(grupos.values()).sort((a, b) => b.count - a.count);

  return (
    <section className="px-4 py-4 border-y border-border/40">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-yellow-500" />
        <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
          Prateleira de troféus
        </h3>
        <span className="text-[10px] text-muted-foreground">({trofeus.length})</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {lista.map((g) => {
          const meta = badgeOf(g.tipo);
          const Icon = meta.icon;
          return (
            <div
              key={g.tipo}
              className="flex flex-col items-center shrink-0 w-16"
              title={g.ultimo.titulo}
            >
              <div
                className={`relative h-14 w-14 rounded-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-lg ring-2 ${meta.ring}`}
              >
                <Icon className="h-7 w-7 text-white drop-shadow" />
                {g.count > 1 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-background border border-border text-[10px] font-bold flex items-center justify-center">
                    ×{g.count}
                  </span>
                )}
              </div>
              <span className="mt-1.5 text-[10px] font-semibold text-center text-foreground/90 leading-tight">
                {meta.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

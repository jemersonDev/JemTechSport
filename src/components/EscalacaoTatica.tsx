import { useState } from "react";
import { Button } from "@/components/ui/button";

type Jogador = {
  id: string;
  nome: string;
  posicao?: string | null;
};

const FORMACOES: Record<string, { gk: 1; def: number; mid: number; atk: number }> = {
  "4-3-3": { gk: 1, def: 4, mid: 3, atk: 3 },
  "4-4-2": { gk: 1, def: 4, mid: 4, atk: 2 },
  "3-3-2": { gk: 1, def: 3, mid: 3, atk: 2 },
  "3-2-2": { gk: 1, def: 3, mid: 2, atk: 2 },
  "2-2-1": { gk: 1, def: 2, mid: 2, atk: 1 },
};

function classifyPos(p?: string | null): "def" | "mid" | "atk" {
  if (!p) return "mid";
  const lower = p.toLowerCase();
  if (lower.includes("zag") || lower.includes("lateral") || lower.includes("def")) return "def";
  if (lower.includes("atac") || lower.includes("centro") || lower.includes("pont")) return "atk";
  return "mid";
}

function alocar(jogadores: Jogador[], f: { gk: 1; def: number; mid: number; atk: number }) {
  const gk = jogadores.find((j) => j.posicao?.toLowerCase().includes("gol"));
  const linha = jogadores.filter((j) => j.id !== gk?.id);
  const buckets: Record<"def" | "mid" | "atk", Jogador[]> = { def: [], mid: [], atk: [] };
  // pre-fill by preference
  const sorted = [...linha].sort(() => 0);
  const remaining: Jogador[] = [];
  for (const j of sorted) {
    const tipo = classifyPos(j.posicao);
    if (buckets[tipo].length < (f as any)[tipo]) buckets[tipo].push(j);
    else remaining.push(j);
  }
  // fill empty slots with remaining
  (["def", "mid", "atk"] as const).forEach((tipo) => {
    while (buckets[tipo].length < (f as any)[tipo] && remaining.length) {
      buckets[tipo].push(remaining.shift()!);
    }
  });
  return { gk, ...buckets };
}

export function EscalacaoTatica({
  jogadores,
  formacaoInicial = "4-3-3",
  corTime = "#10b981",
}: {
  jogadores: Jogador[];
  formacaoInicial?: string;
  corTime?: string;
}) {
  const [formacao, setFormacao] = useState(formacaoInicial);
  const f = FORMACOES[formacao] ?? FORMACOES["4-3-3"];
  const max = 1 + f.def + f.mid + f.atk;

  if (jogadores.length < 4) return null;

  const usados = jogadores.slice(0, max);
  const { gk, def, mid, atk } = alocar(usados, f);

  const linhas: { y: number; players: (Jogador | undefined)[] }[] = [
    { y: 92, players: [gk] },
    { y: 70, players: def },
    { y: 45, players: mid },
    { y: 22, players: atk },
  ];

  return (
    <div className="rounded-xl bg-gradient-to-b from-emerald-900/40 to-emerald-950/60 border border-emerald-500/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wider font-bold text-emerald-300">Escalação tática</p>
        <div className="flex gap-1">
          {Object.keys(FORMACOES).map((k) => (
            <Button
              key={k}
              size="sm"
              variant={k === formacao ? "default" : "ghost"}
              onClick={() => setFormacao(k)}
              className="h-7 px-2 text-[10px]"
            >
              {k}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative w-full aspect-[2/3] bg-emerald-700/30 rounded-md overflow-hidden border border-emerald-400/30">
        {/* field lines */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/30" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/30" />
        <div className="absolute inset-x-1/4 top-0 h-12 border-x border-b border-white/30" />
        <div className="absolute inset-x-1/4 bottom-0 h-12 border-x border-t border-white/30" />

        {linhas.map((linha, li) =>
          linha.players.filter(Boolean).map((p, i, arr) => {
            const x = ((i + 1) / (arr.length + 1)) * 100;
            return (
              <div
                key={`${li}-${p!.id}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ left: `${x}%`, top: `${linha.y}%` }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg ring-2 ring-white/40"
                  style={{ backgroundColor: corTime }}
                >
                  {p!.nome.slice(0, 2).toUpperCase()}
                </div>
                <span className="mt-0.5 text-[9px] text-white/90 font-semibold max-w-[60px] truncate drop-shadow">
                  {p!.nome.split(" ")[0]}
                </span>
              </div>
            );
          }),
        )}
      </div>
      <p className="text-[10px] text-emerald-300/70 text-center mt-2">
        Posições automáticas baseadas na preferência de cada jogador
      </p>
    </div>
  );
}

import { Minus, Plus, Shield, User } from "lucide-react";

export type Player = {
  id: string;
  name: string;
  goals: number;
  photo?: string;
  isGoalkeeper?: boolean;
  paid?: boolean;
  skill?: number; // 1-4
};

export type FieldMode = "futsal" | "society" | "campo";

type Props = {
  teamA: Player[];
  teamB: Player[];
  mode: FieldMode;
  onGoalChange: (playerId: string, delta: number) => void;
};

// Positions normalized 0-100 inside each team's HALF (x: 0 = own goal line, 100 = midfield).
// y: 0 = top, 100 = bottom. Slot 0 is the goalkeeper.
// We size formations by team count and pick the closest match.
const FORMATIONS: Record<FieldMode, Record<number, Array<[number, number]>>> = {
  // Futsal / quadra: 5 players (1 GK + 4) — Diamond / 1-2-1
  futsal: {
    3: [
      [10, 50],
      [55, 30],
      [55, 70],
    ],
    4: [
      [10, 50],
      [50, 50],
      [70, 25],
      [70, 75],
    ],
    5: [
      [10, 50],
      [45, 50], // fixo
      [60, 20], // ala dir
      [60, 80], // ala esq
      [85, 50], // pivô
    ],
    6: [
      [10, 50],
      [40, 30],
      [40, 70],
      [65, 20],
      [65, 80],
      [85, 50],
    ],
  },
  // Society: 7 players (1 GK + 6) — 2-3-1 / 3-2-1
  society: {
    4: [
      [10, 50],
      [45, 30],
      [45, 70],
      [80, 50],
    ],
    5: [
      [10, 50],
      [40, 30],
      [40, 70],
      [70, 35],
      [70, 65],
    ],
    6: [
      [10, 50],
      [35, 25],
      [35, 75],
      [60, 30],
      [60, 70],
      [85, 50],
    ],
    7: [
      [10, 50],
      [32, 25],
      [32, 75],
      [55, 20],
      [55, 50],
      [55, 80],
      [85, 50],
    ],
    8: [
      [10, 50],
      [32, 25],
      [32, 75],
      [55, 18],
      [55, 50],
      [55, 82],
      [82, 32],
      [82, 68],
    ],
  },
  // Campo: 11 players (1 GK + 10) — 4-3-3 / 4-4-2
  campo: {
    6: [
      [8, 50],
      [30, 25],
      [30, 75],
      [55, 30],
      [55, 70],
      [82, 50],
    ],
    7: [
      [8, 50],
      [28, 22],
      [28, 78],
      [50, 30],
      [50, 70],
      [78, 30],
      [78, 70],
    ],
    8: [
      [8, 50],
      [28, 20],
      [28, 50],
      [28, 80],
      [55, 30],
      [55, 70],
      [80, 30],
      [80, 70],
    ],
    9: [
      [8, 50],
      [25, 18],
      [25, 50],
      [25, 82],
      [50, 25],
      [50, 75],
      [78, 20],
      [78, 50],
      [78, 80],
    ],
    10: [
      [8, 50],
      [25, 15],
      [25, 38],
      [25, 62],
      [25, 85],
      [52, 28],
      [52, 50],
      [52, 72],
      [80, 32],
      [80, 68],
    ],
    11: [
      [8, 50], // GK
      [25, 15], // LB
      [25, 38], // CB
      [25, 62], // CB
      [25, 85], // RB
      [52, 25], // CM
      [52, 50], // CM
      [52, 75], // CM
      [80, 22], // LW
      [80, 50], // ST
      [80, 78], // RW
    ],
  },
};

function getFormation(mode: FieldMode, count: number): Array<[number, number]> {
  if (count <= 0) return [];
  const map = FORMATIONS[mode];
  const sizes = Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b);
  // Find closest available size
  let best = sizes[0];
  let bestDiff = Math.abs(count - best);
  for (const s of sizes) {
    const d = Math.abs(count - s);
    if (d < bestDiff) {
      best = s;
      bestDiff = d;
    }
  }
  const base = map[best];
  if (count === best) return base;
  if (count < best) return base.slice(0, count);
  // count > best: distribute extras around midfield/attack
  const extras: Array<[number, number]> = [];
  const overflow = count - best;
  for (let i = 0; i < overflow; i++) {
    const x = 60 + (i % 2) * 15;
    const y = 30 + ((i * 23) % 40);
    extras.push([x, y]);
  }
  return [...base, ...extras];
}

function PlayerPin({
  player,
  team,
  onGoalChange,
}: {
  player: Player;
  team: "A" | "B";
  onGoalChange: (id: string, delta: number) => void;
}) {
  const ringColor = team === "A" ? "ring-[var(--team-a)]" : "ring-[var(--team-b)]";
  const dotColor = team === "A" ? "bg-[var(--team-a)]" : "bg-[var(--team-b)]";
  const paidRing = player.paid ? "ring-green-400 ring-[3px]" : `ring-2 ${player.isGoalkeeper ? "ring-keeper" : ringColor}`;

  return (
    <div className="flex flex-col items-center gap-0.5 w-[58px]">
      <div className="relative">
        <div
          className={`w-9 h-9 rounded-full ${player.isGoalkeeper ? "bg-keeper" : dotColor} flex items-center justify-center overflow-hidden ${paidRing} shadow-card`}
        >
          {player.photo ? (
            <img src={player.photo} alt={player.name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-black" strokeWidth={2.5} />
          )}
        </div>
        {player.isGoalkeeper && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-keeper flex items-center justify-center ring-1 ring-black shadow">
            <Shield className="w-2.5 h-2.5 text-black" strokeWidth={3} />
          </span>
        )}
        {player.paid && !player.isGoalkeeper && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-400 flex items-center justify-center ring-1 ring-black shadow">
            <span className="text-[8px] font-black text-black">$</span>
          </span>
        )}
      </div>
      <p
        className={`text-[9px] font-bold leading-none px-1 py-0.5 rounded max-w-full truncate ${player.isGoalkeeper ? "bg-keeper text-black" : "bg-black/70 text-foreground"}`}
      >
        {player.name.split(" ")[0]}
      </p>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onGoalChange(player.id, -1)}
          className="w-3.5 h-3.5 rounded bg-destructive/80 text-white flex items-center justify-center hover:bg-destructive transition"
          aria-label="Remover gol"
        >
          <Minus className="w-2 h-2" strokeWidth={3} />
        </button>
        <span className="text-[10px] font-black text-neon w-2.5 text-center leading-none">
          {player.goals}
        </span>
        <button
          onClick={() => onGoalChange(player.id, 1)}
          className="w-3.5 h-3.5 rounded bg-neon text-black flex items-center justify-center hover:brightness-110 transition"
          aria-label="Adicionar gol"
        >
          <Plus className="w-2 h-2" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}

export function SoccerField({ teamA, teamB, mode, onGoalChange }: Props) {
  const formationA = getFormation(mode, teamA.length);
  const formationB = getFormation(mode, teamB.length);

  // Aspect ratio per modality (closer to real proportions)
  const aspect =
    mode === "futsal" ? "aspect-[16/9]" : mode === "society" ? "aspect-[16/10]" : "aspect-[16/10]";

  return (
    <div
      className={`relative w-full ${aspect} rounded-2xl overflow-hidden border-2 border-border shadow-card`}
    >
      {/* Field background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            mode === "futsal"
              ? "linear-gradient(180deg, color-mix(in oklab, var(--field) 70%, black) 0%, var(--field) 50%, color-mix(in oklab, var(--field) 70%, black) 100%)"
              : "repeating-linear-gradient(90deg, var(--field) 0 8%, color-mix(in oklab, var(--field) 85%, black) 8% 16%)",
        }}
      />

      {/* Field markings */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 160 100"
        preserveAspectRatio="none"
        fill="none"
        stroke="var(--field-line)"
        strokeWidth="0.4"
        opacity="0.85"
      >
        {/* Outer border */}
        <rect x="2" y="2" width="156" height="96" />
        {/* Center line */}
        <line x1="80" y1="2" x2="80" y2="98" />
        {/* Center circle */}
        <circle cx="80" cy="50" r={mode === "futsal" ? 7 : mode === "society" ? 9 : 11} />
        <circle cx="80" cy="50" r="0.8" fill="var(--field-line)" />

        {mode === "futsal" ? (
          <>
            {/* Futsal half circles (penalty arcs) */}
            <path d="M 2 30 A 22 22 0 0 1 2 70" />
            <path d="M 158 30 A 22 22 0 0 0 158 70" />
            {/* Penalty mark */}
            <circle cx="14" cy="50" r="0.6" fill="var(--field-line)" />
            <circle cx="146" cy="50" r="0.6" fill="var(--field-line)" />
            {/* Goals */}
            <rect x="0" y="44" width="2" height="12" />
            <rect x="158" y="44" width="2" height="12" />
          </>
        ) : mode === "society" ? (
          <>
            {/* Society penalty area */}
            <rect x="2" y="28" width="14" height="44" />
            <rect x="144" y="28" width="14" height="44" />
            {/* Penalty mark */}
            <circle cx="11" cy="50" r="0.6" fill="var(--field-line)" />
            <circle cx="149" cy="50" r="0.6" fill="var(--field-line)" />
            {/* Goals */}
            <rect x="0" y="44" width="2" height="12" />
            <rect x="158" y="44" width="2" height="12" />
          </>
        ) : (
          <>
            {/* Campo: penalty + goal areas */}
            <rect x="2" y="22" width="20" height="56" />
            <rect x="138" y="22" width="20" height="56" />
            <rect x="2" y="36" width="8" height="28" />
            <rect x="150" y="36" width="8" height="28" />
            {/* Penalty mark */}
            <circle cx="16" cy="50" r="0.6" fill="var(--field-line)" />
            <circle cx="144" cy="50" r="0.6" fill="var(--field-line)" />
            {/* Penalty arc */}
            <path d="M 22 42 A 8 8 0 0 1 22 58" />
            <path d="M 138 42 A 8 8 0 0 0 138 58" />
            {/* Corner arcs */}
            <path d="M 2 4 A 2 2 0 0 1 4 2" />
            <path d="M 156 2 A 2 2 0 0 1 158 4" />
            <path d="M 2 96 A 2 2 0 0 0 4 98" />
            <path d="M 156 98 A 2 2 0 0 0 158 96" />
            {/* Goals */}
            <rect x="0" y="44" width="2" height="12" />
            <rect x="158" y="44" width="2" height="12" />
          </>
        )}
      </svg>

      {/* Team labels */}
      <div className="absolute top-2 left-2 z-20">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--team-a)] bg-black/70 px-2 py-0.5 rounded-full">
          Time A
        </span>
      </div>
      <div className="absolute top-2 right-2 z-20">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--team-b)] bg-black/70 px-2 py-0.5 rounded-full">
          Time B
        </span>
      </div>

      {/* Players overlay - absolutely positioned per formation */}
      <div className="absolute inset-0 z-10">
        {teamA.length === 0 && teamB.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-foreground/80 italic bg-black/60 px-3 py-1.5 rounded-full">
              Sorteie os times pra ver a formação
            </p>
          </div>
        )}

        {teamA.map((p, i) => {
          const pos = formationA[i];
          if (!pos) return null;
          // Team A on left half: x mapped to 1%-46% of full width
          const left = (pos[0] / 100) * 45 + 1;
          const top = pos[1];
          return (
            <div
              key={p.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <PlayerPin player={p} team="A" onGoalChange={onGoalChange} />
            </div>
          );
        })}

        {teamB.map((p, i) => {
          const pos = formationB[i];
          if (!pos) return null;
          // Team B on right half: mirror — x mapped to 99%-54%
          const left = 99 - ((pos[0] / 100) * 45 + 1);
          const top = pos[1];
          return (
            <div
              key={p.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <PlayerPin player={p} team="B" onGoalChange={onGoalChange} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

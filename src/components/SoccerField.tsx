import { Minus, Plus, User } from "lucide-react";

export type Player = {
  id: string;
  name: string;
  goals: number;
  photo?: string;
};

type Props = {
  teamA: Player[];
  teamB: Player[];
  onGoalChange: (playerId: string, delta: number) => void;
};

function PlayerCard({
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

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg bg-graphite/95 backdrop-blur px-2 py-1.5 ring-2 ${ringColor} shadow-card min-w-[110px]`}
    >
      <div
        className={`w-7 h-7 rounded-full ${dotColor} flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-black/40`}
      >
        {player.photo ? (
          <img
            src={player.photo}
            alt={player.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-foreground truncate leading-tight">
          {player.name}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <button
            onClick={() => onGoalChange(player.id, -1)}
            className="w-4 h-4 rounded bg-destructive/80 text-white flex items-center justify-center hover:bg-destructive transition"
            aria-label="Remover gol"
          >
            <Minus className="w-2.5 h-2.5" strokeWidth={3} />
          </button>
          <span className="text-xs font-bold text-neon w-3 text-center">{player.goals}</span>
          <button
            onClick={() => onGoalChange(player.id, 1)}
            className="w-4 h-4 rounded bg-neon text-black flex items-center justify-center hover:brightness-110 transition"
            aria-label="Adicionar gol"
          >
            <Plus className="w-2.5 h-2.5" strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function SoccerField({ teamA, teamB, onGoalChange }: Props) {
  return (
    <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border-2 border-border shadow-card">
      {/* Field background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(90deg, var(--field) 0 8%, color-mix(in oklab, var(--field) 85%, black) 8% 16%)",
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
        <circle cx="80" cy="50" r="10" />
        <circle cx="80" cy="50" r="0.8" fill="var(--field-line)" />
        {/* Penalty areas */}
        <rect x="2" y="25" width="18" height="50" />
        <rect x="140" y="25" width="18" height="50" />
        {/* Goal areas */}
        <rect x="2" y="38" width="7" height="24" />
        <rect x="151" y="38" width="7" height="24" />
        {/* Goals */}
        <rect x="0" y="44" width="2" height="12" />
        <rect x="158" y="44" width="2" height="12" />
      </svg>

      {/* Players overlay */}
      <div className="relative z-10 grid grid-cols-2 h-full p-3 gap-2">
        {/* Team A - left side */}
        <div className="flex flex-col items-center justify-around gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--team-a)] bg-black/60 px-2 py-0.5 rounded-full">
            Time A
          </span>
          <div className="flex flex-col gap-1.5 w-full items-center">
            {teamA.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Sorteie os times</p>
            ) : (
              teamA.map((p) => (
                <PlayerCard key={p.id} player={p} team="A" onGoalChange={onGoalChange} />
              ))
            )}
          </div>
        </div>

        {/* Team B - right side */}
        <div className="flex flex-col items-center justify-around gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--team-b)] bg-black/60 px-2 py-0.5 rounded-full">
            Time B
          </span>
          <div className="flex flex-col gap-1.5 w-full items-center">
            {teamB.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Sorteie os times</p>
            ) : (
              teamB.map((p) => (
                <PlayerCard key={p.id} player={p} team="B" onGoalChange={onGoalChange} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

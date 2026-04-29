import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

type Props = {
  startedAt: string | null;
  pausedElapsedMs: number;
  isRunning: boolean;
  isAdmin: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
};

function formatMs(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function MatchTimer({
  startedAt,
  pausedElapsedMs,
  isRunning,
  isAdmin,
  onPlay,
  onPause,
  onReset,
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isRunning || !startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [isRunning, startedAt]);

  const liveMs =
    isRunning && startedAt ? now - new Date(startedAt).getTime() : 0;
  const totalMs = pausedElapsedMs + Math.max(0, liveMs);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`text-4xl font-black tabular-nums tracking-wider ${
          isRunning ? "text-neon" : "text-foreground"
        }`}
        aria-live="polite"
      >
        {formatMs(totalMs)}
      </div>
      {isAdmin ? (
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/40 text-yellow-400 text-[11px] font-bold uppercase tracking-wider hover:bg-yellow-500/25 transition"
            >
              <Pause className="w-3.5 h-3.5" /> Pausar
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neon/15 border border-neon/40 text-neon text-[11px] font-bold uppercase tracking-wider hover:bg-neon/25 transition"
            >
              <Play className="w-3.5 h-3.5" /> {totalMs > 0 ? "Retomar" : "Iniciar"}
            </button>
          )}
          {totalMs > 0 && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground text-[11px] font-bold uppercase tracking-wider hover:text-foreground transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Zerar
            </button>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">Cronômetro controlado pelo organizador</p>
      )}
    </div>
  );
}

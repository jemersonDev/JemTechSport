import { useEffect, useRef, useState } from "react";
import { Scissors } from "lucide-react";

type Props = {
  videoUrl: string;
  duration: number;
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
};

/**
 * Slider de trim (dois cabeçotes) — não recodifica o vídeo, salva os pontos
 * e o player aplica no playback (currentTime + loop entre start/end).
 */
export function VideoTrimmer({ videoUrl, duration, start, end, onChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = start;
  }, [start]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tick = () => {
      if (v.currentTime >= end) {
        v.currentTime = start;
      }
    };
    v.addEventListener("timeupdate", tick);
    return () => v.removeEventListener("timeupdate", tick);
  }, [start, end]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-2">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="h-full w-full object-cover"
          muted
          playsInline
          onClick={() => {
            const v = videoRef.current!;
            if (v.paused) {
              v.play();
              setPlaying(true);
            } else {
              v.pause();
              setPlaying(false);
            }
          }}
        />
        {!playing && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/50 px-3 py-1 text-xs text-white">
              tocar prévia
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Scissors className="h-3 w-3" /> Trecho
          </span>
          <span className="font-mono text-primary">
            {fmt(start)} → {fmt(end)} · {(end - start).toFixed(1)}s
          </span>
        </div>

        {/* dual range simulado com dois sliders */}
        <div className="relative h-6">
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded bg-muted" />
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-primary"
            style={{
              left: `${(start / duration) * 100}%`,
              right: `${100 - (end / duration) * 100}%`,
            }}
          />
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={start}
            onChange={(e) => {
              const v = Math.min(Number(e.target.value), end - 1);
              onChange(v, end);
            }}
            className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
          />
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={end}
            onChange={(e) => {
              const v = Math.max(Number(e.target.value), start + 1);
              onChange(start, v);
            }}
            className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
          />
        </div>
      </div>
    </div>
  );
}

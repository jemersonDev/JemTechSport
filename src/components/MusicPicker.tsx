import { useEffect, useRef, useState } from "react";
import { Search, Music2, Loader2, Play, Pause, X } from "lucide-react";

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  cover: string | null;
  preview: string;
  duration: number;
};

type Props = {
  value: MusicTrack | null;
  start: number;
  onChange: (track: MusicTrack | null, start: number) => void;
};

const SUGGESTED = ["Funk", "Sertanejo", "Pagode", "Trap", "Hino corinthians", "Neymar", "Champions"];

export function MusicPicker({ value, start, onChange }: Props) {
  const [q, setQ] = useState("");
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const search = async (term: string) => {
    if (!term.trim()) {
      setTracks([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/public/deezer-search?q=${encodeURIComponent(term)}`);
      const data = await res.json();
      setTracks(data.tracks ?? []);
    } catch {
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => search(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const preview = (t: MusicTrack) => {
    if (playingId === t.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const a = new Audio(t.preview);
    a.volume = 0.7;
    a.play().catch(() => {});
    a.onended = () => setPlayingId(null);
    audioRef.current = a;
    setPlayingId(t.id);
  };

  const chooseUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    onChange(
      {
        id: `upload-${Date.now()}`,
        title: file.name.replace(/\.[^.]+$/, "").slice(0, 40),
        artist: "Do seu celular",
        cover: null,
        preview: url,
        duration: 30,
      },
      0,
    );
  };

  return (
    <div className="space-y-3">
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3">
          {value.cover ? (
            <img src={value.cover} alt="" className="h-12 w-12 rounded-md object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/20">
              <Music2 className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{value.title}</p>
            <p className="truncate text-xs text-muted-foreground">{value.artist}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              audioRef.current?.pause();
              setPlayingId(null);
              onChange(null, 0);
            }}
            className="rounded-full p-1.5 hover:bg-background/50"
            aria-label="Remover"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar música (Deezer)..."
              className="w-full rounded-full border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>

          {!q && !tracks.length && (
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQ(s)}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="max-h-60 space-y-1 overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading &&
              tracks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted/50"
                >
                  <button
                    type="button"
                    onClick={() => preview(t)}
                    className="relative shrink-0"
                    aria-label={playingId === t.id ? "Pausar" : "Ouvir prévia"}
                  >
                    {t.cover ? (
                      <img src={t.cover} alt="" className="h-11 w-11 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-md bg-muted">
                        <Music2 className="h-4 w-4" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 opacity-0 hover:opacity-100">
                      {playingId === t.id ? (
                        <Pause className="h-4 w-4 text-white" />
                      ) : (
                        <Play className="h-4 w-4 text-white" />
                      )}
                    </div>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.artist}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      audioRef.current?.pause();
                      setPlayingId(null);
                      onChange(t, 0);
                    }}
                    className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                  >
                    Usar
                  </button>
                </div>
              ))}
          </div>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 py-2.5 text-xs text-muted-foreground hover:bg-muted/60">
            <Music2 className="h-3.5 w-3.5" />
            Ou envie um MP3 seu
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) chooseUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        </>
      )}

      {value && value.duration > 15 && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Começar em</span>
            <span>{Math.floor(start)}s</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, value.duration - 15)}
            step={1}
            value={start}
            onChange={(e) => onChange(value, Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      )}
    </div>
  );
}

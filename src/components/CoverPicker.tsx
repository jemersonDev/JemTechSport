import { useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2 } from "lucide-react";

type Props = {
  videoUrl: string;
  duration: number;
  onCoverReady: (blob: Blob, previewUrl: string, timeSec: number) => void;
};

/**
 * Escolhe um frame do vídeo como capa/thumb.
 * Renderiza offscreen canvas no tempo escolhido.
 */
export function CoverPicker({ videoUrl, duration, onCoverReady }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [time, setTime] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const capture = async (t: number) => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    setBusy(true);
    v.currentTime = t;
    await new Promise<void>((resolve) => {
      const on = () => {
        v.removeEventListener("seeked", on);
        resolve();
      };
      v.addEventListener("seeked", on);
    });
    const w = v.videoWidth || 720;
    const h = v.videoHeight || 1280;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(v, 0, 0, w, h);
    c.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPreview((old) => {
            if (old) URL.revokeObjectURL(old);
            return url;
          });
          onCoverReady(blob, url, t);
        }
        setBusy(false);
      },
      "image/jpeg",
      0.85,
    );
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const on = () => capture(0);
    v.addEventListener("loadeddata", on);
    return () => v.removeEventListener("loadeddata", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          playsInline
          preload="auto"
          className="aspect-[9/16] w-full rounded-xl bg-black object-cover"
        />
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl border-2 border-primary bg-black">
          {preview ? (
            <img src={preview} alt="Capa" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              <ImageIcon className="mr-1 h-3 w-3" /> Capa
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-muted-foreground">Frame</span>
          <span className="font-mono text-primary">{time.toFixed(1)}s</span>
        </div>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={time}
          onChange={(e) => {
            const t = Number(e.target.value);
            setTime(t);
            capture(t);
          }}
          className="w-full accent-primary"
        />
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

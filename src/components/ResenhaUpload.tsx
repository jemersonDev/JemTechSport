import { useRef, useState } from "react";
import {
  X,
  Loader2,
  Video as VideoIcon,
  ArrowLeft,
  ArrowRight,
  Scissors,
  ImageIcon,
  Music2,
  Sparkles,
  Type,
  Send,
  Hash,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { OverlayEditor, type Overlay } from "@/components/OverlayEditor";
import { VideoTrimmer } from "@/components/VideoTrimmer";
import { CoverPicker } from "@/components/CoverPicker";
import { MusicPicker, type MusicTrack } from "@/components/MusicPicker";
import { toast } from "sonner";

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_DURATION = 90;
const HASHTAG_SUGGESTIONS = [
  "#racha", "#golaço", "#futebol", "#pelada", "#gol", "#craque", "#drible",
  "#futebolamador", "#jemtech", "#pênalti", "#frango", "#assistência",
];

type Step = "pick" | "trim" | "cover" | "music" | "stickers" | "caption";

type Props = {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
};

export function ResenhaUpload({ open, onClose, onUploaded }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);

  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [music, setMusic] = useState<MusicTrack | null>(null);
  const [musicStart, setMusicStart] = useState(0);

  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setStep("pick");
    setFile(null);
    setDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setCoverBlob(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
    setMusic(null);
    setMusicStart(0);
    setOverlays([]);
    setCaption("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handlePick = (f: File) => {
    if (f.size > MAX_BYTES) {
      toast.error("Vídeo muito grande (máx 50MB)");
      return;
    }
    if (!f.type.startsWith("video/")) {
      toast.error("Selecione um arquivo de vídeo");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(f);
    setFile(f);
    setPreviewUrl(url);

    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = url;
    probe.onloadedmetadata = () => {
      const d = probe.duration;
      if (d > MAX_DURATION) {
        toast.error(`Vídeo muito longo (máx ${MAX_DURATION}s)`);
        reset();
        return;
      }
      setDuration(d);
      setTrimStart(0);
      setTrimEnd(d);
      setStep("trim");
    };
  };

  const insertHashtag = (h: string) => {
    setCaption((c) => (c.length + h.length + 1 > 200 ? c : (c ? `${c} ${h}` : h)));
  };

  const handleUpload = async () => {
    if (!user || !file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("resenha-videos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("resenha-videos").getPublicUrl(path);

      let thumbUrl: string | null = null;
      if (coverBlob) {
        const thumbPath = `${user.id}/${Date.now()}.jpg`;
        const { error: thErr } = await supabase.storage
          .from("resenha-thumbs")
          .upload(thumbPath, coverBlob, { contentType: "image/jpeg", upsert: false });
        if (!thErr) {
          thumbUrl = supabase.storage.from("resenha-thumbs").getPublicUrl(thumbPath).data.publicUrl;
        }
      }

      const { error: insErr } = await supabase.from("resenha_posts").insert({
        user_id: user.id,
        video_url: pub.publicUrl,
        thumb_url: thumbUrl,
        caption: caption.trim() || null,
        duration_seconds: duration,
        overlays: overlays as unknown as Json,
        trim_start: trimStart,
        trim_end: trimEnd,
        music_url: music?.preview ?? null,
        music_title: music?.title ?? null,
        music_artist: music?.artist ?? null,
        music_cover: music?.cover ?? null,
        music_start: music ? musicStart : 0,
      });
      if (insErr) throw insErr;

      toast.success("Resenha postada! 🎉");
      reset();
      onClose();
      onUploaded();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro ao subir vídeo");
    } finally {
      setUploading(false);
    }
  };

  const steps: Step[] = ["trim", "cover", "music", "stickers", "caption"];
  const stepIdx = steps.indexOf(step);
  const canNext = stepIdx < steps.length - 1;
  const canBack = stepIdx > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/85 sm:items-center">
      <div className="flex max-h-[95vh] w-full max-w-md flex-col rounded-t-2xl bg-background sm:rounded-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <button
            onClick={() => {
              if (step === "pick") {
                onClose();
                return;
              }
              if (canBack) setStep(steps[stepIdx - 1]);
              else {
                reset();
              }
            }}
            className="rounded-full p-1 hover:bg-muted"
            aria-label="Voltar"
          >
            {step === "pick" ? <X className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </button>
          <h2 className="text-sm font-bold uppercase tracking-wider">
            {step === "pick" && "Nova resenha"}
            {step === "trim" && "Cortar"}
            {step === "cover" && "Capa"}
            {step === "music" && "Música"}
            {step === "stickers" && "Textos e stickers"}
            {step === "caption" && "Legenda"}
          </h2>
          {step === "caption" ? (
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={uploading}
              className="h-8 gap-1 px-3"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Postar
            </Button>
          ) : canNext && step !== "pick" ? (
            <button
              onClick={() => setStep(steps[stepIdx + 1])}
              className="flex items-center gap-1 text-sm font-semibold text-primary"
            >
              Avançar <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <span className="w-8" />
          )}
        </div>

        {/* stepper dots */}
        {step !== "pick" && (
          <div className="flex justify-center gap-1.5 border-b border-border py-2">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIdx
                    ? "w-6 bg-primary"
                    : i < stepIdx
                      ? "w-1.5 bg-primary/60"
                      : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>
        )}

        {/* body */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === "pick" && (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted"
            >
              <VideoIcon className="h-10 w-10" />
              <div className="text-center">
                <p className="font-medium text-foreground">Selecione um vídeo</p>
                <p className="text-xs">MP4, até 50MB e 90 segundos</p>
              </div>
            </button>
          )}

          {step === "trim" && previewUrl && duration > 0 && (
            <VideoTrimmer
              videoUrl={previewUrl}
              duration={duration}
              start={trimStart}
              end={trimEnd}
              onChange={(s, e) => {
                setTrimStart(s);
                setTrimEnd(e);
              }}
            />
          )}

          {step === "cover" && previewUrl && duration > 0 && (
            <CoverPicker
              videoUrl={previewUrl}
              duration={duration}
              onCoverReady={(blob, url) => {
                setCoverBlob(blob);
                if (coverPreview) URL.revokeObjectURL(coverPreview);
                setCoverPreview(url);
              }}
            />
          )}

          {step === "music" && (
            <MusicPicker
              value={music}
              start={musicStart}
              onChange={(t, s) => {
                setMusic(t);
                setMusicStart(s);
              }}
            />
          )}

          {step === "stickers" && previewUrl && (
            <OverlayEditor videoUrl={previewUrl} initial={overlays} onChange={setOverlays} />
          )}

          {step === "caption" && (
            <div className="space-y-3">
              {previewUrl && (
                <div className="mx-auto aspect-[9/16] w-32 overflow-hidden rounded-lg bg-black">
                  {coverPreview ? (
                    <img src={coverPreview} className="h-full w-full object-cover" alt="" />
                  ) : (
                    <video src={previewUrl} muted className="h-full w-full object-cover" />
                  )}
                </div>
              )}
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 200))}
                placeholder="Escreve uma legenda... marque @amigos e use #hashtags"
                rows={4}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" /> Sugestões
                </span>
                <span>{caption.length}/200</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {HASHTAG_SUGGESTIONS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => insertHashtag(h)}
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-primary hover:border-primary"
                  >
                    {h}
                  </button>
                ))}
              </div>

              {/* resumo do que foi configurado */}
              <div className="mt-2 space-y-1.5 rounded-lg border border-border bg-muted/30 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Scissors className="h-3 w-3 text-primary" />
                  <span>Trecho: {(trimEnd - trimStart).toFixed(1)}s</span>
                </div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-3 w-3 text-primary" />
                  <span>Capa: {coverBlob ? "personalizada" : "primeiro frame"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Music2 className="h-3 w-3 text-primary" />
                  <span>
                    Música: {music ? `${music.title} — ${music.artist}` : "som original"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span>Stickers/textos: {overlays.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* jump-nav rápido nas etapas */}
        {step !== "pick" && step !== "caption" && (
          <div className="grid grid-cols-5 gap-1 border-t border-border bg-card p-2">
            {[
              { s: "trim" as Step, icon: Scissors, label: "Cortar" },
              { s: "cover" as Step, icon: ImageIcon, label: "Capa" },
              { s: "music" as Step, icon: Music2, label: "Música" },
              { s: "stickers" as Step, icon: Type, label: "Textos" },
              { s: "caption" as Step, icon: Send, label: "Postar" },
            ].map(({ s, icon: Icon, label }) => (
              <button
                key={s}
                type="button"
                onClick={() => setStep(s)}
                className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] ${
                  step === s
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handlePick(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

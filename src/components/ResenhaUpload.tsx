import { useRef, useState } from "react";
import { Upload, X, Loader2, Video as VideoIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { OverlayEditor, type Overlay } from "@/components/OverlayEditor";
import { toast } from "sonner";

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_DURATION = 90; // segundos

type Props = {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
};

export function ResenhaUpload({ open, onClose, onUploaded }: Props) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setFile(null);
    setCaption("");
    setDuration(null);
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
  };

  const onLoadedMeta = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const dur = e.currentTarget.duration;
    setDuration(dur);
    if (dur > MAX_DURATION) {
      toast.error(`Vídeo muito longo (máx ${MAX_DURATION}s)`);
      reset();
    }
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

      const { error: insErr } = await supabase.from("resenha_posts").insert({
        user_id: user.id,
        video_url: pub.publicUrl,
        caption: caption.trim() || null,
        duration_seconds: duration,
      });
      if (insErr) throw insErr;

      toast.success("Resenha postada! 🎉");
      reset();
      onClose();
      onUploaded();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Erro ao subir vídeo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-background p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Postar resenha</h2>
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            className="rounded-full p-1 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!file ? (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex h-56 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted"
          >
            <VideoIcon className="h-10 w-10" />
            <div className="text-center">
              <p className="font-medium text-foreground">Selecione um vídeo</p>
              <p className="text-xs">MP4, até 50MB e 90 segundos</p>
            </div>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-xl bg-black">
              <video
                src={previewUrl ?? undefined}
                controls
                playsInline
                onLoadedMetadata={onLoadedMeta}
                className="aspect-[9/16] w-full object-contain"
              />
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 200))}
              placeholder="Conta a história desse lance..."
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="text-right text-xs text-muted-foreground">{caption.length}/200</div>
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

        <div className="mt-4 flex gap-2">
          {file && (
            <Button variant="outline" onClick={reset} disabled={uploading} className="flex-1">
              Trocar
            </Button>
          )}
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" /> Postar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

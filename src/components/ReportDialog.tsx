import { useState } from "react";
import { X, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";

const REASONS = [
  "Conteúdo violento",
  "Discurso de ódio",
  "Spam ou enganoso",
  "Conteúdo sexual",
  "Outro",
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void> | void;
};

export function ReportDialog({ open, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const handle = async () => {
    const finalReason = reason === "Outro" ? custom.trim() : reason;
    if (!finalReason) return;
    setSending(true);
    await onSubmit(finalReason.slice(0, 200));
    setSending(false);
    setReason(null);
    setCustom("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-background p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold">
            <Flag className="h-4 w-4 text-destructive" /> Denunciar vídeo
          </h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">Por que você está denunciando?</p>
        <div className="space-y-2">
          {REASONS.map((r) => (
            <label
              key={r}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                reason === r ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
              }`}
            >
              <input
                type="radio"
                name="reason"
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-primary"
              />
              {r}
            </label>
          ))}
        </div>
        {reason === "Outro" && (
          <textarea
            value={custom}
            onChange={(e) => setCustom(e.target.value.slice(0, 200))}
            placeholder="Conta o motivo..."
            rows={2}
            className="mt-3 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        )}
        <Button
          variant="destructive"
          onClick={handle}
          disabled={sending || !reason || (reason === "Outro" && !custom.trim())}
          className="mt-4 w-full"
        >
          Enviar denúncia
        </Button>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Download, Copy, Share2, Check } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Blob da imagem já gerada */
  blob: Blob | null;
  fileName: string;
  title: string;
  text: string;
  /** URL pública pra compartilhar junto (ex: link do app) */
  shareUrl?: string;
};

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function ShareSheet({
  open,
  onOpenChange,
  blob,
  fileName,
  title,
  text,
  shareUrl,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!blob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  const url = shareUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
  const shareMessage = `${text}\n${url}`;
  const enc = encodeURIComponent;

  const tryNativeShare = async () => {
    if (!blob) return false;
    const navAny = navigator as Navigator & {
      canShare?: (d: { files?: File[] }) => boolean;
      share?: (d: ShareData & { files?: File[] }) => Promise<void>;
    };
    if (typeof navAny.share !== "function") return false;
    try {
      const file = new File([blob], fileName, { type: "image/png" });
      const data: ShareData & { files?: File[] } = { title, text, url };
      if (typeof navAny.canShare === "function" && navAny.canShare({ files: [file] })) {
        data.files = [file];
      }
      await navAny.share(data);
      return true;
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === "AbortError") return true;
      console.warn("[ShareSheet] native share falhou:", e);
      return false;
    }
  };

  const openShareUrl = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const networks: Array<{ id: string; label: string; emoji: string; onClick: () => void }> = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      emoji: "💬",
      onClick: () => {
        if (blob) downloadBlob(blob, fileName);
        toast.success("Imagem baixada — anexa no WhatsApp 📎");
        openShareUrl(`https://wa.me/?text=${enc(shareMessage)}`);
      },
    },
    {
      id: "instagram",
      label: "Instagram",
      emoji: "📸",
      onClick: () => {
        if (blob) downloadBlob(blob, fileName);
        toast.success("Imagem baixada — abre o Insta e posta nos Stories ✨");
      },
    },
    {
      id: "facebook",
      label: "Facebook",
      emoji: "👍",
      onClick: () => {
        if (blob) downloadBlob(blob, fileName);
        openShareUrl(`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}&quote=${enc(text)}`);
      },
    },
    {
      id: "x",
      label: "X / Twitter",
      emoji: "𝕏",
      onClick: () => {
        if (blob) downloadBlob(blob, fileName);
        openShareUrl(`https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`);
      },
    },
    {
      id: "telegram",
      label: "Telegram",
      emoji: "✈️",
      onClick: () => {
        if (blob) downloadBlob(blob, fileName);
        openShareUrl(`https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`);
      },
    },
    {
      id: "messenger",
      label: "Messenger",
      emoji: "💌",
      onClick: () => {
        if (blob) downloadBlob(blob, fileName);
        openShareUrl(`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`);
      },
    },
    {
      id: "email",
      label: "E-mail",
      emoji: "✉️",
      onClick: () => {
        if (blob) downloadBlob(blob, fileName);
        openShareUrl(`mailto:?subject=${enc(title)}&body=${enc(shareMessage)}`);
      },
    },
    {
      id: "more",
      label: "Mais...",
      emoji: "⋯",
      onClick: async () => {
        const ok = await tryNativeShare();
        if (!ok) toast.info("Seu navegador não suporta o menu nativo aqui.");
      },
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não consegui copiar");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-center">Compartilhar card</SheetTitle>
        </SheetHeader>

        {previewUrl && (
          <div className="flex justify-center my-3">
            <img
              src={previewUrl}
              alt="Preview"
              className="rounded-lg max-h-48 object-contain border border-border"
            />
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 my-2">
          {networks.map((n) => (
            <button
              key={n.id}
              onClick={n.onClick}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-muted active:scale-95 transition"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-border flex items-center justify-center text-2xl">
                {n.emoji}
              </div>
              <span className="text-[11px] font-medium text-center leading-tight">{n.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 mt-2">
          <Button onClick={copyLink} variant="outline" size="sm" className="flex-1 gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copiar link
          </Button>
          <Button
            onClick={() => blob && downloadBlob(blob, fileName)}
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            disabled={!blob}
          >
            <Download className="h-4 w-4" />
            Baixar imagem
          </Button>
        </div>

        <Button
          onClick={async () => {
            const ok = await tryNativeShare();
            if (ok) onOpenChange(false);
          }}
          size="sm"
          className="w-full mt-2 gap-2"
        >
          <Share2 className="h-4 w-4" />
          Menu nativo do dispositivo
        </Button>
      </SheetContent>
    </Sheet>
  );
}

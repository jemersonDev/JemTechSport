import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { criarPagamentoPix, verPagamentoStatus } from "@/utils/pagamentos.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Props = {
  inscricaoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid?: () => void;
};

export function PixPaymentDialog({ inscricaoId, open, onOpenChange, onPaid }: Props) {
  const criarFn = useServerFn(criarPagamentoPix);
  const statusFn = useServerFn(verPagamentoStatus);

  const [loading, setLoading] = useState(false);
  const [pagamentoId, setPagamentoId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);
  const [valor, setValor] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);

  // Gerar PIX ao abrir
  useEffect(() => {
    if (!open || !inscricaoId) return;
    setLoading(true);
    setPaid(false);
    criarFn({ data: { inscricaoId } })
      .then((res) => {
        if (!res.ok) {
          toast.error(res.error);
          onOpenChange(false);
          return;
        }
        setPagamentoId(res.pagamentoId);
        setQrCode(res.qrCode ?? null);
        setQrCodeBase64(res.qrCodeBase64 ?? null);
        setTicketUrl(res.ticketUrl ?? null);
        setValor(res.valor);
      })
      .catch((e) => {
        console.error(e);
        toast.error("Erro ao gerar PIX");
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inscricaoId]);

  // Polling do status
  useEffect(() => {
    if (!open || !pagamentoId || paid) return;
    const interval = setInterval(async () => {
      const res = await statusFn({ data: { pagamentoId } }).catch(() => null);
      if (res && res.ok && res.status === "aprovado") {
        setPaid(true);
        toast.success("Pagamento confirmado! ✅");
        onPaid?.();
        clearInterval(interval);
        setTimeout(() => onOpenChange(false), 1500);
      }
    }, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pagamentoId, paid]);

  const copyCode = async () => {
    if (!qrCode) return;
    await navigator.clipboard.writeText(qrCode);
    setCopied(true);
    toast.success("Código PIX copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pagar com PIX</DialogTitle>
          <DialogDescription>
            {valor > 0
              ? `Valor: R$ ${valor.toFixed(2).replace(".", ",")}`
              : "Gerando código PIX…"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : paid ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-500" strokeWidth={3} />
            </div>
            <p className="font-bold text-green-500">Pagamento confirmado!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {qrCodeBase64 && (
              <div className="bg-white p-3 rounded-md flex justify-center">
                <img
                  src={`data:image/png;base64,${qrCodeBase64}`}
                  alt="QR code PIX"
                  className="w-56 h-56"
                />
              </div>
            )}
            {qrCode && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Código PIX (copia e cola)
                </label>
                <div className="flex gap-1.5">
                  <input
                    readOnly
                    value={qrCode}
                    className="flex-1 text-xs px-2 py-2 rounded-md border border-border bg-muted/30 truncate"
                  />
                  <Button size="sm" variant="outline" onClick={copyCode}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
            {ticketUrl && (
              <Button
                variant="outline"
                className="w-full"
                asChild
              >
                <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
                  Abrir no app do banco <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
            )}
            <p className="text-[10px] text-center text-muted-foreground">
              Aguardando confirmação automática…
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

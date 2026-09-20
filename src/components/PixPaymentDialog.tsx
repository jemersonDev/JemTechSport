import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { criarPagamentoPix, criarPagamentoExtra, verPagamentoStatus } from "@/utils/pagamentos.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Props = {
  inscricaoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid?: () => void;
  tipo?: "principal" | "extra";
};

export function PixPaymentDialog({ inscricaoId, open, onOpenChange, onPaid, tipo = "principal" }: Props) {
  const criarPrincipalFn = useServerFn(criarPagamentoPix);
  const criarExtraFn = useServerFn(criarPagamentoExtra);
  const statusFn = useServerFn(verPagamentoStatus);

  const [loading, setLoading] = useState(false);
  const [pagamentoId, setPagamentoId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);
  const [valor, setValor] = useState<number>(0);
  const [valorQuadra, setValorQuadra] = useState<number>(0);
  const [valorTaxa, setValorTaxa] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);

  // Gerar PIX ao abrir
  useEffect(() => {
    if (!open || !inscricaoId) return;
    setLoading(true);
    setPaid(false);
    const criarFn = tipo === "extra" ? criarExtraFn : criarPrincipalFn;
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
        setValorQuadra(res.valorQuadra ?? 0);
        setValorTaxa(res.valorTaxa ?? 0);
      })
      .catch((e) => {
        console.error(e);
        toast.error("Erro ao gerar PIX");
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inscricaoId, tipo]);

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
      <DialogContent className="max-w-sm bg-[#1a1a2a] border border-[#22c55e]/30 text-white shadow-[0_0_40px_rgba(34,197,94,0.15)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#22c55e] text-black font-extrabold text-xs shadow-[0_0_12px_rgba(34,197,94,0.6)]">
              PIX
            </span>
            Pagar {tipo === "extra" ? "prorrogação" : "com PIX"}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {valor > 0 ? (
              <span className="text-base font-bold text-[#22c55e]">
                R$ {valor.toFixed(2).replace(".", ",")}
              </span>
            ) : (
              "Gerando código PIX…"
            )}
          </DialogDescription>
        </DialogHeader>

        {valor > 0 && (valorQuadra > 0 || valorTaxa > 0) && (
          <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 space-y-1 text-xs">
            <div className="flex items-center justify-between text-white/70">
              <span>{tipo === "extra" ? "Prorrogação" : "Valor da quadra"}</span>
              <span className="font-semibold text-white">
                R$ {valorQuadra.toFixed(2).replace(".", ",")}
              </span>
            </div>
            <div className="flex items-center justify-between text-white/50">
              <span>Taxa da plataforma (JemTech)</span>
              <span>+ R$ {valorTaxa.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="h-px bg-white/10 my-1" />
            <div className="flex items-center justify-between font-bold">
              <span className="text-white">Total no PIX</span>
              <span className="text-[#22c55e]">R$ {valor.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#22c55e]" />
          </div>
        ) : paid ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-20 h-20 rounded-full bg-[#22c55e]/15 ring-2 ring-[#22c55e] flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.5)] animate-pulse">
              <Check className="w-10 h-10 text-[#22c55e]" strokeWidth={3} />
            </div>
            <p className="font-extrabold text-[#22c55e] text-lg">Pagamento confirmado!</p>
            <p className="text-xs text-white/60">Sua vaga está garantida ⚡</p>
          </div>
        ) : (
          <div className="space-y-4">
            {qrCodeBase64 && (
              <div className="bg-white p-3 rounded-xl flex justify-center ring-1 ring-[#22c55e]/40 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                <img
                  src={`data:image/png;base64,${qrCodeBase64}`}
                  alt="QR code PIX"
                  className="w-56 h-56"
                />
              </div>
            )}
            {qrCode && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Código PIX (copia e cola)
                </label>
                <div className="flex gap-1.5">
                  <input
                    readOnly
                    value={qrCode}
                    className="flex-1 text-xs px-3 py-2.5 rounded-lg border border-white/10 bg-[#2a2a3a] text-white/80 truncate"
                  />
                  <Button
                    size="sm"
                    onClick={copyCode}
                    className="bg-[#22c55e] text-black hover:bg-[#16a34a] shadow-[0_0_12px_rgba(34,197,94,0.5)]"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
            {ticketUrl && (
              <Button
                variant="outline"
                className="w-full bg-transparent border-[#22c55e]/40 text-[#22c55e] hover:bg-[#22c55e]/10 hover:text-[#22c55e]"
                asChild
              >
                <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
                  Abrir no app do banco <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
            )}
            <p className="flex items-center justify-center gap-2 text-[11px] text-white/50">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              Aguardando confirmação automática…
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

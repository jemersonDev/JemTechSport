import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { solicitarSaque, verSaldoDisponivel } from "@/utils/saques.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Check, Wallet } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSolicitado?: () => void;
};

type PixKeyType = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";

export function SolicitarSaqueDialog({ open, onOpenChange, onSolicitado }: Props) {
  const saldoFn = useServerFn(verSaldoDisponivel);
  const saqueFn = useServerFn(solicitarSaque);

  const [loadingSaldo, setLoadingSaldo] = useState(true);
  const [saldo, setSaldo] = useState(0);
  const [valor, setValor] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("cpf");
  const [destinatarioNome, setDestinatarioNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSucesso(false);
    setValor("");
    setPixKey("");
    setDestinatarioNome("");
    setLoadingSaldo(true);
    saldoFn({ data: undefined })
      .then((res) => {
        if (res.ok) setSaldo(res.saldo);
      })
      .finally(() => setLoadingSaldo(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const valorNum = Number(valor.replace(",", "."));
  const valorValido = valorNum > 0 && valorNum <= saldo;

  const handleSubmit = async () => {
    if (!valorValido || pixKey.trim().length < 3) return;
    setEnviando(true);
    try {
      const res = await saqueFn({
        data: {
          valor: valorNum,
          pixKey: pixKey.trim(),
          pixKeyType,
          destinatarioNome: destinatarioNome.trim() || undefined,
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSucesso(true);
      onSolicitado?.();
      setTimeout(() => onOpenChange(false), 1800);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao solicitar saque");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" /> Solicitar saque
          </DialogTitle>
          <DialogDescription>
            {loadingSaldo ? (
              "Calculando saldo disponível…"
            ) : (
              <>
                Disponível: <strong>R$ {saldo.toFixed(2).replace(".", ",")}</strong>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {sucesso ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-16 h-16 rounded-full bg-primary/15 ring-2 ring-primary flex items-center justify-center">
              <Check className="w-8 h-8 text-primary" strokeWidth={3} />
            </div>
            <p className="font-bold text-center">Pedido de saque enviado!</p>
            <p className="text-xs text-muted-foreground text-center">
              Vai ser conferido e transferido em breve. Você pode acompanhar o status
              na lista de saques.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="saque-valor">Valor (R$)</Label>
              <Input
                id="saque-valor"
                inputMode="decimal"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                disabled={loadingSaldo || enviando}
              />
              {valor && !valorValido && (
                <p className="text-xs text-destructive">
                  {valorNum > saldo
                    ? "Valor maior que o saldo disponível"
                    : "Digite um valor válido"}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de chave PIX</Label>
              <Select
                value={pixKeyType}
                onValueChange={(v) => setPixKeyType(v as PixKeyType)}
                disabled={enviando}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="aleatoria">Chave aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="saque-pix">Chave PIX de destino</Label>
              <Input
                id="saque-pix"
                placeholder="Sua chave, ou a de quem for receber"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                disabled={enviando}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="saque-nome">Nome do titular (opcional)</Label>
              <Input
                id="saque-nome"
                placeholder="Ex: dono da quadra, ou seu nome"
                value={destinatarioNome}
                onChange={(e) => setDestinatarioNome(e.target.value)}
                disabled={enviando}
              />
            </div>

            <Button
              className="w-full"
              disabled={!valorValido || pixKey.trim().length < 3 || enviando || loadingSaldo}
              onClick={handleSubmit}
            >
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Solicitar saque"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

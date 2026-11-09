import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PosicaoEntrada } from "@/hooks/useRacha";

type Props = {
  open: boolean;
  busy?: boolean;
  onPick: (pos: PosicaoEntrada) => void;
  onClose: () => void;
};

/** Pergunta na primeira entrada se o jogador joga na linha ou no gol. */
export function EscolhaPosicaoDialog({ open, busy, onPick, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Você joga onde?</DialogTitle>
          <DialogDescription>
            Fica salvo no seu perfil. Você pode mudar quando quiser.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={busy}
            onClick={() => onPick("linha")}
            className="rounded-xl border-2 border-border bg-graphite p-4 text-center font-bold transition hover:border-neon disabled:opacity-50"
          >
            Na linha
          </button>
          <button
            disabled={busy}
            onClick={() => onPick("goleiro")}
            className="rounded-xl border-2 border-border bg-graphite p-4 text-center font-bold transition hover:border-neon disabled:opacity-50"
          >
            No gol
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

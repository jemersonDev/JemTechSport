import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { usePush } from "@/hooks/usePush";
import { toast } from "sonner";

export function PushToggle() {
  const { supported, permission, subscribed, busy, enable, disable } = usePush();

  if (!supported) {
    return (
      <div className="text-xs text-muted-foreground p-3 rounded-lg border border-border/50 bg-card/40">
        Este navegador não suporta notificações push. Abra no Chrome/Safari do celular.
      </div>
    );
  }

  const handle = async () => {
    const res = subscribed ? await disable() : await enable();
    if (res.error) toast.error(res.error);
    else toast.success(subscribed ? "Notificações desativadas" : "🔔 Notificações ativadas!");
  };

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/50 bg-card/40">
      <div className="flex items-center gap-2">
        {subscribed ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
        <div>
          <p className="text-sm font-semibold">Notificações no celular</p>
          <p className="text-[11px] text-muted-foreground">
            {subscribed
              ? "Você recebe lembretes 3h antes do racha, promoção da fila e novos rachas."
              : permission === "denied"
                ? "Bloqueado no navegador. Libere nas configurações do site."
                : "Ative para receber avisos importantes no celular."}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant={subscribed ? "outline" : "default"}
        disabled={busy || permission === "denied"}
        onClick={handle}
      >
        {busy ? "..." : subscribed ? "Desativar" : "Ativar"}
      </Button>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Clock, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

type Props = {
  rachaId: string;
  userId: string;
  isFull: boolean;
  isInscrito: boolean;
};

export function ListaEsperaCard({ rachaId, userId, isFull, isInscrito }: Props) {
  const [fila, setFila] = useState<{ user_id: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("lista_espera")
      .select("user_id, created_at")
      .eq("racha_id", rachaId)
      .order("created_at");
    setFila(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`fila:${rachaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lista_espera", filter: `racha_id=eq.${rachaId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rachaId]);

  const myPos = fila.findIndex((f) => f.user_id === userId);
  const naFila = myPos >= 0;

  const entrar = async () => {
    setActing(true);
    const { error } = await supabase
      .from("lista_espera")
      .insert({ racha_id: rachaId, user_id: userId });
    setActing(false);
    if (error) {
      toast.error("Erro ao entrar na fila");
    } else {
      toast.success("Você entrou na fila de reservas!");
    }
  };

  const sair = async () => {
    setActing(true);
    await supabase.from("lista_espera").delete().eq("racha_id", rachaId).eq("user_id", userId);
    setActing(false);
    toast.success("Você saiu da fila");
  };

  if (loading || isInscrito) return null;
  if (!isFull && !naFila) return null;

  if (naFila) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-3">
        <Clock className="w-5 h-5 text-amber-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Você está na fila</p>
          <p className="text-xs text-muted-foreground">
            Posição {myPos + 1} de {fila.length} — entra automaticamente quando vagar
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={sair} disabled={acting}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3 flex items-center gap-3">
      <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Racha cheio</p>
        <p className="text-xs text-muted-foreground">
          {fila.length > 0 ? `${fila.length} na fila — ` : ""}entre na fila para entrar se alguém sair
        </p>
      </div>
      <Button size="sm" onClick={entrar} disabled={acting}>
        <UserPlus className="w-4 h-4 mr-1" /> Fila
      </Button>
    </div>
  );
}

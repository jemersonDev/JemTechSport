import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDevedoresOrganizador } from "@/hooks/usePartida";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, Trash2, Plus, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const COBRANCA_TEMPLATE_KEY = "jemtech_template_cobranca";
const DEFAULT_TEMPLATE =
  "Eai {nome}, beleza? 🤝\n\nFicou pendente sua parte do racha: R$ {valor}{motivo}.\n\nManda o PIX quando puder pra eu fechar a conta — valeu! ⚽";

type MemberOption = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
};

export function DevedoresPanel() {
  const { user } = useAuth();
  const { devedores, loading, marcarDevedor, quitarDivida, removerMarcacao } =
    useDevedoresOrganizador(user?.id ?? null);

  const [members, setMembers] = useState<MemberOption[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [profMap, setProfMap] = useState<Map<string, MemberOption>>(new Map());
  const [zapTarget, setZapTarget] = useState<{
    devedor_id: string;
    user_id: string;
    nome: string;
    valor: number;
    motivo: string | null;
  } | null>(null);
  const [zapPhone, setZapPhone] = useState("");
  const [zapTemplate, setZapTemplate] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_TEMPLATE;
    return localStorage.getItem(COBRANCA_TEMPLATE_KEY) ?? DEFAULT_TEMPLATE;
  });

  // Carrega todos jogadores dos rachas que sou admin
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: rachas } = await supabase
        .from("rachas")
        .select("id")
        .eq("admin_id", user.id);
      const rachaIds = (rachas ?? []).map((r) => r.id);
      if (rachaIds.length === 0) return;
      const { data: ms } = await supabase
        .from("racha_membros")
        .select("user_id")
        .in("racha_id", rachaIds);
      const ids = Array.from(new Set((ms ?? []).map((m) => m.user_id))).filter(
        (id) => id !== user.id,
      );
      if (ids.length === 0) return;
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", ids);
      const list = (profs ?? []) as MemberOption[];
      setMembers(list);
      setProfMap(new Map(list.map((p) => [p.user_id, p])));
    })();
  }, [user]);

  // Garante profiles dos devedores existentes
  useEffect(() => {
    const missing = devedores
      .map((d) => d.user_id)
      .filter((id) => !profMap.has(id));
    if (missing.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", missing);
      const next = new Map(profMap);
      ((data ?? []) as MemberOption[]).forEach((p) => next.set(p.user_id, p));
      setProfMap(next);
    })();
  }, [devedores, profMap]);

  const handleAdd = async () => {
    if (!selectedUser) {
      toast.error("Selecione um jogador");
      return;
    }
    setBusy(true);
    const { error } = await marcarDevedor({
      user_id: selectedUser,
      valor: Number(valor.replace(",", ".")) || 0,
      motivo: motivo.trim() || undefined,
    });
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Jogador marcado como devedor");
    setShowAdd(false);
    setSelectedUser("");
    setValor("");
    setMotivo("");
  };

  const devendo = devedores.filter((d) => d.status === "devendo");
  const pagos = devedores.filter((d) => d.status === "pago");

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" /> Lei do Cão · Devedores
        </h2>
        {!showAdd && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-3 h-3 mr-1" /> Marcar
          </Button>
        )}
      </div>

      {showAdd && (
        <Card className="p-3 space-y-2 border-orange-500/40">
          <div>
            <label className="text-[10px] uppercase text-muted-foreground font-bold">
              Jogador
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full mt-1 px-2 py-1.5 rounded-md border border-border bg-background text-sm"
            >
              <option value="">Selecione…</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase text-muted-foreground font-bold">
                Valor R$
              </label>
              <Input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                className="h-9 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground font-bold">
                Motivo
              </label>
              <Input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Racha 21/04…"
                className="h-9 text-sm mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => setShowAdd(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button size="sm" className="flex-1" onClick={handleAdd} disabled={busy}>
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : "Marcar como devedor"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Devedores ficam bloqueados de se inscrever em qualquer racha seu até quitarem.
          </p>
        </Card>
      )}

      {loading ? (
        <Card className="p-4 flex justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </Card>
      ) : devedores.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Sem devedores. Mantém assim 👌
        </Card>
      ) : (
        <div className="space-y-1.5">
          {[...devendo, ...pagos].map((d) => {
            const p = profMap.get(d.user_id);
            const isDevendo = d.status === "devendo";
            return (
              <Card
                key={d.id}
                className={`p-3 flex items-center gap-3 ${
                  isDevendo ? "border-orange-500/40 bg-orange-500/5" : "opacity-60"
                }`}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={p?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {(p?.display_name ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold truncate">
                      {p?.display_name ?? "Jogador"}
                    </span>
                    {isDevendo ? (
                      <Badge
                        variant="outline"
                        className="h-4 px-1.5 text-[9px] bg-orange-500/20 text-orange-500 border-orange-500/40"
                      >
                        Devendo
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="h-4 px-1.5 text-[9px] bg-green-500/20 text-green-500 border-green-500/40"
                      >
                        Quitado
                      </Badge>
                    )}
                  </div>
                  {d.motivo && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {d.motivo}
                    </p>
                  )}
                  {Number(d.valor) > 0 && (
                    <p className="text-[11px] font-bold tabular-nums text-orange-500">
                      R$ {Number(d.valor).toFixed(2).replace(".", ",")}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {isDevendo && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] px-2 border-green-500/40 text-green-500 hover:bg-green-500/10"
                        onClick={() =>
                          setZapTarget({
                            devedor_id: d.id,
                            user_id: d.user_id,
                            nome: p?.display_name ?? "Jogador",
                            valor: Number(d.valor),
                            motivo: d.motivo,
                          })
                        }
                      >
                        <MessageCircle className="w-3 h-3 mr-1" /> Zap
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] px-2 border-green-500/40 text-green-500 hover:bg-green-500/10"
                        onClick={async () => {
                          const { error } = await quitarDivida(d.id);
                          if (error) toast.error(error);
                          else toast.success("Dívida quitada");
                        }}
                      >
                        <Check className="w-3 h-3 mr-1" /> Quitar
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] px-2 text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      const { error } = await removerMarcacao(d.id);
                      if (error) toast.error(error);
                      else toast.success("Removido");
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

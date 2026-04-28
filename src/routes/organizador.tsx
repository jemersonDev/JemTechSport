import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, DollarSign, TrendingUp, Wallet, Loader2 } from "lucide-react";
import { DevedoresPanel } from "@/components/DevedoresPanel";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/organizador")({
  component: OrganizadorPage,
  head: () => ({
    meta: [
      { title: "Painel do organizador — JemTech Sports" },
      { name: "description", content: "Veja pagamentos recebidos e saldo do seu racha." },
    ],
  }),
});

type Pagamento = {
  id: string;
  status: string;
  metodo: string;
  valor_total: number;
  valor_organizador: number;
  valor_plataforma: number;
  created_at: string;
  paid_at: string | null;
  payer_user_id: string;
  payer_name?: string;
};

type Saldo = {
  total_devido_plataforma: number;
  total_recebido_plataforma: number;
};

function OrganizadorPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [saldo, setSaldo] = useState<Saldo>({
    total_devido_plataforma: 0,
    total_recebido_plataforma: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: pags }, { data: s }] = await Promise.all([
        supabase
          .from("pagamentos")
          .select(
            "id,status,metodo,valor_total,valor_organizador,valor_plataforma,created_at,paid_at,payer_user_id",
          )
          .eq("organizador_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("organizador_saldo")
          .select("total_devido_plataforma,total_recebido_plataforma")
          .eq("organizador_id", user.id)
          .maybeSingle(),
      ]);

      const list = pags ?? [];
      // resolver nomes dos pagadores
      const ids = Array.from(new Set(list.map((p) => p.payer_user_id)));
      let nameMap = new Map<string, string>();
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id,display_name")
          .in("user_id", ids);
        nameMap = new Map((profs ?? []).map((p) => [p.user_id, p.display_name]));
      }
      setPagamentos(
        list.map((p) => ({
          ...p,
          valor_total: Number(p.valor_total),
          valor_organizador: Number(p.valor_organizador),
          valor_plataforma: Number(p.valor_plataforma),
          payer_name: nameMap.get(p.payer_user_id) ?? "Jogador",
        })),
      );
      setSaldo({
        total_devido_plataforma: Number(s?.total_devido_plataforma ?? 0),
        total_recebido_plataforma: Number(s?.total_recebido_plataforma ?? 0),
      });
      setLoading(false);
    })();
  }, [user]);

  const aprovados = pagamentos.filter((p) => p.status === "aprovado");
  const totalRecebido = aprovados.reduce((s, p) => s + p.valor_organizador, 0);
  const totalPlataforma = aprovados.reduce((s, p) => s + p.valor_plataforma, 0);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-4 py-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5" /> Painel do organizador
          </h1>
        </div>
      </header>

      <main className="px-4 py-5 space-y-5 max-w-2xl mx-auto">
        {/* Cards de saldo */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Total recebido
            </div>
            <div className="text-2xl font-black tabular-nums">
              R$ {totalRecebido.toFixed(2).replace(".", ",")}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {aprovados.length} pagamento(s) aprovado(s)
            </div>
          </Card>
          <Card className="p-4 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Devido à plataforma
            </div>
            <div className="text-2xl font-black tabular-nums text-orange-500">
              R$ {saldo.total_devido_plataforma.toFixed(2).replace(".", ",")}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Plataforma já recebeu R$ {totalPlataforma.toFixed(2).replace(".", ",")} via PIX
            </div>
          </Card>
        </div>

        <Card className="p-4 bg-muted/30 border-dashed">
          <p className="text-xs text-muted-foreground">
            <strong>Como funciona:</strong> pagamentos via PIX vão direto para o Mercado Pago da
            plataforma. Pagamentos em dinheiro recebes na hora — mas a comissão da plataforma
            (acima) acumula como saldo devido.
          </p>
        </Card>

        {/* Lista */}
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
            Histórico de pagamentos
          </h2>
          {pagamentos.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Nenhum pagamento registrado ainda.
            </Card>
          ) : (
            <div className="space-y-1.5">
              {pagamentos.map((p) => (
                <Card key={p.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.payer_name}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      <span className="uppercase">{p.metodo === "pix_mp" ? "PIX" : p.metodo}</span>
                      <span>·</span>
                      <span>
                        {formatDistanceToNow(new Date(p.paid_at ?? p.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold tabular-nums">
                      R$ {p.valor_organizador.toFixed(2).replace(".", ",")}
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    aprovado: { label: "Pago", className: "bg-green-500/20 text-green-500 border-green-500/40" },
    pendente: {
      label: "Pendente",
      className: "bg-yellow-500/20 text-yellow-500 border-yellow-500/40",
    },
    recusado: { label: "Recusado", className: "bg-red-500/20 text-red-500 border-red-500/40" },
    reembolsado: {
      label: "Reembolsado",
      className: "bg-blue-500/20 text-blue-500 border-blue-500/40",
    },
    cancelado: {
      label: "Cancelado",
      className: "bg-muted text-muted-foreground border-border",
    },
  };
  const v = map[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={`${v.className} text-[9px] px-1.5 py-0 mt-0.5`}>
      {v.label}
    </Badge>
  );
}

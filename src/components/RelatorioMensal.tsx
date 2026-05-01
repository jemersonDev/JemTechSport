import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Loader2, TrendingUp, Users, AlertCircle, Trophy } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

type Pagamento = {
  id: string;
  status: string;
  metodo: string;
  valor_total: number;
  valor_organizador: number;
  valor_plataforma: number;
  paid_at: string | null;
  created_at: string;
  payer_user_id: string;
  racha_id: string;
};

type Devedor = {
  id: string;
  user_id: string;
  valor: number;
  motivo: string | null;
  status: string;
  created_at: string;
};

function monthsBack(n: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - n, 1);
}

function formatBRL(v: number) {
  return v.toFixed(2).replace(".", ",");
}

export function RelatorioMensal() {
  const { user } = useAuth();
  const [mesIdx, setMesIdx] = useState("0"); // 0 = mês atual
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [devedores, setDevedores] = useState<Devedor[]>([]);
  const [profMap, setProfMap] = useState<Map<string, string>>(new Map());
  const [rachaMap, setRachaMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const { inicio, fim, label } = useMemo(() => {
    const back = parseInt(mesIdx, 10);
    const start = monthsBack(back);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const lbl = start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return { inicio: start, fim: end, label: lbl };
  }, [mesIdx]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: pags }, { data: devs }] = await Promise.all([
        supabase
          .from("pagamentos")
          .select("id,status,metodo,valor_total,valor_organizador,valor_plataforma,paid_at,created_at,payer_user_id,racha_id")
          .eq("organizador_id", user.id)
          .gte("created_at", inicio.toISOString())
          .lt("created_at", fim.toISOString())
          .order("created_at", { ascending: false }),
        supabase
          .from("devedores")
          .select("id,user_id,valor,motivo,status,created_at")
          .eq("organizador_id", user.id)
          .eq("status", "devendo"),
      ]);

      const list = (pags ?? []).map((p) => ({
        ...p,
        valor_total: Number(p.valor_total),
        valor_organizador: Number(p.valor_organizador),
        valor_plataforma: Number(p.valor_plataforma),
      }));
      const dList = (devs ?? []).map((d) => ({ ...d, valor: Number(d.valor) }));
      setPagamentos(list);
      setDevedores(dList);

      const userIds = Array.from(
        new Set([...list.map((p) => p.payer_user_id), ...dList.map((d) => d.user_id)]),
      );
      const rachaIds = Array.from(new Set(list.map((p) => p.racha_id)));

      const [{ data: profs }, { data: rachas }] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("user_id,display_name").in("user_id", userIds)
          : Promise.resolve({ data: [] as any[] }),
        rachaIds.length
          ? supabase.from("rachas").select("id,name").in("id", rachaIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      setProfMap(new Map((profs ?? []).map((p) => [p.user_id, p.display_name])));
      setRachaMap(new Map((rachas ?? []).map((r) => [r.id, r.name])));
      setLoading(false);
    })();
  }, [user, inicio, fim]);

  const aprovados = pagamentos.filter((p) => p.status === "aprovado");
  const totalRecebido = aprovados.reduce((s, p) => s + p.valor_organizador, 0);
  const totalPlataforma = aprovados.reduce((s, p) => s + p.valor_plataforma, 0);
  const totalDevedores = devedores.reduce((s, d) => s + d.valor, 0);
  const jogadoresUnicos = new Set(aprovados.map((p) => p.payer_user_id)).size;

  const exportarPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(20, 20, 30);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("JemTech Sports", 14, 18);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Relatorio Mensal · ${label}`, 14, 28);

      // Resumo
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo", 14, 55);

      autoTable(doc, {
        startY: 60,
        head: [["Indicador", "Valor"]],
        body: [
          ["Total recebido", `R$ ${formatBRL(totalRecebido)}`],
          ["Comissao da plataforma", `R$ ${formatBRL(totalPlataforma)}`],
          ["Pagamentos aprovados", String(aprovados.length)],
          ["Jogadores unicos", String(jogadoresUnicos)],
          ["Devedores em aberto", `${devedores.length} (R$ ${formatBRL(totalDevedores)})`],
        ],
        theme: "grid",
        headStyles: { fillColor: [99, 102, 241] },
      });

      // Pagamentos
      const lastY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Pagamentos do mes", 14, lastY);

      autoTable(doc, {
        startY: lastY + 5,
        head: [["Data", "Jogador", "Racha", "Metodo", "Valor", "Status"]],
        body: pagamentos.map((p) => [
          new Date(p.paid_at ?? p.created_at).toLocaleDateString("pt-BR"),
          profMap.get(p.payer_user_id) ?? "—",
          rachaMap.get(p.racha_id) ?? "—",
          p.metodo === "pix_mp" ? "PIX" : p.metodo,
          `R$ ${formatBRL(p.valor_organizador)}`,
          p.status === "aprovado" ? "Pago" : p.status,
        ]),
        theme: "striped",
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 9 },
      });

      // Devedores
      if (devedores.length > 0) {
        const y2 = (doc as any).lastAutoTable.finalY + 10;
        if (y2 > 250) doc.addPage();
        const startY = y2 > 250 ? 20 : y2;
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("Devedores em aberto", 14, startY);
        autoTable(doc, {
          startY: startY + 5,
          head: [["Jogador", "Motivo", "Valor"]],
          body: devedores.map((d) => [
            profMap.get(d.user_id) ?? "—",
            d.motivo ?? "—",
            `R$ ${formatBRL(d.valor)}`,
          ]),
          theme: "striped",
          headStyles: { fillColor: [249, 115, 22] },
          styles: { fontSize: 9 },
        });
      }

      // Footer
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `Gerado em ${new Date().toLocaleString("pt-BR")} · pagina ${i}/${pages}`,
          14,
          doc.internal.pageSize.getHeight() - 8,
        );
      }

      doc.save(`relatorio-${label.replace(/\s/g, "-")}.pdf`);
      toast.success("Relatório exportado!");
    } catch (e: any) {
      toast.error("Erro ao exportar: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
          <FileText className="w-3 h-3" /> Relatório Mensal
        </h2>
        <div className="flex items-center gap-2">
          <Select value={mesIdx} onValueChange={setMesIdx}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const d = monthsBack(i);
                return (
                  <SelectItem key={i} value={String(i)}>
                    {d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={exportarPDF}
            disabled={exporting || loading}
          >
            {exporting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Download className="w-3 h-3 mr-1" /> PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-6 flex justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="p-3 space-y-1">
            <div className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Recebido
            </div>
            <div className="text-lg font-black tabular-nums">R$ {formatBRL(totalRecebido)}</div>
            <div className="text-[10px] text-muted-foreground">{aprovados.length} pagamento(s)</div>
          </Card>
          <Card className="p-3 space-y-1">
            <div className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> Jogadores
            </div>
            <div className="text-lg font-black tabular-nums">{jogadoresUnicos}</div>
            <div className="text-[10px] text-muted-foreground">únicos no mês</div>
          </Card>
          <Card className="p-3 space-y-1">
            <div className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
              <Trophy className="w-3 h-3" /> Plataforma
            </div>
            <div className="text-lg font-black tabular-nums">R$ {formatBRL(totalPlataforma)}</div>
            <div className="text-[10px] text-muted-foreground">comissão</div>
          </Card>
          <Card className="p-3 space-y-1">
            <div className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Devedores
            </div>
            <div className="text-lg font-black tabular-nums text-orange-500">
              R$ {formatBRL(totalDevedores)}
            </div>
            <div className="text-[10px] text-muted-foreground">{devedores.length} em aberto</div>
          </Card>
        </div>
      )}
    </section>
  );
}

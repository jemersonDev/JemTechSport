import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  useUserRachas,
  useActiveRachaId,
  createRacha,
  joinByInviteCode,
  type Racha,
} from "@/hooks/useRacha";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AddressMap } from "@/components/AddressMap";
import { AssiduidadeRanking } from "@/components/AssiduidadeRanking";
import {
  ArrowLeft,
  Plus,
  Loader2,
  KeyRound,
  Trophy,
  MapPin,
  Calendar,
  Users,
  Check,
  Clock,
  LayoutGrid,
  Share2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { shareRachaViaWhatsApp } from "@/utils/shareRacha";

export const Route = createFileRoute("/rachas")({
  component: RachasPage,
  head: () => ({
    meta: [
      { title: "Meus rachas — JemTech Sports" },
      { name: "description", content: "Crie um racha ou entre com o código de convite." },
    ],
  }),
});

const FIELD_MODES: { id: "futsal" | "society" | "campo"; label: string; sub: string }[] = [
  { id: "futsal", label: "Quadra", sub: "Futsal · 5x5" },
  { id: "society", label: "Society", sub: "7x7" },
  { id: "campo", label: "Campo", sub: "11x11" },
];

const VAGAS_OPCOES = [10, 12, 14, 16, 20];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Próximos 7 dias (incluindo hoje)
function nextDays(n: number): Date[] {
  const out: Date[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(d);
  }
  return out;
}

const HORARIOS = [
  "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00", "21:30",
  "22:00", "22:30",
];

function RachasPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { rachas, loading, reload } = useUserRachas();
  const { activeRachaId, setActiveRachaId } = useActiveRachaId();

  // Estatísticas: # de inscritos por racha
  const [counts, setCounts] = useState<Record<string, { total: number; paid: number }>>({});

  useEffect(() => {
    if (rachas.length === 0) {
      setCounts({});
      return;
    }
    (async () => {
      const ids = rachas.map((r) => r.id);
      const { data } = await supabase
        .from("inscricoes")
        .select("racha_id, paid")
        .in("racha_id", ids);
      const map: Record<string, { total: number; paid: number }> = {};
      (data ?? []).forEach((i) => {
        const k = i.racha_id;
        if (!map[k]) map[k] = { total: 0, paid: 0 };
        map[k].total += 1;
        if (i.paid) map[k].paid += 1;
      });
      setCounts(map);
    })();
  }, [rachas]);

  const [mode, setMode] = useState<"list" | "create" | "join">("list");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  const handlePick = (r: Racha) => {
    setActiveRachaId(r.id);
    toast.success(`Racha "${r.name}" selecionado`);
    navigate({ to: "/" });
  };

  const handleDelete = async (r: Racha) => {
    const ok = window.confirm(
      `Remover o racha "${r.name}"?\n\nIsso apaga inscrições, pagamentos e histórico. Não dá pra desfazer.`,
    );
    if (!ok) return;
    const { error } = await supabase.from("rachas").delete().eq("id", r.id);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
      return;
    }
    if (activeRachaId === r.id) setActiveRachaId(null);
    toast.success("Racha removido");
    await reload();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="font-semibold">Meus rachas</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {mode === "list" && (
          <>
            {rachas.length === 0 ? (
              <Card className="p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Trophy className="w-7 h-7 text-primary" />
                </div>
                <h2 className="font-semibold">Nenhum racha ainda</h2>
                <p className="text-sm text-muted-foreground">
                  Crie um novo racha ou entre com um código de convite.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {rachas.map((r) => {
                  const c = counts[r.id] ?? { total: 0, paid: 0 };
                  const pct = r.max_players > 0 ? (c.total / r.max_players) * 100 : 0;
                  const isActive = activeRachaId === r.id;
                  const isAdmin = user?.id === r.admin_id;
                  const finalizado = !!(r as { finalizado_em?: string | null }).finalizado_em;
                  const scheduledMs = r.scheduled_at ? new Date(r.scheduled_at).getTime() : null;
                  const emAndamento =
                    !finalizado &&
                    scheduledMs !== null &&
                    Date.now() >= scheduledMs - 30 * 60_000 &&
                    Date.now() <= scheduledMs + 3 * 60 * 60_000;
                  return (
                    <button
                      key={r.id}
                      onClick={() => handlePick(r)}
                      className={`w-full text-left rounded-2xl border-2 p-4 transition shadow-card ${
                        isActive
                          ? "border-neon bg-neon/5 shadow-neon"
                          : "border-border bg-graphite hover:border-neon/40"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        {finalizado ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border uppercase tracking-wider">
                            ✓ Finalizada
                          </span>
                        ) : emAndamento ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/40 uppercase tracking-wider animate-pulse">
                            🔴 Em andamento
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-neon/10 text-neon border border-neon/30 uppercase tracking-wider">
                            Aberto
                          </span>
                        )}
                        {isAdmin && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/40 uppercase tracking-wider">
                            👑 Administrador
                          </span>
                        )}
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold truncate text-foreground">{r.name}</h3>
                            {isActive && (
                              <Check className="w-4 h-4 text-neon shrink-0" strokeWidth={3} />
                            )}
                          </div>
                          {r.address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{r.address}</span>
                            </p>
                          )}
                          {r.scheduled_at && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3 shrink-0" />
                              {new Date(r.scheduled_at).toLocaleString("pt-BR", {
                                weekday: "short",
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-mono px-2 py-1 rounded bg-black/40 text-neon shrink-0 border border-neon/30">
                          {r.invite_code}
                        </span>
                      </div>

                      {/* Barra de progresso confirmados */}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span className="font-bold text-foreground">{c.total}</span>
                            <span>/{r.max_players} confirmados</span>
                          </span>
                          {c.paid > 0 && (
                            <span className="text-green-400 font-bold">
                              {c.paid} pagos ✅
                            </span>
                          )}
                        </div>
                        <div className="h-2 rounded-full bg-black/40 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-neon to-green-500 transition-all"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>

                      {/* Botão de compartilhar via WhatsApp */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          shareRachaViaWhatsApp(r);
                        }}
                        className="mt-3 flex items-center justify-center gap-2 py-2 rounded-lg border border-neon/30 bg-neon/5 text-neon text-xs font-bold hover:bg-neon/10 transition cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Convidar galera no WhatsApp
                      </div>
                      {(r as { whatsapp_group_link?: string | null }).whatsapp_group_link && (
                        <a
                          href={(r as { whatsapp_group_link?: string }).whatsapp_group_link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2 flex items-center justify-center gap-2 py-2 rounded-lg border border-[#25D366]/40 bg-[#25D366]/5 text-[#25D366] text-xs font-bold hover:bg-[#25D366]/10 transition"
                        >
                          💬 Abrir grupo do racha no WhatsApp
                        </a>
                      )}
                      {isAdmin && (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(r);
                          }}
                          className="mt-2 flex items-center justify-center gap-2 py-2 rounded-lg border border-red-500/40 bg-red-500/5 text-red-400 text-xs font-bold hover:bg-red-500/10 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remover este racha
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button onClick={() => setMode("create")} className="h-12">
                <Plus className="w-4 h-4" /> Criar racha
              </Button>
              <Button onClick={() => setMode("join")} variant="outline" className="h-12">
                <KeyRound className="w-4 h-4" /> Entrar com código
              </Button>
            </div>

            {/* Ranking de assiduidade do mês */}
            <div className="pt-2">
              <AssiduidadeRanking />
            </div>
          </>
        )}

        {mode === "create" && (
          <CreateRachaForm
            onCancel={() => setMode("list")}
            onCreated={async (r) => {
              await reload();
              setActiveRachaId(r.id);
              toast.success(`Racha "${r.name}" criado!`);
              navigate({ to: "/" });
            }}
          />
        )}

        {mode === "join" && (
          <JoinRachaForm
            onCancel={() => setMode("list")}
            onJoined={async (r) => {
              await reload();
              setActiveRachaId(r.id);
              toast.success(`Você entrou no "${r.name}"!`);
              navigate({ to: "/" });
            }}
          />
        )}
      </main>
    </div>
  );
}

function CreateRachaForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (r: Racha) => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldMode, setFieldMode] = useState<"futsal" | "society" | "campo">("society");
  const [maxPlayers, setMaxPlayers] = useState<number>(14);

  const days = useMemo(() => nextDays(7), []);
  const [selectedDay, setSelectedDay] = useState<Date>(days[0]);
  const [selectedTime, setSelectedTime] = useState<string>("20:00");

  const scheduledAtIso = useMemo(() => {
    const [hh, mm] = selectedTime.split(":").map(Number);
    const d = new Date(selectedDay);
    d.setHours(hh, mm, 0, 0);
    return d.toISOString();
  }, [selectedDay, selectedTime]);

  const handleCreate = async () => {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Coloca um nome no racha");
      return;
    }
    if (trimmed.length > 60) {
      toast.error("Nome muito longo (máx 60)");
      return;
    }
    setBusy(true);
    const { data, error } = await createRacha({
      admin_id: user.id,
      name: trimmed,
      address: address.trim() || undefined,
      location: address.trim() || undefined,
      scheduled_at: scheduledAtIso,
      field_mode: fieldMode,
      max_players: maxPlayers,
    });
    setBusy(false);
    if (error || !data) {
      toast.error("Erro: " + error);
      return;
    }
    onCreated(data);
  };

  const weekdays = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  return (
    <Card className="p-5 space-y-5 bg-graphite border-border">
      <div className="flex items-center gap-2">
        <Plus className="w-4 h-4 text-neon" />
        <h2 className="font-bold">Novo racha</h2>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Nome do racha *
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Racha Atlanta segunda 20:30"
          maxLength={60}
        />
      </div>

      {/* Modalidade */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <LayoutGrid className="w-3 h-3" /> Modalidade
        </label>
        <div translate="no" className="notranslate grid grid-cols-3 gap-2">
          {FIELD_MODES.map((m) => {
            const active = fieldMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                translate="no"
                onClick={() => setFieldMode(m.id)}
                className={`notranslate py-3 rounded-xl border-2 text-center transition ${
                  active
                    ? "border-neon bg-neon/15 shadow-neon"
                    : "border-border bg-background hover:border-neon/40"
                }`}
              >
                <p translate="no" className={`notranslate text-xs font-black uppercase tracking-wider leading-none ${active ? "text-neon" : "text-foreground"}`}>
                  {m.label}
                </p>
                <p translate="no" className="notranslate text-[9px] mt-1 leading-none text-muted-foreground">{m.sub}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Data — pills horizontais */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Calendar className="w-3 h-3" /> Data
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scroll-smooth">
          {days.map((d) => {
            const active =
              d.toDateString() === selectedDay.toDateString();
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => setSelectedDay(d)}
                className={`shrink-0 px-4 py-2.5 rounded-full border-2 text-center transition ${
                  active
                    ? "border-neon bg-neon text-black shadow-neon"
                    : "border-border bg-background text-foreground hover:border-neon/40"
                }`}
              >
                <p className="text-[10px] uppercase font-bold leading-none">
                  {weekdays[d.getDay()]}.
                </p>
                <p className="text-xs font-black mt-0.5 leading-none">
                  {pad(d.getDate())} {months[d.getMonth()]}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Horário — grade */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3 h-3" /> Horário
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {HORARIOS.map((h) => {
            const active = selectedTime === h;
            return (
              <button
                key={h}
                type="button"
                onClick={() => setSelectedTime(h)}
                className={`py-2 rounded-lg border-2 text-xs font-bold transition ${
                  active
                    ? "border-neon bg-neon text-black shadow-neon"
                    : "border-border bg-background text-foreground hover:border-neon/40"
                }`}
              >
                {h}
              </button>
            );
          })}
        </div>
      </div>

      {/* Vagas */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Users className="w-3 h-3" /> Vagas
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {VAGAS_OPCOES.map((v) => {
            const active = maxPlayers === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setMaxPlayers(v)}
                className={`py-2.5 rounded-lg border-2 text-sm font-black transition ${
                  active
                    ? "border-neon bg-neon text-black shadow-neon"
                    : "border-border bg-background text-foreground hover:border-neon/40"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      {/* Endereço */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3 h-3" /> Endereço
        </label>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Ex: R. Barão da Ponte Alta, 1871"
          maxLength={200}
        />
        <AddressMap address={address} height={160} className="pt-1" />
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button onClick={handleCreate} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar racha"}
        </Button>
      </div>
    </Card>
  );
}

function JoinRachaForm({
  onCancel,
  onJoined,
}: {
  onCancel: () => void;
  onJoined: (r: Racha) => void;
}) {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const handleJoin = async () => {
    if (!user) return;
    setBusy(true);
    const { data, error } = await joinByInviteCode(code, user.id);
    setBusy(false);
    if (error || !data) {
      toast.error(error ?? "Erro ao entrar");
      return;
    }
    onJoined(data);
  };

  return (
    <Card className="p-5 space-y-4">
      <h2 className="font-bold flex items-center gap-2">
        <KeyRound className="w-4 h-4" /> Entrar com código
      </h2>
      <p className="text-xs text-muted-foreground">
        Peça pro organizador o código de 6 caracteres do racha.
      </p>
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ABCD23"
        maxLength={6}
        className="text-center text-lg font-mono tracking-widest uppercase"
      />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button onClick={handleJoin} disabled={busy || code.length !== 6}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
        </Button>
      </div>
    </Card>
  );
}

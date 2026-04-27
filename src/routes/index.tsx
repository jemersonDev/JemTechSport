import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  X,
  Shuffle,
  Trash2,
  MapPin,
  Send,
  DollarSign,
  Users,
  Camera,
  Shield,
  User as UserIcon,
  LayoutGrid,
  Trophy,
  Clipboard,
  Check,
  Calculator,
  QrCode,
  CreditCard,
  Loader2,
  KeyRound,
  Bell,
} from "lucide-react";
import { SoccerField, type Player, type FieldMode } from "@/components/SoccerField";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRacha, useActiveRachaId, SKILL_WEIGHT, type JogadorManual } from "@/hooks/useRacha";
import { useNotificacoes } from "@/hooks/useNotificacoes";
import { PixPaymentDialog } from "@/components/PixPaymentDialog";
import { ManualPlayersEditor } from "@/components/ManualPlayersEditor";
import { smartShuffle } from "@/utils/smartShuffle";
import { toast } from "sonner";

type TabId = "tactical" | "roster" | "match";

const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: "tactical", label: "Tático", icon: LayoutGrid },
  { id: "roster", label: "Elenco", icon: Users },
  { id: "match", label: "Partida", icon: Trophy },
];

const PIX_TYPE_LABEL = {
  cpf: "CPF",
  telefone: "Telefone",
  email: "E-mail",
  aleatoria: "Chave aleatória",
} as const;

const PIX_TYPES: { id: keyof typeof PIX_TYPE_LABEL; label: string }[] = [
  { id: "telefone", label: "Telefone" },
  { id: "cpf", label: "CPF" },
  { id: "email", label: "E-mail" },
  { id: "aleatoria", label: "Aleatória" },
];

const FIELD_MODES: { id: FieldMode; label: string; sub: string }[] = [
  { id: "futsal", label: "Quadra", sub: "Futsal · 5x5" },
  { id: "society", label: "Society", sub: "7x7" },
  { id: "campo", label: "Campo", sub: "11x11" },
];

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "JemTech Sports — Organize seu Racha de Futebol" },
      {
        name: "description",
        content:
          "Sorteie times, calcule o valor por jogador, marque gols e mande tudo pro Zap. O app tático para o seu racha.",
      },
      { property: "og:title", content: "JemTech Sports — Racha sem zica" },
      {
        property: "og:description",
        content: "Sorteio de times, divisão financeira e placar ao vivo num só lugar.",
      },
    ],
  }),
});

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function Index() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { activeRachaId, setActiveRachaId } = useActiveRachaId();
  const { unreadCount: notifUnread } = useNotificacoes();
  const {
    racha,
    inscricoes,
    manuais,
    myInscricao,
    isAdmin,
    joinList,
    leaveList,
    togglePaid,
    removeInscricao,
    updateRacha,
    addManual,
    removeManual,
    toggleManualPaid,
  } = useRacha(activeRachaId);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, authLoading, navigate]);

  const [pixOpen, setPixOpen] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newName, setNewName] = useState("");
  const [totalValue, setTotalValue] = useState<string>("140");
  const [location, setLocation] = useState<string>("");
  const [teamA, setTeamA] = useState<Player[]>([]);
  const [teamB, setTeamB] = useState<Player[]>([]);
  const [reserves, setReserves] = useState<Player[]>([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [fieldMode, setFieldMode] = useState<FieldMode>("society");

  // Sync local players list from racha inscricoes + jogadores manuais (com skill e paid)
  useEffect(() => {
    if (!activeRachaId) return;
    const fromInsc: Player[] = inscricoes.map((i) => ({
      id: i.user_id,
      name: i.display_name,
      photo: i.avatar_url ?? undefined,
      isGoalkeeper: i.position === "goleiro" || i.preferred_position_ext === "goleiro",
      goals: 0,
      paid: i.paid,
      skill: SKILL_WEIGHT[i.skill_level] ?? 2,
    }));
    const fromManual: Player[] = manuais.map((m) => ({
      id: `manual-${m.id}`,
      name: m.name,
      isGoalkeeper: m.position === "goleiro",
      goals: 0,
      paid: m.paid,
      skill: SKILL_WEIGHT[m.skill_level] ?? 2,
    }));
    setPlayers([...fromInsc, ...fromManual]);
  }, [inscricoes, manuais, activeRachaId]);

  // Sync location/total/field from racha
  useEffect(() => {
    if (!racha) return;
    if (racha.location || racha.address) {
      setLocation(racha.address || racha.location || "");
    }
    if (racha.total_value > 0) setTotalValue(String(racha.total_value));
    if (racha.field_mode) setFieldMode(racha.field_mode);
  }, [racha]);


  const TEAM_SIZE: Record<FieldMode, number> = {
    futsal: 5,
    society: 7,
    campo: 11,
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [photoTargetId, setPhotoTargetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("roster");
  const [shareCopied, setShareCopied] = useState(false);

  // PIX
  type PixKeyType = "cpf" | "telefone" | "email" | "aleatoria";
  const [pixKey, setPixKey] = useState<string>("");
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("telefone");
  const [pixOwner, setPixOwner] = useState<string>("");
  const [pixCopied, setPixCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("jemtech_pix");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.key) setPixKey(data.key);
        if (data.type) setPixKeyType(data.type);
        if (data.owner) setPixOwner(data.owner);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "jemtech_pix",
        JSON.stringify({ key: pixKey, type: pixKeyType, owner: pixOwner }),
      );
    } catch {
      /* ignore */
    }
  }, [pixKey, pixKeyType, pixOwner]);

  const APP_FEE = 0.2; // taxa interna — não exibir na UI
  // Valor exibido aos jogadores: apenas o rateio puro da quadra (sem taxa do app)
  const valuePerPerson = useMemo(() => {
    const total = parseFloat(totalValue.replace(",", ".")) || 0;
    if (players.length === 0 || total === 0) return 0;
    return total / players.length;
  }, [totalValue, players.length]);

  const goalkeeperCount = useMemo(
    () => players.filter((p) => p.isGoalkeeper).length,
    [players],
  );
  const teamsReady = teamA.length > 0 || teamB.length > 0;

  function addPlayer() {
    const name = newName.trim();
    if (!name) return;
    setPlayers((p) => [...p, { id: uid(), name, goals: 0 }]);
    setNewName("");
  }

  function removePlayer(id: string) {
    setPlayers((p) => p.filter((x) => x.id !== id));
    setTeamA((t) => t.filter((x) => x.id !== id));
    setTeamB((t) => t.filter((x) => x.id !== id));
    setReserves((t) => t.filter((x) => x.id !== id));
  }

  function openPhotoPicker(playerId: string) {
    setPhotoTargetId(playerId);
    fileInputRef.current?.click();
  }

  function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const targetId = photoTargetId;
    e.target.value = "";
    if (!file || !targetId) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const apply = (list: Player[]) =>
          list.map((p) => (p.id === targetId ? { ...p, photo: dataUrl } : p));
        setPlayers(apply);
        setTeamA(apply);
        setTeamB(apply);
        setReserves(apply);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  function toggleGoalkeeper(id: string) {
    const apply = (list: Player[]) =>
      list.map((p) => (p.id === id ? { ...p, isGoalkeeper: !p.isGoalkeeper } : p));
    setPlayers(apply);
    setTeamA(apply);
    setTeamB(apply);
    setReserves(apply);
  }

  function shuffleTeams() {
    if (players.length < 2) return;
    const { teamA: tA, teamB: tB, reserves: rs } = smartShuffle(players, TEAM_SIZE[fieldMode]);
    setTeamA(tA);
    setTeamB(tB);
    setReserves(rs);
    setScoreA(0);
    setScoreB(0);
    setActiveTab("tactical");
    toast.success("Times equilibrados por nível! ⚖️");
  }

  // Auto-escalação: sempre que jogadores ou modalidade mudam, monta times automaticamente
  // (goleiros fixos + linha pelo tamanho da modalidade).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (players.length < 2) return;
    // Só re-sorteia se a composição (ids) ou modalidade realmente mudou
    const ids = players.map((p) => p.id).sort().join("|");
    const currentIds = [...teamA, ...teamB, ...reserves].map((p) => p.id).sort().join("|");
    if (ids === currentIds && teamA.length + teamB.length > 0) return;
    const { teamA: tA, teamB: tB, reserves: rs } = smartShuffle(players, TEAM_SIZE[fieldMode]);
    setTeamA(tA);
    setTeamB(tB);
    setReserves(rs);
  }, [players, fieldMode]);

  function clearAll() {
    setPlayers([]);
    setTeamA([]);
    setTeamB([]);
    setReserves([]);
    setScoreA(0);
    setScoreB(0);
    setNewName("");
  }

  function handleGoalChange(playerId: string, delta: number) {
    const updater = (list: Player[]) =>
      list.map((p) => (p.id === playerId ? { ...p, goals: Math.max(0, p.goals + delta) } : p));
    setTeamA(updater);
    setTeamB(updater);
  }

  function buildShareText() {
    const total = parseFloat(totalValue.replace(",", ".")) || 0;
    const lines: string[] = [];

    // ===== Cabeçalho estilo "Racha Atlanta segunda 20:30* data 03/04/2026" =====
    const rachaName = racha?.name?.trim() || "Racha JemTech";
    let header = `*${rachaName}*`;
    if (racha?.scheduled_at) {
      const d = new Date(racha.scheduled_at);
      const weekdays = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
      const wd = weekdays[d.getDay()];
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const yy = d.getFullYear();
      header = `*${rachaName} ${wd} ${hh}:${mm}* data ${dd}/${mo}/${yy}`;
    }
    lines.push(header);
    lines.push("");
    lines.push("");

    // ===== Regras / avisos =====
    const maxP = racha?.max_players ?? 12;
    lines.push(`*${maxP} atletas já fecha a lista*`);
    lines.push("");
    lines.push("*retirar o nome da lista até domingo*");
    lines.push("");
    lines.push("*Pagamento antecipado pra segurar o horário da quadra*");
    lines.push("");

    // Local (se tiver)
    if (location.trim() || racha?.address || racha?.location) {
      const loc = location.trim() || racha?.address || racha?.location || "";
      lines.push(`📍 *Local:* ${loc}`);
      lines.push(
        `🗺️ Maps: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`,
      );
      lines.push("");
    }

    // ===== Goleiros =====
    const goleiros = inscricoes.filter((i) => i.position === "goleiro");
    const linha = inscricoes.filter((i) => i.position === "linha");

    if (goleiros.length > 0) {
      lines.push("Goleiros:");
      goleiros.forEach((g) => {
        const paid = g.paid ? " ✅" : "";
        lines.push(`🧤${g.display_name}${paid}`);
      });
      lines.push("");
    }

    // ===== Jogadores numerados =====
    if (linha.length > 0) {
      lines.push("Jogadores:");
      linha.forEach((p, idx) => {
        const paid = p.paid ? " ✅" : "";
        lines.push(`⚽️${idx + 1} ${p.display_name}${paid}`);
      });
      lines.push("");
    }

    // ===== Times sorteados (se houver) =====
    if (teamA.length > 0 || teamB.length > 0) {
      lines.push("");
      lines.push(`🟢 *TIME A* (${scoreA})`);
      teamA.forEach((p) =>
        lines.push(
          `• ${p.name}${p.isGoalkeeper ? " 🧤" : ""}${p.goals > 0 ? ` ⚽x${p.goals}` : ""}`,
        ),
      );
      lines.push("");
      lines.push(`🔵 *TIME B* (${scoreB})`);
      teamB.forEach((p) =>
        lines.push(
          `• ${p.name}${p.isGoalkeeper ? " 🧤" : ""}${p.goals > 0 ? ` ⚽x${p.goals}` : ""}`,
        ),
      );
      if (reserves.length > 0) {
        lines.push("");
        lines.push(`⏳ *RESERVAS* (${reserves.length})`);
        reserves.forEach((p) =>
          lines.push(`• ${p.name}${p.isGoalkeeper ? " 🧤" : ""}`),
        );
      }
    }

    // ===== Financeiro =====
    if (total > 0 && inscricoes.length > 0) {
      lines.push("");
      lines.push(`💰 *Total:* R$ ${total.toFixed(2).replace(".", ",")}`);
      lines.push(
        `💵 *Por pessoa:* R$ ${valuePerPerson.toFixed(2).replace(".", ",")}`,
      );
    }

    // ===== PIX =====
    if (pixKey.trim()) {
      lines.push("");
      lines.push("💸 *PAGAMENTO PIX*");
      lines.push(`🔑 *${PIX_TYPE_LABEL[pixKeyType]}:* ${pixKey.trim()}`);
      if (pixOwner.trim()) lines.push(`👤 *Favorecido:* ${pixOwner.trim()}`);
    }

    lines.push("");
    lines.push("_Bora pro jogo! 🔥_");
    return lines.join("\n");
  }

  function sendToWhatsApp() {
    const text = encodeURIComponent(buildShareText());
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  async function copyShareText() {
    try {
      await navigator.clipboard.writeText(buildShareText());
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  async function copyPixKey() {
    if (!pixKey.trim()) return;
    try {
      await navigator.clipboard.writeText(pixKey.trim());
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const profileInitials = (profile?.display_name ?? "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handlePhotoSelected}
      />

      {/* ============== TOP NAV (sticky) ============== */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-lg border-b border-border">
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-neon flex items-center justify-center shadow-neon shrink-0">
              <span className="text-black font-black text-sm tracking-tight">JT</span>
            </div>
            <Link
              to="/rachas"
              className="leading-tight min-w-0 hover:opacity-80 transition"
              title="Trocar de racha"
            >
              <h1 className="text-base font-black tracking-tight truncate">
                <span className="text-neon">JemTech</span> Sports
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">
                {racha ? "Toque pra trocar racha" : "Racha sem zica"}
              </p>
            </Link>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:inline">
              {players.length} {players.length === 1 ? "jogador" : "jogadores"}
            </span>
            <Link
              to="/notificacoes"
              aria-label="Notificações"
              className="relative w-9 h-9 rounded-full bg-secondary/40 flex items-center justify-center text-foreground hover:bg-secondary transition"
            >
              <Bell className="w-4 h-4" />
              {notifUnread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-neon text-black text-[9px] font-black flex items-center justify-center shadow-neon">
                  {notifUnread > 9 ? "9+" : notifUnread}
                </span>
              )}
            </Link>
            <Link
              to="/perfil"
              aria-label="Meu perfil"
              className="rounded-full ring-2 ring-transparent hover:ring-neon/60 transition"
            >
              <Avatar className="w-9 h-9">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.display_name ?? "Perfil"} />
                <AvatarFallback className="text-xs bg-secondary text-foreground">
                  {profileInitials || "??"}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>

        {/* Bloco centralizado de info do evento — atualiza em tempo real */}
        {racha && (
          <div className="mx-auto max-w-2xl px-4 pb-3">
            <div className="rounded-xl bg-graphite/70 border border-neon/30 px-4 py-3 text-center space-y-1 shadow-card">
              <h2 className="text-base font-black text-neon tracking-tight truncate leading-tight">
                {racha.name}
              </h2>
              <p className="text-xs text-foreground/90 font-semibold tabular-nums">
                {racha.scheduled_at
                  ? new Date(racha.scheduled_at).toLocaleString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "📅 Defina a data e hora"}
              </p>
              {(racha.address || racha.location) ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(racha.address || racha.location || "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-neon transition max-w-full"
                  title={racha.address || racha.location || ""}
                >
                  <MapPin className="w-3 h-3 text-neon shrink-0" strokeWidth={2.5} />
                  <span className="truncate">{racha.address || racha.location}</span>
                </a>
              ) : (
                <p className="text-[11px] text-muted-foreground inline-flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" /> Adicione o endereço
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <nav className="mx-auto max-w-2xl px-4 pb-2">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-graphite border border-border">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                    active
                      ? "bg-neon text-black shadow-neon"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* ============== MAIN ============== */}
      <main className="mx-auto max-w-2xl px-4 py-5 pb-10">
        {/* ─────────────── TAB: TÁTICO ─────────────── */}
        {activeTab === "tactical" && (
          <div className="space-y-5">
            {/* Placar ao vivo removido a pedido do usuário */}

            {/* Modality */}
            <section className="space-y-2">
              <SectionTitle icon={LayoutGrid} title="Modalidade" />
              <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-graphite border border-border">
                {FIELD_MODES.map((m) => {
                  const active = fieldMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setFieldMode(m.id)}
                      className={`py-2.5 rounded-lg text-center transition ${
                        active
                          ? "bg-neon text-black shadow-neon"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <p className="text-xs font-black uppercase tracking-wider leading-none">
                        {m.label}
                      </p>
                      <p
                        className={`text-[9px] mt-1 leading-none ${active ? "text-black/70" : "text-muted-foreground"}`}
                      >
                        {m.sub}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Field */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <SectionTitle icon={Trophy} title="Escalação" />
                <div className="flex items-center gap-3 text-[10px]">
                  <Legend color="var(--team-a)" label="A" />
                  <Legend color="var(--team-b)" label="B" />
                  <Legend color="var(--keeper)" label="GK" />
                </div>
              </div>
              <SoccerField
                teamA={teamA}
                teamB={teamB}
                mode={fieldMode}
                onGoalChange={handleGoalChange}
              />
              {!teamsReady && (
                <p className="text-center text-xs text-muted-foreground italic pt-1">
                  Adicione jogadores e sorteie pra ver a formação aqui.
                </p>
              )}
            </section>

            {/* Reservas — agrupados em times (colunas) */}
            {teamsReady && reserves.length > 0 && (() => {
              const size = TEAM_SIZE[fieldMode];
              const groups: typeof reserves[] = [];
              for (let i = 0; i < reserves.length; i += size) {
                groups.push(reserves.slice(i, i + size));
              }
              const teamLabels = ["C", "D", "E", "F", "G", "H", "I", "J"];
              return (
                <section className="rounded-2xl bg-graphite border border-border p-4 shadow-card space-y-3">
                  <div className="flex items-center justify-between">
                    <SectionTitle icon={Users} title="Reservas" />
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon/15 text-neon font-bold">
                      {groups.length} {groups.length === 1 ? "time" : "times"} · {reserves.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground -mt-1">
                    Próximos times que entram — organizados em colunas de {size}.
                  </p>
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(groups.length, 2)}, minmax(0, 1fr))`,
                    }}
                  >
                    {groups.map((group, gi) => (
                      <div
                        key={gi}
                        className="rounded-xl bg-secondary/40 border border-border p-2 space-y-1.5"
                      >
                        <div className="flex items-center justify-between px-1 pb-1 border-b border-border/60">
                          <span className="text-[10px] font-black uppercase tracking-wider text-neon">
                            Time {teamLabels[gi] ?? gi + 3}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-semibold">
                            {group.length}/{size}
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {group.map((p, i) => (
                            <li
                              key={p.id}
                              className="flex items-center gap-1.5 rounded-md bg-black/30 px-1.5 py-1"
                            >
                              <span className="w-4 h-4 rounded-full bg-neon/20 text-neon text-[9px] font-black flex items-center justify-center shrink-0">
                                {i + 1}
                              </span>
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-black/40 flex items-center justify-center shrink-0 ring-1 ring-border">
                                {p.photo ? (
                                  <img
                                    src={p.photo}
                                    alt={p.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <UserIcon className="w-3 h-3 text-muted-foreground" />
                                )}
                              </div>
                              <span className="text-[11px] font-semibold text-foreground truncate flex-1 min-w-0">
                                {p.name.split(" ")[0]}
                              </span>
                              {p.isGoalkeeper && (
                                <Shield className="w-2.5 h-2.5 text-keeper shrink-0" strokeWidth={3} />
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })()}

            {/* Quick actions */}
            <section className="grid grid-cols-2 gap-3">
              <button
                onClick={shuffleTeams}
                disabled={players.length < 2}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary border border-border text-foreground font-bold uppercase tracking-wider text-sm hover:border-neon/50 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Shuffle className="w-4 h-4" strokeWidth={2.5} />
                Re-sortear
              </button>
              <button
                onClick={() => setActiveTab("roster")}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary border border-border text-foreground font-bold uppercase tracking-wider text-sm hover:border-neon/50 active:scale-95 transition"
              >
                <Users className="w-4 h-4" strokeWidth={2.5} />
                Editar elenco
              </button>
            </section>

            {/* Mandar pro Zap — aparece só depois do sorteio */}
            {teamsReady && (
              <button
                onClick={sendToWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-neon text-black font-black uppercase tracking-widest text-base shadow-neon-strong hover:brightness-110 active:scale-[0.98] transition"
              >
                <Send className="w-5 h-5" strokeWidth={2.5} />
                Mandar pro Zap
                <span className="text-xl">📱</span>
              </button>
            )}
          </div>
        )}

        {/* ─────────────── TAB: ELENCO ─────────────── */}
        {activeTab === "roster" && (
          <div className="space-y-5">
            {!activeRachaId || !racha ? (
              <section className="rounded-2xl bg-graphite border border-border p-6 shadow-card text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-neon/15 flex items-center justify-center mx-auto">
                  <Trophy className="w-7 h-7 text-neon" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Nenhum racha selecionado</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Crie um racha ou entre com um código pra ver a lista.
                  </p>
                </div>
                <Link
                  to="/rachas"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-neon text-black font-bold uppercase tracking-wider text-sm shadow-neon hover:brightness-110 active:scale-95 transition"
                >
                  <Users className="w-4 h-4" strokeWidth={2.5} />
                  Meus rachas
                </Link>
              </section>
            ) : (
              <>
                {/* Lista do racha */}
                <section className="rounded-2xl bg-graphite border border-border p-5 shadow-card space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <SectionTitle icon={Users} title="Lista do racha" />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {isAdmin ? "Você é o organizador. " : ""}
                        Cada jogador entra na própria lista.
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-neon/15 text-neon font-bold whitespace-nowrap">
                        {inscricoes.length}/{racha.max_players}
                      </span>
                    </div>
                  </div>

                  {/* Código de convite */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(racha.invite_code);
                      toast.success("Código copiado!");
                    }}
                    className="w-full flex items-center justify-between gap-3 rounded-xl bg-black/40 border border-neon/30 px-4 py-3 hover:border-neon/60 transition"
                  >
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Código de convite
                    </span>
                    <span className="font-mono font-black text-lg text-neon tracking-widest">
                      {racha.invite_code}
                    </span>
                    <Clipboard className="w-4 h-4 text-muted-foreground" />
                  </button>

                  {/* Data/hora — admin define, todos veem */}
                  {isAdmin ? (
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1.5">
                        Data e hora do racha
                      </label>
                      <input
                        type="datetime-local"
                        value={
                          racha.scheduled_at
                            ? new Date(
                                new Date(racha.scheduled_at).getTime() -
                                  new Date(racha.scheduled_at).getTimezoneOffset() * 60000,
                              )
                                .toISOString()
                                .slice(0, 16)
                            : ""
                        }
                        onChange={async (e) => {
                          const v = e.target.value;
                          const iso = v ? new Date(v).toISOString() : null;
                          const { error } = await updateRacha({ scheduled_at: iso });
                          if (error) toast.error(error);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:border-neon focus:ring-2 focus:ring-neon/30 transition"
                      />
                    </div>
                  ) : racha.scheduled_at ? (
                    <div className="rounded-xl bg-black/40 border border-border px-4 py-3 text-center">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                        Quando
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {new Date(racha.scheduled_at).toLocaleString("pt-BR", {
                          weekday: "long",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ) : null}

                  {/* Botões: vou jogar / sair / pago */}
                  {!myInscricao ? (
                    <div className="space-y-2">
                      <p className="text-xs text-center text-muted-foreground">
                        Você ainda não está na lista
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={async () => {
                            const { error } = await joinList("linha");
                            if (error) toast.error(error);
                            else toast.success("Bora pro racha! ⚽");
                          }}
                          disabled={inscricoes.length >= racha.max_players}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-neon text-black font-bold uppercase tracking-wider text-sm shadow-neon hover:brightness-110 active:scale-95 transition disabled:opacity-40"
                        >
                          ⚽ Vou jogar (Linha)
                        </button>
                        <button
                          onClick={async () => {
                            const { error } = await joinList("goleiro");
                            if (error) toast.error(error);
                            else toast.success("No gol! 🧤");
                          }}
                          disabled={inscricoes.length >= racha.max_players}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-keeper text-black font-bold uppercase tracking-wider text-sm hover:brightness-110 active:scale-95 transition disabled:opacity-40"
                        >
                          🧤 Goleiro
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {!myInscricao.paid && (
                        <button
                          onClick={() => setPixOpen(true)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-wider text-sm hover:brightness-110 active:scale-95 transition"
                        >
                          <QrCode className="w-4 h-4" /> Pagar com PIX
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={async () => {
                            const { error } = await togglePaid(!myInscricao.paid);
                            if (error) toast.error(error);
                            else toast.success(myInscricao.paid ? "Pagamento desmarcado" : "Pago! ✅");
                          }}
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition active:scale-95 ${
                            myInscricao.paid
                              ? "bg-green-500/20 border border-green-500 text-green-400"
                              : "bg-secondary border border-border text-foreground hover:border-green-500/60"
                          }`}
                        >
                          {myInscricao.paid ? (
                            <>
                              <Check className="w-4 h-4" strokeWidth={3} /> Pago
                            </>
                          ) : (
                            <>
                              <DollarSign className="w-4 h-4" /> Dinheiro
                            </>
                          )}
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm("Sair do racha?")) return;
                            const { error } = await leaveList();
                            if (error) toast.error(error);
                            else toast.success("Você saiu da lista");
                          }}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary border border-border text-muted-foreground hover:bg-destructive hover:border-destructive hover:text-destructive-foreground active:scale-95 transition uppercase tracking-wider text-sm font-bold"
                        >
                          <X className="w-4 h-4" strokeWidth={2.5} />
                          Sair
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lista de inscritos: goleiros e linha */}
                  <div className="max-h-[55vh] overflow-y-auto space-y-3 pr-1 -mr-1 scroll-smooth">
                    {inscricoes.length === 0 ? (
                      <div className="text-center py-10 px-4">
                        <div className="w-14 h-14 rounded-full bg-secondary border border-border flex items-center justify-center mx-auto mb-3">
                          <UserIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Sem ninguém na lista ainda. Seja o primeiro! 🥇
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Goleiros */}
                        {inscricoes.filter((i) => i.position === "goleiro").length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-keeper px-1">
                              🧤 Goleiros
                            </p>
                            {inscricoes
                              .filter((i) => i.position === "goleiro")
                              .map((i, idx) => (
                                <RachaListItem
                                  key={i.id}
                                  index={idx + 1}
                                  inscricao={i}
                                  isMe={i.user_id === user?.id}
                                  isAdmin={isAdmin}
                                  showPosition="goleiro"
                                  onRemove={async () => {
                                    if (!confirm(`Remover ${i.display_name} do racha?`)) return;
                                    const { error } = await removeInscricao(i.user_id);
                                    if (error) toast.error(error);
                                  }}
                                />
                              ))}
                          </div>
                        )}

                        {/* Linha */}
                        {inscricoes.filter((i) => i.position === "linha").length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-neon px-1">
                              ⚽ Jogadores
                            </p>
                            {inscricoes
                              .filter((i) => i.position === "linha")
                              .map((i, idx) => (
                                <RachaListItem
                                  key={i.id}
                                  index={idx + 1}
                                  inscricao={i}
                                  isMe={i.user_id === user?.id}
                                  isAdmin={isAdmin}
                                  showPosition="linha"
                                  onRemove={async () => {
                                    if (!confirm(`Remover ${i.display_name} do racha?`)) return;
                                    const { error } = await removeInscricao(i.user_id);
                                    if (error) toast.error(error);
                                  }}
                                />
                              ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={shuffleTeams}
                      disabled={players.length < 2}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-neon text-black font-bold uppercase tracking-wider text-sm shadow-neon hover:brightness-110 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      <Shuffle className="w-4 h-4" strokeWidth={2.5} />
                      Sortear times
                    </button>
                    <Link
                      to="/rachas"
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary border border-border text-foreground font-bold uppercase tracking-wider text-sm hover:border-neon/60 active:scale-95 transition"
                    >
                      <Trophy className="w-4 h-4" strokeWidth={2.5} />
                      Trocar racha
                    </Link>
                  </div>
                </section>

                {/* Editar elenco — apenas admin */}
                {isAdmin && (
                  <ManualPlayersEditor
                    manuais={manuais}
                    onAdd={addManual}
                    onRemove={removeManual}
                    onTogglePaid={toggleManualPaid}
                  />
                )}

                <div className="rounded-xl bg-graphite/60 border border-border px-4 py-3 text-[11px] text-muted-foreground space-y-1.5">
                  <p className="flex items-start gap-1.5">
                    <Shield className="w-3 h-3 mt-0.5 text-keeper shrink-0" />
                    <span>
                      <strong className="text-keeper">Goleiros</strong> aparecem separados — não entram no sorteio.
                    </span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <Check className="w-3 h-3 mt-0.5 text-green-400 shrink-0" />
                    <span>
                      <strong className="text-green-400">Verde</strong> = jogador já pagou via Pix.
                    </span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <KeyRound className="w-3 h-3 mt-0.5 text-neon shrink-0" />
                    <span>
                      Compartilhe o <strong className="text-neon">código de convite</strong> pra galera entrar na lista.
                    </span>
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─────────────── TAB: PARTIDA ─────────────── */}
        {activeTab === "match" && (
          <div className="space-y-5">
            {/* ============== PAINEL FINANCEIRO DO ORGANIZADOR ============== */}
            {isAdmin && racha && inscricoes.length > 0 && (
              <section className="rounded-2xl bg-gradient-to-br from-neon/10 via-graphite to-graphite border border-neon/40 p-5 shadow-card space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <SectionTitle icon={DollarSign} title="Painel do organizador" />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Quem pagou, quem deve, total arrecadado.
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] px-2 py-1 rounded-full bg-neon/20 text-neon font-bold uppercase tracking-wider">
                    Admin
                  </span>
                </div>

                {(() => {
                  const total = parseFloat(totalValue.replace(",", ".")) || 0;
                  const valorBase = inscricoes.length > 0 ? total / inscricoes.length : 0;
                  // Exibido sem a taxa interna do app
                  const valorComTaxa = valorBase;
                  const pagos = inscricoes.filter((i) => i.paid);
                  const devendo = inscricoes.filter((i) => !i.paid);
                  const arrecadado = pagos.length * valorComTaxa;
                  const aReceber = devendo.length * valorComTaxa;
                  const pct = inscricoes.length > 0 ? (pagos.length / inscricoes.length) * 100 : 0;

                  return (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-3 text-center">
                          <p className="text-[9px] uppercase tracking-widest text-green-400/80 mb-1">Pagaram</p>
                          <p className="text-2xl font-black text-green-400 leading-none">{pagos.length}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">R$ {arrecadado.toFixed(2).replace(".", ",")}</p>
                        </div>
                        <div className="rounded-xl bg-orange-500/10 border border-orange-500/30 p-3 text-center">
                          <p className="text-[9px] uppercase tracking-widest text-orange-400/80 mb-1">Devendo</p>
                          <p className="text-2xl font-black text-orange-400 leading-none">{devendo.length}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">R$ {aReceber.toFixed(2).replace(".", ",")}</p>
                        </div>
                        <div className="rounded-xl bg-neon/10 border border-neon/30 p-3 text-center">
                          <p className="text-[9px] uppercase tracking-widest text-neon/80 mb-1">Total</p>
                          <p className="text-2xl font-black text-neon leading-none">{inscricoes.length}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">de {racha.max_players}</p>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                          <span>Pagamentos</span>
                          <span className="text-neon font-bold">{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-black/40 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-green-500 to-neon transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      {devendo.length > 0 && (
                        <div className="rounded-xl bg-black/40 border border-orange-500/20 p-3 space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
                            ⚠️ Falta pagar ({devendo.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {devendo.map((d) => (
                              <span key={d.id} className="text-[11px] px-2 py-1 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30">
                                {d.position === "goleiro" ? "🧤" : "⚽"} {d.display_name}
                              </span>
                            ))}
                          </div>
                          <button
                            onClick={() => {
                              const nomes = devendo.map((d) => d.display_name).join(", ");
                              const valor = valorComTaxa.toFixed(2).replace(".", ",");
                              const lines = [
                                `⚠️ *Cobrança do racha — ${racha.name}*`,
                                "",
                                `Galera, falta pagar: ${nomes}`,
                                `💵 Valor por pessoa: R$ ${valor}`,
                              ];
                              if (pixKey.trim()) {
                                lines.push("");
                                lines.push(`🔑 *PIX (${PIX_TYPE_LABEL[pixKeyType]}):* ${pixKey.trim()}`);
                                if (pixOwner.trim()) lines.push(`👤 ${pixOwner.trim()}`);
                              }
                              lines.push("");
                              lines.push("_Bora fechar a grana! 💸_");
                              window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
                            }}
                            className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-orange-500 text-black font-bold uppercase tracking-wider text-xs hover:brightness-110 active:scale-95 transition"
                          >
                            <Send className="w-3.5 h-3.5" strokeWidth={2.5} />
                            Cobrar no Zap
                          </button>
                        </div>
                      )}

                      <div className="rounded-xl bg-black/60 border border-neon/30 p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Valor por pessoa</p>
                          <p className="text-xl font-black text-neon">R$ {valorComTaxa.toFixed(2).replace(".", ",")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Meta total</p>
                          <p className="text-xl font-black text-foreground">R$ {total.toFixed(2).replace(".", ",")}</p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </section>
            )}

            {/* ============== EDITAR RACHA (admin) ============== */}
            {isAdmin && racha && (
              <section className="rounded-2xl bg-graphite border border-border p-5 shadow-card space-y-4">
                <SectionTitle icon={Trophy} title="Editar racha" />

                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Nome do racha</label>
                  <input
                    type="text"
                    defaultValue={racha.name}
                    key={`name-${racha.id}-${racha.name}`}
                    onBlur={async (e) => {
                      const v = e.target.value.trim();
                      if (!v || v === racha.name) return;
                      const { error } = await updateRacha({ name: v });
                      if (error) toast.error(error);
                      else toast.success("Nome atualizado");
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:border-neon focus:ring-2 focus:ring-neon/30 transition"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Máximo de jogadores</label>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    defaultValue={racha.max_players}
                    key={`max-${racha.id}-${racha.max_players}`}
                    onBlur={async (e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!v || v === racha.max_players) return;
                      const { error } = await updateRacha({ max_players: v });
                      if (error) toast.error(error);
                      else toast.success("Limite atualizado");
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:border-neon focus:ring-2 focus:ring-neon/30 transition"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Modalidade</label>
                  <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-input border border-border">
                    {FIELD_MODES.map((m) => {
                      const active = racha.field_mode === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={async () => {
                            if (active) return;
                            const { error } = await updateRacha({ field_mode: m.id });
                            if (error) toast.error(error);
                            else {
                              setFieldMode(m.id);
                              toast.success(`Modalidade: ${m.label}`);
                            }
                          }}
                          className={`py-2 rounded-lg text-center transition ${
                            active ? "bg-neon text-black shadow-neon" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <p className="text-[11px] font-black uppercase tracking-wider leading-none">{m.label}</p>
                          <p className={`text-[9px] mt-1 leading-none ${active ? "text-black/70" : "text-muted-foreground"}`}>
                            {m.sub}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-2xl bg-graphite border border-border p-5 shadow-card space-y-4">
              <SectionTitle icon={DollarSign} title="Financeiro" />

              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">
                  Valor total do racha
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                    R$
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={totalValue}
                    onChange={(e) => setTotalValue(e.target.value)}
                    onBlur={async () => {
                      if (!isAdmin || !racha) return;
                      const v = parseFloat(totalValue.replace(",", ".")) || 0;
                      if (v === Number(racha.total_value)) return;
                      const { error } = await updateRacha({ total_value: v });
                      if (error) toast.error(error);
                      else toast.success("Valor salvo no racha");
                    }}
                    placeholder="140"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-input border border-border text-foreground text-lg font-bold focus:outline-none focus:border-neon focus:ring-2 focus:ring-neon/30 transition"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-black/60 border border-neon/30 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                    <Calculator className="w-3 h-3" /> Cada jogador paga
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {players.length} {players.length === 1 ? "pessoa" : "pessoas"}
                  </p>
                </div>
                <p className="text-3xl font-black text-neon text-glow">
                  R$ {valuePerPerson.toFixed(2).replace(".", ",")}
                </p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">
                  Endereço da quadra
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onBlur={async () => {
                      if (!isAdmin || !racha) return;
                      const v = location.trim();
                      if (v === (racha.address ?? "")) return;
                      const { error } = await updateRacha({ address: v || null, location: v || null });
                      if (error) toast.error(error);
                      else toast.success("Endereço salvo");
                    }}
                    placeholder="Ex: Quadra Atlanta, Rua X, 123"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:border-neon focus:ring-2 focus:ring-neon/30 transition"
                  />
                </div>
                {location.trim() && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.trim())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-xs font-bold uppercase tracking-wider hover:border-neon/50 active:scale-[0.98] transition"
                  >
                    <MapPin className="w-3.5 h-3.5 text-neon" strokeWidth={2.5} />
                    Abrir no Google Maps
                  </a>
                )}
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                  Cole o endereço da quadra (Atlanta, society ou qualquer outra) — a galera abre direto no Maps. 📍
                </p>
              </div>
            </section>

            <section className="rounded-2xl bg-graphite border border-border p-5 shadow-card space-y-3">
              <SectionTitle icon={Trophy} title="Resumo da partida" />
              {teamsReady ? (
                <div className="grid grid-cols-2 gap-3">
                  <TeamSummary
                    label="Time A"
                    color="var(--team-a)"
                    players={teamA}
                    score={scoreA}
                  />
                  <TeamSummary
                    label="Time B"
                    color="var(--team-b)"
                    players={teamB}
                    score={scoreB}
                  />
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground italic py-6">
                  Sorteie os times pra ver o resumo aqui.
                </p>
              )}
            </section>

            {/* PIX */}
            <section className="rounded-2xl bg-graphite border border-border p-5 shadow-card space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SectionTitle icon={QrCode} title="Pagamento PIX" />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Sua chave aparece junto na mensagem do Zap.
                  </p>
                </div>
                <span className="shrink-0 text-[10px] px-2 py-1 rounded-full bg-neon/15 text-neon font-bold flex items-center gap-1">
                  <CreditCard className="w-3 h-3" strokeWidth={2.5} /> Salvo
                </span>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">
                  Tipo de chave
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-input border border-border">
                  {PIX_TYPES.map((t) => {
                    const active = pixKeyType === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setPixKeyType(t.id)}
                        className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                          active
                            ? "bg-neon text-black shadow-neon"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">
                  Chave PIX
                </label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder={
                    pixKeyType === "telefone"
                      ? "(11) 99999-9999"
                      : pixKeyType === "cpf"
                        ? "000.000.000-00"
                        : pixKeyType === "email"
                          ? "voce@email.com"
                          : "Chave aleatória"
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:border-neon focus:ring-2 focus:ring-neon/30 transition"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">
                  Favorecido (opcional)
                </label>
                <input
                  type="text"
                  value={pixOwner}
                  onChange={(e) => setPixOwner(e.target.value)}
                  placeholder="Nome de quem recebe"
                  className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:border-neon focus:ring-2 focus:ring-neon/30 transition"
                />
              </div>

              {pixKey.trim() && (
                <div className="rounded-xl bg-black/60 border border-neon/30 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">
                        {PIX_TYPE_LABEL[pixKeyType]}
                      </p>
                      <p className="text-sm font-bold text-foreground truncate">
                        {pixKey.trim()}
                      </p>
                    </div>
                    {valuePerPerson > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">
                          Valor
                        </p>
                        <p className="text-lg font-black text-neon text-glow leading-none">
                          R$ {valuePerPerson.toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={copyPixKey}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-neon text-black font-bold uppercase tracking-wider text-xs shadow-neon hover:brightness-110 active:scale-95 transition"
                  >
                    {pixCopied ? (
                      <>
                        <Check className="w-4 h-4" strokeWidth={2.5} />
                        Chave copiada!
                      </>
                    ) : (
                      <>
                        <Clipboard className="w-4 h-4" strokeWidth={2.5} />
                        Copiar chave PIX
                      </>
                    )}
                  </button>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                💡 Cartão de crédito/débito? Use o app do seu banco com a chave PIX acima — a maioria
                aceita pagar PIX no crédito.
              </p>
            </section>

            <section className="space-y-2">
              <SectionTitle icon={Send} title="Compartilhar" />
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={sendToWhatsApp}
                  disabled={players.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-neon text-black font-black uppercase tracking-widest text-sm shadow-neon-strong hover:brightness-110 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <Send className="w-5 h-5" strokeWidth={2.5} />
                  Mandar pro Zap
                  <span className="text-lg">📱</span>
                </button>
                <button
                  onClick={copyShareText}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary border border-border text-foreground font-bold uppercase tracking-wider text-sm hover:border-neon/50 active:scale-95 transition"
                >
                  {shareCopied ? (
                    <>
                      <Check className="w-4 h-4 text-neon" strokeWidth={2.5} />
                      <span className="text-neon">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-4 h-4" strokeWidth={2.5} />
                      Copiar texto
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      <PixPaymentDialog
        inscricaoId={myInscricao?.id ?? null}
        open={pixOpen}
        onOpenChange={setPixOpen}
      />
    </div>
  );
}

/* ============================================================
   Subcomponents
   ============================================================ */

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: typeof LayoutGrid;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-neon" />
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground uppercase tracking-wider">{label}</span>
    </span>
  );
}

type RachaInscricao = {
  id: string;
  user_id: string;
  position: "goleiro" | "linha";
  paid: boolean;
  display_name: string;
  avatar_url: string | null;
};

function RachaListItem({
  index,
  inscricao,
  isMe,
  isAdmin,
  showPosition,
  onRemove,
}: {
  index: number;
  inscricao: RachaInscricao;
  isMe: boolean;
  isAdmin: boolean;
  showPosition: "goleiro" | "linha";
  onRemove: () => void;
}) {
  const initials = inscricao.display_name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const isKeeper = showPosition === "goleiro";
  const ringClass = isKeeper ? "ring-keeper" : "ring-neon/40";
  const numberClass = isKeeper
    ? "bg-keeper/20 text-keeper"
    : "bg-neon/20 text-neon";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
        inscricao.paid
          ? "bg-green-500/5 border-green-500/40"
          : "bg-secondary/60 border-border"
      } ${isMe ? "ring-1 ring-neon/40" : ""}`}
    >
      <span
        className={`w-6 h-6 rounded-full ${numberClass} text-[10px] font-black flex items-center justify-center shrink-0 tabular-nums`}
      >
        {isKeeper ? "🧤" : index}
      </span>

      <div
        className={`w-10 h-10 rounded-full overflow-hidden ring-2 ${ringClass} bg-black/40 flex items-center justify-center shrink-0`}
      >
        {inscricao.avatar_url ? (
          <img
            src={inscricao.avatar_url}
            alt={inscricao.display_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-[11px] font-bold text-muted-foreground">
            {initials || "??"}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
          {inscricao.display_name}
          {isMe && (
            <span className="text-[9px] font-bold uppercase text-neon bg-neon/15 px-1.5 py-0.5 rounded">
              você
            </span>
          )}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-wider leading-none mt-0.5 text-muted-foreground">
          {isKeeper ? "Goleiro" : "Linha"}
        </p>
      </div>

      {inscricao.paid ? (
        <span
          className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center shrink-0"
          title="Já pagou"
        >
          <Check className="w-4 h-4" strokeWidth={3} />
        </span>
      ) : (
        <span
          className="w-8 h-8 rounded-lg bg-secondary/40 text-muted-foreground/40 flex items-center justify-center shrink-0"
          title="Aguardando pagamento"
        >
          <DollarSign className="w-4 h-4" />
        </span>
      )}

      {isAdmin && !isMe && (
        <button
          onClick={onRemove}
          className="w-8 h-8 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive hover:text-destructive-foreground transition flex items-center justify-center shrink-0"
          aria-label={`Remover ${inscricao.display_name}`}
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

function TeamScore({
  label,
  color,
  score,
  onMinus,
  onPlus,
}: {
  label: string;
  color: string;
  score: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="text-center">
      <p
        className="text-[10px] uppercase tracking-widest font-bold mb-1.5"
        style={{ color }}
      >
        {label}
      </p>
      <p className="text-5xl font-black text-foreground tabular-nums leading-none mb-2">
        {score}
      </p>
      <div className="flex items-center justify-center gap-1.5">
        <button
          onClick={onMinus}
          className="w-7 h-7 rounded-lg bg-secondary text-foreground hover:bg-muted transition flex items-center justify-center text-base font-bold"
        >
          −
        </button>
        <button
          onClick={onPlus}
          className="w-7 h-7 rounded-lg text-black font-bold hover:brightness-110 transition flex items-center justify-center text-base"
          style={{ backgroundColor: color }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function TeamSummary({
  label,
  color,
  players,
  score,
}: {
  label: string;
  color: string;
  players: Player[];
  score: number;
}) {
  return (
    <div className="rounded-xl bg-secondary/40 border border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color }}
        >
          {label}
        </span>
        <span className="text-xl font-black tabular-nums">{score}</span>
      </div>
      <ul className="space-y-1">
        {players.map((p) => (
          <li
            key={p.id}
            className="text-xs text-foreground flex items-center gap-1.5"
          >
            {p.isGoalkeeper && <Shield className="w-3 h-3 text-keeper shrink-0" />}
            <span className="truncate flex-1 min-w-0">{p.name}</span>
            {p.goals > 0 && (
              <span className="text-neon font-bold shrink-0">⚽{p.goals}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

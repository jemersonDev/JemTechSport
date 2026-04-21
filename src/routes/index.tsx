import { createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
import { SoccerField, type Player, type FieldMode } from "@/components/SoccerField";

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
  const [players, setPlayers] = useState<Player[]>([]);
  const [newName, setNewName] = useState("");
  const [totalValue, setTotalValue] = useState<string>("140");
  const [location, setLocation] = useState<string>("");
  const [teamA, setTeamA] = useState<Player[]>([]);
  const [teamB, setTeamB] = useState<Player[]>([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [fieldMode, setFieldMode] = useState<FieldMode>("society");

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

  const APP_FEE = 0.2; // R$ 0,20 por jogador para manter o app no ar
  const valuePerPerson = useMemo(() => {
    const total = parseFloat(totalValue.replace(",", ".")) || 0;
    if (players.length === 0 || total === 0) return 0;
    return total / players.length + APP_FEE;
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
  }

  function shuffleTeams() {
    if (players.length < 2) return;

    const keepers = players.filter((p) => p.isGoalkeeper);
    const fieldPlayers = players.filter((p) => !p.isGoalkeeper);

    const shuffled = [...fieldPlayers].sort(() => Math.random() - 0.5);
    const half = Math.ceil(shuffled.length / 2);
    const fieldA = shuffled.slice(0, half);
    const fieldB = shuffled.slice(half);

    const shuffledKeepers = [...keepers].sort(() => Math.random() - 0.5);
    const keeperA = shuffledKeepers[0] ? [shuffledKeepers[0]] : [];
    const keeperB = shuffledKeepers[1] ? [shuffledKeepers[1]] : [];
    const extraKeepers = shuffledKeepers.slice(2);
    extraKeepers.forEach((k, i) => {
      const stripped = { ...k, isGoalkeeper: false };
      if (i % 2 === 0) fieldA.push(stripped);
      else fieldB.push(stripped);
    });

    setTeamA([...keeperA, ...fieldA].map((p) => ({ ...p, goals: 0 })));
    setTeamB([...keeperB, ...fieldB].map((p) => ({ ...p, goals: 0 })));
    setScoreA(0);
    setScoreB(0);
    setActiveTab("tactical");
  }

  function clearAll() {
    setPlayers([]);
    setTeamA([]);
    setTeamB([]);
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
    lines.push("⚽ *RACHA — JEMTECH SPORTS* ⚽");
    lines.push("");
    if (location.trim()) lines.push(`📍 *Local:* ${location.trim()}`);
    if (total > 0 && players.length > 0) {
      lines.push(`💰 *Total:* R$ ${total.toFixed(2).replace(".", ",")}`);
      lines.push(
        `👥 *Por pessoa:* R$ ${valuePerPerson.toFixed(2).replace(".", ",")} (${players.length} jogadores)`,
      );
    }
    lines.push("");
    if (teamA.length > 0 || teamB.length > 0) {
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
    } else if (players.length > 0) {
      lines.push("👥 *Confirmados:*");
      players.forEach((p) => lines.push(`• ${p.name}`));
    }
    if (pixKey.trim()) {
      lines.push("");
      lines.push("💸 *PAGAMENTO PIX*");
      lines.push(`🔑 *${PIX_TYPE_LABEL[pixKeyType]}:* ${pixKey.trim()}`);
      if (pixOwner.trim()) lines.push(`👤 *Favorecido:* ${pixOwner.trim()}`);
      if (valuePerPerson > 0) {
        lines.push(`💵 *Valor por pessoa:* R$ ${valuePerPerson.toFixed(2).replace(".", ",")}`);
      }
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
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neon flex items-center justify-center shadow-neon">
              <span className="text-black font-black text-sm tracking-tight">JT</span>
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-black tracking-tight">
                <span className="text-neon">JemTech</span> Sports
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Racha sem zica
              </p>
            </div>
          </div>

          {teamsReady ? (
            <div className="flex items-center gap-2 text-base font-black tabular-nums">
              <span className="text-[var(--team-a)]">{scoreA}</span>
              <span className="text-muted-foreground text-xs">×</span>
              <span className="text-[var(--team-b)]">{scoreB}</span>
            </div>
          ) : (
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {players.length} {players.length === 1 ? "jogador" : "jogadores"}
            </span>
          )}
        </div>

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
      <main className="mx-auto max-w-2xl px-4 py-5 pb-32">
        {/* ─────────────── TAB: TÁTICO ─────────────── */}
        {activeTab === "tactical" && (
          <div className="space-y-5">
            {/* Hero scoreboard */}
            <section className="rounded-2xl bg-graphite border border-border shadow-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Placar ao vivo
                </span>
                {location.trim() && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {location.trim()}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-4">
                <TeamScore
                  label="Time A"
                  color="var(--team-a)"
                  score={scoreA}
                  onMinus={() => setScoreA((s) => Math.max(0, s - 1))}
                  onPlus={() => setScoreA((s) => s + 1)}
                />
                <span className="text-3xl font-black text-muted-foreground">×</span>
                <TeamScore
                  label="Time B"
                  color="var(--team-b)"
                  score={scoreB}
                  onMinus={() => setScoreB((s) => Math.max(0, s - 1))}
                  onPlus={() => setScoreB((s) => s + 1)}
                />
              </div>
            </section>

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

            {/* Quick actions */}
            <section className="grid grid-cols-2 gap-3">
              <button
                onClick={shuffleTeams}
                disabled={players.length < 2}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-neon text-black font-bold uppercase tracking-wider text-sm shadow-neon hover:brightness-110 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
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
          </div>
        )}

        {/* ─────────────── TAB: ELENCO ─────────────── */}
        {activeTab === "roster" && (
          <div className="space-y-5">
            <section className="rounded-2xl bg-graphite border border-border p-5 shadow-card space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SectionTitle icon={Users} title="Elenco" />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Adicione jogadores e marque os goleiros fixos.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-neon/15 text-neon font-bold whitespace-nowrap">
                    {players.length} {players.length === 1 ? "jogador" : "jogadores"}
                  </span>
                  {goalkeeperCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-keeper/20 text-keeper font-bold flex items-center gap-1 whitespace-nowrap">
                      <Shield className="w-2.5 h-2.5" strokeWidth={3} />
                      {goalkeeperCount} {goalkeeperCount === 1 ? "goleiro" : "goleiros"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                  placeholder="Nome do jogador"
                  className="flex-1 px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:border-neon focus:ring-2 focus:ring-neon/30 transition"
                />
                <button
                  onClick={addPlayer}
                  className="w-12 h-12 rounded-xl bg-neon text-black flex items-center justify-center font-bold shadow-neon hover:brightness-110 active:scale-95 transition"
                  aria-label="Adicionar jogador"
                >
                  <Plus className="w-6 h-6" strokeWidth={3} />
                </button>
              </div>

              <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1 -mr-1 scroll-smooth">
                {players.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <div className="w-14 h-14 rounded-full bg-secondary border border-border flex items-center justify-center mx-auto mb-3">
                      <UserIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Sem jogadores ainda. Adicione a galera aí em cima 👆
                    </p>
                  </div>
                ) : (
                  players.map((p, i) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 rounded-xl bg-secondary/60 border px-3 py-2.5 transition ${p.isGoalkeeper ? "border-keeper/70" : "border-border hover:border-neon/50"}`}
                    >
                      <span className="w-5 text-center text-[10px] font-bold text-muted-foreground tabular-nums">
                        {i + 1}
                      </span>

                      <div className="relative shrink-0">
                        <button
                          onClick={() => openPhotoPicker(p.id)}
                          className={`w-11 h-11 rounded-full overflow-hidden ring-2 transition flex items-center justify-center bg-black/40 ${p.isGoalkeeper ? "ring-keeper" : "ring-neon/40 hover:ring-neon"}`}
                          aria-label={`Foto de ${p.name}`}
                        >
                          {p.photo ? (
                            <img
                              src={p.photo}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserIcon className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-neon flex items-center justify-center shadow-neon pointer-events-none">
                          <Camera className="w-2.5 h-2.5 text-black" strokeWidth={3} />
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {p.name}
                        </p>
                        <p
                          className={`text-[10px] font-bold uppercase tracking-wider leading-none mt-0.5 ${p.isGoalkeeper ? "text-keeper" : "text-muted-foreground"}`}
                        >
                          {p.isGoalkeeper ? "Goleiro fixo" : "Linha"}
                        </p>
                      </div>

                      <button
                        onClick={() => toggleGoalkeeper(p.id)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${
                          p.isGoalkeeper
                            ? "bg-keeper text-black"
                            : "bg-secondary border border-border text-muted-foreground hover:text-keeper hover:border-keeper/60"
                        }`}
                        aria-label={
                          p.isGoalkeeper
                            ? `Tirar ${p.name} do gol`
                            : `Marcar ${p.name} como goleiro`
                        }
                        title={p.isGoalkeeper ? "Goleiro (clique p/ tirar)" : "Marcar goleiro"}
                      >
                        <Shield className="w-4 h-4" strokeWidth={2.5} />
                      </button>

                      <button
                        onClick={() => removePlayer(p.id)}
                        className="w-9 h-9 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive hover:text-destructive-foreground transition flex items-center justify-center"
                        aria-label={`Remover ${p.name}`}
                      >
                        <X className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={shuffleTeams}
                  disabled={players.length < 2}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-neon text-black font-bold uppercase tracking-wider text-sm shadow-neon hover:brightness-110 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <Shuffle className="w-4 h-4" strokeWidth={2.5} />
                  Sortear
                </button>
                <button
                  onClick={clearAll}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary border border-border text-foreground font-bold uppercase tracking-wider text-sm hover:bg-destructive hover:border-destructive hover:text-destructive-foreground active:scale-95 transition"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                  Limpar
                </button>
              </div>
            </section>

            <div className="rounded-xl bg-graphite/60 border border-border px-4 py-3 text-[11px] text-muted-foreground space-y-1.5">
              <p className="flex items-start gap-1.5">
                <Shield className="w-3 h-3 mt-0.5 text-keeper shrink-0" />
                <span>
                  <strong className="text-keeper">Goleiros</strong> não entram no sorteio — vão
                  fixos (até 2).
                </span>
              </p>
              <p className="flex items-start gap-1.5">
                <Camera className="w-3 h-3 mt-0.5 text-neon shrink-0" />
                <span>
                  <strong className="text-neon">Toque na foto</strong> pra adicionar imagem do
                  jogador.
                </span>
              </p>
            </div>
          </div>
        )}

        {/* ─────────────── TAB: PARTIDA ─────────────── */}
        {activeTab === "match" && (
          <div className="space-y-5">
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
                  Local (opcional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Quadra do Zé, 19h"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:border-neon focus:ring-2 focus:ring-neon/30 transition"
                  />
                </div>
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
            </section>
          </div>
        )}
      </main>

      {/* ============== STICKY CTA ============== */}
      <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-gradient-to-t from-black via-black/95 to-transparent">
        <div className="mx-auto max-w-2xl">
          <button
            onClick={sendToWhatsApp}
            disabled={players.length === 0}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-neon text-black font-black uppercase tracking-widest text-base shadow-neon-strong hover:brightness-110 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Send className="w-5 h-5" strokeWidth={2.5} />
            Mandar pro Zap
            <span className="text-xl">📱</span>
          </button>
        </div>
      </div>
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

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import { SoccerField, type Player, type FieldMode } from "@/components/SoccerField";

type TabId = "tactical" | "roster" | "match";

const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: "tactical", label: "Tático", icon: LayoutGrid },
  { id: "roster", label: "Elenco", icon: Users },
  { id: "match", label: "Partida", icon: Trophy },
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

    // Resize to keep payload light (max 256px, JPEG)
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

  function removePhoto(playerId: string) {
    const apply = (list: Player[]) =>
      list.map((p) => (p.id === playerId ? { ...p, photo: undefined } : p));
    setPlayers(apply);
    setTeamA(apply);
    setTeamB(apply);
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

    // Shuffle field players randomly
    const shuffled = [...fieldPlayers].sort(() => Math.random() - 0.5);
    const half = Math.ceil(shuffled.length / 2);
    const fieldA = shuffled.slice(0, half);
    const fieldB = shuffled.slice(half);

    // Distribute keepers: 1 fixed per team. If only 1 keeper, goes to A.
    // If more than 2 keepers, extras join field rotation randomly.
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
      <div className="mx-auto max-w-2xl px-4 py-6 pb-32 space-y-5">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              <span className="text-neon text-glow">JemTech</span> Sports
            </h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Racha sem zica ⚽
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-neon flex items-center justify-center shadow-neon">
            <span className="text-black font-black text-lg">JT</span>
          </div>
        </header>

        {/* Financial card */}
        <section className="rounded-2xl bg-graphite border border-border p-5 shadow-card space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-neon" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Financeiro Tático
            </h2>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Valor total do racha</label>
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

          <div className="rounded-xl bg-black/60 border border-neon/30 p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
              Cada jogador paga
            </p>
            <p className="text-3xl font-black text-neon text-glow">
              R$ {valuePerPerson.toFixed(2).replace(".", ",")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {players.length} {players.length === 1 ? "jogador" : "jogadores"}
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

        {/* Soccer Field */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Escalação
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--team-a)]" />
                <span className="text-muted-foreground">Time A</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--team-b)]" />
                <span className="text-muted-foreground">Time B</span>
              </span>
            </div>
          </div>

          {/* Modality selector */}
          <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-graphite border border-border">
            {FIELD_MODES.map((m) => {
              const active = fieldMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setFieldMode(m.id)}
                  className={`py-2 rounded-lg text-center transition ${
                    active
                      ? "bg-neon text-black shadow-neon"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <p className="text-xs font-black uppercase tracking-wider leading-none">
                    {m.label}
                  </p>
                  <p
                    className={`text-[9px] mt-0.5 leading-none ${active ? "text-black/70" : "text-muted-foreground"}`}
                  >
                    {m.sub}
                  </p>
                </button>
              );
            })}
          </div>

          <SoccerField
            teamA={teamA}
            teamB={teamB}
            mode={fieldMode}
            onGoalChange={handleGoalChange}
          />


          {/* Scoreboard */}
          <div className="rounded-2xl bg-graphite border border-border p-4 shadow-card">
            <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Placar
            </p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-[var(--team-a)] font-bold mb-1">
                  Time A
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setScoreA((s) => Math.max(0, s - 1))}
                    className="w-7 h-7 rounded-lg bg-secondary text-foreground hover:bg-muted transition flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="text-4xl font-black text-foreground tabular-nums w-10 text-center">
                    {scoreA}
                  </span>
                  <button
                    onClick={() => setScoreA((s) => s + 1)}
                    className="w-7 h-7 rounded-lg bg-[var(--team-a)] text-black font-bold hover:brightness-110 transition flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
              <span className="text-2xl font-black text-muted-foreground">×</span>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-[var(--team-b)] font-bold mb-1">
                  Time B
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setScoreB((s) => Math.max(0, s - 1))}
                    className="w-7 h-7 rounded-lg bg-secondary text-foreground hover:bg-muted transition flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="text-4xl font-black text-foreground tabular-nums w-10 text-center">
                    {scoreB}
                  </span>
                  <button
                    onClick={() => setScoreB((s) => s + 1)}
                    className="w-7 h-7 rounded-lg bg-[var(--team-b)] text-black font-bold hover:brightness-110 transition flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Player management */}
        <section className="rounded-2xl bg-graphite border border-border p-5 shadow-card space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-neon" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Jogadores
            </h2>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-neon/15 text-neon font-bold">
              {players.length}
            </span>
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

          {/* Scrollable list */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 -mr-1 scroll-smooth">
            {players.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground italic py-8">
                Nenhum jogador ainda. Adicione a galera aí 👆
              </p>
            ) : (
              players.map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-xl bg-secondary/60 border px-3 py-2.5 transition ${p.isGoalkeeper ? "border-keeper/70" : "border-border hover:border-neon/50"}`}
                >
                  <div className="relative shrink-0">
                    <button
                      onClick={() => openPhotoPicker(p.id)}
                      className={`w-10 h-10 rounded-full overflow-hidden ring-2 transition flex items-center justify-center bg-black/40 ${p.isGoalkeeper ? "ring-keeper" : "ring-neon/40 hover:ring-neon"}`}
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
                  <div className="w-6 h-6 rounded-full bg-neon/20 text-neon font-bold flex items-center justify-center text-[10px] shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    {p.isGoalkeeper && (
                      <p className="text-[9px] font-bold uppercase tracking-wider text-keeper leading-none mt-0.5">
                        Goleiro fixo
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleGoalkeeper(p.id)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                      p.isGoalkeeper
                        ? "bg-keeper text-black shadow"
                        : "bg-secondary border border-border text-muted-foreground hover:text-keeper hover:border-keeper/60"
                    }`}
                    aria-label={
                      p.isGoalkeeper
                        ? `Tirar ${p.name} do gol`
                        : `Marcar ${p.name} como goleiro`
                    }
                    title={p.isGoalkeeper ? "Goleiro (clique p/ tirar)" : "Marcar como goleiro"}
                  >
                    <Shield className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => removePlayer(p.id)}
                    className="w-8 h-8 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive hover:text-destructive-foreground transition flex items-center justify-center"
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
      </div>

      {/* Sticky WhatsApp CTA */}
      <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-gradient-to-t from-black via-black/95 to-transparent">
        <div className="mx-auto max-w-2xl">
          <button
            onClick={sendToWhatsApp}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-neon text-black font-black uppercase tracking-widest text-base shadow-neon-strong hover:brightness-110 active:scale-[0.98] transition"
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

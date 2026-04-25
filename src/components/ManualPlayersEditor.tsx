import { useState } from "react";
import { Plus, Trash2, Check, DollarSign, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { JogadorManual, SkillLevel, PositionExt } from "@/hooks/useRacha";

const POSITIONS: { id: PositionExt; label: string; emoji: string }[] = [
  { id: "goleiro", label: "Goleiro", emoji: "🧤" },
  { id: "zagueiro", label: "Zagueiro", emoji: "🛡️" },
  { id: "meia", label: "Meia", emoji: "🎯" },
  { id: "atacante", label: "Atacante", emoji: "⚽" },
];

const SKILLS: { id: SkillLevel; label: string }[] = [
  { id: "iniciante", label: "Iniciante" },
  { id: "casual", label: "Casual" },
  { id: "bom_de_bola", label: "Bom" },
  { id: "craque", label: "Craque" },
];

interface Props {
  manuais: JogadorManual[];
  onAdd: (input: { name: string; position?: PositionExt; skill_level?: SkillLevel }) => Promise<{ error: string | null } | { error?: string }>;
  onRemove: (id: string) => Promise<{ error: string | null } | { error?: string }>;
  onTogglePaid: (id: string, paid: boolean) => Promise<{ error: string | null } | { error?: string }>;
}

export function ManualPlayersEditor({ manuais, onAdd, onRemove, onTogglePaid }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [position, setPosition] = useState<PositionExt>("meia");
  const [skill, setSkill] = useState<SkillLevel>("casual");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Digite o nome do jogador");
      return;
    }
    setSaving(true);
    const { error } = await onAdd({ name: trimmed, position, skill_level: skill });
    setSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    setName("");
    setPosition("meia");
    setSkill("casual");
    toast.success("Jogador adicionado!");
  }

  return (
    <section className="rounded-2xl bg-graphite border border-border p-5 shadow-card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-neon" strokeWidth={2.5} />
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
              Editar Elenco
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Adicione jogadores avulsos (que não usam o app).
          </p>
        </div>
        <span className="shrink-0 text-[10px] px-2 py-1 rounded-full bg-neon/15 text-neon font-bold whitespace-nowrap">
          {manuais.length} {manuais.length === 1 ? "avulso" : "avulsos"}
        </span>
      </div>

      {/* Botão pra abrir form */}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neon/10 border border-dashed border-neon/40 text-neon font-bold uppercase tracking-wider text-sm hover:bg-neon/20 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" strokeWidth={3} /> Adicionar jogador avulso
        </button>
      ) : (
        <div className="space-y-3 rounded-xl bg-black/30 border border-border p-3">
          <input
            type="text"
            placeholder="Nome do jogador"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:border-neon focus:ring-2 focus:ring-neon/30 transition"
            autoFocus
          />

          {/* Posição */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Posição</p>
            <div className="grid grid-cols-4 gap-1.5">
              {POSITIONS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPosition(p.id)}
                  className={`px-2 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition ${
                    position === p.id
                      ? "bg-neon text-black shadow-neon"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="text-base leading-none mb-0.5">{p.emoji}</div>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nível */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Nível técnico</p>
            <div className="grid grid-cols-4 gap-1.5">
              {SKILLS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSkill(s.id)}
                  className={`px-2 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition ${
                    skill === s.id
                      ? "bg-neon text-black shadow-neon"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !name.trim()}
              className="py-2.5 rounded-xl bg-neon text-black font-bold uppercase tracking-wider text-sm shadow-neon hover:brightness-110 active:scale-95 transition disabled:opacity-40"
            >
              {saving ? "Salvando..." : "Adicionar"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setName("");
              }}
              className="py-2.5 rounded-xl bg-secondary border border-border text-muted-foreground font-bold uppercase tracking-wider text-sm hover:text-foreground transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de manuais */}
      {manuais.length > 0 && (
        <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1 -mr-1">
          {manuais.map((m) => {
            const pos = POSITIONS.find((p) => p.id === m.position);
            const sk = SKILLS.find((s) => s.id === m.skill_level);
            return (
              <div
                key={m.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition ${
                  m.paid
                    ? "bg-green-500/10 border-green-500/40"
                    : "bg-black/30 border-border"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-base shrink-0">
                  {pos?.emoji ?? "⚽"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{m.name}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {pos?.label ?? "Meia"} · {sk?.label ?? "Casual"} · Avulso
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const { error } = await onTogglePaid(m.id, !m.paid);
                    if (error) toast.error(error);
                  }}
                  className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition ${
                    m.paid
                      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      : "bg-secondary text-muted-foreground hover:text-green-400"
                  }`}
                  title={m.paid ? "Desmarcar pagamento" : "Marcar como pago"}
                >
                  {m.paid ? <Check className="w-4 h-4" strokeWidth={3} /> : <DollarSign className="w-4 h-4" />}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`Remover ${m.name}?`)) return;
                    const { error } = await onRemove(m.id);
                    if (error) toast.error(error);
                    else toast.success("Jogador removido");
                  }}
                  className="shrink-0 w-8 h-8 rounded-lg bg-secondary text-muted-foreground hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition"
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

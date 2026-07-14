import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Sparkles, Trash2 } from "lucide-react";
import { QUICK_EMOJIS, searchTeams, type TeamMeta, type TeamSlot, defaultLabel } from "@/lib/teamMeta";

type Props = {
  open: boolean;
  slot: TeamSlot;
  initial: TeamMeta | null;
  onClose: () => void;
  onSave: (meta: TeamMeta | null) => Promise<void> | void;
};

export function TeamNameEditorDialog({ open, slot, initial, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [badge, setBadge] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setEmoji(initial?.emoji ?? null);
      setBadge(initial?.badge ?? null);
      setTeamId(initial?.teamId ?? null);
      setQuery("");
    }
  }, [open, initial]);

  const results = searchTeams(query || name, 6);

  const handleSave = async () => {
    setSaving(true);
    try {
      const clean = name.trim().slice(0, 24);
      if (!clean && !emoji && !badge) {
        await onSave(null);
      } else {
        await onSave({
          name: clean || null,
          emoji: emoji || null,
          badge: badge || null,
          teamId: teamId || null,
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await onSave(null);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-graphite border-neon/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-neon">
            <Sparkles className="w-4 h-4" />
            Personalizar {defaultLabel(slot)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-black/40 border border-border">
            {badge && (
              <img src={badge} alt="" crossOrigin="anonymous" className="w-10 h-10 object-contain" />
            )}
            {emoji && <span className="text-2xl">{emoji}</span>}
            <span className="text-lg font-black uppercase tracking-wider text-foreground">
              {name.trim() || defaultLabel(slot)}
            </span>
          </div>

          {/* Nome */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5 font-bold uppercase tracking-wider">
              Nome do time
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 24))}
              placeholder="Ex: Feras, Zica FC, Corinthians..."
              maxLength={24}
              className="bg-input"
            />
            <p className="text-[10px] text-muted-foreground mt-1">{name.length}/24 · use qualquer nome</p>
          </div>

          {/* Emoji */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5 font-bold uppercase tracking-wider">
              Emoji {emoji && <button onClick={() => setEmoji(null)} className="text-neon underline text-[10px] ml-2">limpar</button>}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition ${
                    emoji === e ? "bg-neon/20 ring-2 ring-neon" : "bg-black/40 hover:bg-black/60"
                  }`}
                  type="button"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Escudo automático */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5 font-bold uppercase tracking-wider">
              Escudo do time/seleção {badge && (
                <button onClick={() => { setBadge(null); setTeamId(null); }} className="text-neon underline text-[10px] ml-2">
                  remover
                </button>
              )}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar time (Flamengo, Real Madrid, Brasil...)"
                className="pl-9 bg-input"
              />
            </div>
            {results.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border bg-black/40 divide-y divide-border">
                {results.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setBadge(t.badge);
                      setTeamId(t.id);
                      if (!name.trim()) setName(t.name.slice(0, 24));
                      setQuery("");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neon/10 transition text-left"
                  >
                    <img src={t.badge} alt="" crossOrigin="anonymous" className="w-6 h-6 object-contain" />
                    <span className="flex-1 text-sm text-foreground">{t.name}</span>
                    <span className="text-[10px] text-muted-foreground">{t.country}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {(initial?.name || initial?.emoji || initial?.badge) && (
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={saving} className="text-orange-400">
              <Trash2 className="w-4 h-4 mr-1" /> Resetar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            <X className="w-4 h-4 mr-1" /> Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-neon text-black hover:brightness-110">
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useRef, useState } from "react";
import { Plus, Type, Smile, Trash2, Check } from "lucide-react";

export type Overlay = {
  id: string;
  type: "text" | "sticker";
  /** texto ou emoji */
  value: string;
  /** posição relativa 0..1 (centro) */
  x: number;
  y: number;
  /** tamanho em % da largura do vídeo (0..1) — afeta fontSize */
  scale: number;
  color?: string;
};

const STICKERS = ["⚽", "🔥", "🐐", "💪", "👑", "🎯", "💥", "😂", "😱", "🤡", "🥶", "🚀"];
const COLORS = ["#ffffff", "#fbbf24", "#22c55e", "#3b82f6", "#ef4444", "#a855f7"];

type Props = {
  videoUrl: string;
  initial?: Overlay[];
  onChange: (overlays: Overlay[]) => void;
};

/**
 * Editor visual de overlays: texto e stickers (emojis) por cima do vídeo.
 * Posicionamento por drag (touch + mouse).
 */
export function OverlayEditor({ videoUrl, initial = [], onChange }: Props) {
  const [overlays, setOverlays] = useState<Overlay[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picker, setPicker] = useState<"none" | "text" | "sticker">("none");
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState(COLORS[0]);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offX: number; offY: number } | null>(null);

  const update = (next: Overlay[]) => {
    setOverlays(next);
    onChange(next);
  };

  const addOverlay = (o: Overlay) => {
    const next = [...overlays, o];
    update(next);
    setSelectedId(o.id);
  };

  const remove = (id: string) => {
    update(overlays.filter((o) => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const setScale = (id: string, scale: number) => {
    update(overlays.map((o) => (o.id === id ? { ...o, scale } : o)));
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const target = overlays.find((o) => o.id === id);
    if (!target) return;
    dragRef.current = {
      id,
      offX: e.clientX - (rect.left + target.x * rect.width),
      offY: e.clientY - (rect.top + target.y * rect.height),
    };
    setSelectedId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;
    const rect = stage.getBoundingClientRect();
    const x = (e.clientX - drag.offX - rect.left) / rect.width;
    const y = (e.clientY - drag.offY - rect.top) / rect.height;
    update(
      overlays.map((o) =>
        o.id === drag.id
          ? { ...o, x: Math.min(0.95, Math.max(0.05, x)), y: Math.min(0.95, Math.max(0.05, y)) }
          : o,
      ),
    );
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const confirmText = () => {
    const v = textInput.trim();
    if (!v) {
      setPicker("none");
      return;
    }
    addOverlay({
      id: crypto.randomUUID(),
      type: "text",
      value: v.slice(0, 60),
      x: 0.5,
      y: 0.5,
      scale: 0.08,
      color: textColor,
    });
    setTextInput("");
    setPicker("none");
  };

  const selected = overlays.find((o) => o.id === selectedId);

  return (
    <div className="space-y-2">
      <div
        ref={stageRef}
        className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-black select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={() => setSelectedId(null)}
      >
        <video
          src={videoUrl}
          muted
          loop
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />
        {/* overlays */}
        {overlays.map((o) => (
          <div
            key={o.id}
            onPointerDown={(e) => handlePointerDown(e, o.id)}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(o.id);
            }}
            style={{
              left: `${o.x * 100}%`,
              top: `${o.y * 100}%`,
              transform: "translate(-50%, -50%)",
              fontSize: `${o.scale * 100}cqw`,
              color: o.color ?? "#fff",
              textShadow:
                o.type === "text" ? "0 2px 8px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,0.4)" : "none",
            }}
            className={`absolute touch-none cursor-move font-black leading-none ${
              selectedId === o.id ? "ring-2 ring-primary ring-offset-2 ring-offset-black/40 rounded-sm px-1" : ""
            }`}
          >
            {o.value}
          </div>
        ))}

        {/* delete bubble for selected */}
        {selected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              remove(selected.id);
            }}
            className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white shadow-lg"
            aria-label="Remover overlay"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* size slider para selecionado */}
      {selected && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <span className="text-xs text-muted-foreground">Tamanho</span>
          <input
            type="range"
            min={0.04}
            max={0.25}
            step={0.005}
            value={selected.scale}
            onChange={(e) => setScale(selected.id, Number(e.target.value))}
            className="flex-1 accent-primary"
          />
        </div>
      )}

      {/* toolbar */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPicker(picker === "text" ? "none" : "text")}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background py-2.5 text-sm font-medium hover:bg-muted"
        >
          <Type className="h-4 w-4" /> Texto
        </button>
        <button
          type="button"
          onClick={() => setPicker(picker === "sticker" ? "none" : "sticker")}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background py-2.5 text-sm font-medium hover:bg-muted"
        >
          <Smile className="h-4 w-4" /> Sticker
        </button>
      </div>

      {/* picker: texto */}
      {picker === "text" && (
        <div className="space-y-2 rounded-lg border border-border bg-card p-3">
          <input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value.slice(0, 60))}
            placeholder="Digita aí..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            autoFocus
          />
          <div className="flex items-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setTextColor(c)}
                style={{ background: c }}
                className={`h-7 w-7 rounded-full border-2 ${
                  textColor === c ? "border-primary scale-110" : "border-border"
                } transition`}
                aria-label={`Cor ${c}`}
              />
            ))}
            <button
              type="button"
              onClick={confirmText}
              className="ml-auto flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <Check className="h-3 w-3" /> Adicionar
            </button>
          </div>
        </div>
      )}

      {/* picker: stickers */}
      {picker === "sticker" && (
        <div className="grid grid-cols-6 gap-2 rounded-lg border border-border bg-card p-3">
          {STICKERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                addOverlay({
                  id: crypto.randomUUID(),
                  type: "sticker",
                  value: s,
                  x: 0.5,
                  y: 0.5,
                  scale: 0.18,
                });
                setPicker("none");
              }}
              className="aspect-square rounded-md text-3xl hover:bg-muted active:scale-95 transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {overlays.length === 0 && picker === "none" && (
        <p className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1">
          <Plus className="h-3 w-3" /> Adicione textos e stickers para deixar a resenha mais cheia
        </p>
      )}
    </div>
  );
}

/**
 * Componente read-only: renderiza overlays sobre um container relativo.
 * Use dentro de um `<div className="relative ...">` que contenha o vídeo.
 */
export function OverlayLayer({ overlays }: { overlays: Overlay[] }) {
  if (!overlays || overlays.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[5]" style={{ containerType: "inline-size" }}>
      {overlays.map((o) => (
        <div
          key={o.id}
          style={{
            position: "absolute",
            left: `${o.x * 100}%`,
            top: `${o.y * 100}%`,
            transform: "translate(-50%, -50%)",
            fontSize: `${o.scale * 100}cqw`,
            color: o.color ?? "#fff",
            textShadow:
              o.type === "text" ? "0 2px 8px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,0.4)" : "none",
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          {o.value}
        </div>
      ))}
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  useUserRachas,
  useActiveRachaId,
  createRacha,
  joinByInviteCode,
  type Racha,
} from "@/hooks/useRacha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AddressMap } from "@/components/AddressMap";
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
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/rachas")({
  component: RachasPage,
  head: () => ({
    meta: [
      { title: "Meus rachas — JemTech Sports" },
      { name: "description", content: "Crie um racha ou entre com o código de convite." },
    ],
  }),
});

function RachasPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { rachas, loading, reload } = useUserRachas();
  const { activeRachaId, setActiveRachaId } = useActiveRachaId();

  const [mode, setMode] = useState<"list" | "create" | "join">("list");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  const handlePick = (r: Racha) => {
    setActiveRachaId(r.id);
    toast.success(`Racha "${r.name}" selecionado`);
    navigate({ to: "/" });
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
              <div className="space-y-2">
                {rachas.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handlePick(r)}
                    className={`w-full text-left rounded-xl border p-4 transition hover:border-primary/50 ${
                      activeRachaId === r.id ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold truncate">{r.name}</h3>
                          {activeRachaId === r.id && (
                            <Check className="w-4 h-4 text-primary shrink-0" strokeWidth={3} />
                          )}
                        </div>
                        {r.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" /> {r.location}
                          </p>
                        )}
                        {r.scheduled_at && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />{" "}
                            {new Date(r.scheduled_at).toLocaleString("pt-BR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-mono px-2 py-1 rounded bg-muted text-muted-foreground shrink-0">
                        {r.invite_code}
                      </span>
                    </div>
                  </button>
                ))}
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
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState(false);

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
      location: location.trim() || undefined,
      address: address.trim() || undefined,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
    });
    setBusy(false);
    if (error || !data) {
      toast.error("Erro: " + error);
      return;
    }
    onCreated(data);
  };

  return (
    <Card className="p-5 space-y-4">
      <h2 className="font-bold flex items-center gap-2">
        <Plus className="w-4 h-4" /> Novo racha
      </h2>

      <div className="space-y-1.5">
        <label className="text-xs font-medium">Nome do racha *</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Racha Atlanta segunda 20:30"
          maxLength={60}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium">Local da quadra</label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ex: Atlanta Arena"
          maxLength={80}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium">Endereço (opcional)</label>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Ex: Av. Paulista 1000, São Paulo"
          maxLength={200}
        />
        <p className="text-[10px] text-muted-foreground">
          Mapa gerado automaticamente via OpenStreetMap (gratuito).
        </p>
        <AddressMap address={address} height={180} className="pt-1" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium">Data e horário</label>
        <Input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button onClick={handleCreate} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
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

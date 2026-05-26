import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, MapPin, Users, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/r/$code")({
  component: SharedRachaPage,
  head: () => ({
    meta: [
      { title: "Convite de racha — JemTech Sports" },
      { name: "description", content: "Você foi convidado para um racha. Entre agora!" },
      { property: "og:title", content: "🏟️ Convite de racha" },
      { property: "og:description", content: "Clica pra ver os detalhes e confirmar presença" },
    ],
  }),
});

type SharedRacha = {
  id: string;
  name: string;
  scheduled_at: string | null;
  location: string | null;
  address: string | null;
  max_players: number;
  field_mode: string;
  invite_code: string;
};

function SharedRachaPage() {
  const { code } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [racha, setRacha] = useState<SharedRacha | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .rpc("get_racha_by_invite", { _code: code });
      const r = Array.isArray(rows) ? rows[0] : rows;

      if (!r) {
        setLoading(false);
        return;
      }
      setRacha(r as SharedRacha);


      const { count } = await supabase
        .from("racha_membros")
        .select("id", { count: "exact", head: true })
        .eq("racha_id", r.id);
      setMemberCount(count ?? 0);

      if (user) {
        const { data: m } = await supabase
          .from("racha_membros")
          .select("id")
          .eq("racha_id", r.id)
          .eq("user_id", user.id)
          .maybeSingle();
        setAlreadyMember(!!m);
      }
      setLoading(false);
    })();
  }, [code, user]);

  const handleJoin = async () => {
    if (!user) {
      sessionStorage.setItem("pending_invite", code);
      navigate({ to: "/login" });
      return;
    }
    if (!racha) return;
    setJoining(true);
    const { error } = await supabase
      .from("racha_membros")
      .insert({ racha_id: racha.id, user_id: user.id, role: "jogador" });
    if (error && !error.message.includes("duplicate")) {
      toast.error(error.message);
    } else {
      toast.success("Bem-vindo ao racha! 🏟️");
      navigate({ to: "/rachas" });
    }
    setJoining(false);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!racha) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-2xl">🤷‍♂️</p>
        <p className="font-bold">Convite inválido</p>
        <p className="text-sm text-muted-foreground">
          Esse código não existe ou o racha foi removido.
        </p>
        <Link to="/" className="text-sm text-primary underline mt-2">
          Ir para a home
        </Link>
      </div>
    );
  }

  const dt = racha.scheduled_at ? new Date(racha.scheduled_at) : null;
  const dataStr = dt
    ? dt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })
    : "Data a definir";
  const horaStr = dt
    ? dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">⚽</div>
          <h1 className="text-2xl font-bold">Você foi convidado!</h1>
          <p className="text-sm text-muted-foreground mt-1">Pra jogar um racha 🔥</p>
        </div>

        <Card className="p-5 space-y-4 border-neon/40">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Racha</p>
            <p className="text-lg font-bold">{racha.name}</p>
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-neon shrink-0" />
              <span>
                {dataStr} {horaStr && `• ${horaStr}`}
              </span>
            </div>
            {(racha.location || racha.address) && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-neon shrink-0 mt-0.5" />
                <span>{racha.location || racha.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-neon shrink-0" />
              <span>
                {memberCount}/{racha.max_players} jogadores • {racha.field_mode}
              </span>
            </div>
          </div>

          <div className="pt-2">
            {alreadyMember ? (
              <Button
                onClick={() => navigate({ to: "/rachas" })}
                className="w-full"
                variant="secondary"
              >
                Você já está nesse racha — Ver detalhes
              </Button>
            ) : (
              <Button
                onClick={handleJoin}
                disabled={joining || memberCount >= racha.max_players}
                className="w-full bg-neon text-black hover:bg-neon/90 font-bold"
              >
                {joining ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : memberCount >= racha.max_players ? (
                  "Lotado 😬"
                ) : user ? (
                  "Confirmar presença ⚽"
                ) : (
                  "Entrar / cadastrar pra confirmar"
                )}
              </Button>
            )}
          </div>
        </Card>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <MessageCircle className="w-3 h-3" />
          Convite enviado pelo organizador
        </div>
      </div>
    </div>
  );
}

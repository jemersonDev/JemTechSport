import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotificacoes, type Notificacao } from "@/hooks/useNotificacoes";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Send,
  DollarSign,
  Trophy,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/notificacoes")({
  component: NotifPage,
  head: () => ({
    meta: [
      { title: "Notificações — JemTech Sports" },
      { name: "description", content: "Seus avisos: curtidas, comentários, mensagens e pagamentos." },
    ],
  }),
});

function NotifPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { items, loading, unreadCount, markAllRead, markRead } = useNotificacoes();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a2a]">
        <Loader2 className="w-6 h-6 animate-spin text-[#22c55e]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2a] text-white pb-24">
      <header className="px-4 py-4 border-b border-white/5 sticky top-0 bg-[#1a1a2a]/90 backdrop-blur z-10">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link to="/" className="text-white/60 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-extrabold flex items-center gap-2 flex-1 text-lg">
            <Bell className="w-5 h-5 text-[#22c55e]" /> Notificações
            {unreadCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#22c55e] px-1.5 text-[10px] font-bold text-black shadow-[0_0_10px_rgba(34,197,94,0.6)]">
                {unreadCount}
              </span>
            )}
          </h1>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="text-xs text-[#22c55e] hover:text-[#22c55e] hover:bg-[#22c55e]/10"
            >
              <CheckCheck className="w-4 h-4 mr-1" /> Marcar lidas
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-2">
        {items.length === 0 ? (
          <Card className="p-8 text-center text-sm text-white/60 bg-[#2a2a3a] border-white/5">
            Nenhuma notificação ainda. Curtidas, comentários e mensagens aparecem aqui.
          </Card>
        ) : (
          items.map((n) => <NotifItem key={n.id} n={n} onClick={() => markRead(n.id)} />)
        )}
      </main>
    </div>
  );
}

function NotifItem({ n, onClick }: { n: Notificacao; onClick: () => void }) {
  const Icon = ICONS[n.tipo];
  const color = COLORS[n.tipo];
  const content = (
    <Card
      onClick={onClick}
      className={`p-3 flex items-start gap-3 transition cursor-pointer border-white/5 ${
        !n.read
          ? "bg-[#22c55e]/10 border-[#22c55e]/40 shadow-[0_0_14px_rgba(34,197,94,0.18)] hover:bg-[#22c55e]/15"
          : "bg-[#2a2a3a] hover:bg-[#33334a]"
      }`}
    >
      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug text-white">{n.message}</p>
        <p className="text-[10px] text-white/50 mt-0.5">
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
      {!n.read && (
        <span className="w-2 h-2 rounded-full bg-[#22c55e] mt-2 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
      )}
    </Card>
  );
  if (n.link) {
    return (
      <Link to={n.link as any} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

const ICONS = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  message: Send,
  payment: DollarSign,
  racha_join: Trophy,
} as const;

const COLORS = {
  like: "bg-red-500/15 text-red-500",
  comment: "bg-blue-500/15 text-blue-500",
  follow: "bg-purple-500/15 text-purple-500",
  message: "bg-cyan-500/15 text-cyan-500",
  payment: "bg-green-500/15 text-green-500",
  racha_join: "bg-orange-500/15 text-orange-500",
} as const;

import { createFileRoute, Link } from "@tanstack/react-router";
import { useInbox } from "@/hooks/useResenhaDM";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, MessageSquare, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/inbox")({
  component: InboxPage,
  head: () => ({
    meta: [
      { title: "Mensagens — JemTech Sports" },
      { name: "description", content: "Suas conversas privadas com a galera do racha." },
    ],
  }),
});

function InboxPage() {
  const { user, loading: authLoading } = useAuth();
  const { conversas, loading } = useInbox();

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <p className="text-muted-foreground">Faça login pra ver suas mensagens.</p>
        <Link to="/login" className="mt-4 inline-block rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground">
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Link to="/resenha" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Mensagens</h1>
      </header>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : conversas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Nenhuma conversa</h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            Acesse o perfil de um jogador na Resenha e mande uma mensagem.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {conversas.map((c) => (
            <li key={c.id}>
              <Link
                to="/chat/$conversaId"
                params={{ conversaId: c.id }}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={c.other?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {(c.other?.display_name ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-semibold">{c.other?.display_name ?? "Jogador"}</p>
                    {c.last_message_at && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.last_message_at), { locale: ptBR, addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {c.last_message ?? "Diga oi 👋"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

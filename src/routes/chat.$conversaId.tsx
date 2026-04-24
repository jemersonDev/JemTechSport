import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useConversa } from "@/hooks/useResenhaDM";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat/$conversaId")({
  component: ChatPage,
  head: () => ({
    meta: [{ title: "Chat — JemTech Sports" }],
  }),
});

function ChatPage() {
  const { conversaId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { messages, other, loading, send } = useConversa(conversaId);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!user) {
    navigate({ to: "/login" });
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText("");
    await send(t);
  };

  return (
    <div className="mx-auto flex h-[100dvh] max-w-2xl flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-background px-3 py-2">
        <Link to="/inbox" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {other && (
          <Link
            to="/atleta/$userId"
            params={{ userId: other.user_id }}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={other.avatar_url ?? undefined} />
              <AvatarFallback>
                {(other.display_name ?? "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="truncate font-semibold">{other.display_name}</p>
          </Link>
        )}
      </header>

      <div className="flex-1 overflow-y-auto bg-muted/20 px-3 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Diga oi 👋
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {messages.map((m) => {
              const mine = m.sender_id === user.id;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[78%] rounded-2xl px-3 py-2 text-sm",
                    mine
                      ? "self-end rounded-br-sm bg-primary text-primary-foreground"
                      : "self-start rounded-bl-sm bg-card text-card-foreground border border-border",
                  )}
                >
                  {m.content}
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border bg-background p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mensagem"
          className="flex-1 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          aria-label="Enviar"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

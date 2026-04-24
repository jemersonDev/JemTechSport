import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRankingSemanal } from "@/hooks/useResenhaVotos";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Loader2, ArrowLeft, Flame } from "lucide-react";

export const Route = createFileRoute("/ranking")({
  component: RankingPage,
  head: () => ({
    meta: [
      { title: "Ranking semanal — JemTech Sports" },
      { name: "description", content: "Os lances de bola cheia mais votados da semana." },
    ],
  }),
});

const medals = ["🥇", "🥈", "🥉"];

function RankingPage() {
  const { items, loading, week } = useRankingSemanal();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Link to="/resenha" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Trophy className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <h1 className="text-lg font-bold leading-tight">Ranking da semana</h1>
          <p className="text-[11px] text-muted-foreground">Bolas cheias desde {new Date(week).toLocaleDateString("pt-BR")}</p>
        </div>
      </header>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Trophy className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Sem votos ainda</h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            Vote em "Bola Cheia" nos vídeos da Resenha pra montar o pódio dessa semana.
          </p>
          <Link to="/resenha" className="mt-2 rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground">
            Ir pra Resenha
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((it, i) => (
            <li key={it.post_id}>
              <button
                onClick={() => navigate({ to: "/atleta/$userId", params: { userId: it.user_id } })}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <span className="w-8 shrink-0 text-center text-lg font-bold">
                  {medals[i] ?? `${i + 1}º`}
                </span>
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                  {it.thumb_url ? (
                    <img src={it.thumb_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <video src={it.video_url} className="h-full w-full object-cover" muted playsInline />
                  )}
                </div>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={it.author?.avatar_url ?? undefined} />
                  <AvatarFallback>{(it.author?.display_name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{it.author?.display_name ?? "Jogador"}</p>
                  {it.caption && (
                    <p className="truncate text-xs text-muted-foreground">{it.caption}</p>
                  )}
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary">
                  <Flame className="h-3.5 w-3.5" /> {it.cheia}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Play, UserPlus, UserCheck, Send, Grid3x3 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFollow } from "@/hooks/useResenha";
import { openOrCreateConversa } from "@/hooks/useResenhaDM";
import { ReelsViewer, type ReelPost, formatCount } from "@/components/ReelsViewer";
import { TrofeusShelf } from "@/components/TrofeusShelf";
import { PlayerMatchHistory } from "@/components/PlayerMatchHistory";
import { AthleteCard } from "@/components/AthleteCard";

export const Route = createFileRoute("/atleta/$userId")({
  component: AthleteProfile,
});

type Profile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  preferred_position: string;
  bio: string | null;
  favorite_team_id: string | null;
  favorite_team_name: string | null;
  favorite_team_badge_url: string | null;
};

function AthleteProfile() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<ReelPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ partidas: 0, gols: 0, assistencias: 0, craque: 0, bagre: 0 });
  const [reelsOpenAt, setReelsOpenAt] = useState<number | null>(null);
  const { isFollowing, followers, following, toggle } = useFollow(userId);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [profRes, postsRes, partidasRes, golsRes, craqueRes, bagreRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, preferred_position, bio, favorite_team_id, favorite_team_name, favorite_team_badge_url")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("resenha_posts")
          .select("id, video_url, thumb_url, likes_count, comments_count, caption, views_count")
          .eq("user_id", userId)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false }),
        supabase
          .from("racha_membros")
          .select("racha_id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("gols_jogador")
          .select("gols, assistencias")
          .eq("user_id", userId),
        supabase
          .from("partida_votos")
          .select("partida_id", { count: "exact", head: true })
          .eq("craque_target", userId),
        supabase
          .from("partida_votos")
          .select("partida_id", { count: "exact", head: true })
          .eq("bagre_target", userId),
      ]);
      if (!active) return;
      setProfile((profRes.data as Profile) ?? null);
      setPosts((postsRes.data as ReelPost[]) ?? []);
      const golsArr = (golsRes.data ?? []) as { gols: number; assistencias: number }[];
      setStats({
        partidas: partidasRes.count ?? 0,
        gols: golsArr.reduce((s, g) => s + (g.gols ?? 0), 0),
        assistencias: golsArr.reduce((s, g) => s + (g.assistencias ?? 0), 0),
        craque: craqueRes.count ?? 0,
        bagre: bagreRes.count ?? 0,
      });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const isMe = user?.id === userId;

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <p className="text-lg font-semibold">Atleta não encontrado</p>
        <Link to="/resenha" className="text-primary underline">
          Voltar pro feed
        </Link>
      </div>
    );
  }

  const handle = profile.display_name.replace(/\s+/g, "").toLowerCase();

  return (
    <div className="min-h-[100dvh] bg-background pb-24 text-foreground">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/resenha" })}
          className="rounded-full p-1 hover:bg-muted"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-semibold">@{handle}</h1>
      </header>

      {/* Instagram-style header */}
      <section className="px-4 pb-4 pt-6">
        <div className="flex items-center gap-6">
          <Avatar className="h-20 w-20 ring-2 ring-primary/30">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
              {profile.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 justify-around text-center">
            <Stat label="Partidas" value={stats.partidas} />
            <Stat label="Gols" value={stats.gols} />
            <Stat label="Assist." value={stats.assistencias} />
          </div>
        </div>

        {/* Name + bio */}
        <div className="mt-4 space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold leading-tight">{profile.display_name}</h2>
            {profile.favorite_team_badge_url && (
              <img
                src={profile.favorite_team_badge_url}
                alt={profile.favorite_team_name ?? ""}
                title={profile.favorite_team_name ?? ""}
                className="h-6 w-6 object-contain drop-shadow"
                loading="lazy"
              />
            )}
          </div>
          {profile.bio ? (
            <p className="whitespace-pre-line text-sm leading-snug text-foreground/90">
              {profile.bio}
            </p>
          ) : (
            <p className="text-sm capitalize text-muted-foreground">{profile.preferred_position}</p>
          )}
          {profile.favorite_team_name && (
            <p className="text-[11px] text-muted-foreground">
              Torce pelo <span className="font-semibold text-foreground">{profile.favorite_team_name}</span>
            </p>
          )}
          <p className="pt-1 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">{followers}</span> seguidores ·{" "}
            <span className="font-semibold text-foreground">{following}</span> seguindo
          </p>
        </div>

        {/* Actions */}
        {!isMe && user && (
          <div className="mt-4 flex gap-2">
            <Button
              onClick={toggle}
              variant={isFollowing ? "outline" : "default"}
              className="flex-1"
            >
              {isFollowing ? (
                <>
                  <UserCheck className="mr-2 h-4 w-4" /> Seguindo
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" /> Seguir
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={async () => {
                const id = await openOrCreateConversa(userId);
                if (id) navigate({ to: "/chat/$conversaId", params: { conversaId: id } });
              }}
            >
              <Send className="mr-2 h-4 w-4" /> Mensagem
            </Button>
          </div>
        )}
        {isMe && (
          <Link
            to="/perfil"
            className="mt-4 block rounded-md border border-border py-2 text-center text-sm font-medium hover:bg-muted"
          >
            Editar perfil
          </Link>
        )}
      </section>

      {/* Card FIFA */}
      <section className="px-4 py-4">
        <AthleteCard
          displayName={profile.display_name}
          avatarUrl={profile.avatar_url}
          position={profile.preferred_position}
          clubBadgeUrl={profile.favorite_team_badge_url}
          clubName={profile.favorite_team_name}
          partidas={stats.partidas}
          gols={stats.gols}
          assistencias={stats.assistencias}
          craqueWins={stats.craque}
          bagreWins={stats.bagre}
        />
      </section>

      {/* Histórico de partidas */}
      <div className="px-3">
        <PlayerMatchHistory userId={userId} />
      </div>

      {/* Prateleira de troféus */}
      <TrofeusShelf userId={userId} />

      {/* Tabs (only one for now: Grid) */}
      <div className="flex border-y border-border/60">
        <div className="flex flex-1 items-center justify-center gap-1.5 border-t-2 border-foreground py-2.5 text-xs font-semibold">
          <Grid3x3 className="h-4 w-4" /> LANCES
        </div>
      </div>

      {/* Square 3x3 grid */}
      <section className="pt-px">
        {posts.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhum lance postado ainda.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-px bg-border/40">
            {posts.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setReelsOpenAt(idx)}
                className="group relative aspect-[9/16] overflow-hidden bg-black"
              >
                {p.thumb_url ? (
                  <img
                    src={p.thumb_url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition group-hover:opacity-90"
                  />
                ) : (
                  <video
                    src={p.video_url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                )}
                {/* Play + view count bottom-left */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-1.5 pb-1 pt-4 text-[11px] font-semibold text-white drop-shadow-md">
                  <Play className="h-3 w-3 fill-white" />
                  <span>{formatCount(p.views_count)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {reelsOpenAt !== null && (
        <ReelsViewer
          posts={posts}
          startIndex={reelsOpenAt}
          onClose={() => setReelsOpenAt(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-lg font-bold leading-none">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

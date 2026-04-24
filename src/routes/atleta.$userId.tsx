import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Play, UserPlus, UserCheck, Heart, MessageCircle, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFollow } from "@/hooks/useResenha";
import { openOrCreateConversa } from "@/hooks/useResenhaDM";


export const Route = createFileRoute("/atleta/$userId")({
  component: AthleteProfile,
});

type Profile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  preferred_position: string;
};

type Post = {
  id: string;
  video_url: string;
  thumb_url: string | null;
  likes_count: number;
  comments_count: number;
  caption: string | null;
};

function AthleteProfile() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { isFollowing, followers, following, toggle } = useFollow(userId);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [profRes, postsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase
          .from("resenha_posts")
          .select("id, video_url, thumb_url, likes_count, comments_count, caption")
          .eq("user_id", userId)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      setProfile((profRes.data as Profile) ?? null);
      setPosts((postsRes.data as Post[]) ?? []);
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

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/resenha" })}
          className="rounded-full p-1 hover:bg-muted"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-semibold">@{profile.display_name.replace(/\s+/g, "").toLowerCase()}</h1>
      </header>

      <section className="px-4 py-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 ring-2 ring-primary/30">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
              {profile.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 justify-around text-center">
            <Stat label="Vídeos" value={posts.length} />
            <Stat label="Seguidores" value={followers} />
            <Stat label="Seguindo" value={following} />
          </div>
        </div>

        <div className="mt-4">
          <h2 className="text-lg font-bold">{profile.display_name}</h2>
          <p className="text-sm text-muted-foreground capitalize">{profile.preferred_position}</p>
        </div>

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

      <section className="border-t border-border px-1 pt-1">
        {posts.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma resenha postada ainda.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {posts.map((p) => (
              <Link
                key={p.id}
                to="/resenha"
                className="relative aspect-[9/16] overflow-hidden bg-black"
              >
                {p.thumb_url ? (
                  <img src={p.thumb_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <video
                    src={p.video_url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-[10px] font-semibold text-white">
                  <span className="flex items-center gap-0.5">
                    <Heart className="h-3 w-3" /> {p.likes_count}
                  </span>
                  <Play className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

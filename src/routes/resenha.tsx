import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Plus,
  MoreVertical,
  Volume2,
  VolumeX,
  Loader2,
  Video as VideoIcon,
  Flag,
  Trophy,
  Inbox,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useResenhaFeed, type ResenhaPost } from "@/hooks/useResenha";
import { ResenhaUpload } from "@/components/ResenhaUpload";
import { ResenhaComments } from "@/components/ResenhaComments";
import { ReportDialog } from "@/components/ReportDialog";
import { PostVoteButtons } from "@/components/PostVoteButtons";
import { OverlayLayer, type Overlay } from "@/components/OverlayEditor";
import { toast } from "sonner";

export const Route = createFileRoute("/resenha")({
  component: ResenhaPage,
  head: () => ({
    meta: [
      { title: "Resenha — JemTech Sports" },
      { name: "description", content: "Feed de vídeos curtos da galera do racha. Curta, comente e siga seus craques." },
      { property: "og:title", content: "Resenha Pro — JemTech Sports" },
      { property: "og:description", content: "Feed de golaços, dribles e resenhas dos jogadores da sua região." },
    ],
  }),
});

function ResenhaPage() {
  const { user } = useAuth();
  const { posts, loading, reload, toggleLike, reportPost } = useResenhaFeed();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // detectar slide ativo via IntersectionObserver
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-slide]"));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            setActiveIdx(idx);
          }
        });
      },
      { root, threshold: [0, 0.6, 1] },
    );
    items.forEach((it) => obs.observe(it));
    return () => obs.disconnect();
  }, [posts.length]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black text-white">
      {/* Header */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
        <h1 className="pointer-events-auto text-xl font-bold tracking-tight">Resenha</h1>
        <div className="pointer-events-auto flex items-center gap-2">
          <Link
            to="/ranking"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur"
            aria-label="Ranking"
          >
            <Trophy className="h-5 w-5" />
          </Link>
          <Link
            to="/inbox"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur"
            aria-label="Mensagens"
          >
            <Inbox className="h-5 w-5" />
          </Link>
          <button
            onClick={() => {
              if (!user) {
                toast.error("Faça login pra postar");
                return;
              }
              setUploadOpen(true);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22c55e] text-black shadow-[0_0_18px_rgba(34,197,94,0.55)] ring-1 ring-[#22c55e]"
            aria-label="Postar vídeo"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/70" />
        </div>
      ) : posts.length === 0 ? (
        <EmptyFeed
          onPost={() => {
            if (!user) {
              toast.error("Faça login pra postar");
              return;
            }
            setUploadOpen(true);
          }}
          isLogged={!!user}
        />
      ) : (
        <div
          ref={containerRef}
          className="h-full w-full snap-y snap-mandatory overflow-y-scroll scroll-smooth"
        >
          {posts.map((post, idx) => (
            <VideoSlide
              key={post.id}
              post={post}
              idx={idx}
              isActive={idx === activeIdx}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onLike={() => toggleLike(post.id)}
              onComment={() => setCommentsFor(post.id)}
              onReport={() => setReportFor(post.id)}
              currentUserId={user?.id}
            />
          ))}
        </div>
      )}

      <ResenhaUpload
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={reload}
      />
      <ResenhaComments postId={commentsFor} onClose={() => setCommentsFor(null)} />
      <ReportDialog
        open={!!reportFor}
        onClose={() => setReportFor(null)}
        onSubmit={async (reason) => {
          if (reportFor) await reportPost(reportFor, reason);
        }}
      />
    </div>
  );
}

function EmptyFeed({ onPost, isLogged }: { onPost: () => void; isLogged: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
        <VideoIcon className="h-10 w-10 text-white/70" />
      </div>
      <h2 className="text-xl font-bold">Sem resenha ainda</h2>
      <p className="max-w-xs text-sm text-white/70">
        Seja o primeiro a postar um lance da galera. Golaço, drible, frango, tudo vale!
      </p>
      {isLogged ? (
        <button
          onClick={onPost}
          className="mt-2 rounded-full bg-[#22c55e] px-6 py-2.5 font-bold text-black shadow-[0_0_20px_rgba(34,197,94,0.5)]"
        >
          Postar agora
        </button>
      ) : (
        <Link
          to="/login"
          className="mt-2 rounded-full bg-[#22c55e] px-6 py-2.5 font-bold text-black shadow-[0_0_20px_rgba(34,197,94,0.5)]"
        >
          Entrar
        </Link>
      )}
    </div>
  );
}

function VideoSlide({
  post,
  idx,
  isActive,
  muted,
  onToggleMute,
  onLike,
  onComment,
  onReport,
  currentUserId,
}: {
  post: ResenhaPost;
  idx: number;
  isActive: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onLike: () => void;
  onComment: () => void;
  onReport: () => void;
  currentUserId?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isActive]);

  const share = async () => {
    const url = post.video_url;
    const text = post.caption ? `${post.caption}\n\n${url}` : url;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Resenha JemTech", text, url });
        return;
      } catch {
        /* cancelado */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copiado!");
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const goToProfile = () => {
    navigate({ to: "/atleta/$userId", params: { userId: post.user_id } });
  };

  return (
    <section
      data-slide
      data-idx={idx}
      className="relative h-[100dvh] w-full snap-start"
      onClick={onToggleMute}
    >
      <video
        ref={videoRef}
        src={post.video_url}
        poster={post.thumb_url ?? undefined}
        muted={muted}
        loop
        playsInline
        className="h-full w-full object-cover"
      />

      {/* overlays do criador */}
      <OverlayLayer overlays={(Array.isArray(post.overlays) ? post.overlays : []) as Overlay[]} />

      {/* mute indicator */}
      <div className="pointer-events-none absolute right-4 top-20 z-10">
        <div className="rounded-full bg-black/40 p-2 backdrop-blur">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </div>
      </div>

      {/* gradient bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      {/* author + caption */}
      <div className="absolute inset-x-0 bottom-24 z-10 flex items-end gap-3 px-4 pb-4 pr-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToProfile();
          }}
          className="shrink-0"
        >
          <Avatar className="h-10 w-10 ring-2 ring-white">
            <AvatarImage src={post.author?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {(post.author?.display_name ?? "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="min-w-0 flex-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToProfile();
            }}
            className="block font-bold leading-tight"
          >
            @{(post.author?.display_name ?? "jogador").replace(/\s+/g, "").toLowerCase()}
          </button>
          {post.caption && (
            <p className="mt-1 line-clamp-3 text-sm text-white/90">{post.caption}</p>
          )}
          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            <PostVoteButtons
              postId={post.id}
              cheiaCount={post.cheia_count ?? 0}
              murchaCount={post.murcha_count ?? 0}
            />
          </div>
        </div>
      </div>

      {/* action rail */}
      <div className="absolute bottom-28 right-3 z-10 flex flex-col items-center gap-5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
          className="flex flex-col items-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur">
            <Heart
              className={`h-6 w-6 transition-transform ${
                post.liked_by_me ? "scale-110 fill-red-500 text-red-500" : "text-white"
              }`}
            />
          </div>
          <span className="mt-1 text-xs font-semibold">{post.likes_count}</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onComment();
          }}
          className="flex flex-col items-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur">
            <MessageCircle className="h-6 w-6" />
          </div>
          <span className="mt-1 text-xs font-semibold">{post.comments_count}</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            share();
          }}
          className="flex flex-col items-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur">
            <Share2 className="h-6 w-6" />
          </div>
          <span className="mt-1 text-xs font-semibold">Zap</span>
        </button>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-12 w-40 overflow-hidden rounded-lg bg-background text-foreground shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  if (currentUserId === post.user_id) {
                    toast.info("Não dá pra denunciar a si mesmo 😅");
                    return;
                  }
                  onReport();
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted"
              >
                <Flag className="h-4 w-4 text-destructive" /> Denunciar
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

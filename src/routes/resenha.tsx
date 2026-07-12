import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Plus,
  MoreVertical,
  Volume2,
  VolumeX,
  Loader2,
  Video as VideoIcon,
  Flag,
  Camera,
  Bookmark,
  Play,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useResenhaFeed, type ResenhaPost } from "@/hooks/useResenha";
import { useFollow } from "@/hooks/useResenha";
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
      { title: "Reels — JemTech Sports" },
      { name: "description", content: "Feed de vídeos curtos da galera do racha. Curta, comente e siga seus craques." },
      { property: "og:title", content: "Reels — JemTech Sports" },
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
      {/* Header — estilo IG Reels */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 pt-3 pb-6">
        <h1 className="pointer-events-auto text-2xl font-bold tracking-tight" style={{ fontFamily: "'Billabong', 'Dancing Script', cursive" }}>
          Reels
        </h1>
        <div className="pointer-events-auto flex items-center gap-4">
          <button
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Ativar som" : "Mudo"}
            className="text-white"
          >
            {muted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
          </button>
          <button
            onClick={() => {
              if (!user) {
                toast.error("Faça login pra postar");
                return;
              }
              setUploadOpen(true);
            }}
            className="text-white"
            aria-label="Postar vídeo"
          >
            <Camera className="h-6 w-6" />
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
      <h2 className="text-xl font-bold">Sem reels ainda</h2>
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
  onLike,
  onComment,
  onReport,
  currentUserId,
}: {
  post: ResenhaPost;
  idx: number;
  isActive: boolean;
  muted: boolean;
  onLike: () => void;
  onComment: () => void;
  onReport: () => void;
  currentUserId?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const lastTapRef = useRef(0);
  const navigate = useNavigate();
  const isOwn = currentUserId === post.user_id;
  const { isFollowing, toggle: toggleFollow } = useFollow(isOwn ? null : post.user_id);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      setPaused(false);
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isActive]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      if (v.duration) setProgress((v.currentTime / v.duration) * 100);
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, []);

  const share = async () => {
    const url = post.video_url;
    const text = post.caption ? `${post.caption}\n\n${url}` : url;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Reels JemTech", text, url });
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

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // double tap -> like
      if (!post.liked_by_me) onLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 700);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= 280 && lastTapRef.current !== 0) {
          const v = videoRef.current;
          if (!v) return;
          if (v.paused) {
            v.play();
            setPaused(false);
          } else {
            v.pause();
            setPaused(true);
          }
        }
      }, 290);
    }
  };

  const username = (post.author?.display_name ?? "jogador").replace(/\s+/g, "").toLowerCase();

  return (
    <section
      data-slide
      data-idx={idx}
      className="relative h-[100dvh] w-full snap-start"
      onClick={handleTap}
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

      <OverlayLayer overlays={(Array.isArray(post.overlays) ? post.overlays : []) as Overlay[]} />

      {/* Pause indicator central */}
      {paused && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/40 p-5 backdrop-blur">
            <Play className="h-10 w-10 fill-white text-white" />
          </div>
        </div>
      )}

      {/* Double-tap heart burst */}
      {showHeart && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Heart className="h-32 w-32 animate-scale-in fill-red-500 text-red-500 drop-shadow-[0_0_20px_rgba(255,0,0,0.6)]" />
        </div>
      )}

      {/* gradient bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      {/* author + caption */}
      <div className="absolute inset-x-0 bottom-24 z-10 flex flex-col gap-2 px-4 pb-2 pr-20">
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={goToProfile} className="shrink-0">
            <Avatar className="h-9 w-9 ring-1 ring-white/60">
              <AvatarImage src={post.author?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-[#22c55e] text-black text-sm">
                {(post.author?.display_name ?? "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
          <button onClick={goToProfile} className="text-sm font-semibold">
            {username}
          </button>
          {!isOwn && (
            <>
              <span className="text-white/60">•</span>
              <button
                onClick={toggleFollow}
                className={`rounded-md border px-3 py-0.5 text-xs font-semibold transition ${
                  isFollowing
                    ? "border-white/40 text-white/80"
                    : "border-white text-white"
                }`}
              >
                {isFollowing ? "Seguindo" : "Seguir"}
              </button>
            </>
          )}
        </div>

        {post.caption && (
          <div onClick={(e) => e.stopPropagation()}>
            <p
              className={`text-sm text-white/95 ${captionExpanded ? "" : "line-clamp-2"}`}
            >
              {post.caption}
            </p>
            {post.caption.length > 80 && (
              <button
                onClick={() => setCaptionExpanded((v) => !v)}
                className="text-xs text-white/60"
              >
                {captionExpanded ? "menos" : "mais"}
              </button>
            )}
          </div>
        )}

        <div onClick={(e) => e.stopPropagation()}>
          <PostVoteButtons
            postId={post.id}
            cheiaCount={post.cheia_count ?? 0}
            murchaCount={post.murcha_count ?? 0}
          />
        </div>
      </div>

      {/* action rail — estilo IG (ícones flat, sem pílula) */}
      <div className="absolute bottom-28 right-2 z-10 flex flex-col items-center gap-5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
          className="flex flex-col items-center"
        >
          <Heart
            className={`h-8 w-8 transition-transform ${
              post.liked_by_me
                ? "scale-110 fill-red-500 text-red-500"
                : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
            }`}
          />
          <span className="mt-0.5 text-xs font-semibold drop-shadow">{post.likes_count}</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onComment();
          }}
          className="flex flex-col items-center"
        >
          <MessageCircle className="h-8 w-8 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
          <span className="mt-0.5 text-xs font-semibold drop-shadow">{post.comments_count}</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            share();
          }}
          className="flex flex-col items-center"
        >
          <Send className="h-8 w-8 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            toast.info("Em breve: salvar reels 📌");
          }}
          className="flex flex-col items-center"
        >
          <Bookmark className="h-7 w-7 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
        </button>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="flex items-center justify-center"
          >
            <MoreVertical className="h-6 w-6 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-8 z-20 w-40 overflow-hidden rounded-lg bg-background text-foreground shadow-xl"
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

        {/* avatar giratório estilo audio (link p/ perfil) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToProfile();
          }}
          className="mt-1"
        >
          <div className="h-9 w-9 overflow-hidden rounded-md ring-1 ring-white/50">
            <Avatar className="h-full w-full rounded-md">
              <AvatarImage src={post.author?.avatar_url ?? undefined} className="rounded-md" />
              <AvatarFallback className="rounded-md bg-[#22c55e] text-black text-xs">
                {(post.author?.display_name ?? "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </button>
      </div>

      {/* progress bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[68px] z-10 h-0.5 bg-white/15">
        <div
          className="h-full bg-white/90 transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import { X, Heart, MessageCircle, Volume2, VolumeX, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type ReelPost = {
  id: string;
  video_url: string;
  thumb_url: string | null;
  caption: string | null;
  likes_count: number;
  comments_count: number;
  views_count: number;
};

export function ReelsViewer({
  posts,
  startIndex,
  onClose,
}: {
  posts: ReelPost[];
  startIndex: number;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(startIndex);
  const [muted, setMuted] = useState(true);
  const viewedRef = useRef<Set<string>>(new Set());

  // Scroll to start index on mount
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-reel-idx="${startIndex}"]`);
    if (el) el.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start" });
  }, [startIndex]);

  // Detect active slide
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reel-idx]"));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            const idx = Number((e.target as HTMLElement).dataset.reelIdx);
            setActiveIdx(idx);
          }
        });
      },
      { root, threshold: [0, 0.6, 1] },
    );
    items.forEach((it) => obs.observe(it));
    return () => obs.disconnect();
  }, [posts.length]);

  // Play active video, pause others, register view
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const videos = Array.from(root.querySelectorAll<HTMLVideoElement>("video"));
    videos.forEach((v) => {
      const idx = Number(v.dataset.reelIdx);
      if (idx === activeIdx) {
        v.muted = muted;
        v.play().catch(() => {});
        const post = posts[idx];
        if (post && !viewedRef.current.has(post.id)) {
          viewedRef.current.add(post.id);
          supabase.rpc("increment_post_view", { _post_id: post.id }).then(() => {});
        }
      } else {
        v.pause();
      }
    });
  }, [activeIdx, muted, posts]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      {/* Header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
        <button
          onClick={onClose}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
        <button
          onClick={() => setMuted((m) => !m)}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur"
          aria-label={muted ? "Ativar som" : "Mudo"}
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>

      <div
        ref={containerRef}
        className="h-[100dvh] w-full snap-y snap-mandatory overflow-y-scroll"
      >
        {posts.map((p, idx) => (
          <div
            key={p.id}
            data-reel-idx={idx}
            className="relative h-[100dvh] w-full snap-start snap-always"
          >
            <video
              data-reel-idx={idx}
              src={p.video_url}
              poster={p.thumb_url ?? undefined}
              playsInline
              loop
              muted={muted}
              preload={Math.abs(idx - activeIdx) <= 1 ? "auto" : "metadata"}
              className="h-full w-full object-contain"
              onClick={(e) => {
                const v = e.currentTarget;
                if (v.paused) v.play();
                else v.pause();
              }}
            />
            {/* Bottom info */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/80 to-transparent px-4 pb-8 pt-16">
              <div className="flex-1 pr-4">
                {p.caption && (
                  <p className="text-sm leading-snug">{p.caption}</p>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs text-white/80">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" /> {formatCount(p.views_count)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-4 text-xs">
                <div className="flex flex-col items-center">
                  <Heart className="h-7 w-7" />
                  <span className="mt-0.5 font-semibold">{formatCount(p.likes_count)}</span>
                </div>
                <div className="flex flex-col items-center">
                  <MessageCircle className="h-7 w-7" />
                  <span className="mt-0.5 font-semibold">{formatCount(p.comments_count)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(".0", "") + "k";
  return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
}

import { ThumbsUp, ThumbsDown } from "lucide-react";
import { usePostVote } from "@/hooks/useResenhaVotos";
import { cn } from "@/lib/utils";

type Props = {
  postId: string;
  cheiaCount: number;
  murchaCount: number;
};

export function PostVoteButtons({ postId, cheiaCount, murchaCount }: Props) {
  const { meuVoto, votar } = usePostVote(postId);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          votar("cheia");
        }}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold backdrop-blur transition-colors",
          meuVoto === "cheia"
            ? "bg-emerald-500 text-white"
            : "bg-white/10 text-white hover:bg-white/20",
        )}
        aria-label="Bola cheia"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
        Cheia · {cheiaCount}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          votar("murcha");
        }}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold backdrop-blur transition-colors",
          meuVoto === "murcha"
            ? "bg-rose-500 text-white"
            : "bg-white/10 text-white hover:bg-white/20",
        )}
        aria-label="Bola murcha"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
        Murcha · {murchaCount}
      </button>
    </div>
  );
}

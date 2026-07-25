import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type VotoTipo = "cheia" | "murcha";

// segunda-feira da semana atual (UTC)
export function currentWeekStart(): string {
  const d = new Date();
  const day = d.getUTCDay(); // 0=dom
  const diff = (day + 6) % 7; // dias desde segunda
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function usePostVote(postId: string) {
  const { user } = useAuth();
  const [meuVoto, setMeuVoto] = useState<VotoTipo | null>(null);
  const week = currentWeekStart();

  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase
      .from("resenha_votos")
      .select("voto")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .eq("week_start", week)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setMeuVoto((data?.voto as VotoTipo) ?? null);
      });
    return () => {
      active = false;
    };
  }, [postId, user, week]);

  const votar = useCallback(
    async (voto: VotoTipo) => {
      if (!user) {
        toast.error("Faça login pra votar");
        return;
      }
      const previous = meuVoto;
      if (previous === voto) {
        // remove voto
        setMeuVoto(null);
        await supabase
          .from("resenha_votos")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .eq("week_start", week);
        return;
      }
      setMeuVoto(voto);
      if (previous) {
        await supabase
          .from("resenha_votos")
          .update({ voto })
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .eq("week_start", week);
      } else {
        await supabase.from("resenha_votos").insert({
          post_id: postId,
          user_id: user.id,
          voto,
          week_start: week,
        });
      }
    },
    [postId, user, week, meuVoto],
  );

  return { meuVoto, votar };
}

export type RankingItem = {
  post_id: string;
  cheia: number;
  video_url: string;
  thumb_url: string | null;
  caption: string | null;
  user_id: string;
  author?: { display_name: string; avatar_url: string | null };
};

export function useRankingSemanal() {
  const [items, setItems] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const week = currentWeekStart();

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: votos } = await supabase
        .from("resenha_votos")
        .select("post_id")
        .eq("voto", "cheia")
        .eq("week_start", week);

      const counts = new Map<string, number>();
      (votos ?? []).forEach((v) => {
        counts.set(v.post_id, (counts.get(v.post_id) ?? 0) + 1);
      });
      const top = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);
      const ids = top.map(([id]) => id);
      if (!ids.length) {
        if (active) {
          setItems([]);
          setLoading(false);
        }
        return;
      }
      const { data: posts } = await supabase
        .from("resenha_posts")
        .select("id, video_url, thumb_url, caption, user_id")
        .in("id", ids)
        .eq("is_hidden", false);

      const userIds = Array.from(new Set((posts ?? []).map((p) => p.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const profMap = new Map((profs ?? []).map((p) => [p.user_id, p] as const));
      const postMap = new Map((posts ?? []).map((p) => [p.id, p] as const));

      const ranking: RankingItem[] = top
        .map(([id, cheia]) => {
          const p = postMap.get(id);
          if (!p) return null;
          return {
            post_id: id,
            cheia,
            video_url: p.video_url,
            thumb_url: p.thumb_url,
            caption: p.caption,
            user_id: p.user_id,
            author: profMap.get(p.user_id),
          };
        })
        .filter(Boolean) as RankingItem[];

      if (active) {
        setItems(ranking);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [week]);

  return { items, loading, week };
}

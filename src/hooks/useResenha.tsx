import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type ResenhaPost = {
  id: string;
  user_id: string;
  video_url: string;
  thumb_url: string | null;
  caption: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_hidden: boolean;
  author?: {
    display_name: string;
    avatar_url: string | null;
  };
  liked_by_me?: boolean;
};

export type ResenhaComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: {
    display_name: string;
    avatar_url: string | null;
  };
};

export function useResenhaFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ResenhaPost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    const { data: postsData, error } = await supabase
      .from("resenha_posts")
      .select("*")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const userIds = Array.from(new Set((postsData ?? []).map((p) => p.user_id)));
    const postIds = (postsData ?? []).map((p) => p.id);

    const [profilesRes, likesRes] = await Promise.all([
      userIds.length
        ? supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      user && postIds.length
        ? supabase
            .from("resenha_likes")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", postIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.user_id, p]));
    const likedSet = new Set((likesRes.data ?? []).map((l: any) => l.post_id));

    setPosts(
      (postsData ?? []).map((p) => ({
        ...p,
        author: profileMap.get(p.user_id) as any,
        liked_by_me: likedSet.has(p.id),
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!user) {
        toast.error("Faça login pra curtir");
        return;
      }
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      // optimistic
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                liked_by_me: !p.liked_by_me,
                likes_count: p.likes_count + (p.liked_by_me ? -1 : 1),
              }
            : p,
        ),
      );

      if (post.liked_by_me) {
        await supabase
          .from("resenha_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase.from("resenha_likes").insert({ post_id: postId, user_id: user.id });
      }
    },
    [user, posts],
  );

  const reportPost = useCallback(
    async (postId: string, reason: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("resenha_denuncias")
        .insert({ post_id: postId, user_id: user.id, reason });
      if (error) {
        if (error.code === "23505") {
          toast.info("Você já denunciou esse vídeo");
        } else {
          toast.error("Erro ao denunciar");
        }
        return;
      }
      toast.success("Denúncia enviada. Obrigado!");
    },
    [user],
  );

  return { posts, loading, reload: loadFeed, toggleLike, reportPost };
}

export function usePostComments(postId: string | null) {
  const [comments, setComments] = useState<ResenhaComment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!postId) {
      setComments([]);
      return;
    }
    let active = true;

    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("resenha_comentarios")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(100);

      const userIds = Array.from(new Set((data ?? []).map((c) => c.user_id)));
      const profilesRes = userIds.length
        ? await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", userIds)
        : { data: [] as any[] };
      const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.user_id, p]));

      if (!active) return;
      setComments(
        (data ?? []).map((c) => ({ ...c, author: profileMap.get(c.user_id) as any })),
      );
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "resenha_comentarios", filter: `post_id=eq.${postId}` },
        async (payload) => {
          const row = payload.new as ResenhaComment;
          const { data: prof } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .eq("user_id", row.user_id)
            .maybeSingle();
          if (!active) return;
          setComments((prev) => [{ ...row, author: prof as any }, ...prev]);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [postId]);

  return { comments, loading };
}

export function useFollow(targetUserId: string | null) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  const refresh = useCallback(async () => {
    if (!targetUserId) return;
    const [followersRes, followingRes, meRes] = await Promise.all([
      supabase
        .from("resenha_follows")
        .select("*", { count: "exact", head: true })
        .eq("followed_id", targetUserId),
      supabase
        .from("resenha_follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", targetUserId),
      user
        ? supabase
            .from("resenha_follows")
            .select("id")
            .eq("follower_id", user.id)
            .eq("followed_id", targetUserId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setFollowers(followersRes.count ?? 0);
    setFollowing(followingRes.count ?? 0);
    setIsFollowing(!!meRes.data);
  }, [targetUserId, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(async () => {
    if (!user || !targetUserId || user.id === targetUserId) return;
    if (isFollowing) {
      await supabase
        .from("resenha_follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("followed_id", targetUserId);
      setIsFollowing(false);
      setFollowers((c) => Math.max(0, c - 1));
    } else {
      await supabase
        .from("resenha_follows")
        .insert({ follower_id: user.id, followed_id: targetUserId });
      setIsFollowing(true);
      setFollowers((c) => c + 1);
    }
  }, [user, targetUserId, isFollowing]);

  return { isFollowing, followers, following, toggle, refresh };
}

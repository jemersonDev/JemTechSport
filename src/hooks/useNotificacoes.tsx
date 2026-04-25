import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Notificacao = {
  id: string;
  user_id: string;
  actor_id: string | null;
  tipo: "like" | "comment" | "follow" | "message" | "payment" | "racha_join";
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

export function useNotificacoes() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data ?? []) as Notificacao[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: novo aviso entra no topo
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setItems((prev) => [payload.new as Notificacao, ...prev].slice(0, 50));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const unreadCount = items.filter((i) => !i.read).length;

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const ids = items.filter((i) => !i.read).map((i) => i.id);
    if (ids.length === 0) return;
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    await supabase.from("notificacoes").update({ read: true }).in("id", ids);
  }, [items, user]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
    await supabase.from("notificacoes").update({ read: true }).eq("id", id);
  }, []);

  return { items, loading, unreadCount, markAllRead, markRead, reload: load };
}

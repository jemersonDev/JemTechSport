import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type Conversa = {
  id: string;
  user_a: string;
  user_b: string;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  other?: { user_id: string; display_name: string; avatar_url: string | null };
  unread?: number;
};

export type Mensagem = {
  id: string;
  conversa_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

export function useInbox() {
  const { user } = useAuth();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setConversas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("resenha_conversas")
      .select("*")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    const others = (data ?? []).map((c) => (c.user_a === user.id ? c.user_b : c.user_a));
    const profilesRes = others.length
      ? await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", others)
      : { data: [] as any[] };
    const map = new Map((profilesRes.data ?? []).map((p: any) => [p.user_id, p]));

    setConversas(
      (data ?? []).map((c) => {
        const otherId = c.user_a === user.id ? c.user_b : c.user_a;
        return { ...c, other: map.get(otherId) as any };
      }),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`inbox-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "resenha_conversas" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, load]);

  return { conversas, loading, reload: load };
}

export async function openOrCreateConversa(otherUserId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("resenha_get_or_create_conversa", {
    _other_user: otherUserId,
  });
  if (error) {
    toast.error("Não foi possível abrir a conversa");
    return null;
  }
  return data as string;
}

export function useConversa(conversaId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Mensagem[]>([]);
  const [other, setOther] = useState<{ user_id: string; display_name: string; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversaId || !user) {
      setMessages([]);
      setOther(null);
      return;
    }
    let active = true;
    setLoading(true);

    (async () => {
      const [convRes, msgsRes] = await Promise.all([
        supabase.from("resenha_conversas").select("*").eq("id", conversaId).maybeSingle(),
        supabase
          .from("resenha_mensagens")
          .select("*")
          .eq("conversa_id", conversaId)
          .order("created_at", { ascending: true })
          .limit(200),
      ]);
      if (!active) return;
      const conv = convRes.data as any;
      if (conv) {
        const otherId = conv.user_a === user.id ? conv.user_b : conv.user_a;
        const { data: prof } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .eq("user_id", otherId)
          .maybeSingle();
        if (active) setOther(prof as any);
      }
      if (active) {
        setMessages((msgsRes.data ?? []) as Mensagem[]);
        setLoading(false);
      }

      // marcar lidas
      await supabase
        .from("resenha_mensagens")
        .update({ read_at: new Date().toISOString() })
        .eq("conversa_id", conversaId)
        .neq("sender_id", user.id)
        .is("read_at", null);
    })();

    const ch = supabase
      .channel(`conv-${conversaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "resenha_mensagens", filter: `conversa_id=eq.${conversaId}` },
        (payload) => {
          if (!active) return;
          setMessages((prev) => [...prev, payload.new as Mensagem]);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [conversaId, user]);

  const send = useCallback(
    async (content: string) => {
      if (!conversaId || !user) return;
      const text = content.trim();
      if (!text) return;
      const { error } = await supabase
        .from("resenha_mensagens")
        .insert({ conversa_id: conversaId, sender_id: user.id, content: text });
      if (error) toast.error("Erro ao enviar");
    },
    [conversaId, user],
  );

  return { messages, other, loading, send };
}

import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";

type ConquistaUsuarioRow = { conquista_code: string };

export function ConquistasListener() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`conquistas:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conquistas_usuario",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload: RealtimePostgresInsertPayload<ConquistaUsuarioRow>) => {
          const code = payload.new.conquista_code;
          const { data } = await supabase
            .from("conquistas")
            .select("titulo, descricao")
            .eq("code", code)
            .maybeSingle();
          toast.success(
            `🏆 Nova conquista: ${data?.titulo ?? "Desbloqueada"}!`,
            { description: data?.descricao, duration: 6000 },
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);
  return null;
}

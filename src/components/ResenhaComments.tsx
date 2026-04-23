import { useState } from "react";
import { X, Send, Loader2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePostComments } from "@/hooks/useResenha";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  postId: string | null;
  onClose: () => void;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function ResenhaComments({ postId, onClose }: Props) {
  const { user } = useAuth();
  const { comments, loading } = usePostComments(postId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  if (!postId) return null;

  const send = async () => {
    if (!user) {
      toast.error("Faça login pra comentar");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    const { error } = await supabase
      .from("resenha_comentarios")
      .insert({ post_id: postId, user_id: user.id, content: trimmed.slice(0, 500) });
    setSending(false);
    if (error) {
      toast.error("Erro ao comentar");
      return;
    }
    setText("");
  };

  const remove = async (id: string) => {
    await supabase.from("resenha_comentarios").delete().eq("id", id);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="flex h-[75vh] w-full max-w-md flex-col rounded-t-2xl bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-semibold">Comentários ({comments.length})</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Seja o primeiro a comentar 💬
            </p>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-2">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={c.author?.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {(c.author?.display_name ?? "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="rounded-2xl bg-muted px-3 py-2">
                      <p className="text-xs font-semibold">
                        {c.author?.display_name ?? "Jogador"}
                      </p>
                      <p className="text-sm break-words">{c.content}</p>
                    </div>
                    <div className="mt-1 flex items-center gap-3 px-2 text-[11px] text-muted-foreground">
                      <span>{timeAgo(c.created_at)}</span>
                      {user?.id === c.user_id && (
                        <button
                          onClick={() => remove(c.id)}
                          className="flex items-center gap-1 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" /> apagar
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border p-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={user ? "Escreva um comentário..." : "Faça login pra comentar"}
            disabled={!user || sending}
            maxLength={500}
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!user || !text.trim() || sending}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

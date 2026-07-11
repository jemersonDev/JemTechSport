import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2, Bot, User as UserIcon, Instagram, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { askInsta } from "@/utils/insta.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/insta")({
  component: InstaPage,
  head: () => ({
    meta: [
      { title: "Growth Instagram — JemTech Sports" },
      {
        name: "description",
        content:
          "Consultor IA de Instagram: roteiros de Reels, legendas, hashtags, análise de alcance e estratégia de crescimento.",
      },
    ],
  }),
});

const SUGESTOES = [
  "Roteiro de Reel de 15s pra atrair mais seguidores",
  "Escreve uma bio de alto padrão pro meu perfil",
  "Meu alcance caiu, o que faço?",
  "3 ideias de carrossel que geram salvamento",
  "Legenda AIDA pra vender meu serviço",
  "Hashtags estratégicas pra nicho de futebol/racha",
];

type Msg = { role: "user" | "assistant"; content: string };

function InstaPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Salve 🚀 Sou seu consultor de **Instagram Growth**. Posso montar roteiro de Reels, legenda persuasiva (AIDA), bio de alto padrão, hashtag mix e destravar seu alcance. Manda o que precisa.\n\n🎯 **Próximo Passo:** me conta o nicho do seu perfil e quantos seguidores você tem hoje.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const askFn = useServerFn(askInsta);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await askFn({
        data: { messages: next.filter((m) => m.role === "user" || m !== next[0]) },
      });
      if (res.ok) {
        setMessages([...next, { role: "assistant", content: res.reply }]);
      } else {
        toast.error(res.error);
        setMessages(next);
      }
    } catch {
      toast.error("Erro ao falar com assistente");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/perfil">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="font-semibold flex items-center gap-2">
            <Instagram className="w-4 h-4 text-[#00FF00]" />
            Growth Instagram
          </h1>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-[#00FF00] font-bold">
            IA
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4 pb-24">
        <Card
          className="overflow-hidden border-[#00FF00]/30"
          style={{ boxShadow: "0 0 24px rgba(0,255,0,0.08)" }}
        >
          <div
            className="p-3 border-b border-border/40 bg-gradient-to-r from-[#00FF00]/10 via-transparent to-[#00FF00]/10 flex items-center gap-2"
            style={{ boxShadow: "inset 0 0 12px rgba(0,255,0,0.08)" }}
          >
            <Bot className="w-4 h-4 text-[#00FF00]" />
            <div className="text-sm font-bold">Consultor de Growth</div>
            <Sparkles className="w-3.5 h-3.5 text-[#00FF00] ml-auto" />
          </div>

          <div ref={scrollRef} className="max-h-[440px] overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-[#00FF00]/10 border border-[#00FF00]/30 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-[#00FF00]" />
                  </div>
                )}
                <div
                  className={`text-sm px-3 py-2 rounded-2xl max-w-[85%] whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
                {m.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 items-center text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Bolando estratégia…
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border/40 flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ex: roteiro de Reel pra viralizar…"
              maxLength={500}
              disabled={loading}
            />
            <Button onClick={() => send()} disabled={loading || !input.trim()} size="icon">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Sugestões pra começar
          </h2>
          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={loading}
                className="text-xs px-3 py-2 rounded-full border border-[#00FF00]/30 bg-[#00FF00]/5 hover:bg-[#00FF00]/10 transition disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}

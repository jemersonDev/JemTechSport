import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Sparkles, Send, Loader2, Bot, User as UserIcon, HelpCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { askAjuda } from "@/utils/ajuda.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/ajuda")({
  component: AjudaPage,
  head: () => ({
    meta: [
      { title: "Central de ajuda — JemTech Sports" },
      {
        name: "description",
        content:
          "Tire dúvidas sobre rachas, pagamentos PIX, taxas e gamificação no JemTech Sports.",
      },
    ],
  }),
});

const FAQ = [
  {
    q: "Como crio meu primeiro racha?",
    a: "Na home, toca no botão '+' (Novo racha). Define nome, data, local, valor total e número máximo de jogadores. O app gera um código de convite — manda pra galera entrar.",
  },
  {
    q: "Como funcionam as taxas?",
    a: "Taxa fixa: **R$ 5,00 por racha** (rateada entre os jogadores). Taxa de serviço: **R$ 0,12 por jogador**. Exemplo: racha de R$ 240 com 12 jogadores → R$ 20/jogador. Plataforma fica com ~R$ 0,54 por jogador, organizador recebe ~R$ 19,46.",
  },
  {
    q: "O pagamento via PIX é automático?",
    a: "Sim. Quando o jogador paga pelo QR Code do Mercado Pago, o banco confirma e o status muda sozinho pra 'Pago'. Sem confirmação manual.",
  },
  {
    q: "E se alguém pagar em dinheiro?",
    a: "O organizador marca manualmente como pago. A taxa da plataforma vira saldo devido — você quita depois pelo painel do organizador.",
  },
  {
    q: "Como funciona o sorteio de times?",
    a: "O algoritmo equilibra os times pelo nível de habilidade (iniciante, casual, bom de bola, craque) e posição preferida (goleiro, zagueiro, meia, atacante). Times mais justos = jogo melhor.",
  },
  {
    q: "Como funciona a votação Craque/Bagre?",
    a: "No fim da partida, cada jogador vota no Craque ⭐ (melhor) e no Bagre 🐟 (queimou). Os votos viram troféus no perfil e contam pro ranking.",
  },
  {
    q: "O que é o card estilo FIFA?",
    a: "Cada atleta tem um card com OVR (overall) e atributos: PAC, SHO, PAS, DRI, DEF, PHY. Os números evoluem conforme você joga, faz gol e ganha votos. Dá pra compartilhar.",
  },
  {
    q: "Por que não consigo me inscrever num racha?",
    a: "Se você está marcado como devedor por algum organizador, o sistema bloqueia novas inscrições com aquele organizador. Quita a dívida no painel e libera.",
  },
  {
    q: "O que é Fominha do Mês?",
    a: "Quem participou de mais rachas no mês ganha o troféu 'Fominha 🔥'. Renova todo mês.",
  },
  {
    q: "Como falo com o fundador?",
    a: "Manda DM no Instagram: [@_jemersonlm](https://www.instagram.com/_jemersonlm/).",
  },
];

type Msg = { role: "user" | "assistant"; content: string };

function AjudaPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Salve! Sou o assistente do JemTech Sports 🤖⚽ Pode perguntar sobre racha, pagamento, taxas, sorteio, votação… o que rolar.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const askFn = useServerFn(askAjuda);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await askFn({
        data: { messages: next.filter((m) => m.role !== "assistant" || m !== next[0]) },
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
            <HelpCircle className="w-4 h-4 text-[#00FF00]" />
            Central de ajuda
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Growth Instagram CTA */}
        <Link to="/insta">
          <Card
            className="p-4 border-[#00FF00]/40 bg-gradient-to-r from-[#00FF00]/10 via-transparent to-[#00FF00]/10 hover:border-[#00FF00]/70 transition cursor-pointer flex items-center gap-3"
            style={{ boxShadow: "0 0 20px rgba(0,255,0,0.1)" }}
          >
            <div className="w-10 h-10 rounded-full bg-[#00FF00]/15 border border-[#00FF00]/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-[#00FF00]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold flex items-center gap-2">
                Growth Instagram
                <span className="text-[9px] uppercase tracking-wider text-[#00FF00] font-bold border border-[#00FF00]/40 rounded px-1.5 py-0.5">
                  IA
                </span>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                Roteiros de Reels, legendas AIDA, hashtags e análise de alcance
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 rotate-180 text-muted-foreground" />
          </Card>
        </Link>

        {/* Chatbot IA */}
        <Card className="overflow-hidden border-[#00FF00]/30">
          <div
            className="p-3 border-b border-border/40 bg-gradient-to-r from-[#00FF00]/10 via-transparent to-[#00FF00]/10 flex items-center gap-2"
            style={{ boxShadow: "inset 0 0 12px rgba(0,255,0,0.08)" }}
          >
            <Bot className="w-4 h-4 text-[#00FF00]" />
            <div className="text-sm font-bold">Assistente JemTech</div>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-[#00FF00] font-bold">
              IA
            </span>
          </div>

          <div ref={scrollRef} className="max-h-[360px] overflow-y-auto p-3 space-y-3">
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
                  className={`text-sm px-3 py-2 rounded-2xl max-w-[80%] whitespace-pre-wrap ${
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
                Pensando…
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border/40 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Pergunta aí…"
              maxLength={500}
              disabled={loading}
            />
            <Button onClick={send} disabled={loading || !input.trim()} size="icon">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </Card>

        {/* FAQ */}
        <Card className="p-4">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00FF00]" />
            Perguntas frequentes
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`q-${i}`}>
                <AccordionTrigger className="text-sm text-left">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </main>
    </div>
  );
}

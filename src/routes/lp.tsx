import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Trophy,
  Users,
  Zap,
  Shield,
  MessageCircle,
  BarChart3,
  Star,
  Check,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/lp")({
  head: () => ({
    meta: [
      { title: "JemTech — Organize seu racha em 2 minutos e nunca mais perca jogador no WhatsApp" },
      {
        name: "description",
        content:
          "Crie seu racha, sorteie times equilibrados, controle pagamentos e veja seu card de jogador estilo FIFA. Grátis pra começar.",
      },
      { property: "og:title", content: "JemTech — Organize seu racha sem dor de cabeça" },
      {
        property: "og:description",
        content:
          "Times equilibrados, lista no automático, pagamento via Pix e card de jogador compartilhável. Comece grátis.",
      },
    ],
  }),
  component: LandingPage,
});

function CTAButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Link to="/login">
      <Button
        size="lg"
        className={`bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base h-14 px-8 shadow-neon ${className}`}
      >
        {children}
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </Link>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-black">
              J
            </div>
            <span className="font-bold tracking-tight">JemTech</span>
          </div>
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-foreground">
              Entrar
            </Button>
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden px-4 py-16 md:py-24">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-40">
          <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            <Zap className="h-3.5 w-3.5" />
            Mais de mil rachas organizados toda semana
          </div>

          <h1 className="mb-6 text-4xl font-black leading-tight tracking-tight md:text-6xl">
            Organize seu racha em <span className="text-primary text-glow">2 minutos</span> e
            nunca mais perca jogador no WhatsApp
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Lista automática, times equilibrados na hora, controle de pagamento via Pix e card de
            jogador estilo FIFA pra galera compartilhar. Tudo num app só, grátis pra começar.
          </p>

          <div className="flex flex-col items-center gap-4">
            <CTAButton>Criar meu racha agora</CTAButton>
            <p className="text-xs text-muted-foreground">
              Sem cartão de crédito · Pronto em 2 minutos
            </p>
          </div>

          {/* prova social */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-background bg-gradient-to-br from-primary to-team-b"
                  />
                ))}
              </div>
              <span>+5.000 atletas ativos</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-keeper text-keeper" />
              ))}
              <span className="ml-1">4.9/5 na galera</span>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="border-y border-border/50 bg-graphite px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-3 text-center text-3xl font-bold md:text-4xl">
            Cansado da bagunça do racha?
          </h2>
          <p className="mb-12 text-center text-muted-foreground">
            Você não tá sozinho. Todo organizador passa por isso:
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              "Galera some na hora de pagar e você fica devendo a quadra do bolso",
              "Times sempre desequilibrados — sai goleada toda semana",
              "Confusão na lista do WhatsApp: quem confirmou? quem é reserva?",
              "Ninguém lembra quem fez gol, quem foi o craque, quem ficou devendo",
            ].map((problema) => (
              <Card
                key={problema}
                className="border-destructive/20 bg-card/50 p-5 text-sm text-muted-foreground"
              >
                <span className="mr-2 text-destructive">✕</span>
                {problema}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUÇÃO / BENEFÍCIOS */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              O JemTech resolve tudo isso no automático
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Um app feito por quem organiza racha há anos. Tudo o que você precisa, nada que não
              precisa.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Users,
                title: "Lista no automático",
                desc: "Galera confirma sozinha pelo link. Vagas, reservas e lista de espera tudo organizado.",
              },
              {
                icon: Zap,
                title: "Times equilibrados",
                desc: "Algoritmo monta os times pelo nível de cada jogador. Acabou jogo de 8x1.",
              },
              {
                icon: Shield,
                title: "Pix integrado",
                desc: "Cobrança automática, painel de devedores e fim do 'depois te passo'.",
              },
              {
                icon: Trophy,
                title: "Card de jogador FIFA",
                desc: "Cada atleta tem stats, troféus e MVPs. Compartilha no Insta e bomba.",
              },
              {
                icon: BarChart3,
                title: "Estatísticas reais",
                desc: "Ranking, assiduidade, evolução. Saiba quem é craque e quem é bagre.",
              },
              {
                icon: MessageCircle,
                title: "Resenha pós-jogo",
                desc: "Fotos, votação de craque e bagre, comentários. O racha não acaba no apito.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <Card
                key={title}
                className="group border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-neon"
              >
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="border-y border-border/50 bg-graphite px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-14 text-center text-3xl font-bold md:text-4xl">
            Em 3 passos seu racha tá rodando
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { n: "1", t: "Crie seu racha", d: "Nome, quadra, horário, valor. Pronto em 1 minuto." },
              { n: "2", t: "Compartilha o link", d: "Galera confirma presença direto pelo WhatsApp." },
              { n: "3", t: "Joga e curte", d: "Times sorteados, gols registrados, resenha rolando." },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-primary text-2xl font-black text-primary-foreground shadow-neon">
                  {s.n}
                </div>
                <h3 className="mb-2 text-xl font-bold">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <CTAButton>Criar meu racha agora</CTAButton>
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-14 text-center text-3xl font-bold md:text-4xl">
            A galera tá curtindo
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                n: "Rafa, organizador há 5 anos",
                t: "Cortei 2 horas por semana mexendo em planilha. Agora é só clicar.",
              },
              {
                n: "Bruno, jogador",
                t: "Meu card de jogador foi parar no story de meio mundo. Virei meme bom kkk",
              },
              {
                n: "Léo, dono da quadra",
                t: "Recomendo pra todo grupo. Sumiu o problema de quem deve.",
              },
            ].map((d) => (
              <Card key={d.n} className="border-border bg-card p-6">
                <div className="mb-3 flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-keeper text-keeper" />
                  ))}
                </div>
                <p className="mb-4 text-sm text-foreground">"{d.t}"</p>
                <p className="text-xs font-medium text-muted-foreground">— {d.n}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* OFERTA */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <Card className="relative overflow-hidden border-primary/40 bg-gradient-to-br from-card to-graphite p-8 shadow-neon md:p-12">
            <div className="absolute right-0 top-0 rounded-bl-xl bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
              GRÁTIS
            </div>
            <h2 className="mb-3 text-3xl font-bold md:text-4xl">Comece sem pagar nada</h2>
            <p className="mb-8 text-muted-foreground">
              Tudo o que você precisa pra rodar seu racha, sem pegadinha.
            </p>
            <ul className="mb-8 space-y-3">
              {[
                "Rachas e jogadores ilimitados",
                "Sorteio inteligente de times",
                "Cobrança via Pix integrada",
                "Card de jogador estilo FIFA",
                "Estatísticas, ranking e resenha",
                "Suporte direto no WhatsApp",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </div>
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
            <CTAButton className="w-full md:w-auto">Criar meu racha agora</CTAButton>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/50 bg-graphite px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">Dúvidas frequentes</h2>
          <div className="space-y-4">
            {[
              {
                q: "É grátis mesmo?",
                a: "É. Você cria racha, gerencia jogadores e usa todas as funções principais sem pagar nada. Tem planos pagos opcionais com benefícios extras pra quem quer ir além.",
              },
              {
                q: "Preciso instalar app?",
                a: "Não. Funciona direto no navegador do celular. Dá pra adicionar na tela inicial e parece app nativo.",
              },
              {
                q: "Como funciona o pagamento da galera?",
                a: "Você cadastra sua chave Pix. O app gera o QR Code, marca quem pagou e mostra os devedores num painel só seu.",
              },
              {
                q: "E se a galera não quiser criar conta?",
                a: "Tranquilo. Você pode adicionar jogadores manualmente. Eles só criam conta se quiserem ver o card e o ranking.",
              },
              {
                q: "Funciona pra quantos jogadores?",
                a: "Sem limite. Racha de 10, de 20, de 40, torneio com vários times — tudo roda igual.",
              },
            ].map((f) => (
              <details key={f.q} className="group rounded-xl border border-border bg-card p-5">
                <summary className="cursor-pointer list-none font-semibold marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {f.q}
                    <span className="text-primary transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden px-4 py-24">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-30">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/30 blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-4xl font-black leading-tight md:text-5xl">
            Bora transformar seu racha no <span className="text-primary text-glow">melhor da cidade</span>?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
            Leva 2 minutos pra criar. Na próxima pelada você já tá usando.
          </p>
          <CTAButton>Criar meu racha agora</CTAButton>
          <p className="mt-4 text-xs text-muted-foreground">
            Sem cartão · Sem instalar nada · Cancela quando quiser
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/50 px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} JemTech. Feito por quem joga.</p>
          <div className="flex gap-6">
            <Link to="/login" className="hover:text-foreground">
              Entrar
            </Link>
            <Link to="/ajuda" className="hover:text-foreground">
              Ajuda
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

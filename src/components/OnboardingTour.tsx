import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronRight, X, Trophy, Users, Star, Video } from "lucide-react";

type Slide = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
  to?: string;
};

const SLIDES: Slide[] = [
  {
    icon: <Trophy className="w-16 h-16 text-neon" />,
    title: "Monte seu card FIFA ⚽",
    desc: "Foto, posição, time do coração e nível. Quanto mais completo, mais respeito na quadra.",
    cta: "Próximo",
    to: "/perfil",
  },
  {
    icon: <Users className="w-16 h-16 text-neon" />,
    title: "Entre num racha 🔥",
    desc: "Crie seu racha ou use um código de convite. Times sorteados por skill, divisão automática.",
    cta: "Próximo",
    to: "/rachas",
  },
  {
    icon: <Star className="w-16 h-16 text-neon" />,
    title: "Vote no Craque & Bagre 🏆",
    desc: "Depois da partida, todo mundo vota. Quem brilhou ganha troféu no perfil.",
    cta: "Próximo",
  },
  {
    icon: <Video className="w-16 h-16 text-neon" />,
    title: "Resenha em vídeo 🎬",
    desc: "Posta seus golaços, vê o feed do Brasil inteiro e ganha seguidores.",
    cta: "Começar agora",
    to: "/resenha",
  },
];

const LS_KEY = "jemtech_onboarding_v1";

export function OnboardingTour() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user || !profile) return;
    const seen =
      profile.onboarding_completed === true ||
      localStorage.getItem(LS_KEY) === "1";
    if (!seen) setOpen(true);
  }, [user, profile]);

  const finish = async (goTo?: string) => {
    setOpen(false);
    localStorage.setItem(LS_KEY, "1");
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as never)
        .eq("user_id", user.id);
      refreshProfile?.();
    }
    if (goTo) navigate({ to: goTo });
  };

  if (!open) return null;
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="relative w-full max-w-sm bg-graphite border border-neon/30 rounded-3xl p-6 shadow-2xl shadow-neon/20">
        <button
          onClick={() => finish()}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1"
          aria-label="Pular"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center mb-4 mt-2">{slide.icon}</div>

        <h2 className="text-2xl font-black text-center text-foreground mb-2">
          {slide.title}
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
          {slide.desc}
        </p>

        <div className="flex justify-center gap-1.5 mb-5">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-neon" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {!isLast && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => finish()}
            >
              Pular tour
            </Button>
          )}
          <Button
            size="sm"
            className="flex-1 gap-1"
            onClick={() => {
              if (isLast) finish(slide.to);
              else setStep(step + 1);
            }}
          >
            {slide.cta}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

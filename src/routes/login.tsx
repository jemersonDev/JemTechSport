import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Entrar — JemTech Sports" },
      { name: "description", content: "Entre com Google ou Apple para organizar seu racha." },
    ],
  }),
});

function LoginPage() {
  const { user, loading, signInWithGoogle, signInWithApple } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      const pending = sessionStorage.getItem("pending_invite");
      if (pending) {
        sessionStorage.removeItem("pending_invite");
        navigate({ to: "/r/$code", params: { code: pending } });
      } else {
        navigate({ to: "/" });
      }
    }
  }, [user, loading, navigate]);

  const handleGoogle = async () => {
    setError(null);
    setBusy("google");
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error);
      setBusy(null);
    }
  };

  const handleApple = async () => {
    setError(null);
    setBusy("apple");
    const { error } = await signInWithApple();
    if (error) {
      setError(error);
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">JemTech Sports</h1>
          <p className="text-sm text-muted-foreground">Organize seu racha sem zica</p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleGoogle}
            disabled={busy !== null}
            variant="outline"
            className="w-full h-11 text-base"
          >
            <GoogleIcon />
            {busy === "google" ? "Conectando…" : "Entrar com Google"}
          </Button>

          <Button
            onClick={handleApple}
            disabled={busy !== null}
            variant="outline"
            className="w-full h-11 text-base"
          >
            <AppleIcon />
            {busy === "apple" ? "Conectando…" : "Entrar com Apple"}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Ao entrar você concorda em jogar com a galera nos rachas. ⚽
        </p>
      </Card>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.28 6.61l3.99 3.1C6.22 6.86 8.87 4.75 12 4.75z"/>
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.28 1.48-1.13 2.74-2.41 3.59l3.86 3c2.27-2.09 3.57-5.17 3.57-8.83z"/>
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.74-.39-1.53-.39-2.29s.14-1.55.39-2.29l-3.99-3.1C.46 8.21 0 10.06 0 12c0 1.94.46 3.79 1.28 5.39l3.99-3.1z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.86-3c-1.07.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96l-3.99 3.1C3.26 21.31 7.31 24 12 24z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}

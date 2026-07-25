import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
  head: () => ({
    meta: [{ title: "Entrando… — JemTech Sports" }],
  }),
});

function AuthCallbackPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user) {
      const pending = sessionStorage.getItem("pending_invite");
      if (pending) {
        sessionStorage.removeItem("pending_invite");
        navigate({ to: "/r/$code", params: { code: pending } });
      } else {
        navigate({ to: "/" });
      }
    } else {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

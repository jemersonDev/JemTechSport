import { Outlet, Link, createRootRoute, HeadContent, Scripts, useLocation } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/BottomNav";

import appCss from "../styles.css?url";

const HIDE_NAV_ON = new Set(["/login"]);

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "JemTech Sports — Racha de Futebol" },
      { name: "description", content: "Organize seu racha: sorteio de times, divisão financeira e placar ao vivo." },
      { name: "author", content: "JemTech Sports" },
      { property: "og:title", content: "JemTech Sports — Racha de Futebol" },
      { property: "og:description", content: "Sorteio de times, divisão financeira e placar ao vivo num só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const location = useLocation();
  const isFullscreen = location.pathname === "/resenha";
  const hideNav = HIDE_NAV_ON.has(location.pathname);
  return (
    <AuthProvider>
      <div className={hideNav || isFullscreen ? "" : "pb-20"}>
        <Outlet />
      </div>
      {!hideNav && <BottomNav />}
      <Toaster />
    </AuthProvider>
  );
}

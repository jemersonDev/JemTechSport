import { Link, useLocation } from "@tanstack/react-router";
import { Home, Trophy, Video, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/" as const, icon: Home, label: "Racha" },
  { to: "/rachas" as const, icon: Trophy, label: "Meus" },
  { to: "/resenha" as const, icon: Video, label: "Resenha", center: true },
  { to: "/perfil" as const, icon: UserIcon, label: "Perfil" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-2xl items-end justify-around px-2 pb-safe pt-2">
        {tabs.map((tab) => {
          const active = location.pathname === tab.to;
          if (tab.center) {
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className="relative -mt-6 flex flex-col items-center"
                aria-label={tab.label}
              >
                <span
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform",
                    active
                      ? "bg-primary text-primary-foreground scale-110"
                      : "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground",
                  )}
                >
                  <tab.icon className="h-7 w-7" />
                </span>
                <span className="mt-1 text-[10px] font-semibold text-foreground">
                  {tab.label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-md px-3 py-2 text-[11px] transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

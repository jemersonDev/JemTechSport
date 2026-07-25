import { createFileRoute } from "@tanstack/react-router";

// Envia lembretes push 3h antes do racha começar.
// Chame via cron a cada 15-30 min:
//   curl -X POST -H "x-push-secret: $PUSH_HOOK_SECRET" \
//     https://<projeto>.lovable.app/api/public/hooks/racha-lembretes

interface RachaRow {
  id: string;
  name: string;
  scheduled_at: string;
  location: string | null;
  address: string | null;
}

interface InscricaoRow {
  user_id: string;
}

export const Route = createFileRoute("/api/public/hooks/racha-lembretes")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const expected = process.env.PUSH_HOOK_SECRET;
        if (!expected) return new Response("Server misconfigured", { status: 500 });
        const provided =
          request.headers.get("x-push-secret") ||
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
          "";
        const { timingSafeEqual } = await import("node:crypto");
        const a = Buffer.from(provided);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Janela: rachas começando entre 2h45 e 3h15
        const now = Date.now();
        const from = new Date(now + 2.75 * 3600_000).toISOString();
        const to = new Date(now + 3.25 * 3600_000).toISOString();

        const { data: rachas } = await supabaseAdmin
          .from("rachas")
          .select("id, name, scheduled_at, location, address")
          .gte("scheduled_at", from)
          .lte("scheduled_at", to);

        const rachasList = (rachas ?? []) as RachaRow[];
        if (!rachasList.length) return Response.json({ rachas: 0 });

        let created = 0;
        for (const r of rachasList) {
          const { data: insc } = await supabaseAdmin
            .from("inscricoes")
            .select("user_id")
            .eq("racha_id", r.id);
          const inscList = (insc ?? []) as InscricaoRow[];
          if (!inscList.length) continue;

          const local = r.address || r.location;
          const rows = inscList.map((i) => ({
            user_id: i.user_id,
            tipo: "racha_join" as const,
            message: `⏰ Faltam 3h para "${r.name}"${local ? " — " + local : ""}. Prepare a chuteira!`,
            link: "/rachas",
          }));
          const { error } = await supabaseAdmin.from("notificacoes").insert(rows);
          if (!error) created += rows.length;
        }

        return Response.json({ rachas: rachasList.length, notifications: created });
      },
    },
  },
});

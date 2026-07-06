import { createFileRoute } from "@tanstack/react-router";

// Envia lembretes push 3h antes do racha começar.
// Chame via cron a cada 15-30 min:
//   curl -X POST -H "x-push-secret: $PUSH_HOOK_SECRET" \
//     https://<projeto>.lovable.app/api/public/hooks/racha-lembretes

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/api/public/hooks/racha-lembretes")({
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rachas } = await (supabaseAdmin as any)
          .from("rachas")
          .select("id, name, data_hora, local")
          .gte("data_hora", from)
          .lte("data_hora", to);

        if (!rachas?.length) return Response.json({ rachas: 0 });

        let created = 0;
        for (const r of rachas) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: insc } = await (supabaseAdmin as any)
            .from("inscricoes")
            .select("user_id")
            .eq("racha_id", r.id);
          if (!insc?.length) continue;

          const rows = insc.map((i: any) => ({
            user_id: i.user_id,
            tipo: "racha_join",
            message: `⏰ Faltam 3h para "${r.name}"${r.local ? " — " + r.local : ""}. Prepare a chuteira!`,
            link: "/rachas",
          }));
          const { error } = await (supabaseAdmin as any).from("notificacoes").insert(rows);
          if (!error) created += rows.length;
        }

        return Response.json({ rachas: rachas.length, notifications: created });
      },
    },
  },
});

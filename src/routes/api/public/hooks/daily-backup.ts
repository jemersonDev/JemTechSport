import { createFileRoute } from "@tanstack/react-router";


const TABLES = [
  "profiles",
  "rachas",
  "racha_membros",
  "inscricoes",
  "partidas_finalizadas",
  "pagamentos",
  "trofeus",
  "devedores",
  "gols_jogador",
  "user_roles",
] as const;

export const Route = createFileRoute("/api/public/hooks/daily-backup")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const expected = process.env.BACKUP_HOOK_SECRET;
        if (!expected) {
          console.error("BACKUP_HOOK_SECRET not configured");
          return new Response("Server misconfigured", { status: 500 });
        }
        const provided =
          request.headers.get("x-backup-secret") ||
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
          "";
        const a = Buffer.from(provided);
        const b = Buffer.from(expected);
        if (a.length !== b.length) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { timingSafeEqual } = await import("node:crypto");
        if (!timingSafeEqual(a, b)) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const snapshot: Record<string, unknown> = {
            generated_at: new Date().toISOString(),
          };

          for (const table of TABLES) {
            const { data, error } = await supabaseAdmin.from(table).select("*");
            if (error) {
              console.error(`backup ${table} error:`, error);
              snapshot[table] = { error: error.message };
            } else {
              snapshot[table] = data;
            }
          }

          const date = new Date().toISOString().slice(0, 10);
          const fileName = `backup-${date}.json`;
          const body = JSON.stringify(snapshot);

          const { error: upErr } = await supabaseAdmin.storage
            .from("backups")
            .upload(fileName, new Blob([body], { type: "application/json" }), {
              upsert: true,
              contentType: "application/json",
            });

          if (upErr) {
            console.error("backup upload error:", upErr);
            return Response.json({ ok: false, error: upErr.message }, { status: 500 });
          }

          return Response.json({
            ok: true,
            file: fileName,
            size: body.length,
            tables: TABLES.length,
          });
        } catch (e) {
          console.error("backup fatal:", e);
          return Response.json(
            { ok: false, error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
          );
        }
      },
    },
  },
});

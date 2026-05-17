import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
      POST: async ({ request }) => {
        const authHeader = request.headers.get("apikey") || request.headers.get("authorization");
        if (!authHeader) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const snapshot: Record<string, unknown> = {
            generated_at: new Date().toISOString(),
          };

          for (const table of TABLES) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabaseAdmin as any).from(table).select("*");
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

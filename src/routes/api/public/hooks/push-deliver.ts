import { createFileRoute } from "@tanstack/react-router";

// Entrega push notifications para toda notificação criada e ainda não enviada
// (curtidas, comentários, follows, mensagens, promoção da fila, etc).
// Chame via cron a cada 1-2 min:
//   curl -X POST -H "x-push-secret: $PUSH_HOOK_SECRET" \
//     https://<projeto>.lovable.app/api/public/hooks/push-deliver

interface PendingNotificacao {
  id: string;
  user_id: string;
  tipo: string;
  message: string;
  link: string | null;
}

interface PushSubRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

export const Route = createFileRoute("/api/public/hooks/push-deliver")({
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

        const pub = process.env.VAPID_PUBLIC_KEY;
        const priv = process.env.VAPID_PRIVATE_KEY;
        const subject = process.env.VAPID_SUBJECT || "mailto:admin@jemtech.app";
        if (!pub || !priv) return new Response("VAPID missing", { status: 500 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const webpush = (await import("web-push")).default;
        webpush.setVapidDetails(subject, pub, priv);

        const { data: pend } = await supabaseAdmin
          .from("notificacoes")
          .select("id, user_id, tipo, message, link")
          .is("pushed_at", null)
          .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString())
          .limit(200);

        const pendList = (pend ?? []) as PendingNotificacao[];
        if (!pendList.length) return Response.json({ delivered: 0 });

        const userIds = [...new Set(pendList.map((n) => n.user_id))];
        const { data: subs } = await supabaseAdmin
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth, user_id")
          .in("user_id", userIds);

        const byUser = new Map<string, PushSubRow[]>();
        ((subs ?? []) as PushSubRow[]).forEach((s) => {
          const arr = byUser.get(s.user_id) || [];
          arr.push(s);
          byUser.set(s.user_id, arr);
        });

        const titles: Record<string, string> = {
          like: "❤️ Nova curtida",
          comment: "💬 Novo comentário",
          follow: "👋 Novo seguidor",
          message: "📩 Nova mensagem",
          payment: "💰 Pagamento",
          racha_join: "⚽ Racha",
        };

        const stale: string[] = [];
        const pushed: string[] = [];
        let sent = 0;

        await Promise.all(
          pendList.map(async (n) => {
            const targets = byUser.get(n.user_id) || [];
            if (!targets.length) {
              pushed.push(n.id);
              return;
            }
            const payload = JSON.stringify({
              title: titles[n.tipo] || "JemTech Sports",
              body: n.message,
              url: n.link || "/notificacoes",
              tag: `${n.tipo}-${n.id}`,
            });
            await Promise.all(
              targets.map(async (s) => {
                try {
                  await webpush.sendNotification(
                    { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                    payload,
                  );
                  sent++;
                } catch (err) {
                  const statusCode = (err as { statusCode?: number })?.statusCode;
                  if (statusCode === 404 || statusCode === 410) stale.push(s.id);
                }
              }),
            );
            pushed.push(n.id);
          }),
        );

        if (pushed.length) {
          await supabaseAdmin
            .from("notificacoes")
            .update({ pushed_at: new Date().toISOString() })
            .in("id", pushed);
        }
        if (stale.length) {
          await supabaseAdmin.from("push_subscriptions").delete().in("id", stale);
        }

        return Response.json({ delivered: sent, notifications: pushed.length, cleaned: stale.length });
      },
    },
  },
});

import { createFileRoute } from '@tanstack/react-router';

import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

/**
 * Webhook do Mercado Pago.
 *
 * Configurar no painel MP > Suas integrações > Webhooks:
 *   URL:   https://<seu-dominio>/api/public/mp-webhook
 *   Eventos: Pagamentos (payment.created, payment.updated)
 *
 * O MP envia um header `x-signature` no formato:
 *   ts=1700000000,v1=<hex_hmac_sha256>
 * O manifest assinado é: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 * A chave HMAC é o "Secret" gerado no painel do Mercado Pago e
 * armazenado em MERCADOPAGO_WEBHOOK_SECRET.
 */
function verifyMpSignature(opts: {
  secret: string;
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
}): boolean {
  if (!opts.signatureHeader || !opts.dataId) return false;

  // Parse "ts=...,v1=..."
  const parts = opts.signatureHeader.split(',').map((p) => p.trim());
  const map: Record<string, string> = {};
  for (const part of parts) {
    const [k, v] = part.split('=');
    if (k && v) map[k] = v;
  }
  const ts = map['ts'];
  const v1 = map['v1'];
  if (!ts || !v1) return false;

  const manifest = `id:${opts.dataId};request-id:${opts.requestId ?? ''};ts:${ts};`;
  const expected = createHmac('sha256', opts.secret).update(manifest).digest('hex');

  try {
    const a = Buffer.from(v1, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function fetchMpPayment(paymentId: string, accessToken: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`MP API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function mapMpStatus(s: string): 'pendente' | 'aprovado' | 'recusado' | 'reembolsado' | 'cancelado' {
  switch (s) {
    case 'approved':
      return 'aprovado';
    case 'rejected':
      return 'recusado';
    case 'refunded':
    case 'charged_back':
      return 'reembolsado';
    case 'cancelled':
      return 'cancelado';
    default:
      return 'pendente';
  }
}

export const Route = createFileRoute('/api/public/mp-webhook')({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ ok: true, service: 'mp-webhook' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),

      POST: async ({ request }: { request: Request }) => {
        const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!secret || !accessToken) {
          console.error('mp-webhook: missing MERCADOPAGO secrets');
          return new Response('Server not configured', { status: 500 });
        }

        const url = new URL(request.url);
        const rawBody = await request.text();
        const signatureHeader = request.headers.get('x-signature');
        const requestId = request.headers.get('x-request-id');

        // data.id pode vir no body OU como query param (?data.id=...&type=payment)
        let payload: any = {};
        try {
          payload = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          payload = {};
        }
        const dataId =
          payload?.data?.id?.toString() ??
          url.searchParams.get('data.id') ??
          url.searchParams.get('id');
        const eventType = payload?.type ?? url.searchParams.get('type');

        if (!verifyMpSignature({ secret, signatureHeader, requestId, dataId })) {
          console.warn('mp-webhook: invalid signature', { dataId, requestId });
          return new Response('Invalid signature', { status: 401 });
        }

        // Só processamos eventos de pagamento
        if (eventType && !String(eventType).startsWith('payment')) {
          return new Response('ignored', { status: 200 });
        }
        if (!dataId) {
          return new Response('missing data.id', { status: 400 });
        }

        try {
          const mp = await fetchMpPayment(dataId, accessToken);
          const novoStatus = mapMpStatus(mp.status);

          const { error } = await supabaseAdmin
            .from('pagamentos')
            .update({
              status: novoStatus,
              mp_payment_id: String(mp.id),
              paid_at: mp.date_approved ?? null,
              raw: mp,
              updated_at: new Date().toISOString(),
            })
            .eq('mp_payment_id', String(mp.id));

          if (error) {
            console.error('mp-webhook: db update error', error);
            return new Response('db error', { status: 500 });
          }

          return new Response(JSON.stringify({ ok: true, status: novoStatus }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err: any) {
          console.error('mp-webhook: handler error', err);
          return new Response('handler error', { status: 500 });
        }
      },
    },
  },
});

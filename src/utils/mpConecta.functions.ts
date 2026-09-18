import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Conexão de cada organizador com a própria conta Mercado Pago (OAuth,
 * modelo "Split de Pagamentos 1:1"). Quando conectado, os pagamentos PIX
 * do racha dele passam a usar o access_token DELE (não o da plataforma),
 * com uma `application_fee` embutida — o Mercado Pago já divide o valor
 * na hora, mandando a comissão da plataforma direto pra conta da
 * plataforma e o resto direto pra conta do organizador. Ninguém precisa
 * de saque manual depois disso.
 *
 * Organizadores que não conectam continuam no modelo antigo (tudo cai na
 * conta da plataforma, saque manual depois) — a conexão é opcional, não
 * quebra quem ainda não conectou.
 */

function getSiteUrl(): string {
  return process.env.SITE_URL ?? "https://tanstack-start-app.jemtechsports.workers.dev";
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function hmacVerify(payload: string, signature: string, secret: string): Promise<boolean> {
  const expected = await hmacSign(payload, secret);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

/** Gera o `state` assinado (identifica o utilizador, sem precisar de cookie no callback). */
export async function gerarStateMpOAuth(userId: string): Promise<string | null> {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return null;
  const payload = btoa(JSON.stringify({ uid: userId, ts: Date.now() }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const sig = await hmacSign(payload, secret);
  return `${payload}.${sig}`;
}

/** Valida o `state` recebido de volta no callback e devolve o userId. */
export async function validarStateMpOAuth(state: string): Promise<string | null> {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return null;
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  if (!(await hmacVerify(payload, sig, secret))) return null;
  try {
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(padded)) as { uid: string; ts: number };
    if (Date.now() - json.ts > 15 * 60 * 1000) return null; // 15 min de validade
    return json.uid;
  } catch {
    return null;
  }
}

/** Devolve o link pra o organizador autorizar o Mercado Pago (fluxo OAuth). */
export const iniciarConexaoMp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const appId = process.env.MERCADOPAGO_APP_ID;
    if (!appId) {
      return { ok: false as const, error: "MERCADOPAGO_APP_ID não configurado" };
    }
    const state = await gerarStateMpOAuth(context.userId);
    if (!state) {
      return { ok: false as const, error: "Assinatura de state não configurada" };
    }
    const redirectUri = `${getSiteUrl()}/api/public/mp-oauth-callback`;
    const url =
      `https://auth.mercadopago.com.br/authorization?client_id=${encodeURIComponent(appId)}` +
      `&response_type=code&platform_id=mp&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}`;
    return { ok: true as const, url };
  });

/** Estado da conexão do organizador autenticado com o Mercado Pago. */
export const statusConexaoMp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("mp_contas")
      .select("mp_user_id, expires_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { ok: true as const, conectado: !!data, mpUserId: data?.mp_user_id ?? null };
  });

/** Desconecta a conta Mercado Pago do organizador (volta pro modelo antigo). */
export const desconectarMp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await supabaseAdmin
      .from("mp_contas")
      .delete()
      .eq("user_id", context.userId);
    if (error) return { ok: false as const, error: "Erro ao desconectar" };
    return { ok: true as const };
  });

type MpTokenResponse = {
  access_token: string;
  refresh_token?: string;
  public_key?: string;
  user_id?: number;
  expires_in?: number;
  scope?: string;
};

/** Troca o code do OAuth por um access_token — usado pela rota de callback. */
export async function trocarCodePorToken(
  code: string,
  redirectUri: string,
): Promise<MpTokenResponse | null> {
  const clientId = process.env.MERCADOPAGO_APP_ID;
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!clientId || !clientSecret || !accessToken) return null;

  const res = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${accessToken}`,
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    console.error("MP oauth/token error", res.status, await res.text());
    return null;
  }
  return (await res.json()) as MpTokenResponse;
}

async function renovarAccessToken(refreshToken: string): Promise<MpTokenResponse | null> {
  const clientId = process.env.MERCADOPAGO_APP_ID;
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    console.error("MP oauth refresh error", res.status, await res.text());
    return null;
  }
  return (await res.json()) as MpTokenResponse;
}

/**
 * Usado pelas funções de pagamento: devolve o access_token do organizador
 * (renovando sozinho se estiver perto de expirar), ou `null` se ele não
 * conectou a própria conta ainda — nesse caso o pagamento cai de volta no
 * modelo antigo (conta da plataforma, sem application_fee).
 */
export async function obterTokenOrganizador(organizadorId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("mp_contas")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", organizadorId)
    .maybeSingle();

  if (!data?.access_token) return null;

  const expiraEm = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  const faltamMenosDe10Min = expiraEm - Date.now() < 10 * 60 * 1000;

  if (faltamMenosDe10Min && data.refresh_token) {
    const renovado = await renovarAccessToken(data.refresh_token);
    if (renovado) {
      const novoExpiresAt = renovado.expires_in
        ? new Date(Date.now() + renovado.expires_in * 1000).toISOString()
        : null;
      await supabaseAdmin
        .from("mp_contas")
        .update({
          access_token: renovado.access_token,
          refresh_token: renovado.refresh_token ?? data.refresh_token,
          expires_at: novoExpiresAt,
        })
        .eq("user_id", organizadorId);
      return renovado.access_token;
    }
    // Falhou renovar — segue com o token antigo, pode dar erro na chamada
    // seguinte, mas não trava o pagamento de quem não precisava renovar.
  }

  return data.access_token;
}

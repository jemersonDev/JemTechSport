import { createFileRoute } from '@tanstack/react-router';

/**
 * Callback do fluxo OAuth do Mercado Pago (Split de Pagamentos).
 *
 * Configurar no painel MP > Sua aplicação > Redirect URL:
 *   https://<seu-dominio>/api/public/mp-oauth-callback
 *
 * O Mercado Pago redireciona o navegador do organizador de volta pra cá
 * com ?code=...&state=.... O `state` (assinado com MERCADOPAGO_WEBHOOK_SECRET)
 * identifica de qual utilizador é essa conexão, sem precisar de cookie de
 * sessão nesse pedido (o navegador pode chegar aqui "vindo de fora").
 */
export const Route = createFileRoute('/api/public/mp-oauth-callback')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const erro = url.searchParams.get('error');

        const siteUrl = process.env.SITE_URL ?? 'https://tanstack-start-app.jemtechsports.workers.dev';
        const voltar = (query: string) =>
          Response.redirect(`${siteUrl}/organizador?${query}`, 302);

        if (erro) {
          return voltar(`mp=erro&motivo=${encodeURIComponent(erro)}`);
        }
        if (!code || !state) {
          return voltar('mp=erro&motivo=parametros_ausentes');
        }

        const { validarStateMpOAuth, trocarCodePorToken } = await import(
          '@/utils/mpConecta.functions'
        );

        const userId = await validarStateMpOAuth(state);
        if (!userId) {
          return voltar('mp=erro&motivo=state_invalido');
        }

        const redirectUri = `${siteUrl}/api/public/mp-oauth-callback`;
        const token = await trocarCodePorToken(code, redirectUri);
        if (!token) {
          return voltar('mp=erro&motivo=troca_de_token_falhou');
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const expiresAt = token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000).toISOString()
          : null;

        const { error } = await supabaseAdmin.from('mp_contas').upsert(
          {
            user_id: userId,
            mp_user_id: token.user_id ? String(token.user_id) : null,
            access_token: token.access_token,
            refresh_token: token.refresh_token ?? null,
            public_key: token.public_key ?? null,
            scope: token.scope ?? null,
            expires_at: expiresAt,
          },
          { onConflict: 'user_id' },
        );

        if (error) {
          console.error('mp-oauth-callback: erro ao gravar mp_contas', error);
          return voltar('mp=erro&motivo=erro_ao_gravar');
        }

        return voltar('mp=conectado');
      },
    },
  },
});

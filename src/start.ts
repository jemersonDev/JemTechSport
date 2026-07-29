import { createStart } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

/**
 * Registro global de middleware de função do TanStack Start.
 *
 * SEM ESTE ARQUIVO, o navegador nunca anexa o token de autenticação
 * (Bearer) às chamadas de server functions — toda função que usa
 * `requireSupabaseAuth` no servidor falha com 401, mesmo com o
 * utilizador logado. Isso é silencioso: o TanStack Start considera
 * este arquivo opcional e não avisa se ele não existir.
 *
 * `attachSupabaseAuth` (client middleware, em auth-attacher.ts) lê a
 * sessão atual do Supabase no navegador e anexa
 * `Authorization: Bearer <access_token>` em toda chamada de servidor.
 */
export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
}));

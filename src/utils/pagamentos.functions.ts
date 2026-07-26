import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Cria um pagamento PIX no Mercado Pago para uma inscrição num racha.
 *
 * Fluxo:
 *   1. Valida que o utilizador é membro do racha e tem inscrição.
 *   2. Calcula valor (rateio): total_value / max_players. A taxa da
 *      plataforma é fixa: R$ 5,00 por racha (rateado) + R$ 0,12 por
 *      jogador. valor_organizador = valor_por_jogador - valor_plataforma.
 *   3. Chama a API do Mercado Pago para criar um pagamento PIX.
 *   4. Insere uma linha em `pagamentos` com status "pendente" + QR code.
 *      O webhook (api/public/mp-webhook) actualiza para "aprovado".
 */

export const TAXA_FIXA_RACHA = 5.0;
export const TAXA_POR_JOGADOR = 0.12;

const InputSchema = z.object({
  inscricaoId: z.string().uuid(),
});

type MpPixResponse = {
  id: number;
  status: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
};

export const criarPagamentoPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return { ok: false as const, error: "Mercado Pago não configurado" };
    }

    const { supabase, userId, claims } = context;

    // 1) Buscar inscrição (com RLS = utilizador só vê as suas / do seu racha)
    const { data: inscricao, error: insErr } = await supabase
      .from("inscricoes")
      .select("id, racha_id, user_id, paid, position")
      .eq("id", data.inscricaoId)
      .maybeSingle();

    if (insErr || !inscricao) {
      return { ok: false as const, error: "Inscrição não encontrada" };
    }
    if (inscricao.user_id !== userId) {
      return { ok: false as const, error: "Inscrição não é tua" };
    }
    if (inscricao.paid) {
      return { ok: false as const, error: "Já pago" };
    }
    if (inscricao.position === "goleiro") {
      return { ok: false as const, error: "Goleiro não paga" };
    }

    // 2) Buscar racha (admin = organizador)
    const { data: racha } = await supabase
      .from("rachas")
      .select("id, admin_id, name, total_value, app_fee, max_players")
      .eq("id", inscricao.racha_id)
      .maybeSingle();

    if (!racha) {
      return { ok: false as const, error: "Racha não encontrado" };
    }

    const maxPlayers = Math.max(1, racha.max_players);
    const valorTotalRacha = Number(racha.total_value) || 0;
    const valorPorJogador = +(valorTotalRacha / maxPlayers).toFixed(2);
    if (valorPorJogador <= 0) {
      return { ok: false as const, error: "Racha sem valor definido" };
    }
    // Taxa fixa: R$ 5,00 por racha (rateado pelos jogadores) + R$ 0,12 por jogador
    const valorPlataforma = +(
      TAXA_FIXA_RACHA / maxPlayers + TAXA_POR_JOGADOR
    ).toFixed(2);
    const valorOrganizador = +(valorPorJogador - valorPlataforma).toFixed(2);

    // 3) Verificar se já existe pagamento pendente para esta inscrição
    const { data: existing } = await supabaseAdmin
      .from("pagamentos")
      .select("id, status, mp_qr_code, mp_qr_code_base64, mp_ticket_url, mp_payment_id")
      .eq("inscricao_id", inscricao.id)
      .in("status", ["pendente"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && existing.mp_qr_code) {
      return {
        ok: true as const,
        pagamentoId: existing.id,
        qrCode: existing.mp_qr_code,
        qrCodeBase64: existing.mp_qr_code_base64,
        ticketUrl: existing.mp_ticket_url,
        valor: valorPorJogador,
      };
    }

    // 4) Criar pagamento PIX no MP
    const idempotencyKey = crypto.randomUUID();
    const payerEmail =
      (typeof claims.email === "string" && claims.email) || `user-${userId}@jemtech.local`;

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: valorPorJogador,
        description: `Racha: ${racha.name}`,
        payment_method_id: "pix",
        payer: { email: payerEmail },
        external_reference: inscricao.id,
        notification_url: `${process.env.SITE_URL ?? "https://project--13a4231e-8dba-4869-871b-742097393f53.lovable.app"}/api/public/mp-webhook`,
      }),
    });

    if (!mpRes.ok) {
      const errText = await mpRes.text();
      console.error("MP create payment error", mpRes.status, errText);
      return { ok: false as const, error: `Mercado Pago erro ${mpRes.status}` };
    }

    const mp = (await mpRes.json()) as MpPixResponse;
    const td = mp.point_of_interaction?.transaction_data;

    // 5) Gravar em pagamentos
    const { data: pag, error: pagErr } = await supabaseAdmin
      .from("pagamentos")
      .insert({
        racha_id: racha.id,
        inscricao_id: inscricao.id,
        payer_user_id: userId,
        organizador_id: racha.admin_id,
        valor_total: valorPorJogador,
        valor_organizador: valorOrganizador,
        valor_plataforma: valorPlataforma,
        metodo: "pix_mp",
        status: "pendente",
        mp_payment_id: String(mp.id),
        mp_qr_code: td?.qr_code ?? null,
        mp_qr_code_base64: td?.qr_code_base64 ?? null,
        mp_ticket_url: td?.ticket_url ?? null,
        raw: mp as never,
      })
      .select("id")
      .single();

    if (pagErr || !pag) {
      console.error("DB insert pagamento error", pagErr);
      return { ok: false as const, error: "Erro ao gravar pagamento" };
    }

    return {
      ok: true as const,
      pagamentoId: pag.id,
      qrCode: td?.qr_code ?? null,
      qrCodeBase64: td?.qr_code_base64 ?? null,
      ticketUrl: td?.ticket_url ?? null,
      valor: valorPorJogador,
    };
  });

/**
 * Sondagem do estado de um pagamento (para o cliente fazer polling
 * enquanto espera o webhook).
 */
const StatusInputSchema = z.object({
  pagamentoId: z.string().uuid(),
});

export const verPagamentoStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StatusInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: pag } = await supabase
      .from("pagamentos")
      .select("id, status, paid_at, payer_user_id")
      .eq("id", data.pagamentoId)
      .maybeSingle();

    if (!pag || pag.payer_user_id !== userId) {
      return { ok: false as const, error: "Pagamento não encontrado" };
    }
    return { ok: true as const, status: pag.status, paidAt: pag.paid_at };
  });

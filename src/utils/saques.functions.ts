import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Sistema de saque: organizador (ou a plataforma) pede transferência PIX
 * do saldo disponível. Pedidos até LIMITE_AUTO_APROVACAO são processados
 * automaticamente; acima disso, ficam esperando um admin aprovar.
 *
 * A transferência de verdade usa a API Payouts do Mercado Pago
 * (POST /v1/transaction-intents/process). Em produção essa API exige uma
 * assinatura Ed25519 do corpo da requisição (header X-signature) — a
 * chave pública correspondente precisa ser enviada manualmente pra
 * equipe de Integrações do Mercado Pago antes da primeira transferência
 * real funcionar (não tem como fazer isso só por código). A chave
 * privada correspondente fica no secret MP_PAYOUTS_PRIVATE_KEY.
 */

export const LIMITE_AUTO_APROVACAO = 250;

const InputSchema = z.object({
  valor: z.number().positive().max(100000),
  pixKey: z.string().trim().min(3).max(200),
  pixKeyType: z.enum(["cpf", "cnpj", "email", "telefone", "aleatoria"]),
  destinatarioNome: z.string().trim().max(120).optional(),
  destinatarioDocumento: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11 || v.length === 14, {
      message: "CPF (11 dígitos) ou CNPJ (14 dígitos) do dono da conta de destino",
    }),
});

async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.rpc("is_admin", { _user_id: userId });
  return !!data;
}

const CHAVE_TYPE_MAP: Record<string, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "EMAIL",
  telefone: "PHONE",
  aleatoria: "PIX_CODE",
};

/** Assina o corpo da requisição com Ed25519, conforme exigido em produção. */
async function assinarCorpoPayouts(bodyStr: string): Promise<string | null> {
  const privateKeyB64 = process.env.MP_PAYOUTS_PRIVATE_KEY;
  if (!privateKeyB64) return null;
  const keyBytes = Uint8Array.from(atob(privateKeyB64), (c) => c.charCodeAt(0));
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "Ed25519" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "Ed25519",
    privateKey,
    new TextEncoder().encode(bodyStr),
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Chama a API Payouts do Mercado Pago pra mandar o PIX de verdade.
 * Documentação: developers.mercadopago.com/pt/docs/payouts
 */
async function executarTransferenciaPix(opts: {
  saqueId: string;
  valor: number;
  pixKey: string;
  pixKeyType: string;
  destinatarioDocumento: string;
}): Promise<{ ok: true; mpTransferId: string } | { ok: false; error: string }> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return { ok: false, error: "Mercado Pago não configurado (MERCADOPAGO_ACCESS_TOKEN)" };
  }

  const chaveType = CHAVE_TYPE_MAP[opts.pixKeyType];
  if (!chaveType) {
    return { ok: false, error: `Tipo de chave PIX não suportado: ${opts.pixKeyType}` };
  }

  const documentoTipo = opts.destinatarioDocumento.length === 14 ? "CNPJ" : "CPF";
  const externalReference = opts.saqueId.replace(/-/g, "").slice(0, 64);
  const notificationUrl = `${
    process.env.SITE_URL ?? "https://tanstack-start-app.jemtechsports.workers.dev"
  }/api/public/mp-webhook`;

  const body = {
    external_reference: externalReference,
    point_of_interaction: { type: '{"type":"PSP_TRANSFER"}' },
    seller_configuration: { notification_info: { notification_url: notificationUrl } },
    transaction: {
      from: { accounts: [{ amount: opts.valor }] },
      to: {
        accounts: [
          {
            type: "current",
            amount: opts.valor,
            chave: { type: chaveType, value: opts.pixKey },
            owner: {
              identification: { type: documentoTipo, number: opts.destinatarioDocumento },
            },
          },
        ],
      },
      total_amount: opts.valor,
    },
  };
  const bodyStr = JSON.stringify(body);

  const signature = await assinarCorpoPayouts(bodyStr);
  if (!signature) {
    return {
      ok: false,
      error:
        "Transferência automática indisponível — o Mercado Pago ainda não libera saque manual pra essa conta. Peça pro organizador conectar a própria conta do Mercado Pago pra receber sem depender disso.",
    };
  }

  const mpRes = await fetch("https://api.mercadopago.com/v1/transaction-intents/process", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Idempotency-Key": externalReference,
      "X-signature": signature,
      "X-enforce-signature": "true",
      Authorization: `Bearer ${accessToken}`,
    },
    body: bodyStr,
  });

  const respText = await mpRes.text();
  let resp: { id?: string; status?: string; message?: string } = {};
  try {
    resp = JSON.parse(respText);
  } catch {
    // resposta não era JSON — segue com resp vazio, respText vai pro erro
  }

  if (!mpRes.ok) {
    console.error("MP payout error", mpRes.status, respText);
    return { ok: false, error: `Mercado Pago recusou (${mpRes.status}): ${resp.message ?? respText}` };
  }

  if (resp.status !== "approved") {
    console.error("MP payout não aprovado", respText);
    return {
      ok: false,
      error: `Transferência não aprovada (status: ${resp.status ?? "desconhecido"})`,
    };
  }

  return { ok: true, mpTransferId: resp.id ?? externalReference };
}

async function processarSaque(
  saqueId: string,
  valor: number,
  pixKey: string,
  pixKeyType: string,
  destinatarioDocumento: string | null,
) {
  await supabaseAdmin.from("saques").update({ status: "processando" }).eq("id", saqueId);

  if (!destinatarioDocumento) {
    await supabaseAdmin
      .from("saques")
      .update({ status: "falhou", notas: "Documento (CPF/CNPJ) do destinatário não informado" })
      .eq("id", saqueId);
    return;
  }

  const resultado = await executarTransferenciaPix({
    saqueId,
    valor,
    pixKey,
    pixKeyType,
    destinatarioDocumento,
  });

  if (resultado.ok) {
    await supabaseAdmin
      .from("saques")
      .update({
        status: "pago",
        mp_transfer_id: resultado.mpTransferId,
        paid_at: new Date().toISOString(),
      })
      .eq("id", saqueId);
  } else {
    await supabaseAdmin
      .from("saques")
      .update({ status: "falhou", notas: resultado.error })
      .eq("id", saqueId);
  }
}

/** Organizador solicita saque do próprio saldo (pagamentos PIX do racha dele). */
export const solicitarSaque = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: saldoDisponivel, error: saldoErr } = await supabaseAdmin.rpc(
      "get_saldo_disponivel_saque",
      { _organizador_id: userId },
    );
    if (saldoErr) {
      console.error("solicitarSaque: erro ao calcular saldo", saldoErr);
      return { ok: false as const, error: "Erro ao calcular saldo disponível" };
    }

    const disponivel = Number(saldoDisponivel ?? 0);
    if (data.valor > disponivel) {
      return {
        ok: false as const,
        error: `Saldo insuficiente. Disponível: R$ ${disponivel.toFixed(2)}`,
      };
    }

    const precisaAprovacao = data.valor > LIMITE_AUTO_APROVACAO;

    const { data: saque, error } = await supabaseAdmin
      .from("saques")
      .insert({
        organizador_id: userId,
        is_plataforma: false,
        valor: data.valor,
        pix_key: data.pixKey,
        pix_key_type: data.pixKeyType,
        destinatario_nome: data.destinatarioNome || null,
        destinatario_documento: data.destinatarioDocumento,
        status: precisaAprovacao ? "aguardando_aprovacao" : "processando",
      })
      .select("id")
      .single();

    if (error || !saque) {
      console.error("solicitarSaque: erro ao inserir", error);
      return {
        ok: false as const,
        error: `Erro ao criar pedido de saque: ${error?.message ?? "desconhecido"}`,
      };
    }

    if (!precisaAprovacao) {
      // Precisa ESPERAR terminar de verdade — no Cloudflare Workers,
      // qualquer trabalho assíncrono que não seja aguardado é encerrado
      // assim que a resposta é enviada, então "rodar em segundo plano"
      // sem "await" deixava o saque preso pra sempre em "processando".
      await processarSaque(
        saque.id,
        data.valor,
        data.pixKey,
        data.pixKeyType,
        data.destinatarioDocumento,
      );
    }

    return { ok: true as const, saqueId: saque.id, precisaAprovacao };
  });

/** Saldo disponível pra saque do organizador autenticado. */
export const verSaldoDisponivel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin.rpc("get_saldo_disponivel_saque", {
      _organizador_id: context.userId,
    });
    if (error) return { ok: false as const, error: "Erro ao calcular saldo" };
    return { ok: true as const, saldo: Number(data ?? 0) };
  });

/** Lista os saques do organizador autenticado (histórico). */
export const listarMeusSaques = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("saques")
      .select("id,valor,pix_key,pix_key_type,destinatario_nome,status,created_at,paid_at,notas")
      .eq("organizador_id", context.userId)
      .eq("is_plataforma", false)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { ok: false as const, error: "Erro ao listar saques" };
    return { ok: true as const, saques: data ?? [] };
  });

// ============== PAINEL DO ADMIN (dono do app) ==============

/** Saldo acumulado das taxas da plataforma (só admin). */
export const verSaldoPlataforma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await checkIsAdmin(context.userId))) {
      return { ok: false as const, error: "Sem permissão" };
    }
    const { data, error } = await supabaseAdmin.rpc("get_saldo_plataforma");
    if (error) return { ok: false as const, error: "Erro ao calcular saldo" };
    return { ok: true as const, saldo: Number(data ?? 0) };
  });

/** Quantidade de organizadores distintos usando o app (só admin). */
export const contarOrganizadores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await checkIsAdmin(context.userId))) {
      return { ok: false as const, error: "Sem permissão" };
    }
    const { data, error } = await supabaseAdmin.rpc("contar_organizadores");
    if (error) return { ok: false as const, error: "Erro ao contar organizadores" };
    return { ok: true as const, total: Number(data ?? 0) };
  });

/** Admin (dono do app) solicita saque das taxas acumuladas. */
const SaquePlataformaSchema = z.object({
  valor: z.number().positive().max(1000000),
  pixKey: z.string().trim().min(3).max(200),
  pixKeyType: z.enum(["cpf", "cnpj", "email", "telefone", "aleatoria"]),
  destinatarioDocumento: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11 || v.length === 14, {
      message: "CPF (11 dígitos) ou CNPJ (14 dígitos) do dono da conta de destino",
    }),
});

export const solicitarSaquePlataforma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaquePlataformaSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (!(await checkIsAdmin(context.userId))) {
      return { ok: false as const, error: "Sem permissão" };
    }
    const { data: saldo, error: saldoErr } = await supabaseAdmin.rpc("get_saldo_plataforma");
    if (saldoErr) return { ok: false as const, error: "Erro ao calcular saldo" };

    const disponivel = Number(saldo ?? 0);
    if (data.valor > disponivel) {
      return {
        ok: false as const,
        error: `Saldo insuficiente. Disponível: R$ ${disponivel.toFixed(2)}`,
      };
    }

    const { data: saque, error } = await supabaseAdmin
      .from("saques")
      .insert({
        organizador_id: context.userId,
        is_plataforma: true,
        valor: data.valor,
        pix_key: data.pixKey,
        pix_key_type: data.pixKeyType,
        destinatario_documento: data.destinatarioDocumento,
        status: "aguardando_aprovacao",
      })
      .select("id")
      .single();

    if (error || !saque) {
      console.error("solicitarSaquePlataforma: erro ao inserir", error);
      return {
        ok: false as const,
        error: `Erro ao criar pedido de saque: ${error?.message ?? "desconhecido"}`,
      };
    }
    return { ok: true as const, saqueId: saque.id };
  });

/** Admin aprova um saque que estava esperando aprovação (acima do limite). */
const AprovarSaqueSchema = z.object({ saqueId: z.string().uuid() });

export const aprovarSaque = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AprovarSaqueSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (!(await checkIsAdmin(context.userId))) {
      return { ok: false as const, error: "Sem permissão" };
    }
    const { data: saque } = await supabaseAdmin
      .from("saques")
      .select("id,valor,pix_key,pix_key_type,status,destinatario_documento")
      .eq("id", data.saqueId)
      .maybeSingle();

    if (!saque || saque.status !== "aguardando_aprovacao") {
      return { ok: false as const, error: "Pedido não encontrado ou já processado" };
    }

    await supabaseAdmin
      .from("saques")
      .update({ processado_por: context.userId })
      .eq("id", data.saqueId);

    await processarSaque(
      saque.id,
      Number(saque.valor),
      saque.pix_key,
      saque.pix_key_type,
      saque.destinatario_documento,
    );
    return { ok: true as const };
  });

/** Admin rejeita um pedido de saque (não debita saldo). */
const RejeitarSaqueSchema = z.object({ saqueId: z.string().uuid(), motivo: z.string().max(300).optional() });

export const rejeitarSaque = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RejeitarSaqueSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (!(await checkIsAdmin(context.userId))) {
      return { ok: false as const, error: "Sem permissão" };
    }
    const { error } = await supabaseAdmin
      .from("saques")
      .update({
        status: "rejeitado",
        notas: data.motivo ?? null,
        processado_por: context.userId,
      })
      .eq("id", data.saqueId)
      .eq("status", "aguardando_aprovacao");

    if (error) return { ok: false as const, error: "Erro ao rejeitar" };
    return { ok: true as const };
  });

/** Lista todos os pedidos de saque pendentes de aprovação (só admin). */
export const listarSaquesPendentes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await checkIsAdmin(context.userId))) {
      return { ok: false as const, error: "Sem permissão" };
    }
    const { data, error } = await supabaseAdmin
      .from("saques")
      .select(
        "id,organizador_id,is_plataforma,valor,pix_key,pix_key_type,destinatario_nome,status,created_at",
      )
      .eq("status", "aguardando_aprovacao")
      .order("created_at", { ascending: true });

    if (error) return { ok: false as const, error: "Erro ao listar" };

    const ids = Array.from(new Set((data ?? []).map((s) => s.organizador_id)));
    let nameMap = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("user_id,display_name")
        .in("user_id", ids);
      nameMap = new Map((profs ?? []).map((p) => [p.user_id, p.display_name]));
    }

    return {
      ok: true as const,
      saques: (data ?? []).map((s) => ({
        ...s,
        valor: Number(s.valor),
        organizador_nome: nameMap.get(s.organizador_id) ?? "—",
      })),
    };
  });

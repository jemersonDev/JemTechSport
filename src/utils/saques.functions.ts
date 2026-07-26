import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Sistema de saque: organizador (ou a plataforma) pede transferência PIX
 * do saldo disponível. Pedidos até LIMITE_AUTO_APROVACAO são processados
 * automaticamente; acima disso, ficam esperando um admin aprovar.
 *
 * ⚠️ IMPORTANTE — leia antes de usar em produção:
 * A função `executarTransferenciaPix` abaixo é um STUB. Ela ainda não
 * chama a API real de transferência do Mercado Pago — hoje ela só marca
 * o pedido como "falhou" com uma mensagem clara, pra nunca fingir que
 * mandou dinheiro sem ter mandado de verdade. Antes de usar de verdade,
 * confirme na documentação atual do Mercado Pago (developers.mercadopago.com)
 * qual é o endpoint certo pra "enviar PIX pra uma chave de terceiro" pela
 * conta da plataforma, e implemente a chamada real ali dentro. Essa API
 * pode exigir aprovação especial de conta (tipo "Payouts"/Marketplace) e
 * os detalhes mudam com frequência — não dá pra confiar num endpoint
 * "decorado" sem confirmar primeiro.
 */

export const LIMITE_AUTO_APROVACAO = 250;

const InputSchema = z.object({
  valor: z.number().positive().max(100000),
  pixKey: z.string().trim().min(3).max(200),
  pixKeyType: z.enum(["cpf", "cnpj", "email", "telefone", "aleatoria"]),
  destinatarioNome: z.string().trim().max(120).optional(),
});

async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.rpc("is_admin", { _user_id: userId });
  return !!data;
}

/**
 * STUB — ver aviso no topo do arquivo. Hoje sempre retorna falha, de
 * propósito, até a chamada real ser implementada e testada.
 */
async function executarTransferenciaPix(_opts: {
  valor: number;
  pixKey: string;
  pixKeyType: string;
}): Promise<{ ok: true; mpTransferId: string } | { ok: false; error: string }> {
  return {
    ok: false,
    error:
      "Transferência automática ainda não configurada — confirme o endpoint da API do Mercado Pago antes de habilitar.",
  };
}

async function processarSaque(saqueId: string, valor: number, pixKey: string, pixKeyType: string) {
  await supabaseAdmin.from("saques").update({ status: "processando" }).eq("id", saqueId);

  const resultado = await executarTransferenciaPix({ valor, pixKey, pixKeyType });

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
        status: precisaAprovacao ? "aguardando_aprovacao" : "processando",
      })
      .select("id")
      .single();

    if (error || !saque) {
      console.error("solicitarSaque: erro ao inserir", error);
      return { ok: false as const, error: "Erro ao criar pedido de saque" };
    }

    if (!precisaAprovacao) {
      // Processa "em segundo plano" (não bloqueia a resposta ao usuário).
      processarSaque(saque.id, data.valor, data.pixKey, data.pixKeyType).catch((e) =>
        console.error("processarSaque error", e),
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
        status: "aguardando_aprovacao",
      })
      .select("id")
      .single();

    if (error || !saque) {
      console.error("solicitarSaquePlataforma: erro ao inserir", error);
      return { ok: false as const, error: "Erro ao criar pedido de saque" };
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
      .select("id,valor,pix_key,pix_key_type,status")
      .eq("id", data.saqueId)
      .maybeSingle();

    if (!saque || saque.status !== "aguardando_aprovacao") {
      return { ok: false as const, error: "Pedido não encontrado ou já processado" };
    }

    await supabaseAdmin
      .from("saques")
      .update({ processado_por: context.userId })
      .eq("id", data.saqueId);

    await processarSaque(saque.id, Number(saque.valor), saque.pix_key, saque.pix_key_type);
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

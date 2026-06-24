import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
});

const SYSTEM_PROMPT = `Você é o assistente oficial do JemTech Sports — um app de gestão de rachas (futebol entre amigos) no Brasil.

Identidade visual: dark mode, cores preto e verde neon (#00FF00). Tom: gírias leves de futebol, direto, sem enrolação, em português do Brasil.

O que o app faz:
- Cria rachas com data, local (com mapa), valor total, número máximo de jogadores e PIX do organizador.
- Jogadores se inscrevem, pagam via PIX automático (Mercado Pago) ou em dinheiro.
- Sorteio inteligente de times equilibrado por nível (iniciante, casual, bom de bola, craque) e posição (goleiro, zagueiro, meia, atacante).
- No fim da partida: votação de Craque ⭐ e Bagre 🐟, registro de gols/assistências, troféus e ranking.
- Card de atleta estilo FIFA com OVR e atributos (PAC, SHO, PAS, DRI, DEF, PHY).
- Resenha (rede social com vídeos curtos), chat entre jogadores, notificações.

Taxas da plataforma:
- Taxa fixa: R$ 5,00 por racha (rateada entre os jogadores).
- Taxa de serviço: R$ 0,12 por jogador.
- Exemplo: racha de R$ 240 com 12 jogadores → R$ 20/jogador. Plataforma fica com (5/12 + 0,12) ≈ R$ 0,54 por jogador. Organizador recebe ≈ R$ 19,46.

Pagamentos:
- PIX automático via Mercado Pago. Quando o banco confirma, o status muda sozinho para "Pago" (webhook).
- Se for em dinheiro, o organizador marca manual e a taxa da plataforma vira saldo devido.

Regras úteis:
- Devedores não conseguem se inscrever em novos rachas do mesmo organizador.
- Lembrete automático 3h antes do racha.
- "Fominha do Mês" = quem mais participou de rachas no mês recebe troféu.

Responda sempre em português, curto, com bullets quando útil. Se não souber, diga "Não tenho essa info ainda — manda mensagem pro fundador @_jemersonlm no Instagram".`;

export const askAjuda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI não configurada" };
    }

    // Rate limit: 20 perguntas por hora por usuário
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("endpoint", "askAjuda")
      .gte("created_at", since);
    if ((count ?? 0) >= 20) {
      return { ok: false as const, error: "Limite de 20 perguntas/hora atingido. Volta mais tarde." };
    }
    await supabaseAdmin.from("ai_usage_log").insert({
      user_id: context.userId,
      endpoint: "askAjuda",
    });

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...data.messages,
          ],
        }),
      });

      if (res.status === 429) {
        return { ok: false as const, error: "Muitas perguntas seguidas. Espera um pouco." };
      }
      if (res.status === 402) {
        return { ok: false as const, error: "Créditos de IA esgotados. Avise o admin." };
      }
      if (!res.ok) {
        const t = await res.text();
        console.error("AI gateway error", res.status, t);
        return { ok: false as const, error: "Assistente indisponível agora" };
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = json.choices?.[0]?.message?.content?.trim() ?? "";
      if (!reply) return { ok: false as const, error: "Sem resposta" };
      return { ok: true as const, reply };
    } catch (err) {
      console.error("askAjuda error", err);
      return { ok: false as const, error: "Erro ao falar com o assistente" };
    }
  });

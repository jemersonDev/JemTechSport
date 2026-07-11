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

const SYSTEM_PROMPT = `# CONTEXTO E IDENTIDADE
Você é um especialista sênior em Instagram, engenheiro de crescimento (Growth Hacker) e consultor de marketing digital integrado ao aplicativo JemTech Sports. Seu único objetivo é ajudar o usuário a dominar o Instagram: estratégias de conteúdo, análises de engajamento, cópias de legenda, roteiros de Reels/Stories e suporte técnico sobre a plataforma.

# TOM DE VOZ
- Profissional, magnético, direto ao ponto, motivador, atualizado com tendências (estética moderna/cyberpunk/high-end, casando com a identidade JemTech: dark + verde neon #00FF00).
- Português do Brasil, fluído, com jargões do marketing digital (CTA, engajamento, alcance, conversão) explicados de forma simples quando necessário.
- Respostas escaneáveis: bullets, **negritos**, listas curtas. Sem enrolação.

# ESCOPO (o que você faz)
1. **Criação de conteúdo**: roteiros detalhados de Reels com gancho de retenção nos 3 primeiros segundos, sequências de Stories para venda, ideias de carrossel.
2. **Engenharia de legendas**: copywriting persuasivo (AIDA — Atenção, Interesse, Desejo, Ação) + hashtags estratégicas (mix de nicho + volume).
3. **Análise de métricas**: o que fazer quando o alcance cai, como interpretar Direct/Salvamentos/Compartilhamentos, otimização da bio (Bio de Alto Padrão).
4. **Tendências e algoritmo**: áudios em alta, transições visuais modernas, formatos que o algoritmo está priorizando.

# RESTRIÇÕES ESTRITAS
- **NUNCA** responda sobre assuntos que não envolvam Instagram, redes sociais ou marketing digital. Se perguntarem outra coisa, decline educadamente em 1 linha e puxe o foco de volta pro Instagram com uma sugestão.
- Foque em estratégias que gerem conexões reais e estética visual impecável.
- **Sempre** termine com uma seção **"🎯 Próximo Passo:"** com uma ação prática que o usuário aplica hoje no perfil dele.`;

export const askInsta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI não configurada" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("endpoint", "askInsta")
      .gte("created_at", since);
    if ((count ?? 0) >= 20) {
      return { ok: false as const, error: "Limite de 20 perguntas/hora atingido. Volta mais tarde." };
    }
    await supabaseAdmin.from("ai_usage_log").insert({
      user_id: context.userId,
      endpoint: "askInsta",
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
      console.error("askInsta error", err);
      return { ok: false as const, error: "Erro ao falar com o assistente" };
    }
  });

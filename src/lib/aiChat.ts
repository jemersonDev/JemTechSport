import { z } from "zod";
import type { supabaseAdmin } from "@/integrations/supabase/client.server";

export const AiMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

export const AiChatInputSchema = z.object({
  messages: z.array(AiMessageSchema).min(1).max(20),
});

export type AiChatInput = z.infer<typeof AiChatInputSchema>;
export type AiChatMessage = z.infer<typeof AiMessageSchema>;

export type AiChatResult = { ok: true; reply: string } | { ok: false; error: string };

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";
const RATE_LIMIT_PER_HOUR = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

interface AiGatewayResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * Checks and records hourly per-user rate limiting for a given AI endpoint,
 * using the `ai_usage_log` table. Returns `null` when the caller is within
 * the limit, or an `AiChatResult` error to return immediately otherwise.
 */
export async function checkAiRateLimit(
  db: typeof supabaseAdmin,
  userId: string,
  endpoint: string,
): Promise<AiChatResult | null> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count } = await db
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .gte("created_at", since);

  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return {
      ok: false,
      error: `Limite de ${RATE_LIMIT_PER_HOUR} perguntas/hora atingido. Volta mais tarde.`,
    };
  }

  await db.from("ai_usage_log").insert({ user_id: userId, endpoint });
  return null;
}

/**
 * Calls the shared AI gateway with a system prompt + conversation history,
 * translating gateway status codes into user-facing error messages.
 */
export async function callAiGateway(
  apiKey: string,
  systemPrompt: string,
  messages: AiChatMessage[],
): Promise<AiChatResult> {
  try {
    const res = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });

    if (res.status === 429) {
      return { ok: false, error: "Muitas perguntas seguidas. Espera um pouco." };
    }
    if (res.status === 402) {
      return { ok: false, error: "Créditos de IA esgotados. Avise o admin." };
    }
    if (!res.ok) {
      const t = await res.text();
      console.error("AI gateway error", res.status, t);
      return { ok: false, error: "Assistente indisponível agora" };
    }

    const json = (await res.json()) as AiGatewayResponse;
    const reply = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!reply) return { ok: false, error: "Sem resposta" };
    return { ok: true, reply };
  } catch (err) {
    console.error("AI gateway call failed", err);
    return { ok: false, error: "Erro ao falar com o assistente" };
  }
}

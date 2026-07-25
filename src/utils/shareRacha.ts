type ShareableRacha = {
  name: string;
  invite_code: string;
  scheduled_at?: string | null;
  address?: string | null;
};

/** Monta o texto de convite (WhatsApp / Web Share) para um racha. */
export function buildRachaShareMessage(racha: ShareableRacha): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://app.jemtech.lovable.app";
  const url = `${origin}/r/${racha.invite_code}`;
  const when = racha.scheduled_at
    ? new Date(racha.scheduled_at).toLocaleString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Data a definir";

  return `🏟️ Bora jogar racha?\n\n${racha.name}\n${when}\n${racha.address ?? ""}\n\nConfirma aí: ${url}`;
}

/**
 * Compartilha o convite do racha via Web Share API nativa (quando disponível)
 * ou abre o WhatsApp Web/app como alternativa.
 */
export function shareRachaViaWhatsApp(racha: ShareableRacha): void {
  const text = buildRachaShareMessage(racha);
  if (typeof navigator !== "undefined" && navigator.share) {
    navigator.share({ title: racha.name, text }).catch(() => {});
    return;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

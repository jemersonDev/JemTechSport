type ShareableRacha = {
  name: string;
  invite_code: string;
  scheduled_at?: string | null;
  address?: string | null;
};

/** Endereço público do app (usado quando não há window, ex.: SSR). */
export const APP_URL = "https://tanstack-start-app.jemtechsports.workers.dev";

function appOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : APP_URL;
}

/** Link simples do app (abre a página de apresentação). */
export function appInviteLink(): string {
  return `${appOrigin()}/lp`;
}

/** Texto de convite do app, sem emojis (alguns aparelhos mostram quebrado). */
export function buildAppInviteMessage(): string {
  return `Estou usando o JemTech Sports pra organizar o racha: lista, times, pagamento por PIX e ranking.\n\nEntra aqui: ${appInviteLink()}\n\nNo iPhone: abra no Safari > Compartilhar > Adicionar à Tela de Início.\nNo Android: abra no Chrome > menu > Instalar app.`;
}

/** Convida um amigo para o app (Web Share nativo ou WhatsApp). */
export function shareAppInvite(): void {
  const text = buildAppInviteMessage();
  if (typeof navigator !== "undefined" && navigator.share) {
    navigator.share({ title: "JemTech Sports", text }).catch(() => {});
    return;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

/** Monta o texto de convite (WhatsApp / Web Share) para um racha. */
export function buildRachaShareMessage(racha: ShareableRacha): string {
  const url = `${appOrigin()}/r/${racha.invite_code}`;
  const when = racha.scheduled_at
    ? new Date(racha.scheduled_at).toLocaleString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Data a definir";

  return `Bora jogar racha?\n\n${racha.name}\n${when}\n${racha.address ?? ""}\n\nConfirma aí: ${url}\n\nAinda não tem o app? ${appInviteLink()}`;
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

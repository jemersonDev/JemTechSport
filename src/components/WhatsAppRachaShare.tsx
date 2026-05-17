import { Button } from "@/components/ui/button";
import { MessageCircle, Link as LinkIcon } from "lucide-react";

type Props = {
  rachaName: string;
  inviteCode: string;
  scheduledAt?: string | null;
  location?: string | null;
  whatsappGroupLink?: string | null;
};

export function WhatsAppRachaShare({
  rachaName,
  inviteCode,
  scheduledAt,
  location,
  whatsappGroupLink,
}: Props) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://app.jemtech.lovable.app";
  const link = `${origin}/r/${inviteCode}`;

  const when = scheduledAt
    ? new Date(scheduledAt).toLocaleString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const msg = [
    `⚽ *${rachaName}*`,
    when ? `📅 ${when}` : null,
    location ? `📍 ${location}` : null,
    "",
    "Bora jogar! Confirma sua presença aqui 👇",
    link,
    "",
    `Código: *${inviteCode}*`,
  ]
    .filter(Boolean)
    .join("\n");

  const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;

  return (
    <div className="flex flex-col gap-2">
      <Button
        asChild
        className="bg-[#25D366] hover:bg-[#1ebe5a] text-black gap-2"
      >
        <a href={waUrl} target="_blank" rel="noreferrer">
          <MessageCircle className="w-4 h-4" />
          Compartilhar no WhatsApp
        </a>
      </Button>
      {whatsappGroupLink && (
        <Button asChild variant="outline" size="sm" className="gap-2">
          <a href={whatsappGroupLink} target="_blank" rel="noreferrer">
            <LinkIcon className="w-4 h-4" />
            Abrir grupo do racha
          </a>
        </Button>
      )}
    </div>
  );
}

// Geração de imagem + compartilhamento robusto para cards/stories.
// Usa html-to-image (foreignObject SVG) com fallback para html2canvas,
// detecta suporte a navigator.share, e cai pra download automático.

import { toBlob as htiToBlob } from "html-to-image";
import { toast } from "sonner";

type ShareOptions = {
  node: HTMLElement;
  fileName: string;
  title?: string;
  text?: string;
  /** Se true, ignora navigator.share e força download. */
  forceDownload?: boolean;
};

const GEN_TIMEOUT_MS = 10_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function generateBlob(node: HTMLElement): Promise<Blob> {
  // 1ª tentativa: html-to-image (preserva mask-image, filters, gradients)
  try {
    const blob = await withTimeout(
      htiToBlob(node, {
        pixelRatio: 2,
        quality: 0.8,
        cacheBust: true,
        backgroundColor: undefined,
        // Ignora imagens cross-origin não decodificáveis em vez de quebrar
        skipFonts: false,
      }),
      GEN_TIMEOUT_MS,
      "html-to-image",
    );
    if (blob && blob.size > 0) return blob;
    throw new Error("blob vazio");
  } catch (err) {
    console.warn("[shareImage] html-to-image falhou, tentando html2canvas:", err);
  }

  // 2ª tentativa: html2canvas (mais tolerante a alguns casos legacy)
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await withTimeout(
    html2canvas(node, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
    }),
    GEN_TIMEOUT_MS,
    "html2canvas",
  );
  const blob: Blob | null = await new Promise((res) =>
    canvas.toBlob((b) => res(b), "image/png", 0.8),
  );
  if (!blob) throw new Error("toBlob retornou null");
  return blob;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // pequeno delay para o navegador iniciar o download antes de revogar
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Deve ser chamado a partir de um event handler de clique (user gesture)
 * para não ser bloqueado por Chrome/Safari.
 */
export async function shareOrDownloadImage({
  node,
  fileName,
  title,
  text,
  forceDownload,
}: ShareOptions): Promise<"shared" | "downloaded"> {
  const blob = await generateBlob(node);
  const file = new File([blob], fileName, { type: "image/png" });

  const navAny = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
    share?: (data: ShareData & { files?: File[] }) => Promise<void>;
  };

  const canShareFiles =
    !forceDownload &&
    typeof navAny.share === "function" &&
    typeof navAny.canShare === "function" &&
    navAny.canShare({ files: [file] });

  if (canShareFiles) {
    try {
      await navAny.share!({ files: [file], title, text });
      return "shared";
    } catch (err) {
      // AbortError = usuário cancelou; não trata como falha
      if ((err as DOMException)?.name === "AbortError") {
        return "shared";
      }
      console.warn("[shareImage] navigator.share falhou, baixando:", err);
    }
  }

  triggerDownload(blob, fileName);
  return "downloaded";
}

/** Helper para mostrar mensagem amigável em catch. */
export function reportShareError(err: unknown) {
  console.error("[shareImage] erro real:", err);
  toast.error("Estamos preparando seu card, tente novamente em instantes");
}

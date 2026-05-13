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

// Converte uma URL de imagem para data URL (evita CORS taint no canvas)
async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Pre-carrega todas as <img> do nó como data URL e aguarda decode.
// Resolve o erro silencioso de html-to-image quando imagens cross-origin falham.
async function inlineImages(node: HTMLElement): Promise<void> {
  const imgs = Array.from(node.querySelectorAll("img")) as HTMLImageElement[];
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.currentSrc || img.src;
      if (!src || src.startsWith("data:")) return;
      const dataUrl = await urlToDataUrl(src);
      if (dataUrl) {
        img.crossOrigin = "anonymous";
        img.src = dataUrl;
      }
      try {
        await img.decode();
      } catch {
        // ignora — html-to-image vai pular se não conseguir
      }
    }),
  );
}

async function generateBlob(node: HTMLElement): Promise<Blob> {
  // Pré-processa imagens externas → data URL (evita falha silenciosa do html-to-image)
  await inlineImages(node);

  const blob = await withTimeout(
    htiToBlob(node, {
      pixelRatio: 2,
      quality: 0.92,
      cacheBust: false,
      backgroundColor: undefined,
      skipFonts: false,
      // Se uma imagem ainda falhar, substitui por pixel transparente em vez de quebrar
      imagePlaceholder:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    }),
    GEN_TIMEOUT_MS,
    "html-to-image",
  );
  if (!blob || blob.size === 0) throw new Error("Geração de imagem retornou vazio");
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

  const hasShare = !forceDownload && typeof navAny.share === "function";
  // Em alguns browsers Android, canShare existe mas é conservador.
  // Em outros (in-app webviews), canShare nem existe mas share funciona.
  const canShareFiles =
    hasShare &&
    (typeof navAny.canShare !== "function" || navAny.canShare({ files: [file] }));

  if (hasShare && canShareFiles) {
    try {
      await navAny.share!({ files: [file], title, text });
      return "shared";
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === "AbortError") return "shared";
      console.warn("[shareImage] share com arquivo falhou:", err);
      // Continua para fallbacks abaixo
    }
  }

  // Fallback 1: tentar share só com texto/título (sem arquivo)
  if (hasShare && !forceDownload) {
    try {
      await navAny.share!({ title, text });
      // baixa também pra usuário poder anexar manualmente
      triggerDownload(blob, fileName);
      return "shared";
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === "AbortError") return "shared";
      console.warn("[shareImage] share sem arquivo falhou:", err);
    }
  }

  // Fallback final: download direto
  triggerDownload(blob, fileName);
  return "downloaded";
}

/** Helper para mostrar mensagem amigável em catch. */
export function reportShareError(err: unknown) {
  console.error("[shareImage] erro real:", err);
  toast.error("Estamos preparando seu card, tente novamente em instantes");
}

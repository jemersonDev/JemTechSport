// Remove o fundo de uma imagem usando modelo de segmentação rodando no browser.
// Lazy: só carrega quando chamado. Cachea o resultado em memória + sessionStorage.

const MAX_DIM = 1024;

let pipelinePromise: Promise<unknown> | null = null;
const memCache = new Map<string, string>();

async function getPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      return pipeline("background-removal", "briaai/RMBG-1.4", {
        device: "webgpu",
      } as Parameters<typeof pipeline>[2]).catch(() =>
        pipeline("background-removal", "briaai/RMBG-1.4"),
      );
    })();
  }
  return pipelinePromise;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function resizeToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  let { width, height } = img;
  if (width > MAX_DIM || height > MAX_DIM) {
    const scale = MAX_DIM / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
  return canvas;
}

export async function removeBackgroundFromUrl(url: string): Promise<string> {
  if (memCache.has(url)) return memCache.get(url)!;
  try {
    const cached = sessionStorage.getItem(`bg-rm:${url}`);
    if (cached) {
      memCache.set(url, cached);
      return cached;
    }
  } catch {
    /* ignore */
  }

  const img = await loadImage(url);
  const canvas = resizeToCanvas(img);

  const pipe = (await getPipeline()) as (
    input: HTMLCanvasElement,
  ) => Promise<unknown>;
  const result = (await pipe(canvas)) as
    | { toCanvas?: () => HTMLCanvasElement }
    | Array<{ mask?: { data: Uint8Array; width: number; height: number } }>;

  let outCanvas: HTMLCanvasElement;
  if (Array.isArray(result) && result[0]?.mask) {
    const { mask } = result[0];
    outCanvas = document.createElement("canvas");
    outCanvas.width = canvas.width;
    outCanvas.height = canvas.height;
    const ctx = outCanvas.getContext("2d")!;
    ctx.drawImage(canvas, 0, 0);
    const imageData = ctx.getImageData(0, 0, outCanvas.width, outCanvas.height);
    const data = imageData.data;
    const m = mask!.data;
    for (let i = 0; i < m.length; i++) {
      data[i * 4 + 3] = m[i];
    }
    ctx.putImageData(imageData, 0, 0);
  } else if (
    typeof (result as { toCanvas?: () => HTMLCanvasElement }).toCanvas ===
    "function"
  ) {
    outCanvas = (result as { toCanvas: () => HTMLCanvasElement }).toCanvas();
  } else {
    return url;
  }

  const dataUrl = outCanvas.toDataURL("image/png");
  memCache.set(url, dataUrl);
  try {
    sessionStorage.setItem(`bg-rm:${url}`, dataUrl);
  } catch {
    /* quota */
  }
  return dataUrl;
}

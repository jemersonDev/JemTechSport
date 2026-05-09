/**
 * Realce automático para a foto do "card lendário".
 *
 * Recebe um Blob PNG (idealmente já com fundo transparente) e devolve outro
 * Blob PNG com:
 *  - Crop em retrato 3:4 (busto), centralizando o conteúdo opaco do recorte.
 *  - Boost automático de brilho / contraste / saturação para casar com o
 *    ambiente metálico e luminoso do escudo dourado.
 *  - Luz suave (soft light) aplicada por cima do recorte.
 *
 * Tudo em canvas — roda 100% no browser, sem libs extras.
 */

const TARGET_W = 768;
const TARGET_H = 1024; // 3:4 retrato

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/** Detecta o bounding box dos pixels opacos (alpha > threshold). */
function detectAlphaBounds(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number } {
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0;
  let found = false;
  // Amostragem leve para performance (a cada 2 px)
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > 32) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }
  if (!found) return { x: 0, y: 0, w, h };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export async function enhanceCardPhoto(input: Blob): Promise<Blob> {
  const img = await loadImage(input);

  // 1. Desenha em canvas auxiliar para detectar bounds do conteúdo opaco
  const src = document.createElement("canvas");
  src.width = img.naturalWidth;
  src.height = img.naturalHeight;
  const sctx = src.getContext("2d")!;
  sctx.drawImage(img, 0, 0);
  const bounds = detectAlphaBounds(sctx, src.width, src.height);

  // 2. Define recorte 3:4 em torno do conteúdo, com headroom no topo (cabeça)
  const padX = bounds.w * 0.18;
  const padTop = bounds.h * 0.12;
  const padBottom = bounds.h * 0.05;
  let cropX = bounds.x - padX;
  let cropY = bounds.y - padTop;
  let cropW = bounds.w + padX * 2;
  let cropH = bounds.h + padTop + padBottom;

  // Ajusta para proporção 3:4 (mais alto que largo)
  const targetRatio = TARGET_W / TARGET_H;
  const cropRatio = cropW / cropH;
  if (cropRatio > targetRatio) {
    // Largo demais → aumenta altura
    const newH = cropW / targetRatio;
    cropY -= (newH - cropH) / 2;
    cropH = newH;
  } else {
    // Alto demais → aumenta largura
    const newW = cropH * targetRatio;
    cropX -= (newW - cropW) / 2;
    cropW = newW;
  }

  // Clamp dentro do canvas original
  cropX = Math.max(0, cropX);
  cropY = Math.max(0, cropY);
  cropW = Math.min(src.width - cropX, cropW);
  cropH = Math.min(src.height - cropY, cropH);

  // 3. Desenha no canvas final com filtros de realce
  const out = document.createElement("canvas");
  out.width = TARGET_W;
  out.height = TARGET_H;
  const octx = out.getContext("2d")!;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";

  // Filtro CSS no canvas (suportado em browsers modernos)
  octx.filter =
    "contrast(1.1) saturate(1.18) brightness(1.06)";
  octx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, TARGET_W, TARGET_H);
  octx.filter = "none";

  // 4. Luz suave dourada vinda de cima (source-atop respeita transparência)
  octx.globalCompositeOperation = "source-atop";
  const grad = octx.createRadialGradient(
    TARGET_W * 0.5,
    TARGET_H * 0.15,
    20,
    TARGET_W * 0.5,
    TARGET_H * 0.4,
    TARGET_W * 0.9,
  );
  grad.addColorStop(0, "rgba(255, 247, 192, 0.22)");
  grad.addColorStop(0.5, "rgba(255, 247, 192, 0.06)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  octx.fillStyle = grad;
  octx.fillRect(0, 0, TARGET_W, TARGET_H);

  // Sombra inferior sutil para profundidade
  const shadow = octx.createLinearGradient(0, TARGET_H * 0.65, 0, TARGET_H);
  shadow.addColorStop(0, "rgba(0,0,0,0)");
  shadow.addColorStop(1, "rgba(0,0,0,0.28)");
  octx.fillStyle = shadow;
  octx.fillRect(0, 0, TARGET_W, TARGET_H);

  octx.globalCompositeOperation = "source-over";

  return new Promise<Blob>((resolve, reject) =>
    out.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png",
    ),
  );
}

/**
 * Leitura e gravação de imagens com o canvas do pacote `@napi-rs/canvas` (já é dependência
 * de desenvolvimento do gerador; entende PNG, JPEG e WebP).
 */
import { createRequire } from 'node:module';
import type { Mask } from './mascara';

interface Canvas2D {
  width: number;
  height: number;
  getContext(t: '2d'): {
    drawImage(img: unknown, x: number, y: number): void;
    getImageData(x: number, y: number, w: number, h: number): { data: Uint8ClampedArray };
    createImageData(w: number, h: number): { data: Uint8ClampedArray };
    putImageData(d: unknown, x: number, y: number): void;
    fillStyle: string;
    fillRect(x: number, y: number, w: number, h: number): void;
  };
  toBuffer(mime: 'image/png'): Buffer;
}
interface Lib {
  createCanvas(w: number, h: number): Canvas2D;
  loadImage(src: Buffer): Promise<{ width: number; height: number }>;
}

let lib: Lib | null = null;
function canvasLib(): Lib {
  if (!lib) {
    try {
      lib = createRequire(import.meta.url)('@napi-rs/canvas') as Lib;
    } catch {
      throw new Error('Falta o pacote @napi-rs/canvas (dependência de desenvolvimento). Rode npm install.');
    }
  }
  return lib;
}

export interface Pixels {
  w: number;
  h: number;
  /** RGBA, 4 bytes por pixel. */
  data: Uint8ClampedArray;
}

/** Decodifica PNG, JPEG ou WebP. */
export async function lerImagem(bytes: Buffer): Promise<Pixels> {
  const { createCanvas, loadImage } = canvasLib();
  const img = await loadImage(bytes);
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return { w: img.width, h: img.height, data: ctx.getImageData(0, 0, img.width, img.height).data };
}

/** PNG de uma máscara: equipamento em `cor`, fundo transparente, ou branco se `opaco`. */
export function mascaraParaPng(mask: Mask, cor: [number, number, number] = [0, 0, 0], opaco = false): Buffer {
  const { createCanvas } = canvasLib();
  const c = createCanvas(mask.w, mask.h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(mask.w, mask.h);
  for (let i = 0; i < mask.data.length; i++) {
    const o = i * 4;
    if (mask.data[i]) {
      img.data[o] = cor[0];
      img.data[o + 1] = cor[1];
      img.data[o + 2] = cor[2];
      img.data[o + 3] = 255;
    } else {
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = opaco ? 255 : 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toBuffer('image/png');
}

/** Sobreposição foto (azul) × modelo (laranja); onde coincidem fica escuro. Branco opaco no fundo. */
export function sobreposicaoPng(foto: Mask, modelo: Mask): Buffer {
  const { createCanvas } = canvasLib();
  const c = createCanvas(foto.w, foto.h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(foto.w, foto.h);
  for (let i = 0; i < foto.data.length; i++) {
    const o = i * 4;
    const f = foto.data[i];
    const m = modelo.data[i];
    const [r, g, b] = f && m ? [40, 40, 40] : f ? [60, 120, 220] : m ? [240, 150, 40] : [255, 255, 255];
    img.data[o] = r;
    img.data[o + 1] = g;
    img.data[o + 2] = b;
    img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toBuffer('image/png');
}

/** Lê um PNG de máscara gravado por `mascaraParaPng` (qualquer pixel opaco e não branco é 1). */
export async function lerMascaraPng(bytes: Buffer): Promise<Mask> {
  const px = await lerImagem(bytes);
  const data = new Uint8Array(px.w * px.h);
  for (let i = 0; i < data.length; i++) {
    const o = i * 4;
    data[i] = px.data[o + 3] >= 128 && !(px.data[o] > 240 && px.data[o + 1] > 240 && px.data[o + 2] > 240) ? 1 : 0;
  }
  return { w: px.w, h: px.h, data };
}

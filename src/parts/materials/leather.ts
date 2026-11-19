/**
 * Normal map de couro sintético (grão arredondado), gerado por código.
 *
 * É um padrão celular (Worley) tileável, calculado com uma semente fixa: duas
 * gerações dão exatamente os mesmos pixels, o que mantém estáveis os testes de
 * regressão visual. Precisa de canvas (o do navegador, ou o que
 * `installNodeShims()` instala no Node); sem canvas devolve `null` e o estofado
 * sai liso.
 */
import * as THREE from 'three';
import { TILE_M } from './uv';

/** Lado do ladrilho em metros: o UV métrico das caixas dá uma repetição por ladrilho. */
export const LEATHER_TILE_M = TILE_M;

const SIZE = 256;
/** Células por lado do ladrilho. 24 em 12 cm dão grão de uns 5 mm. */
const CELLS = 24;
/** Intensidade do relevo no mapa. Valores altos pesam no PNG e aparecem como ruído. */
const STRENGTH = 2.2;

/** PRNG pequeno e determinístico (mulberry32). */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Campo de altura 0..1: distância ao ponto de grão mais próximo, com laço nas bordas. */
export function leatherHeight(size = SIZE, cells = CELLS, seed = 7): Float32Array {
  const rand = prng(seed);
  const points: [number, number][] = [];
  for (let j = 0; j < cells; j++)
    for (let i = 0; i < cells; i++) points.push([(i + 0.15 + 0.7 * rand()) / cells, (j + 0.15 + 0.7 * rand()) / cells]);
  const h = new Float32Array(size * size);
  const cell = 1 / cells;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const ci = Math.floor(u * cells);
      const cj = Math.floor(v * cells);
      let best = Infinity;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const ni = (ci + di + cells) % cells;
          const nj = (cj + dj + cells) % cells;
          const p = points[nj * cells + ni];
          const px = p[0] + Math.floor((ci + di) / cells);
          const py = p[1] + Math.floor((cj + dj) / cells);
          const d = Math.hypot(u - px, v - py);
          if (d < best) best = d;
        }
      }
      h[y * size + x] = Math.max(0, 1 - best / (0.75 * cell * 1.4142));
    }
  }
  return h;
}

/** Converte um campo de altura em pixels RGBA de normal map (tangente, com laço nas bordas). */
export function heightToNormalPixels(h: Float32Array, size: number, strength = STRENGTH): Uint8ClampedArray {
  const out = new Uint8ClampedArray(size * size * 4);
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 0.5 * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 0.5 * strength;
      const len = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      out[o] = Math.round((-dx / len * 0.5 + 0.5) * 255);
      out[o + 1] = Math.round((-dy / len * 0.5 + 0.5) * 255);
      out[o + 2] = Math.round((1 / len * 0.5 + 0.5) * 255);
      out[o + 3] = 255;
    }
  }
  return out;
}

/** Textura de normal de couro, ou `null` se não houver canvas. */
export function leatherNormalMap(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas') as HTMLCanvasElement | undefined;
  if (!c || typeof c.getContext !== 'function') return null;
  c.width = SIZE;
  c.height = SIZE;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = c.getContext('2d');
  } catch {
    return null;
  }
  if (!ctx) return null;
  const pixels = heightToNormalPixels(leatherHeight(), SIZE);
  const image = ctx.createImageData(SIZE, SIZE);
  image.data.set(pixels);
  ctx.putImageData(image, 0, 0);
  const map = new THREE.CanvasTexture(c);
  // Normal map é dado, não cor: fica em espaço linear.
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;
  map.name = 'leather_normal';
  return map;
}

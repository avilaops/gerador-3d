/**
 * Adesivos da torre: placa com o nome do exercício e os pictogramas, etiqueta
 * do peso de incremento e a régua com a numeração da bateria.
 *
 * São texturas desenhadas num canvas: no navegador, o do `document`; no Node, o
 * que `installNodeShims()` instala. Sem canvas as funções devolvem `null` e o
 * modelo sai sem os adesivos.
 */
import * as THREE from 'three';
import type { PartKit } from './kit';

const FONT = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas') as HTMLCanvasElement | undefined;
  if (!c || typeof c.getContext !== 'function') return null;
  c.width = w;
  c.height = h;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = c.getContext('2d');
  } catch {
    // jsdom sem o pacote de canvas
  }
  return ctx ? [c, ctx] : null;
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Boneco sentado, de perfil, com o membro que trabalha em destaque. `fase` muda a pose (0 = início, 1 = fim). */
function pictogram(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tipo: 'musculo' | 'inicio' | 'fim') {
  ctx.save();
  rounded(ctx, x, y, w, h, 22);
  ctx.fillStyle = '#2a2a2c';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#f2f0ea';
  ctx.stroke();
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const corpo = '#d9d6cf';
  const destaque = tipo === 'fim' ? '#3d8fd6' : '#d83a34';
  const traco = (pts: [number, number][], cor: string, esp: number) => {
    ctx.strokeStyle = cor;
    ctx.lineWidth = esp;
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(cx + px, cy + py) : ctx.moveTo(cx + px, cy + py)));
    ctx.stroke();
  };
  if (tipo === 'musculo') {
    // Coxa e perna em destaque.
    traco([[-70, -40], [10, -20]], destaque, 46);
    traco([[10, -20], [40, 70]], corpo, 30);
    traco([[40, 70], [80, 78]], corpo, 22);
  } else {
    // Banco, tronco, cabeça e a perna na posição inicial ou final.
    traco([[-80, 40], [-10, 40]], '#6f6d68', 14);
    traco([[-80, 40], [-96, -70]], '#6f6d68', 14);
    traco([[-62, 22], [-74, -62]], corpo, 26);
    ctx.fillStyle = corpo;
    ctx.beginPath();
    ctx.arc(cx - 78, cy - 96, 20, 0, Math.PI * 2);
    ctx.fill();
    traco([[-60, 26], [16, 24]], corpo, 24);
    traco(tipo === 'inicio' ? [[16, 24], [22, 100]] : [[16, 24], [96, 30]], destaque, 20);
  }
  ctx.restore();
}

function finish(kit: PartKit, c: HTMLCanvasElement): THREE.MeshStandardMaterial {
  const map = new THREE.CanvasTexture(c);
  map.encoding = THREE.sRGBEncoding;
  map.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map, roughness: 0.55, metalness: 0.1 });
  m.name = 'decal';
  kit.track(map);
  kit.track(m);
  return m;
}

/** Placa da torre: nome do exercício em cima e três pictogramas. Proporção 2 : 5. */
export function placardDecal(kit: PartKit, title: string): THREE.MeshStandardMaterial | null {
  const made = canvas(512, 1280);
  if (!made) return null;
  const [c, ctx] = made;
  ctx.fillStyle = '#131314';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#f2f0ea';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = title.toUpperCase().split(/\s+/).reduce<string[]>((acc, w) => {
    const last = acc[acc.length - 1];
    if (last && (last + ' ' + w).length <= 11) acc[acc.length - 1] = last + ' ' + w;
    else acc.push(w);
    return acc;
  }, []);
  const size = lines.some((l) => l.length > 9) ? 74 : 88;
  ctx.font = `700 ${size}px ${FONT}`;
  lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, 256, 110 + i * (size + 8)));
  const top = 140 + lines.length * (size + 8);
  const h = Math.min(300, (1240 - top - 60) / 3);
  (['musculo', 'inicio', 'fim'] as const).forEach((tipo, i) => pictogram(ctx, 96, top + i * (h + 30), 320, h, tipo));
  return finish(kit, c);
}

/** Etiqueta do peso de incremento. Proporção 2 : 1. */
export function incrementDecal(kit: PartKit): THREE.MeshStandardMaterial | null {
  const made = canvas(384, 192);
  if (!made) return null;
  const [c, ctx] = made;
  ctx.fillStyle = '#131314';
  ctx.fillRect(0, 0, c.width, c.height);
  rounded(ctx, 8, 8, 368, 176, 16);
  ctx.strokeStyle = '#f2f0ea';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = '#f2f0ea';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 58px ${FONT}`;
  ctx.fillText('2.5 KG', 192, 54);
  ctx.font = `600 38px ${FONT}`;
  ctx.fillText('INCREMENT', 192, 106);
  ctx.fillText('WEIGHT', 192, 148);
  return finish(kit, c);
}

/** Régua com a carga acumulada placa a placa, de cima para baixo. */
export function scaleDecal(kit: PartKit, plates: number, totalKg: number): THREE.MeshStandardMaterial | null {
  const made = canvas(128, 1024);
  if (!made) return null;
  const [c, ctx] = made;
  ctx.fillStyle = '#131314';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#f2f0ea';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const step = c.height / plates;
  ctx.font = `600 ${Math.min(46, step * 0.8)}px ${FONT}`;
  for (let i = 0; i < plates; i++) {
    const kg = Math.round(((i + 1) * totalKg) / plates);
    ctx.fillText(String(kg), 88, (i + 0.5) * step);
    ctx.beginPath();
    ctx.arc(108, (i + 0.5) * step, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(kit, c);
}

/** Plano com um adesivo, de frente para +Z, centrado em `center`. */
export function decalPlane(
  kit: PartKit,
  material: THREE.Material,
  size: [number, number],
  center: [number, number, number],
  name: string
): THREE.Mesh {
  const m = new THREE.Mesh(kit.own(new THREE.PlaneGeometry(size[0], size[1])), material);
  m.position.set(...center);
  m.name = name;
  return m;
}

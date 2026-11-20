/**
 * Sombra de contato: escurecimento suave sob e em volta do que toca o piso.
 *
 * O mapa de sombra da luz principal dá a sombra projetada, mas não a oclusão junto ao
 * chão (sapatas, pés, base). Aqui ela é calculada uma vez, da projeção em planta do
 * equipamento, e vira uma textura de alfa aplicada num plano sob o modelo. Sem WebGL
 * e sem canvas: é só aritmética sobre os fechos convexos de `computeFootprint`.
 */
import * as THREE from 'three';
import type { Footprint, Point2 } from '../../footprint';

export interface ContactShadowData {
  size: number;
  /** RGBA, preto com alfa. Linha 0 = borda de maior z (frente, +Z). */
  data: Uint8Array<ArrayBuffer>;
  /** Retângulo coberto no piso, em metros. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

/** Distância de um ponto a um polígono convexo (0 dentro). */
export function distanceToConvex(poly: Point2[], x: number, z: number): number {
  if (poly.length === 0) return Infinity;
  if (poly.length === 1) return Math.hypot(x - poly[0][0], z - poly[0][1]);
  // Dentro: o ponto fica do mesmo lado de todas as arestas (qualquer sentido de giro).
  let pos = 0;
  let neg = 0;
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [ax, az] = poly[i];
    const [bx, bz] = poly[(i + 1) % poly.length];
    const ex = bx - ax;
    const ez = bz - az;
    const cross = ex * (z - az) - ez * (x - ax);
    if (cross > 0) pos++;
    else if (cross < 0) neg++;
    const len2 = ex * ex + ez * ez;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / len2)) : 0;
    best = Math.min(best, Math.hypot(x - (ax + t * ex), z - (az + t * ez)));
  }
  return poly.length >= 3 && (pos === 0 || neg === 0) ? 0 : best;
}

export interface ContactShadowOptions {
  size?: number;
  /** Escurecimento máximo, junto ao piso. */
  maxAlpha?: number;
  /** Alcance do contato, relativo à maior dimensão em planta. */
  contactRadius?: number;
}

/** Calcula a textura de sombra de contato de um equipamento. */
export function contactShadowData(fp: Footprint, opts: ContactShadowOptions = {}): ContactShadowData {
  const size = opts.size ?? 128;
  const maxAlpha = opts.maxAlpha ?? 0.55;
  const { minX, maxX, minZ, maxZ } = fp.bounds;
  const span = Math.max(maxX - minX, maxZ - minZ, 0.1);
  const pad = Math.max(0.1, 0.18 * span);
  const sigmaContact = Math.max(0.012, (opts.contactRadius ?? 0.035) * span);
  const sigmaAmbient = pad * 0.55;
  const bounds = { minX: minX - pad, maxX: maxX + pad, minZ: minZ - pad, maxZ: maxZ + pad };
  const w = bounds.maxX - bounds.minX;
  const d = bounds.maxZ - bounds.minZ;
  const data = new Uint8Array(new ArrayBuffer(size * size * 4));
  const parts = fp.parts.length ? fp.parts : [fp.outline];
  for (let j = 0; j < size; j++) {
    // Linha 0 é a borda de maior z, como o plano girado em -90° em X espera.
    const z = bounds.maxZ - ((j + 0.5) / size) * d;
    for (let i = 0; i < size; i++) {
      const x = bounds.minX + ((i + 0.5) / size) * w;
      let contact = 0;
      for (const part of parts) {
        const dist = distanceToConvex(part, x, z);
        if (dist < 4 * sigmaContact) contact = Math.max(contact, Math.exp(-((dist / sigmaContact) ** 2)));
      }
      const dOut = distanceToConvex(fp.outline, x, z);
      const ambient = 0.35 * Math.exp(-((dOut / sigmaAmbient) ** 2));
      const alpha = Math.min(1, Math.max(contact, ambient)) * maxAlpha;
      data[(j * size + i) * 4 + 3] = Math.round(alpha * 255);
    }
  }
  return { size, data, bounds };
}

/** Alfa (0 a 1) da textura no ponto (x, z) do piso. Serve a testes e a diagnóstico. */
export function contactShadowAlphaAt(s: ContactShadowData, x: number, z: number): number {
  const { minX, maxX, minZ, maxZ } = s.bounds;
  const i = Math.floor(((x - minX) / (maxX - minX)) * s.size);
  const j = Math.floor(((maxZ - z) / (maxZ - minZ)) * s.size);
  if (i < 0 || j < 0 || i >= s.size || j >= s.size) return 0;
  return s.data[(j * s.size + i) * 4 + 3] / 255;
}

export interface ContactShadow {
  mesh: THREE.Mesh;
  dispose(): void;
}

/** Plano com a sombra de contato, pronto para entrar na cena logo acima do piso. */
export function createContactShadow(fp: Footprint, opts?: ContactShadowOptions): ContactShadow {
  const s = contactShadowData(fp, opts);
  const texture = new THREE.DataTexture(s.data, s.size, s.size, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const w = s.bounds.maxX - s.bounds.minX;
  const d = s.bounds.maxZ - s.bounds.minZ;
  const geometry = new THREE.PlaneGeometry(w, d);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'contact_shadow';
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((s.bounds.minX + s.bounds.maxX) / 2, 0.002, (s.bounds.minZ + s.bounds.maxZ) / 2);
  mesh.renderOrder = 1;
  return {
    mesh,
    dispose() {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}

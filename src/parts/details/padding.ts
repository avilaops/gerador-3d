/**
 * Estofado com costura, pegadas e rolos.
 */
import * as THREE from 'three';
import type { PartKit } from '../kit';
import type { Vec3 } from '../../spec/schema';
import { capsule, chamferedCylinder, groupOf, lathe, meshOf, mm, shared } from './base';

/** Anéis de ranhura por pegada. Mais que isso pesa no modelo sem aparecer na foto. */
export const MAX_GRIP_RINGS = 8;

export interface StitchedPadOptions {
  /** Inclinação em X (rad), como em `upholstery`. */
  tiltX?: number;
  /** Cordão (vivo) em volta da face de cima. Padrão: sim. */
  piping?: boolean;
  /** Vincos transversais de costura, igualmente espaçados. Padrão: 0. */
  seams?: number;
  name?: string;
}

/**
 * Estofado [largura X, espessura Y, profundidade Z] com cordão em volta da face de cima e
 * vincos de costura. A espuma é a `upholstery` do gerador; o cordão e os vincos são cápsulas
 * escuras de 8 e 4 mm que compartilham geometria.
 */
export function stitchedPad(kit: PartKit, size: Vec3, center: Vec3, o: StitchedPadOptions = {}): THREE.Group {
  const [w, h, d] = size;
  const g = groupOf(o.name ?? 'stitched_pad');
  const radius = Math.min(0.035, 0.38 * Math.min(w, h, d));
  const foam = kit.roundedBox(w, h, d, radius);
  g.add(meshOf(kit, foam, 'upholstery', 'pad_foam'));

  const topY = h / 2 - 0.003;
  const inset = Math.max(0.012, radius * 0.55);
  if (o.piping ?? true) {
    const rodX = shared(kit, `pad:pipe:${mm(w - 2 * inset)}`, () => capsule(mm(w - 2 * inset), 0.004, 6));
    const rodZ = shared(kit, `pad:pipe:${mm(d - 2 * inset)}`, () => capsule(mm(d - 2 * inset), 0.004, 6));
    for (const s of [-1, 1] as const) {
      const a = meshOf(kit, rodX, 'rubber', 'pad_piping');
      a.rotation.z = Math.PI / 2;
      // Girada 90° em Z a cápsula vai de +X para -X: parte do lado direito.
      a.position.set(w / 2 - inset, topY, s * (d / 2 - inset));
      g.add(a);
      const b = meshOf(kit, rodZ, 'rubber', 'pad_piping');
      b.rotation.x = Math.PI / 2;
      b.position.set(s * (w / 2 - inset), topY, -(d / 2 - inset));
      g.add(b);
    }
  }
  const seams = Math.max(0, Math.floor(o.seams ?? 0));
  if (seams > 0) {
    const len = mm(w - 2 * inset);
    const seam = shared(kit, `pad:seam:${len}`, () => capsule(len, 0.002, 6));
    for (let i = 1; i <= seams; i++) {
      const m = meshOf(kit, seam, 'rubber', 'pad_seam');
      m.rotation.z = Math.PI / 2;
      m.position.set(len / 2, topY + 0.0005, -(d / 2 - inset) + (i * (d - 2 * inset)) / (seams + 1));
      g.add(m);
    }
  }
  g.position.set(...center);
  if (o.tiltX) g.rotation.x = o.tiltX;
  return g;
}

export interface KnurledGripOptions {
  /** Diâmetro da pegada (padrão 36 mm). */
  diameter?: number;
  /** Passo das ranhuras (padrão 14 mm). */
  pitch?: number;
  name?: string;
}

/** Pegada emborrachada com anéis de ranhura entre dois pontos e tampas nas pontas. */
export function knurledGrip(kit: PartKit, a: Vec3, b: Vec3, o: KnurledGripOptions = {}): THREE.Group {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const D = o.diameter ?? 0.036;
  const pitch = o.pitch ?? 0.014;
  const g = groupOf(o.name ?? 'knurled_grip');
  const body = shared(kit, `grip:body:${mm(len)}:${mm(D)}`, () => chamferedCylinder(D / 2, mm(len), 0.003, 16));
  g.add(meshOf(kit, body, 'rubber', 'grip_body'));
  // Anel em faixa (3 segmentos de perfil, chanfrado): 84 triângulos, contra 216 de um toro.
  const R = D / 2;
  const ring = shared(kit, `grip:ring:${mm(D)}`, () =>
    lathe([[R, 0], [R + 0.0012, 0.0012], [R + 0.0012, 0.0028], [R, 0.004]], 14)
  );
  const margin = 0.03;
  const avail = Math.max(0, len - 2 * margin);
  const n = Math.min(MAX_GRIP_RINGS, Math.floor(avail / pitch) + 1);
  // Os anéis se espalham por todo o comprimento útil, com o passo pedido como mínimo.
  const step = n > 1 ? avail / (n - 1) : 0;
  for (let i = 0; i < n; i++) {
    const m = meshOf(kit, ring, 'rubber', 'grip_ring');
    m.position.y = margin + i * step;
    g.add(m);
  }
  g.position.copy(A);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return g;
}

export interface FoamRollerOptions {
  /** Diâmetro do rolo (padrão 110 mm). */
  diameter?: number;
  name?: string;
}

/** Rolo de espuma (apoio de tornozelo ou coxa) com a tampa metálica de cada ponta. */
export function foamRoller(kit: PartKit, a: Vec3, b: Vec3, o: FoamRollerOptions = {}): THREE.Group {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const D = o.diameter ?? 0.11;
  const g = groupOf(o.name ?? 'foam_roller');
  const body = shared(kit, `roller:body:${mm(len)}:${mm(D)}`, () => chamferedCylinder(D / 2, mm(len), 0.008, 20));
  g.add(meshOf(kit, body, 'upholstery', 'roller_body'));
  const cap = shared(kit, `roller:cap:${mm(D)}`, () => chamferedCylinder(D * 0.4, 0.006, 0.0015, 14));
  for (const [y, nome] of [[-0.003, 'roller_cap_a'], [len - 0.003, 'roller_cap_b']] as const) {
    const m = meshOf(kit, cap, 'chrome', nome);
    m.position.y = y;
    g.add(m);
  }
  g.position.copy(A);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return g;
}

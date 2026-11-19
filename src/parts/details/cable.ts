/**
 * Ferragem de cabo: garfo de roldana, argola em D (manilha) e mosquetão.
 */
import * as THREE from 'three';
import type { PartKit } from '../kit';
import type { Vec3 } from '../../spec/schema';
import { capsule, chamferBox, chamferedCylinder, groupOf, meshOf, mm, shared } from './base';
import { bolt } from './fasteners';

export interface PulleyForkOptions {
  /** Diâmetro da roldana que o garfo abraça (padrão 90 mm). */
  diameter?: number;
  /** Eixo da roldana: 'x' (padrão) ou 'z'. */
  axis?: 'x' | 'z';
  name?: string;
}

/**
 * Garfo de roldana: duas chapas laterais, eixo cromado e uma cabeça de parafuso em cada lado.
 * Vai em volta da `pulley` do gerador (mesmo centro e mesmo eixo). Sem a roldana, é só o suporte.
 */
export function pulleyFork(kit: PartKit, center: Vec3, o: PulleyForkOptions = {}): THREE.Group {
  const D = o.diameter ?? 0.09;
  const axis = o.axis ?? 'x';
  const g = groupOf(o.name ?? 'pulley_fork');
  const gap = 0.028;
  const plateT = 0.006;
  const plateGeo = shared(kit, `fork:plate:${mm(D)}`, () => chamferBox(plateT, D * 1.35, D * 0.7, 0.003));
  for (const s of [-1, 1] as const) {
    const p = meshOf(kit, plateGeo, 'frame', 'fork_plate');
    p.position.set(s * (gap / 2 + plateT / 2), -D * 0.1, 0);
    g.add(p);
    g.add(bolt(kit, { at: [s * (gap / 2 + plateT), 0, 0], dir: [s, 0, 0], kind: 'button', diameter: 0.008, washer: false, name: 'fork_bolt' }));
  }
  const axle = shared(kit, 'fork:axle', () => chamferedCylinder(0.005, gap + 2 * plateT, 0.0008, 10));
  const a = meshOf(kit, axle, 'chrome', 'fork_axle');
  a.rotation.z = Math.PI / 2;
  a.position.x = -(gap + 2 * plateT) / 2;
  g.add(a);
  g.position.set(...center);
  if (axis === 'z') g.rotation.y = Math.PI / 2;
  return g;
}

export interface ShackleOptions {
  /** Abertura interna do D (padrão 30 mm). */
  size?: number;
  name?: string;
}

/** Argola em D (manilha): arco de aço com o pino roscado na boca. */
export function shackle(kit: PartKit, center: Vec3, o: ShackleOptions = {}): THREE.Group {
  const S = o.size ?? 0.03;
  const g = groupOf(o.name ?? 'shackle');
  const tube = 0.005;
  const arc = shared(kit, `shackle:arc:${mm(S)}`, () => new THREE.TorusGeometry(S / 2, tube, 6, 20, Math.PI));
  g.add(meshOf(kit, arc, 'chrome', 'shackle_arc'));
  const leg = shared(kit, `shackle:leg:${mm(S)}`, () => capsule(mm(S * 0.7), tube, 8));
  for (const s of [-1, 1] as const) {
    const l = meshOf(kit, leg, 'chrome', 'shackle_leg');
    l.rotation.z = Math.PI;
    l.position.set(s * (S / 2), 0, 0);
    g.add(l);
  }
  const pin = shared(kit, `shackle:pin:${mm(S)}`, () => capsule(mm(S + 4 * tube), tube * 0.8, 8));
  const p = meshOf(kit, pin, 'chrome', 'shackle_pin');
  p.rotation.z = Math.PI / 2;
  p.position.set(-(S / 2 + 2 * tube), -S * 0.7, 0);
  g.add(p);
  g.position.set(...center);
  return g;
}

export interface CarabinerOptions {
  /** Comprimento total do mosquetão (padrão 80 mm). */
  size?: number;
  name?: string;
}

/** Mosquetão: argola ovalada de aço com o gatilho fechando a boca. */
export function carabiner(kit: PartKit, center: Vec3, o: CarabinerOptions = {}): THREE.Group {
  const L = o.size ?? 0.08;
  const g = groupOf(o.name ?? 'carabiner');
  const r = L * 0.22;
  const tube = 0.0035;
  const body = shared(kit, `carabiner:body:${mm(L)}`, () => new THREE.TorusGeometry(r, tube, 6, 22, Math.PI * 2 * 0.93));
  const b = meshOf(kit, body, 'chrome', 'carabiner_body');
  b.scale.y = (L / 2) / r;
  g.add(b);
  const gate = shared(kit, `carabiner:gate:${mm(L)}`, () => capsule(mm(L * 0.34), tube * 0.8, 6));
  const gt = meshOf(kit, gate, 'chrome', 'carabiner_gate');
  gt.position.set(r, -L * 0.17, 0);
  g.add(gt);
  g.position.set(...center);
  return g;
}

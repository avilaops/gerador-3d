/**
 * Fixação e acabamento de ponta: parafuso, porca, tampa de tubo, ponteira e sapata niveladora.
 *
 * Medidas em metros. Todas as geometrias são de revolução com chanfro (ou caixa arredondada do
 * kit): nenhuma aresta viva de 90°. Eixo Y local = direção "para fora" da peça; `at` é o ponto
 * de apoio na superfície.
 */
import * as THREE from 'three';
import type { PartKit } from '../kit';
import type { Vec3 } from '../../spec/schema';
import { chamferBox, chamferedCylinder, groupOf, lathe, meshOf, mm, shared } from './base';

/** Posição `at` e eixo Y local = `dir`; o eixo Z local fica o mais perto possível de `up`. */
function place(obj: THREE.Object3D, at: Vec3, dir: Vec3, up: Vec3 = [0, 1, 0]): void {
  const y = new THREE.Vector3(...dir).normalize();
  let ref = new THREE.Vector3(...up);
  if (Math.abs(ref.dot(y)) > 0.999) ref = new THREE.Vector3(0, 0, 1);
  const z = ref.addScaledVector(y, -ref.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  obj.position.set(...at);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

export type BoltKind = 'hex' | 'allen' | 'button';

export interface BoltOptions {
  at: Vec3;
  /** Para onde a cabeça aponta (normal da superfície). */
  dir: Vec3;
  kind?: BoltKind;
  /** Diâmetro nominal da rosca (padrão 10 mm). */
  diameter?: number;
  /** Arruela sob a cabeça (padrão: sim). */
  washer?: boolean;
  name?: string;
}

/** Parafuso: cabeça (sextavada, allen ou abaulada) sobre arruela. Em cromado, como zincado. */
export function bolt(kit: PartKit, o: BoltOptions): THREE.Group {
  const kind = o.kind ?? 'hex';
  const d = o.diameter ?? 0.01;
  const withWasher = o.washer ?? true;
  const washerH = withWasher ? 0.18 * d : 0;
  const g = groupOf(o.name ?? 'bolt');
  if (withWasher) {
    const w = shared(kit, `bolt:washer:${mm(d)}`, () => chamferedCylinder(d, washerH, 0.04 * d, 12));
    g.add(meshOf(kit, w, 'chrome', 'bolt_washer'));
  }
  let head: THREE.BufferGeometry;
  let headH: number;
  if (kind === 'hex') {
    headH = 0.65 * d;
    head = shared(kit, `bolt:hex:${mm(d)}`, () => chamferedCylinder(0.92 * d, headH, 0.14 * headH, 6));
  } else if (kind === 'allen') {
    headH = 1.0 * d;
    head = shared(kit, `bolt:allen:${mm(d)}`, () => chamferedCylinder(0.75 * d, headH, 0.12 * headH, 12));
  } else {
    const R = d;
    headH = 0.55 * d;
    const H = headH;
    const c = 0.1 * H;
    head = shared(kit, `bolt:button:${mm(d)}`, () =>
      lathe(
        [
          [0, H],
          [0.3 * R, 0.97 * H],
          [0.6 * R, 0.88 * H],
          [0.85 * R, 0.68 * H],
          [R, 0.38 * H],
          [R, c],
          [R - c, 0],
          [0, 0],
        ],
        12
      )
    );
  }
  const h = meshOf(kit, head, 'chrome', 'bolt_head');
  h.position.y = washerH;
  g.add(h);
  if (kind === 'allen') {
    // Sextavado interno: disco escuro rente ao topo da cabeça.
    const rs = 0.4 * d;
    const socket = shared(kit, `bolt:socket:${mm(d)}`, () =>
      lathe([[0, 0], [rs, 0], [rs, 0.0008], [0, 0.0008]], 6)
    );
    const s = meshOf(kit, socket, 'rubber', 'bolt_socket');
    s.position.y = washerH + headH + 0.0002;
    g.add(s);
  }
  place(g, o.at, o.dir);
  return g;
}

export interface NutOptions {
  at: Vec3;
  dir: Vec3;
  diameter?: number;
  name?: string;
}

/** Porca sextavada com chanfro. */
export function nut(kit: PartKit, o: NutOptions): THREE.Mesh {
  const d = o.diameter ?? 0.01;
  const H = 0.8 * d;
  const geo = shared(kit, `nut:${mm(d)}`, () => chamferedCylinder(0.92 * d, H, 0.12 * H, 6));
  const m = meshOf(kit, geo, 'chrome', o.name ?? 'nut');
  place(m, o.at, o.dir);
  return m;
}

export interface TubeCapOptions {
  at: Vec3;
  /** Normal para fora da ponta do tubo. */
  dir: Vec3;
  /** Direção do segundo eixo da seção retangular (a profundidade); padrão: para cima. */
  up?: Vec3;
  /** Lado do tubo quadrado, [largura, profundidade] do retangular, ou diâmetro do redondo. */
  size: number | [number, number];
  round?: boolean;
  name?: string;
}

/** Espessura da tampa que fica para fora da ponta do tubo. */
const CAP_THICKNESS = 0.014;

/** Tampa plástica de ponta de tubo, preta. Fica por fora da seção (margem de 3 mm por lado). */
export function tubeCap(kit: PartKit, o: TubeCapOptions): THREE.Mesh {
  const [w, dp] = typeof o.size === 'number' ? [o.size, o.size] : o.size;
  const margin = 0.003;
  let geo: THREE.BufferGeometry;
  if (o.round) {
    geo = shared(kit, `cap:round:${mm(w)}`, () => chamferedCylinder(w / 2 + margin, CAP_THICKNESS, 0.004, 16));
  } else {
    // Caixa chanfrada (45°, um segmento por quina); a espessura vai no eixo Y.
    geo = shared(kit, `cap:rect:${mm(w)}:${mm(dp)}`, () => chamferBox(w + 2 * margin, CAP_THICKNESS, dp + 2 * margin, 0.004));
  }
  const m = meshOf(kit, geo, 'rubber', o.name ?? 'tube_cap');
  place(m, o.at, o.dir, o.up);
  // O cilindro nasce em y de 0 a h; a caixa, centrada. Ambos ficam apoiados na ponta do tubo.
  if (!o.round) m.translateY(CAP_THICKNESS / 2);
  return m;
}

export interface FerruleOptions {
  at: Vec3;
  dir: Vec3;
  /** Diâmetro externo do tubo redondo. */
  diameter: number;
  name?: string;
}

/** Ponteira plástica de tubo redondo: aba que encosta na ponta e plugue com chanfro. */
export function ferrule(kit: PartKit, o: FerruleOptions): THREE.Mesh {
  const R = o.diameter / 2;
  const geo = shared(kit, `ferrule:${mm(o.diameter)}`, () =>
    lathe(
      [
        [0, 0],
        [R + 0.0025, 0],
        [R + 0.004, 0.0015],
        [R + 0.004, 0.003],
        [R + 0.001, 0.006],
        [R + 0.001, 0.015],
        [R - 0.003, 0.018],
        [0, 0.018],
      ],
      14
    )
  );
  const m = meshOf(kit, geo, 'rubber', o.name ?? 'ferrule');
  place(m, o.at, o.dir);
  return m;
}

export interface LevelerFootOptions {
  x: number;
  z: number;
  /** Diâmetro da base de borracha (padrão 60 mm). */
  diameter?: number;
  /** Comprimento da haste roscada visível (padrão 25 mm). */
  stem?: number;
  name?: string;
}

/** Sapata niveladora: base de borracha apoiada no piso, haste roscada e contraporca. */
export function levelerFoot(kit: PartKit, o: LevelerFootOptions): THREE.Group {
  const D = o.diameter ?? 0.06;
  const stem = o.stem ?? 0.025;
  const baseH = 0.022;
  const R = D / 2;
  const g = groupOf(o.name ?? 'leveler_foot');
  const base = shared(kit, `leveler:base:${mm(D)}`, () =>
    lathe(
      [
        [0, 0],
        [R - 0.004, 0],
        [R, 0.004],
        [R, 0.016],
        [R - 0.01, baseH],
        [0, baseH],
      ],
      16
    )
  );
  g.add(meshOf(kit, base, 'rubber', 'leveler_base'));
  const rod = shared(kit, `leveler:stem:${mm(stem)}`, () => chamferedCylinder(0.006, stem, 0.001, 10));
  const r = meshOf(kit, rod, 'chrome', 'leveler_stem');
  r.position.y = baseH;
  g.add(r);
  const n = nut(kit, { at: [0, baseH + stem * 0.45, 0], dir: [0, 1, 0], diameter: 0.012, name: 'leveler_nut' });
  g.add(n);
  g.position.set(o.x, 0, o.z);
  return g;
}

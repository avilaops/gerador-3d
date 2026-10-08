/**
 * Peças básicas. Funções puras: recebem o kit e medidas, devolvem Object3D.
 * Nenhuma peça se adiciona a um pai: quem monta decide a hierarquia.
 */
import * as THREE from 'three';
import type { PartKit, MaterialRole } from './kit';
import type { Vec3 } from '../spec/schema';

const UP = new THREE.Vector3(0, 1, 0);

export interface MeshOptions {
  material?: MaterialRole;
  name?: string;
}

export function mesh(
  kit: PartKit,
  geometry: THREE.BufferGeometry,
  material: MaterialRole,
  name?: string
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, kit.materials[material]);
  m.castShadow = true;
  m.receiveShadow = true;
  if (name) m.name = name;
  return m;
}

/** Caixa w×h×d centrada em `center`. */
export function box(kit: PartKit, size: Vec3, center: Vec3, opts: MeshOptions = {}): THREE.Mesh {
  const m = mesh(kit, kit.unitBox, opts.material ?? 'frame', opts.name);
  m.scale.set(...size);
  m.position.set(...center);
  return m;
}

export interface BeamOptions extends MeshOptions {
  /** Tubo redondo (cilindro) em vez de quadrado. */
  round?: boolean;
}

/**
 * Tubo entre dois pontos. `size` é o lado do tubo quadrado (ou [largura, altura]
 * para retangular) ou o diâmetro do redondo.
 */
export function beam(
  kit: PartKit,
  a: Vec3,
  b: Vec3,
  size: number | [number, number],
  opts: BeamOptions = {}
): THREE.Mesh {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const [sx, sz] = typeof size === 'number' ? [size, size] : size;
  const m = mesh(
    kit,
    opts.round ? kit.unitCylinder : kit.tube(sx, sz),
    opts.material ?? 'frame',
    opts.name
  );
  if (opts.round) m.scale.set(sx, Math.max(len, 1e-4), sz);
  else m.scale.set(1, Math.max(len, 1e-4), 1);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  if (len > 1e-6) m.quaternion.copy(beamOrientation(B.clone().sub(A).normalize()));
  return m;
}

/**
 * Orientação de um tubo: Y local ao longo do tubo e Z local o mais próximo
 * possível do "para cima" do mundo. Assim, num tubo retangular [largura, altura],
 * a altura fica sempre na vertical (ou, num tubo vertical, voltada para +Z),
 * qualquer que seja a direção do trecho.
 */
function beamOrientation(dir: THREE.Vector3): THREE.Quaternion {
  const y = dir;
  const ref = Math.abs(y.dot(UP)) > 0.999 ? new THREE.Vector3(0, 0, 1) : UP;
  const z = ref.clone().addScaledVector(y, -ref.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

export interface BentTubeOptions extends BeamOptions {
  /** Raio da dobra, medido no eixo do tubo. Padrão: 1,8 × o lado. */
  radius?: number;
}

/** Pontos da seção no plano (x, z) do tubo, com a normal de cada um. */
function sectionProfile(size: number | [number, number], round: boolean): [number, number, number, number][] {
  const [sx, sz] = typeof size === 'number' ? [size, size] : size;
  const out: [number, number, number, number][] = [];
  if (round) {
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * Math.PI;
      out.push([(sx / 2) * Math.cos(a), (sz / 2) * Math.sin(a), Math.cos(a), Math.sin(a)]);
    }
    return out;
  }
  const r = Math.min(0.012, 0.24 * Math.min(sx, sz));
  const corners: [number, number, number][] = [
    [sx / 2 - r, sz / 2 - r, 0],
    [-(sx / 2 - r), sz / 2 - r, Math.PI / 2],
    [-(sx / 2 - r), -(sz / 2 - r), Math.PI],
    [sx / 2 - r, -(sz / 2 - r), 1.5 * Math.PI],
  ];
  for (const [cx, cz, a0] of corners) {
    for (let k = 0; k <= 3; k++) {
      const a = a0 + (k / 3) * (Math.PI / 2);
      out.push([cx + r * Math.cos(a), cz + r * Math.sin(a), Math.cos(a), Math.sin(a)]);
    }
  }
  return out;
}

/** Eixo do tubo: a polilinha com cada canto trocado por um arco de raio `radius`. */
function filletPath(points: Vec3[], radius: number): THREE.Vector3[] {
  const P = points.map((p) => new THREE.Vector3(...p));
  const out: THREE.Vector3[] = [P[0].clone()];
  for (let i = 1; i < P.length - 1; i++) {
    const u = P[i - 1].clone().sub(P[i]);
    const v = P[i + 1].clone().sub(P[i]);
    const lu = u.length();
    const lv = v.length();
    u.normalize();
    v.normalize();
    const phi = Math.acos(THREE.MathUtils.clamp(u.dot(v), -1, 1));
    if (phi > Math.PI - 0.03 || phi < 0.05 || lu < 1e-4 || lv < 1e-4) {
      out.push(P[i].clone());
      continue;
    }
    const tl = Math.min(radius / Math.tan(phi / 2), 0.45 * lu, 0.45 * lv);
    const r = tl * Math.tan(phi / 2);
    const center = P[i].clone().addScaledVector(u.clone().add(v).normalize(), r / Math.sin(phi / 2));
    const a = P[i].clone().addScaledVector(u, tl).sub(center);
    const b = P[i].clone().addScaledVector(v, tl).sub(center);
    const axis = new THREE.Vector3().crossVectors(a, b).normalize();
    const sweepAngle = Math.PI - phi;
    const steps = Math.max(3, Math.ceil(sweepAngle / 0.28));
    for (let k = 0; k <= steps; k++) {
      out.push(center.clone().add(a.clone().applyAxisAngle(axis, (sweepAngle * k) / steps)));
    }
  }
  out.push(P[P.length - 1].clone());
  return out;
}

/**
 * Tubo dobrado: uma única malha que segue a polilinha, com as dobras em arco
 * (como tubo curvado em máquina, e não soldado em quina). A seção acompanha o
 * eixo sem torcer.
 */
export function bentTube(
  kit: PartKit,
  points: Vec3[],
  size: number | [number, number],
  opts: BentTubeOptions = {}
): THREE.Group {
  const g = new THREE.Group();
  if (opts.name) g.name = opts.name;
  const side = typeof size === 'number' ? size : Math.max(...size);
  const axis = filletPath(points, opts.radius ?? 1.8 * side);
  const profile = sectionProfile(size, !!opts.round);
  const n = profile.length;

  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const T = new THREE.Vector3();
  const X = new THREE.Vector3();
  const Z = new THREE.Vector3();
  const frames: { p: THREE.Vector3; t: THREE.Vector3; x: THREE.Vector3; z: THREE.Vector3 }[] = [];
  for (let i = 0; i < axis.length; i++) {
    T.copy(axis[Math.min(i + 1, axis.length - 1)]).sub(axis[Math.max(i - 1, 0)]).normalize();
    if (i === 0) {
      const ref = Math.abs(T.dot(UP)) > 0.999 ? new THREE.Vector3(0, 0, 1) : UP;
      Z.copy(ref).addScaledVector(T, -ref.dot(T)).normalize();
    } else {
      // Transporte paralelo: mantém a seção alinhada de um anel para o outro.
      Z.addScaledVector(T, -Z.dot(T)).normalize();
    }
    X.crossVectors(T, Z).normalize();
    frames.push({ p: axis[i], t: T.clone(), x: X.clone(), z: Z.clone() });
    for (const [px, pz, nx, nz] of profile) {
      pos.push(
        axis[i].x + px * X.x + pz * Z.x,
        axis[i].y + px * X.y + pz * Z.y,
        axis[i].z + px * X.z + pz * Z.z
      );
      nor.push(nx * X.x + nz * Z.x, nx * X.y + nz * Z.y, nx * X.z + nz * Z.z);
    }
  }
  for (let i = 0; i < axis.length - 1; i++) {
    for (let k = 0; k < n; k++) {
      const a = i * n + k;
      const b = i * n + ((k + 1) % n);
      idx.push(a, a + n, b, b, a + n, b + n);
    }
  }
  // Tampas.
  for (const [f, sign] of [
    [frames[0], -1],
    [frames[frames.length - 1], 1],
  ] as const) {
    const start = pos.length / 3;
    for (const [px, pz] of profile) {
      pos.push(f.p.x + px * f.x.x + pz * f.z.x, f.p.y + px * f.x.y + pz * f.z.y, f.p.z + px * f.x.z + pz * f.z.z);
      nor.push(sign * f.t.x, sign * f.t.y, sign * f.t.z);
    }
    for (let k = 1; k < n - 1; k++) {
      if (sign > 0) idx.push(start, start + k + 1, start + k);
      else idx.push(start, start + k, start + k + 1);
    }
  }

  const geometry = kit.own(new THREE.BufferGeometry());
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  geometry.setIndex(idx);
  g.add(mesh(kit, geometry, opts.material ?? 'frame', opts.name ? `${opts.name}_tube` : undefined));
  return g;
}

export interface UpholsteryOptions extends MeshOptions {
  /** Raio dos cantos. Padrão: 30% da menor medida, limitado a 3 cm. */
  radius?: number;
  /** Rotação em X (inclinação de encosto), radianos. */
  tiltX?: number;
}

/** Estofado: caixa de cantos arredondados centrada em `center`. */
export function upholstery(
  kit: PartKit,
  size: Vec3,
  center: Vec3,
  opts: UpholsteryOptions = {}
): THREE.Mesh {
  const [w, h, d] = size;
  const r = opts.radius ?? Math.min(0.035, 0.38 * Math.min(w, h, d));
  const m = mesh(kit, kit.roundedBox(w, h, d, r), opts.material ?? 'upholstery', opts.name);
  m.position.set(...center);
  if (opts.tiltX) m.rotation.x = opts.tiltX;
  return m;
}

/** Pé de borracha (sapata) apoiado no piso. */
export function rubberFoot(
  kit: PartKit,
  x: number,
  z: number,
  size: [number, number] = [0.1, 0.1],
  height = 0.012
): THREE.Mesh {
  return box(kit, [size[0], height, size[1]], [x, height / 2, z], { material: 'rubber' });
}

/** Polia: aro (toro) com eixo ao longo de `axis` ('x' ou 'z'). */
export function pulley(
  kit: PartKit,
  center: Vec3,
  diameter = 0.09,
  axis: 'x' | 'z' = 'x'
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'pulley';
  const rim = mesh(kit, kit.torus(diameter / 2 - 0.008, 0.008), 'chrome');
  const hub = mesh(kit, kit.unitCylinder, 'frame');
  hub.scale.set(0.03, 0.03, 0.03);
  if (axis === 'x') {
    rim.rotation.y = Math.PI / 2;
    hub.rotation.z = Math.PI / 2;
  } else {
    hub.rotation.x = Math.PI / 2;
  }
  g.add(rim, hub);
  g.position.set(...center);
  return g;
}

/** Cabo de aço entre dois pontos. */
export function cable(kit: PartKit, a: Vec3, b: Vec3, name = 'cable'): THREE.Mesh {
  return beam(kit, a, b, 0.008, { round: true, material: 'cable', name });
}

/**
 * Pino de anilhas (suporte cromado com batente). Nasce em `base` e cresce
 * `length` metros na direção `dir`. O batente fica na base.
 */
export function plateHorn(
  kit: PartKit,
  base: Vec3,
  dir: Vec3,
  length = 0.2,
  diameter = 0.05,
  name?: string
): THREE.Group {
  const g = new THREE.Group();
  if (name) g.name = name;
  const d = new THREE.Vector3(...dir).normalize();
  const B = new THREE.Vector3(...base);
  const collarT = 0.015;
  const collarStart = B.clone();
  const collarEnd = B.clone().addScaledVector(d, collarT);
  const tip = B.clone().addScaledVector(d, length);
  g.add(
    beam(kit, toVec3(collarStart), toVec3(collarEnd), diameter * 2.2, {
      round: true,
      material: 'chrome',
    })
  );
  g.add(beam(kit, toVec3(collarEnd), toVec3(tip), diameter, { round: true, material: 'chrome' }));
  return g;
}

export function toVec3(v: THREE.Vector3): Vec3 {
  return [v.x, v.y, v.z];
}

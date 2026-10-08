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
  const geometry = opts.round ? kit.unitCylinder : kit.unitBox;
  const m = mesh(kit, geometry, opts.material ?? 'frame', opts.name);
  m.scale.set(sx, Math.max(len, 1e-4), sz);
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

/**
 * Polilinha de tubos (quadro dobrado). Cada trecho é um `beam`; nos cantos
 * entra um cubo do mesmo lado para fechar a junta.
 */
export function bentTube(
  kit: PartKit,
  points: Vec3[],
  size: number,
  opts: BeamOptions = {}
): THREE.Group {
  const g = new THREE.Group();
  if (opts.name) g.name = opts.name;
  for (let i = 0; i < points.length - 1; i++) {
    g.add(beam(kit, points[i], points[i + 1], size, { ...opts, name: undefined }));
  }
  for (let i = 1; i < points.length - 1; i++) {
    const joint = opts.round
      ? mesh(kit, kit.unitCylinder, opts.material ?? 'frame')
      : mesh(kit, kit.unitBox, opts.material ?? 'frame');
    joint.scale.setScalar(size);
    joint.position.set(...points[i]);
    g.add(joint);
  }
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
  const r = opts.radius ?? Math.min(0.03, 0.3 * Math.min(w, h, d));
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

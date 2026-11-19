/**
 * Base da biblioteca de detalhes: geometria compartilhada por kit, orientação de peças e
 * geometrias de revolução com chanfro.
 *
 * "Instanciar" aqui é **compartilhar a mesma `BufferGeometry` e o mesmo material** entre várias
 * `Mesh`, como o resto do gerador faz. O GLTFExporter r149 não exporta `InstancedMesh`.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { MaterialRole, PartKit } from '../kit';
import type { Vec3 } from '../../spec/schema';

const caches = new WeakMap<PartKit, Map<string, THREE.BufferGeometry>>();

/** Geometria cacheada por (kit, chave). Entra na lista de descarte do kit. */
export function shared(kit: PartKit, key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let map = caches.get(kit);
  if (!map) {
    map = new Map();
    caches.set(kit, map);
  }
  let g = map.get(key);
  if (!g) {
    g = kit.own(make());
    g.name = key;
    map.set(key, g);
  }
  return g;
}

/** Arredonda uma medida em metros ao milímetro, para a chave de cache não variar por ruído de ponto flutuante. */
export const mm = (v: number): number => Math.round(v * 1000) / 1000;

export function meshOf(kit: PartKit, geometry: THREE.BufferGeometry, role: MaterialRole, name: string): THREE.Mesh {
  const m = new THREE.Mesh(geometry, kit.materials[role]);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const UP = new THREE.Vector3(0, 1, 0);

/** Alinha o eixo Y local do objeto com `dir` e o posiciona em `at`. */
export function placeAlong(obj: THREE.Object3D, at: Vec3, dir: Vec3): void {
  obj.position.set(...at);
  const d = new THREE.Vector3(...dir);
  if (d.lengthSq() < 1e-12) return;
  obj.quaternion.setFromUnitVectors(UP, d.normalize());
}

/**
 * Sólido de revolução em torno de Y a partir de um perfil [raio, altura] que começa no eixo.
 * Com `segments` pequeno vira prisma (6 = sextavado).
 */
export function lathe(profile: [number, number][], segments: number): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    segments
  );
  normalizeNormals(g);
  return g;
}

/**
 * O `LatheGeometry` do Three r149 deixa a normal do **último** ponto do perfil sem normalizar
 * (reaproveita um vetor antes do `normalize`). O validador de glTF recusa normais não unitárias
 * (`ACCESSOR_NON_UNIT`), então todo sólido de revolução passa por aqui.
 */
export function normalizeNormals(g: THREE.BufferGeometry): void {
  const n = g.getAttribute('normal') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < n.count; i++) {
    v.fromBufferAttribute(n, i);
    if (v.lengthSq() > 0) n.setXYZ(i, ...v.normalize().toArray());
  }
  n.needsUpdate = true;
}

/**
 * Caixa com as arestas chanfradas (um segmento por quina, 45°). Bem mais barata que a caixa
 * arredondada do kit, que usa 3 segmentos por quina e passa de 500 triângulos numa peça pequena.
 */
export function chamferBox(w: number, h: number, d: number, c: number): THREE.BufferGeometry {
  return new RoundedBoxGeometry(w, h, d, 1, Math.min(c, w / 2 - 1e-5, h / 2 - 1e-5, d / 2 - 1e-5));
}

/** Cilindro de altura `h` e raio `r`, com chanfro `c` nas duas bordas: nenhuma aresta de 90°. */
export function chamferedCylinder(r: number, h: number, c: number, segments: number): THREE.BufferGeometry {
  const k = Math.min(c, h / 2 - 1e-6, r - 1e-6);
  return lathe(
    [
      [0, 0],
      [r - k, 0],
      [r, k],
      [r, h - k],
      [r - k, h],
      [0, h],
    ],
    segments
  );
}

/** Cápsula (cilindro de pontas arredondadas) de comprimento `len` ao longo de Y, de y = 0 a y = len. */
export function capsule(len: number, r: number, segments: number): THREE.BufferGeometry {
  const e = Math.min(r * 0.45, len / 2 - 1e-6);
  return lathe(
    [
      [0, 0],
      [r * 0.6, 0],
      [r, e],
      [r, len - e],
      [r * 0.6, len],
      [0, len],
    ],
    segments
  );
}

/** Empilha por material: devolve um grupo nomeado. */
export function groupOf(name: string, ...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.add(...children);
  return g;
}

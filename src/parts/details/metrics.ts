/**
 * Medidas sobre malhas, para os testes e para quem integra a biblioteca.
 */
import * as THREE from 'three';

export function triangleCount(object: THREE.Object3D): number {
  let n = 0;
  object.traverse((o) => {
    const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (g) n += (g.index?.count ?? g.getAttribute('position').count) / 3;
  });
  return n;
}

/**
 * Maior ângulo diedro, em graus, entre faces vizinhas de uma malha (0 = liso, 90 = quina viva).
 * Vértices são soldados por posição (com 0,01 mm de tolerância), então emendas de revolução e de
 * UV não contam como quina. Faces de área zero (polos) são ignoradas.
 */
export function maxDihedralDeg(geometry: THREE.BufferGeometry): number {
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
  const index = geometry.index;
  const count = index ? index.count : pos.count;
  const key = (i: number) => `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
  const edges = new Map<string, THREE.Vector3[]>();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let t = 0; t < count; t += 3) {
    const i0 = index ? index.getX(t) : t;
    const i1 = index ? index.getX(t + 1) : t + 1;
    const i2 = index ? index.getX(t + 2) : t + 2;
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    const n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
    if (n.lengthSq() < 1e-16) continue;
    n.normalize();
    const ks = [key(i0), key(i1), key(i2)];
    for (let e = 0; e < 3; e++) {
      const k1 = ks[e];
      const k2 = ks[(e + 1) % 3];
      if (k1 === k2) continue;
      const ek = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
      const list = edges.get(ek);
      if (list) list.push(n);
      else edges.set(ek, [n]);
    }
  }
  let max = 0;
  for (const normals of edges.values()) {
    for (let i = 0; i < normals.length; i++)
      for (let j = i + 1; j < normals.length; j++) {
        const d = THREE.MathUtils.clamp(normals[i].dot(normals[j]), -1, 1);
        max = Math.max(max, THREE.MathUtils.radToDeg(Math.acos(d)));
      }
  }
  return max;
}

/** Todas as geometrias distintas de um objeto. */
export function geometriesOf(object: THREE.Object3D): Set<THREE.BufferGeometry> {
  const out = new Set<THREE.BufferGeometry>();
  object.traverse((o) => {
    const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (g) out.add(g);
  });
  return out;
}

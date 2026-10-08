/**
 * Projeção em planta (vista superior, plano XZ) do modelo em repouso.
 *
 * Cada malha vira o fecho convexo dos seus vértices projetados; o conjunto
 * desses fechos desenha a silhueta. O retângulo envolvente mais a folga dá a
 * área de treino. É o mesmo dado que a planta SVG e o Arxis (layout) consomem.
 */
import * as THREE from 'three';

export type Point2 = [number, number];

export interface Footprint {
  /** Retângulo envolvente no piso (m). x = largura, z = profundidade (+Z = frente). */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Fecho convexo de cada malha, em [x, z]. */
  parts: Point2[][];
  /** Fecho convexo do equipamento inteiro. */
  outline: Point2[];
  /** Folga usada em volta (m). */
  clearanceM: number;
  /** Área de treino: envolvente + folga em todos os lados. */
  trainingArea: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    widthM: number;
    lengthM: number;
    areaM2: number;
  };
}

export function convexHull(points: Point2[]): Point2[] {
  const pts = [...points].sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));
  if (pts.length <= 2) return pts;
  const cross = (o: Point2, a: Point2, b: Point2) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Point2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 1e-12)
      lower.pop();
    lower.push(p);
  }
  const upper: Point2[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 1e-12)
      upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

export function computeFootprint(root: THREE.Object3D, clearanceM: number): Footprint {
  root.updateWorldMatrix(true, true);
  const parts: Point2[][] = [];
  const all: Point2[] = [];
  const v = new THREE.Vector3();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.visible) return;
    const pos = m.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!pos) return;
    const pts: Point2[] = [];
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      pts.push([v.x, v.z]);
    }
    const hull = convexHull(pts);
    parts.push(hull);
    all.push(...hull);
  });
  const outline = convexHull(all);
  const xs = all.map((p) => p[0]);
  const zs = all.map((p) => p[1]);
  const bounds = {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
  const ta = {
    minX: bounds.minX - clearanceM,
    maxX: bounds.maxX + clearanceM,
    minZ: bounds.minZ - clearanceM,
    maxZ: bounds.maxZ + clearanceM,
  };
  const widthM = ta.maxX - ta.minX;
  const lengthM = ta.maxZ - ta.minZ;
  return {
    bounds,
    parts,
    outline,
    clearanceM,
    trainingArea: { ...ta, widthM, lengthM, areaM2: widthM * lengthM },
  };
}

import * as THREE from 'three';
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';
import type { EquipmentLod } from './spec/schema';

export interface LodVariant {
  level: 'original' | 'medium' | 'low';
  ratio: number;
  object: THREE.Group;
  triangles: number;
  dispose(): void;
}

/**
 * Cria variantes independentes do modelo original para catálogo, web e AR.
 * A simplificação preserva materiais e nomes de nós, mas não substitui a
 * validação visual de peças móveis muito finas.
 *
 * É assíncrona desde o Three r186: o `SimplifyModifier` passou a usar o meshoptimizer (WebAssembly).
 */
export async function buildLodVariants(root: THREE.Group, config: EquipmentLod = { mediumRatio: 0.55, lowRatio: 0.25 }): Promise<LodVariant[]> {
  const modifier = new SimplifyModifier();
  const levels: Array<{ level: LodVariant['level']; ratio: number }> = [
    { level: 'original', ratio: 1 },
    { level: 'medium', ratio: config.mediumRatio },
    { level: 'low', ratio: config.lowRatio },
  ];
  const variants: LodVariant[] = [];
  let previousObject = root;
  let previousRatio = 1;
  for (const { level, ratio } of levels) {
    const object = level === 'original' ? root : previousObject.clone(true) as THREE.Group;
    if (level !== 'original') {
      const relativeRatio = Math.min(1, ratio / previousRatio);
      const meshes: THREE.Mesh[] = [];
      object.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) meshes.push(node as THREE.Mesh);
      });
      for (const mesh of meshes) {
        // SimplifyModifier requires an indexed manifold mesh. Generated
        // decals, cables and some thin primitives are intentionally
        // non-indexed; leaving those pieces intact is safer than emitting a
        // broken or noisy simplification result.
        if (!mesh.geometry.index || !mesh.geometry.getAttribute('position')) continue;
        // Object3D.clone compartilha geometrias; clonar antes de simplificar
        // impede que o LOD altere o modelo original ou outra variante.
        const sourceGeometry = mesh.geometry;
        const sourceVertices = sourceGeometry.getAttribute('position').count;
        const targetVertices = Math.max(12, Math.floor(sourceVertices * relativeRatio));
        if (targetVertices >= sourceVertices) continue;
        try {
          const simplified = await modifier.modify(sourceGeometry, targetVertices);
          // O simplificador colapsa peças finas e compridas (hastes, montantes) e as encurta.
          // Se a malha perder mais que `MAX_SHRINK` de qualquer eixo, vale a original: a
          // silhueta e as medidas do modelo não podem mudar de um nível para outro.
          if (shrinks(sourceGeometry, simplified)) simplified.dispose();
          else mesh.geometry = simplified;
        } catch {
          // A disconnected/degenerate primitive keeps its source geometry.
          // The LOD remains valid and the visual silhouette is preserved.
        }
      }
    }
    const triangles = countTriangles(object);
    const variant: LodVariant = {
      level,
      ratio,
      object,
      triangles,
      dispose: () => {
        if (level === 'original') return;
        const geometries = new Set<THREE.BufferGeometry>();
        object.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (mesh.isMesh) geometries.add(mesh.geometry);
        });
        geometries.forEach((geometry) => geometry.dispose());
      },
    };
    variants.push(variant);
    previousObject = object;
    previousRatio = ratio;
  }
  return variants;
}

/** Quanto uma malha pode encurtar num eixo ao ser simplificada, em fração do próprio tamanho. */
export const MAX_SHRINK = 0.02;

function extents(geometry: THREE.BufferGeometry): THREE.Vector3 {
  const box = new THREE.Box3().setFromBufferAttribute(geometry.getAttribute('position') as THREE.BufferAttribute);
  return box.getSize(new THREE.Vector3());
}

/** A malha simplificada ficou menor que a original, em algum eixo, além do tolerado. */
export function shrinks(source: THREE.BufferGeometry, simplified: THREE.BufferGeometry, tolerance = MAX_SHRINK): boolean {
  const a = extents(source);
  const b = extents(simplified);
  return (['x', 'y', 'z'] as const).some((k) => a[k] > 1e-4 && b[k] < a[k] * (1 - tolerance));
}

function countTriangles(root: THREE.Object3D): number {
  let triangles = 0;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    triangles += (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
  });
  return triangles;
}

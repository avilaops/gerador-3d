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
 */
export function buildLodVariants(root: THREE.Group, config: EquipmentLod = { mediumRatio: 0.55, lowRatio: 0.25 }): LodVariant[] {
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
      object.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh || !mesh.geometry.getAttribute('position')) return;
        // Object3D.clone compartilha geometrias; clonar antes de simplificar
        // impede que o LOD altere o modelo original ou outra variante.
        const sourceGeometry = mesh.geometry;
        const sourceVertices = sourceGeometry.getAttribute('position').count;
        const targetVertices = Math.max(12, Math.floor(sourceVertices * relativeRatio));
        if (targetVertices >= sourceVertices) return;
        mesh.geometry = modifier.modify(sourceGeometry, targetVertices);
      });
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

function countTriangles(root: THREE.Object3D): number {
  let triangles = 0;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    triangles += (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
  });
  return triangles;
}

/**
 * GLB com animação, via GLTFExporter dos examples do Three.js.
 * Funciona no navegador e no Node (com `installNodeShims()` antes).
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import type { GeneratedEquipment } from '../generate';

/**
 * GLB de qualquer objeto do gerador, com a animação dada. Serve às variantes de LOD, que são
 * clones do modelo com os mesmos nomes de nó: o `AnimationClip` do original continua valendo.
 */
export async function exportGlbObject(object: THREE.Object3D, clip?: THREE.AnimationClip | null): Promise<ArrayBuffer> {
  const exporter = new GLTFExporter();
  object.updateMatrixWorld(true);
  const result = await new Promise<unknown>((resolve, reject) => {
    exporter.parse(object, resolve, reject, {
      binary: true,
      onlyVisible: true,
      animations: clip ? [clip] : [],
    });
  });
  if (!(result instanceof ArrayBuffer)) throw new Error('GLTFExporter não devolveu um GLB binário');
  return result;
}

export async function exportGlb(eq: GeneratedEquipment): Promise<ArrayBuffer> {
  return exportGlbObject(eq.object, eq.clip);
}

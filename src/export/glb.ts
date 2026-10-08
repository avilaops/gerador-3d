/**
 * GLB com animação, via GLTFExporter dos examples do Three.js.
 * Funciona no navegador e no Node (com `installNodeShims()` antes).
 */
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import type { GeneratedEquipment } from '../generate';

export async function exportGlb(eq: GeneratedEquipment): Promise<ArrayBuffer> {
  const exporter = new GLTFExporter();
  eq.object.updateMatrixWorld(true);
  const result = await new Promise<unknown>((resolve, reject) => {
    exporter.parse(eq.object, resolve, reject, {
      binary: true,
      onlyVisible: true,
      animations: eq.clip ? [eq.clip] : [],
    });
  });
  if (!(result instanceof ArrayBuffer)) throw new Error('GLTFExporter não devolveu um GLB binário');
  return result;
}

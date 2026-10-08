/**
 * USDZ estático (Quick Look do iPhone), via USDZExporter dos examples do Three.js.
 * O Quick Look não reproduz a animação deste formato: o modelo vai em repouso.
 */
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js';
import type { GeneratedEquipment } from '../generate';

export async function exportUsdz(eq: GeneratedEquipment): Promise<ArrayBuffer> {
  eq.object.updateMatrixWorld(true);
  const u8 = await new USDZExporter().parse(eq.object);
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

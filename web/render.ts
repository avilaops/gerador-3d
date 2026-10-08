/**
 * Página de renderização para miniaturas: `scripts/thumbnails.ts` abre esta
 * página num navegador sem tela e chama `window.shoot(spec, opções)`.
 */
import { EquipmentViewer } from '../src/viewer/EquipmentViewer';
import type { EquipmentSpecInput } from '../src/spec/schema';

export interface ShootOptions {
  azimuth?: number;
  elevation?: number;
  distance?: number;
  phase?: number;
  human?: boolean;
  area?: boolean;
  dims?: boolean;
}

const host = document.getElementById('host')!;
// Um único viewer (um único contexto WebGL) para o lote inteiro.
const viewer = new EquipmentViewer(host, {
  toolbar: false,
  autoRotate: false,
  preserveDrawingBuffer: true,
  background: '#f4f3ef',
  initial: { motion: false },
});

function shoot(spec: EquipmentSpecInput, o: ShootOptions = {}): string {
  viewer.setEquipment(spec);
  viewer.set('human', !!o.human);
  viewer.set('area', !!o.area);
  viewer.set('dims', !!o.dims);
  viewer.setView(o.azimuth ?? 38, o.elevation ?? 16, o.distance ?? 1);
  viewer.setPhase(o.phase ?? 0);
  viewer.renderNow();
  return host.querySelector('canvas')!.toDataURL('image/png');
}

Object.assign(window, { shoot, ready: true });

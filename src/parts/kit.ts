/**
 * Kit de construção: materiais PBR e geometrias compartilhados.
 *
 * Toda peça usa geometrias unitárias (caixa 1×1×1, cilindro Ø1×1) escaladas no
 * nó, e materiais por papel (estrutura, estofado, cromado...). Assim um
 * equipamento inteiro reaproveita meia dúzia de geometrias: o GLTFExporter e o
 * USDZExporter gravam cada geometria uma vez, o que segura o tamanho do arquivo.
 *
 * Só MeshStandardMaterial: é o único material que o USDZExporter aceita.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type MaterialRole =
  'frame' | 'upholstery' | 'accent' | 'plate' | 'chrome' | 'rubber' | 'cable' | 'label';

export interface MaterialColors {
  frame?: string;
  upholstery?: string;
  accent?: string;
}

export const DEFAULT_COLORS: Required<MaterialColors> = {
  frame: '#1d1d1d',
  upholstery: '#121212',
  accent: '#96764a',
};

/** Segmentos radiais dos cilindros: suficiente para cromados de Ø ≤ 10 cm em tela de celular. */
const RADIAL_SEGMENTS = 16;

export class PartKit {
  readonly materials: Record<MaterialRole, THREE.MeshStandardMaterial>;
  private readonly geometries = new Map<string, THREE.BufferGeometry>();

  constructor(colors: MaterialColors = {}) {
    const c = { ...DEFAULT_COLORS, ...stripUndefined(colors) };
    const std = (name: string, color: string | number, roughness: number, metalness: number) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
      m.name = name;
      return m;
    };
    this.materials = {
      frame: std('frame', c.frame, 0.5, 0.4),
      upholstery: std('upholstery', c.upholstery, 0.78, 0.05),
      accent: std('accent', c.accent, 0.4, 0.45),
      plate: std('plate', 0x2b2c2e, 0.35, 0.7),
      chrome: std('chrome', 0xd9d9d9, 0.2, 0.95),
      rubber: std('rubber', 0x101010, 0.9, 0),
      cable: std('cable', 0x3a3a3a, 0.5, 0.6),
      label: std('label', 0x96764a, 0.5, 0.2),
    };
  }

  /** Caixa unitária centrada na origem. */
  get unitBox(): THREE.BufferGeometry {
    return this.cached('box', () => new THREE.BoxGeometry(1, 1, 1));
  }

  /** Cilindro de diâmetro 1 e altura 1 ao longo de Y, centrado na origem. */
  get unitCylinder(): THREE.BufferGeometry {
    return this.cached('cyl', () => new THREE.CylinderGeometry(0.5, 0.5, 1, RADIAL_SEGMENTS));
  }

  /** Caixa de cantos arredondados (estofados). Cacheada por medida, porque o raio não escala bem. */
  roundedBox(w: number, h: number, d: number, radius: number): THREE.BufferGeometry {
    const r = Math.min(radius, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
    const key = `rbox:${w.toFixed(3)}:${h.toFixed(3)}:${d.toFixed(3)}:${r.toFixed(3)}`;
    return this.cached(key, () => new RoundedBoxGeometry(w, h, d, 2, r));
  }

  /** Placa de anilha (disco), cacheada por medida. */
  disc(diameter: number, thickness: number): THREE.BufferGeometry {
    const key = `disc:${diameter.toFixed(3)}:${thickness.toFixed(3)}`;
    return this.cached(
      key,
      () => new THREE.CylinderGeometry(diameter / 2, diameter / 2, thickness, 24)
    );
  }

  /** Toro (polias). */
  torus(radius: number, tube: number): THREE.BufferGeometry {
    const key = `torus:${radius.toFixed(3)}:${tube.toFixed(3)}`;
    return this.cached(key, () => new THREE.TorusGeometry(radius, tube, 8, 20));
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.geometries.clear();
    Object.values(this.materials).forEach((m) => m.dispose());
  }

  private cached(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let g = this.geometries.get(key);
    if (!g) {
      g = make();
      g.name = key;
      this.geometries.set(key, g);
    }
    return g;
  }
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

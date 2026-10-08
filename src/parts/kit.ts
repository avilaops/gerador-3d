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
const RADIAL_SEGMENTS = 24;

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

  /**
   * Tubo de seção retangular com cantos arredondados, comprimento 1 ao longo de Y,
   * centrado na origem. Cacheado por seção: o comprimento vem da escala em Y do nó,
   * então o raio do canto não deforma.
   */
  tube(width: number, depth: number): THREE.BufferGeometry {
    const w = Math.round(width * 1000) / 1000;
    const d = Math.round(depth * 1000) / 1000;
    return this.cached(`tube:${w}:${d}`, () => {
      const r = Math.min(0.012, 0.24 * Math.min(w, d));
      const hx = w / 2;
      const hz = d / 2;
      const shape = new THREE.Shape();
      shape.moveTo(-hx + r, -hz);
      shape.lineTo(hx - r, -hz);
      shape.absarc(hx - r, -hz + r, r, -Math.PI / 2, 0, false);
      shape.lineTo(hx, hz - r);
      shape.absarc(hx - r, hz - r, r, 0, Math.PI / 2, false);
      shape.lineTo(-hx + r, hz);
      shape.absarc(-hx + r, hz - r, r, Math.PI / 2, Math.PI, false);
      shape.lineTo(-hx, -hz + r);
      shape.absarc(-hx + r, -hz + r, r, Math.PI, 1.5 * Math.PI, false);
      const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 3 });
      // A extrusão sai ao longo de Z: deita para Y (o Y da forma vira o Z do tubo) e centraliza.
      g.translate(0, 0, -0.5);
      g.rotateX(Math.PI / 2);
      return g;
    });
  }

  /** Caixa de cantos arredondados (estofados). Cacheada por medida, porque o raio não escala bem. */
  roundedBox(w: number, h: number, d: number, radius: number): THREE.BufferGeometry {
    const r = Math.min(radius, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
    const key = `rbox:${w.toFixed(3)}:${h.toFixed(3)}:${d.toFixed(3)}:${r.toFixed(3)}`;
    return this.cached(key, () => new RoundedBoxGeometry(w, h, d, 3, r));
  }

  /** Anilha: disco torneado com cubo central, rebaixo e aro, eixo em Y. Cacheada por medida. */
  disc(diameter: number, thickness: number): THREE.BufferGeometry {
    const key = `disc:${diameter.toFixed(3)}:${thickness.toFixed(3)}`;
    return this.cached(key, () => {
      const R = diameter / 2;
      const h = thickness / 2;
      const hole = 0.026;
      const profile: [number, number][] = [
        [hole, -h],
        [0.22 * R, -h],
        [0.3 * R, -0.55 * h],
        [0.8 * R, -0.55 * h],
        [0.87 * R, -h],
        [R - 0.004, -h],
        [R, -h + 0.004],
        [R, h - 0.004],
        [R - 0.004, h],
        [0.87 * R, h],
        [0.8 * R, 0.55 * h],
        [0.3 * R, 0.55 * h],
        [0.22 * R, h],
        [hole, h],
        [hole, -h],
      ];
      const g = new THREE.LatheGeometry(
        profile.map(([x, y]) => new THREE.Vector2(x, y)),
        28
      );
      return g;
    });
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

/**
 * Conjuntos compostos: torre, bateria de pesos e braço articulado.
 */
import * as THREE from 'three';
import type { PartKit } from './kit';
import { beam, box, cable, mesh } from './primitives';
import type { Vec3 } from '../spec/schema';

export interface TowerOptions {
  /** Centro da torre no piso (x, z). */
  x: number;
  z: number;
  /** Distância entre os eixos dos dois montantes. */
  postSpacing: number;
  /** Altura total, incluindo a capa superior. */
  height: number;
  /** Lado do tubo dos montantes. */
  post: number;
  /** Profundidade da capa superior. */
  capDepth?: number;
  /** Deslocamento em z do centro da capa em relação aos montantes. */
  capOffsetZ?: number;
  /** Plaqueta de identificação na frente da capa. */
  label?: boolean;
}

/** Torre: dois montantes, capa superior e travessa de base. */
export function tower(kit: PartKit, o: TowerOptions): THREE.Group {
  const g = new THREE.Group();
  g.name = 'tower';
  const capH = o.post;
  const capDepth = o.capDepth ?? o.post * 4.5;
  const capZ = o.z + (o.capOffsetZ ?? 0);
  const half = o.postSpacing / 2;
  const topOfPosts = o.height - capH;
  g.add(beam(kit, [-half, 0, o.z], [-half, topOfPosts, o.z], o.post, { name: 'tower_post_left' }));
  g.add(beam(kit, [half, 0, o.z], [half, topOfPosts, o.z], o.post, { name: 'tower_post_right' }));
  g.add(
    box(kit, [o.postSpacing + 2 * o.post + 0.09, capH, capDepth], [0, o.height - capH / 2, capZ], {
      name: 'tower_cap',
    })
  );
  if (o.label !== false) {
    g.add(
      box(kit, [0.12, capH * 0.85, 0.004], [0, o.height - capH / 2, capZ + capDepth / 2 + 0.002], {
        material: 'label',
        name: 'tower_label',
      })
    );
  }
  return g;
}

export interface WeightStackOptions {
  x: number;
  z: number;
  /** Número de placas (inclui a placa do topo à parte). */
  plates: number;
  plateSize?: Vec3;
  gap?: number;
  /** Altura da primeira placa (base). */
  baseY?: number;
  /** Altura das hastes guia. */
  guideHeight: number;
  /** Altura do ponto de ancoragem do cabo, no alto da torre. */
  cableTopY?: number;
}

export interface WeightStackParts {
  /** Parte móvel: placas, placa do topo e pino seletor. Nó animado "stack". */
  stack: THREE.Group;
  /** Parte fixa: hastes guia, batentes e o cabo até o alto. */
  guides: THREE.Group;
  /** Altura do topo da bateria em repouso. */
  topY: number;
}

/** Bateria de pesos com hastes guia e pino seletor. */
export function weightStack(kit: PartKit, o: WeightStackOptions): WeightStackParts {
  const [pw, ph, pd] = o.plateSize ?? [0.24, 0.032, 0.13];
  const gap = o.gap ?? 0.005;
  const baseY = o.baseY ?? 0.11;
  const pitch = ph + gap;

  const stack = new THREE.Group();
  stack.name = 'stack';
  const plateGeo = kit.unitBox;
  for (let i = 0; i < o.plates; i++) {
    const p = mesh(kit, plateGeo, 'plate', `stack_plate_${String(i + 1).padStart(2, '0')}`);
    p.scale.set(pw, ph, pd);
    p.position.set(o.x, baseY + i * pitch, o.z);
    stack.add(p);
  }
  const topY = baseY + o.plates * pitch;
  stack.add(box(kit, [pw, ph * 0.95, pd], [o.x, topY, o.z], { name: 'stack_top_plate' }));
  // Haste seletora (dentro das placas) e pino seletor saindo pela frente.
  stack.add(
    beam(kit, [o.x, baseY - 0.01, o.z], [o.x, topY + 0.25, o.z], 0.012, {
      round: true,
      material: 'chrome',
      name: 'stack_selector_rod',
    })
  );
  const pinY = baseY + Math.floor(o.plates * 0.6) * pitch;
  stack.add(
    beam(kit, [o.x, pinY, o.z + pd / 2 - 0.02], [o.x, pinY, o.z + pd / 2 + 0.05], 0.012, {
      round: true,
      material: 'chrome',
      name: 'stack_selector_pin',
    })
  );

  const guides = new THREE.Group();
  guides.name = 'stack_guides';
  const gx = pw / 2 - 0.04;
  for (const s of [-1, 1]) {
    guides.add(
      beam(kit, [o.x + s * gx, 0.06, o.z], [o.x + s * gx, o.guideHeight, o.z], 0.02, {
        round: true,
        material: 'chrome',
      })
    );
  }
  guides.add(
    box(kit, [pw + 0.02, 0.05, pd + 0.03], [o.x, 0.06, o.z], { name: 'stack_base_bumper' })
  );
  guides.add(
    box(kit, [pw + 0.02, 0.06, pd + 0.03], [o.x, o.guideHeight + 0.02, o.z], {
      name: 'stack_guide_top',
    })
  );
  if (o.cableTopY !== undefined) {
    guides.add(cable(kit, [o.x, topY + 0.25, o.z], [o.x, o.cableTopY, o.z], 'stack_cable'));
  }
  return { stack, guides, topY };
}

/**
 * Braço articulado: grupo com origem no eixo de giro. Tudo que se adiciona ao
 * grupo usa coordenadas locais a partir do pivô.
 */
export function pivotArm(
  kit: PartKit,
  name: string,
  pivot: Vec3,
  hub: { axis: 'x' | 'y' | 'z'; diameter?: number; length?: number } = { axis: 'y' }
): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(...pivot);
  const d = hub.diameter ?? 0.09;
  const l = hub.length ?? 0.09;
  const a: Vec3 =
    hub.axis === 'x' ? [-l / 2, 0, 0] : hub.axis === 'y' ? [0, -l / 2, 0] : [0, 0, -l / 2];
  const b: Vec3 = [-a[0], -a[1], -a[2]];
  g.add(beam(kit, a, b, d, { round: true, material: 'chrome', name: `${name}_hub` }));
  return g;
}

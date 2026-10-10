/**
 * Conjuntos compostos: torre, bateria de pesos e braço articulado.
 */
import * as THREE from 'three';
import type { PartKit } from './kit';
import { beam, box, cable, mesh } from './primitives';
import type { Articulation, Vec3 } from '../spec/schema';
import { decalPlane, incrementDecal, placardDecal, scaleDecal } from './decals';

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
  g.add(
    beam(kit, [-half, 0, o.z], [-half, topOfPosts, o.z], o.post, {
      name: 'tower_post_left',
    }),
  );
  g.add(
    beam(kit, [half, 0, o.z], [half, topOfPosts, o.z], o.post, {
      name: 'tower_post_right',
    }),
  );
  g.add(
    box(kit, [o.postSpacing + 2 * o.post + 0.09, capH, capDepth], [0, o.height - capH / 2, capZ], {
      name: 'tower_cap',
    }),
  );
  if (o.label !== false) {
    g.add(
      box(kit, [0.12, capH * 0.85, 0.004], [0, o.height - capH / 2, capZ + capDepth / 2 + 0.002], {
        material: 'label',
        name: 'tower_label',
      }),
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
  stack.add(
    box(kit, [pw, ph * 0.95, pd], [o.x, topY, o.z], {
      name: 'stack_top_plate',
    }),
  );
  // Haste seletora (dentro das placas) e pino seletor saindo pela frente.
  stack.add(
    beam(kit, [o.x, baseY - 0.01, o.z], [o.x, topY + 0.25, o.z], 0.012, {
      round: true,
      material: 'chrome',
      name: 'stack_selector_rod',
    }),
  );
  const pinY = baseY + Math.floor(o.plates * 0.6) * pitch;
  stack.add(
    beam(kit, [o.x, pinY, o.z + pd / 2 - 0.02], [o.x, pinY, o.z + pd / 2 + 0.05], 0.012, {
      round: true,
      material: 'chrome',
      name: 'stack_selector_pin',
    }),
  );

  const guides = new THREE.Group();
  guides.name = 'stack_guides';
  const gx = pw / 2 - 0.04;
  for (const s of [-1, 1]) {
    guides.add(
      beam(kit, [o.x + s * gx, 0.06, o.z], [o.x + s * gx, o.guideHeight, o.z], 0.02, {
        round: true,
        material: 'chrome',
      }),
    );
  }
  guides.add(
    box(kit, [pw + 0.02, 0.05, pd + 0.03], [o.x, 0.06, o.z], {
      name: 'stack_base_bumper',
    }),
  );
  guides.add(
    box(kit, [pw + 0.02, 0.06, pd + 0.03], [o.x, o.guideHeight + 0.02, o.z], {
      name: 'stack_guide_top',
    }),
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
  hub: { axis: 'x' | 'y' | 'z'; diameter?: number; length?: number } = {
    axis: 'y',
  },
): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(...pivot);
  const d = hub.diameter ?? 0.09;
  const l = hub.length ?? 0.09;
  const a: Vec3 = hub.axis === 'x' ? [-l / 2, 0, 0] : hub.axis === 'y' ? [0, -l / 2, 0] : [0, 0, -l / 2];
  const b: Vec3 = [-a[0], -a[1], -a[2]];
  g.add(
    beam(kit, a, b, d, {
      round: true,
      material: 'chrome',
      name: `${name}_hub`,
    }),
  );
  return g;
}

export interface StackTowerOptions {
  /** Coluna preta mesmo quando a estrutura tem outra cor (baterias das iso-laterais). */
  dark?: boolean;
  /** Sufixo dos nós: "" (torre única), "_left", "_right"... */
  suffix?: string;
  /** Posição do eixo da torre no piso. */
  x: number;
  z: number;
  height: number;
  post: number;
  plates: number;
  travel: number;
  /** Nome do exercício no adesivo da torre (como vem de fábrica, em inglês). */
  title?: string;
  /** Carga total da bateria, para a régua numerada. */
  totalKg?: number;
  /** Tampo de madeira com o suporte atrás. Só a linha preta de uma coluna tem; padrão: sim. */
  cap?: boolean;
}

/**
 * Torre completa com bateria: montantes, capa, hastes, placas, polia e
 * carenagem traseira. Devolve o grupo (`tower<sufixo>`) e a articulação da
 * bateria (`stack<sufixo>`).
 */
export function stackTower(kit: PartKit, o: StackTowerOptions): { group: THREE.Group; articulation: Articulation } {
  const suffix = o.suffix ?? '';
  const unit = new THREE.Group();
  unit.name = `tower${suffix}`;
  unit.position.set(o.x, 0, o.z);
  // Coluna carenada, como nas máquinas reais: laterais e fundo em chapa, tampo de
  // madeira com o suporte arredondado atrás, e a frente fechada por duas chapas que
  // deixam uma fenda no meio (por onde se vê a haste e se troca o pino).
  const panel = o.dark ? 'rubber' : 'frame';
  const frame = new THREE.Group();
  frame.name = 'tower_frame';
  const cap = o.cap !== false;
  const capH = cap ? 0.035 : 0;
  const bracket = cap ? 0.07 : 0;
  const capY = o.height - bracket - capH / 2;
  const bodyH = o.height - bracket - capH;
  const halfW = 0.18;
  const depth = 0.24;
  const front = depth / 2;
  for (const s of [-1, 1]) {
    frame.add(
      box(kit, [0.03, bodyH, depth], [s * (halfW - 0.015), bodyH / 2, 0], {
        name: 'tower_side',
        material: panel,
      }),
    );
  }
  frame.add(
    box(kit, [2 * halfW, 0.1, depth], [0, 0.05, 0], {
      name: 'tower_foot',
      material: panel,
    }),
  );
  if (cap) {
    frame.add(
      box(kit, [2 * halfW + 0.06, capH, depth + 0.06], [0, capY, 0], {
        material: 'wood',
        name: 'tower_cap',
      }),
    );
    // Suporte de chapa que sobe atrás do tampo, com dois parafusos.
    frame.add(
      box(kit, [2 * halfW - 0.08, bracket + capH + 0.05, 0.014], [0, o.height - (bracket + capH + 0.05) / 2, -front + 0.007], {
        material: panel,
        name: 'tower_bracket',
      }),
    );
    for (const s of [-1, 1]) {
      frame.add(
        beam(kit, [s * 0.09, o.height - 0.035, -front + 0.014], [s * 0.09, o.height - 0.035, -front + 0.024], 0.03, {
          round: true,
          material: 'chrome',
          name: 'tower_bolt',
        }),
      );
    }
  } else {
    // Sem tampo: a coluna fecha em cima com a própria chapa.
    frame.add(
      box(kit, [2 * halfW, 0.03, depth], [0, bodyH - 0.015, 0], {
        name: 'tower_top',
        material: panel,
      }),
    );
  }
  // Chapas da frente: a da esquerda (larga) leva a placa do exercício.
  const slot = 0.07;
  const leftW = 0.2;
  const rightW = 2 * halfW - leftW - slot;
  const panelY0 = 0.42 * bodyH;
  const panelH = bodyH - panelY0;
  const xLeft = -halfW + leftW / 2;
  const xRight = halfW - rightW / 2;
  frame.add(box(kit, [leftW, panelH, 0.012], [xLeft, panelY0 + panelH / 2, front - 0.006], { name: 'tower_front_left', material: panel }));
  frame.add(
    box(kit, [rightW, panelH, 0.012], [xRight, panelY0 + panelH / 2, front - 0.006], { name: 'tower_front_right', material: panel }),
  );
  const placard = placardDecal(kit, o.title ?? '');
  if (placard && o.title) {
    const ph = Math.min(panelH - 0.06, 0.46);
    frame.add(decalPlane(kit, placard, [ph * 0.4, ph], [xLeft, panelY0 + panelH - 0.04 - ph / 2, front + 0.001], 'decal_placard'));
  } else {
    frame.add(
      box(kit, [0.14, 0.1, 0.004], [xLeft, bodyH - 0.12, front + 0.002], {
        material: 'label',
        name: 'tower_label',
      }),
    );
  }
  const increment = incrementDecal(kit);
  if (increment) {
    frame.add(decalPlane(kit, increment, [rightW - 0.02, (rightW - 0.02) / 2], [xRight, bodyH - 0.08, front + 0.001], 'decal_increment'));
  }
  unit.add(frame);
  const guideHeight = Math.min(0.7 * o.height, o.height - 0.3);
  const baseY = 0.11;
  const available = guideHeight - baseY - o.travel - 0.26;
  const pitch = Math.min(0.037, Math.max(0.016, available / (o.plates + 1)));
  const st = weightStack(kit, {
    x: 0,
    z: 0,
    plates: o.plates,
    plateSize: [0.24, pitch - 0.005, 0.13],
    gap: 0.005,
    baseY,
    guideHeight,
    cableTopY: bodyH - 0.06,
  });
  st.stack.name = `stack${suffix}`;
  unit.add(st.guides, st.stack);
  // Régua numerada ao lado das placas.
  const scale = scaleDecal(kit, o.plates, o.totalKg ?? o.plates * 9.8);
  if (scale) {
    const sh = o.plates * pitch;
    unit.add(decalPlane(kit, scale, [0.045, sh], [-(halfW - 0.045), baseY - pitch / 2 + sh / 2, front - 0.02], 'decal_scale'));
  }
  unit.add(
    box(kit, [2 * halfW - 0.06, bodyH - 0.1, 0.012], [0, (bodyH - 0.1) / 2 + 0.1, -front + 0.006], {
      name: 'tower_shroud',
      material: panel,
    }),
  );
  return {
    group: unit,
    articulation: {
      node: `stack${suffix}`,
      type: 'prismatic',
      axis: [0, 1, 0],
      pivot: [o.x, 0, o.z],
      range: [0, o.travel],
      driver: 'phase',
    },
  };
}

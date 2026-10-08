/**
 * Família `selectorized-tower`: máquina com torre e bateria de pesos.
 *
 * Referência: Peck Deck LD-B004 (porte do protótipo `peck-deck-prototipo.html`).
 * O corpo comum (base, torre, bateria, assento, encosto) vale para toda a
 * família; o `mechanism` escolhe o conjunto móvel. Na Fase 1 existe
 * `pec-fly` (braços que fecham na frente do peito). `none` gera só o corpo,
 * útil como rascunho de máquinas cujo mecanismo ainda não foi modelado.
 */
import * as THREE from 'three';
import { z } from 'zod';
import type { FamilyDefinition } from './types';
import { beam, bentTube, cable, upholstery } from '../parts/primitives';
import { Rig } from '../parts/rig';
import { poseAnchor } from '../parts/pose';
import { pivotArm, stackTower } from '../parts/assemblies';
import type { Articulation } from '../spec/schema';
import { buildMachine } from './machine/machine';
import { EXERCISES, EXERCISE_IDS, type ExerciseId } from './machine/exercises';

export const SelectorizedTowerParamsSchema = z.object({
  /** Lado do tubo da estrutura (m). */
  tube: z.number().positive(),
  /** Meia largura da travessa traseira da base. */
  baseRearHalfWidth: z.number().positive(),
  /** Posição em x das longarinas da base. */
  baseRailX: z.number().positive(),
  /** Posição em z do eixo da torre (negativo: atrás). */
  towerZ: z.number(),
  towerPostSpacing: z.number().positive(),
  /** Número de placas da bateria. */
  stackPlates: z.number().int().min(1).max(40),
  /** Curso vertical da bateria durante o movimento (m). */
  stackTravel: z.number().nonnegative(),
  seatHeight: z.number().positive(),
  seatZ: z.number(),
  seatWidth: z.number().positive(),
  seatDepth: z.number().positive(),
  backrestHeight: z.number().positive(),
  /** Inclinação do encosto para trás (rad). */
  backrestTilt: z.number(),
  /** `pec-fly` e `none` usam o corpo do Peck Deck; os demais, a máquina genérica (machine/). */
  mechanism: z.enum(['pec-fly', 'none', ...EXERCISE_IDS]),
  /** Número de baterias: 1 no centro ou 2 nas laterais (iso-lateral). */
  stacks: z.union([z.literal(1), z.literal(2)]),
  /** Multiplicador do giro das alavancas (máquina genérica). */
  swingScale: z.number().positive(),
  /** Torre preta e braços na cor de destaque (linha de quadro prata). */
  darkTower: z.boolean(),
  armPivotHeight: z.number().positive(),
  armPivotX: z.number().nonnegative(),
  armPivotZ: z.number(),
  /** Comprimento do trecho vertical do braço (m). */
  armDrop: z.number().positive(),
  /** Abertura → fechamento dos braços (rad). */
  armSwing: z.number(),
  footAssist: z.boolean(),
});
export type SelectorizedTowerParams = z.infer<typeof SelectorizedTowerParamsSchema>;

/** kg por placa típico das baterias de placas (138 kg ≈ 14 placas). */
const KG_PER_PLATE = 9.8;

export const selectorizedTower: FamilyDefinition<SelectorizedTowerParams> = {
  id: 'selectorized-tower',
  label: 'Torre com bateria de pesos',
  paramsSchema: SelectorizedTowerParamsSchema,

  defaults(d, spec) {
    const kg = spec.weightStackKg?.perStack ?? 100;
    const mech = spec.params.mechanism;
    const ex = typeof mech === 'string' && mech in EXERCISES ? EXERCISES[mech as ExerciseId] : undefined;
    return {
      tube: 0.07,
      baseRearHalfWidth: 0.35 * d.width,
      baseRailX: 0.25 * d.width,
      towerZ: -d.length / 2 + 0.125,
      towerPostSpacing: 0.34,
      stackPlates: Math.max(6, Math.min(24, Math.round(kg / KG_PER_PLATE))),
      stackTravel: Math.min(0.25, 0.08 * d.height),
      seatHeight: ex?.seatHeight ?? 0.52,
      seatZ: ex ? ex.seatAt * d.length : 0.03,
      seatWidth: 0.42,
      seatDepth: 0.38,
      backrestHeight: 0.74,
      backrestTilt: ex?.backTilt ?? 0.12,
      mechanism: 'pec-fly',
      stacks: spec.weightStackKg?.stacks === 2 ? 2 : 1,
      swingScale: 1,
      darkTower: false,
      armPivotHeight: d.height - 0.19,
      armPivotX: 0.18,
      armPivotZ: -0.14,
      armDrop: 0.68,
      armSwing: 1.2,
      footAssist: true,
    };
  },

  build({ dims, params: p, kit }) {
    if (p.mechanism !== 'pec-fly' && p.mechanism !== 'none') {
      return buildMachine(dims, kit, {
        exercise: p.mechanism,
        resistance: 'stack',
        stacks: p.stacks,
        tube: p.tube,
        seatHeight: p.seatHeight,
        seatZ: p.seatZ,
        backTilt: p.backrestTilt,
        stackPlates: p.stackPlates,
        stackTravel: p.stackTravel,
        swingScale: p.swingScale,
        darkTower: p.darkTower,
      });
    }
    const root = new THREE.Group();
    root.name = 'equipment';
    const rig = new Rig(kit, root);
    const t = p.tube;
    const y0 = t / 2;
    const L = dims.length;
    const zRear = -L / 2;
    const zFront = L / 2;
    const tz = p.towerZ;

    // Base em T: espinha da torre até a frente, pernas traseiras abertas e pé dianteiro.
    const base = rig.group('base');
    const spineEnd = p.footAssist ? zFront - 0.3 : zFront - t / 2;
    rig.tube(base, [0, y0, tz], [0, y0, spineEnd], t, 'frame', 'base_spine');
    for (const s of [-1, 1] as const) {
      const end: [number, number, number] = [s * p.baseRearHalfWidth, y0, zRear + t / 2];
      rig.tube(base, [0, y0, tz + 0.04], end, t, 'frame', 'base_rear_leg');
      rig.box(base, [0.17, 0.012, 0.1], [end[0], 0.006, end[2] + 0.01], 'rubber', 'foot');
    }
    rig.tube(base, [-p.baseRailX, y0, spineEnd], [p.baseRailX, y0, spineEnd], t, 'frame', 'base_front_foot');
    for (const s of [-1, 1] as const)
      rig.box(base, [0.1, 0.012, 0.16], [s * p.baseRailX, 0.006, spineEnd], 'rubber', 'foot');

    // Torre carenada com a bateria.
    root.add(
      stackTower(kit, {
        x: 0,
        z: tz,
        height: dims.height,
        post: t,
        plates: p.stackPlates,
        travel: p.stackTravel,
      }).group
    );

    // Assento com regulagem e encosto alto.
    const seat = rig.group('seat');
    rig.tube(seat, [0, y0, p.seatZ + 0.06], [0, p.seatHeight - 0.04, p.seatZ], t, 'frame', 'seat_post');
    rig.box(seat, [0.014, 0.26, 0.05], [0.045, p.seatHeight - 0.22, p.seatZ + 0.02], 'plate', 'seat_adjuster');
    rig.rod(seat, [0.05, p.seatHeight - 0.16, p.seatZ + 0.02], [0.13, p.seatHeight - 0.2, p.seatZ + 0.02], 0.014, 'chrome', 'seat_pin');
    rig.pad(seat, [p.seatWidth, 0.085, p.seatDepth], [0, p.seatHeight, p.seatZ], 0, 'seat_pad');
    root.add(poseAnchor([0, p.seatHeight + 0.13, p.seatZ - 0.06], { kind: 'seated', tilt: p.backrestTilt, feet: 'floor' }));

    const backZ = p.seatZ - p.seatDepth / 2 - 0.13;
    const backY = p.seatHeight + 0.06 + p.backrestHeight / 2;
    const backrest = rig.group('backrest');
    rig.pad(backrest, [0.34, p.backrestHeight, 0.085], [0, backY, backZ], -p.backrestTilt, 'backrest_pad');
    rig.path(
      backrest,
      [
        [0, y0, backZ - 0.02],
        [0, p.seatHeight + 0.05, backZ - 0.07],
        [0, backY + 0.18, backZ - 0.08 - 0.3 * Math.sin(p.backrestTilt)],
      ],
      0.06,
      'frame',
      'backrest_support',
      0.12
    );
    rig.tube(backrest, [0, backY, tz + 0.1], [0, backY, backZ - 0.08], 0.05);

    const articulations: Articulation[] = [
      {
        node: 'stack',
        type: 'prismatic',
        axis: [0, 1, 0],
        pivot: [0, 0, 0],
        range: [0, p.stackTravel],
        driver: 'phase',
      },
    ];

    if (p.mechanism === 'pec-fly') {
      // Cabeçote: viga que sai do alto da torre, travessa e os dois cames dos braços.
      const head = rig.group('head');
      const hy = p.armPivotHeight + 0.07;
      rig.tube(head, [0, hy, tz + 0.1], [0, hy, p.armPivotZ], [0.09, 0.07]);
      rig.tube(head, [-(p.armPivotX + 0.03), hy, p.armPivotZ], [p.armPivotX + 0.03, hy, p.armPivotZ], [t, 0.06]);
      head.add(cable(kit, [0, dims.height - 0.24, tz], [0, p.armPivotHeight, p.armPivotZ]));
      for (const s of [-1, 1] as const) {
        for (const dy of [0.025, -0.075]) {
          const cam = new THREE.Mesh(kit.disc(0.21, 0.014), kit.materials.plate);
          cam.name = 'cam';
          cam.position.set(s * p.armPivotX, p.armPivotHeight + dy, p.armPivotZ);
          cam.castShadow = true;
          head.add(cam);
        }
      }

      const reach = dims.width / 2 - p.armPivotX - 0.03;
      for (const side of [-1, 1] as const) {
        const name = side < 0 ? 'arm_left' : 'arm_right';
        const g = pivotArm(kit, name, [side * p.armPivotX, p.armPivotHeight, p.armPivotZ], {
          axis: 'y',
          diameter: 0.07,
          length: 0.12,
        });
        // Braço de tubo curvado: sai do came, abre e desce até a almofada.
        g.add(
          bentTube(
            kit,
            [
              [0, 0, 0],
              [side * reach, 0, 0],
              [side * reach, -p.armDrop, 0],
            ],
            0.055,
            { radius: 0.13, name: `${name}_tube` }
          )
        );
        g.add(
          upholstery(kit, [0.075, 0.36, 0.17], [side * (reach - 0.045), -p.armDrop + 0.14, 0.02], {
            name: `${name}_pad`,
          })
        );
        g.add(
          beam(kit, [side * reach, -p.armDrop * 0.42, 0], [side * (reach - 0.02), -p.armDrop * 0.42, 0.17], 0.034, {
            round: true,
            material: 'rubber',
            name: `${name}_grip`,
          })
        );
        root.add(g);
        articulations.push({
          node: name,
          type: 'revolute',
          // Os dois braços fecham para a frente (+Z): o esquerdo gira em +Y, o direito em −Y.
          axis: [0, side < 0 ? 1 : -1, 0],
          pivot: [side * p.armPivotX, p.armPivotHeight, p.armPivotZ],
          range: [0, p.armSwing],
          driver: 'phase',
        });
      }
    }

    if (p.footAssist) {
      // Barra de pés: tubo que sobe da ponta da espinha, com a barra emborrachada.
      const fa = rig.group('foot_assist');
      const zf = zFront - 0.02;
      rig.path(
        fa,
        [
          [0, y0, spineEnd - 0.1],
          [0, 0.17, zf - 0.12],
          [0, 0.2, zf],
        ],
        0.05,
        'frame',
        'foot_assist_arm',
        0.1
      );
      rig.rod(fa, [-0.22, 0.2, zf], [0.22, 0.2, zf], 0.036, 'rubber', 'foot_assist_bar');
    }

    return { root, articulations };
  },
};

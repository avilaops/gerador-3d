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
import { beam, box, cable, rubberFoot, upholstery } from '../parts/primitives';
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
      });
    }
    const root = new THREE.Group();
    root.name = 'equipment';
    const t = p.tube;
    const y0 = t / 2;
    const zRear = -dims.length / 2 + t / 2;
    const zFront = dims.length / 2 - t / 2;

    // Base
    const base = new THREE.Group();
    base.name = 'base';
    base.add(beam(kit, [-p.baseRearHalfWidth, y0, zRear], [p.baseRearHalfWidth, y0, zRear], t));
    for (const s of [-1, 1]) {
      base.add(beam(kit, [s * p.baseRailX, y0, zRear], [s * p.baseRailX, y0, zFront], t));
    }
    base.add(beam(kit, [-p.baseRailX, y0, zFront], [p.baseRailX, y0, zFront], t));
    base.add(beam(kit, [0, y0, zRear], [0, y0, p.seatZ + 0.07], t));
    // Sapatas recuadas para dentro da envolvente (não aumentam C).
    const footRear = -dims.length / 2 + 0.05;
    const footFront = dims.length / 2 - 0.05;
    for (const [x, z] of [
      [-p.baseRearHalfWidth, footRear],
      [p.baseRearHalfWidth, footRear],
      [-p.baseRailX, footFront],
      [p.baseRailX, footFront],
    ]) {
      base.add(rubberFoot(kit, x, z));
    }
    root.add(base);

    // Torre e bateria
    const guideHeight = Math.min(0.7 * dims.height, dims.height - 0.3);
    root.add(
      stackTower(kit, {
        x: 0,
        z: p.towerZ,
        height: dims.height,
        post: t,
        plates: p.stackPlates,
        travel: p.stackTravel,
      }).group
    );

    // Assento e encosto
    const seat = new THREE.Group();
    seat.name = 'seat';
    seat.add(
      beam(kit, [0, y0, p.seatZ], [0, p.seatHeight - 0.04, p.seatZ], t, { name: 'seat_post' })
    );
    seat.add(
      upholstery(kit, [p.seatWidth, 0.085, p.seatDepth], [0, p.seatHeight, p.seatZ], {
        name: 'seat_pad',
      })
    );
    root.add(seat);

    const backZ = p.seatZ - p.seatDepth / 2 - 0.13;
    const backY = p.seatHeight + 0.06 + p.backrestHeight / 2;
    const backrest = new THREE.Group();
    backrest.name = 'backrest';
    backrest.add(
      beam(kit, [0, backY - 0.11, p.towerZ], [0, backY - 0.11, backZ - 0.04], 0.06, {
        name: 'backrest_support',
      })
    );
    backrest.add(
      upholstery(kit, [0.34, p.backrestHeight, 0.085], [0, backY, backZ], {
        tiltX: -p.backrestTilt,
        name: 'backrest_pad',
      })
    );
    root.add(backrest);

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
      const head = new THREE.Group();
      head.name = 'head';
      const hy = p.armPivotHeight + 0.06;
      head.add(beam(kit, [0, hy, p.towerZ + 0.05], [0, hy, p.armPivotZ], 0.08));
      head.add(
        beam(
          kit,
          [-(p.armPivotX + 0.02), hy, p.armPivotZ],
          [p.armPivotX + 0.02, hy, p.armPivotZ],
          t
        )
      );
      head.add(cable(kit, [0, dims.height - 0.12, p.towerZ], [0, p.armPivotHeight, p.armPivotZ]));
      root.add(head);

      const reach = dims.width / 2 - p.armPivotX - 0.03;
      for (const side of [-1, 1] as const) {
        const name = side < 0 ? 'arm_left' : 'arm_right';
        const g = pivotArm(kit, name, [side * p.armPivotX, p.armPivotHeight, p.armPivotZ], {
          axis: 'y',
          diameter: 0.09,
          length: 0.09,
        });
        g.add(beam(kit, [0, 0, 0], [side * reach, 0, 0], 0.06));
        g.add(beam(kit, [side * reach, 0.03, 0], [side * reach, -p.armDrop, 0], 0.06));
        g.add(
          upholstery(kit, [0.07, 0.34, 0.17], [side * (reach - 0.04), -p.armDrop + 0.13, 0.02], {
            name: `${name}_pad`,
          })
        );
        g.add(
          beam(
            kit,
            [side * reach, -p.armDrop * 0.44, 0],
            [side * reach, -p.armDrop * 0.44, 0.16],
            0.03,
            {
              round: true,
              material: 'chrome',
              name: `${name}_grip`,
            }
          )
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
      const fa = new THREE.Group();
      fa.name = 'foot_assist';
      const zf = dims.length / 2 - 0.12;
      fa.add(beam(kit, [0, 0.09, p.seatZ + 0.09], [0, 0.33, zf - 0.01], 0.05));
      fa.add(
        beam(kit, [-0.16, 0.33, zf], [0.16, 0.33, zf], 0.035, { round: true, material: 'chrome' })
      );
      root.add(fa);
    }

    // Placa de bateria visível de frente (marca da linha)
    root.add(
      box(kit, [0.1, 0.05, 0.004], [0, guideHeight + 0.09, p.towerZ + 0.07], { material: 'accent' })
    );

    return { root, articulations };
  },
};

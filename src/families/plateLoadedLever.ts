/**
 * Família `plate-loaded-lever`: peso livre articulado (anilhas), com braços de
 * alavanca independentes que giram num eixo horizontal no alto do quadro.
 *
 * Referência: Supino e Remada LD-A002.
 * Quadro lateral em "A" de cada lado, eixo do pivô no alto, alavancas por fora
 * do quadro com pinos de anilha apontando para fora. Estação de supino na
 * frente (+Z) e, opcionalmente, estação de remada atrás (−Z).
 */
import * as THREE from 'three';
import { z } from 'zod';
import type { FamilyDefinition } from './types';
import { beam, box, plateHorn, rubberFoot, upholstery } from '../parts/primitives';
import { pivotArm } from '../parts/assemblies';
import type { Articulation, Vec3 } from '../spec/schema';
import { buildMachine } from './machine/machine';
import { EXERCISES, EXERCISE_IDS, type ExerciseId } from './machine/exercises';

export const PlateLoadedLeverParamsSchema = z.object({
  /** `press-row` é o quadro em A do Supino e Remada; os demais usam a máquina genérica (machine/). */
  mechanism: z.enum(['press-row', ...EXERCISE_IDS]),
  /** Multiplicador do giro das alavancas (máquina genérica). */
  swingScale: z.number().positive(),
  tube: z.number().positive(),
  /** Meia distância entre os quadros laterais (e as longarinas da base). */
  frameX: z.number().positive(),
  pivotHeight: z.number().positive(),
  pivotZ: z.number(),
  /** Seção do tubo da alavanca. */
  leverTube: z.number().positive(),
  /** Ponta dianteira da alavanca, relativa ao pivô: [dy, dz]. */
  leverFront: z.tuple([z.number(), z.number()]),
  /** Ponta traseira da alavanca, relativa ao pivô: [dy, dz]. */
  leverRear: z.tuple([z.number(), z.number()]),
  /** Comprimento útil do pino de anilhas. */
  hornLength: z.number().positive(),
  /** Distância do pivô ao pino, medida ao longo da alavanca (para a frente). */
  hornOffset: z.number().nonnegative(),
  seatHeight: z.number().positive(),
  pressSeatZ: z.number(),
  backrestHeight: z.number().positive(),
  /** Inclinação do encosto do supino para trás (rad). */
  backrestTilt: z.number(),
  rowStation: z.boolean(),
  /** Pinos de armazenamento de anilhas na base (0, 2 ou 4). */
  storageHorns: z.union([z.literal(0), z.literal(2), z.literal(4)]),
  /** Giro das alavancas do repouso até o fim do movimento (rad). */
  swing: z.number(),
});
export type PlateLoadedLeverParams = z.infer<typeof PlateLoadedLeverParamsSchema>;

/**
 * Folga vertical entre o eixo da ponta traseira e o canto superior do tubo
 * inclinado (o tubo termina rente ao ponto, então só conta a meia seção).
 */
function leverEndOverhang(tube: number, dy: number, dz: number): number {
  const ang = Math.atan2(Math.abs(dy), Math.abs(dz));
  return (tube / 2) * Math.cos(ang);
}

export const plateLoadedLever: FamilyDefinition<PlateLoadedLeverParams> = {
  id: 'plate-loaded-lever',
  label: 'Peso livre articulado (alavanca)',
  paramsSchema: PlateLoadedLeverParamsSchema,

  defaults(d, spec) {
    const mech = spec.params.mechanism;
    const ex = typeof mech === 'string' && mech in EXERCISES ? EXERCISES[mech as ExerciseId] : undefined;
    const pivotHeight = 0.86 * d.height;
    const leverTube = 0.08;
    const front: [number, number] = [-0.3 * d.height + 0.08, 0.47 * d.length];
    const rearDz = -0.23 * d.length;
    // Ponta traseira no alto: o topo do tubo inclinado encosta em A. A folga
    // depende da inclinação, que depende da altura da ponta: ponto fixo, converge em poucas voltas.
    let rearDy = d.height - pivotHeight;
    for (let i = 0; i < 6; i++) {
      rearDy =
        d.height - pivotHeight - leverEndOverhang(leverTube, rearDy - front[0], rearDz - front[1]);
    }
    const hornLength = 0.175;
    return {
      mechanism: 'press-row',
      swingScale: 1,
      tube: 0.08,
      frameX: Math.max(0.25, d.width / 2 - 0.325),
      pivotHeight,
      pivotZ: -0.055 * d.length,
      leverTube,
      leverFront: front,
      leverRear: [rearDy, rearDz],
      hornLength,
      hornOffset: 0.3,
      seatHeight: ex?.seatHeight ?? 0.45,
      pressSeatZ: (ex?.seatAt ?? 0.25) * d.length,
      backrestHeight: 0.8,
      backrestTilt: ex?.backTilt ?? 0.38,
      rowStation: true,
      storageHorns: 4,
      swing: 0.45,
    };
  },

  build({ dims, params: p, kit }) {
    if (p.mechanism !== 'press-row') {
      return buildMachine(dims, kit, {
        exercise: p.mechanism,
        resistance: 'plates',
        stacks: 1,
        tube: p.tube,
        seatHeight: p.seatHeight,
        seatZ: p.pressSeatZ,
        backTilt: p.backrestTilt,
        stackPlates: 0,
        stackTravel: 0,
        swingScale: p.swingScale,
      });
    }
    const root = new THREE.Group();
    root.name = 'equipment';
    const t = p.tube;
    const y0 = t * 0.4;
    const railH = t * 0.8;
    const zMax = dims.length / 2;
    const fx = p.frameX;

    // Base: duas longarinas no comprimento todo, travessas e sapatas.
    const base = new THREE.Group();
    base.name = 'base';
    for (const s of [-1, 1]) {
      base.add(beam(kit, [s * fx, y0, -zMax], [s * fx, y0, zMax], [t, railH]));
      base.add(rubberFoot(kit, s * fx, -zMax + 0.05, [0.12, 0.1]));
      base.add(rubberFoot(kit, s * fx, zMax - 0.05, [0.12, 0.1]));
    }
    for (const zc of [-zMax + 0.15, zMax - 0.15, p.pivotZ]) {
      base.add(beam(kit, [-fx, y0, zc], [fx, y0, zc], [t, railH]));
    }
    // Longarina central: sustenta assentos e apoio de peito.
    base.add(beam(kit, [0, y0, -zMax + 0.15], [0, y0, zMax - 0.15], [t, railH]));
    root.add(base);

    // Quadros laterais em "A" + mancais do eixo.
    const frame = new THREE.Group();
    frame.name = 'frame';
    const topY = p.pivotHeight - 0.07;
    for (const s of [-1, 1]) {
      const x = s * fx;
      // As pernas nascem em cima da longarina: tubo inclinado começando em y = 0 furaria o piso.
      frame.add(beam(kit, [x, railH, 0.22 * dims.length], [x, topY, p.pivotZ + 0.08], t));
      frame.add(beam(kit, [x, railH, -0.27 * dims.length], [x, topY, p.pivotZ - 0.08], t));
      frame.add(beam(kit, [x, 0.95, 0.12 * dims.length], [x, 0.95, -0.17 * dims.length], t * 0.8));
      frame.add(
        box(kit, [0.07, 0.18, 0.28], [x, p.pivotHeight - 0.03, p.pivotZ], {
          name: `bearing_${s < 0 ? 'left' : 'right'}`,
        })
      );
    }
    frame.add(beam(kit, [-fx, topY, p.pivotZ], [fx, topY, p.pivotZ], t, { name: 'top_crossbar' }));
    root.add(frame);

    // Estação de supino (frente, usuário de frente para +Z).
    const seat = new THREE.Group();
    seat.name = 'seat';
    seat.add(beam(kit, [0, y0, p.pressSeatZ], [0, p.seatHeight - 0.04, p.pressSeatZ], 0.07));
    seat.add(
      upholstery(kit, [0.4, 0.08, 0.34], [0, p.seatHeight, p.pressSeatZ], { name: 'seat_pad' })
    );
    root.add(seat);

    const bh = p.backrestHeight;
    const bBottomZ = p.pressSeatZ - 0.2;
    const bc: Vec3 = [
      0,
      p.seatHeight + 0.07 + (bh / 2) * Math.cos(p.backrestTilt),
      bBottomZ - (bh / 2) * Math.sin(p.backrestTilt),
    ];
    const backrest = new THREE.Group();
    backrest.name = 'backrest';
    backrest.add(
      upholstery(kit, [0.38, bh, 0.08], bc, { tiltX: -p.backrestTilt, name: 'backrest_pad' })
    );
    const backSupportTop: Vec3 = [0, bc[1] + 0.1, bc[2] - 0.12];
    backrest.add(
      beam(kit, [0, y0, bBottomZ + 0.02], [0, p.seatHeight - 0.02, bBottomZ - 0.02], 0.06)
    );
    backrest.add(beam(kit, [0, p.seatHeight - 0.02, bBottomZ - 0.02], backSupportTop, 0.06));
    backrest.add(beam(kit, backSupportTop, [0, topY, p.pivotZ], 0.06));
    root.add(backrest);

    // Estação de remada (atrás, usuário de frente para −Z... apoiando o peito no apoio).
    if (p.rowStation) {
      const row = new THREE.Group();
      row.name = 'row_station';
      const rz = -dims.length / 2 + 0.28;
      row.add(beam(kit, [0, y0, rz], [0, 0.44, rz], 0.07));
      row.add(upholstery(kit, [0.34, 0.08, 0.3], [0, 0.48, rz], { name: 'row_seat_pad' }));
      const cz = rz + 0.3;
      row.add(beam(kit, [0, y0, cz], [0, 1.0, cz], 0.07));
      row.add(upholstery(kit, [0.3, 0.42, 0.09], [0, 1.18, cz - 0.05], { name: 'chest_pad' }));
      root.add(row);
    }

    // Pinos de armazenamento de anilhas na base.
    if (p.storageHorns > 0) {
      const zs =
        p.storageHorns === 4 ? [0.3 * dims.length, -0.3 * dims.length] : [0.3 * dims.length];
      zs.forEach((zh) => {
        for (const s of [-1, 1]) {
          root.add(beam(kit, [s * fx, y0, zh], [s * fx, 0.2, zh], 0.05));
          root.add(
            plateHorn(kit, [s * (fx + 0.025), 0.17, zh], [s, 0, 0], 0.18, 0.05, 'storage_horn')
          );
        }
      });
    }

    // Alavancas independentes.
    const articulations: Articulation[] = [];
    const armX = dims.width / 2 - p.leverTube / 2 - p.hornLength;
    const [fDy, fDz] = p.leverFront;
    const [rDy, rDz] = p.leverRear;
    const fwd = new THREE.Vector3(0, fDy, fDz).normalize();
    for (const side of [-1, 1] as const) {
      const name = side < 0 ? 'arm_left' : 'arm_right';
      const pivot: Vec3 = [side * armX, p.pivotHeight, p.pivotZ];
      // Eixo fixo do quadro até o mancal da alavanca.
      root.add(
        beam(
          kit,
          [side * fx, p.pivotHeight, p.pivotZ],
          [side * (armX - 0.04), p.pivotHeight, p.pivotZ],
          0.05,
          {
            round: true,
            material: 'chrome',
            name: `${name}_axle`,
          }
        )
      );
      const g = pivotArm(kit, name, pivot, { axis: 'x', diameter: 0.11, length: 0.1 });
      g.add(
        beam(kit, [0, rDy, rDz], [0, fDy, fDz], p.leverTube, {
          material: 'accent',
          name: `${name}_lever`,
        })
      );
      // Pegada do supino (ponta dianteira) e da remada (ponta traseira), voltadas para dentro.
      g.add(
        beam(kit, [0, fDy, fDz], [-side * 0.17, fDy - 0.03, fDz - 0.02], 0.035, {
          round: true,
          material: 'rubber',
          name: `${name}_press_grip`,
        })
      );
      g.add(
        beam(kit, [0, rDy, rDz], [-side * 0.15, rDy, rDz], 0.035, {
          round: true,
          material: 'rubber',
          name: `${name}_row_grip`,
        })
      );
      const hb = fwd.clone().multiplyScalar(p.hornOffset);
      g.add(
        plateHorn(
          kit,
          [side * (p.leverTube / 2), hb.y, hb.z],
          [side, 0, 0],
          p.hornLength,
          0.05,
          `${name}_horn`
        )
      );
      root.add(g);
      articulations.push({
        node: name,
        type: 'revolute',
        // Giro em −X: a ponta dianteira sobe e avança (empurrar do supino).
        axis: [-1, 0, 0],
        pivot,
        range: [0, p.swing],
        driver: 'phase',
      });
    }

    return { root, articulations };
  },
};

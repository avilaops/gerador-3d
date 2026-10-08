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
import { beam, bentTube, box, plateHorn } from '../parts/primitives';
import { Rig } from '../parts/rig';
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
      backrestHeight: Math.min(1.0, 0.47 * d.height),
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
    const rig = new Rig(kit, root);
    const t = p.tube;
    const railH = t * 0.8;
    const y0 = railH / 2;
    const L = dims.length;
    const zMax = L / 2;
    const fx = p.frameX;
    const pz = p.pivotZ;

    // Base: duas longarinas no comprimento todo, travessas e sapatas chatas.
    const base = rig.group('base');
    for (const s of [-1, 1] as const) {
      rig.tube(base, [s * fx, y0, -zMax], [s * fx, y0, zMax], [t, railH]);
      for (const zf of [-zMax + 0.08, zMax - 0.08])
        rig.box(base, [0.18, 0.012, 0.11], [s * fx, 0.006, zf], 'rubber', 'foot');
    }
    for (const zc of [-zMax + 0.2, zMax - 0.3, pz])
      rig.tube(base, [-fx, y0, zc], [fx, y0, zc], [t, railH]);
    rig.tube(base, [0, y0, -zMax + 0.2], [0, y0, zMax - 0.3], [t, railH]);

    // Quadros laterais em ampulheta: duas pernas de chapa que se fecham na cintura
    // e voltam a abrir até a viga do alto. Os mancais sobem da viga até o eixo.
    const frame = rig.group('frame');
    const topY = p.pivotHeight - 0.28;
    const waistY = 0.5 * topY;
    const plate: [number, number] = [0.05, 0.11];
    const frontLeg = (x: number): Vec3[] => [
      [x, railH, 0.24 * L],
      [x, waistY, pz + 0.11],
      [x, topY, pz + 0.24],
    ];
    const rearLeg = (x: number): Vec3[] => [
      [x, railH, -0.3 * L],
      [x, waistY, pz - 0.11],
      [x, topY, pz - 0.24],
    ];
    /** Ponto de uma perna (polilinha) numa altura dada. */
    const at = (leg: Vec3[], y: number): Vec3 => {
      for (let k = 0; k < leg.length - 1; k++) {
        const [a, b] = [leg[k], leg[k + 1]];
        if (y <= b[1] || k === leg.length - 2) {
          const u = (y - a[1]) / (b[1] - a[1]);
          return [a[0], y, a[2] + (b[2] - a[2]) * u];
        }
      }
      return leg[0];
    };
    for (const s of [-1, 1] as const) {
      const x = s * fx;
      const side = s < 0 ? 'left' : 'right';
      rig.path(frame, frontLeg(x), plate, 'frame', `leg_front_${side}`, 0.3);
      rig.path(frame, rearLeg(x), plate, 'frame', `leg_rear_${side}`, 0.3);
      rig.tube(frame, [x, waistY, pz - 0.11], [x, waistY, pz + 0.11], [0.05, 0.1]);
      rig.tube(frame, [x, topY, pz - 0.29], [x, topY, pz + 0.29], plate);
      const bh = p.pivotHeight - topY + 0.09;
      for (const dz of [-0.07, 0.07])
        rig.box(frame, [0.05, bh, 0.016], [x, topY + bh / 2, pz + dz], 'frame', `bearing_${side}`);
    }
    rig.tube(frame, [-fx, topY, pz + 0.24], [fx, topY, pz + 0.24], [0.06, 0.1], 'frame', 'top_crossbar');
    rig.tube(frame, [-fx, topY, pz - 0.24], [fx, topY, pz - 0.24], [0.05, 0.08]);

    // Estação de supino (frente): assento comprido e encosto alto e estreito, inclinado para trás.
    const sz = p.pressSeatZ;
    const seat = rig.group('seat');
    rig.tube(seat, [0, y0, sz], [0, p.seatHeight - 0.05, sz], 0.07, 'frame', 'seat_post');
    rig.box(seat, [0.014, 0.3, 0.05], [0.042, p.seatHeight - 0.24, sz], 'plate', 'seat_adjuster');
    rig.pad(seat, [0.36, 0.07, 0.46], [0, p.seatHeight, sz + 0.07], -0.06, 'seat_pad');

    const bh = p.backrestHeight;
    const bBottomZ = sz - 0.17;
    const bc: Vec3 = [
      0,
      p.seatHeight + 0.06 + (bh / 2) * Math.cos(p.backrestTilt),
      bBottomZ - (bh / 2) * Math.sin(p.backrestTilt),
    ];
    const backrest = rig.group('backrest');
    rig.pad(backrest, [0.3, bh, 0.075], bc, -p.backrestTilt, 'backrest_pad');
    const behind = (h: number): Vec3 => [
      0,
      p.seatHeight + 0.06 + h * Math.cos(p.backrestTilt) - 0.07 * Math.sin(p.backrestTilt),
      bBottomZ - h * Math.sin(p.backrestTilt) - 0.07 * Math.cos(p.backrestTilt),
    ];
    rig.path(
      backrest,
      [[0, y0, bBottomZ - 0.04], behind(0.12), behind(bh * 0.86)],
      0.06,
      'frame',
      'backrest_support',
      0.12
    );
    rig.tube(backrest, behind(bh * 0.86), [0, topY, pz + 0.24], 0.05);

    // Estação de remada (atrás): arco de tubo com apoio de peito e assento.
    if (p.rowStation) {
      const row = rig.group('row_station');
      const rz = -zMax + 0.1;
      const hoopY = Math.min(1.24, 0.62 * dims.height);
      row.add(
        bentTube(
          kit,
          [
            [-0.25, y0, rz],
            [-0.25, hoopY, rz],
            [0.25, hoopY, rz],
            [0.25, y0, rz],
          ],
          0.055,
          { round: true, radius: 0.15, name: 'row_hoop' }
        )
      );
      rig.tube(row, [-0.25, hoopY - 0.26, rz], [0.25, hoopY - 0.26, rz], 0.045);
      rig.pad(row, [0.26, 0.4, 0.075], [0, hoopY - 0.26, rz + 0.07], 0, 'chest_pad');
      const rsz = rz + 0.42;
      rig.tube(row, [0, y0, rsz], [0, 0.46, rsz], 0.07);
      rig.box(row, [0.014, 0.26, 0.05], [0.042, 0.3, rsz], 'plate', 'row_seat_adjuster');
      rig.pad(row, [0.32, 0.07, 0.3], [0, 0.5, rsz], 0, 'row_seat_pad');
    }

    // Pinos de armazenamento de anilhas, nas pernas do quadro.
    if (p.storageHorns > 0) {
      for (const s of [-1, 1] as const) {
        const x = s * fx;
        const spots: Vec3[] = [at(frontLeg(x), 0.3)];
        if (p.storageHorns === 4) spots.push(at(rearLeg(x), 0.3), at(rearLeg(x), waistY + 0.22));
        for (const q of spots)
          rig.horn(root, [q[0] + s * 0.025, q[1], q[2]], [s, 0, 0], 0.18, 'storage_horn');
      }
    }

    // Alavancas independentes.
    const articulations: Articulation[] = [];
    const armX = dims.width / 2 - p.leverTube / 2 - p.hornLength;
    const [fDy, fDz] = p.leverFront;
    const [rDy, rDz] = p.leverRear;
    const fwd = new THREE.Vector3(0, fDy, fDz).normalize();
    for (const side of [-1, 1] as const) {
      const name = side < 0 ? 'arm_left' : 'arm_right';
      const pivot: Vec3 = [side * armX, p.pivotHeight, pz];
      rig.rod(root, [side * fx, p.pivotHeight, pz], [side * (armX - 0.04), p.pivotHeight, pz], 0.05, 'chrome', `${name}_axle`);
      const g = pivotArm(kit, name, pivot, { axis: 'x', diameter: 0.11, length: 0.1 });
      g.add(
        beam(kit, [0, rDy, rDz], [0, fDy, fDz], [p.leverTube * 0.7, p.leverTube * 1.1], {
          material: 'accent',
          name: `${name}_lever`,
        })
      );
      // Pegada do supino: alça que desce da ponta dianteira e vira para dentro.
      g.add(
        bentTube(
          kit,
          [
            [0, fDy - 0.03, fDz - 0.03],
            [-side * 0.03, fDy - 0.17, fDz + 0.0],
            [-side * 0.19, fDy - 0.19, fDz - 0.05],
          ],
          0.034,
          { round: true, material: 'rubber', radius: 0.07, name: `${name}_press_grip` }
        )
      );
      // Pegada da remada: alça na ponta traseira, voltada para dentro.
      g.add(
        bentTube(
          kit,
          [
            [0, rDy - 0.05, rDz + 0.05],
            [-side * 0.07, rDy - 0.14, rDz + 0.07],
            [-side * 0.22, rDy - 0.14, rDz + 0.12],
          ],
          0.034,
          { round: true, material: 'rubber', radius: 0.07, name: `${name}_row_grip` }
        )
      );
      const hb = fwd.clone().multiplyScalar(p.hornOffset);
      g.add(
        box(kit, [p.leverTube * 0.75 + 0.02, 0.13, 0.1], [0, hb.y - 0.09, hb.z], {
          material: 'rubber',
          name: `${name}_horn_bracket`,
        })
      );
      g.add(
        plateHorn(
          kit,
          [side * (p.leverTube / 2), hb.y - 0.1, hb.z],
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

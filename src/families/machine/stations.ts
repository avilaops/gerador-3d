/**
 * Estações: o apoio fixo do corpo (assento, encosto, apoio de peito, mesa...).
 *
 * Tudo no referencial do usuário: origem no piso sob o assento, +Z à frente de
 * quem usa, Y para cima. Quem monta a máquina posiciona (e vira) esse grupo.
 */
import type * as THREE from 'three';
import type { Rig } from '../../parts/rig';
import { poseAnchor, type PoseData } from '../../parts/pose';

export const STATION_KINDS = [
  'seat-back',
  'seat-chest',
  'seat-thigh',
  'seat-only',
  'recline',
  'prone',
  'supine',
  'preacher',
  'standing',
  'kneel',
  'kneel-lean',
  'hyper',
  'table',
  'none',
] as const;
export type StationKind = (typeof STATION_KINDS)[number];

export interface StationOptions {
  kind: StationKind;
  /** Altura do assento (ou do tampo, nas mesas). */
  hs: number;
  /** Inclinação do encosto para trás (rad). */
  tilt: number;
  /** Lado do tubo da estrutura. */
  t: number;
  /** Altura máxima disponível (o encosto encurta para caber). */
  maxHeight: number;
  /** Comprimento do encosto, quando é ele que dá a altura da máquina. */
  backHeight?: number;
}

export function buildStation(rig: Rig, g: THREE.Group, o: StationOptions): void {
  const { hs, t, tilt } = o;
  const y0 = t / 2;
  const post = 0.07;

  const seat = (z = 0.02, w = 0.42, d = 0.4) => {
    const s = rig.group('seat', g);
    rig.tube(s, [0, y0, z], [0, hs - 0.04, z], post, 'frame', 'seat_post');
    // Regulagem de altura: régua furada e pino.
    rig.box(s, [0.012, Math.min(0.26, hs - 0.16), 0.045], [post / 2 + 0.006, hs - 0.2, z], 'plate', 'seat_adjuster');
    rig.rod(s, [post / 2, hs - 0.14, z], [post / 2 + 0.08, hs - 0.17, z], 0.014, 'chrome', 'seat_pin');
    rig.pad(s, [w, 0.085, d], [0, hs, z], 0, 'seat_pad');
  };

  const backrest = (wanted = 0.72) => {
    const h = Math.max(0.3, Math.min(o.backHeight ?? wanted, (o.maxHeight - hs - 0.1) / Math.cos(tilt)));
    const b = rig.group('backrest', g);
    const bottomZ = -0.2;
    const cy = hs + 0.07 + (h / 2) * Math.cos(tilt);
    const cz = bottomZ - (h / 2) * Math.sin(tilt);
    rig.pad(b, [0.34, h, 0.085], [0, cy, cz], -tilt, 'backrest_pad');
    rig.path(
      b,
      [
        [0, y0, bottomZ - 0.06],
        [0, hs - 0.02, bottomZ - 0.07],
        [0, cy + 0.12, cz - 0.07 - 0.12 * Math.sin(tilt)],
      ],
      0.06,
      'frame',
      'backrest_support'
    );
  };

  /** Marca onde fica o quadril de quem usa, para a pessoa do visualizador. */
  const pose = (z: number, data: Partial<PoseData> = {}, y = hs + 0.13) =>
    g.add(poseAnchor([0, y, z], { kind: 'seated', tilt: 0, feet: 'floor', ...data }));

  switch (o.kind) {
    case 'seat-back':
      seat();
      backrest();
      pose(-0.05, { tilt });
      break;
    case 'recline': {
      seat(0.02, 0.44, 0.44);
      backrest(0.6);
      pose(-0.04, { tilt, feet: 'roller' });
      // Quadro inclinado que sobe da frente do piso até debaixo do assento.
      const under = rig.group('seat_frame', g);
      for (const s of [-1, 1] as const)
        rig.path(under, [[s * 0.2, y0, 0.36], [s * 0.2, hs - 0.07, 0.16], [s * 0.2, hs - 0.07, -0.2]], [0.05, 0.08], 'frame', 'seat_rail', 0.12);
      rig.tube(under, [-0.2, hs - 0.07, -0.18], [0.2, hs - 0.07, -0.18], 0.05);
      const h = rig.group('side_handles', g);
      for (const s of [-1, 1] as const) {
        rig.tube(h, [s * 0.2, hs - 0.06, -0.05], [s * 0.3, hs + 0.04, 0.0], 0.04);
        rig.grip(h, [s * 0.3, hs + 0.04, -0.06], [s * 0.3, hs + 0.04, 0.08]);
      }
      break;
    }
    case 'seat-chest': {
      seat(0, 0.38, 0.34);
      pose(-0.02, { tilt: -0.14 });
      const c = rig.group('chest_pad', g);
      rig.tube(c, [0, y0, 0.33], [0, hs + 0.42, 0.33], post);
      rig.pad(c, [0.3, 0.42, 0.09], [0, hs + 0.44, 0.27], 0, 'chest_pad_cushion');
      break;
    }
    case 'seat-thigh': {
      seat(0, 0.4, 0.36);
      pose(-0.02);
      const c = rig.group('thigh_pads', g);
      rig.tube(c, [0, y0, 0.38], [0, hs + 0.2, 0.32], post);
      rig.roller(c, [-0.3, hs + 0.2, 0.3], [0.3, hs + 0.2, 0.3], 0.12, 'thigh_roller');
      break;
    }
    case 'seat-only':
      seat(0, 0.4, 0.36);
      pose(-0.02);
      break;
    case 'prone': {
      const b = rig.group('bench', g);
      rig.pad(b, [0.36, 0.09, 0.72], [0, hs + 0.02, 0.2], -0.12, 'bench_pad_front');
      rig.pad(b, [0.36, 0.09, 0.62], [0, hs - 0.02, -0.42], 0.14, 'bench_pad_rear');
      rig.tube(b, [0, hs - 0.1, 0.5], [0, hs - 0.1, -0.7], 0.06);
      rig.tube(b, [0, y0, 0.35], [0, hs - 0.1, 0.35], post);
      rig.tube(b, [0, y0, -0.45], [0, hs - 0.1, -0.45], post);
      // Quadro lateral inclinado, da frente do piso até debaixo da mesa.
      for (const s of [-1, 1] as const)
        rig.path(b, [[s * 0.2, y0, 0.62], [s * 0.2, hs - 0.1, 0.34], [s * 0.2, hs - 0.1, -0.6]], [0.05, 0.08], 'frame', 'bench_rail', 0.12);
      rig.tube(b, [-0.2, hs - 0.1, -0.58], [0.2, hs - 0.1, -0.58], 0.05);
      rig.tube(b, [0, hs - 0.1, 0.5], [0, hs - 0.2, 0.6], 0.04);
      rig.grip(b, [-0.26, hs - 0.2, 0.6], [0.26, hs - 0.2, 0.6]);
      break;
    }
    case 'supine': {
      const b = rig.group('bench', g);
      rig.pad(b, [0.32, 0.09, 1.2], [0, hs, -0.25], 0, 'bench_pad');
      rig.tube(b, [0, hs - 0.08, 0.3], [0, hs - 0.08, -0.8], 0.06);
      rig.tube(b, [0, y0, 0.15], [0, hs - 0.08, 0.15], post);
      rig.tube(b, [0, y0, -0.65], [0, hs - 0.08, -0.65], post);
      break;
    }
    case 'preacher': {
      seat(-0.05, 0.38, 0.32);
      pose(-0.08, { tilt: -0.3 });
      const c = rig.group('arm_pad', g);
      rig.tube(c, [0, y0, 0.32], [0, hs + 0.22, 0.3], post);
      rig.pad(c, [0.56, 0.07, 0.42], [0, hs + 0.28, 0.27], 0.75, 'arm_pad_cushion');
      break;
    }
    case 'standing': {
      const p = rig.group('platform', g);
      pose(0, { kind: 'standing' }, t + 0.035 + 0.88);
      rig.box(p, [0.72, 0.035, 0.6], [0, t + 0.018, 0], 'plate', 'platform_plate');
      break;
    }
    case 'kneel-lean': {
      // Joelhos numa almofada baixa e o tronco inclinado para a frente sobre duas almofadas.
      const k = rig.group('knee_pad', g);
      rig.tube(k, [0, y0, 0], [0, hs - 0.05, 0], post);
      for (const s of [-1, 1] as const)
        rig.pad(k, [0.22, 0.1, 0.36], [s * 0.13, hs, 0], 0.1, 'knee_pad_cushion');
      const c = rig.group('chest_pad', g);
      const top = o.maxHeight - 0.02;
      const len = Math.min(0.56, Math.max(0.3, (top - hs - 0.16) / Math.cos(0.5)));
      const cy = hs + 0.16 + (len / 2) * Math.cos(0.5);
      const cz = 0.2 + (len / 2) * Math.sin(0.5);
      for (const s of [-1, 1] as const)
        rig.pad(c, [0.2, len, 0.09], [s * 0.12, cy, cz], 0.5, 'chest_pad_cushion');
      rig.path(c, [[0, y0, 0.52], [0, hs + 0.1, 0.34], [0, top, 0.2 + len * Math.sin(0.5) + 0.08]], post, 'frame', 'chest_pad_support', 0.14);
      rig.rod(c, [-0.3, top, 0.2 + len * Math.sin(0.5) + 0.08], [0.3, top, 0.2 + len * Math.sin(0.5) + 0.08], 0.036, 'rubber', 'handle_bar');
      break;
    }
    case 'kneel': {
      const k = rig.group('knee_pad', g);
      rig.tube(k, [0, y0, 0], [0, 0.26, 0], post);
      rig.pad(k, [0.56, 0.1, 0.4], [0, 0.31, 0], 0, 'knee_pad_cushion');
      rig.tube(k, [0, y0, -0.5], [0, 0.44, -0.5], post);
      rig.roller(k, [-0.3, 0.46, -0.5], [0.3, 0.46, -0.5], 0.12, 'ankle_roller');
      break;
    }
    case 'hyper': {
      const k = rig.group('hip_pad', g);
      rig.tube(k, [0, y0, 0.05], [0, hs - 0.07, 0.05], post);
      rig.pad(k, [0.52, 0.12, 0.4], [0, hs, 0.05], 0.35, 'hip_pad_cushion');
      rig.tube(k, [0, y0, -0.55], [0, 0.42, -0.6], post);
      rig.roller(k, [-0.28, 0.44, -0.62], [0.28, 0.44, -0.62], 0.12, 'ankle_roller');
      rig.box(k, [0.5, 0.02, 0.3], [0, 0.14, -0.5], 'plate', 'foot_plate').rotation.x = -0.5;
      break;
    }
    case 'table': {
      const b = rig.group('table', g);
      rig.pad(b, [0.56, 0.1, 0.9], [0, hs, 0.25], 0, 'table_pad');
      for (const s of [-1, 1] as const) {
        rig.tube(b, [s * 0.24, y0, 0.6], [s * 0.24, hs - 0.06, 0.6], post);
        rig.tube(b, [s * 0.24, y0, -0.1], [s * 0.24, hs - 0.06, -0.1], post);
        rig.tube(b, [s * 0.24, hs - 0.09, -0.1], [s * 0.24, hs - 0.09, 0.6], 0.06);
        rig.grip(b, [s * 0.2, hs - 0.18, 0.72], [s * 0.34, hs - 0.18, 0.72]);
      }
      break;
    }
    case 'none':
      break;
  }
}

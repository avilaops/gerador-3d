/**
 * Família `bench`: bancos (reto, inclinado, declinado, regulável), bancos de
 * supino com suporte de barra, banco Scott e banco de extensão lombar.
 *
 * Cabeça em −Z, pés em +Z. A base ocupa C × L; o ponto mais alto de cada
 * variante (estofado, rolos ou suporte de barra) chega em A.
 */
import * as THREE from 'three';
import { z } from 'zod';
import type { FamilyDefinition } from './types';
import { Rig } from '../parts/rig';
import type { Vec3 } from '../spec/schema';

export const BENCH_VARIANTS = [
  'flat',
  'incline',
  'decline',
  'olympic-flat',
  'olympic-incline',
  'olympic-decline',
  'preacher',
  'hyper',
] as const;

export const BenchParamsSchema = z.object({
  variant: z.enum(BENCH_VARIANTS),
  tube: z.number().positive(),
  padWidth: z.number().positive(),
  /** Ângulo do encosto a partir da horizontal (rad), nas variantes inclinadas. */
  backAngle: z.number(),
  seatHeight: z.number().positive(),
  /** Rodinhas e alça de transporte. */
  wheels: z.boolean(),
  /** Banco reto sobre dois cavaletes em A, sem base no piso. */
  aLegs: z.boolean(),
  /** Banco regulável: assento e encosto separados, com a cremalheira de regulagem. */
  adjustable: z.boolean(),
});
export type BenchParams = z.infer<typeof BenchParamsSchema>;

export const bench: FamilyDefinition<BenchParams> = {
  id: 'bench',
  label: 'Banco',
  paramsSchema: BenchParamsSchema,

  defaults(d) {
    return {
      variant: 'flat',
      tube: 0.06,
      padWidth: Math.min(0.3, d.width - 0.06),
      backAngle: 0.6,
      seatHeight: Math.min(0.44, d.height - 0.05),
      wheels: true,
      aLegs: false,
      adjustable: false,
    };
  },

  build({ dims, params: p, kit }) {
    const root = new THREE.Group();
    root.name = 'equipment';
    const rig = new Rig(kit, root);
    const { length: L, width: W, height: H } = dims;
    const t = p.tube;
    const y0 = t / 2;
    const zR = -L / 2;
    const zF = L / 2;
    const pw = p.padWidth;
    const olympic = p.variant.startsWith('olympic');

    const base = rig.group('base');
    const cavaletes = p.variant === 'flat' && p.aLegs;
    if (cavaletes) {
      // Dois cavaletes em A: as pernas abrem na largura toda, sem tubo no piso.
      const yTop = H - 0.09;
      for (const zc of [zR + 0.16, zF - 0.16]) {
        const lean = zc < 0 ? -1 : 1;
        for (const s of [-1, 1] as const) {
          rig.tube(base, [s * 0.07, yTop, zc - lean * 0.1], [s * (W / 2 - 0.035), 0.01, zc + lean * 0.08], [0.05, 0.09]);
          rig.box(base, [0.1, 0.012, 0.13], [s * (W / 2 - 0.05), 0.006, zc + lean * 0.08], 'rubber', 'foot');
        }
        rig.tube(base, [-0.09, yTop, zc - lean * 0.1], [0.09, yTop, zc - lean * 0.1], [0.06, 0.05]);
      }
      rig.tube(base, [0, yTop, zR + 0.26], [0, yTop, zF - 0.26], [0.07, 0.05], 'frame', 'bench_spine');
    } else {
      rig.tube(base, [0, y0, zR + t / 2], [0, y0, zF - t / 2], t);
      rig.tube(base, [-W / 2, y0, zR + t / 2], [W / 2, y0, zR + t / 2], t);
      rig.tube(base, [-W / 2, y0, zF - t / 2], [W / 2, y0, zF - t / 2], t);
      for (const s of [-1, 1] as const) {
        rig.foot(base, s * (W / 2 - 0.05), zR + 0.05, [0.08, 0.08]);
        rig.foot(base, s * (W / 2 - 0.05), zF - 0.05, [0.08, 0.08]);
      }
    }
    if (p.wheels && !olympic && !cavaletes) {
      for (const s of [-1, 1] as const)
        rig.rod(base, [s * (W / 2 - 0.09), 0.04, zR + 0.02], [s * (W / 2 - 0.03), 0.04, zR + 0.02], 0.075, 'rubber', 'wheel');
      rig.grip(base, [-0.08, 0.16, zF - 0.02], [0.08, 0.16, zF - 0.02], 'carry_handle');
      rig.tube(base, [0, y0, zF - t / 2], [0, 0.16, zF - 0.02], 0.04);
    }

    const post = (z: number, y: number) => rig.tube(base, [0, y0, z], [0, y, z], t);

    /** Encosto inclinado: nasce em (y, z) e sobe para trás (−Z) até a altura `top`. */
    const inclinedBack = (g: THREE.Group, y: number, zb: number, top: number, angle: number) => {
      const a = Math.min(Math.max(angle, 0.12), 1.45);
      const len = Math.max(0.3, Math.min((top - y - 0.07 * Math.cos(a)) / Math.sin(a), (zb - zR) / Math.cos(a)));
      const c: Vec3 = [0, y + (len / 2) * Math.sin(a), zb - (len / 2) * Math.cos(a)];
      rig.pad(g, [pw, len, 0.07], c, -(Math.PI / 2 - a), 'backrest_pad');
      rig.tube(g, [0, y0, c[2] + 0.05], [0, c[1] - 0.06, c[2] - 0.02], t, 'frame', 'backrest_support');
      rig.tube(g, [0, y - 0.07, zb], [0, c[1] - 0.06, c[2] - 0.02], 0.05);
      return len;
    };

    switch (p.variant) {
      case 'flat': {
        const seat = rig.group('seat');
        if (p.adjustable) {
          const corte = zF - 0.34 * L;
          rig.pad(seat, [pw, 0.075, zF - 0.02 - corte - 0.015], [0, H - 0.0375, (zF - 0.02 + corte + 0.015) / 2], 0, 'seat_pad');
          rig.pad(rig.group('backrest'), [pw, 0.075, corte - 0.015 - (zR + 0.02)], [0, H - 0.0375, (corte - 0.015 + zR + 0.02) / 2], 0, 'backrest_pad');
          // Cremalheira e escora da regulagem do encosto.
          rig.tube(seat, [0.05, H - 0.14, corte - 0.08], [0.05, y0 + 0.05, zR + 0.3], [0.012, 0.06], 'plate', 'adjust_rack');
          rig.rod(seat, [-0.05, H - 0.13, zR + 0.45], [-0.05, y0 + 0.04, zR + 0.62], 0.03, 'chrome', 'adjust_strut');
        } else
          rig.pad(seat, [pw, 0.075, cavaletes ? L : L - 0.04], [0, H - 0.0375, 0], 0, 'bench_pad');
        if (!cavaletes) rig.path(
          seat,
          [
            [0, y0, zR + t / 2],
            [0, H - 0.1, zR + 0.2],
            [0, H - 0.1, zF - 0.2],
            [0, y0, zF - t / 2],
          ],
          t,
          'frame',
          'bench_frame',
          0.1
        );
        break;
      }
      case 'incline': {
        const hs = Math.min(p.seatHeight, H - 0.3);
        const seat = rig.group('seat');
        const seatLen = Math.min(0.36, 0.35 * L);
        const zs = zF - 0.12 - seatLen / 2;
        rig.pad(seat, [pw, 0.075, seatLen], [0, hs, zs], 0.1, 'seat_pad');
        post(zs, hs - 0.04);
        const back = rig.group('backrest');
        inclinedBack(back, hs + 0.02, zs - seatLen / 2 - 0.02, H, p.backAngle);
        const foot = rig.group('foot_rest');
        // Tubo que sobe em curva da ponta da base, com a barra de apoio dos pés.
        rig.path(
          foot,
          [
            [0, y0, zF - 0.3],
            [0, 0.12, zF - 0.1],
            [0, 0.22, zF - 0.02],
          ],
          0.05,
          'frame',
          'foot_rest_arm',
          0.12
        );
        rig.rod(foot, [-0.22, 0.22, zF - 0.02], [0.22, 0.22, zF - 0.02], 0.036, 'rubber', 'foot_rest_bar');
        break;
      }
      case 'decline': {
        // Estofado desce da frente (quadril) para trás (cabeça); rolos de perna no alto, na frente.
        const yHigh = Math.min(0.62, H - 0.3);
        const yLow = Math.min(0.36, yHigh - 0.1);
        const zHigh = zF - 0.42;
        const zLow = zR + 0.06;
        const len = Math.hypot(zHigh - zLow, yHigh - yLow);
        const a = Math.atan2(yHigh - yLow, zHigh - zLow);
        // Duas almofadas na mesma rampa: o assento curto no alto, junto aos rolos, e a longa das costas.
        const seat = rig.group('seat');
        const seatLen = Math.min(0.36, 0.3 * len);
        const at = (d: number): Vec3 => [0, yHigh - d * Math.sin(a), zHigh - d * Math.cos(a)];
        rig.pad(seat, [pw, 0.075, seatLen], at(seatLen / 2), -a, 'seat_pad');
        const backLen = len - seatLen - 0.03;
        rig.pad(seat, [pw, 0.075, backLen], at(seatLen + 0.03 + backLen / 2), -a, 'bench_pad');
        rig.tube(seat, at(0.08).map((v, i) => (i === 1 ? v - 0.07 : v)) as Vec3, at(len - 0.1).map((v, i) => (i === 1 ? v - 0.07 : v)) as Vec3, [0.05, 0.07], 'frame', 'bench_spine');
        post(zLow + 0.2, yLow + 0.02);
        post(zHigh - 0.15, yHigh - 0.08);
        const legs = rig.group('leg_rollers');
        rig.tube(legs, [0, y0, zF - 0.1], [0, H - 0.06, zF - 0.1], t);
        rig.roller(legs, [-0.26, H - 0.06, zF - 0.1], [0.26, H - 0.06, zF - 0.1], 0.12, 'knee_roller');
        rig.roller(legs, [-0.26, H - 0.36, zF - 0.16], [0.26, H - 0.36, zF - 0.16], 0.11, 'ankle_roller');
        rig.tube(legs, [0, H - 0.36, zF - 0.1], [0, H - 0.36, zF - 0.16], 0.04);
        break;
      }
      case 'olympic-flat':
      case 'olympic-incline':
      case 'olympic-decline': {
        const hs = Math.min(p.seatHeight, 0.46);
        const ux = W / 2 - t / 2;
        const zu = p.variant === 'olympic-incline' ? zR + 0.32 : p.variant === 'olympic-decline' ? zR + 0.3 : zR + 0.34;
        const rack = rig.group('rack');
        for (const s of [-1, 1] as const) {
          rig.tube(rack, [s * ux, y0, zR + t / 2], [s * ux, y0, zu + 0.5], t);
          rig.tube(rack, [s * ux, 0, zu], [s * ux, H, zu], t, 'frame', `upright_${s < 0 ? 'left' : 'right'}`);
          rig.tube(rack, [s * ux, 0.5 * H, zu], [s * ux, y0, zu + 0.42], 0.05);
          for (const y of [H - 0.18, 0.62 * H]) {
            rig.tube(rack, [s * ux, y, zu + t / 2], [s * ux, y, zu + 0.11], 0.045, 'chrome', 'hook');
            rig.tube(rack, [s * ux, y, zu + 0.11], [s * ux, y + 0.06, zu + 0.11], 0.03, 'chrome');
          }
          rig.foot(rack, s * ux, zu + 0.45, [0.08, 0.08]);
        }
        rig.tube(rack, [-ux, 0.34 * H, zu], [ux, 0.34 * H, zu], t, 'frame', 'crossbar');
        rig.box(rack, [0.5, 0.02, 0.26], [0, 0.26, zR + 0.15], 'plate', 'spotter_step');
        rig.tube(rack, [-0.2, y0, zR + 0.15], [-0.2, 0.25, zR + 0.15], 0.05);
        rig.tube(rack, [0.2, y0, zR + 0.15], [0.2, 0.25, zR + 0.15], 0.05);

        const seat = rig.group('seat');
        if (p.variant === 'olympic-flat') {
          const len = zF - 0.04 - (zu - 0.1);
          rig.pad(seat, [pw, 0.075, len], [0, hs, zu - 0.1 + len / 2], 0, 'bench_pad');
          post(zu + 0.1, hs - 0.04);
          post(zF - 0.25, hs - 0.04);
        } else if (p.variant === 'olympic-incline') {
          const zs = zF - 0.32;
          rig.pad(seat, [pw, 0.075, 0.34], [0, hs, zs], 0.12, 'seat_pad');
          post(zs, hs - 0.04);
          inclinedBack(rig.group('backrest'), hs + 0.02, zs - 0.19, Math.min(H - 0.2, hs + 0.78), p.backAngle);
        } else {
          const zHigh = zF - 0.4;
          const zLow = zu - 0.12;
          const yHigh = hs + 0.12;
          const yLow = hs - 0.1;
          const len = Math.hypot(zHigh - zLow, yHigh - yLow);
          rig.pad(seat, [pw, 0.075, len], [0, (yHigh + yLow) / 2, (zHigh + zLow) / 2], -Math.atan2(yHigh - yLow, zHigh - zLow), 'bench_pad');
          post(zLow + 0.25, yLow);
          post(zHigh - 0.1, yHigh - 0.08);
          const legs = rig.group('leg_rollers');
          rig.tube(legs, [0, y0, zF - 0.1], [0, yHigh + 0.3, zF - 0.1], t);
          rig.roller(legs, [-0.26, yHigh + 0.3, zF - 0.1], [0.26, yHigh + 0.3, zF - 0.1], 0.12, 'knee_roller');
          rig.roller(legs, [-0.26, yHigh + 0.02, zF - 0.14], [0.26, yHigh + 0.02, zF - 0.14], 0.11, 'ankle_roller');
        }
        break;
      }
      case 'preacher': {
        const hs = Math.min(0.5, H - 0.52);
        const seat = rig.group('seat');
        const zs = zR + 0.22;
        rig.pad(seat, [0.34, 0.08, 0.3], [0, hs, zs], 0, 'seat_pad');
        post(zs, hs - 0.04);
        const padG = rig.group('arm_pad');
        const zp = zs + 0.42;
        // O apoio de braço é o ponto mais alto; o descanso da barra fica baixo, na frente.
        const yp = H - 0.16;
        const yr = Math.min(0.72 * H, yp - 0.12);
        rig.pad(padG, [Math.min(0.6, W - 0.16), 0.075, 0.44], [0, yp, zp], 0.85, 'arm_pad_cushion');
        rig.tube(padG, [0, y0, zp + 0.05], [0, yp - 0.05, zp - 0.02], t);
        const restG = rig.group('bar_rest');
        const xr = Math.min(0.36, W / 2 - 0.08);
        for (const s of [-1, 1] as const) {
          rig.tube(restG, [s * xr, y0, zF - 0.12], [s * xr, yr, zF - 0.12], 0.05);
          rig.tube(restG, [s * xr, yr - 0.025, zF - 0.12], [s * xr, yr - 0.025, zF - 0.02], 0.04, 'chrome', 'hook');
          rig.tube(restG, [s * xr, yr - 0.025, zF - 0.02], [s * xr, yr + 0.05, zF - 0.02], 0.03, 'chrome');
        }
        rig.tube(restG, [-xr, y0, zF - 0.12], [xr, y0, zF - 0.12], t);
        break;
      }
      case 'hyper': {
        // Coluna dupla atrás, com as duas almofadas de quadril a 45° no alto e as pegadas;
        // na frente, a plataforma inclinada e os apoios de tornozelo.
        const yPad = H - 0.22;
        const zPad = 0.2 * L;
        const hip = rig.group('hip_pad');
        for (const s of [-1, 1] as const) {
          rig.pad(hip, [0.25, 0.13, 0.44], [s * 0.15, yPad, zPad], -0.75, 'hip_pad_cushion');
          rig.tube(hip, [s * 0.07, y0, zPad + 0.16], [s * 0.07, yPad - 0.1, zPad + 0.1], [0.05, 0.09]);
        }
        rig.tube(hip, [-0.22, yPad - 0.1, zPad + 0.06], [0.22, yPad - 0.1, zPad + 0.06], 0.06);
        rig.tube(hip, [0, 0.45 * H, zPad + 0.13], [0, y0, zPad - 0.3], [0.05, 0.08]);
        const handles = rig.group('handles');
        for (const s of [-1, 1] as const) {
          rig.tube(handles, [s * 0.22, yPad - 0.1, zPad + 0.06], [s * 0.3, H - 0.02, zPad + 0.26], 0.04);
          rig.grip(handles, [s * 0.3, H - 0.02, zPad + 0.24], [s * 0.3, H - 0.02, zPad + 0.42]);
        }
        const feet = rig.group('foot_rest');
        const zf = zR + 0.36;
        rig.box(feet, [Math.min(0.56, W - 0.1), 0.03, 0.46], [0, 0.3, zf], 'plate', 'foot_plate').rotation.x = -0.8;
        rig.path(feet, [[0, y0, zf + 0.3], [0, 0.34, zf + 0.06], [0, 0.62, zf - 0.16]], t, 'frame', 'foot_rest_arm', 0.12);
        for (const s of [-1, 1] as const)
          rig.pad(feet, [0.2, 0.12, 0.2], [s * 0.14, 0.64, zf - 0.16], 0, 'ankle_pad');
        break;
      }
    }

    return { root, articulations: [] };
  },
};

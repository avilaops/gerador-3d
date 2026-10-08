/**
 * Família `leg-press`: máquinas de pernas com carro ou alavanca grande.
 *
 * - `sled`: leg press inclinado (carro com plataforma sobre trilhos, assento embaixo).
 * - `hack`: hack squat (carro com encosto e ombreiras, plataforma fixa embaixo).
 * - `lever-squat`: V-squat e pendulum (alavanca com ombreiras, pivô no alto atrás).
 * - `belt-squat`: plataforma elevada com alavanca por baixo e cinto.
 * - `horizontal`: leg press horizontal com bateria (assento desliza).
 *
 * Fundo (trilhos altos, torre) em −Z; o usuário entra pela frente (+Z).
 */
import * as THREE from 'three';
import { z } from 'zod';
import type { FamilyDefinition } from './types';
import { Rig } from '../parts/rig';
import { stackTower } from '../parts/assemblies';
import type { Articulation, Vec3 } from '../spec/schema';

export const LEG_PRESS_VARIANTS = ['sled', 'hack', 'lever-squat', 'belt-squat', 'horizontal'] as const;

export const LegPressParamsSchema = z.object({
  variant: z.enum(LEG_PRESS_VARIANTS),
  tube: z.number().positive(),
  /** Curso do carro (m) ou giro da alavanca (rad). */
  travel: z.number().nonnegative(),
  stackPlates: z.number().int().min(0).max(40),
  stackTravel: z.number().nonnegative(),
  /** Desenhar uma anilha em cada pino. */
  showPlates: z.boolean(),
  /** Plataforma dividida em duas, uma por perna (leg press articulado). */
  splitPlate: z.boolean(),
});
export type LegPressParams = z.infer<typeof LegPressParamsSchema>;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

export const legPress: FamilyDefinition<LegPressParams> = {
  id: 'leg-press',
  label: 'Leg press e agachamentos',
  paramsSchema: LegPressParamsSchema,

  defaults(d, spec) {
    const kg = spec.weightStackKg?.perStack;
    const variant = spec.params.variant;
    return {
      variant: 'sled',
      tube: 0.08,
      travel: variant === 'lever-squat' ? 0.3 : variant === 'belt-squat' ? 0.2 : 0.35,
      stackPlates: kg ? Math.max(6, Math.min(24, Math.round(kg / 9.8))) : 0,
      stackTravel: Math.min(0.25, 0.08 * d.height),
      showPlates: true,
      splitPlate: false,
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
    const stack = p.stackPlates > 0;
    const articulations: Articulation[] = [];
    const base = rig.group('base');
    const frame = rig.group('frame');

    const hornWithPlate = (
      g: THREE.Object3D,
      x: number,
      y: number,
      zc: number,
      s: 1 | -1,
      len: number,
      diameter = 0.45
    ) => {
      rig.horn(g, [x, y, zc], [s, 0, 0], len, 'plate_horn');
      if (p.showPlates && len >= 0.12) rig.plate(g, [x + s * 0.06, y, zc], diameter, 0.04);
    };

    if (p.variant === 'sled' || p.variant === 'hack') {
      const bx = clamp(W / 2 - 0.45, 0.28, 0.4);
      const yb = 0.3;
      const yt = H - 0.14;
      const zt = zR + 0.14;
      const zb = Math.max(zt + 0.5, Math.min(zt + (yt - yb), zF - 1.36));
      const a = Math.atan2(yt - yb, zb - zt);
      const u = new THREE.Vector3(0, Math.sin(a), -Math.cos(a));
      const n = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
      const railLen = Math.hypot(yt - yb, zb - zt);
      const tilt = -(Math.PI / 2 - a);

      for (const s of [-1, 1] as const) {
        rig.tube(base, [s * bx, y0, zR], [s * bx, y0, zF], t);
        rig.foot(base, s * bx, zR + 0.06);
        rig.foot(base, s * bx, zF - 0.06);
        rig.tube(frame, [s * bx, y0, zb], [s * bx, yb, zb], t);
        rig.rod(frame, [s * bx, yb, zb], [s * bx, yt, zt], 0.055, 'chrome', 'rail');
        // Viga do quadro sob o trilho e mão-francesa até a base, como nos leg press reais.
        rig.tube(frame, [s * bx, yb - 0.11, zb + 0.02], [s * bx, yt - 0.11, zt + 0.02], [0.06, 0.1], 'frame', 'rail_beam');
        rig.tube(frame, [s * bx, yb + 0.72 * (yt - yb) - 0.11, zb + 0.72 * (zt - zb)], [s * bx, y0, zb - 0.1], [0.05, 0.08]);
        // Fecha o quadro: diagonal da coluna traseira até a base, por baixo dos trilhos.
        rig.tube(frame, [s * bx, 0.5 * yt, zt], [s * bx, y0, zb + 0.4], [0.05, 0.08]);
        rig.tube(frame, [s * bx, y0, zt + 0.5], [s * bx, yb + 0.5 * (yt - yb), zt + 0.5 * (zb - zt)], 0.05);
      }
      rig.tube(base, [-bx, y0, zR + t / 2], [bx, y0, zR + t / 2], t);
      rig.tube(base, [-bx, y0, zF - t / 2], [bx, y0, zF - t / 2], t);
      rig.tube(base, [-bx, y0, zb], [bx, y0, zb], t);
      rig.tube(frame, [-bx, 0.5 * yt, zt], [bx, 0.5 * yt, zt], [0.05, 0.08], 'frame', 'rear_tie');
      rig.path(
        frame,
        [
          [-bx, 0, zt],
          [-bx, H - t / 2, zt],
          [bx, H - t / 2, zt],
          [bx, 0, zt],
        ],
        t,
        'frame',
        'rear_arch',
        0.14
      );

      const s0 = p.variant === 'sled' ? 0.3 * railLen : 0.22 * railLen;
      const travel = Math.min(p.travel, railLen - s0 - 0.35);
      const C = new THREE.Vector3(0, yb, zb).addScaledVector(u, s0);
      const carriage = rig.group('carriage');
      carriage.position.copy(C);
      const hornLen = clamp(W / 2 - bx - 0.12, 0.1, 0.25);
      const cw = W / 2 - hornLen;
      const up: Vec3 = [0, 0.08 * n.y, 0.08 * n.z];
      rig.tube(carriage, [-cw, up[1], up[2]], [cw, up[1], up[2]], t, 'accent', 'carriage_beam');
      for (const s of [-1, 1] as const) {
        rig.box(carriage, [0.09, 0.1, 0.22], [s * bx, 0, 0], 'accent', 'carriage_slider').rotation.x = tilt + Math.PI / 2;
        hornWithPlate(carriage, s * cw, up[1], up[2], s, hornLen);
      }

      if (p.variant === 'sled') {
        const larguras = p.splitPlate ? [-1, 1] : [0];
        for (const lado of larguras) {
          const fp = rig.box(
            carriage,
            [p.splitPlate ? 0.34 : Math.min(0.86, 2 * bx + 0.22), 0.03, p.splitPlate ? 0.8 : 0.72],
            [lado * 0.21, 0.2 * n.y, 0.2 * n.z],
            'plate',
            'foot_plate'
          );
          fp.position.addScaledVector(u, -0.02);
          fp.rotation.x = tilt;
        }
        rig.tube(carriage, [0, up[1], up[2]], [0, 0.19 * n.y, 0.19 * n.z], 0.06, 'accent');

        // Assento reclinado na frente, de costas para +Z.
        const zs = zb + 0.48;
        const seat = rig.group('seat');
        rig.pad(seat, [0.42, 0.08, 0.42], [0, 0.3, zs], 0.15, 'seat_pad');
        rig.tube(seat, [0, y0, zs], [0, 0.26, zs], t);
        const back = rig.group('backrest');
        const bl = Math.min(0.8, (zF - 0.05 - (zs + 0.2)) / Math.sin(0.95));
        rig.pad(back, [0.38, bl, 0.085], [0, 0.34 + (bl / 2) * Math.cos(0.95), zs + 0.2 + (bl / 2) * Math.sin(0.95)], 0.95, 'backrest_pad');
        rig.tube(back, [0, y0, zF - 0.2], [0, 0.34 + bl * 0.55 * Math.cos(0.95), zs + 0.16 + bl * 0.55 * Math.sin(0.95)], t);
        for (const s of [-1, 1] as const) rig.grip(seat, [s * 0.27, 0.36, zs - 0.1], [s * 0.27, 0.36, zs + 0.08], 'side_handle');
      } else {
        const fp = rig.box(frame, [Math.min(0.78, 2 * bx + 0.14), 0.025, 0.55], [0, yb - 0.02, zb + 0.22], 'plate', 'foot_plate');
        fp.rotation.x = tilt;
        rig.tube(frame, [0, y0, zb + 0.3], [0, yb - 0.06, zb + 0.26], t);
        const bl = Math.min(0.85, railLen - s0 - 0.2);
        const bp = rig.pad(carriage, [0.4, bl, 0.085], [0, 0, 0], 0, 'backrest_pad');
        bp.position.copy(u.clone().multiplyScalar(0.1 + bl / 2).addScaledVector(n, 0.16));
        bp.rotation.x = tilt;
        for (const s of [-1, 1] as const) {
          const sp = rig.pad(carriage, [0.15, 0.1, 0.3], [0, 0, 0], 0, 'shoulder_pad');
          sp.position.copy(u.clone().multiplyScalar(bl + 0.02).addScaledVector(n, 0.32));
          sp.position.x = s * 0.18;
          sp.rotation.x = tilt + Math.PI / 2;
          const hp = u.clone().multiplyScalar(bl + 0.0).addScaledVector(n, 0.3);
          rig.grip(carriage, [s * 0.33, hp.y, hp.z], [s * 0.33, hp.y + 0.12 * n.y, hp.z + 0.12 * n.z], 'handle');
        }
        const sup = u.clone().multiplyScalar(bl).addScaledVector(n, 0.26);
        rig.tube(carriage, [0, up[1], up[2]], [0, sup.y, sup.z], 0.06, 'accent');
        rig.tube(carriage, [-0.33, sup.y, sup.z], [0.33, sup.y, sup.z], 0.05, 'accent');
      }
      articulations.push({
        node: 'carriage',
        type: 'prismatic',
        axis: [u.x, u.y, u.z],
        pivot: [C.x, C.y, C.z],
        range: [0, Math.max(0.1, travel)],
        driver: 'phase',
      });
    } else if (p.variant === 'lever-squat') {
      const ax = stack ? clamp(W / 2 - 0.1, 0.26, 0.4) : clamp(W / 2 - 0.3, 0.26, 0.45);
      for (const s of [-1, 1] as const) {
        rig.tube(base, [s * ax, y0, zR], [s * ax, y0, zF], t);
        rig.foot(base, s * (W / 2 - 0.06), zR + 0.06);
        rig.foot(base, s * (W / 2 - 0.06), zF - 0.06);
      }
      rig.tube(base, [-W / 2, y0, zR + t / 2], [W / 2, y0, zR + t / 2], t);
      rig.tube(base, [-W / 2, y0, zF - t / 2], [W / 2, y0, zF - t / 2], t);

      const py = H - 0.28;
      // Com anilhas, o quadro é um pórtico em "telhado": o pivô fica perto da cumeeira.
      const pz = stack ? zR + 0.3 : zR + Math.max(0.45, 0.3 * L);
      if (stack) {
        const unit = stackTower(kit, { x: 0, z: zR + 0.135, height: H, post: t, plates: p.stackPlates, travel: p.stackTravel });
        root.add(unit.group);
        articulations.push(unit.articulation);
        for (const s of [-1, 1] as const) rig.tube(frame, [s * (ax - 0.07), y0, pz], [s * (ax - 0.07), py, pz], t);
      } else {
        const fx = ax - 0.075;
        for (const s of [-1, 1] as const) {
          // Coluna curta na frente, diagonal até a cumeeira e descida até o fundo.
          rig.path(
            frame,
            [
              [s * fx, 0, zF - 0.1],
              [s * fx, Math.min(0.85, 0.42 * H), zF - 0.1],
              [s * fx, H - t / 2, pz],
              [s * fx, 0, zR + 0.1],
            ],
            t,
            'frame',
            `side_frame_${s < 0 ? 'left' : 'right'}`,
            0.22
          );
          rig.box(frame, [0.16, 0.012, 0.1], [s * fx, 0.006, zF - 0.1], 'rubber', 'foot');
          rig.box(frame, [0.16, 0.012, 0.1], [s * fx, 0.006, zR + 0.1], 'rubber', 'foot');
        }
        // Travessa a meia altura da perna traseira (a cumeeira fica livre para a alavanca).
        const zc = pz + 0.5 * (zR + 0.1 - pz);
        rig.tube(frame, [-fx, 0.5 * H, zc], [fx, 0.5 * H, zc], t, 'frame', 'rear_crossbar');
        rig.tube(frame, [-fx, y0, zR + 0.1], [fx, y0, zR + 0.1], t);
      }
      rig.tube(frame, [-ax, y0, pz], [ax, y0, pz], t);

      const sy = Math.min(1.42, H - 0.4);
      const sz = clamp(0.08 * L, pz + 0.7, zF - 0.6);
      const tip: Vec3 = [0, sy - py, sz - pz];
      const lever = rig.arm('lever', [0, py, pz], 'x', root, { diameter: 0.09, length: 0.1 });
      rig.rod(lever, [-ax, 0, 0], [ax, 0, 0], 0.05, 'chrome', 'lever_axle');
      for (const s of [-1, 1] as const) {
        rig.tube(lever, [s * ax, 0, 0], [s * ax, tip[1], tip[2]], t, 'accent', 'lever_bar');
        rig.pad(lever, [0.15, 0.1, 0.3], [s * 0.18, tip[1] - 0.07, tip[2]], 0, 'shoulder_pad');
        rig.grip(lever, [s * (ax - 0.04), tip[1], tip[2] + 0.04], [s * (ax - 0.04), tip[1], tip[2] + 0.2], 'handle');
        if (!stack) {
          const hl = clamp(W / 2 - ax - t / 2 - 0.01, 0.1, 0.25);
          hornWithPlate(lever, s * (ax + t / 2), tip[1] * 0.55, tip[2] * 0.55, s, hl);
        }
      }
      rig.tube(lever, [-ax, tip[1], tip[2]], [ax, tip[1], tip[2]], 0.06, 'accent');
      rig.pad(lever, [0.36, 0.6, 0.085], [0, tip[1] - 0.4, tip[2] - 0.13], -0.08, 'backrest_pad');
      rig.tube(lever, [0, tip[1], tip[2]], [0, tip[1] - 0.4, tip[2] - 0.18], 0.05, 'accent');
      articulations.push({
        node: 'lever',
        type: 'revolute',
        axis: [1, 0, 0],
        pivot: [0, py, pz],
        range: [0, p.travel],
        driver: 'phase',
      });

      const plat = rig.group('platform');
      const zp = clamp(sz + 0.25, sz, zF - 0.4);
      rig.box(plat, [Math.min(0.78, W - 0.06), 0.025, 0.66], [0, 0.2, zp], 'plate', 'foot_plate').rotation.x = -0.3;
      rig.tube(plat, [0, y0, zp + 0.2], [0, 0.26, zp + 0.2], t);
      rig.tube(plat, [0, y0, zp - 0.2], [0, 0.12, zp - 0.2], t);
      rig.tube(base, [0, y0, pz], [0, y0, zF - t / 2], t);
    } else if (p.variant === 'belt-squat') {
      const hornLen = 0.22;
      const ox = W / 2 - hornLen;
      const bx = clamp(ox - 0.12, 0.3, 0.6);
      const hp = clamp(0.44, 0.25, H - 0.25);
      for (const s of [-1, 1] as const) {
        rig.tube(base, [s * bx, y0, zR], [s * bx, y0, zF], t);
        rig.foot(base, s * bx, zR + 0.06);
        rig.foot(base, s * bx, zF - 0.06);
      }
      rig.tube(base, [-bx, y0, zR + t / 2], [bx, y0, zR + t / 2], t);
      rig.tube(base, [-bx, y0, zF - t / 2], [bx, y0, zF - t / 2], t);

      const plat = rig.group('platform');
      const z1 = zR + 0.35;
      const z2 = zF - 0.3;
      const pwid = bx - 0.13;
      for (const s of [-1, 1] as const) {
        rig.box(plat, [pwid, 0.03, z2 - z1], [s * (0.13 + pwid / 2), hp, (z1 + z2) / 2], 'plate', 'foot_plate');
        rig.tube(plat, [s * bx, y0, z1 + 0.05], [s * bx, hp - 0.015, z1 + 0.05], t);
        rig.tube(plat, [s * bx, y0, z2 - 0.05], [s * bx, hp - 0.015, z2 - 0.05], t);
        rig.tube(plat, [s * bx, hp - 0.05, z1], [s * bx, hp - 0.05, z2], [t, 0.05]);
      }

      const handles = rig.group('handles');
      const hx = Math.min(0.36, bx);
      // Dois pegadores verticais na frente da plataforma, presos a uma travessa baixa.
      const yh = Math.min(hp + 0.5, H - 0.36);
      for (const s of [-1, 1] as const) {
        rig.tube(handles, [s * hx, y0, zF - t / 2], [s * hx, yh, zF - t / 2], 0.06);
        rig.tube(handles, [s * 0.1, yh, zF - t / 2], [s * 0.1, H - 0.3, zF - t / 2], 0.045);
        rig.grip(handles, [s * 0.1, H - 0.3, zF - t / 2], [s * 0.1, H, zF - t / 2], 'handle_grip');
      }
      rig.tube(handles, [-hx, yh, zF - t / 2], [hx, yh, zF - t / 2], 0.06, 'frame', 'handle_bar');


      const py = Math.min(0.2, hp - 0.14);
      const pz = zR + 0.16;
      const reach = (z1 + z2) / 2 - pz;
      const lever = rig.arm('lever', [0, py, pz], 'x', root, { diameter: 0.08, length: 0.2 });
      const ty = hp - 0.1 - py;
      rig.tube(lever, [0, 0, 0], [0, ty, reach], t, 'accent', 'lever_bar');
      rig.rod(lever, [0, ty, reach], [0, ty + 0.16, reach], 0.02, 'chrome', 'belt_hook');
      const hz = reach * 0.62;
      const hy = ty * 0.62;
      rig.tube(lever, [-ox, hy, hz], [ox, hy, hz], 0.06, 'accent', 'lever_crossbar');
      for (const s of [-1, 1] as const) hornWithPlate(lever, s * ox, hy, hz, s, hornLen, Math.min(0.45, 2 * (py + hy) - 0.04));
      rig.tube(frame, [-0.12, y0, pz], [0.12, y0, pz], t);
      for (const s of [-1, 1] as const) rig.tube(frame, [s * 0.12, y0, pz], [s * 0.12, py + 0.06, pz], 0.06);
      rig.tube(base, [0, y0, zR + t / 2], [0, y0, pz], t);
      articulations.push({
        node: 'lever',
        type: 'revolute',
        axis: [1, 0, 0],
        pivot: [0, py, pz],
        range: [0, Math.min(p.travel, 0.12)],
        driver: 'phase',
      });
    } else {
      // Leg press horizontal: torre e plataforma no fundo, assento sobre trilhos.
      const bx = clamp(W / 2 - 0.2, 0.22, 0.34);
      for (const s of [-1, 1] as const) {
        rig.tube(base, [s * bx, y0, zR], [s * bx, y0, zF], t);
        rig.foot(base, s * (W / 2 - 0.06), zR + 0.06);
        rig.foot(base, s * (W / 2 - 0.06), zF - 0.06);
        rig.rod(frame, [s * 0.2, 0.3, zR + 0.5], [s * 0.2, 0.3, zF - 0.06], 0.05, 'chrome', 'rail');
        rig.tube(frame, [s * 0.2, y0, zF - 0.06], [s * 0.2, 0.3, zF - 0.06], 0.06);
        rig.tube(frame, [s * 0.2, y0, zR + 0.5], [s * 0.2, 0.3, zR + 0.5], 0.06);
      }
      rig.tube(base, [-W / 2, y0, zR + t / 2], [W / 2, y0, zR + t / 2], t);
      rig.tube(base, [-W / 2, y0, zF - t / 2], [W / 2, y0, zF - t / 2], t);
      rig.tube(base, [-bx, y0, zR + 0.5], [bx, y0, zR + 0.5], t);
      if (stack) {
        const unit = stackTower(kit, { x: 0, z: zR + 0.135, height: H, post: t, plates: p.stackPlates, travel: p.stackTravel });
        root.add(unit.group);
        articulations.push(unit.articulation);
      }
      const plat = rig.group('platform');
      rig.box(plat, [Math.min(0.72, W - 0.14), 0.68, 0.03], [0, 0.74, zR + 0.47], 'plate', 'foot_plate').rotation.x = -0.24;
      for (const s of [-1, 1] as const) rig.tube(plat, [s * 0.28, y0, zR + 0.36], [s * 0.28, 0.72, zR + 0.4], 0.05);
      rig.tube(plat, [0, y0, zR + 0.34], [0, 0.8, zR + 0.38], t);

      const z0 = clamp(0.12 * L, zR + 1.15, zF - 0.95);
      const carriage = rig.group('carriage');
      carriage.position.set(0, 0, z0);
      rig.tube(carriage, [0, 0.33, -0.25], [0, 0.33, 0.45], t, 'frame', 'carriage_beam');
      for (const s of [-1, 1] as const) rig.box(carriage, [0.1, 0.1, 0.3], [s * 0.2, 0.3, 0.1], 'frame', 'carriage_slider');
      rig.tube(carriage, [-0.2, 0.33, 0.1], [0.2, 0.33, 0.1], 0.06);
      rig.pad(carriage, [0.42, 0.085, 0.42], [0, 0.44, 0.02], -0.08, 'seat_pad');
      const bl = Math.min(0.72, (zF - 0.04 - z0 - 0.24) / Math.sin(0.6));
      rig.pad(carriage, [0.36, bl, 0.085], [0, 0.5 + (bl / 2) * Math.cos(0.6), 0.24 + (bl / 2) * Math.sin(0.6)], 0.6, 'backrest_pad');
      rig.tube(carriage, [0, 0.33, 0.45], [0, 0.5 + bl * 0.6 * Math.cos(0.6), 0.2 + bl * 0.6 * Math.sin(0.6)], 0.06);
      for (const s of [-1, 1] as const) rig.grip(carriage, [s * 0.28, 0.5, -0.06], [s * 0.28, 0.5, 0.1], 'side_handle');
      articulations.push({
        node: 'carriage',
        type: 'prismatic',
        axis: [0, 0, 1],
        pivot: [0, 0, z0],
        range: [0, Math.min(p.travel, 0.3)],
        driver: 'phase',
      });
    }

    return { root, articulations };
  },
};

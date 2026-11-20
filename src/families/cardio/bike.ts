/**
 * Família `bike`: bicicletas ergométricas vertical e horizontal (reclinada) e de spinning.
 *
 * Usuário olha para +Z: selim ou assento atrás (−Z), pedais e console à frente (+Z).
 * C = comprimento, L = largura dos estabilizadores, A = topo do console (ou do guidão, no spinning).
 */
import * as THREE from 'three';
import { z } from 'zod';
import type { FamilyDefinition } from '../types';
import { Rig } from '../../parts/rig';
import { poseAnchor } from '../../parts/pose';
import type { Vec3 } from '../../spec/schema';
import { consoleHead, pedal, shell, wheel } from './shared';

export const BIKE_VARIANTS = ['upright', 'recumbent', 'spin'] as const;

export const BikeParamsSchema = z.object({
  variant: z.enum(BIKE_VARIANTS),
  /** Tela grande (tablet) ou display de LED. */
  screen: z.enum(['led', 'tablet']),
  /** Altura do topo do selim (m). */
  seatHeight: z.number().positive(),
  /** Raio da manivela (m). */
  crank: z.number().positive(),
});
export type BikeParams = z.infer<typeof BikeParamsSchema>;

const SCREENS = {
  led: { w: 0.3, h: 0.17, d: 0.07 },
  tablet: { w: 0.5, h: 0.3, d: 0.04 },
} as const;

export const bike: FamilyDefinition<BikeParams> = {
  id: 'bike',
  label: 'Bicicleta',
  paramsSchema: BikeParamsSchema,

  defaults(d) {
    return {
      variant: 'upright',
      screen: 'led',
      seatHeight: Math.min(0.95, d.height * 0.6),
      crank: 0.17,
    };
  },

  build({ dims, params: p, kit }) {
    const root = new THREE.Group();
    root.name = 'equipment';
    const rig = new Rig(kit, root);
    const { length: L, width: W, height: H } = dims;
    const zR = -L / 2;
    const zF = L / 2;
    const base = rig.group('base');
    const scr = SCREENS[p.screen];
    const hw = W / 2 - 0.04;
    const tilt = 0.4;
    const consoleY = (top: number) => top - 0.5 * (scr.h * Math.cos(tilt) + scr.d * Math.sin(tilt));

    /** Manivela com os dois pedais (grupo `crank`, eixo em X). */
    const px = Math.min(0.21, W / 2 - 0.06); // o pedal (0,1 m de largura) cabe na largura do catálogo
    const cranks = (y: number, z: number) => {
      const g = rig.group('crank');
      g.position.set(0, y, z);
      rig.rod(g, [-0.15, 0, 0], [0.15, 0, 0], 0.05, 'chrome', 'crank_axle');
      rig.rod(g, [0.14, 0, 0], [0.14, p.crank, 0], 0.032, 'chrome', 'crank_arm_r');
      rig.rod(g, [-0.14, 0, 0], [-0.14, -p.crank, 0], 0.032, 'chrome', 'crank_arm_l');
      pedal(rig, g, [px, p.crank, 0], 'pedal_r');
      pedal(rig, g, [-px, -p.crank, 0], 'pedal_l');
    };
    /** Carenagem circular do volante: disco grande com tampa lateral de metal. */
    const flywheelCover = (y: number, z: number, diameter: number, width: number) => {
      wheel(rig, base, [0, y, z], diameter, width, 'frame', 'flywheel_cover');
      for (const s of [-1, 1] as const) wheel(rig, base, [s * (width / 2 + 0.004), y, z], diameter * 0.62, 0.012, 'plate', 'cover_plate');
    };
    /** Tampa de plástico entre a carenagem e o suporte do selim. */
    const tail = (y: number, z: number, length: number) =>
      shell(rig, base, [0.2, 0.3, length], [0, y, z], { radius: 0.08, name: 'body_tail' });

    let seatZ = zR + 0.3;
    let seatY = p.seatHeight;
    let bodyTilt = 0;

    if (p.variant === 'upright') {
      // Pés largos e chatos, como nas bicicletas de academia.
      for (const z of [zF - 0.07, zR + 0.07]) {
        rig.box(base, [W - 0.04, 0.045, 0.14], [0, 0.0225, z], 'frame', 'foot_plate');
        for (const s of [-1, 1] as const) rig.foot(base, s * (W / 2 - 0.04), z, [0.1, 0.16]);
      }
      const wheelZ = zF - 0.5;
      flywheelCover(0.42, wheelZ, 0.56, 0.26);
      tail(0.3, wheelZ - 0.42, 0.55);
      rig.tube(base, [0, 0.06, zR + 0.07], [0, 0.12, wheelZ], [0.1, 0.07], 'frame', 'spine');
      rig.tube(base, [0, 0.06, wheelZ], [0, 0.05, zF - 0.07], [0.1, 0.07], 'frame', 'front_leg');
      cranks(0.38, wheelZ - 0.22);
      // Coluna do console: sai do alto da carenagem, curva para a frente.
      rig.path(base, [[0, 0.62, wheelZ + 0.12], [0, H * 0.56, zF - 0.22], [0, H - scr.h * 0.7, zF - 0.24]], [0.11, 0.08], 'frame', 'mast', 0.12);
      // Guidão: chifres que sobem ao lado do console e pegadas laterais para trás.
      const barY = H * 0.66;
      for (const s of [-1, 1] as const) {
        rig.path(base, [[s * 0.05, barY - 0.06, zF - 0.24], [s * 0.2, barY, zF - 0.32], [s * 0.25, barY - 0.02, zF - 0.5], [s * 0.25, barY - 0.1, zF - 0.62]], 0.034, 'frame', 'handle', 0.08);
        rig.grip(base, [s * 0.25, barY - 0.02, zF - 0.5], [s * 0.25, barY - 0.1, zF - 0.62], 'handle_grip');
      }
      consoleHead(rig, base, { center: [0, consoleY(H), zF - 0.2], size: scr, tilt });
      // Selim e canote saem do rabo da carenagem.
      seatZ = zR + 0.33;
      rig.tube(base, [0, 0.4, zR + 0.4], [0, seatY - 0.07, seatZ - 0.03], [0.07, 0.06], 'chrome', 'seat_post');
      shell(rig, base, [0.26, 0.08, 0.3], [0, seatY - 0.04, seatZ - 0.05], { radius: 0.035, material: 'upholstery', name: 'saddle' });
    } else if (p.variant === 'recumbent') {
      for (const z of [zF - 0.07, zR + 0.08]) {
        rig.box(base, [W - 0.04, 0.045, 0.14], [0, 0.0225, z], 'frame', 'foot_plate');
        for (const s of [-1, 1] as const) rig.foot(base, s * (W / 2 - 0.04), z, [0.1, 0.16]);
      }
      const wheelZ = zF - 0.36;
      seatZ = zR + L * 0.3;
      seatY = Math.min(0.46, p.seatHeight);
      // Quadro baixo e curvo entre o assento e o volante (entrada facilitada).
      rig.path(base, [[0, 0.06, zR + 0.08], [0, 0.2, seatZ - 0.1], [0, 0.17, seatZ + 0.45], [0, 0.34, wheelZ - 0.25]], [0.11, 0.08], 'frame', 'step_through_frame', 0.2);
      // Assento largo e encosto alto, com apoios de braço.
      const armX = W / 2 - 0.045;
      const seatW = Math.min(0.46, W - 0.16);
      shell(rig, base, [seatW, 0.1, 0.44], [0, seatY - 0.05, seatZ], { radius: 0.045, material: 'upholstery', name: 'seat_pad' });
      shell(rig, base, [seatW, Math.min(0.66, H * 0.46), 0.09], [0, seatY + 0.32, seatZ - 0.24], { radius: 0.05, material: 'upholstery', tiltX: -0.25, name: 'backrest_pad' });
      rig.tube(base, [0, 0.16, seatZ - 0.04], [0, seatY - 0.1, seatZ], [0.12, 0.07], 'frame', 'seat_support');
      rig.tube(base, [0, seatY - 0.08, seatZ - 0.2], [0, seatY + 0.4, seatZ - 0.3], [0.08, 0.06], 'frame', 'back_support');
      for (const s of [-1, 1] as const) {
        shell(rig, base, [0.07, 0.05, 0.3], [s * armX, seatY + 0.14, seatZ - 0.02], { radius: 0.02, material: 'upholstery', name: 'armrest' });
        rig.path(base, [[s * armX, seatY + 0.1, seatZ - 0.1], [s * armX, seatY - 0.02, seatZ + 0.2]], 0.04, 'frame', 'armrest_support', 0.05);
        rig.path(base, [[s * armX, seatY + 0.16, seatZ + 0.14], [s * armX, seatY + 0.32, seatZ + 0.1]], 0.03, 'frame', 'seat_handle', 0.05);
      }
      flywheelCover(0.54, wheelZ, 0.6, 0.26);
      rig.tube(base, [0, 0.05, zF - 0.07], [0, 0.3, wheelZ], [0.12, 0.08], 'frame', 'front_leg');
      cranks(0.54, wheelZ - 0.3);
      rig.path(base, [[0, 0.8, wheelZ + 0.1], [0, H * 0.72, zF - 0.16], [0, H - scr.h * 0.6, zF - 0.14]], [0.1, 0.08], 'frame', 'mast', 0.12);
      for (const s of [-1, 1] as const) rig.path(base, [[s * 0.06, H * 0.78, zF - 0.17], [s * 0.2, H * 0.78, zF - 0.28], [s * 0.22, H * 0.68, zF - 0.4]], 0.03, 'frame', 'console_handle', 0.07);
      consoleHead(rig, base, { center: [0, consoleY(H), zF - 0.12], size: scr, tilt });
      bodyTilt = 0.75;
    } else {
      // Spinning: volante de inércia à vista na frente, selim atrás, guidão multiposição.
      for (const z of [zF - 0.08, zR + 0.08]) {
        rig.tube(base, [-hw, 0.03, z], [hw, 0.03, z], [0.06, 0.05], 'frame', 'stabilizer');
        for (const s of [-1, 1] as const) rig.foot(base, s * hw, z, [0.09, 0.09]);
      }
      const flywheelZ = zF - 0.27;
      wheel(rig, base, [0, 0.4, flywheelZ], 0.52, 0.07, 'plate', 'flywheel');
      for (const s of [-1, 1] as const) wheel(rig, base, [s * 0.05, 0.4, flywheelZ], 0.5, 0.016, 'frame', 'flywheel_cover');
      // Quadro principal curvo, da base de trás até o cabeçote do guidão.
      // O quadro passa pelo movimento central (onde ficam as manivelas) e sobe até o cabeçote do guidão.
      const crankZ = flywheelZ - 0.34;
      rig.path(base, [[0, 0.05, zR + 0.1], [0, 0.3, crankZ], [0, 0.52, flywheelZ - 0.04], [0, 0.62, flywheelZ + 0.0]], [0.09, 0.07], 'frame', 'main_frame', 0.14);
      // Perna dianteira: do eixo do volante até a base da frente.
      rig.path(base, [[0, 0.4, flywheelZ], [0, 0.18, zF - 0.12], [0, 0.03, zF - 0.08]], [0.08, 0.06], 'frame', 'front_leg', 0.1);
      cranks(0.3, crankZ);
      seatZ = zR + 0.28;
      seatY = Math.min(p.seatHeight, H - 0.1);
      rig.tube(base, [0, 0.2, zR + 0.26], [0, seatY - 0.07, seatZ - 0.02], [0.06, 0.05], 'chrome', 'seat_post');
      shell(rig, base, [0.2, 0.065, 0.27], [0, seatY - 0.0325, seatZ - 0.05], { radius: 0.03, material: 'upholstery', name: 'saddle' });
      const barY = H - 0.04;
      rig.tube(base, [0, 0.55, flywheelZ + 0.0], [0, barY - 0.02, flywheelZ - 0.06], [0.06, 0.05], 'chrome', 'handlebar_post');
      rig.rod(base, [-0.21, barY, flywheelZ - 0.08], [0.21, barY, flywheelZ - 0.08], 0.032, 'rubber', 'handlebar');
      for (const s of [-1, 1] as const)
        rig.path(base, [[s * 0.21, barY, flywheelZ - 0.08], [s * 0.21, barY - 0.01, flywheelZ + 0.1], [s * 0.11, barY - 0.01, flywheelZ + 0.13]], 0.03, 'frame', 'handlebar_loop', 0.05);
      shell(rig, base, [0.16, 0.1, 0.05], [0, barY - 0.11, flywheelZ - 0.1], { radius: 0.015, tiltX: 0.4, material: 'rubber', name: 'display' });
      bodyTilt = -0.5;
    }

    root.add(poseAnchor([0, seatY + 0.1, seatZ - 0.05] as Vec3, { kind: 'seated', tilt: bodyTilt, feet: 'floor' }));
    return { root, articulations: [] };
  },
};

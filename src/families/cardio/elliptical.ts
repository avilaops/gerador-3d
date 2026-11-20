/**
 * Família `elliptical`: elípticos de transmissão traseira e treinador de movimento adaptativo (AMT).
 *
 * Usuário olha para +Z: console e mastro à frente (+Z), carenagem do volante atrás (−Z).
 * C = comprimento da base, L = largura entre as longarinas, A = topo do console.
 *
 * Variantes:
 * - `rear-drive`: carenagem grande do volante atrás, plataformas de pedal e alavancas móveis.
 * - `adaptive`: estrutura aberta com arcos laterais, caixa central e plataformas largas.
 */
import * as THREE from 'three';
import { z } from 'zod';
import type { FamilyDefinition } from '../types';
import { Rig } from '../../parts/rig';
import { poseAnchor } from '../../parts/pose';
import type { Vec3 } from '../../spec/schema';
import { consoleHead, shell, stabilizer } from './shared';

export const ELLIPTICAL_VARIANTS = ['rear-drive', 'adaptive'] as const;

export const EllipticalParamsSchema = z.object({
  variant: z.enum(ELLIPTICAL_VARIANTS),
  screen: z.enum(['led', 'tablet']),
  /** Rampa de inclinação regulável sob as plataformas (elíptico com inclinação). */
  inclineRamp: z.boolean(),
  /** Altura do topo dos pedais em repouso (m). */
  pedalHeight: z.number().positive(),
});
export type EllipticalParams = z.infer<typeof EllipticalParamsSchema>;

const SCREENS = {
  led: { w: 0.36, h: 0.2, d: 0.08 },
  tablet: { w: 0.52, h: 0.34, d: 0.05 },
} as const;

export const elliptical: FamilyDefinition<EllipticalParams> = {
  id: 'elliptical',
  label: 'Elíptico',
  paramsSchema: EllipticalParamsSchema,

  defaults() {
    return { variant: 'rear-drive', screen: 'led', inclineRamp: false, pedalHeight: 0.3 };
  },

  build({ dims, params: p, kit }) {
    const root = new THREE.Group();
    root.name = 'equipment';
    const rig = new Rig(kit, root);
    const { length: L, width: W, height: H } = dims;
    const zR = -L / 2;
    const zF = L / 2;
    const adaptive = p.variant === 'adaptive';
    const base = rig.group('base');
    const scr = SCREENS[p.screen];
    const tilt = 0.35;
    const rail = W / 2 - 0.05;

    // Base: duas longarinas com travessas e pés de apoio.
    for (const s of [-1, 1] as const) rig.tube(base, [s * rail, 0.04, zR + 0.1], [s * rail, 0.04, zF - 0.08], [0.07, 0.07], 'frame', 'side_rail');
    stabilizer(rig, base, 0.03, zR + 0.1, rail + 0.01, 0.06);
    stabilizer(rig, base, 0.03, zF - 0.1, rail + 0.01, 0.06);
    if (p.inclineRamp) {
      shell(rig, base, [W * 0.55, 0.1, 0.55], [0, 0.11, zR + L * 0.55], { radius: 0.03, material: 'plate', name: 'incline_ramp' });
      rig.tube(base, [-W * 0.2, 0.06, zR + L * 0.55 - 0.22], [-W * 0.2, 0.22, zR + L * 0.55 - 0.22], [0.04, 0.04], 'chrome', 'incline_lift');
    }

    // Pedais: plataformas largas e longas no AMT, estreitas no elíptico comum.
    const pedalX = adaptive ? 0.24 : 0.2;
    const pedalW = adaptive ? 0.17 : 0.13;
    const pedalLen = adaptive ? 0.4 : 0.34;
    const pedalZ = adaptive ? zR + L * 0.48 : zR + L * 0.54;
    const pedalY = p.pedalHeight;

    if (!adaptive) {
      // Carenagem do volante: massa grande atrás, com a tampa superior inclinada.
      shell(rig, base, [W * 0.86, 0.6, 0.9], [0, 0.34, zR + 0.55], { radius: 0.12, name: 'drive_cover' });
      shell(rig, base, [W * 0.7, 0.34, 0.62], [0, 0.72, zR + 0.46], { radius: 0.1, tiltX: -0.28, name: 'drive_cover_top' });
    } else {
      // Caixa central estreita e alta, com rolos à mostra atrás.
      shell(rig, base, [0.36, 0.82, 0.55], [0, 0.45, zR + L * 0.36], { radius: 0.08, name: 'center_housing' });
      for (const s of [-1, 1] as const) {
        rig.box(base, [0.1, 0.12, 0.3], [s * 0.2, 0.16, zR + 0.3], 'plate', 'rear_roller');
        // Arco lateral aberto, de aço à vista, que sustenta as plataformas.
        rig.path(base, [[s * rail, 0.06, zR + 0.2], [s * (rail + 0.02), 0.5, zR + L * 0.3], [s * (rail + 0.02), 0.55, zF - L * 0.3], [s * rail, 0.06, zF - 0.2]], 0.05, 'plate', 'side_arc', 0.25);
      }
    }

    // Mastro do console: duas colunas unidas por uma travessa, com o console no alto.
    const mastZ = zF - 0.34;
    for (const s of [-1, 1] as const) rig.path(base, [[s * 0.1, 0.05, mastZ + 0.06], [s * 0.1, H * 0.5, mastZ], [s * 0.09, H * 0.72, mastZ - 0.01]], [0.07, 0.07], 'frame', 'mast_column', 0.1);
    rig.tube(base, [-0.1, H * 0.72, mastZ - 0.01], [0.1, H * 0.72, mastZ - 0.01], [0.09, 0.07], 'frame', 'mast_cross');
    rig.tube(base, [0, H * 0.72, mastZ - 0.01], [0, H - scr.h * 0.6, mastZ - 0.03], [0.13, 0.07], 'frame', 'mast_neck');
    consoleHead(rig, base, { center: [0, H - 0.5 * (scr.h * Math.cos(tilt) + scr.d * Math.sin(tilt)), mastZ - 0.04], size: scr, tilt });
    // Alças fixas: saem do mastro, abertas para os lados.
    const handleY = H * 0.64;
    for (const s of [-1, 1] as const) {
      rig.path(base, [[s * 0.1, handleY + 0.06, mastZ - 0.02], [s * (W * 0.3), handleY + 0.04, mastZ - 0.15], [s * (W * 0.3), handleY - 0.12, mastZ - 0.22]], 0.034, 'frame', 'static_handle', 0.07);
      rig.grip(base, [s * (W * 0.3), handleY + 0.04, mastZ - 0.15], [s * (W * 0.3), handleY - 0.14, mastZ - 0.23], 'static_grip');
    }

    // Pedais, braços e alavancas móveis, em grupos por lado.
    const pivotY = H * 0.78;
    const pivotZ = mastZ - 0.04;
    for (const s of [-1, 1] as const) {
      const side = rig.group(s < 0 ? 'stride_left' : 'stride_right');
      const px = s * pedalX;
      rig.box(side, [pedalW, 0.04, pedalLen], [px, pedalY - 0.02, pedalZ], 'frame', 'pedal');
      rig.box(side, [pedalW * 0.94, 0.012, pedalLen * 0.94], [px, pedalY + 0.006, pedalZ], 'rubber', 'pedal_tread');
      // Braço do pedal: da carenagem (ou do eixo traseiro) até a ponta de trás da plataforma.
      const crankZ = adaptive ? zR + 0.3 : zR + 0.5;
      rig.tube(side, [s * 0.18, adaptive ? 0.2 : 0.4, crankZ], [px, pedalY - 0.04, pedalZ - pedalLen / 2 + 0.02], [0.05, 0.04], 'frame', 'pedal_arm');
      // Alavanca: da ponta da frente da plataforma até o pivô alto; passa do pivô e termina em pegada alta.
      const front: Vec3 = [px, pedalY - 0.02, pedalZ + pedalLen / 2 - 0.02];
      const pivot: Vec3 = [px, pivotY, pivotZ];
      rig.tube(side, front, pivot, [0.05, 0.04], 'frame', 'lever_arm');
      rig.tube(side, pivot, [px, H * 0.94, pivotZ - 0.1], [0.045, 0.04], 'frame', 'lever_extension');
      const at = (t: number): Vec3 => [px, front[1] + (pivot[1] - front[1]) * t, front[2] + (pivot[2] - front[2]) * t];
      rig.grip(side, at(0.58), at(0.88), 'moving_grip');
    }

    root.add(poseAnchor([0, pedalY + 0.93, pedalZ - 0.04] as Vec3, { kind: 'standing', tilt: 0.05, feet: 'floor' }));
    return { root, articulations: [] };
  },
};

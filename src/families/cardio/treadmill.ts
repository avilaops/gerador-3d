/**
 * Família `treadmill`: esteiras ergométricas e esteira curva (não motorizada).
 *
 * Usuário olha para +Z: o console fica à frente (+Z) e a esteira corre de trás (−Z) para a frente.
 * C = comprimento total (traseira da esteira até a frente do capô), L = largura da carenagem,
 * A = topo do console.
 *
 * Variantes:
 * - `standard`: capô do motor, dois montantes laterais e console.
 * - `arch`: quadro em arco sobre a metade da frente, console grande de tela touch.
 * - `curved`: sem motor; piso em arco e quadro alto de frente.
 */
import * as THREE from 'three';
import { z } from 'zod';
import type { FamilyDefinition } from '../types';
import { Rig } from '../../parts/rig';
import { poseAnchor } from '../../parts/pose';
import type { Vec3 } from '../../spec/schema';
import { consoleHead, consoleSize, shell, type ScreenKind } from './shared';

export const TREADMILL_VARIANTS = ['standard', 'arch', 'curved'] as const;

export const TreadmillParamsSchema = z.object({
  variant: z.enum(TREADMILL_VARIANTS),
  /** Altura do topo da esteira de corrida (m). */
  deckHeight: z.number().positive(),
  /** Largura da esteira de corrida (m). */
  beltWidth: z.number().positive(),
  consoleTilt: z.number(),
  screen: z.enum(['led', 'touch', 'lcd']),
});
export type TreadmillParams = z.infer<typeof TreadmillParamsSchema>;

export const treadmill: FamilyDefinition<TreadmillParams> = {
  id: 'treadmill',
  label: 'Esteira',
  paramsSchema: TreadmillParamsSchema,

  defaults(d) {
    return {
      variant: 'standard',
      deckHeight: 0.21,
      beltWidth: Math.min(0.56, d.width * 0.62),
      consoleTilt: 0.45,
      screen: 'led',
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
    const curved = p.variant === 'curved';
    const arch = p.variant === 'arch';
    const bw = p.beltWidth;
    const sw = (W - bw) / 2 - 0.012; // largura de cada carenagem lateral
    const hood = curved ? 0.12 : Math.min(0.5, L * 0.2);
    const deckTop = p.deckHeight;
    const beltLen = L - hood - 0.05;
    const beltCenterZ = zR + 0.03 + beltLen / 2;

    // Pés de apoio (carenagem e capô ficam no alto).
    for (const s of [-1, 1] as const) {
      for (const z of [zR + 0.14, zF - 0.14]) rig.box(base, [0.1, 0.03, 0.14], [s * (W / 2 - 0.08), 0.015, z], 'rubber', 'foot');
    }

    if (!curved) {
      // Carenagens laterais ao longo da esteira e capô do motor na frente.
      const hs = deckTop - 0.02;
      for (const s of [-1, 1] as const)
        shell(rig, base, [sw, hs, L - hood * 0.35], [s * (W / 2 - sw / 2), 0.03 + hs / 2, zR + (L - hood * 0.35) / 2], { radius: 0.03, name: 'deck_side' });
      shell(rig, base, [W * 0.92, 0.3, hood], [0, 0.2, zF - hood / 2], { radius: 0.05, name: 'motor_hood' });
      shell(rig, base, [bw, 0.04, beltLen], [0, deckTop - 0.02, beltCenterZ], { material: 'rubber', radius: 0.01, name: 'belt' });
      rig.rod(base, [-bw / 2, deckTop - 0.01, zR + 0.03], [bw / 2, deckTop - 0.01, zR + 0.03], 0.06, 'chrome', 'rear_roller');
    } else {
      // Piso em arco: tábuas inclinadas que seguem uma parábola, com duas longarinas.
      const n = 9;
      const rise = 0.22;
      const yAt = (t: number) => 0.2 + rise * (2 * t - 1) ** 2; // t em 0..1 ao longo do comprimento
      for (let i = 0; i < n; i++) {
        const t0 = i / n;
        const t1 = (i + 1) / n;
        const za = zR + 0.03 + t0 * beltLen;
        const zb = zR + 0.03 + t1 * beltLen;
        const ya = yAt(t0);
        const yb = yAt(t1);
        const slat = shell(rig, base, [bw, 0.035, Math.hypot(zb - za, yb - ya) + 0.004], [0, (ya + yb) / 2, (za + zb) / 2], {
          material: 'rubber',
          radius: 0.008,
          name: 'belt_slat',
        });
        slat.rotation.x = -Math.atan2(yb - ya, zb - za);
      }
      for (const s of [-1, 1] as const) {
        for (let i = 0; i < n; i++) {
          const za = zR + 0.03 + (i / n) * beltLen;
          const zb = zR + 0.03 + ((i + 1) / n) * beltLen;
          rig.tube(base, [s * (bw / 2 + 0.04), yAt(i / n) - 0.03, za], [s * (bw / 2 + 0.04), yAt((i + 1) / n) - 0.03, zb], [0.06, 0.06], 'frame', 'deck_rail');
        }
      }
      // Corpo em volta do piso: rolos de trás, corpo da frente (onde sobem os montantes) e laterais grossas.
      shell(rig, base, [W * 0.94, 0.34, 0.26], [0, 0.3, zR + 0.15], { radius: 0.07, name: 'rear_body' });
      shell(rig, base, [W * 0.94, 0.5, 0.3], [0, 0.3, zF - 0.17], { radius: 0.08, name: 'front_body' });
      for (const s of [-1, 1] as const) {
        for (let i = 0; i < n; i++) {
          const za = zR + 0.03 + (i / n) * beltLen;
          const zb = zR + 0.03 + ((i + 1) / n) * beltLen;
          const ya = yAt(i / n) - 0.06;
          const yb = yAt((i + 1) / n) - 0.06;
          const side = shell(rig, base, [0.09, 0.14, Math.hypot(zb - za, yb - ya) + 0.004], [s * (W / 2 - 0.045), (ya + yb) / 2, (za + zb) / 2], { radius: 0.03, name: 'deck_side' });
          side.rotation.x = -Math.atan2(yb - ya, zb - za);
        }
      }
      rig.tube(base, [-W / 2 + 0.04, 0.05, zR + 0.12], [W / 2 - 0.04, 0.05, zR + 0.12], 0.06);
      rig.tube(base, [-W / 2 + 0.04, 0.05, zF - 0.1], [W / 2 - 0.04, 0.05, zF - 0.1], 0.06);
    }

    // Quadro de frente e console.
    const cs = consoleSize(p.screen as ScreenKind, W * 0.7);
    const zp = zF - (curved ? 0.12 : hood * 0.62);
    const px = bw / 2 + 0.1;
    const hoodTop = curved ? 0.5 : 0.35;
    const cy = H - 0.5 * (cs.h * Math.cos(p.consoleTilt) + cs.d * Math.sin(p.consoleTilt));
    const consoleZ = zp + (arch ? 0.12 : 0.1);
    const frameG = rig.group('frame_front');
    if (arch) {
      // Arco: sobe pela frente, passa sobre o usuário e desce até a carenagem, com painel lateral.
      for (const s of [-1, 1] as const) {
        rig.path(
          frameG,
          [
            [s * px, hoodTop, zF - 0.3],
            [s * px, H * 0.72, zF - 0.3],
            [s * (px - 0.03), H - 0.07, zF - 0.55],
            [s * (px - 0.03), H - 0.07, zF - 1.0],
            [s * px, H * 0.62, zF - 1.35],
            [s * px, deckTop + 0.02, zF - 1.45],
          ],
          0.075,
          'frame',
          'arch_frame',
          0.2
        );
        // Corpo preto em volta do arco e painel de metal escovado na face externa.
        shell(rig, frameG, [0.16, H * 0.62, L * 0.5], [s * (W / 2 - 0.1), H * 0.33, zF - L * 0.3], { radius: 0.07, name: 'arch_body' });
        rig.box(frameG, [0.03, H * 0.34, L * 0.34], [s * (W / 2 - 0.015), H * 0.34, zF - L * 0.3], 'plate', 'arch_panel');
      }
      rig.tube(frameG, [-px, H - 0.07, zF - 0.55], [px, H - 0.07, zF - 0.55], [0.08, 0.06], 'frame', 'arch_beam');
      for (const s of [-1, 1] as const) rig.rod(frameG, [s * px, H * 0.58, zF - 0.32], [s * px, H * 0.58, zF - 1.0], 0.04, 'rubber', 'handrail');
    } else {
      for (const s of [-1, 1] as const) {
        rig.path(
          frameG,
          [
            [s * px, hoodTop, zp],
            [s * px, H * 0.62, zp + 0.02],
            [s * (px - 0.07), H - cs.h * 0.7, consoleZ - 0.04],
          ],
          0.06,
          'frame',
          'post',
          0.12
        );
        // Corrimão lateral: da altura da cintura para trás.
        rig.rod(frameG, [s * px, H * 0.62, zp + 0.02], [s * px, H * 0.57, zp - (curved ? 0.7 : 0.62)], 0.04, 'rubber', 'handrail');
        rig.rod(frameG, [s * px, H * 0.57, zp - (curved ? 0.7 : 0.62)], [s * px, H * 0.52, zp - (curved ? 0.74 : 0.66)], 0.04, 'rubber', 'handrail_end');
      }
      rig.rod(frameG, [-px, H * 0.62, zp + 0.02], [px, H * 0.62, zp + 0.02], 0.034, 'rubber', 'front_bar');
    }
    consoleHead(rig, frameG, { center: [0, cy, consoleZ], size: cs, tilt: p.consoleTilt });

    // Pessoa de pé sobre a esteira, de frente para o console.
    const standZ = beltCenterZ - 0.1;
    const hipY = (curved ? 0.2 : deckTop) + 0.93;
    root.add(poseAnchor([0, hipY, standZ] as Vec3, { kind: 'standing', tilt: 0, feet: 'floor' }));

    return { root, articulations: [] };
  },
};

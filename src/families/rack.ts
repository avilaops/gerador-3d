/**
 * Família `rack`: suportes sem movimento (barras, anilhas, apoios de piso).
 */
import * as THREE from 'three';
import { z } from 'zod';
import type { FamilyDefinition } from './types';
import { Rig } from '../parts/rig';

export const RACK_VARIANTS = ['bar-holder', 'plate-tree', 'stand'] as const;

export const RackParamsSchema = z.object({
  variant: z.enum(RACK_VARIANTS),
  tube: z.number().positive(),
  /** Níveis de ganchos ou de pinos por lado. */
  tiers: z.number().int().min(1).max(8),
  /** Desenhar algumas anilhas guardadas (só no suporte de anilhas). */
  showPlates: z.boolean(),
});
export type RackParams = z.infer<typeof RackParamsSchema>;

export const rack: FamilyDefinition<RackParams> = {
  id: 'rack',
  label: 'Suporte',
  paramsSchema: RackParamsSchema,

  defaults(_d, spec) {
    const variant = spec.params.variant;
    return {
      variant: 'plate-tree',
      tube: 0.07,
      tiers: variant === 'bar-holder' ? 5 : 3,
      showPlates: true,
    };
  },

  build({ dims, params: p, kit }) {
    const root = new THREE.Group();
    root.name = 'equipment';
    const rig = new Rig(kit, root);
    const { length: L, width: W, height: H } = dims;
    const t = p.tube;
    const y0 = t / 2;
    const base = rig.group('base');
    const frame = rig.group('frame');

    if (p.variant === 'bar-holder') {
      // Duas colunas laterais com ganchos nas duas faces: as barras ficam deitadas, atravessadas em X.
      const ux = W / 2 - t / 2;
      for (const s of [-1, 1] as const) {
        rig.tube(base, [s * ux, y0, -L / 2], [s * ux, y0, L / 2], t);
        rig.foot(base, s * ux, -L / 2 + 0.05, [0.08, 0.08]);
        rig.foot(base, s * ux, L / 2 - 0.05, [0.08, 0.08]);
        rig.tube(frame, [s * ux, 0, 0], [s * ux, H, 0], t, 'frame', `upright_${s < 0 ? 'left' : 'right'}`);
        rig.tube(frame, [s * ux, 0.45 * H, 0], [s * ux, y0, L / 2 - 0.12], 0.05);
        rig.tube(frame, [s * ux, 0.45 * H, 0], [s * ux, y0, -L / 2 + 0.12], 0.05);
        for (let i = 0; i < p.tiers; i++) {
          const y = 0.28 + (i * (H - 0.4)) / Math.max(1, p.tiers - 1);
          for (const dz of [-1, 1] as const) {
            rig.tube(frame, [s * ux, y, dz * (t / 2)], [s * ux, y - 0.02, dz * 0.16], 0.04, 'chrome', 'hook');
            rig.tube(frame, [s * ux, y - 0.02, dz * 0.16], [s * ux, y + 0.05, dz * 0.16], 0.03, 'chrome');
          }
        }
      }
      rig.tube(frame, [-ux, 0.18, 0], [ux, 0.18, 0], t, 'frame', 'crossbar');
      rig.tube(frame, [-ux, H - t / 2, 0], [ux, H - t / 2, 0], t, 'frame', 'top_crossbar');
    } else if (p.variant === 'plate-tree') {
      // Mastro central com pinos para os dois lados (X) e base em H.
      for (const s of [-1, 1] as const) {
        rig.tube(base, [s * (W / 2 - t / 2), y0, -L / 2], [s * (W / 2 - t / 2), y0, L / 2], t);
        rig.foot(base, s * (W / 2 - t / 2), -L / 2 + 0.05, [0.08, 0.08]);
        rig.foot(base, s * (W / 2 - t / 2), L / 2 - 0.05, [0.08, 0.08]);
      }
      rig.tube(base, [-W / 2 + t / 2, y0, 0], [W / 2 - t / 2, y0, 0], t);
      // Mastro de chapa que sobe inclinado para trás e volta em curva no alto.
      const lean = Math.min(0.12, 0.2 * L);
      const mast: [number, number, number][] = [
        [0, 0, lean],
        [0, 0.55 * H, -lean],
        [0, H, lean * 0.4],
      ];
      rig.path(frame, mast, [t, t + 0.04], 'frame', 'mast', 0.5);
      const zAt = (y: number) =>
        y <= 0.55 * H ? lean + ((-2 * lean) * y) / (0.55 * H) : -lean + ((1.4 * lean) * (y - 0.55 * H)) / (0.45 * H);
      const hornLen = Math.max(0.1, W / 2 - t / 2 - 0.02);
      for (let i = 0; i < p.tiers; i++) {
        const y = 0.3 + (i * (H - 0.48)) / Math.max(1, p.tiers - 1);
        for (const s of [-1, 1] as const) {
          rig.horn(frame, [s * (t / 2), y, zAt(y)], [s, 0, 0], hornLen - 0.02, 'storage_horn');
          if (p.showPlates && i === 0) {
            const dia = Math.min(0.45, L - 0.04, 2 * (y - 0.03));
            for (let k = 0; k < 2; k++) rig.plate(frame, [s * (t / 2 + 0.05 + k * 0.045), y, zAt(y)], dia, 0.04);
          }
        }
      }
    } else {
      // Apoio baixo: quadro no piso, rolo de apoio de pé atrás e berços de barra na frente.
      const ux = W / 2 - t / 2;
      for (const s of [-1, 1] as const) {
        rig.tube(base, [s * ux, y0, -L / 2], [s * ux, y0, L / 2], t);
        rig.foot(base, s * ux, -L / 2 + 0.05);
        rig.foot(base, s * ux, L / 2 - 0.05);
      }
      rig.tube(base, [-ux, y0, -L / 2 + t / 2], [ux, y0, -L / 2 + t / 2], t);
      rig.tube(base, [-ux, y0, 0.1 * L], [ux, y0, 0.1 * L], t);
      rig.box(base, [2 * ux - 0.1, 0.02, 0.45 * L], [0, t + 0.01, 0.3 * L - 0.02], 'plate', 'platform');
      const roller = rig.group('foot_roller');
      const yr = Math.min(0.5, H - 0.2);
      for (const s of [-1, 1] as const)
        rig.tube(roller, [s * 0.24, y0, -L / 2 + t / 2], [s * 0.24, yr, -L / 2 + 0.16], 0.05);
      rig.roller(roller, [-0.26, yr, -L / 2 + 0.16], [0.26, yr, -L / 2 + 0.16], 0.13, 'roller');
      for (const s of [-1, 1] as const) {
        rig.tube(frame, [s * ux, 0, 0.1 * L], [s * ux, H - 0.06, 0.1 * L], t, 'frame', `upright_${s < 0 ? 'left' : 'right'}`);
        rig.tube(frame, [s * ux, H - 0.09, 0.1 * L], [s * ux, H - 0.09, 0.1 * L + 0.14], 0.045, 'chrome', 'cradle');
        rig.tube(frame, [s * ux, H - 0.09, 0.1 * L + 0.14], [s * ux, H, 0.1 * L + 0.14], 0.03, 'chrome');
        rig.tube(frame, [s * ux, 0.5 * H, 0.1 * L], [s * ux, y0, 0.1 * L + 0.3], 0.05);
      }
    }

    return { root, articulations: [] };
  },
};

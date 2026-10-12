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
      // Quadro em "A" visto de lado: coluna reta atrás, perna curvada na frente, as duas
      // unidas no alto e por dois degraus; os pinos saem das duas para os dois lados.
      const ux = W / 2 - t / 2;
      const zr = -L / 2 + 0.07;
      const zf = L / 2 - 0.07;
      for (const s of [-1, 1] as const) {
        rig.tube(base, [s * ux, y0, -L / 2], [s * ux, y0, L / 2], t);
        rig.foot(base, s * ux, -L / 2 + 0.05, [0.08, 0.08]);
        rig.foot(base, s * ux, L / 2 - 0.05, [0.08, 0.08]);
      }
      rig.tube(base, [-ux, y0, zr], [ux, y0, zr], t);
      rig.tube(base, [-ux, y0, zf], [ux, y0, zf], t);
      const zTop = zr + 0.3 * (zf - zr);
      const chapa: [number, number] = [t, t + 0.03];
      rig.tube(frame, [0, 0, zr], [0, H - 0.03, zTop - 0.03], chapa, 'frame', 'mast');
      rig.path(
        frame,
        [
          [0, 0, zf],
          [0, 0.5 * H, zf - 0.04],
          [0, H - 0.03, zTop + 0.03],
        ],
        chapa,
        'frame',
        'mast_front',
        0.6
      );
      rig.tube(frame, [0, H - 0.03, zTop - 0.06], [0, H - 0.03, zTop + 0.06], chapa, 'frame', 'mast_cap');
      const zRear = (y: number) => zr + ((zTop - 0.03 - zr) * y) / (H - 0.03);
      const zFront = (y: number) => (y <= 0.5 * H ? zf - (0.04 * y) / (0.5 * H) : zf - 0.04 + ((zTop + 0.03 - zf + 0.04) * (y - 0.5 * H)) / (0.5 * H - 0.03));
      const hornLen = Math.max(0.1, ux - 0.03);
      for (let i = 0; i < p.tiers; i++) {
        const y = 0.26 + (i * (H - 0.46)) / Math.max(1, p.tiers - 1);
        if (i < p.tiers - 1) rig.tube(frame, [0, y + 0.1, zRear(y + 0.1)], [0, y + 0.1, zFront(y + 0.1)], [0.04, 0.06], 'frame', 'rung');
        for (const s of [-1, 1] as const) {
          rig.horn(frame, [s * (t / 2), y, zRear(y)], [s, 0, 0], hornLen, 'storage_horn');
          // Na frente, os pinos ficam só até onde a perna ainda está longe da coluna.
          if (zFront(y) - zRear(y) > 0.2) rig.horn(frame, [s * (t / 2), y, zFront(y)], [s, 0, 0], hornLen, 'storage_horn');
          if (p.showPlates && i === 0) {
            const dia = Math.min(0.45, 2 * (y - 0.03));
            for (let k = 0; k < 2; k++) rig.plate(frame, [s * (t / 2 + 0.05 + k * 0.045), y, zRear(y)], dia, 0.04);
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

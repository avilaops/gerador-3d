/**
 * Família `cable-station`: duas torres com bateria e polia regulável, ligadas
 * por uma viga no alto (crossover, estação multifuncional dupla, cross-smith).
 *
 * As torres ficam nas pontas do comprimento C (eixo Z), como manda a convenção
 * do catálogo; o usuário trabalha no vão entre elas.
 */
import * as THREE from 'three';
import { z } from 'zod';
import type { FamilyDefinition } from './types';
import { Rig } from '../parts/rig';
import { stackTower } from '../parts/assemblies';
import { cable, pulley } from '../parts/primitives';
import type { Articulation } from '../spec/schema';

export const CABLE_VARIANTS = ['crossover', 'dual-pulley', 'cross-smith'] as const;

export const CableStationParamsSchema = z.object({
  variant: z.enum(CABLE_VARIANTS),
  tube: z.number().positive(),
  stackPlates: z.number().int().min(1).max(40),
  stackTravel: z.number().nonnegative(),
  /** Altura do carrinho da polia regulável. */
  pulleyHeight: z.number().positive(),
  /** Curso da barra guiada (cross-smith). */
  barTravel: z.number().nonnegative(),
});
export type CableStationParams = z.infer<typeof CableStationParamsSchema>;

export const cableStation: FamilyDefinition<CableStationParams> = {
  id: 'cable-station',
  label: 'Estação de cabos',
  paramsSchema: CableStationParamsSchema,

  defaults(d, spec) {
    const kg = spec.weightStackKg?.perStack ?? 100;
    return {
      variant: 'crossover',
      tube: 0.07,
      stackPlates: Math.max(6, Math.min(24, Math.round(kg / 9.8))),
      stackTravel: Math.min(0.25, 0.08 * d.height),
      pulleyHeight: 0.72 * d.height,
      barTravel: 0.55,
    };
  },

  build({ dims, params: p, kit }) {
    const root = new THREE.Group();
    root.name = 'equipment';
    const rig = new Rig(kit, root);
    const { length: L, width: W, height: H } = dims;
    const t = p.tube;
    const y0 = t / 2;
    const zt = L / 2 - 0.135;
    const articulations: Articulation[] = [];

    const base = rig.group('base');
    for (const s of [-1, 1] as const) {
      rig.tube(base, [-W / 2, y0, s * (L / 2 - t / 2)], [W / 2, y0, s * (L / 2 - t / 2)], t);
      rig.tube(base, [0, y0, s * (L / 2 - t / 2)], [0, y0, s * (zt - 0.35)], t);
      for (const sx of [-1, 1] as const) rig.foot(base, sx * (W / 2 - 0.06), s * (L / 2 - 0.06));
    }
    if (p.variant !== 'crossover') {
      rig.tube(base, [-(W / 2 - t / 2), y0, -L / 2 + t], [-(W / 2 - t / 2), y0, L / 2 - t], t);
    }

    for (const s of [-1, 1] as const) {
      const suffix = s < 0 ? '_left' : '_right';
      const unit = stackTower(kit, {
        suffix,
        x: 0,
        z: s * zt,
        height: H,
        post: t,
        plates: p.stackPlates,
        travel: p.stackTravel,
      });
      // A carenagem fica do lado de fora; a face da bateria olha para o vão.
      if (s > 0) unit.group.rotation.y = Math.PI;
      root.add(unit.group);
      articulations.push(unit.articulation);

      // Trilho, carrinho da polia e pegada.
      const pg = rig.group(`pulley${suffix}`);
      const zr = s * (zt - 0.19);
      rig.rod(pg, [0, 0.18, zr], [0, H - 0.22, zr], 0.04, 'chrome', 'pulley_rail');
      rig.tube(pg, [0, 0.18, zr], [0, 0.18, s * zt], 0.04);
      rig.tube(pg, [0, H - 0.22, zr], [0, H - 0.22, s * zt], 0.04);
      const yc = Math.min(p.pulleyHeight, H - 0.35);
      rig.box(pg, [0.09, 0.16, 0.09], [0, yc, zr], 'frame', 'pulley_carriage');
      pg.add(pulley(kit, [0, yc, zr - s * 0.09], 0.09, 'x'));
      pg.add(cable(kit, [0, yc, zr - s * 0.09], [0, yc - 0.22, zr - s * 0.16]));
      rig.grip(pg, [-0.06, yc - 0.24, zr - s * 0.16], [0.06, yc - 0.24, zr - s * 0.16], 'handle');
    }

    const frame = rig.group('frame');
    rig.tube(frame, [0, H - t / 2, -zt], [0, H - t / 2, zt], [t, t], 'frame', 'top_beam');
    if (L > 1.4) {
      for (const s of [-1, 1] as const) {
        rig.grip(frame, [0, H - t - 0.01, s * 0.12], [0.02, H - t - 0.01, s * 0.36], 'chin_grip');
        rig.grip(frame, [0, H - t - 0.01, s * 0.42], [0.04, H - t - 0.07, s * 0.6], 'chin_grip');
      }
    }

    if (p.variant === 'cross-smith') {
      const xg = Math.min(0.3, W / 2 - 0.12);
      const zg = zt - 0.42;
      const smith = rig.group('smith');
      for (const s of [-1, 1] as const) {
        rig.rod(smith, [xg, 0.12, s * zg], [xg, H - 0.14, s * zg], 0.035, 'chrome', 'guide_rod');
        rig.tube(smith, [xg, y0, s * zg], [0, y0, s * (zt - 0.2)], 0.05);
        rig.tube(smith, [xg, H - 0.14, s * zg], [0, H - 0.14, s * (zt - 0.2)], 0.05);
        for (let i = 0; i < 6; i++)
          rig.tube(smith, [xg, 0.5 + i * 0.22, s * zg], [xg + 0.07, 0.5 + i * 0.22, s * zg], 0.025, 'chrome', 'catch');
      }
      const barY = Math.min(1.35, H - 0.6);
      const bar = rig.group('bar');
      bar.position.set(xg + 0.06, barY, 0);
      rig.rod(bar, [0, 0, -(zg + 0.3)], [0, 0, zg + 0.3], 0.03, 'chrome', 'bar_shaft');
      for (const s of [-1, 1] as const) {
        rig.rod(bar, [0, 0, s * (zg + 0.06)], [0, 0, s * (zg + 0.3)], 0.05, 'chrome', 'bar_sleeve');
        rig.box(bar, [0.08, 0.1, 0.07], [-0.06, 0, s * zg], 'frame', 'bar_slider');
      }
      articulations.push({
        node: 'bar',
        type: 'prismatic',
        axis: [0, -1, 0],
        pivot: [xg + 0.06, barY, 0],
        range: [0, Math.min(p.barTravel, barY - 0.5)],
        driver: 'phase',
      });
    }

    return { root, articulations };
  },
};

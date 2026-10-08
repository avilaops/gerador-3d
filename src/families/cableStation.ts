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
import { pivotArm, stackTower, weightStack } from '../parts/assemblies';
import { cable, pulley } from '../parts/primitives';
import type { Articulation } from '../spec/schema';

export const CABLE_VARIANTS = ['crossover', 'dual-pulley', 'cross-smith', 'dual-arm'] as const;

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

    if (p.variant === 'dual-arm') {
      // Coluna central com as duas baterias e dois braços que giram para cima e para baixo.
      const base = rig.group('base');
      const cw = Math.min(0.36, 0.34 * W);
      const cd = Math.min(0.56, 0.4 * L);
      for (const sx of [-1, 1] as const)
        for (const sz of [-1, 1] as const) {
          rig.tube(base, [sx * (cw / 2 - 0.04), y0, sz * (cd / 2 - 0.04)], [sx * (W / 2 - 0.04), y0, sz * (cd / 2 + 0.16)], t);
          rig.box(base, [0.12, 0.012, 0.1], [sx * (W / 2 - 0.06), 0.006, sz * (cd / 2 + 0.16)], 'rubber', 'foot');
        }
      const tower = rig.group('tower');
      rig.box(tower, [cw, H - 0.04, 0.03], [0, (H - 0.04) / 2, -cd / 2 + 0.015]);
      rig.box(tower, [cw, H - 0.04, 0.03], [0, (H - 0.04) / 2, cd / 2 - 0.015]);
      rig.box(tower, [0.02, H - 0.04, cd], [-cw / 2 + 0.01, (H - 0.04) / 2, 0]);
      rig.box(tower, [cw, 0.24, cd], [0, H - 0.16, 0], 'frame', 'tower_head');
      rig.box(tower, [cw, 0.1, cd], [0, 0.05, 0], 'frame', 'tower_foot');
      rig.box(tower, [cw + 0.05, 0.035, cd + 0.05], [0, H - 0.0175, 0], 'wood', 'tower_cap');
      rig.box(tower, [0.004, 0.36, cd * 0.62], [cw / 2 + 0.002, H - 0.5, 0], 'label', 'tower_placard');
      const guideHeight = Math.min(0.5 * H, 1.15);
      for (const s of [-1, 1] as const) {
        const suffix = s < 0 ? '_left' : '_right';
        const st = weightStack(kit, {
          x: cw / 2 - 0.09,
          z: s * cd * 0.22,
          plates: Math.min(p.stackPlates, 14),
          plateSize: [0.13, 0.026, 0.2],
          gap: 0.004,
          baseY: 0.14,
          guideHeight,
        });
        st.stack.name = `stack${suffix}`;
        tower.add(st.guides, st.stack);
        articulations.push({
          node: `stack${suffix}`,
          type: 'prismatic',
          axis: [0, 1, 0],
          pivot: [cw / 2 - 0.09, 0, s * cd * 0.22],
          range: [0, Math.min(p.stackTravel, 0.16)],
          driver: 'phase',
        });

        // Braço: do came na lateral da coluna até a polia, apontando para cima e para fora.
        const py = Math.min(1.3, 0.6 * H);
        const pzv = s * (cd / 2 + 0.05);
        const tipY = Math.min(H - 0.06, py + 0.8) - py;
        const tipZ = s * (L / 2 - 0.06) - pzv;
        const name = `arm${suffix}`;
        const arm = pivotArm(kit, name, [0, py, pzv], { axis: 'x', diameter: 0.07, length: cw + 0.06 });
        root.add(arm);
        for (const dx of [-1, 1]) {
          const cam = new THREE.Mesh(kit.disc(0.3, 0.012), kit.materials.plate);
          cam.rotation.z = Math.PI / 2;
          cam.position.set(dx * (cw / 2 + 0.02), 0, 0);
          cam.castShadow = true;
          arm.add(cam);
        }
        rig.tube(arm, [0, 0, 0], [0, tipY, tipZ], [0.05, 0.07], 'accent', `${name}_bar`);
        arm.add(pulley(kit, [0, tipY, tipZ], 0.1, 'x'));
        arm.add(cable(kit, [0, tipY, tipZ], [0, tipY - 0.2, tipZ + s * 0.02]));
        rig.grip(arm, [-0.06, tipY - 0.22, tipZ + s * 0.02], [0.06, tipY - 0.22, tipZ + s * 0.02], `${name}_handle`);
        articulations.push({
          node: name,
          type: 'revolute',
          // A ponta desce: o braço de +Z gira em +X, o de −Z em −X.
          axis: [s, 0, 0],
          pivot: [0, py, pzv],
          range: [0, 1.25],
          driver: 'phase',
        });
      }
      return { root, articulations };
    }

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
      if (p.variant === 'crossover') {
        // Pórtico aberto em A: duas pernas que se fecham no alto, com a bateria no meio.
        const tw = rig.group(`tower${suffix}`);
        const ztw = s * zt;
        for (const sx of [-1, 1] as const) {
          rig.path(
            tw,
            [
              [sx * (W / 2 - 0.04), 0, ztw],
              [sx * 0.17, 0.62 * H, ztw],
              [sx * 0.17, H - t, ztw],
            ],
            [0.05, 0.09],
            'frame',
            'tower_leg',
            0.3
          );
          rig.box(tw, [0.16, 0.012, 0.1], [sx * (W / 2 - 0.08), 0.006, ztw], 'rubber', 'foot');
        }
        rig.tube(tw, [-0.2, H - t / 2, ztw], [0.2, H - t / 2, ztw], t);
        rig.tube(tw, [-0.17, 0.62 * H, ztw], [0.17, 0.62 * H, ztw], 0.05);
        rig.box(tw, [0.3, 0.3, 0.01], [0, 0.62 * H + 0.2, ztw + s * 0.03], 'frame', 'tower_placard');
        const guideHeight = 0.58 * H;
        const st = weightStack(kit, {
          x: 0,
          z: ztw,
          plates: p.stackPlates,
          plateSize: [0.24, 0.03, 0.13],
          gap: 0.005,
          baseY: 0.11,
          guideHeight,
          cableTopY: H - t,
        });
        st.stack.name = `stack${suffix}`;
        tw.add(st.guides, st.stack);
        articulations.push({
          node: `stack${suffix}`,
          type: 'prismatic',
          axis: [0, 1, 0],
          pivot: [0, 0, ztw],
          range: [0, p.stackTravel],
          driver: 'phase',
        });
      } else {
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
      }

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

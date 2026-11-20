/**
 * Família `stair-climber`: simulador de escada (degraus que sobem em direção à torre do console).
 *
 * Usuário olha para +Z: os degraus sobem de trás (−Z) para a torre da frente (+Z).
 * C = comprimento, L = largura, A = topo do console.
 */
import * as THREE from 'three';
import { z } from 'zod';
import type { FamilyDefinition } from '../types';
import { Rig } from '../../parts/rig';
import { poseAnchor } from '../../parts/pose';
import type { Vec3 } from '../../spec/schema';
import { consoleHead, shell } from './shared';

export const StairClimberParamsSchema = z.object({
  /** Quantidade de degraus visíveis. */
  steps: z.number().int().min(4).max(14),
  screen: z.enum(['led', 'tablet']),
});
export type StairClimberParams = z.infer<typeof StairClimberParamsSchema>;

export const stairClimber: FamilyDefinition<StairClimberParams> = {
  id: 'stair-climber',
  label: 'Simulador de escada',
  paramsSchema: StairClimberParamsSchema,

  defaults() {
    return { steps: 9, screen: 'led' };
  },

  build({ dims, params: p, kit }) {
    const root = new THREE.Group();
    root.name = 'equipment';
    const rig = new Rig(kit, root);
    const { length: L, width: W, height: H } = dims;
    const zR = -L / 2;
    const zF = L / 2;
    const base = rig.group('base');
    const bw = W - 0.2; // largura útil dos degraus entre as laterais
    const n = p.steps;
    const towerD = Math.min(0.5, L * 0.32);
    const towerH = H * 0.8;
    const run = (L - towerD - 0.1) / n;
    const rise = (towerH * 0.5) / n;
    const yTop = (i: number) => 0.1 + (i + 1) * rise;

    // Pés.
    for (const s of [-1, 1] as const) for (const z of [zR + 0.12, zF - 0.12]) rig.box(base, [0.1, 0.03, 0.16], [s * (W / 2 - 0.07), 0.015, z], 'rubber', 'foot');

    // Degraus: laterais em escada, pisos de borracha e espelhos.
    const steps = rig.group('steps');
    for (let i = 0; i < n; i++) {
      const z = zR + 0.05 + run * (i + 0.5);
      const y = yTop(i);
      for (const s of [-1, 1] as const) rig.box(steps, [0.1, y, run], [s * (W / 2 - 0.05), y / 2, z], 'frame', 'step_side');
      rig.box(steps, [bw, 0.035, run * 0.95], [0, y - 0.0175, z], 'rubber', 'tread');
      rig.box(steps, [bw, rise, 0.02], [0, y - rise / 2, z - run / 2 + 0.01], 'plate', 'riser');
    }

    // Torre da frente e console.
    const towerZ = zF - towerD / 2;
    shell(rig, base, [W * 0.82, towerH, towerD], [0, towerH / 2, towerZ], { radius: 0.05, name: 'tower' });
    shell(rig, base, [W * 0.5, 0.06, towerD * 0.9], [0, towerH + 0.03, towerZ], { radius: 0.02, name: 'tower_cap' });
    const scr = p.screen === 'led' ? { w: 0.44, h: 0.24, d: 0.08 } : { w: 0.5, h: 0.34, d: 0.06 };
    const tilt = 0.35;
    rig.tube(base, [0, towerH, towerZ], [0, H - scr.h * 0.7, towerZ], [0.14, 0.1], 'frame', 'neck');
    consoleHead(rig, base, { center: [0, H - 0.5 * (scr.h * Math.cos(tilt) + scr.d * Math.sin(tilt)), towerZ - 0.04], size: scr, tilt });

    // Corrimãos laterais: saem da torre e correm para trás, apoiados em colunas.
    const railY = H * 0.5;
    for (const s of [-1, 1] as const) {
      const x = s * (W / 2 - 0.04);
      rig.path(base, [[s * W * 0.3, towerH - 0.08, towerZ - 0.1], [x, railY + 0.12, zF - towerD - 0.06], [x, railY, zR + 0.5], [x, railY - 0.05, zR + 0.34]], 0.04, 'frame', 'handrail', 0.12);
      rig.grip(base, [x, railY, zF - towerD - 0.25], [x, railY - 0.01, zR + 0.52], 'handrail_grip');
      rig.rod(base, [x, railY - 0.04, zR + 0.34], [x, yTop(1), zR + 0.34], 0.035, 'chrome', 'handrail_post');
    }

    const stand = Math.min(n - 1, 3);
    root.add(poseAnchor([0, yTop(stand) + 0.93, zR + 0.05 + run * (stand + 0.5)] as Vec3, { kind: 'standing', tilt: 0, feet: 'floor' }));
    return { root, articulations: [] };
  },
};

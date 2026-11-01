/** Caixa térmica industrial paramétrica: casco, isolamento, ferragens e abertura. */
import * as THREE from 'three';
import { z } from 'zod';
import type { Articulation, Vec3 } from '../spec/schema';
import { Rig } from '../parts/rig';
import type { FamilyDefinition } from './types';

const LIDS = ['top', 'front', 'double'] as const;
const MOBILITY = ['fixed', 'feet', 'casters'] as const;

export const ThermalBoxParamsSchema = z.object({
  lid: z.enum(LIDS),
  mobility: z.enum(MOBILITY),
  dividers: z.number().int().min(0).max(10),
  wallThickness: z.number().positive().max(0.12),
});
export type ThermalBoxParams = z.infer<typeof ThermalBoxParamsSchema>;

function articulation(node: string, axis: Vec3, pivot: Vec3, range: [number, number]): Articulation {
  return { node, type: 'revolute', axis, pivot, range, driver: 'phase' };
}

export const thermalBox: FamilyDefinition<ThermalBoxParams> = {
  id: 'thermal-box',
  label: 'Caixa térmica industrial',
  paramsSchema: ThermalBoxParamsSchema,

  defaults(dims) {
    return {
      lid: 'top',
      mobility: 'fixed',
      dividers: 0,
      wallThickness: Math.min(0.055, Math.max(0.03, Math.min(dims.width, dims.length) * 0.045)),
    };
  },

  build({ dims, params: p, kit }) {
    const root = new THREE.Group();
    root.name = 'equipment';
    const rig = new Rig(kit, root);
    const { width: W, length: L, height: H } = dims;
    const t = Math.min(p.wallThickness, W * 0.16, L * 0.16);
    const lidT = Math.min(0.065, Math.max(0.035, H * 0.065));
    const baseH = p.mobility === 'casters' ? Math.min(0.13, H * 0.18) : p.mobility === 'feet' ? Math.min(0.065, H * 0.1) : 0;
    const bodyH = H - baseH - lidT;
    const bodyBottom = baseH;
    const bodyCenterY = bodyBottom + bodyH / 2;
    const bodyTop = bodyBottom + bodyH;
    const articulations: Articulation[] = [];

    const addLatch = (parent: THREE.Object3D, name: string, center: Vec3) => {
      const latch = rig.group(name, parent);
      rig.box(latch, [Math.min(0.07, W * 0.08), Math.min(0.12, bodyH * 0.18), t * 0.35], center, 'chrome');
    };

    const shell = rig.group('shell');
    rig.box(shell, [W, t, L], [0, bodyBottom + t / 2, 0], 'frame', 'outer_floor');
    rig.box(shell, [t, bodyH, L], [-W / 2 + t / 2, bodyCenterY, 0], 'frame', 'outer_left');
    rig.box(shell, [t, bodyH, L], [W / 2 - t / 2, bodyCenterY, 0], 'frame', 'outer_right');
    rig.box(shell, [W - 2 * t, bodyH, t], [0, bodyCenterY, -L / 2 + t / 2], 'frame', 'outer_back');
    if (p.lid !== 'front') {
      rig.box(shell, [W - 2 * t, bodyH, t], [0, bodyCenterY, L / 2 - t / 2], 'frame', 'outer_front');
    }

    // O liner recua alguns milímetros: a borda clara deixa visível a espessura térmica.
    const liner = rig.group('liner');
    const inset = t * 0.56;
    const innerW = Math.max(t, W - 2 * inset);
    const innerL = Math.max(t, L - 2 * inset);
    const linerT = Math.max(0.006, t * 0.16);
    rig.box(liner, [innerW, linerT, innerL], [0, bodyBottom + t + linerT / 2, 0], 'upholstery', 'liner_floor');
    rig.box(liner, [linerT, bodyH - t, innerL], [-W / 2 + inset, bodyCenterY + t / 2, 0], 'upholstery', 'liner_left');
    rig.box(liner, [linerT, bodyH - t, innerL], [W / 2 - inset, bodyCenterY + t / 2, 0], 'upholstery', 'liner_right');
    rig.box(liner, [innerW, bodyH - t, linerT], [0, bodyCenterY + t / 2, -L / 2 + inset], 'upholstery', 'liner_back');
    if (p.lid !== 'front') {
      rig.box(liner, [innerW, bodyH - t, linerT], [0, bodyCenterY + t / 2, L / 2 - inset], 'upholstery', 'liner_front');
    }

    const rim = rig.group('insulation_rim');
    const rimY = bodyTop - t * 0.22;
    rig.box(rim, [W - 2 * t, t * 0.36, t * 0.38], [0, rimY, -L / 2 + t * 0.72], 'accent');
    rig.box(rim, [W - 2 * t, t * 0.36, t * 0.38], [0, rimY, L / 2 - t * 0.72], 'accent');
    rig.box(rim, [t * 0.38, t * 0.36, L - 2 * t], [-W / 2 + t * 0.72, rimY, 0], 'accent');
    rig.box(rim, [t * 0.38, t * 0.36, L - 2 * t], [W / 2 - t * 0.72, rimY, 0], 'accent');

    for (let i = 0; i < p.dividers; i++) {
      const x = -innerW / 2 + ((i + 1) * innerW) / (p.dividers + 1);
      const divider = rig.group(`divider_${i + 1}`);
      rig.box(divider, [linerT, bodyH * 0.7, innerL - 2 * linerT], [x, bodyBottom + t + bodyH * 0.35, 0], 'upholstery');
    }

    const hinge = rig.group('hinge');
    if (p.lid === 'top') {
      const pivot: Vec3 = [0, bodyTop, -L / 2 + t * 0.4];
      const lid = rig.group('lid');
      lid.position.set(...pivot);
      rig.box(lid, [W, lidT, L], [0, lidT / 2, L / 2 - t * 0.4], 'frame', 'lid_panel');
      rig.box(lid, [W - 2 * t, lidT * 0.24, L - 2 * t], [0, -lidT * 0.08, L / 2 - t * 0.4], 'upholstery', 'lid_liner');
      addLatch(lid, 'latch_left', [-W * 0.28, -lidT * 0.1, L - t * 0.58]);
      addLatch(lid, 'latch_right', [W * 0.28, -lidT * 0.1, L - t * 0.58]);
      rig.rod(hinge, [-W * 0.43, bodyTop, -L / 2 + t * 0.5], [W * 0.43, bodyTop, -L / 2 + t * 0.5], t * 0.34, 'chrome');
      articulations.push(articulation('lid', [1, 0, 0], pivot, [0, -1.75]));
    } else if (p.lid === 'double') {
      const leafW = W / 2;
      const leftPivot: Vec3 = [-W / 2, bodyTop, 0];
      const rightPivot: Vec3 = [W / 2, bodyTop, 0];
      const left = rig.group('lid_left');
      left.position.set(...leftPivot);
      rig.box(left, [leafW, lidT, L], [leafW / 2, lidT / 2, 0], 'frame', 'lid_left_panel');
      addLatch(left, 'latch_left', [leafW * 0.44, -lidT * 0.1, L / 2 - t * 0.18]);
      const right = rig.group('lid_right');
      right.position.set(...rightPivot);
      rig.box(right, [leafW, lidT, L], [-leafW / 2, lidT / 2, 0], 'frame', 'lid_right_panel');
      addLatch(right, 'latch_right', [-leafW * 0.44, -lidT * 0.1, L / 2 - t * 0.18]);
      rig.rod(hinge, [-W / 2 + t * 0.45, bodyTop, -L * 0.42], [-W / 2 + t * 0.45, bodyTop, L * 0.42], t * 0.34, 'chrome');
      rig.rod(hinge, [W / 2 - t * 0.45, bodyTop, -L * 0.42], [W / 2 - t * 0.45, bodyTop, L * 0.42], t * 0.34, 'chrome');
      articulations.push(
        articulation('lid_left', [0, 0, 1], leftPivot, [0, 1.65]),
        articulation('lid_right', [0, 0, 1], rightPivot, [0, -1.65])
      );
    } else {
      const pivot: Vec3 = [0, bodyBottom, L / 2 - t * 0.4];
      const door = rig.group('front_door');
      door.position.set(...pivot);
      rig.box(door, [W - 2 * t, bodyH, lidT], [0, bodyH / 2, -lidT / 2], 'frame', 'front_door_panel');
      addLatch(door, 'latch_left', [-W * 0.28, bodyH * 0.76, -lidT * 0.65]);
      addLatch(door, 'latch_right', [W * 0.28, bodyH * 0.76, -lidT * 0.65]);
      rig.rod(hinge, [-W * 0.42, bodyBottom + t * 0.35, L / 2 - t * 0.5], [W * 0.42, bodyBottom + t * 0.35, L / 2 - t * 0.5], t * 0.34, 'chrome');
      articulations.push(articulation('front_door', [1, 0, 0], pivot, [0, 1.57]));
      // Abertura frontal ainda recebe um tampo térmico fixo.
      rig.box(shell, [W, lidT, L], [0, H - lidT / 2, 0], 'frame', 'fixed_top');
    }

    for (const side of [-1, 1] as const) {
      const label = side < 0 ? 'left' : 'right';
      const handle = rig.group(`handle_${label}`);
      const x = side * (W / 2 - t * 0.18);
      rig.rod(handle, [x, bodyCenterY - 0.09, -L * 0.12], [x, bodyCenterY + 0.09, -L * 0.12], t * 0.3, 'chrome');
      rig.rod(handle, [x, bodyCenterY - 0.09, L * 0.12], [x, bodyCenterY + 0.09, L * 0.12], t * 0.3, 'chrome');
      rig.rod(handle, [x, bodyCenterY + 0.09, -L * 0.12], [x, bodyCenterY + 0.09, L * 0.12], t * 0.3, 'chrome');
    }

    if (p.mobility !== 'fixed') {
      const x = W / 2 - Math.max(t, 0.055);
      const z = L / 2 - Math.max(t, 0.055);
      for (const [sx, sz, name] of [
        [-1, 1, 'front_left'],
        [1, 1, 'front_right'],
        [-1, -1, 'back_left'],
        [1, -1, 'back_right'],
      ] as const) {
        const support = rig.group(`${p.mobility === 'casters' ? 'caster' : 'foot'}_${name}`);
        if (p.mobility === 'feet') {
          rig.box(support, [t * 0.7, baseH, t * 0.7], [sx * x, baseH / 2, sz * z], 'rubber');
        } else {
          rig.box(support, [t * 0.34, baseH * 0.48, t * 0.34], [sx * x, baseH * 0.76, sz * z], 'chrome');
          const wheel = new THREE.Mesh(kit.unitCylinder, kit.materials.rubber);
          wheel.name = 'wheel';
          wheel.scale.set(baseH * 0.55, t * 0.42, baseH * 0.55);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(sx * x, baseH * 0.3, sz * z);
          wheel.castShadow = true;
          support.add(wheel);
        }
      }
    }

    return { root, articulations };
  },
};

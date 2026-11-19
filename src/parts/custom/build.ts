/**
 * Constrói as peças declaradas no spec (`spec.parts`).
 *
 * Reaproveita as primitivas e o `Rig` do gerador, sem alterá-los. Cada peça vira um nó com o
 * nome dado no spec; peças com o mesmo `group` ficam sob um nó comum, posicionado no pivô da
 * articulação de mesmo nome (o `animation.ts` gira e desloca o nó em torno da origem dele, não
 * usa o `pivot` do esquema), com os filhos deslocados por `-pivô` para continuarem no lugar.
 */
import * as THREE from 'three';
import type { PartKit } from '../kit';
import { beam, bentTube, box, pulley } from '../primitives';
import { Rig } from '../rig';
import type { Articulation, CustomPart, CustomParts, Vec3 } from '../../spec/schema';

export interface BuiltCustomParts {
  /** Raiz das peças (`custom_parts`). */
  group: THREE.Group;
  /** Articulações válidas declaradas em `parts.articulations` (só no modo `replace`). */
  articulations: Articulation[];
  /** Problemas que não impedem a geração: nome repetido, articulação sem nó. */
  warnings: string[];
}

function build(kit: PartKit, rig: Rig, holder: THREE.Group, p: CustomPart): THREE.Object3D {
  const material = p.material;
  switch (p.kind) {
    case 'tube':
      return p.points.length > 2
        ? bentTube(kit, p.points as Vec3[], p.size, { name: p.name, material, round: p.round, radius: p.radius })
        : beam(kit, p.points[0] as Vec3, p.points[1] as Vec3, p.size, { name: p.name, material, round: p.round });
    case 'box':
      return box(kit, p.size, p.center, { name: p.name, material });
    case 'cylinder':
      return beam(kit, p.from, p.to, p.diameter, { name: p.name, material, round: true });
    case 'plate': {
      const m = rig.plate(holder, p.center, p.diameter, p.thickness);
      holder.remove(m);
      if (material) m.material = kit.materials[material];
      m.name = p.name;
      return m;
    }
    case 'pad': {
      const m = rig.pad(holder, p.size, p.center, p.tiltX ?? 0, p.name);
      holder.remove(m);
      if (material) m.material = kit.materials[material];
      return m;
    }
    case 'roller': {
      const m = rig.roller(holder, p.from, p.to, p.diameter, p.name);
      holder.remove(m);
      if (material) m.material = kit.materials[material];
      return m;
    }
    case 'pulley': {
      const g = pulley(kit, p.center, p.diameter, p.axis);
      g.name = p.name;
      return g;
    }
  }
}

export function buildCustomParts(kit: PartKit, parts: CustomParts): BuiltCustomParts {
  const root = new THREE.Group();
  root.name = 'custom_parts';
  const rig = new Rig(kit, root);
  const warnings: string[] = [];

  const pivots = new Map<string, Vec3>();
  for (const a of parts.articulations ?? []) pivots.set(a.node, a.pivot as Vec3);

  const nomes = new Set<string>();
  const grupos = new Map<string, THREE.Group>();
  for (const item of parts.items) {
    if (nomes.has(item.name)) warnings.push(`Peça com nome repetido: "${item.name}" (o nome de nó deve ser único)`);
    nomes.add(item.name);

    const obj = build(kit, rig, root, item);
    obj.name = item.name;
    if (!item.group) {
      root.add(obj);
      continue;
    }
    let holder = grupos.get(item.group);
    if (!holder) {
      holder = new THREE.Group();
      holder.name = item.group;
      const pivot = pivots.get(item.group) ?? [0, 0, 0];
      holder.position.set(...pivot);
      grupos.set(item.group, holder);
      root.add(holder);
    }
    // O nó fica no pivô; a peça, que foi construída em coordenadas do equipamento, recua o mesmo tanto.
    obj.position.sub(holder.position);
    holder.add(obj);
  }

  const articulations: Articulation[] = [];
  for (const a of parts.articulations ?? []) {
    if (grupos.has(a.node) || nomes.has(a.node)) articulations.push(a as Articulation);
    else warnings.push(`Articulação para nó inexistente: "${a.node}" (ignorada). Use o nome de uma peça ou de um group.`);
  }
  return { group: root, articulations, warnings };
}

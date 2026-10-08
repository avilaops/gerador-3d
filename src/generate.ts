/**
 * Ponto de entrada do motor: spec → modelo 3D pronto para o viewer, o AR e o Arxis.
 */
import * as THREE from 'three';
import { getFamily } from './families/registry';
import type { DimsM } from './families/types';
import { PartKit } from './parts/kit';
import { buildPhaseClip } from './animation';
import { computeFootprint, type Footprint } from './footprint';
import {
  EquipmentSpecError,
  parseEquipmentSpec,
  type Articulation,
  type EquipmentSpec,
  type EquipmentSpecInput,
} from './spec/schema';

export interface EquipmentStats {
  triangles: number;
  meshes: number;
  geometries: number;
  materials: number;
}

export interface GeneratedEquipment {
  spec: EquipmentSpec;
  /** Grupo raiz, nomeado com o id do spec. Origem no centro da projeção no piso, frente em +Z. */
  object: THREE.Group;
  /** Ciclo do movimento (uma fase vai-e-volta). Ausente se a família não tem articulações. */
  clip?: THREE.AnimationClip;
  /** Articulações efetivas (padrão da família + ajustes do spec), com pivôs no referencial do equipamento. */
  articulations: Articulation[];
  /** Parâmetros de forma efetivos (padrões derivados + spec). */
  params: Record<string, unknown>;
  /** Caixa envolvente em repouso (fase 0). */
  bbox: THREE.Box3;
  /** Desvio relativo da caixa em relação a C × L × A (0.01 = 1%). */
  deviation: { length: number; width: number; height: number };
  footprint: Footprint;
  stats: EquipmentStats;
  warnings: string[];
  /** Libera geometrias e materiais deste modelo. */
  dispose(): void;
}

export class UnsupportedFamilyError extends Error {
  constructor(readonly family: string) {
    super(`Família sem gerador implementado: ${family}`);
    this.name = 'UnsupportedFamilyError';
  }
}

export function generateEquipment(input: EquipmentSpecInput | EquipmentSpec): GeneratedEquipment {
  const spec = parseEquipmentSpec(input);
  const family = getFamily(spec.family);
  if (!family) throw new UnsupportedFamilyError(spec.family);

  const warnings: string[] = [];
  const dims: DimsM = {
    length: spec.dimensionsMm.length / 1000,
    width: spec.dimensionsMm.width / 1000,
    height: spec.dimensionsMm.height / 1000,
  };

  // Parâmetros: padrões derivados das dimensões + o que o spec refinar.
  const defaults = family.defaults(dims, spec) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...defaults };
  for (const [k, v] of Object.entries(spec.params)) {
    if (!(k in defaults)) {
      warnings.push(`Parâmetro desconhecido para ${spec.family}: "${k}" (ignorado)`);
      continue;
    }
    merged[k] = v;
  }
  const parsed = family.paramsSchema.safeParse(merged);
  if (!parsed.success) {
    throw new EquipmentSpecError(
      `Parâmetros inválidos (${spec.id})`,
      parsed.error.issues.map((i) => `params.${i.path.join('.')}: ${i.message}`)
    );
  }
  const params = parsed.data as Record<string, unknown>;

  const kit = new PartKit(spec.materials);
  const { root, articulations: familyArts } = family.build({ spec, dims, params, kit });

  const object = new THREE.Group();
  object.name = spec.id;
  object.add(root);
  object.userData = { equipmentId: spec.id, family: spec.family, name: spec.name };

  // Garante a convenção de origem: apoiado em y = 0 e centrado em x e z.
  object.updateMatrixWorld(true);
  const raw = new THREE.Box3().setFromObject(object, true);
  const offset = new THREE.Vector3(
    -(raw.min.x + raw.max.x) / 2,
    -raw.min.y,
    -(raw.min.z + raw.max.z) / 2
  );
  if (offset.lengthSq() > 1e-8) root.position.add(offset);
  object.updateMatrixWorld(true);

  // Articulações: padrão da família + ajustes do spec.
  const articulations = familyArts.map((a) => ({
    ...a,
    pivot: [
      a.pivot[0] + offset.x,
      a.pivot[1] + offset.y,
      a.pivot[2] + offset.z,
    ] as Articulation['pivot'],
  }));
  for (const o of spec.articulations ?? []) {
    const target = articulations.find((a) => a.node === o.node);
    if (!target) {
      warnings.push(`Articulação para nó inexistente: "${o.node}" (ignorada)`);
      continue;
    }
    if (o.pivot)
      warnings.push(
        `"${o.node}": pivot é definido pela geometria da família; valor do spec ignorado`
      );
    if (o.type && o.type !== target.type)
      warnings.push(`"${o.node}": tipo ${o.type} ignorado (família usa ${target.type})`);
    if (o.axis) target.axis = o.axis;
    if (o.range) target.range = o.range;
  }

  const bbox = new THREE.Box3().setFromObject(object, true);
  const size = bbox.getSize(new THREE.Vector3());
  const deviation = {
    length: size.z / dims.length - 1,
    width: size.x / dims.width - 1,
    height: size.y / dims.height - 1,
  };

  const clip = buildPhaseClip(object, articulations);
  const footprint = computeFootprint(object, spec.trainingClearanceM);

  return {
    spec,
    object,
    clip,
    articulations,
    params,
    bbox,
    deviation,
    footprint,
    stats: collectStats(object),
    warnings,
    dispose: () => kit.dispose(),
  };
}

export function collectStats(root: THREE.Object3D): EquipmentStats {
  let triangles = 0;
  let meshes = 0;
  const geos = new Set<string>();
  const mats = new Set<string>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    meshes++;
    const g = m.geometry;
    triangles += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
    geos.add(g.uuid);
    (Array.isArray(m.material) ? m.material : [m.material]).forEach((mm) => mats.add(mm.uuid));
  });
  return { triangles, meshes, geometries: geos.size, materials: mats.size };
}

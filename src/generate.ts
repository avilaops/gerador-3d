/**
 * Ponto de entrada do motor: spec → modelo 3D pronto para o viewer, o AR e o Arxis.
 */
import * as THREE from 'three';
import { getFamily } from './families/registry';
import type { DimsM } from './families/types';
import { PartKit } from './parts/kit';
import { applyPhase, buildPhaseClip, captureRestPose } from './animation';
import { computeFootprint, type Footprint } from './footprint';
import { evaluateCalibration, type CalibrationReport } from './calibration';
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
  /** Câmera comercial resolvida: o spec pode sobrescrever o enquadramento padrão. */
  camera: NonNullable<EquipmentSpec['camera']>;
  /** Resultado das verificações geométricas executadas após a montagem. */
  quality: QualityReport;
  warnings: string[];
  /** Libera geometrias e materiais deste modelo. */
  dispose(): void;
}

export interface QualityReport {
  valid: boolean;
  floorClearanceM: number;
  dimensionsWithinTolerance: boolean;
  articulationNodesValid: boolean;
  triangleBudget: number;
  motion: {
    maxSize: { length: number; width: number; height: number };
    withinDesignBox: boolean;
    collisions: { node: string; phase: number; other: string }[];
    collisionFree: boolean;
  };
  calibration: CalibrationReport;
  issues: string[];
}

/** Desvio máximo aceito antes de remontar com dimensões de projeto corrigidas. */
const FIT_TOLERANCE = 0.01;
const FIT_ITERATIONS = 4;

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

  const kit = new PartKit(spec.materials);
  const unknown = new Set<string>();

  // Uma montagem: parâmetros (padrões derivados das dimensões + o que o spec refinar) → grupo.
  const buildWith = (design: DimsM) => {
    const defaults = family.defaults(design, spec) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...defaults };
    for (const [k, v] of Object.entries(spec.params)) {
      if (k in defaults) merged[k] = v;
      else unknown.add(k);
    }
    const parsed = family.paramsSchema.safeParse(merged);
    if (!parsed.success) {
      throw new EquipmentSpecError(
        `Parâmetros inválidos (${spec.id})`,
        parsed.error.issues.map((i) => `params.${i.path.join('.')}: ${i.message}`)
      );
    }
    const params = parsed.data as Record<string, unknown>;
    const built = family.build({ spec, dims: design, params, kit });
    built.root.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(built.root, true).getSize(new THREE.Vector3());
    return { ...built, params, size };
  };
  const worst = (size: THREE.Vector3) =>
    Math.max(
      Math.abs(size.z / dims.length - 1),
      Math.abs(size.x / dims.width - 1),
      Math.abs(size.y / dims.height - 1)
    );

  // Ajuste à caixa do catálogo: se alguma peça passa (ou falta) mais de 1%, a
  // família é remontada com dimensões de projeto corrigidas. Assim os tubos
  // continuam com a seção certa, em vez de o modelo ser esticado.
  let design: DimsM = { ...dims };
  let built = buildWith(design);
  for (let i = 0; i < FIT_ITERATIONS && worst(built.size) > FIT_TOLERANCE; i++) {
    design = {
      length: (design.length * dims.length) / built.size.z,
      width: (design.width * dims.width) / built.size.x,
      height: (design.height * dims.height) / built.size.y,
    };
    built = buildWith(design);
  }
  const { root, articulations: familyArts, params } = built;
  unknown.forEach((k) =>
    warnings.push(`Parâmetro desconhecido para ${spec.family}: "${k}" (ignorado)`)
  );
  // Último recurso: o que a remontagem não resolveu é corrigido por escala.
  const scale = new THREE.Vector3(1, 1, 1);
  if (worst(built.size) > FIT_TOLERANCE) {
    scale.set(dims.width / built.size.x, dims.height / built.size.y, dims.length / built.size.z);
    root.scale.copy(scale);
    const pct = Math.round(Math.max(...scale.toArray().map((v) => Math.abs(v - 1))) * 100);
    warnings.push(`Modelo ajustado por escala para caber na caixa do catálogo (até ${pct}%)`);
  }

  const object = new THREE.Group();
  object.name = spec.id;
  object.add(root);
  const catalogSize = Math.max(dims.length, dims.width, dims.height);
  const isCompactSeal = spec.family === 'seal';
  const camera = spec.camera ?? {
    azimuthDeg: isCompactSeal ? 38 : 35,
    elevationDeg: isCompactSeal ? 24 : 18,
    distanceM: isCompactSeal ? Math.max(catalogSize * 2.35, 0.22) : 3,
    target: [0, isCompactSeal ? dims.height * 0.5 : 0.5, 0] as [number, number, number],
  };
  object.userData = {
    equipmentId: spec.id,
    family: spec.family,
    name: spec.name,
    camera,
    lod: spec.lod,
    calibration: spec.calibration,
  };

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
      a.pivot[0] * scale.x + offset.x,
      a.pivot[1] * scale.y + offset.y,
      a.pivot[2] * scale.z + offset.z,
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
  const motion = sampleMotion(object, articulations, dims);
  const calibration = evaluateCalibration(spec.calibration);
  const quality = validateGeneratedEquipment({
    bbox,
    deviation,
    object,
    articulations,
    stats: collectStats(object),
    motion,
    calibration,
  });
  warnings.push(...quality.issues);

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
    camera,
    quality,
    warnings,
    dispose: () => kit.dispose(),
  };
}

/**
 * Gate barato e determinístico para exportação. Não substitui revisão visual:
 * ele captura regressões de escala, piso, nós animados e orçamento de polígonos.
 */
export function validateGeneratedEquipment(input: {
  bbox: THREE.Box3;
  deviation: { length: number; width: number; height: number };
  object: THREE.Object3D;
  articulations: Articulation[];
  stats: EquipmentStats;
  tolerance?: number;
  triangleBudget?: number;
  motion: QualityReport['motion'];
  calibration: CalibrationReport;
}): QualityReport {
  const tolerance = input.tolerance ?? FIT_TOLERANCE * 2;
  const triangleBudget = input.triangleBudget ?? 30_000;
  const issues: string[] = [];
  const dimensionsWithinTolerance =
    Math.abs(input.deviation.length) <= tolerance &&
    Math.abs(input.deviation.width) <= tolerance &&
    Math.abs(input.deviation.height) <= tolerance;
  if (!dimensionsWithinTolerance) issues.push('Dimensões fora da tolerância de validação');
  const floorClearanceM = input.bbox.min.y;
  if (Math.abs(floorClearanceM) > 1e-3) issues.push('Modelo não está apoiado no piso');
  const articulationNodesValid = input.articulations.every((a) => !!input.object.getObjectByName(a.node));
  if (!articulationNodesValid) issues.push('Articulação aponta para nó inexistente');
  if (input.stats.triangles > triangleBudget) issues.push(`Orçamento de triângulos excedido: ${input.stats.triangles}`);
  return {
    valid: issues.length === 0,
    floorClearanceM,
    dimensionsWithinTolerance,
    articulationNodesValid,
    triangleBudget,
    motion: input.motion,
    calibration: input.calibration,
    issues,
  };
}

function sampleMotion(
  object: THREE.Object3D,
  articulations: Articulation[],
  dims: DimsM
): QualityReport['motion'] {
  const rest = captureRestPose(object, articulations);
  const max = new THREE.Vector3();
  const collisions: { node: string; phase: number; other: string }[] = [];
  const baseline = new Set<string>();
  for (const phase of [0, 0.5, 1]) {
    applyPhase(object, articulations, rest, phase);
    object.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(object, true).getSize(new THREE.Vector3());
    max.max(size);
    for (const hit of articulationCollisions(object, articulations, phase)) {
      const key = `${hit.node}|${hit.other}`;
      if (phase === 0) baseline.add(key);
      else if (!baseline.has(key) && !collisions.some((c) => c.node === hit.node && c.other === hit.other)) collisions.push(hit);
    }
  }
  applyPhase(object, articulations, rest, 0);
  object.updateMatrixWorld(true);
  const withinDesignBox =
    max.z <= dims.length * (1 + FIT_TOLERANCE * 2) &&
    max.x <= dims.width * (1 + FIT_TOLERANCE * 2) &&
    max.y <= dims.height * (1 + FIT_TOLERANCE * 2);
  return {
    maxSize: { length: max.z, width: max.x, height: max.y },
    withinDesignBox,
    collisions,
    collisionFree: collisions.length === 0,
  };
}

function articulationCollisions(
  root: THREE.Object3D,
  articulations: Articulation[],
  phase: number
): { node: string; phase: number; other: string }[] {
  const allMeshes: THREE.Mesh[] = [];
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) allMeshes.push(mesh);
  });
  const hits: { node: string; phase: number; other: string }[] = [];
  for (const articulation of articulations) {
    const moving = root.getObjectByName(articulation.node);
    if (!moving) continue;
    const movingMeshes: THREE.Mesh[] = [];
    moving.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh && !isCollisionExempt(mesh)) movingMeshes.push(mesh);
    });
    const movingSet = new Set(movingMeshes);
    for (const movingMesh of movingMeshes) {
      const movingBox = new THREE.Box3().setFromObject(movingMesh, true);
      if (movingBox.isEmpty()) continue;
      for (const other of allMeshes) {
        if (isCollisionExempt(other)) continue;
        if (movingSet.has(other) || moving === other || moving.getObjectById(other.id)) continue;
        const otherBox = new THREE.Box3().setFromObject(other, true);
        const overlap = new THREE.Box3().copy(movingBox).intersect(otherBox);
        const size = overlap.getSize(new THREE.Vector3());
        if (size.x * size.y * size.z > 1e-6) {
          hits.push({ node: articulation.node, phase, other: other.name || other.uuid });
          break;
        }
      }
    }
  }
  return hits;
}

function isCollisionExempt(object: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current.userData.collisionExempt) return true;
    current = current.parent;
  }
  return false;
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

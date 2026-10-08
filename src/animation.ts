/**
 * Animação por fase: uma fase única 0..1 (vai e volta, curva suave) dirige
 * todas as articulações. A mesma função serve ao viewer em tempo real
 * (`applyPhase`) e à exportação (`buildPhaseClip`, um AnimationClip que o GLB
 * carrega).
 */
import * as THREE from 'three';
import type { Articulation } from './spec/schema';

export const DEFAULT_CYCLE_SECONDS = 2.6;

/** Fase suave vai-e-volta: 0 → 1 → 0 ao longo de um ciclo. `u` em ciclos. */
export function phaseAt(u: number): number {
  return (1 - Math.cos(2 * Math.PI * u)) / 2;
}

interface RestPose {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

/** Guarda a pose de repouso (fase 0) de cada nó articulado. */
export function captureRestPose(
  root: THREE.Object3D,
  articulations: Articulation[]
): Map<string, RestPose> {
  const rest = new Map<string, RestPose>();
  for (const a of articulations) {
    const node = root.getObjectByName(a.node);
    if (!node) continue;
    rest.set(a.node, { position: node.position.clone(), quaternion: node.quaternion.clone() });
  }
  return rest;
}

function valueAt(a: Articulation, phase: number): number {
  return a.range[0] + (a.range[1] - a.range[0]) * phase;
}

const _q = new THREE.Quaternion();
const _axis = new THREE.Vector3();

/** Pose de um nó numa fase. Escreve em `outPos`/`outQuat`. */
function poseAt(
  a: Articulation,
  rest: RestPose,
  phase: number,
  outPos: THREE.Vector3,
  outQuat: THREE.Quaternion
) {
  const v = valueAt(a, phase);
  _axis.set(...a.axis).normalize();
  if (a.type === 'revolute') {
    outPos.copy(rest.position);
    // Giro no referencial do pai, em torno da origem do nó (o pivô).
    outQuat.copy(_q.setFromAxisAngle(_axis, v)).multiply(rest.quaternion);
  } else {
    outPos.copy(rest.position).addScaledVector(_axis, v);
    outQuat.copy(rest.quaternion);
  }
}

/** Aplica uma fase (0..1) diretamente na cena. */
export function applyPhase(
  root: THREE.Object3D,
  articulations: Articulation[],
  rest: Map<string, RestPose>,
  phase: number
): void {
  for (const a of articulations) {
    const node = root.getObjectByName(a.node);
    const r = rest.get(a.node);
    if (!node || !r) continue;
    poseAt(a, r, phase, node.position, node.quaternion);
  }
}

/**
 * AnimationClip de um ciclo completo. Faixas por nome de nó
 * (`arm_left.quaternion`, `stack.position`), que é o que o GLTFExporter
 * resolve. Amostrado (não interpolação linear entre extremos) para manter a
 * curva suave no GLB.
 */
export function buildPhaseClip(
  root: THREE.Object3D,
  articulations: Articulation[],
  opts: { duration?: number; samples?: number; name?: string } = {}
): THREE.AnimationClip | undefined {
  const duration = opts.duration ?? DEFAULT_CYCLE_SECONDS;
  const samples = opts.samples ?? 25;
  const rest = captureRestPose(root, articulations);
  const times = Array.from({ length: samples }, (_, i) => (i / (samples - 1)) * duration);
  const tracks: THREE.KeyframeTrack[] = [];
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  for (const a of articulations) {
    const r = rest.get(a.node);
    if (!r) continue;
    const values: number[] = [];
    for (const t of times) {
      poseAt(a, r, phaseAt(t / duration), pos, quat);
      if (a.type === 'revolute') values.push(quat.x, quat.y, quat.z, quat.w);
      else values.push(pos.x, pos.y, pos.z);
    }
    tracks.push(
      a.type === 'revolute'
        ? new THREE.QuaternionKeyframeTrack(`${a.node}.quaternion`, times, values)
        : new THREE.VectorKeyframeTrack(`${a.node}.position`, times, values)
    );
  }
  if (tracks.length === 0) return undefined;
  return new THREE.AnimationClip(opts.name ?? 'movimento', duration, tracks);
}

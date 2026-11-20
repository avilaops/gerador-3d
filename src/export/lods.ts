/**
 * GLB em três níveis de detalhe: o modelo (ficha e AR), o médio (visualizador) e o baixo
 * (simulador com dezenas de equipamentos). Estende `buildLodVariants` (`src/lod.ts`), que
 * já simplifica o modelo; aqui os níveis viram arquivos e ganham orçamento e relatório.
 */
import * as THREE from 'three';
import type { GeneratedEquipment } from '../generate';
import { buildLodVariants } from '../lod';
import { LOD_FILES, withinBudget, type LodLevel } from './budgets';
import { exportGlbObject } from './glb';

export interface LodFile {
  level: LodLevel;
  /** Nome do arquivo dentro da pasta do modelo. */
  file: string;
  triangles: number;
  bytes: number;
  /** O GLB foi comprimido (meshopt) e só abre com o decodificador. */
  compressed: boolean;
  glb: ArrayBuffer;
}

export interface ExportLevelsOptions {
  /**
   * Comprime um GLB. Injetada porque a compressão (`compress.ts`) só roda em Node; assim este
   * módulo continua servindo ao navegador. Sem ela, os arquivos saem sem compressão.
   */
  compress?: (glb: ArrayBuffer) => Promise<ArrayBuffer>;
}

/** Exporta os três níveis, com a mesma animação do modelo em todos. */
export async function exportGlbLevels(eq: GeneratedEquipment, opts: ExportLevelsOptions = {}): Promise<LodFile[]> {
  const variants = await buildLodVariants(eq.object, eq.spec.lod);
  try {
    const out: LodFile[] = [];
    for (const v of variants) {
      const raw = await exportGlbObject(v.object, eq.clip);
      const glb = opts.compress ? await opts.compress(raw) : raw;
      out.push({
        level: v.level,
        file: LOD_FILES[v.level],
        triangles: v.triangles,
        bytes: glb.byteLength,
        compressed: !!opts.compress,
        glb,
      });
    }
    return out;
  } finally {
    variants.forEach((v) => v.dispose());
  }
}

/** Itens que excedem o orçamento do próprio nível. Vazio quando tudo cabe. */
export function levelsOverBudget(files: LodFile[], rawBytes?: Partial<Record<LodLevel, number>>): LodFile[] {
  // O orçamento de bytes é do GLB sem compressão: com compressão, vale o tamanho bruto informado.
  return files.filter((f) => !withinBudget(f.level, f.triangles, rawBytes?.[f.level] ?? f.bytes));
}

export interface LodManifestEntry {
  level: LodLevel;
  file: string;
  triangles: number;
  bytes: number;
  compressed: boolean;
}

/** Campo `lods` do manifesto de um modelo. Só acrescenta: o formato antigo continua válido. */
export function lodManifestEntries(files: LodFile[]): LodManifestEntry[] {
  return files.map(({ level, file, triangles, bytes, compressed }) => ({ level, file, triangles, bytes, compressed }));
}

export interface MeshLoss {
  name: string;
  before: number;
  after: number;
  /** Fração de triângulos perdida, de 0 a 1. */
  lost: number;
}

function meshTriangles(mesh: THREE.Mesh): number {
  const g = mesh.geometry;
  return (g.index?.count ?? g.getAttribute('position').count) / 3;
}

/**
 * O que a simplificação tirou de cada peça. O `SimplifyModifier` costuma apagar peças finas
 * (cabos, hastes cromadas, arames); isto lista as peças que perderam mais que `minLost`.
 * Os dois objetos devem ter a mesma estrutura (a variante é clone do original).
 */
export function describeLodLoss(original: THREE.Object3D, variant: THREE.Object3D, minLost = 0.5): MeshLoss[] {
  const a: THREE.Mesh[] = [];
  const b: THREE.Mesh[] = [];
  original.traverse((o) => (o as THREE.Mesh).isMesh && a.push(o as THREE.Mesh));
  variant.traverse((o) => (o as THREE.Mesh).isMesh && b.push(o as THREE.Mesh));
  if (a.length !== b.length) throw new Error('A variante não tem a mesma estrutura do original.');
  const out: MeshLoss[] = [];
  for (let i = 0; i < a.length; i++) {
    const before = meshTriangles(a[i]);
    const after = meshTriangles(b[i]);
    const lost = before > 0 ? 1 - after / before : 0;
    if (lost >= minLost) out.push({ name: a[i].name || a[i].uuid, before, after, lost });
  }
  return out.sort((x, y) => y.lost - x.lost);
}

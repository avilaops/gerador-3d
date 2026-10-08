/**
 * Gerador 3D paramétrico de equipamentos.
 *
 * spec (dimensões + família + parâmetros) → modelo Three.js com nós nomeados,
 * animação por fase, planta 2D e exportação GLB/USDZ. Ver README.md.
 */
export * from './spec/schema';
export { generateEquipment, collectStats, UnsupportedFamilyError } from './generate';
export type { GeneratedEquipment, EquipmentStats } from './generate';
export { getFamily, implementedFamilies } from './families/registry';
export type { FamilyDefinition, DimsM } from './families/types';
export { PartKit, DEFAULT_COLORS } from './parts/kit';
export * as parts from './parts/primitives';
export * as assemblies from './parts/assemblies';
export {
  phaseAt,
  applyPhase,
  captureRestPose,
  buildPhaseClip,
  DEFAULT_CYCLE_SECONDS,
} from './animation';
export { computeFootprint, convexHull } from './footprint';
export type { Footprint, Point2 } from './footprint';
export { exportGlb } from './export/glb';
export { exportUsdz } from './export/usdz';
export { planSvg } from './export/planSvg';
export { HANDWRITTEN_SPECS } from './specs';

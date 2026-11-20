/**
 * Biblioteca de detalhes: o que separa "modelo" de "produto". Peças baratas em triângulos, com
 * geometria e material compartilhados por kit e chanfros por construção.
 *
 * Esta pasta **não está integrada às famílias** (nem exportada em `src/index.ts`): a integração
 * é feita depois, no ponto em que cada família decidir que detalhes usar.
 */
export { bolt, nut, tubeCap, ferrule, levelerFoot } from './fasteners';
export type { BoltKind, BoltOptions, NutOptions, TubeCapOptions, FerruleOptions, LevelerFootOptions } from './fasteners';
export { weldRing, weldBead } from './welds';
export type { WeldRingOptions, WeldBeadOptions } from './welds';
export { stitchedPad, knurledGrip, foamRoller } from './padding';
export type { StitchedPadOptions, KnurledGripOptions, FoamRollerOptions } from './padding';
export { treadPlate, perforatedPlate, MAX_HOLES } from './plates';
export type { TreadPlateOptions, PerforatedPlateOptions } from './plates';
export { pulleyFork, shackle, carabiner } from './cable';
export type { PulleyForkOptions, ShackleOptions, CarabinerOptions } from './cable';
export { triangleCount, maxDihedralDeg, geometriesOf } from './metrics';

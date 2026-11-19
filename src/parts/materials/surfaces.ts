/**
 * Acabamento de cada papel de material: rugosidade e metal.
 *
 * Os valores seguem o material real, não o aspecto desejado na tela:
 *
 * - Tinta pó (estrutura, acento) é dielétrica: metal perto de zero e rugosidade de
 *   acetinado. Metal alto numa tinta preta a faz refletir o ambiente inteiro e sair cinza.
 * - Vinil e couro sintético são semibrilhantes, mais lisos que um tecido.
 * - Cromado e anilha continuam metálicos.
 */
export type SurfaceRole =
  | 'frame'
  | 'upholstery'
  | 'accent'
  | 'plate'
  | 'chrome'
  | 'rubber'
  | 'cable'
  | 'label'
  | 'wood';

export interface SurfaceSpec {
  readonly roughness: number;
  readonly metalness: number;
}

export const SURFACES: Readonly<Record<SurfaceRole, SurfaceSpec>> = {
  frame: { roughness: 0.5, metalness: 0.05 },
  upholstery: { roughness: 0.58, metalness: 0 },
  accent: { roughness: 0.42, metalness: 0.15 },
  plate: { roughness: 0.35, metalness: 0.7 },
  chrome: { roughness: 0.2, metalness: 0.95 },
  rubber: { roughness: 0.9, metalness: 0 },
  cable: { roughness: 0.5, metalness: 0.6 },
  label: { roughness: 0.5, metalness: 0.2 },
  wood: { roughness: 0.6, metalness: 0 },
};

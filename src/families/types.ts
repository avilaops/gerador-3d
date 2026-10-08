import type * as THREE from 'three';
import type { z } from 'zod';
import type { PartKit } from '../parts/kit';
import type { Articulation, EquipmentSpec, FamilyId } from '../spec/schema';

/** Dimensões do catálogo já em metros. */
export interface DimsM {
  /** C: profundidade (Z). */
  length: number;
  /** L: largura (X). */
  width: number;
  /** A: altura (Y). */
  height: number;
}

export interface FamilyBuildContext<P> {
  spec: EquipmentSpec;
  dims: DimsM;
  params: P;
  kit: PartKit;
}

export interface FamilyBuildResult {
  /** Grupo do equipamento, com os nós nomeados de forma estável. */
  root: THREE.Group;
  /** Articulações padrão da família (antes dos ajustes do spec). */
  articulations: Articulation[];
}

export interface FamilyDefinition<P extends Record<string, unknown>> {
  id: FamilyId;
  label: string;
  /** Schema dos parâmetros de forma (todos os campos com valor). */
  paramsSchema: z.ZodType<P>;
  /** Parâmetros padrão derivados das dimensões: um spec só com dimensões já gera um modelo. */
  defaults(dims: DimsM, spec: EquipmentSpec): P;
  build(ctx: FamilyBuildContext<P>): FamilyBuildResult;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFamilyDefinition = FamilyDefinition<any>;

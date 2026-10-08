/**
 * EquipmentSpec: a descrição de dados de onde nasce cada modelo 3D.
 *
 * Um spec só com `id`, `name`, `family` e `dimensionsMm` já gera um modelo
 * plausível: cada família deriva os parâmetros de forma das dimensões. Os
 * `params` refinam a forma e as `articulations` ajustam o curso do movimento.
 *
 * Convenções (valem para todas as famílias):
 * - metros, Y para cima;
 * - origem no centro da projeção no piso (apoiado em y = 0, centrado em x e z);
 * - frente do equipamento (lado de entrada do usuário) voltada para +Z;
 * - C (length) = profundidade em Z, L (width) = X, A (height) = Y;
 * - a largura considera partes móveis na posição mais aberta (fase 0).
 */
import { z } from 'zod';

export const FAMILY_IDS = [
  'selectorized-tower',
  'plate-loaded-lever',
  'bench',
  'rack',
  'cable-station',
  'leg-press',
] as const;

export const FamilyIdSchema = z.enum(FAMILY_IDS);
export type FamilyId = z.infer<typeof FamilyIdSchema>;

const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
export type Vec3 = z.infer<typeof Vec3Schema>;

const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'cor no formato #rrggbb');

export const ArticulationSchema = z.object({
  /** Nome estável do nó animado (ex.: "arm_left", "stack"). */
  node: z.string().min(1),
  type: z.enum(['revolute', 'prismatic']),
  /** Eixo no referencial do pai do nó. Para revolute, sentido pela regra da mão direita. */
  axis: Vec3Schema,
  /** Origem do nó no referencial do equipamento (informativo: a família posiciona o nó no pivô). */
  pivot: Vec3Schema,
  /** Curso: radianos (revolute) ou metros (prismatic). range[0] corresponde à fase 0 (repouso). */
  range: z.tuple([z.number(), z.number()]),
  driver: z.literal('phase'),
});
export type Articulation = z.infer<typeof ArticulationSchema>;

/**
 * No spec, uma articulação é um ajuste parcial sobre a articulação que a
 * família já define: só `node` é obrigatório. Um nó desconhecido vira aviso.
 */
export const ArticulationOverrideSchema = ArticulationSchema.partial().extend({
  node: z.string().min(1),
});
export type ArticulationOverride = z.infer<typeof ArticulationOverrideSchema>;

export const EquipmentSpecSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  family: FamilyIdSchema,
  dimensionsMm: z.object({
    /** C: profundidade, eixo Z. */
    length: z.number().positive(),
    /** L: largura, eixo X (com partes móveis na posição mais aberta). */
    width: z.number().positive(),
    /** A: altura, eixo Y. */
    height: z.number().positive(),
  }),
  weightStackKg: z
    .object({ perStack: z.number().positive(), stacks: z.number().int().positive() })
    .optional(),
  params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).default({}),
  materials: z
    .object({
      frame: HexColorSchema.optional(),
      upholstery: HexColorSchema.optional(),
      accent: HexColorSchema.optional(),
    })
    .optional(),
  articulations: z.array(ArticulationOverrideSchema).optional(),
  trainingClearanceM: z.number().nonnegative().default(0.6),
  review: z
    .object({
      status: z.enum(['auto', 'needs_review', 'approved']),
      notes: z.string().optional(),
    })
    .optional(),
  /** Metadados livres do catálogo (linha, grupo muscular, foto...). Não afetam a geometria. */
  meta: z.record(z.string(), z.unknown()).optional(),
});

/** Spec já validado (defaults aplicados). */
export type EquipmentSpec = z.infer<typeof EquipmentSpecSchema>;
/** Spec como chega de um JSON (campos com default podem faltar). */
export type EquipmentSpecInput = z.input<typeof EquipmentSpecSchema>;

export class EquipmentSpecError extends Error {
  constructor(
    message: string,
    readonly issues: string[]
  ) {
    super(message);
    this.name = 'EquipmentSpecError';
  }
}

export function parseEquipmentSpec(input: unknown): EquipmentSpec {
  const result = EquipmentSpecSchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.') || '(raiz)'}: ${i.message}`);
    const id = (input as { id?: unknown } | null)?.id;
    throw new EquipmentSpecError(
      `Spec inválido${typeof id === 'string' ? ` (${id})` : ''}`,
      issues
    );
  }
  return result.data;
}

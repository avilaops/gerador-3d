import { z } from 'zod';

/**
 * Contrato visual neutro para caixas térmicas.
 *
 * Os códigos são os mesmos do configurador MRG, mas não carregam semântica
 * industrial adicional. O visualizador só representa o que o editor já pede.
 */
export const ThermalBoxVisualSchema = z.object({
  dimensionsCm: z.object({
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
    depth: z.number().finite().positive(),
  }),
  material: z.string().min(1),
  finish: z.string().min(1),
  lid: z.enum(['superior', 'frontal', 'dupla']),
  mobility: z.enum(['pes', 'rodizios', 'sem_base']),
  dividers: z.number().int().min(0).max(10),
  exteriorColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  frontLogo: z.string().regex(/^data:image\/(webp|png);base64,/).optional(),
});

export type ThermalBoxVisualInput = z.input<typeof ThermalBoxVisualSchema>;
export type ThermalBoxVisual = z.infer<typeof ThermalBoxVisualSchema>;


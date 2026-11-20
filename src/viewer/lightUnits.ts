/**
 * Unidades de luz do Three.js.
 *
 * Até o r154 as luzes direcional e hemisférica tinham um fator π implícito (`useLegacyLights`).
 * Do r155 em diante a iluminação é física, sem esse fator, e o modo legado foi removido no r165.
 * Os valores de intensidade do projeto (rig de luz, caixa térmica) foram calibrados no r149;
 * multiplicados por `LIGHT_UNIT` eles produzem a mesma imagem no r186.
 *
 * O ambiente (PMREM) não é uma luz e não leva o fator.
 */
export const LIGHT_UNIT = Math.PI;

/** Intensidade calibrada no r149 → intensidade para o Three atual. */
export const legacyIntensity = (value: number): number => value * LIGHT_UNIT;

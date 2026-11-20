/**
 * Orçamentos por nível de detalhe, num só lugar.
 *
 * São novos e **separados** do limite que já existe (30 mil triângulos e 1,5 MB por modelo,
 * em `generate.ts` e nos testes): aqueles valem para o modelo padrão de hoje; estes
 * descrevem para onde o detalhe pode crescer quando as frentes de materiais e de detalhes
 * entrarem. Valores iniciais, ajustáveis aqui.
 */
export type LodLevel = 'original' | 'medium' | 'low';

export interface LodBudget {
  maxTriangles: number;
  /** Tamanho máximo do GLB sem compressão, em bytes. */
  maxBytes: number;
}

export const LOD_BUDGETS: Readonly<Record<LodLevel, LodBudget>> = {
  /** Ficha do produto e realidade aumentada. */
  original: { maxTriangles: 120_000, maxBytes: 6 * 1024 * 1024 },
  /** Visualizador de um equipamento. */
  medium: { maxTriangles: 40_000, maxBytes: 2 * 1024 * 1024 },
  /** Simulador, com dezenas de equipamentos na mesma cena. */
  low: { maxTriangles: 10_000, maxBytes: 600 * 1024 },
};

/** Nome do arquivo de cada nível dentro da pasta do modelo. */
export const LOD_FILES: Readonly<Record<LodLevel, string>> = {
  original: 'model.glb',
  medium: 'model.lod1.glb',
  low: 'model.lod2.glb',
};

export function withinBudget(level: LodLevel, triangles: number, bytes: number): boolean {
  const b = LOD_BUDGETS[level];
  return triangles <= b.maxTriangles && bytes <= b.maxBytes;
}

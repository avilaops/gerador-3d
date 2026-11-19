/**
 * Regressão visual: grava a silhueta aprovada de cada modelo numa vista fixa e acusa quando um
 * modelo muda além da tolerância. Aprovar uma mudança é um comando explícito (`aprovar`).
 *
 * Compara **silhuetas**, não cor: mudança de material ou de luz não dispara; mudança de forma,
 * de escala ou de posição sim. É a rede de proteção contra mudar o modelo sem querer (por
 * exemplo na migração do Three.js).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { lerMascaraPng, mascaraParaPng } from './imagem';
import { iou, novaMascara, type Mask } from './mascara';

/** Vista fixa usada nas referências. Mudar isso invalida todas as referências gravadas. */
export const VISTA_REFERENCIA = { azimute: -38, elevacao: 16, distancia: 1.18 } as const;
export const LADO_REFERENCIA = 200;

/** Reduz uma máscara para `n × n` por área (um pixel vale 1 se metade ou mais da área vale 1). */
export function reduzir(mask: Mask, n = LADO_REFERENCIA): Mask {
  const out = novaMascara(n, n);
  const fx = mask.w / n;
  const fy = mask.h / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let soma = 0;
      let total = 0;
      for (let yy = Math.floor(y * fy); yy < Math.max(Math.floor(y * fy) + 1, Math.floor((y + 1) * fy)); yy++)
        for (let xx = Math.floor(x * fx); xx < Math.max(Math.floor(x * fx) + 1, Math.floor((x + 1) * fx)); xx++) {
          soma += mask.data[Math.min(mask.h - 1, yy) * mask.w + Math.min(mask.w - 1, xx)];
          total++;
        }
      out.data[y * n + x] = soma * 2 >= total ? 1 : 0;
    }
  }
  return out;
}

/** Fração da união que difere entre duas máscaras do mesmo tamanho: 0 = iguais, 1 = disjuntas. */
export function diferenca(a: Mask, b: Mask): number {
  return 1 - iou(a, b);
}

export interface ResultadoRegressao {
  id: string;
  situacao: 'ok' | 'mudou' | 'sem-referencia';
  diferenca: number;
}

const arquivo = (dir: string, id: string) => join(dir, `${id}.png`);

/** Grava (ou substitui) a referência aprovada de um modelo. */
export function aprovarReferencia(dir: string, id: string, mask: Mask): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(arquivo(dir, id), mascaraParaPng(reduzir(mask), [0, 0, 0], true));
}

/** Compara a silhueta atual com a referência. A tolerância é a fração máxima da união que pode mudar. */
export async function verificarReferencia(dir: string, id: string, mask: Mask, tolerancia = 0.02): Promise<ResultadoRegressao> {
  const caminho = arquivo(dir, id);
  if (!existsSync(caminho)) return { id, situacao: 'sem-referencia', diferenca: 1 };
  const referencia = await lerMascaraPng(readFileSync(caminho));
  const d = diferenca(referencia, reduzir(mask));
  return { id, situacao: d <= tolerancia ? 'ok' : 'mudou', diferenca: d };
}

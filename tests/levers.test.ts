// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generateEquipment, type EquipmentSpecInput } from '../src';
import { installNodeShims } from '../src/export/nodeShims';

/**
 * Trava de não-regressão (ratchet) para as máquinas do Core: quanto cada modelo é escalado para
 * caber na caixa do catálogo e quantas colisões de movimento ele tem. Os tetos abaixo são o
 * estado de hoje. O teste falha se algum item **piorar** ou se um item **novo** passar a ser
 * escalado ou colidir. Quando um item melhorar, baixe o teto dele (ou remova a linha).
 *
 * Por que há escala: o gerador monta a alavanca a partir de medidas do corpo de quem usa (largura
 * dos rolos, altura das pegadas), e não da caixa do catálogo. Quando o catálogo é menor que isso
 * em algum eixo, sobra escala de malha no fim (com aviso). Tamanho bruto do mecanismo, medido:
 *
 *   LD-WH006 sissy       1330×1000×700  contra 1100×600×700   (largura 1000 contra 600)
 *   LD-WH046 panturrilha 1000×710×622   contra 1000×500×600   (largura 710 contra 500)
 *   LD-WH056 puxada      1300×1219×2300 contra 1300×900×2300  (largura 1219 contra 900)
 *   LD-WH066 remada solo 2000×900×487   contra 2000×900×300   (altura 487 contra 300)
 *   LD-WH058 remada      1300×1000×1112 contra 1300×1000×1000 (altura 1112 contra 1000)
 *   LD-WH001 búlgaro     1469×1000×989  contra 1200×1000×900  (comprimento e altura)
 *   LD-WH047 paralela    1000×870×1500  contra 1000×800×1500  (largura 870 contra 800)
 */
const ESCALA_MAXIMA_PCT: Record<string, number> = {
  'LD-WH001': 18,
  'LD-WH006': 40,
  'LD-WH014': 3,
  'LD-WH023': 2,
  'LD-WH041': 1,
  'LD-WH042': 2,
  'LD-WH043': 2,
  'LD-WH044': 2,
  'LD-WH046': 30,
  'LD-WH047': 8,
  'LD-WH056': 26,
  'LD-WH058': 10,
  'LD-WH066': 38,
};
/** Item sem teto próprio pode ser escalado até este valor (arredondamento). */
const ESCALA_TOLERADA_PCT = 1;

const COLISOES_MAXIMAS: Record<string, number> = {
  'LD-WH015': 1,
  'LD-WH016': 1,
  'LD-WH032': 1,
};

const dir = new URL('../catalogs/ludus-core/specs/', import.meta.url);
const specs = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as EquipmentSpecInput & { id: string });

installNodeShims();

function medir(spec: EquipmentSpecInput) {
  const eq = generateEquipment(spec);
  const s = eq.object.children[0].scale;
  const escalaPct = Math.round(Math.max(Math.abs(s.x - 1), Math.abs(s.y - 1), Math.abs(s.z - 1)) * 100);
  return { escalaPct, colisoes: eq.quality.motion.collisions.length, valido: eq.quality.valid };
}

describe('máquinas do Core: não piorar', () => {
  it('o Core tem os 66 specs', () => {
    expect(specs).toHaveLength(66);
  });

  it.each(specs.map((s) => [s.id, s] as const))('%s: escala e colisões não passam do teto', (id, spec) => {
    const m = medir(spec);
    expect(m.valido).toBe(true);
    expect(m.escalaPct, `escala ${m.escalaPct}%`).toBeLessThanOrEqual(ESCALA_MAXIMA_PCT[id] ?? ESCALA_TOLERADA_PCT);
    expect(m.colisoes, `${m.colisoes} colisão(ões)`).toBeLessThanOrEqual(COLISOES_MAXIMAS[id] ?? 0);
  });

  it('os tetos listados ainda são o estado real: se um item melhorou, o teto precisa baixar', () => {
    const folga: string[] = [];
    for (const spec of specs) {
      const teto = ESCALA_MAXIMA_PCT[spec.id];
      if (teto === undefined) continue;
      const { escalaPct } = medir(spec);
      if (escalaPct < teto - 1) folga.push(`${spec.id}: escala ${escalaPct}% e teto ${teto}%`);
    }
    for (const [id, teto] of Object.entries(COLISOES_MAXIMAS)) {
      const { colisoes } = medir(specs.find((s) => s.id === id)!);
      if (colisoes < teto) folga.push(`${id}: ${colisoes} colisão(ões) e teto ${teto}`);
    }
    expect(folga, 'baixe estes tetos').toEqual([]);
  });
});

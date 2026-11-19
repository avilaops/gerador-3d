// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { acharNaPasta, obterFoto } from '../../scripts/medicao/fotos';
import { lerImagem, lerMascaraPng, mascaraParaPng, sobreposicaoPng } from '../../scripts/medicao/imagem';
import { espelhar, novaMascara, type Mask } from '../../scripts/medicao/mascara';
import { medirItem, type SpecMedido } from '../../scripts/medicao/medir';
import { gerarHtml, ordenar, resumir, type ResultadoItem } from '../../scripts/medicao/relatorio';
import { aprovarReferencia, diferenca, reduzir, verificarReferencia } from '../../scripts/medicao/regressao';

const pastas: string[] = [];
const temp = () => {
  const p = mkdtempSync(join(tmpdir(), 'medicao-test-'));
  pastas.push(p);
  return p;
};
afterAll(() => pastas.forEach((p) => rmSync(p, { recursive: true, force: true })));

function retangulo(w: number, h: number, x0: number, y0: number, x1: number, y1: number): Mask {
  const m = novaMascara(w, h);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m.data[y * w + x] = 1;
  return m;
}
/** Forma em L (assimétrica): barra vertical à esquerda e pé embaixo. */
function ele(w: number, h: number): Mask {
  const m = retangulo(w, h, 0, 0, 0, 0);
  for (let y = 10; y < h - 10; y++) for (let x = 10; x < 25; x++) m.data[y * w + x] = 1;
  for (let y = h - 25; y < h - 10; y++) for (let x = 10; x < w - 30; x++) m.data[y * w + x] = 1;
  return m;
}

describe('imagem', () => {
  it('máscara → PNG → máscara não perde nada', async () => {
    const m = ele(80, 80);
    const volta = await lerMascaraPng(mascaraParaPng(m, [0, 0, 0], true));
    expect(Buffer.from(volta.data).equals(Buffer.from(m.data))).toBe(true);
  });

  it('lê as dimensões e os pixels de um PNG', async () => {
    const px = await lerImagem(mascaraParaPng(retangulo(16, 8, 0, 0, 16, 8), [10, 20, 30], true));
    expect([px.w, px.h]).toEqual([16, 8]);
    expect([...px.data.slice(0, 4)]).toEqual([10, 20, 30, 255]);
  });

  it('a sobreposição pinta só-foto, só-modelo e os dois em cores diferentes', async () => {
    const a = retangulo(10, 10, 0, 0, 6, 10);
    const b = retangulo(10, 10, 4, 0, 10, 10);
    const px = await lerImagem(sobreposicaoPng(a, b));
    const cor = (x: number) => [...px.data.slice(x * 4, x * 4 + 3)].join(',');
    expect(new Set([cor(1), cor(5), cor(8)]).size).toBe(3);
  });
});

describe('fotos', () => {
  it('acharNaPasta ignora maiúsculas e aceita as extensões conhecidas', () => {
    const pasta = temp();
    writeFileSync(join(pasta, 'ld-wh001.WEBP'), 'x');
    expect(acharNaPasta(pasta, 'LD-WH001')).toBe(join(pasta, 'ld-wh001.WEBP'));
    expect(acharNaPasta(pasta, 'LD-WH002')).toBeNull();
    expect(acharNaPasta(join(pasta, 'inexistente'), 'LD-WH001')).toBeNull();
  });

  it('usa o cache e não vai à rede quando a foto já está lá', async () => {
    const cache = temp();
    writeFileSync(join(cache, 'LD-X1.png'), 'bytes-do-cache');
    const bytes = await obterFoto('LD-X1', cache, 'http://origem.invalida.test');
    expect(bytes.toString()).toBe('bytes-do-cache');
  });

  it('lê de uma pasta local de origem e acusa a ausência', async () => {
    const origem = temp();
    writeFileSync(join(origem, 'LD-X2.jpg'), 'da-pasta');
    expect((await obterFoto('LD-X2', temp(), origem)).toString()).toBe('da-pasta');
    await expect(obterFoto('LD-X3', temp(), origem)).rejects.toThrow(/não encontrada/);
  });
});

describe('medirItem', () => {
  const spec: SpecMedido = { id: 'LD-T1', name: 'Teste', family: 'rack', dimensionsMm: { length: 1000, width: 1000, height: 1000 }, params: {} } as unknown as SpecMedido;

  it('escolhe o azimute que bate e detecta a foto espelhada', async () => {
    const foto = mascaraParaPng(ele(200, 200), [0, 0, 0], true);
    const certo = espelhar(ele(200, 200));
    const errado = retangulo(200, 200, 60, 60, 100, 100);
    const renderizador = {
      mascara: async (_s: unknown, v: { azimute: number }) => (v.azimute === 20 ? certo : errado),
    };
    const m = await medirItem(spec, foto, renderizador, [-40, 0, 20, 60], 16);
    expect(m.resultado.azimute).toBe(20);
    expect(m.resultado.espelhado).toBe(true);
    expect(m.resultado.nota).toBeGreaterThan(0.9);
    expect(m.resultado.confiancaFoto).toBeGreaterThan(0.5);
  });

  it('é determinístico', async () => {
    const foto = mascaraParaPng(ele(200, 200), [0, 0, 0], true);
    const r = { mascara: async () => retangulo(200, 200, 20, 20, 150, 180) };
    const a = await medirItem(spec, foto, r, [0, 30]);
    const b = await medirItem(spec, foto, r, [0, 30]);
    expect(a.resultado).toEqual(b.resultado);
  });

  it('sem azimute para testar é erro claro', async () => {
    await expect(medirItem(spec, mascaraParaPng(ele(50, 50), [0, 0, 0], true), { mascara: async () => ele(50, 50) }, [])).rejects.toThrow(/azimute/i);
  });
});

describe('relatório', () => {
  const item = (id: string, nota: number, extra: Partial<ResultadoItem> = {}): ResultadoItem => ({
    id,
    nome: `Nome ${id}`,
    nota,
    iou: nota,
    proporcao: 1,
    regioes: [nota, nota, nota],
    azimute: 0,
    espelhado: false,
    confiancaFoto: 1,
    ...extra,
  });

  it('ordena do pior para o melhor, com desempate por código', () => {
    const o = ordenar([item('B', 0.9), item('A', 0.2), item('C', 0.2)]);
    expect(o.map((i) => i.id)).toEqual(['A', 'C', 'B']);
  });

  it('resume média, mediana e contagens', () => {
    const r = resumir([item('A', 0.2), item('B', 0.5), item('C', 0.9, { confiancaFoto: 0.3 }), item('D', 0, { erro: 'sem foto' })]);
    expect(r.total).toBe(4);
    expect(r.medidos).toBe(3);
    expect(r.media).toBeCloseTo(0.5333, 3);
    expect(r.mediana).toBe(0.5);
    expect(r.abaixoDe06).toBe(2);
    expect(r.fotoDuvidosa).toBe(1);
  });

  it('o HTML lista o pior primeiro e escapa o texto', () => {
    const html = gerarHtml('ludus-core', [item('LD-BOM', 0.9), item('LD-RUIM', 0.1, { nome: '<b>x</b> & "y"' })]);
    expect(html.indexOf('LD-RUIM')).toBeLessThan(html.indexOf('LD-BOM'));
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt; &amp; &quot;y&quot;');
    expect(html).not.toContain('<b>x</b>');
  });

  it('item com erro aparece com a mensagem e não quebra o relatório', () => {
    const html = gerarHtml('ludus', [item('LD-E', 0, { erro: 'Foto de LD-E: HTTP 404.' })]);
    expect(html).toContain('HTTP 404');
  });
});

describe('regressão visual', () => {
  const modelo = () => retangulo(800, 800, 200, 150, 600, 700);

  it('reduzir mantém a forma e dá o tamanho pedido', () => {
    const r = reduzir(modelo(), 200);
    expect([r.w, r.h]).toEqual([200, 200]);
    expect(r.data[100 * 200 + 100]).toBe(1);
    expect(r.data[5 * 200 + 5]).toBe(0);
  });

  it('diferença: 0 para iguais, 1 para disjuntas', () => {
    expect(diferenca(reduzir(modelo()), reduzir(modelo()))).toBe(0);
    expect(diferenca(retangulo(10, 10, 0, 0, 4, 4), retangulo(10, 10, 6, 6, 10, 10))).toBe(1);
  });

  it('sem referência, depois de aprovar passa, e uma mudança de forma é acusada', async () => {
    const dir = temp();
    expect((await verificarReferencia(dir, 'LD-R1', modelo())).situacao).toBe('sem-referencia');
    aprovarReferencia(dir, 'LD-R1', modelo());
    expect((await verificarReferencia(dir, 'LD-R1', modelo())).situacao).toBe('ok');
    const deslocado = retangulo(800, 800, 280, 150, 680, 700);
    const r = await verificarReferencia(dir, 'LD-R1', deslocado);
    expect(r.situacao).toBe('mudou');
    expect(r.diferenca).toBeGreaterThan(0.1);
  });

  it('mudança pequena dentro da tolerância passa; aprovar de novo aceita a mudança', async () => {
    const dir = temp();
    aprovarReferencia(dir, 'LD-R2', modelo());
    const quase = retangulo(800, 800, 204, 150, 604, 700);
    expect((await verificarReferencia(dir, 'LD-R2', quase, 0.05)).situacao).toBe('ok');
    expect((await verificarReferencia(dir, 'LD-R2', quase, 0.001)).situacao).toBe('mudou');
    aprovarReferencia(dir, 'LD-R2', quase);
    expect((await verificarReferencia(dir, 'LD-R2', quase, 0.001)).situacao).toBe('ok');
  });
});

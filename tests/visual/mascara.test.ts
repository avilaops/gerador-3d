// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  caixa,
  comparar,
  espelhar,
  fotoParaMascara,
  iou,
  iouRegioes,
  modeloParaMascara,
  normalizar,
  novaMascara,
  proporcao,
  removerRuido,
  type Mask,
} from '../../scripts/medicao/mascara';

/** Máscara w × h com um retângulo [x0,x1) × [y0,y1) ligado. */
function retangulo(w: number, h: number, x0: number, y0: number, x1: number, y1: number): Mask {
  const m = novaMascara(w, h);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m.data[y * w + x] = 1;
  return m;
}

/** Imagem RGBA a partir de uma função (x, y) → [r,g,b,a]. */
function imagem(w: number, h: number, f: (x: number, y: number) => [number, number, number, number]): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = f(x, y);
      d.set([r, g, b, a], (y * w + x) * 4);
    }
  return d;
}

describe('iou', () => {
  it('iguais dão 1, disjuntas dão 0, vazias dão 0', () => {
    const a = retangulo(20, 20, 2, 2, 12, 12);
    expect(iou(a, a)).toBe(1);
    expect(iou(a, retangulo(20, 20, 14, 14, 19, 19))).toBe(0);
    expect(iou(novaMascara(5, 5), novaMascara(5, 5))).toBe(0);
  });

  it('valor intermediário conhecido: dois quadrados 10 × 10 deslocados 5 dão 1/3', () => {
    const a = retangulo(30, 30, 0, 0, 10, 10);
    const b = retangulo(30, 30, 5, 0, 15, 10);
    expect(iou(a, b)).toBeCloseTo(50 / 150, 9);
  });

  it('tamanhos diferentes são erro, não nota', () => {
    expect(() => iou(novaMascara(4, 4), novaMascara(5, 5))).toThrow(/mesmo tamanho/);
  });
});

describe('caixa, espelhar, removerRuido', () => {
  it('caixa envolvente exclusiva e vazio', () => {
    expect(caixa(retangulo(20, 20, 3, 4, 9, 15))).toEqual({ x0: 3, y0: 4, x1: 9, y1: 15 });
    expect(caixa(novaMascara(5, 5))).toBeNull();
  });

  it('espelhar é uma involução e inverte o lado', () => {
    const l = retangulo(10, 10, 0, 0, 3, 8);
    const e = espelhar(l);
    expect(caixa(e)).toEqual({ x0: 7, y0: 0, x1: 10, y1: 8 });
    expect(Buffer.from(espelhar(e).data).equals(Buffer.from(l.data))).toBe(true);
  });

  it('removerRuido tira o ponto solto e mantém a peça', () => {
    const m = retangulo(30, 30, 5, 5, 20, 20);
    m.data[28 * 30 + 28] = 1;
    removerRuido(m, 4);
    expect(m.data[28 * 30 + 28]).toBe(0);
    expect(m.data[10 * 30 + 10]).toBe(1);
  });
});

describe('normalizar', () => {
  it('é invariante à escala: a mesma forma em dois tamanhos dá a mesma máscara', () => {
    const pequeno = normalizar(retangulo(100, 100, 10, 10, 30, 50));
    const grande = normalizar(retangulo(300, 300, 30, 30, 90, 150));
    expect(iou(pequeno, grande)).toBeGreaterThan(0.98);
  });

  it('mantém a proporção e centraliza', () => {
    const n = normalizar(retangulo(200, 200, 20, 20, 120, 60), 128);
    const c = caixa(n)!;
    const razao = (c.x1 - c.x0) / (c.y1 - c.y0);
    expect(razao).toBeGreaterThan(2.4);
    expect(razao).toBeLessThan(2.6);
    expect(Math.abs(c.x0 - (128 - c.x1))).toBeLessThanOrEqual(1);
    expect(Math.abs(c.y0 - (128 - c.y1))).toBeLessThanOrEqual(1);
  });

  it('máscara vazia continua vazia', () => {
    expect(caixa(normalizar(novaMascara(10, 10)))).toBeNull();
  });
});

describe('proporção e nota', () => {
  it('proporção 1 para a mesma razão de aspecto', () => {
    expect(proporcao(retangulo(100, 100, 0, 0, 20, 40), retangulo(100, 100, 0, 0, 40, 80))).toBeCloseTo(1, 9);
  });

  it('a nota pune forma esticada: 30% de erro de proporção pesa mais que 5%', () => {
    const foto = retangulo(200, 200, 0, 0, 40, 80);
    const quase = comparar(foto, retangulo(200, 200, 0, 0, 42, 80)).nota;
    const esticada = comparar(foto, retangulo(200, 200, 0, 0, 52, 80)).nota;
    expect(quase).toBeGreaterThan(esticada);
    expect(quase).toBeGreaterThan(0.9);
    expect(esticada).toBeLessThan(0.8);
  });

  it('a mesma forma em outra escala tem nota quase 1', () => {
    expect(comparar(retangulo(200, 200, 0, 0, 40, 80), retangulo(400, 400, 0, 0, 120, 240)).nota).toBeGreaterThan(0.97);
  });

  it('máscara vazia dá nota 0 em vez de quebrar', () => {
    expect(comparar(novaMascara(10, 10), retangulo(10, 10, 1, 1, 5, 5)).nota).toBe(0);
  });

  it('as faixas mostram onde diverge: igual no topo, diferente na base', () => {
    const a = normalizar(retangulo(120, 120, 10, 0, 50, 120));
    const b = novaMascara(a.w, a.h);
    // Copia só o terço de cima da forma e deixa o resto vazio.
    for (let y = 0; y < Math.floor(a.h / 3); y++) for (let x = 0; x < a.w; x++) b.data[y * a.w + x] = a.data[y * a.w + x];
    const r = iouRegioes(a, b);
    expect(r[0]).toBeGreaterThan(0.98);
    expect(r[2]).toBe(0);
  });

  it('faixa em que as duas estão vazias devolve null', () => {
    const a = novaMascara(30, 30);
    a.data[1 * 30 + 1] = 1;
    expect(iouRegioes(a, a)[2]).toBeNull();
  });
});

describe('fotoParaMascara', () => {
  const W = 100;
  const branco: [number, number, number, number] = [255, 255, 255, 255];
  const preto: [number, number, number, number] = [10, 10, 10, 255];

  it('segmenta o equipamento, mantém o buraco do quadro e ignora a sombra do piso', () => {
    const rgba = imagem(W, W, (x, y) => {
      if (y >= 88 && y < 95) return [225, 225, 225, 255]; // sombra clara ligada às bordas
      const dentro = x >= 20 && x < 80 && y >= 20 && y < 80;
      const buraco = x >= 40 && x < 60 && y >= 40 && y < 60;
      return dentro && !buraco ? preto : branco;
    });
    const { mask, confianca } = fotoParaMascara(rgba, W, W);
    let n = 0;
    for (const v of mask.data) n += v;
    expect(n).toBe(60 * 60 - 20 * 20);
    expect(mask.data[50 * W + 50]).toBe(0); // o buraco é fundo
    expect(mask.data[90 * W + 50]).toBe(0); // a sombra é fundo
    expect(confianca).toBe(1);
  });

  it('pixel transparente é fundo', () => {
    const rgba = imagem(W, W, (x, y) => (x >= 30 && x < 70 && y >= 30 && y < 70 ? preto : [0, 0, 0, 0]));
    const { mask } = fotoParaMascara(rgba, W, W);
    expect(mask.data[50 * W + 50]).toBe(1);
    expect(mask.data[5 * W + 5]).toBe(0);
  });

  it('confiança baixa quando não há equipamento', () => {
    const { confianca } = fotoParaMascara(imagem(W, W, () => branco), W, W);
    expect(confianca).toBeLessThan(0.5);
  });

  it('confiança reduzida quando o equipamento encosta em duas bordas', () => {
    const rgba = imagem(W, W, (x, y) => (x < 60 && y < 60 ? preto : branco));
    expect(fotoParaMascara(rgba, W, W).confianca).toBeLessThan(0.8);
  });
});

describe('modeloParaMascara', () => {
  it('liga o que difere do fundo além da tolerância', () => {
    const fundo: [number, number, number] = [244, 243, 239];
    const rgba = imagem(10, 10, (x) => (x < 5 ? [244, 243, 239, 255] : [200, 200, 200, 255]));
    const m = modeloParaMascara(rgba, 10, 10, fundo);
    expect(m.data[0]).toBe(0);
    expect(m.data[9]).toBe(1);
    // Ruído de compressão perto do fundo não liga.
    const ruido = imagem(10, 10, () => [246, 242, 238, 255]);
    expect(modeloParaMascara(ruido, 10, 10, fundo).data.every((v) => v === 0)).toBe(true);
  });
});

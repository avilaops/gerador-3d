/**
 * Máscaras de silhueta e a nota foto × modelo. Funções puras: sem navegador, sem disco.
 *
 * A nota existe para ordenar os itens do mais ao menos parecido com a foto, e para medir
 * antes e depois de uma mudança. Ela não aprova nada sozinha.
 *
 * Diferença em relação a `catalogs/ludus/silhueta.py`: lá cada contorno é recortado na
 * própria caixa, o que apaga a diferença de proporção entre foto e modelo, que é um erro
 * comum. Aqui a proporção entra na nota (`proporcao`).
 */

export interface Mask {
  w: number;
  h: number;
  /** 1 = equipamento, 0 = fundo. */
  data: Uint8Array;
}

export interface Caixa {
  x0: number;
  y0: number;
  /** Exclusivos: a caixa cobre [x0, x1) × [y0, y1). */
  x1: number;
  y1: number;
}

export type RGB = [number, number, number];

export function novaMascara(w: number, h: number): Mask {
  return { w, h, data: new Uint8Array(w * h) };
}

const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const saturacao = (r: number, g: number, b: number) => {
  const mx = Math.max(r, g, b);
  return mx === 0 ? 0 : (Math.max(r, g, b) - Math.min(r, g, b)) / mx;
};
const distancia = (r: number, g: number, b: number, c: RGB) => Math.hypot(r - c[0], g - c[1], b - c[2]);

/** Cor de fundo estimada: mediana por canal do anel de 2 px da borda. */
export function corDeFundo(rgba: ArrayLike<number>, w: number, h: number): RGB {
  const r: number[] = [];
  const g: number[] = [];
  const b: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x >= 2 && y >= 2 && x < w - 2 && y < h - 2) continue;
      const o = (y * w + x) * 4;
      if (rgba[o + 3] < 128) continue;
      r.push(rgba[o]);
      g.push(rgba[o + 1]);
      b.push(rgba[o + 2]);
    }
  }
  const med = (v: number[]) => (v.length ? v.sort((p, q) => p - q)[Math.floor(v.length / 2)] : 255);
  return [med(r), med(g), med(b)];
}

export interface OpcoesFoto {
  /** Distância de cor (RGB) a partir da qual um pixel ligado à borda ainda é fundo. */
  tolerancia?: number;
  /** Distância de cor para um pixel ser fundo mesmo sem ligação com a borda (buracos do quadro). */
  toleranciaEstrita?: number;
}

export interface MascaraFoto {
  mask: Mask;
  fundo: RGB;
  /** 0 a 1. Baixa quando a segmentação provavelmente falhou. Nunca esconda uma nota por isso: reporte. */
  confianca: number;
}

/**
 * Silhueta do equipamento numa foto de estúdio de fundo liso.
 *
 * 1. Sombra do piso: pixels claros e quase sem cor, **ligados à borda**, são fundo.
 * 2. Buracos vistos através do quadro: pixels com a cor do fundo, mesmo isolados, são fundo.
 * 3. Equipamento branco ou prata muito claro pode perder partes; é uma limitação conhecida.
 */
export function fotoParaMascara(rgba: ArrayLike<number>, w: number, h: number, opts: OpcoesFoto = {}): MascaraFoto {
  const tol = opts.tolerancia ?? 40;
  const tolEstrita = opts.toleranciaEstrita ?? 18;
  const fundo = corDeFundo(rgba, w, h);
  const px = (i: number) => {
    const o = i * 4;
    return [rgba[o], rgba[o + 1], rgba[o + 2], rgba[o + 3]] as const;
  };
  const frouxo = (i: number) => {
    const [r, g, b, a] = px(i);
    return a < 128 || distancia(r, g, b, fundo) <= tol || (luma(r, g, b) >= 215 && saturacao(r, g, b) <= 0.08);
  };
  const estrito = (i: number) => {
    const [r, g, b, a] = px(i);
    return a < 128 || distancia(r, g, b, fundo) <= tolEstrita;
  };

  const alcancado = new Uint8Array(w * h);
  const pilha: number[] = [];
  const semear = (x: number, y: number) => {
    const i = y * w + x;
    if (!alcancado[i] && frouxo(i)) {
      alcancado[i] = 1;
      pilha.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    semear(x, 0);
    semear(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    semear(0, y);
    semear(w - 1, y);
  }
  while (pilha.length) {
    const i = pilha.pop()!;
    const x = i % w;
    const y = (i - x) / w;
    if (x > 0) semear(x - 1, y);
    if (x < w - 1) semear(x + 1, y);
    if (y > 0) semear(x, y - 1);
    if (y < h - 1) semear(x, y + 1);
  }

  const mask = novaMascara(w, h);
  for (let i = 0; i < w * h; i++) mask.data[i] = alcancado[i] || estrito(i) ? 0 : 1;
  removerRuido(mask, Math.max(4, Math.floor(w * h * 0.0005)));

  const c = caixa(mask);
  let ocupados = 0;
  for (let i = 0; i < mask.data.length; i++) ocupados += mask.data[i];
  const fracao = ocupados / (w * h);
  let confianca = 1;
  if (!c || fracao < 0.02 || fracao > 0.7) confianca = 0.3;
  else {
    const toca = (c.x0 === 0 ? 1 : 0) + (c.y0 === 0 ? 1 : 0) + (c.x1 === w ? 1 : 0) + (c.y1 === h ? 1 : 0);
    if (toca >= 2) confianca *= 0.6;
    if (((c.x1 - c.x0) * (c.y1 - c.y0)) / (w * h) < 0.1) confianca *= 0.7;
  }
  return { mask, fundo, confianca };
}

/** Silhueta de um render do modelo sobre fundo de cor conhecida (sem sombra de piso). */
export function modeloParaMascara(rgba: ArrayLike<number>, w: number, h: number, fundo: RGB, tol = 14): Mask {
  const mask = novaMascara(w, h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    mask.data[i] = distancia(rgba[o], rgba[o + 1], rgba[o + 2], fundo) > tol ? 1 : 0;
  }
  return mask;
}

/** Remove componentes conexos (4 vizinhos) menores que `minimo` pixels. */
export function removerRuido(mask: Mask, minimo: number): void {
  const { w, h, data } = mask;
  const visto = new Uint8Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (!data[s] || visto[s]) continue;
    const comp: number[] = [s];
    visto[s] = 1;
    for (let k = 0; k < comp.length; k++) {
      const i = comp[k];
      const x = i % w;
      const y = (i - x) / w;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (data[j] && !visto[j]) {
          visto[j] = 1;
          comp.push(j);
        }
      }
    }
    if (comp.length < minimo) for (const i of comp) data[i] = 0;
  }
}

export function caixa(mask: Mask): Caixa | null {
  let x0 = mask.w;
  let y0 = mask.h;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < mask.h; y++) {
    for (let x = 0; x < mask.w; x++) {
      if (!mask.data[y * mask.w + x]) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x + 1 > x1) x1 = x + 1;
      if (y + 1 > y1) y1 = y + 1;
    }
  }
  return x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : null;
}

/**
 * Recorta na caixa, encaixa num quadro `n × n` mantendo a proporção (1 px de margem) e centraliza.
 * A reamostragem é por área: um pixel do destino vale 1 se metade ou mais da área de origem vale 1.
 */
export function normalizar(mask: Mask, n = 128): Mask {
  const out = novaMascara(n, n);
  const c = caixa(mask);
  if (!c) return out;
  const bw = c.x1 - c.x0;
  const bh = c.y1 - c.y0;
  const escala = (n - 2) / Math.max(bw, bh);
  const tw = Math.max(1, Math.round(bw * escala));
  const th = Math.max(1, Math.round(bh * escala));
  const ox = Math.floor((n - tw) / 2);
  const oy = Math.floor((n - th) / 2);
  for (let y = 0; y < th; y++) {
    const sy0 = c.y0 + (y * bh) / th;
    const sy1 = c.y0 + ((y + 1) * bh) / th;
    for (let x = 0; x < tw; x++) {
      const sx0 = c.x0 + (x * bw) / tw;
      const sx1 = c.x0 + ((x + 1) * bw) / tw;
      let soma = 0;
      let total = 0;
      for (let yy = Math.floor(sy0); yy < Math.max(Math.floor(sy0) + 1, Math.ceil(sy1)); yy++) {
        for (let xx = Math.floor(sx0); xx < Math.max(Math.floor(sx0) + 1, Math.ceil(sx1)); xx++) {
          soma += mask.data[Math.min(mask.h - 1, yy) * mask.w + Math.min(mask.w - 1, xx)];
          total++;
        }
      }
      out.data[(oy + y) * n + ox + x] = soma * 2 >= total ? 1 : 0;
    }
  }
  return out;
}

/** Interseção sobre união de duas máscaras do mesmo tamanho (0 se ambas vazias). */
export function iou(a: Mask, b: Mask): number {
  if (a.w !== b.w || a.h !== b.h) throw new Error('As máscaras precisam ter o mesmo tamanho.');
  let inter = 0;
  let uniao = 0;
  for (let i = 0; i < a.data.length; i++) {
    const p = a.data[i];
    const q = b.data[i];
    inter += p & q;
    uniao += p | q;
  }
  return uniao === 0 ? 0 : inter / uniao;
}

export function espelhar(mask: Mask): Mask {
  const out = novaMascara(mask.w, mask.h);
  for (let y = 0; y < mask.h; y++)
    for (let x = 0; x < mask.w; x++) out.data[y * mask.w + x] = mask.data[y * mask.w + (mask.w - 1 - x)];
  return out;
}

/** Razão entre as proporções (largura / altura) das caixas: 1 = mesma proporção. */
export function proporcao(a: Mask, b: Mask): number {
  const ca = caixa(a);
  const cb = caixa(b);
  if (!ca || !cb) return 0;
  const ra = (ca.x1 - ca.x0) / (ca.y1 - ca.y0);
  const rb = (cb.x1 - cb.x0) / (cb.y1 - cb.y0);
  return Math.min(ra, rb) / Math.max(ra, rb);
}

/**
 * IoU por faixas horizontais de mesma altura, de cima para baixo, já com as máscaras
 * normalizadas. Mostra **onde** o modelo diverge (topo, meio ou base). `null` na faixa
 * em que as duas estão vazias.
 */
export function iouRegioes(a: Mask, b: Mask, faixas = 3): (number | null)[] {
  const out: (number | null)[] = [];
  for (let f = 0; f < faixas; f++) {
    const y0 = Math.floor((f * a.h) / faixas);
    const y1 = Math.floor(((f + 1) * a.h) / faixas);
    let inter = 0;
    let uniao = 0;
    for (let y = y0; y < y1; y++)
      for (let x = 0; x < a.w; x++) {
        const p = a.data[y * a.w + x];
        const q = b.data[y * a.w + x];
        inter += p & q;
        uniao += p | q;
      }
    out.push(uniao === 0 ? null : inter / uniao);
  }
  return out;
}

export interface Nota {
  /** `iou × proporcao`: o número usado para ordenar. */
  nota: number;
  /** IoU das silhuetas normalizadas, sem penalizar a proporção. */
  iou: number;
  proporcao: number;
  regioes: (number | null)[];
}

/** Compara a silhueta da foto com a do modelo (máscaras no tamanho original, antes de normalizar). */
export function comparar(foto: Mask, modelo: Mask, n = 128): Nota {
  if (!caixa(foto) || !caixa(modelo)) return { nota: 0, iou: 0, proporcao: 0, regioes: [null, null, null] };
  const a = normalizar(foto, n);
  const b = normalizar(modelo, n);
  const i = iou(a, b);
  const p = proporcao(foto, modelo);
  return { nota: i * p, iou: i, proporcao: p, regioes: iouRegioes(a, b) };
}

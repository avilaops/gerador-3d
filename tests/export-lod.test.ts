// @vitest-environment node
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { getBounds } from '@gltf-transform/core';
import validator from 'gltf-validator';
import { HANDWRITTEN_SPECS, exportGlb, generateEquipment, type GeneratedEquipment } from '../src';
import { installNodeShims } from '../src/export/nodeShims';
import { LOD_BUDGETS, LOD_FILES, withinBudget } from '../src/export/budgets';
import { compressMeshopt, readGlb } from '../src/export/compress';
import { describeLodLoss, exportGlbLevels, levelsOverBudget, lodManifestEntries, type LodFile } from '../src/export/lods';
import { buildLodVariants } from '../src/lod';

const spec = (catalog: string, id: string) =>
  JSON.parse(readFileSync(new URL(`../catalogs/${catalog}/specs/${id}.json`, import.meta.url), 'utf8'));

let itens: { id: string; eq: GeneratedEquipment }[] = [];

beforeAll(() => {
  installNodeShims();
  itens = [
    { id: 'LD-B004', eq: generateEquipment(HANDWRITTEN_SPECS.find((s) => s.id === 'LD-B004')!) },
    { id: 'LD-WH021', eq: generateEquipment(spec('ludus-core', 'LD-WH021')) },
    { id: 'LD-A044', eq: generateEquipment(spec('ludus', 'LD-A044')) },
    { id: 'LD-WH013', eq: generateEquipment(spec('ludus-core', 'LD-WH013')) },
  ];
});

const erros = async (glb: ArrayBuffer) =>
  (await validator.validateBytes(new Uint8Array(glb))).issues.messages.filter((m: { severity: number }) => m.severity === 0);

describe('orçamentos', () => {
  it('cada nível é mais apertado que o anterior, em triângulos e em bytes', () => {
    expect(LOD_BUDGETS.low.maxTriangles).toBeLessThan(LOD_BUDGETS.medium.maxTriangles);
    expect(LOD_BUDGETS.medium.maxTriangles).toBeLessThan(LOD_BUDGETS.original.maxTriangles);
    expect(LOD_BUDGETS.low.maxBytes).toBeLessThan(LOD_BUDGETS.medium.maxBytes);
    expect(LOD_BUDGETS.medium.maxBytes).toBeLessThan(LOD_BUDGETS.original.maxBytes);
  });

  it('o arquivo do nível original continua sendo o model.glb de sempre', () => {
    expect(LOD_FILES.original).toBe('model.glb');
    expect(new Set(Object.values(LOD_FILES)).size).toBe(3);
  });

  it('withinBudget confere triângulos e bytes', () => {
    expect(withinBudget('low', 5_000, 100_000)).toBe(true);
    expect(withinBudget('low', 10_001, 100_000)).toBe(false);
    expect(withinBudget('low', 5_000, 700 * 1024)).toBe(false);
  });
});

describe('exportGlbLevels', () => {
  it.each(['LD-B004', 'LD-WH021', 'LD-A044', 'LD-WH013'])('%s: três níveis em ordem, cada vez menores e dentro do orçamento', async (id) => {
    const { eq } = itens.find((i) => i.id === id)!;
    const f = await exportGlbLevels(eq);
    expect(f.map((x) => x.level)).toEqual(['original', 'medium', 'low']);
    expect(f.map((x) => x.file)).toEqual(['model.glb', 'model.lod1.glb', 'model.lod2.glb']);
    // Nunca cresce de um nível para o próximo. Não se exige redução fixa: com a proteção de
    // silhueta (cada malha mantém o tamanho), o banco LD-A044 não reduz quase nada (95%).
    expect(f[1].triangles).toBeLessThanOrEqual(f[0].triangles);
    expect(f[2].triangles).toBeLessThanOrEqual(f[1].triangles);
    expect(levelsOverBudget(f)).toEqual([]);
    f.forEach((x) => expect(x.compressed).toBe(false));
  });

  it('um modelo com muitas peças reduz de verdade: o nível baixo do LD-B004 fica abaixo de 85%', async () => {
    const f = await exportGlbLevels(itens[0].eq);
    expect(f[2].triangles).toBeLessThan(f[0].triangles * 0.85);
    expect(f[1].triangles).toBeLessThan(f[0].triangles);
  });

  it('o nível original é idêntico ao GLB que o gerador sempre exportou', async () => {
    const { eq } = itens[0];
    const [original] = await exportGlbLevels(eq);
    const antigo = await exportGlb(eq);
    expect(Buffer.from(original.glb).equals(Buffer.from(antigo))).toBe(true);
  });

  it.each(['LD-B004', 'LD-WH021'])('%s: os três níveis passam no validador da Khronos', async (id) => {
    const f = await exportGlbLevels(itens.find((i) => i.id === id)!.eq);
    for (const x of f) expect(await erros(x.glb), x.level).toEqual([]);
  });

  it('a animação e os nós nomeados sobrevivem em todos os níveis', async () => {
    const { eq } = itens[0];
    for (const x of await exportGlbLevels(eq)) {
      const doc = await readGlb(x.glb);
      expect(doc.getRoot().listAnimations(), x.level).toHaveLength(1);
      const nomes = new Set(doc.getRoot().listNodes().map((n) => n.getName()));
      for (const a of eq.articulations) expect(nomes.has(a.node), `${x.level}:${a.node}`).toBe(true);
    }
  });

  it('a caixa envolvente se mantém nos níveis simplificados (±3%)', async () => {
    const { eq } = itens[1];
    const tamanho = async (glb: ArrayBuffer) => {
      const b = getBounds((await readGlb(glb)).getRoot().listScenes()[0]);
      return [0, 1, 2].map((i) => b.max[i] - b.min[i]);
    };
    const [o, m, l] = await exportGlbLevels(eq);
    const ref = await tamanho(o.glb);
    for (const x of [m, l]) {
      const s = await tamanho(x.glb);
      for (let i = 0; i < 3; i++) expect(Math.abs(s[i] / ref[i] - 1), `${x.level} eixo ${i}`).toBeLessThan(0.03);
    }
  });

  it('não altera o modelo original nem as outras variantes', async () => {
    const { eq } = itens[2];
    const antes = eq.stats.triangles;
    await exportGlbLevels(eq);
    const apos = generateEquipment(spec('ludus', 'LD-A044'));
    expect(apos.stats.triangles).toBe(antes);
  });
});

describe('compressão meshopt', () => {
  it('o GLB comprimido não é maior, passa na Khronos e declara a extensão', async () => {
    const glb = await exportGlb(itens[1].eq);
    const comp = await compressMeshopt(glb);
    expect(comp.byteLength).toBeLessThanOrEqual(glb.byteLength);
    expect(await erros(comp)).toEqual([]);
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(comp, 20, new DataView(comp).getUint32(12, true))));
    // A quantização acompanha a compressão e precisa estar declarada, senão o GLB é inválido.
    expect(json.extensionsUsed).toEqual(expect.arrayContaining(['EXT_meshopt_compression', 'KHR_mesh_quantization']));
  });

  it('preserva animação, nomes de nó e a caixa envolvente (±0,5%)', async () => {
    const glb = await exportGlb(itens[0].eq);
    const comp = await compressMeshopt(glb);
    const [a, b] = await Promise.all([readGlb(glb), readGlb(comp)]);
    expect(b.getRoot().listAnimations()).toHaveLength(a.getRoot().listAnimations().length);
    expect(b.getRoot().listNodes().map((n) => n.getName()).sort()).toEqual(a.getRoot().listNodes().map((n) => n.getName()).sort());
    const ba = getBounds(a.getRoot().listScenes()[0]);
    const bb = getBounds(b.getRoot().listScenes()[0]);
    for (let i = 0; i < 3; i++) {
      const ref = ba.max[i] - ba.min[i];
      expect(Math.abs((bb.max[i] - bb.min[i]) / ref - 1), `eixo ${i}`).toBeLessThan(0.005);
    }
  });

  it('os níveis comprimidos são marcados como comprimidos e continuam dentro do orçamento de triângulos', async () => {
    const f = await exportGlbLevels(itens[0].eq, { compress: compressMeshopt });
    f.forEach((x) => expect(x.compressed).toBe(true));
    expect(levelsOverBudget(f)).toEqual([]);
    for (const x of f) expect(await erros(x.glb), x.level).toEqual([]);
  });
});

describe('o que some em cada nível', () => {
  it('lista as peças que perderam mais triângulos, da pior para a menos pior', async () => {
    const { eq } = itens[1];
    const [orig, , baixo] = await buildLodVariants(eq.object, eq.spec.lod);
    const perdas = describeLodLoss(orig.object, baixo.object, 0.5);
    expect(perdas.length).toBeGreaterThan(0);
    for (let i = 1; i < perdas.length; i++) expect(perdas[i - 1].lost).toBeGreaterThanOrEqual(perdas[i].lost);
    perdas.forEach((p) => {
      expect(p.lost).toBeGreaterThanOrEqual(0.5);
      expect(p.lost).toBeLessThanOrEqual(1);
      expect(p.after).toBeLessThanOrEqual(p.before);
    });
    baixo.dispose();
  });

  it('o limiar filtra e o nível original não perde nada', async () => {
    const { eq } = itens[1];
    const [orig, medio] = await buildLodVariants(eq.object, eq.spec.lod);
    expect(describeLodLoss(orig.object, orig.object, 0.01)).toEqual([]);
    expect(describeLodLoss(orig.object, medio.object, 0.9).length).toBeLessThanOrEqual(describeLodLoss(orig.object, medio.object, 0.3).length);
    medio.dispose();
  });

  it('estruturas diferentes são erro, não relatório errado', () => {
    const a = new THREE.Group().add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
    const b = new THREE.Group();
    expect(() => describeLodLoss(a, b)).toThrow(/mesma estrutura/);
  });
});

describe('manifesto', () => {
  const arquivo = (level: LodFile['level'], triangles: number, bytes: number): LodFile => ({
    level,
    file: LOD_FILES[level],
    triangles,
    bytes,
    compressed: false,
    glb: new ArrayBuffer(bytes),
  });

  it('lodManifestEntries só leva metadados, nunca o buffer do GLB', () => {
    const e = lodManifestEntries([arquivo('original', 8000, 400_000), arquivo('low', 2000, 100_000)]);
    expect(e).toEqual([
      { level: 'original', file: 'model.glb', triangles: 8000, bytes: 400_000, compressed: false },
      { level: 'low', file: 'model.lod2.glb', triangles: 2000, bytes: 100_000, compressed: false },
    ]);
    expect(JSON.stringify(e)).not.toContain('glb":{');
  });

  it('levelsOverBudget acusa o nível que passa do orçamento e respeita os bytes brutos informados', () => {
    const grande = arquivo('low', 12_000, 100_000);
    expect(levelsOverBudget([grande]).map((x) => x.level)).toEqual(['low']);
    const pesado = arquivo('low', 2_000, 700 * 1024);
    expect(levelsOverBudget([pesado]).map((x) => x.level)).toEqual(['low']);
    expect(levelsOverBudget([pesado], { low: 100_000 })).toEqual([]);
  });
});

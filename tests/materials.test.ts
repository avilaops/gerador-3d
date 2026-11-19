// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import validator from 'gltf-validator';
import { HANDWRITTEN_SPECS, exportGlb, exportUsdz, generateEquipment } from '../src';
import { installNodeShims } from '../src/export/nodeShims';
import { PartKit } from '../src/parts/kit';
import { bentTube } from '../src/parts/primitives';
import { SURFACES, TILE_M, heightToNormalPixels, leatherHeight } from '../src/parts/materials';

const ROLES = ['frame', 'upholstery', 'accent', 'plate', 'chrome', 'rubber', 'cable', 'label', 'wood'] as const;
const GLB_BUDGET_BYTES = 1.5 * 1024 * 1024;

beforeAll(() => installNodeShims());

describe('papéis de material', () => {
  it('os nove papéis continuam existindo, cada um com o próprio nome (o viewer e o simulador dependem disso)', () => {
    const kit = new PartKit();
    expect(Object.keys(kit.materials).sort()).toEqual([...ROLES].sort());
    for (const role of ROLES) expect(kit.materials[role].name).toBe(role);
    kit.dispose();
  });

  it('tinta pó é dielétrica e cromado é metálico', () => {
    expect(SURFACES.frame.metalness).toBeLessThanOrEqual(0.1);
    expect(SURFACES.accent.metalness).toBeLessThanOrEqual(0.2);
    expect(SURFACES.chrome.metalness).toBeGreaterThanOrEqual(0.9);
    expect(SURFACES.chrome.roughness).toBeLessThanOrEqual(0.25);
  });

  it('o kit aplica os valores de SURFACES', () => {
    const kit = new PartKit();
    for (const role of ROLES) {
      expect(kit.materials[role].roughness).toBe(SURFACES[role].roughness);
      expect(kit.materials[role].metalness).toBe(SURFACES[role].metalness);
    }
    kit.dispose();
  });

  it('o estofado leva o normal map de couro quando há canvas', () => {
    const kit = new PartKit();
    expect(kit.materials.upholstery.normalMap).toBeTruthy();
    expect(kit.materials.upholstery.normalMap?.wrapS).toBe(THREE.RepeatWrapping);
    expect(kit.materials.frame.normalMap).toBeNull();
    kit.dispose();
  });
});

describe('couro procedural', () => {
  it('é determinístico: duas gerações dão os mesmos pixels', () => {
    const a = heightToNormalPixels(leatherHeight(64, 8, 7), 64);
    const b = heightToNormalPixels(leatherHeight(64, 8, 7), 64);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it('a semente muda o padrão', () => {
    const a = heightToNormalPixels(leatherHeight(64, 8, 7), 64);
    const c = heightToNormalPixels(leatherHeight(64, 8, 8), 64);
    expect(Buffer.from(a).equals(Buffer.from(c))).toBe(false);
  });

  it('as normais têm comprimento 1 e apontam para fora da superfície', () => {
    const px = heightToNormalPixels(leatherHeight(64, 8, 7), 64);
    for (let i = 0; i < px.length; i += 4) {
      const x = (px[i] / 255) * 2 - 1;
      const y = (px[i + 1] / 255) * 2 - 1;
      const z = (px[i + 2] / 255) * 2 - 1;
      expect(Math.abs(Math.hypot(x, y, z) - 1)).toBeLessThan(0.03);
      expect(z).toBeGreaterThan(0);
    }
  });

  it('é tileável: a emenda não é mais abrupta que o interior', () => {
    const size = 64;
    const h = leatherHeight(size, 8, 7);
    const col = (x: number, x2: number) => {
      let s = 0;
      for (let y = 0; y < size; y++) s += Math.abs(h[y * size + x] - h[y * size + x2]);
      return s / size;
    };
    let interior = 0;
    for (let x = 0; x < size - 1; x++) interior = Math.max(interior, col(x, x + 1));
    expect(col(size - 1, 0)).toBeLessThanOrEqual(interior * 1.5);
  });
});

describe('UV em metros', () => {
  it('caixa arredondada: o mesmo grão em peça grande e pequena', () => {
    const kit = new PartKit();
    const range = (g: THREE.BufferGeometry) => {
      const uv = g.getAttribute('uv') as THREE.BufferAttribute;
      let max = 0;
      for (let i = 0; i < uv.count; i++) max = Math.max(max, Math.abs(uv.getX(i)), Math.abs(uv.getY(i)));
      return max;
    };
    const big = range(kit.roundedBox(0.5, 0.1, 0.2, 0.02));
    const small = range(kit.roundedBox(0.1, 0.1, 0.1, 0.02));
    // O UV é posição / TILE_M. Meia aresta da caixa grande é 0,25 m (menos o raio de 0,02 m nos
    // cantos arredondados); a da pequena é 0,05 m. O mesmo ladrilho cobre as duas na mesma escala.
    expect(big).toBeGreaterThan((0.25 - 0.02) / TILE_M);
    expect(big).toBeLessThanOrEqual(0.25 / TILE_M + 1e-6);
    expect(small).toBeGreaterThan((0.05 - 0.02) / TILE_M);
    expect(small).toBeLessThanOrEqual(0.05 / TILE_M + 1e-6);
    expect(big / small).toBeGreaterThan(3.5);
    kit.dispose();
  });

  it('tubo dobrado: UV não degenerado, u cresce ao longo do eixo e v dá a volta na seção', () => {
    const kit = new PartKit();
    const group = bentTube(kit, [[0, 0, 0], [0, 0.6, 0], [0.4, 0.9, 0]], 0.05);
    const geo = (group.children[0] as THREE.Mesh).geometry;
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
    let uMax = 0;
    let vMax = 0;
    for (let i = 0; i < uv.count; i++) {
      uMax = Math.max(uMax, uv.getX(i));
      vMax = Math.max(vMax, uv.getY(i));
    }
    // Comprimento do eixo ≥ 1,0 m; perímetro de seção quadrada de 0,05 m ≈ 0,2 m.
    expect(uMax).toBeGreaterThan(1.0 / TILE_M);
    expect(vMax).toBeCloseTo(0.2 / TILE_M, 0);
    kit.dispose();
  });

  it('tubo dobrado: nenhum triângulo atravessa a emenda do v', () => {
    const kit = new PartKit();
    const size = 0.05;
    for (const round of [false, true]) {
      const group = bentTube(kit, [[0, 0, 0], [0, 0.6, 0], [0.4, 0.9, 0]], size, { round });
      const geo = (group.children[0] as THREE.Mesh).geometry;
      const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
      const index = geo.getIndex()!;
      for (let t = 0; t < index.count; t += 3) {
        const v = [0, 1, 2].map((k) => uv.getY(index.getX(t + k)));
        // Um salto de v pela emenda valeria o perímetro inteiro (≥ 0,15 m); o passo entre vértices vizinhos é bem menor.
        expect(Math.max(...v) - Math.min(...v)).toBeLessThan((size * 1.0) / TILE_M);
      }
    }
    kit.dispose();
  });

  it('tubo dobrado: continua fechado, com normais unitárias', () => {
    const kit = new PartKit();
    const geo = (bentTube(kit, [[0, 0, 0], [0, 0.6, 0]], 0.05).children[0] as THREE.Mesh).geometry;
    const nor = geo.getAttribute('normal') as THREE.BufferAttribute;
    for (let i = 0; i < nor.count; i++) {
      expect(Number.isFinite(nor.getX(i) + nor.getY(i) + nor.getZ(i))).toBe(true);
      expect(Math.abs(Math.hypot(nor.getX(i), nor.getY(i), nor.getZ(i)) - 1)).toBeLessThan(1e-3);
    }
    kit.dispose();
  });
});

describe('exportação com o novo material', () => {
  // Gerado depois de instalar o canvas: sem canvas o estofado sai liso, por projeto.
  let eq: ReturnType<typeof generateEquipment>;
  beforeAll(() => {
    installNodeShims();
    eq = generateEquipment(HANDWRITTEN_SPECS[0]);
  });

  it('GLB com normal map passa na Khronos e cabe no orçamento', async () => {
    const glb = await exportGlb(eq);
    expect(glb.byteLength).toBeLessThanOrEqual(GLB_BUDGET_BYTES);
    const report = await validator.validateBytes(new Uint8Array(glb));
    const erros = report.issues.messages.filter((m: { severity: number }) => m.severity === 0);
    expect(erros, JSON.stringify(erros.slice(0, 3))).toHaveLength(0);
  });

  it('o GLB leva a textura de normal do couro', async () => {
    const glb = await exportGlb(eq);
    const json = JSON.parse(
      new TextDecoder().decode(new Uint8Array(glb, 20, new DataView(glb).getUint32(12, true)))
    ) as { materials: { name: string; normalTexture?: unknown }[] };
    const couro = json.materials.find((m) => m.name === 'upholstery');
    expect(couro?.normalTexture).toBeTruthy();
    expect(json.materials.find((m) => m.name === 'frame')?.normalTexture).toBeUndefined();
  });

  it('USDZ continua sendo gerado', async () => {
    const usdz = new Uint8Array(await exportUsdz(eq));
    expect(new TextDecoder().decode(usdz.subarray(0, 200))).toContain('model.usda');
  });
});

// @vitest-environment node
// GLTFLoader decodifica o cabeçalho do GLB via TextDecoder; em jsdom isso quebra.
import { describe, it, expect, beforeAll } from 'vitest';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { generateEquipment, HANDWRITTEN_SPECS, exportGlb, exportUsdz, planSvg } from '../src';
import { installNodeShims } from '../src/export/nodeShims';
import validator from 'gltf-validator';

const GLB_BUDGET_BYTES = 1.5 * 1024 * 1024;

beforeAll(() => installNodeShims());

describe.each(HANDWRITTEN_SPECS.map((s) => [s.id, s] as const))('exportação %s', (_id, spec) => {
  const eq = generateEquipment(spec);

  it('GLB com animação, nós nomeados e dentro do orçamento de tamanho', async () => {
    const glb = await exportGlb(eq);
    expect(glb.byteLength).toBeLessThanOrEqual(GLB_BUDGET_BYTES);
    expect(new TextDecoder().decode(new Uint8Array(glb, 0, 4))).toBe('glTF');

    const gltf = await new Promise<{
      scene: import('three').Group;
      animations: import('three').AnimationClip[];
    }>((resolve, reject) => new GLTFLoader().parse(glb, '', resolve as never, reject));
    expect(gltf.animations).toHaveLength(1);
    expect(gltf.animations[0].tracks.length).toBe(eq.articulations.length);
    for (const a of eq.articulations)
      expect(gltf.scene.getObjectByName(a.node), a.node).toBeTruthy();
    expect(gltf.scene.getObjectByName(spec.id)).toBeTruthy();
  });

  it('GLB passa no validador da Khronos sem erro', async () => {
    const report = await validator.validateBytes(new Uint8Array(await exportGlb(eq)));
    const erros = report.issues.messages.filter((m: { severity: number }) => m.severity === 0);
    expect(erros, JSON.stringify(erros.slice(0, 3))).toHaveLength(0);
  });

  it('USDZ é um zip com o model.usda', async () => {
    const usdz = new Uint8Array(await exportUsdz(eq));
    expect(usdz[0]).toBe(0x50); // 'P'
    expect(usdz[1]).toBe(0x4b); // 'K'
    expect(new TextDecoder().decode(usdz.subarray(0, 200))).toContain('model.usda');
  });

  it('planta SVG com silhueta, área de treino e cotas do catálogo', () => {
    const svg = planSvg(eq);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('class="eq-zone"');
    expect((svg.match(/class="eq-part"/g) ?? []).length).toBeGreaterThan(10);
    expect(svg).toContain(`L ${spec.dimensionsMm.width} mm`);
    expect(svg).toContain(`C ${spec.dimensionsMm.length} mm`);
    expect(svg).toMatch(/área de treino · [\d,]+ × [\d,]+ m · [\d,]+ m²/);
  });
});

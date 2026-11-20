// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import * as THREE from 'three';
import validator from 'gltf-validator';
import { beforeAll, describe, expect, it } from 'vitest';
import { exportGlb, generateEquipment, type EquipmentSpecInput } from '../src';
import { installNodeShims } from '../src/export/nodeShims';
import { toSpec, type CardioProduct } from '../catalogs/ludus-cardio/classify';

beforeAll(() => installNodeShims());

const TRIANGLE_BUDGET = 30_000;
const GLB_BUDGET_BYTES = 1_500_000;
const products = JSON.parse(readFileSync(new URL('../catalogs/ludus-cardio/products.json', import.meta.url), 'utf8')) as CardioProduct[];
const specs = products.map((p) => toSpec(p)!);

describe('catálogo Ludus Cardio', () => {
  it('tem os 28 produtos LD-C001 a LD-C028, sem repetir código', () => {
    expect(products).toHaveLength(28);
    expect(products.map((p) => p.code)).toEqual(Array.from({ length: 28 }, (_, i) => `LD-C${String(i + 1).padStart(3, '0')}`));
    expect(products.every((p) => p.linha === 'Ludus Cardio' && p.dim.every((v) => v > 0))).toBe(true);
  });

  it('todo produto tem família e as famílias batem com a contagem da planilha', () => {
    expect(specs.every(Boolean)).toBe(true);
    const por: Record<string, number> = {};
    for (const s of specs) por[s.family] = (por[s.family] ?? 0) + 1;
    expect(por).toEqual({ 'stair-climber': 1, treadmill: 7, bike: 13, elliptical: 7 });
    const variantes = (fam: string) =>
      specs.filter((s) => s.family === fam).reduce<Record<string, number>>((a, s) => ((a[String(s.params?.variant)] = (a[String(s.params?.variant)] ?? 0) + 1), a), {});
    expect(variantes('bike')).toEqual({ upright: 5, recumbent: 5, spin: 3 });
    expect(variantes('treadmill')).toEqual({ standard: 5, arch: 1, curved: 1 });
    expect(variantes('elliptical')).toEqual({ 'rear-drive': 5, adaptive: 2 });
  });

  it('os specs gravados no catálogo são os que o classify gera hoje', () => {
    const dir = new URL('../catalogs/ludus-cardio/specs/', import.meta.url);
    const gravados = readdirSync(dir).filter((f) => f.endsWith('.json'));
    expect(gravados).toHaveLength(28);
    for (const s of specs) {
      const g = JSON.parse(readFileSync(new URL(`${s.id}.json`, dir), 'utf8')) as EquipmentSpecInput;
      expect(g, s.id).toEqual(JSON.parse(JSON.stringify(s)));
    }
  });
});

describe.each(specs.map((s) => [s.id, s] as const))('%s', (id, spec) => {
  const eq = generateEquipment(spec);
  const box = new THREE.Box3().setFromObject(eq.object, true);

  it('gera um modelo válido dentro do orçamento, sem escala maior que 2%', () => {
    expect(eq.quality.valid, eq.quality.issues.join('; ')).toBe(true);
    expect(eq.stats.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET);
    const escala = eq.warnings.find((w) => w.includes('ajustado por escala'));
    if (escala) expect(Number(/até (\d+)%/.exec(escala)![1])).toBeLessThanOrEqual(2);
  });

  it('cabe na caixa do catálogo (±2%) e apoia no piso, centrado', () => {
    const d = spec.dimensionsMm;
    const size = box.getSize(new THREE.Vector3());
    expect(Math.abs(size.z / (d.length / 1000) - 1)).toBeLessThan(0.02);
    expect(Math.abs(size.x / (d.width / 1000) - 1)).toBeLessThan(0.02);
    expect(Math.abs(size.y / (d.height / 1000) - 1)).toBeLessThan(0.02);
    expect(Math.abs(box.min.y)).toBeLessThan(1e-4);
    expect(Math.abs((box.min.x + box.max.x) / 2)).toBeLessThan(0.01);
  });

  it('tem a marca de pose e a pessoa fica dentro do equipamento', () => {
    const pose = eq.object.getObjectByName('pose_hip');
    expect(pose, id).toBeDefined();
    const p = new THREE.Vector3().setFromMatrixPosition(pose!.matrixWorld);
    expect(p.y).toBeGreaterThan(0.5);
    expect(p.y).toBeLessThan(box.max.y + 0.2);
    expect(p.z).toBeGreaterThan(box.min.z);
    expect(p.z).toBeLessThan(box.max.z);
  });

  it('o console fica à frente (+Z) do centro, voltado para quem usa', () => {
    const c = eq.object.getObjectByName('console');
    if (!c) return; // a escada e o spinning têm display próprio, sem grupo `console`
    expect(new THREE.Vector3().setFromMatrixPosition(c.matrixWorld).z).toBeGreaterThan(0);
  });
});

describe('exportação', () => {
  it.each(['LD-C001', 'LD-C003', 'LD-C006', 'LD-C008', 'LD-C011', 'LD-C013', 'LD-C019', 'LD-C023', 'LD-C027'])(
    '%s: GLB válido na Khronos e abaixo de 1,5 MB',
    async (id) => {
      const eq = generateEquipment(specs.find((s) => s.id === id)!);
      const glb = await exportGlb(eq);
      expect(glb.byteLength).toBeLessThan(GLB_BUDGET_BYTES);
      const report = await validator.validateBytes(new Uint8Array(glb));
      const erros = report.issues.messages.filter((m: { severity: number }) => m.severity === 0);
      expect(erros, JSON.stringify(erros.slice(0, 3))).toHaveLength(0);
    }
  );
});

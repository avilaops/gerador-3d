// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { generateEquipment, implementedFamilies, type EquipmentSpecInput } from '../src';

const TOL = 0.02;
const TRIANGLE_BUDGET = 30_000;
const ROOT = 'catalogs';

const specs: [string, EquipmentSpecInput][] = [];
for (const catalog of existsSync(ROOT) ? readdirSync(ROOT) : []) {
  const dir = join(ROOT, catalog, 'specs');
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    const spec = JSON.parse(readFileSync(join(dir, f), 'utf8')) as EquipmentSpecInput;
    specs.push([`${catalog}/${spec.id}`, spec]);
  }
}

describe('catálogos', () => {
  it('todas as famílias do schema têm gerador', () => {
    expect(implementedFamilies().sort()).toEqual(
      ['bench', 'cable-station', 'leg-press', 'plate-loaded-lever', 'rack', 'selectorized-tower']
    );
  });

  it('o catálogo Ludus tem os 94 specs', () => {
    expect(specs.filter(([k]) => k.startsWith('ludus/')).length).toBe(94);
  });
});

describe.each(specs)('%s', (_key, spec) => {
  const eq = generateEquipment(spec);

  it('caixa envolvente dentro de ±2% de C × L × A', () => {
    expect(Math.abs(eq.deviation.length)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(eq.deviation.width)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(eq.deviation.height)).toBeLessThanOrEqual(TOL);
  });

  it('apoiado no piso, centrado e dentro do orçamento de triângulos', () => {
    const c = eq.bbox.getCenter(new THREE.Vector3());
    expect(Math.abs(eq.bbox.min.y)).toBeLessThan(1e-3);
    expect(Math.abs(c.x)).toBeLessThan(1e-3);
    expect(Math.abs(c.z)).toBeLessThan(1e-3);
    expect(eq.stats.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET);
  });

  it('toda articulação aponta para um nó que existe', () => {
    for (const a of eq.articulations) expect(eq.object.getObjectByName(a.node), a.node).toBeTruthy();
  });

  it('nenhum parâmetro do spec é desconhecido para a família', () => {
    expect(eq.warnings.filter((w) => w.startsWith('Parâmetro desconhecido'))).toEqual([]);
  });
});

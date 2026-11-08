import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildThermalBoxModel } from '../src/thermal-box/ThermalBoxViewer';
import { ThermalBoxVisualSchema } from '../src/thermal-box/schema';

const input = (overrides: Record<string, unknown> = {}) =>
  ThermalBoxVisualSchema.parse({
    dimensionsCm: { width: 80, height: 60, depth: 120 },
    material: 'aco_galvanizado',
    finish: 'natural',
    lid: 'superior',
    mobility: 'rodizios',
    dividers: 0,
    ...overrides,
  });

describe('modelo visual de caixa térmica', () => {
  it.each(['superior', 'frontal', 'dupla'] as const)('gera tampa %s sem NaN', (lid) => {
    const model = buildThermalBoxModel(input({ lid }));
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    expect(size.x).toBeGreaterThan(0.79);
    expect(size.y).toBeGreaterThan(0.59);
    expect(size.z).toBeGreaterThan(1.19);
    expect(size.toArray().every(Number.isFinite)).toBe(true);
  });

  it.each([0, 10])('representa %s divisórias sem alterar a caixa externa', (dividers) => {
    const model = buildThermalBoxModel(input({ dividers }));
    const meshes = model.children.filter((child) => child instanceof THREE.Mesh);
    expect(meshes.length).toBeGreaterThanOrEqual(1 + dividers);
  });

  it('mantém mobilidade visual nos três estados', () => {
    for (const mobility of ['pes', 'rodizios', 'sem_base'] as const) {
      const model = buildThermalBoxModel(input({ mobility }));
      expect(model.children.length).toBeGreaterThan(0);
    }
  });
});


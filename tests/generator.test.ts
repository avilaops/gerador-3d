// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  generateEquipment,
  HANDWRITTEN_SPECS,
  EquipmentSpecError,
  type EquipmentSpecInput,
} from '../src';

const TOL = 0.02;
const TRIANGLE_BUDGET = 30_000;

const EXPECTED_NODES: Record<string, string[]> = {
  'LD-B004': [
    'base',
    'tower',
    'stack',
    'seat',
    'backrest',
    'head',
    'arm_left',
    'arm_right',
    'foot_assist',
  ],
  'LD-A002': ['base', 'frame', 'seat', 'backrest', 'row_station', 'arm_left', 'arm_right'],
};

describe.each(HANDWRITTEN_SPECS.map((s) => [s.id, s] as const))(
  '%s (spec escrito à mão)',
  (id, spec) => {
    const eq = generateEquipment(spec);
    const { length: C, width: L, height: A } = spec.dimensionsMm;

    it('caixa envolvente bate com C × L × A em ±2%', () => {
      const size = eq.bbox.getSize(new THREE.Vector3());
      expect(Math.abs((size.z * 1000) / C - 1)).toBeLessThanOrEqual(TOL);
      expect(Math.abs((size.x * 1000) / L - 1)).toBeLessThanOrEqual(TOL);
      expect(Math.abs((size.y * 1000) / A - 1)).toBeLessThanOrEqual(TOL);
    });

    it('origem no centro da projeção no piso', () => {
      expect(eq.bbox.min.y).toBeCloseTo(0, 4);
      expect((eq.bbox.min.x + eq.bbox.max.x) / 2).toBeCloseTo(0, 3);
      expect((eq.bbox.min.z + eq.bbox.max.z) / 2).toBeCloseTo(0, 3);
    });

    it('nós com nomes estáveis', () => {
      for (const n of EXPECTED_NODES[id]) expect(eq.object.getObjectByName(n), n).toBeTruthy();
      expect(eq.object.name).toBe(id);
    });

    it('pivô de cada articulação coincide com a origem do nó', () => {
      eq.object.updateMatrixWorld(true);
      for (const a of eq.articulations) {
        const node = eq.object.getObjectByName(a.node)!;
        if (a.type !== 'revolute') continue;
        const p = node.getWorldPosition(new THREE.Vector3());
        expect(p.x).toBeCloseTo(a.pivot[0], 5);
        expect(p.y).toBeCloseTo(a.pivot[1], 5);
        expect(p.z).toBeCloseTo(a.pivot[2], 5);
      }
    });

    it('dentro do orçamento de triângulos e reaproveitando geometria', () => {
      expect(eq.stats.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET);
      // Peças retas compartilham geometria; cada tubo curvado tem a sua.
      expect(eq.stats.geometries).toBeLessThan(eq.stats.meshes / 2);
    });

    it('clipe de animação: um ciclo vai-e-volta que começa e termina no repouso', () => {
      expect(eq.clip).toBeDefined();
      const clip = eq.clip!;
      expect(clip.tracks.map((t) => t.name).sort()).toEqual(
        eq.articulations
          .map((a) => `${a.node}.${a.type === 'revolute' ? 'quaternion' : 'position'}`)
          .sort()
      );
      const mixer = new THREE.AnimationMixer(eq.object);
      mixer.clipAction(clip).play();
      const arm = eq.object.getObjectByName('arm_left')!;
      const rest = arm.quaternion.clone();
      mixer.setTime(0);
      expect(arm.quaternion.angleTo(rest)).toBeLessThan(1e-6);
      mixer.setTime(clip.duration / 2);
      const swing = eq.articulations.find((a) => a.node === 'arm_left')!.range[1];
      expect(arm.quaternion.angleTo(rest)).toBeCloseTo(Math.abs(swing), 3);
      mixer.setTime(clip.duration * 0.999);
      expect(arm.quaternion.angleTo(rest)).toBeLessThan(1e-3);
      mixer.stopAllAction();
    });

    it('pegada e área de treino coerentes', () => {
      const ta = eq.footprint.trainingArea;
      const c = spec.trainingClearanceM ?? 0.6;
      expect(ta.widthM).toBeCloseTo(L / 1000 + 2 * c, 1);
      expect(ta.lengthM).toBeCloseTo(C / 1000 + 2 * c, 1);
      expect(eq.footprint.parts.length).toBe(eq.stats.meshes);
    });

    it('sem avisos', () => {
      expect(eq.warnings).toEqual([]);
    });
  }
);

describe('spec mínimo (só dimensões e família)', () => {
  const minimal = (
    family: EquipmentSpecInput['family'],
    dims: [number, number, number]
  ): EquipmentSpecInput => ({
    id: `TESTE-${family}`,
    name: 'Teste',
    family,
    dimensionsMm: { length: dims[0], width: dims[1], height: dims[2] },
  });

  it.each([
    ['selectorized-tower', [1310, 1200, 2050]],
    ['selectorized-tower', [1500, 1400, 2200]],
    ['plate-loaded-lever', [1830, 1330, 2090]],
    ['plate-loaded-lever', [2000, 1500, 2200]],
  ] as const)('%s %j gera modelo plausível dentro de ±2%%', (family, dims) => {
    const eq = generateEquipment(minimal(family, [...dims]));
    const size = eq.bbox.getSize(new THREE.Vector3());
    expect(Math.abs((size.z * 1000) / dims[0] - 1)).toBeLessThanOrEqual(TOL);
    expect(Math.abs((size.x * 1000) / dims[1] - 1)).toBeLessThanOrEqual(TOL);
    expect(Math.abs((size.y * 1000) / dims[2] - 1)).toBeLessThanOrEqual(TOL);
    expect(eq.clip).toBeDefined();
  });
});

describe('caixa térmica paramétrica', () => {
  const gerar = (params: EquipmentSpecInput['params'] = {}) =>
    generateEquipment({
      id: 'MRG-TESTE',
      name: 'Caixa térmica sob medida',
      family: 'thermal-box',
      dimensionsMm: { length: 900, width: 1200, height: 850 },
      materials: { frame: '#b8bdc4', accent: '#2367d1', upholstery: '#eceff1' },
      params: {
        lid: 'top',
        mobility: 'casters',
        dividers: 2,
        ...params,
      },
    });

  it('gera casco, isolamento, ferragens, divisórias e tampa articulada dentro das medidas', () => {
    const eq = gerar();
    const size = eq.bbox.getSize(new THREE.Vector3());

    expect(size.x).toBeCloseTo(1.2, 2);
    expect(size.y).toBeCloseTo(0.85, 2);
    expect(size.z).toBeCloseTo(0.9, 2);
    for (const name of [
      'shell',
      'liner',
      'insulation_rim',
      'lid',
      'hinge',
      'latch_left',
      'latch_right',
      'handle_left',
      'handle_right',
      'caster_front_left',
      'caster_front_right',
      'caster_back_left',
      'caster_back_right',
      'divider_1',
      'divider_2',
    ]) {
      expect(eq.object.getObjectByName(name), name).toBeTruthy();
    }
    expect(eq.articulations).toEqual([
      expect.objectContaining({ node: 'lid', type: 'revolute', range: [0, -1.75] }),
    ]);
    expect(eq.warnings).toEqual([]);
  });

  it('troca rodízios por pés sem manter peças da opção anterior', () => {
    const eq = gerar({ lid: 'top', mobility: 'feet', dividers: 0 });

    expect(eq.object.getObjectByName('foot_front_left')).toBeTruthy();
    expect(eq.object.getObjectByName('caster_front_left')).toBeFalsy();
    expect(eq.object.getObjectByName('divider_1')).toBeFalsy();
  });

  it('modela tampa dupla com duas folhas articuladas', () => {
    const eq = gerar({ lid: 'double', mobility: 'fixed', dividers: 1 });

    expect(eq.object.getObjectByName('lid_left')).toBeTruthy();
    expect(eq.object.getObjectByName('lid_right')).toBeTruthy();
    expect(eq.object.getObjectByName('lid')).toBeFalsy();
    expect(eq.articulations.map((a) => a.node).sort()).toEqual(['lid_left', 'lid_right']);
  });

  it('modela abertura frontal articulada na base', () => {
    const eq = gerar({ lid: 'front', mobility: 'fixed', dividers: 0 });

    expect(eq.object.getObjectByName('front_door')).toBeTruthy();
    expect(eq.object.getObjectByName('lid')).toBeFalsy();
    expect(eq.articulations).toEqual([
      expect.objectContaining({ node: 'front_door', type: 'revolute', range: [0, 1.57] }),
    ]);
  });
});

describe('validação', () => {
  const base: EquipmentSpecInput = {
    id: 'X',
    name: 'X',
    family: 'selectorized-tower',
    dimensionsMm: { length: 1310, width: 1200, height: 2050 },
  };

  it('parâmetro desconhecido vira aviso, não erro', () => {
    const eq = generateEquipment({ ...base, params: { naoExiste: 1 } });
    expect(eq.warnings.join()).toMatch(/naoExiste/);
  });

  it('parâmetro de tipo errado é rejeitado', () => {
    expect(() => generateEquipment({ ...base, params: { seatHeight: 'alto' } })).toThrow(
      EquipmentSpecError
    );
  });

  it('dimensão inválida é rejeitada pelo schema', () => {
    expect(() =>
      generateEquipment({ ...base, dimensionsMm: { length: -1, width: 1, height: 1 } })
    ).toThrow(EquipmentSpecError);
  });

  it('família fora do schema é rejeitada', () => {
    expect(() => generateEquipment({ ...base, family: 'inexistente' as 'bench' })).toThrow(
      EquipmentSpecError
    );
  });

  it('ajuste de articulação do spec altera o curso', () => {
    const eq = generateEquipment({
      ...base,
      articulations: [{ node: 'arm_left', range: [0, 0.5] }],
    });
    expect(eq.articulations.find((a) => a.node === 'arm_left')!.range).toEqual([0, 0.5]);
  });
});

// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { EquipmentSpecError, generateEquipment } from '../src';
import { installNodeShims } from '../src/export/nodeShims';
import { PartKit } from '../src/parts/kit';
import { stackTower, type StackTowerOptions } from '../src/parts/assemblies';
import { OPEN_TOWER } from '../src/parts/tower';

beforeAll(() => installNodeShims());

const base: StackTowerOptions = { x: 0, z: -0.3, height: 1.6, post: 0.07, plates: 14, travel: 0.2, totalKg: 137 };

function nomes(g: THREE.Object3D): string[] {
  const out: string[] = [];
  g.traverse((o) => out.push(o.name));
  return out;
}
function triangulos(g: THREE.Object3D): number {
  let t = 0;
  g.traverse((o) => {
    const geo = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (geo) t += (geo.index?.count ?? geo.getAttribute('position').count) / 3;
  });
  return t;
}

describe('estilo da torre: padrão', () => {
  it('sem style o resultado é idêntico a style "solid": mesmos nós e mesmos triângulos', () => {
    const kit = new PartKit();
    const a = stackTower(kit, base);
    const b = stackTower(kit, { ...base, style: 'solid' });
    expect(nomes(a.group)).toEqual(nomes(b.group));
    expect(triangulos(a.group)).toBe(triangulos(b.group));
    expect(a.articulation).toEqual(b.articulation);
    kit.dispose();
  });

  it('o estilo carenado continua com chapas, fenda e carenagem traseira', () => {
    const kit = new PartKit();
    const n = nomes(stackTower(kit, base).group);
    for (const esperado of ['tower_side', 'tower_front_left', 'tower_front_right', 'tower_shroud', 'tower_cap']) expect(n).toContain(esperado);
    expect(n).not.toContain('tower_header');
    kit.dispose();
  });
});

describe('estilo da torre: aberto', () => {
  const aberta = (extra: Partial<StackTowerOptions> = {}) => {
    const kit = new PartKit();
    return { kit, ...stackTower(kit, { ...base, style: 'open', ...extra }) };
  };

  it('tem montantes, cabeçote, plaqueta, base e travessas, e nenhuma chapa fechando a pilha', () => {
    const { kit, group } = aberta();
    const n = nomes(group);
    for (const esperado of ['tower_post_left', 'tower_post_right', 'tower_header', 'tower_label', 'tower_foot']) expect(n).toContain(esperado);
    expect(n.filter((x) => x === 'tower_brace')).toHaveLength(2);
    for (const proibido of ['tower_side', 'tower_front_left', 'tower_front_right', 'tower_shroud', 'tower_cap', 'tower_bracket']) {
      expect(n, proibido).not.toContain(proibido);
    }
    kit.dispose();
  });

  it('mostra a pilha: uma placa por unidade, mais a do topo, a haste seletora e o pino', () => {
    const { kit, group } = aberta({ plates: 12 });
    const n = nomes(group);
    expect(n.filter((x) => /^stack_plate_\d+$/.test(x))).toHaveLength(12);
    for (const esperado of ['stack_top_plate', 'stack_selector_rod', 'stack_selector_pin', 'stack_cable']) expect(n).toContain(esperado);
    kit.dispose();
  });

  it('mantém o contrato de nós e articulação do estilo carenado', () => {
    const kit = new PartKit();
    const fechada = stackTower(kit, { ...base, suffix: '_left' });
    const aberta = stackTower(kit, { ...base, suffix: '_left', style: 'open' });
    expect(aberta.group.name).toBe('tower_left');
    expect(aberta.group.getObjectByName('stack_left')).toBeTruthy();
    expect(aberta.articulation).toEqual(fechada.articulation);
    expect(aberta.articulation.range).toEqual([0, base.travel]);
    kit.dispose();
  });

  it('a altura total é a pedida e a largura é a do quadro', () => {
    const { kit, group } = aberta();
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group.getObjectByName('tower_frame')!);
    expect(box.max.y).toBeCloseTo(base.height, 3);
    expect(box.max.x - box.min.x).toBeCloseTo(2 * OPEN_TOWER.halfWidth, 3);
    kit.dispose();
  });

  it('a pilha cabe entre os montantes e a haste não entra no cabeçote em nenhum ponto do curso', () => {
    const headerBottom = (h: number) => h - OPEN_TOWER.headerHeight;
    const innerGap = 2 * OPEN_TOWER.halfWidth - 2 * OPEN_TOWER.postWidth;
    for (const height of [1.3, 1.5, 1.8]) {
      for (const plates of [8, 12, 16]) {
        for (const travel of [0.08, 0.15, 0.25]) {
          const kit = new PartKit();
          const { group } = stackTower(kit, { ...base, height, plates, travel, style: 'open' });
          group.updateMatrixWorld(true);
          const rod = new THREE.Box3().setFromObject(group.getObjectByName('stack_selector_rod')!);
          const plateBox = new THREE.Box3().setFromObject(group.getObjectByName('stack_plate_01')!);
          // Só vale quando o espaçamento mínimo das placas não foi esticado além do que a torre comporta.
          const guideHeight = headerBottom(height) - 0.03;
          const available = guideHeight - 0.11 - travel - 0.26;
          if (available / (plates + 1) >= 0.016) {
            expect(rod.max.y + travel, `${height} m, ${plates} placas, curso ${travel}`).toBeLessThanOrEqual(headerBottom(height) + 0.001);
          }
          expect(plateBox.max.x - plateBox.min.x).toBeLessThan(innerGap);
          kit.dispose();
        }
      }
    }
  });
});

describe('torre aberta em equipamentos inteiros', () => {
  const dir = new URL('../catalogs/ludus-core/specs/', import.meta.url);
  const specs = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')))
    .filter((s) => s.family === 'selectorized-tower');

  it('o Core tem equipamentos com torre para testar', () => {
    expect(specs.length).toBeGreaterThanOrEqual(15);
  });

  // A alavanca da mesa flexora atravessa a região da coluna no meio do movimento. Na torre carenada
  // a chapa larga já a tocava em repouso e a auditoria (que só acusa colisão nova) a mascarava; nos
  // montantes finos do quadro aberto ela aparece. É um defeito do mecanismo (frente I, exercises.ts),
  // não da torre. Listado de forma exata: se for corrigido, a exceção sai daqui; se piorar, o teste falha.
  const CONHECIDAS: Record<string, string> = {
    'LD-WH042': 'lever|tower_post_left',
    'LD-WH043': 'lever|tower_post_left',
    'LD-WH044': 'lever|tower_post_left',
  };

  it.each(specs.map((s) => [s.id, s] as const))('%s: aberta é válida, cabe no orçamento e só tem as colisões já conhecidas', (id, spec) => {
    const carenada = generateEquipment(spec);
    const aberta = generateEquipment({ ...spec, params: { ...spec.params, towerStyle: 'open' } });
    expect(aberta.quality.valid).toBe(true);
    expect(aberta.quality.dimensionsWithinTolerance).toBe(true);
    expect(aberta.stats.triangles).toBeLessThanOrEqual(30_000);
    const chave = (c: { node: string; other: string }) => `${c.node}|${c.other}`;
    const antes = carenada.quality.motion.collisions.map(chave);
    const novas = aberta.quality.motion.collisions.map(chave).filter((c) => !antes.includes(c));
    expect(novas).toEqual(CONHECIDAS[id] ? [CONHECIDAS[id]] : []);
    expect(aberta.object.getObjectByName('tower_header')).toBeTruthy();
    expect(carenada.object.getObjectByName('tower_header')).toBeFalsy();
  });
});

describe('parâmetro towerStyle', () => {
  const spec = {
    id: 'LD-T',
    name: 'Teste',
    family: 'selectorized-tower' as const,
    dimensionsMm: { length: 1500, width: 1000, height: 1500 },
    params: { mechanism: 'leg-extension' },
  };

  it('o padrão resolvido é "solid"', () => {
    expect(generateEquipment(spec).object.getObjectByName('tower_header')).toBeFalsy();
  });

  it('valor inválido é recusado com o caminho do campo', () => {
    expect(() => generateEquipment({ ...spec, params: { ...spec.params, towerStyle: 'aberta' } })).toThrow(EquipmentSpecError);
    try {
      generateEquipment({ ...spec, params: { ...spec.params, towerStyle: 'aberta' } });
    } catch (e) {
      expect(JSON.stringify((e as EquipmentSpecError).issues ?? (e as Error).message)).toContain('towerStyle');
    }
  });
});

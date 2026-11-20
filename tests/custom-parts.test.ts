// @vitest-environment node
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { EquipmentSpecError, generateEquipment, parseEquipmentSpec, type EquipmentSpecInput } from '../src';
import { applyPhase, captureRestPose } from '../src/animation';
import { PartKit } from '../src/parts/kit';
import { buildCustomParts } from '../src/parts/custom/build';
import { EXEMPLO_BANCO_ESTENDIDO, EXEMPLO_TORRE_SUBSTITUIDA } from '../src/parts/custom';
import { CustomPartsSchema, MATERIAL_ROLES, type CustomParts } from '../src/spec/schema';

const issues = (spec: unknown): string[] => {
  try {
    parseEquipmentSpec(spec);
  } catch (e) {
    return (e as EquipmentSpecError).issues;
  }
  return [];
};

const base: EquipmentSpecInput = { id: 'T', name: 'T', family: 'rack', dimensionsMm: { length: 1000, width: 1000, height: 1000 } };
const comParts = (parts: unknown): unknown => ({ ...base, parts });
const caixa = { kind: 'box', name: 'a', size: [0.1, 0.1, 0.1], center: [0, 0.05, 0] };

describe('esquema de parts', () => {
  it('a lista de papéis acompanha os materiais do kit', () => {
    const kit = new PartKit();
    expect([...MATERIAL_ROLES].sort()).toEqual(Object.keys(kit.materials).sort());
    kit.dispose();
  });

  it('os exemplos escritos à mão são válidos', () => {
    expect(issues(EXEMPLO_TORRE_SUBSTITUIDA)).toEqual([]);
    expect(issues(EXEMPLO_BANCO_ESTENDIDO)).toEqual([]);
  });

  it('o erro aponta o caminho do campo: ponto do tubo que não é número', () => {
    const msgs = issues(comParts({ mode: 'extend', items: [{ kind: 'tube', name: 't', size: 0.05, points: [[0, 0, 0], [0, 'x', 0]] }] }));
    expect(msgs.some((m) => m.startsWith('parts.items.0.points.1.1'))).toBe(true);
  });

  it('peça com tamanho zero ou negativo é recusada com a mensagem em português', () => {
    const msgs = issues(comParts({ mode: 'extend', items: [{ ...caixa, size: [0.1, -1, 0.1] }] }));
    expect(msgs.join('|')).toContain('parts.items.0.size.1');
    expect(msgs.join('|')).toContain('maior que zero');
  });

  it('lista vazia, tipo desconhecido e nome vazio são recusados', () => {
    expect(issues(comParts({ mode: 'replace', items: [] })).join('|')).toContain('declare pelo menos uma peça');
    expect(issues(comParts({ mode: 'extend', items: [{ kind: 'parafuso', name: 'p' }] })).some((m) => m.startsWith('parts.items.0'))).toBe(true);
    expect(issues(comParts({ mode: 'extend', items: [{ ...caixa, name: '' }] })).join('|')).toContain('precisa de um nome');
  });

  it('articulação própria no modo extend é recusada (as peças são estáticas)', () => {
    const art = { node: 'a', type: 'revolute', axis: [1, 0, 0], pivot: [0, 0, 0], range: [0, 1], driver: 'phase' };
    const msgs = issues(comParts({ mode: 'extend', items: [caixa], articulations: [art] }));
    expect(msgs.some((m) => m.startsWith('parts.articulations'))).toBe(true);
    expect(CustomPartsSchema.safeParse({ mode: 'replace', items: [caixa], articulations: [art] }).success).toBe(true);
  });
});

describe('sem parts, nada muda', () => {
  it('um spec comum não ganha o nó custom_parts', () => {
    const eq = generateEquipment(base);
    expect(eq.object.getObjectByName('custom_parts')).toBeUndefined();
  });

  it('parts indefinido dá o mesmo modelo que a chave ausente', () => {
    const a = generateEquipment(base);
    const b = generateEquipment({ ...base, parts: undefined });
    expect(b.stats).toEqual(a.stats);
    expect(b.warnings).toEqual(a.warnings);
  });
});

describe('modo extend', () => {
  it('acrescenta as peças às da família, com o nome e o material pedidos', () => {
    const sem = generateEquipment({ ...EXEMPLO_BANCO_ESTENDIDO, parts: undefined });
    const com = generateEquipment(EXEMPLO_BANCO_ESTENDIDO);
    expect(com.stats.triangles).toBeGreaterThan(sem.stats.triangles);
    const placa = com.object.getObjectByName('plaqueta') as THREE.Mesh;
    expect(placa).toBeTruthy();
    expect((placa.material as THREE.Material).name).toBe('label');
    expect(com.quality.valid).toBe(true);
  });

  it('peça maior que a caixa é um erro claro com as medidas, não "Parâmetros inválidos"', () => {
    const grande = { ...EXEMPLO_BANCO_ESTENDIDO, parts: { mode: 'extend' as const, items: [{ kind: 'box' as const, name: 'enorme', size: [2, 0.1, 0.1] as [number, number, number], center: [0, 0.2, 0] as [number, number, number] }] } };
    expect(() => generateEquipment(grande)).toThrow(/maiores que a caixa/);
    try {
      generateEquipment(grande);
    } catch (e) {
      const msg = (e as EquipmentSpecError).issues.join('|');
      expect(msg).toContain('2.000');
      expect(msg).toContain('1.300 × 0.600 × 0.450');
      expect(msg).toContain('replace');
    }
  });

  it('peça que cabe na caixa não dispara o erro, mesmo ocupando quase toda a largura', () => {
    const justa = { ...EXEMPLO_BANCO_ESTENDIDO, parts: { mode: 'extend' as const, items: [{ kind: 'box' as const, name: 'justa', size: [0.59, 0.02, 0.02] as [number, number, number], center: [0, 0.1, 0] as [number, number, number] }] } };
    expect(() => generateEquipment(justa)).not.toThrow();
  });
});

describe('modo replace', () => {
  const eq = generateEquipment(EXEMPLO_TORRE_SUBSTITUIDA);

  it('a família não monta nada: só existem as peças declaradas', () => {
    const nomes: string[] = [];
    eq.object.traverse((o) => nomes.push(o.name));
    for (const esperado of ['base', 'montante_esquerdo', 'montante_direito', 'cabecote', 'assento', 'encosto', 'pilha', 'placa_01', 'placa_08']) {
      expect(nomes, esperado).toContain(esperado);
    }
    // Nenhum nó que a família selectorized-tower costuma gerar.
    for (const daFamilia of ['tower', 'tower_frame', 'seat', 'backrest']) expect(nomes, daFamilia).not.toContain(daFamilia);
  });

  it('o parâmetro da família nem é validado (não há família para validar)', () => {
    const e = generateEquipment({ ...EXEMPLO_TORRE_SUBSTITUIDA, family: 'rack', params: { variant: 'inexistente' } });
    expect(e.object.getObjectByName('pilha')).toBeTruthy();
    expect(e.warnings.filter((w) => w.includes('desconhecido'))).toEqual([]);
  });

  it('passa nos mesmos gates das famílias: caixa, piso, articulação, colisão e orçamento', () => {
    expect(eq.quality.valid).toBe(true);
    expect(eq.quality.dimensionsWithinTolerance).toBe(true);
    expect(eq.quality.articulationNodesValid).toBe(true);
    expect(eq.quality.motion.collisionFree).toBe(true);
    expect(eq.warnings).toEqual([]);
    expect(eq.stats.triangles).toBeLessThanOrEqual(30_000);
  });

  it('a articulação declarada anima o group: a pilha sobe 0,15 m na fase 1', () => {
    expect(eq.articulations.map((a) => a.node)).toEqual(['pilha']);
    const placa = eq.object.getObjectByName('placa_01')!;
    const rest = captureRestPose(eq.object, eq.articulations);
    const y = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3()).y;
    applyPhase(eq.object, eq.articulations, rest, 0);
    eq.object.updateMatrixWorld(true);
    const y0 = y(placa);
    expect(y0).toBeCloseTo(0.15, 3);
    applyPhase(eq.object, eq.articulations, rest, 1);
    eq.object.updateMatrixWorld(true);
    expect(y(placa) - y0).toBeCloseTo(0.15, 3);
  });
});

describe('group com pivô: gira em torno do pivô, não da origem', () => {
  const parts: CustomParts = {
    mode: 'replace',
    items: [{ kind: 'cylinder', name: 'braco', group: 'giro', from: [0, 0.5, 0], to: [0, 0.5, 0.4], diameter: 0.04 }],
    articulations: [{ node: 'giro', type: 'revolute', axis: [1, 0, 0], pivot: [0, 0.5, 0], range: [0, Math.PI / 2], driver: 'phase' }],
  };

  it('o nó fica no pivô e a peça continua no lugar em repouso', () => {
    const kit = new PartKit();
    const { group, articulations } = buildCustomParts(kit, parts);
    group.updateMatrixWorld(true);
    expect(group.getObjectByName('giro')!.position.toArray()).toEqual([0, 0.5, 0]);
    const centro = group.getObjectByName('braco')!.getWorldPosition(new THREE.Vector3());
    expect(centro.toArray().map((v) => Math.round(v * 1e6) / 1e6)).toEqual([0, 0.5, 0.2]);
    expect(articulations).toHaveLength(1);
    kit.dispose();
  });

  it('com 90° em X, o centro do braço (0, 0,5, 0,2) vai para (0, 0,3, 0)', () => {
    const kit = new PartKit();
    const { group, articulations } = buildCustomParts(kit, parts);
    const rest = captureRestPose(group, articulations);
    applyPhase(group, articulations, rest, 1);
    group.updateMatrixWorld(true);
    const c = group.getObjectByName('braco')!.getWorldPosition(new THREE.Vector3());
    expect(c.x).toBeCloseTo(0, 6);
    expect(c.y).toBeCloseTo(0.3, 6);
    expect(c.z).toBeCloseTo(0, 6);
    kit.dispose();
  });
});

describe('avisos', () => {
  it('nome repetido avisa', () => {
    const kit = new PartKit();
    const { warnings } = buildCustomParts(kit, { mode: 'extend', items: [caixa, caixa] } as CustomParts);
    expect(warnings.some((w) => w.includes('nome repetido') && w.includes('"a"'))).toBe(true);
    kit.dispose();
  });

  it('articulação para nó inexistente avisa e é descartada', () => {
    const kit = new PartKit();
    const parts = {
      mode: 'replace',
      items: [caixa],
      articulations: [{ node: 'fantasma', type: 'prismatic', axis: [0, 1, 0], pivot: [0, 0, 0], range: [0, 0.1], driver: 'phase' }],
    } as CustomParts;
    const r = buildCustomParts(kit, parts);
    expect(r.articulations).toEqual([]);
    expect(r.warnings.some((w) => w.includes('fantasma'))).toBe(true);
    kit.dispose();
  });
});

describe('todas as peças', () => {
  it('cada tipo gera um nó com o nome pedido, e o material pedido vale', () => {
    const kit = new PartKit();
    const parts = {
      mode: 'extend',
      items: [
        { kind: 'tube', name: 'reto', points: [[0, 0, 0], [0, 1, 0]], size: 0.05 },
        { kind: 'tube', name: 'dobrado', points: [[0, 0, 0], [0, 1, 0], [0.5, 1, 0]], size: [0.05, 0.03], material: 'accent' },
        { kind: 'box', name: 'caixa', size: [0.1, 0.1, 0.1], center: [0, 0, 0] },
        { kind: 'cylinder', name: 'cilindro', from: [0, 0, 0], to: [0, 0.3, 0], diameter: 0.03, material: 'chrome' },
        { kind: 'plate', name: 'anilha', center: [0, 0.2, 0], diameter: 0.4, thickness: 0.04, material: 'rubber' },
        { kind: 'pad', name: 'estofado', size: [0.3, 0.08, 0.3], center: [0, 0.4, 0], tiltX: 0.2 },
        { kind: 'roller', name: 'rolo', from: [-0.2, 0.3, 0], to: [0.2, 0.3, 0], diameter: 0.1 },
        { kind: 'pulley', name: 'polia', center: [0, 0.8, 0], diameter: 0.1, axis: 'z' },
      ],
    } as CustomParts;
    const { group, warnings } = buildCustomParts(kit, parts);
    expect(warnings).toEqual([]);
    for (const item of parts.items) expect(group.getObjectByName(item.name), item.name).toBeTruthy();
    const mat = (n: string) => ((group.getObjectByName(n) as THREE.Mesh).material as THREE.Material).name;
    expect(mat('anilha')).toBe('rubber');
    expect(mat('cilindro')).toBe('chrome');
    expect(mat('estofado')).toBe('upholstery');
    expect(mat('rolo')).toBe('upholstery');
    kit.dispose();
  });
});

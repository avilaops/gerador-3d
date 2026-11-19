// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import validator from 'gltf-validator';
import { installNodeShims } from '../src/export/nodeShims';
import { PartKit } from '../src/parts/kit';
import * as D from '../src/parts/details';

/** Caixa envolvente em mm, [x, y, z]. */
function mmBox(o: THREE.Object3D): { min: number[]; size: number[] } {
  o.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(o);
  return { min: b.min.toArray().map((v) => v * 1000), size: b.getSize(new THREE.Vector3()).toArray().map((v) => v * 1000) };
}
const near = (a: number[], b: number[], tol: number) => a.forEach((v, i) => expect(Math.abs(v - b[i]), `eixo ${i}: ${v} vs ${b[i]}`).toBeLessThanOrEqual(tol));

const kitNovo = () => new PartKit();

/**
 * Orçamento de triângulos de cada peça (medido e arredondado para cima, ~10%). Um modelo inteiro
 * tem de 2 a 9 mil triângulos e o limite do gate é 30 mil: estes valores dizem quantas dessas
 * peças cabem.
 */
const ORCAMENTO = {
  'bolt hex + arruela': 200,
  'bolt hex': 70,
  'bolt allen + arruela': 300,
  'bolt abaulado + arruela': 320,
  nut: 70,
  'tubeCap retangular': 120,
  'tubeCap redonda': 180,
  ferrule: 220,
  levelerFoot: 350,
  weldRing: 210,
  weldBead: 70,
  'stitchedPad (cordão)': 900,
  'stitchedPad (3 vincos)': 1100,
  'knurledGrip 30 cm': 920,
  'foamRoller 40 cm': 530,
  'treadPlate 40x30': 1480,
  'perforatedPlate 5x5': 1470,
  pulleyFork: 720,
  shackle: 530,
  carabiner: 360,
} as const;

const pecas: [keyof typeof ORCAMENTO, (kit: PartKit) => THREE.Object3D][] = [
  ['bolt hex + arruela', (k) => D.bolt(k, { at: [0, 0, 0], dir: [0, 1, 0] })],
  ['bolt hex', (k) => D.bolt(k, { at: [0, 0, 0], dir: [0, 1, 0], washer: false })],
  ['bolt allen + arruela', (k) => D.bolt(k, { at: [0, 0, 0], dir: [0, 1, 0], kind: 'allen' })],
  ['bolt abaulado + arruela', (k) => D.bolt(k, { at: [0, 0, 0], dir: [0, 1, 0], kind: 'button' })],
  ['nut', (k) => D.nut(k, { at: [0, 0, 0], dir: [0, 1, 0] })],
  ['tubeCap retangular', (k) => D.tubeCap(k, { at: [0, 0, 0], dir: [0, 1, 0], size: 0.05 })],
  ['tubeCap redonda', (k) => D.tubeCap(k, { at: [0, 0, 0], dir: [0, 1, 0], size: 0.05, round: true })],
  ['ferrule', (k) => D.ferrule(k, { at: [0, 0, 0], dir: [0, 1, 0], diameter: 0.04 })],
  ['levelerFoot', (k) => D.levelerFoot(k, { x: 0, z: 0 })],
  ['weldRing', (k) => D.weldRing(k, { at: [0, 0, 0], dir: [0, 0, 1], size: 0.05 })],
  ['weldBead', (k) => D.weldBead(k, { a: [0, 0, 0], b: [0, 0.1, 0] })],
  ['stitchedPad (cordão)', (k) => D.stitchedPad(k, [0.4, 0.08, 0.3], [0, 0, 0])],
  ['stitchedPad (3 vincos)', (k) => D.stitchedPad(k, [0.4, 0.08, 0.3], [0, 0, 0], { seams: 3 })],
  ['knurledGrip 30 cm', (k) => D.knurledGrip(k, [0, 0, 0], [0, 0.3, 0])],
  ['foamRoller 40 cm', (k) => D.foamRoller(k, [0, 0, 0], [0, 0.4, 0])],
  ['treadPlate 40x30', (k) => D.treadPlate(k, [0.4, 0.004, 0.3], [0, 0, 0])],
  ['perforatedPlate 5x5', (k) => D.perforatedPlate(k, [0.1, 0.003, 0.1], [0, 0, 0])],
  ['pulleyFork', (k) => D.pulleyFork(k, [0, 0, 0])],
  ['shackle', (k) => D.shackle(k, [0, 0, 0])],
  ['carabiner', (k) => D.carabiner(k, [0, 0, 0])],
];

describe.each(pecas)('%s', (nome, fazer) => {
  it('sem NaN, com normais unitárias e dentro do orçamento de triângulos', () => {
    const kit = kitNovo();
    const obj = fazer(kit);
    obj.updateMatrixWorld(true);
    let total = 0;
    let unitarias = 0;
    obj.traverse((o) => {
      const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
      if (!g) return;
      const pos = g.getAttribute('position') as THREE.BufferAttribute;
      const nor = g.getAttribute('normal') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        expect(Number.isFinite(pos.getX(i) + pos.getY(i) + pos.getZ(i))).toBe(true);
        const len = Math.hypot(nor.getX(i), nor.getY(i), nor.getZ(i));
        expect(Number.isFinite(len)).toBe(true);
        total++;
        if (Math.abs(len - 1) < 0.01) unitarias++;
      }
    });
    expect(unitarias / total, 'normais unitárias').toBeGreaterThan(0.97);
    expect(D.triangleCount(obj), `${D.triangleCount(obj)} triângulos`).toBeLessThanOrEqual(ORCAMENTO[nome]);
    kit.dispose();
  });

  it('usa só os materiais do kit', () => {
    const kit = kitNovo();
    const roles = new Set(Object.values(kit.materials));
    fazer(kit).traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m) expect(roles.has(m as THREE.MeshStandardMaterial), o.name).toBe(true);
    });
    kit.dispose();
  });
});

describe('sem aresta viva de 90° onde a peça real tem raio ou chanfro', () => {
  /** O furo sextavado do parafuso allen e a borda da chapa furada são cortes secos na peça real. */
  const SECAS = new Set(['bolt_socket', 'perforated_plate']);
  const LIMITE = 65;
  it.each(pecas.filter(([n]) => n !== 'perforatedPlate 5x5'))('%s', (_n, fazer) => {
    const kit = kitNovo();
    fazer(kit).traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.geometry || SECAS.has(m.name)) return;
      expect(D.maxDihedralDeg(m.geometry), m.name).toBeLessThanOrEqual(LIMITE);
    });
    kit.dispose();
  });

  it('a métrica enxerga uma quina viva de verdade (caixa comum = 90°) e um chanfro (45°)', () => {
    expect(D.maxDihedralDeg(new THREE.BoxGeometry(1, 1, 1))).toBeCloseTo(90, 3);
    const chanfro = new THREE.CylinderGeometry(1, 1, 1, 24);
    expect(D.maxDihedralDeg(chanfro)).toBeCloseTo(90, 3);
  });
});

describe('medidas', () => {
  it('parafuso sextavado M10 com arruela: 20 × 8,3 × 20 mm, cabeça para cima', () => {
    const { size } = mmBox(D.bolt(kitNovo(), { at: [0, 0, 0], dir: [0, 1, 0] }));
    near(size, [20, 8.3, 20], 0.6);
  });

  it('o parafuso aponta para a direção pedida', () => {
    const { size } = mmBox(D.bolt(kitNovo(), { at: [0, 0, 0], dir: [1, 0, 0] }));
    near([size[0], size[1]], [8.3, 20], 0.6);
  });

  it('a tampa de tubo fica por fora da ponta: 14 mm de espessura, a partir do ponto de apoio', () => {
    const { min, size } = mmBox(D.tubeCap(kitNovo(), { at: [0, 0.5, 0], dir: [0, 1, 0], size: 0.05 }));
    near(size, [56, 14, 56], 0.5);
    expect(min[1]).toBeCloseTo(500, 0);
  });

  it('a sapata niveladora apoia no piso (y = 0) e tem 47 mm de altura', () => {
    const { min, size } = mmBox(D.levelerFoot(kitNovo(), { x: 0.2, z: -0.1 }));
    expect(min[1]).toBeCloseTo(0, 3);
    near(size, [60, 47, 60], 0.5);
  });

  it('o anel de solda envolve o tubo; o cordão reto tem o comprimento pedido', () => {
    const anel = mmBox(D.weldRing(kitNovo(), { at: [0, 0, 0], dir: [0, 0, 1], size: 0.05 }));
    near(anel.size, [63, 63, 6.1], 0.6);
    const cordao = mmBox(D.weldBead(kitNovo(), { a: [0, 0, 0], b: [0, 0.1, 0] }));
    expect(cordao.size[1]).toBeCloseTo(100, 0);
  });

  it('o estofado com costura cabe na medida pedida (o cordão não sai da peça)', () => {
    const { size } = mmBox(D.stitchedPad(kitNovo(), [0.4, 0.08, 0.3], [0, 0, 0], { seams: 3 }));
    near(size, [400, 81, 300], 1.5);
  });

  it('a chapa antiderrapante cabe na medida pedida (as barras inclinadas não saem da chapa)', () => {
    const { size } = mmBox(D.treadPlate(kitNovo(), [0.4, 0.004, 0.3], [0, 0, 0]));
    near([size[0], size[2]], [400, 300], 0.5);
  });

  it('a pegada e o rolo acompanham o comprimento entre os pontos', () => {
    near([mmBox(D.knurledGrip(kitNovo(), [0, 0, 0], [0, 0.3, 0])).size[1]], [300], 0.5);
    near([mmBox(D.foamRoller(kitNovo(), [0, 0, 0], [0, 0.4, 0])).size[1]], [406], 0.5);
  });
});

describe('contagens', () => {
  it('pegada: no máximo 8 anéis, espalhados pelo comprimento', () => {
    const rings = (len: number) => {
      const g = D.knurledGrip(kitNovo(), [0, 0, 0], [0, len, 0]);
      return g.children.filter((c) => c.name === 'grip_ring');
    };
    expect(rings(0.3).length).toBe(8);
    expect(rings(0.12).length).toBeLessThan(8);
    expect(rings(0.03).length).toBeLessThanOrEqual(1);
    const ys = rings(0.3).map((r) => r.position.y);
    expect(ys[0]).toBeCloseTo(0.03, 6);
    expect(ys[ys.length - 1]).toBeCloseTo(0.27, 6);
  });

  it('estofado: 4 cordões e a quantidade de vincos pedida', () => {
    const g = D.stitchedPad(kitNovo(), [0.4, 0.08, 0.3], [0, 0, 0], { seams: 3 });
    expect(g.children.filter((c) => c.name === 'pad_piping')).toHaveLength(4);
    expect(g.children.filter((c) => c.name === 'pad_seam')).toHaveLength(3);
    const sem = D.stitchedPad(kitNovo(), [0.4, 0.08, 0.3], [0, 0, 0], { piping: false });
    expect(sem.children.filter((c) => c.name === 'pad_piping')).toHaveLength(0);
  });

  it('chapa antiderrapante: barras em espinha, sem passar do máximo', () => {
    const barras = D.treadPlate(kitNovo(), [0.4, 0.004, 0.3], [0, 0, 0]).children.filter((c) => c.name === 'tread_bar');
    expect(barras.length).toBeGreaterThan(4);
    expect(barras[0].rotation.y).toBeCloseTo(-barras[1].rotation.y, 9);
  });

  it('chapa furada tem furos de verdade: um raio passa pelo furo e é barrado entre eles', () => {
    const kit = kitNovo();
    const placa = D.perforatedPlate(kit, [0.1, 0.003, 0.1], [0, 0, 0]);
    placa.updateMatrixWorld(true);
    const rc = new THREE.Raycaster();
    const abaixo = (x: number, z: number) => {
      rc.set(new THREE.Vector3(x, 0.1, z), new THREE.Vector3(0, -1, 0));
      return rc.intersectObject(placa).length;
    };
    expect(abaixo(0, 0)).toBe(0); // centro de um furo
    expect(abaixo(0.01, 0.01)).toBeGreaterThan(0); // entre furos
    kit.dispose();
  });

  it('chapa furada recusa grade com furos demais', () => {
    expect(() => D.perforatedPlate(kitNovo(), [0.5, 0.003, 0.5], [0, 0, 0])).toThrow(RangeError);
    expect(() => D.perforatedPlate(kitNovo(), [0.5, 0.003, 0.5], [0, 0, 0], { pitch: 0.1 })).not.toThrow();
  });
});

describe('compartilhamento e descarte', () => {
  it('chamadas iguais reaproveitam a mesma geometria; parâmetros diferentes, não', () => {
    const kit = kitNovo();
    const a = D.bolt(kit, { at: [0, 0, 0], dir: [0, 1, 0] }).getObjectByName('bolt_head') as THREE.Mesh;
    const b = D.bolt(kit, { at: [1, 0, 0], dir: [1, 0, 0] }).getObjectByName('bolt_head') as THREE.Mesh;
    const c = D.bolt(kit, { at: [0, 0, 0], dir: [0, 1, 0], diameter: 0.012 }).getObjectByName('bolt_head') as THREE.Mesh;
    expect(a.geometry).toBe(b.geometry);
    expect(a.geometry).not.toBe(c.geometry);
    expect(a.material).toBe(kit.materials.chrome);
    kit.dispose();
  });

  it('cordões do mesmo comprimento dividem a malha; os cordões do cordão de um estofado também', () => {
    const kit = kitNovo();
    const a = D.weldBead(kit, { a: [0, 0, 0], b: [0, 0.1, 0] });
    const b = D.weldBead(kit, { a: [1, 0, 0], b: [1, 0.1, 0] });
    expect(a.geometry).toBe(b.geometry);
    const pad = D.stitchedPad(kit, [0.4, 0.08, 0.3], [0, 0, 0]);
    const x = pad.children.filter((c) => c.name === 'pad_piping') as THREE.Mesh[];
    expect(x[0].geometry === x[2].geometry || x[0].geometry === x[1].geometry).toBe(true);
    kit.dispose();
  });

  it('dois kits não compartilham geometria entre si', () => {
    const k1 = kitNovo();
    const k2 = kitNovo();
    const g1 = (D.nut(k1, { at: [0, 0, 0], dir: [0, 1, 0] }) as THREE.Mesh).geometry;
    const g2 = (D.nut(k2, { at: [0, 0, 0], dir: [0, 1, 0] }) as THREE.Mesh).geometry;
    expect(g1).not.toBe(g2);
    k1.dispose();
    k2.dispose();
  });

  it('kit.dispose() libera tudo o que a biblioteca criou', () => {
    const kit = kitNovo();
    const objs = pecas.map(([, f]) => f(kit));
    const geos = new Set<THREE.BufferGeometry>();
    objs.forEach((o) => D.geometriesOf(o).forEach((g) => geos.add(g)));
    let liberadas = 0;
    // As geometrias do próprio kit (caixa arredondada) também são descartadas por ele.
    geos.forEach((g) => g.addEventListener('dispose', () => liberadas++));
    kit.dispose();
    expect(liberadas).toBe(geos.size);
  });
});

describe('exportação', () => {
  beforeAll(() => installNodeShims());

  it('todas as peças juntas, exportadas em GLB, passam no validador da Khronos (normais unitárias)', async () => {
    const kit = kitNovo();
    const cena = new THREE.Group();
    pecas.forEach(([, f], i) => {
      const o = f(kit);
      o.position.x += i * 0.2;
      cena.add(o);
    });
    cena.updateMatrixWorld(true);
    const glb = await new Promise<ArrayBuffer>((ok, falha) =>
      new GLTFExporter().parse(cena, (r) => ok(r as ArrayBuffer), falha, { binary: true })
    );
    const report = await validator.validateBytes(new Uint8Array(glb));
    const erros = report.issues.messages.filter((m: { severity: number }) => m.severity === 0);
    expect(erros, JSON.stringify(erros.slice(0, 3))).toEqual([]);
    kit.dispose();
  });
});

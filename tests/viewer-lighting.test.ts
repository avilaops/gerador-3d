// @vitest-environment node
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { HANDWRITTEN_SPECS, generateEquipment } from '../src';
import type { Footprint } from '../src/footprint';
import {
  STUDIO_PANELS,
  buildStudioScene,
  computeLightRig,
  contactShadowAlphaAt,
  contactShadowData,
  createContactShadow,
  distanceToConvex,
  shadowMapSize,
} from '../src/viewer/lighting';

/** Footprint sintético: um retângulo [x0,x1] × [z0,z1]. */
function rect(x0: number, x1: number, z0: number, z1: number): Footprint {
  const hull: [number, number][] = [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
  return {
    bounds: { minX: x0, maxX: x1, minZ: z0, maxZ: z1 },
    parts: [hull],
    outline: hull,
    clearanceM: 0.6,
    trainingArea: { minX: x0, maxX: x1, minZ: z0, maxZ: z1, widthM: x1 - x0, lengthM: z1 - z0, areaM2: (x1 - x0) * (z1 - z0) },
  };
}

describe('luzes', () => {
  it('o estilo padrão reproduz os valores que o visualizador sempre usou', () => {
    const rig = computeLightRig('default', 1);
    const ext = 1.3;
    expect(rig.key.intensity).toBe(1.1);
    expect(rig.key.position).toEqual([ext * 1.2, ext * 2.2, ext * 1.5]);
    expect(rig.rim).toEqual({ position: [-3, 2.5, -2.5], intensity: 0.2 });
    expect(rig.hemisphere).toBe(0.08);
    expect(rig.exposure).toBe(0.72);
    expect(rig.groundShadowOpacity).toBe(0.26);
    expect(rig.shadow).toEqual({ extent: ext, near: 0.5, far: ext * 8, radius: 4, bias: -0.0005 });
    expect(rig.fill).toBeNull();
    expect(rig.contactShadow).toBe(false);
    expect(rig.background).toBe(0xeeece7);
  });

  it('estúdio e escuro têm três pontos de luz e sombra de contato', () => {
    for (const style of ['studio', 'dark'] as const) {
      const rig = computeLightRig(style, 2);
      expect(rig.fill).not.toBeNull();
      expect(rig.contactShadow).toBe(true);
      // A frente do equipamento é +Z: a principal vem da esquerda e da frente, de cima.
      expect(rig.key.position[0]).toBeLessThan(0);
      expect(rig.key.position[1]).toBeGreaterThan(0);
      expect(rig.key.position[2]).toBeGreaterThan(0);
      // O contraluz vem de trás e é mais fraco que a principal só no estúdio claro.
      expect(rig.rim.position[2]).toBeLessThan(0);
      // O preenchimento é bem mais fraco que a principal, para não achatar o volume.
      expect(rig.fill!.intensity).toBeLessThan(rig.key.intensity * 0.5);
    }
    expect(computeLightRig('dark', 2).background).toBe(0x151517);
    expect(computeLightRig('dark', 2).groundShadowOpacity).toBeGreaterThan(computeLightRig('studio', 2).groundShadowOpacity);
  });

  it('as posições crescem com o tamanho do equipamento', () => {
    const a = computeLightRig('studio', 1);
    const b = computeLightRig('studio', 3);
    for (let i = 0; i < 3; i++) expect(b.key.position[i] / a.key.position[i]).toBeCloseTo(3, 6);
    expect(b.shadow.extent).toBeCloseTo(a.shadow.extent * 3, 6);
  });

  it('tamanho inválido cai num padrão seguro em vez de gerar NaN', () => {
    for (const bad of [0, -1, NaN, Infinity]) {
      const rig = computeLightRig('studio', bad);
      expect(rig.key.position.every(Number.isFinite)).toBe(true);
      expect(rig.shadow.far).toBeGreaterThan(0);
    }
  });

  it('tamanho do mapa de sombra: a qualidade explícita manda, senão vale o aparelho', () => {
    expect(shadowMapSize('low', 16, false)).toBe(1024);
    expect(shadowMapSize('high', 2, true)).toBe(2048);
    expect(shadowMapSize(undefined, 4, false)).toBe(1024);
    expect(shadowMapSize(undefined, 8, true)).toBe(1024);
    expect(shadowMapSize(undefined, 8, false)).toBe(2048);
  });
});

describe('ambiente de estúdio', () => {
  const scene = buildStudioScene();

  it('tem um painel por fonte declarada, sala e piso', () => {
    const names = scene.children.map((c) => c.name);
    for (const p of STUDIO_PANELS) expect(names).toContain(p.name);
    expect(names).toContain('sala');
    expect(names).toContain('piso');
  });

  it('as fontes são HDR e a sala é escura', () => {
    const color = (n: string) => ((scene.getObjectByName(n) as THREE.Mesh).material as THREE.MeshBasicMaterial).color;
    expect(color('softbox_alto').r).toBeGreaterThan(1);
    expect(color('tira_esquerda').r).toBeGreaterThan(1);
    expect(color('sala').r).toBeLessThan(0.02);
    // O softbox é a fonte mais forte, para o reflexo principal vir do alto.
    for (const p of STUDIO_PANELS) expect(color(p.name).r).toBeLessThanOrEqual(color('softbox_alto').r);
  });

  it('todo painel fica dentro da sala e voltado para o centro', () => {
    scene.updateMatrixWorld(true);
    for (const p of STUDIO_PANELS) {
      const m = scene.getObjectByName(p.name) as THREE.Mesh;
      expect(Math.abs(m.position.x)).toBeLessThan(7);
      expect(m.position.y).toBeLessThan(8);
      expect(Math.abs(m.position.z)).toBeLessThan(7);
      const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(m.quaternion);
      const toCenter = new THREE.Vector3(0, 1.5, 0).sub(m.position).normalize();
      expect(normal.dot(toCenter), p.name).toBeGreaterThan(0.3);
    }
  });
});

describe('sombra de contato', () => {
  it('distância a um polígono convexo: zero dentro, euclidiana fora', () => {
    const sq: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
    expect(distanceToConvex(sq, 0.5, 0.5)).toBe(0);
    expect(distanceToConvex(sq, 2, 0.5)).toBeCloseTo(1, 9);
    expect(distanceToConvex(sq, 2, 2)).toBeCloseTo(Math.SQRT2, 9);
    // Sentido horário dá o mesmo resultado.
    expect(distanceToConvex([...sq].reverse(), 0.5, 0.5)).toBe(0);
  });

  it('é mais escura sob o equipamento que longe dele, e some nas bordas', () => {
    const s = contactShadowData(rect(-0.5, 0.5, -0.8, 0.8));
    const under = contactShadowAlphaAt(s, 0, 0);
    const near = contactShadowAlphaAt(s, 0.62, 0);
    const far = contactShadowAlphaAt(s, s.bounds.maxX - 0.01, s.bounds.maxZ - 0.01);
    expect(under).toBeGreaterThan(0.4);
    expect(near).toBeLessThan(under);
    expect(near).toBeGreaterThan(far);
    expect(far).toBeLessThan(0.02);
  });

  it('respeita o escurecimento máximo', () => {
    const s = contactShadowData(rect(-0.5, 0.5, -0.5, 0.5), { maxAlpha: 0.3 });
    let max = 0;
    for (let i = 3; i < s.data.length; i += 4) max = Math.max(max, s.data[i]);
    expect(max / 255).toBeLessThanOrEqual(0.3 + 1 / 255);
  });

  it('a orientação confere: uma peça só na frente (+Z) escurece só a frente', () => {
    const fp = rect(-0.3, 0.3, 0.4, 0.8);
    fp.bounds = { minX: -0.3, maxX: 0.3, minZ: -0.8, maxZ: 0.8 };
    const s = contactShadowData(fp);
    expect(contactShadowAlphaAt(s, 0, 0.6)).toBeGreaterThan(0.4);
    expect(contactShadowAlphaAt(s, 0, -0.6)).toBeLessThan(0.05);
  });

  it('é determinística', () => {
    const fp = rect(-0.4, 0.4, -0.6, 0.6);
    expect(Buffer.from(contactShadowData(fp).data).equals(Buffer.from(contactShadowData(fp).data))).toBe(true);
  });

  it('com um equipamento real, o pé toca o piso e a sombra cobre a base', () => {
    const eq = generateEquipment(HANDWRITTEN_SPECS[0]);
    const s = contactShadowData(eq.footprint);
    const b = eq.footprint.bounds;
    const center = contactShadowAlphaAt(s, (b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2);
    const corner = contactShadowAlphaAt(s, s.bounds.minX + 0.005, s.bounds.minZ + 0.005);
    expect(center).toBeGreaterThan(corner);
    expect(corner).toBeLessThan(0.02);
  });

  it('o plano fica logo acima do piso, deitado, do tamanho da área coberta', () => {
    const shadow = createContactShadow(rect(-0.5, 0.5, -0.8, 0.8));
    const m = shadow.mesh;
    expect(m.position.y).toBeGreaterThan(0);
    expect(m.position.y).toBeLessThan(0.01);
    expect(m.rotation.x).toBeCloseTo(-Math.PI / 2, 9);
    const mat = m.material as THREE.MeshBasicMaterial;
    expect(mat.transparent).toBe(true);
    expect(mat.depthWrite).toBe(false);
    expect(mat.toneMapped).toBe(false);
    shadow.dispose();
  });
});

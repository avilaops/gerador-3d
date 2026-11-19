// @vitest-environment node
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { generateEquipment } from '../src';
import { installNodeShims } from '../src/export/nodeShims';
import { Figure, limbGeometry } from '../src/viewer/figure';

installNodeShims();

describe('limbGeometry', () => {
  it('tem normais unitárias (o LatheGeometry do r149 deixa a do último ponto sem normalizar)', () => {
    const n = limbGeometry(0.7, 0.1).getAttribute('normal') as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < n.count; i++) expect(v.fromBufferAttribute(n, i).length()).toBeCloseTo(1, 4);
  });

  it('mede 1 de comprimento em Y, afila e abaulado no meio', () => {
    const g = limbGeometry(0.6, 0.2, 0.5);
    g.computeBoundingBox();
    const b = g.boundingBox!;
    expect(b.max.y - b.min.y).toBeCloseTo(1, 5);
    const raioEm = (y: number) => {
      const p = g.getAttribute('position') as THREE.BufferAttribute;
      let r = 0;
      for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i) - y) < 0.02) r = Math.max(r, Math.hypot(p.getX(i), p.getZ(i)));
      return r;
    };
    expect(raioEm(0.45)).toBeLessThan(raioEm(0.0) * 0.8);
    expect(raioEm(0)).toBeGreaterThan(raioEm(-0.4) * 1.05 * 0.6);
  });

  it('não produz NaN', () => {
    const p = limbGeometry(1.18, 0.04).getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < p.array.length; i++) expect(Number.isFinite(p.array[i])).toBe(true);
  });
});

describe('Figure', () => {
  const spec = JSON.parse(readFileSync('catalogs/ludus-core/specs/LD-WH021.json', 'utf8'));
  const eq = generateEquipment(spec);
  const anchor = Figure.find(eq.object)!;

  it('o equipamento continua expondo a marca pose_hip', () => {
    expect(anchor).toBeDefined();
    expect(anchor.name).toBe('pose_hip');
  });

  it('usa materiais separados para pele, camisa, bermuda e tênis', () => {
    const f = new Figure(eq.object, anchor, []);
    const nomes = new Set<string>();
    f.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) nomes.add((m.material as THREE.Material).name);
    });
    expect([...nomes].sort()).toEqual(['figure_shirt', 'figure_shoe', 'figure_shorts', 'figure_skin']);
    f.dispose();
  });

  it('setVisible esconde e mostra o grupo, e update não gera NaN', () => {
    const f = new Figure(eq.object, anchor, []);
    f.setVisible(false);
    expect(f.group.visible).toBe(false);
    f.setVisible(true);
    f.update();
    f.group.traverse((o) => {
      expect(Number.isFinite(o.position.x + o.position.y + o.position.z)).toBe(true);
      expect(Number.isFinite(o.scale.x + o.scale.y + o.scale.z)).toBe(true);
    });
    f.dispose();
  });
});

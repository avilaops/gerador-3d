import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { seal } from '../src/families/seal.ts';

function body(kind) {
  return seal.build({ dims: { length: 0.1, width: 0.1, height: 0.02 }, params: { kind, innerDiameter: 0.08, bevel: 0.12 }, kit: { materials: { accent: new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }) } } }).root.children[0];
}

test('guide has a real opening through its wall; other seals remain closed', () => {
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1), 0, 1);
  assert.equal(ray.intersectObject(body('guide')).length, 0);
  assert.ok(ray.intersectObject(body('gasket')).length > 0);
});

test('guide cut is diagonal through the height and has closed end faces', () => {
  const mesh = body('guide');
  const geometry = mesh.geometry;
  assert.equal(geometry.userData.cut, 'diagonal');
  const pos = geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    assert.ok(Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)) && Number.isFinite(pos.getZ(i)));
  }
  // At the middle of the slit there is air; away from its skewed path there is material.
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 0.008, 1), new THREE.Vector3(0, 0, -1), 0, 1);
  assert.ok(ray.intersectObject(mesh).length > 0);
  assert.equal(geometry.userData.cappedEnds, true);
});

test('guide surface and both cut faces form a watertight mesh', () => {
  const p = body('guide').geometry.getAttribute('position');
  const edges = new Map();
  const key = i => [p.getX(i), p.getY(i), p.getZ(i)].map(v => v.toFixed(7)).join(',');
  for (let i = 0; i < p.count; i += 3) {
    for (const [a, b] of [[i,i+1],[i+1,i+2],[i+2,i]]) {
      const edge = [key(a),key(b)].sort().join('|');
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  }
  assert.ok([...edges.values()].every(count => count === 2));
});

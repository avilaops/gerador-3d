/**
 * Soldas: o cordão que aparece nas juntas de tubo.
 *
 * Geometria leve (anel ou cápsula de 5 a 6 lados), no material da estrutura. Sem normal map:
 * a solda é geometria porque a silhueta dela, vista de lado, é o que a foto mostra.
 */
import * as THREE from 'three';
import type { PartKit } from '../kit';
import type { Vec3 } from '../../spec/schema';
import { capsule, meshOf, mm, shared } from './base';

export interface WeldRingOptions {
  /** Centro da junta, no eixo do tubo. */
  at: Vec3;
  /** Direção do eixo do tubo. */
  dir: Vec3;
  /** Lado do tubo quadrado ou diâmetro do redondo. */
  size: number;
  name?: string;
}

/** Anel de solda em volta de um tubo, na junta com outro. */
export function weldRing(kit: PartKit, o: WeldRingOptions): THREE.Mesh {
  // Para tubo quadrado o anel circunscreve a seção; o raio do cordão é pequeno e fica rente.
  const ringR = (o.size / 2) * 1.12;
  const geo = shared(kit, `weld:ring:${mm(o.size)}`, () => new THREE.TorusGeometry(ringR, 0.0035, 6, 16));
  const m = meshOf(kit, geo, 'frame', o.name ?? 'weld_ring');
  m.position.set(...o.at);
  // O toro nasce com o eixo em Z: leva o eixo para a direção do tubo.
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...o.dir).normalize());
  return m;
}

export interface WeldBeadOptions {
  a: Vec3;
  b: Vec3;
  /** Raio do cordão (padrão 4 mm). */
  radius?: number;
  name?: string;
}

/** Cordão de solda reto entre dois pontos (chapa contra tubo, por exemplo). */
export function weldBead(kit: PartKit, o: WeldBeadOptions): THREE.Mesh {
  const A = new THREE.Vector3(...o.a);
  const B = new THREE.Vector3(...o.b);
  const len = Math.max(A.distanceTo(B), 0.002);
  const r = o.radius ?? 0.004;
  // Comprimento arredondado ao milímetro: cordões do mesmo tamanho dividem a mesma malha.
  const geo = shared(kit, `weld:bead:${mm(len)}:${mm(r)}`, () => capsule(mm(len), r, 6));
  const m = meshOf(kit, geo, 'frame', o.name ?? 'weld_bead');
  m.position.copy(A);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}

/**
 * Rig: atalhos de montagem em cima das peças básicas. Cada método cria a peça
 * e já a pendura no grupo indicado, para que um gerador de família caiba em
 * poucas linhas por conjunto.
 */
import * as THREE from 'three';
import type { PartKit, MaterialRole } from './kit';
import { beam, bentTube, box, plateHorn, rubberFoot, upholstery } from './primitives';
import { pivotArm } from './assemblies';
import type { Vec3 } from '../spec/schema';

export class Rig {
  constructor(
    readonly kit: PartKit,
    readonly root: THREE.Group
  ) {}

  group(name: string, parent: THREE.Object3D = this.root): THREE.Group {
    const g = new THREE.Group();
    g.name = name;
    parent.add(g);
    return g;
  }

  /** Tubo quadrado (ou retangular [largura, altura]) entre dois pontos. */
  tube(
    g: THREE.Object3D,
    a: Vec3,
    b: Vec3,
    size: number | [number, number] = 0.07,
    material: MaterialRole = 'frame',
    name?: string
  ): THREE.Mesh {
    const m = beam(this.kit, a, b, size, { material, name });
    g.add(m);
    return m;
  }

  /** Tubo redondo entre dois pontos. */
  rod(
    g: THREE.Object3D,
    a: Vec3,
    b: Vec3,
    diameter = 0.035,
    material: MaterialRole = 'chrome',
    name?: string
  ): THREE.Mesh {
    const m = beam(this.kit, a, b, diameter, { round: true, material, name });
    g.add(m);
    return m;
  }

  /** Quadro dobrado: polilinha de tubos com as juntas fechadas. */
  path(
    g: THREE.Object3D,
    points: Vec3[],
    size: number | [number, number] = 0.07,
    material: MaterialRole = 'frame',
    name?: string,
    radius?: number
  ): THREE.Group {
    const p = bentTube(this.kit, points, size, { material, name, radius });
    g.add(p);
    return p;
  }

  box(
    g: THREE.Object3D,
    size: Vec3,
    center: Vec3,
    material: MaterialRole = 'frame',
    name?: string
  ): THREE.Mesh {
    const m = box(this.kit, size, center, { material, name });
    g.add(m);
    return m;
  }

  /** Estofado [largura X, espessura/altura Y, profundidade Z], com inclinação opcional em X. */
  pad(g: THREE.Object3D, size: Vec3, center: Vec3, tiltX = 0, name?: string): THREE.Mesh {
    const m = upholstery(this.kit, size, center, { tiltX, name });
    g.add(m);
    return m;
  }

  /** Rolo estofado (apoio de tornozelo, coxa) entre dois pontos. */
  roller(g: THREE.Object3D, a: Vec3, b: Vec3, diameter = 0.11, name?: string): THREE.Mesh {
    return this.rod(g, a, b, diameter, 'upholstery', name);
  }

  /** Pegada emborrachada entre dois pontos. */
  grip(g: THREE.Object3D, a: Vec3, b: Vec3, name?: string): THREE.Mesh {
    return this.rod(g, a, b, 0.036, 'rubber', name);
  }

  /** Pino de anilhas. */
  horn(g: THREE.Object3D, base: Vec3, dir: Vec3, length = 0.2, name?: string): THREE.Group {
    const h = plateHorn(this.kit, base, dir, length, 0.05, name);
    g.add(h);
    return h;
  }

  /** Anilha (disco) com eixo em X, centrada em `center`. */
  plate(g: THREE.Object3D, center: Vec3, diameter = 0.45, thickness = 0.04): THREE.Mesh {
    const m = new THREE.Mesh(this.kit.disc(diameter, thickness), this.kit.materials.plate);
    m.rotation.z = Math.PI / 2;
    m.position.set(...center);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  }

  foot(g: THREE.Object3D, x: number, z: number, size: [number, number] = [0.1, 0.1]): void {
    g.add(rubberFoot(this.kit, x, z, size));
  }

  /** Grupo articulado com origem no pivô (cubo do eixo incluído). */
  arm(
    name: string,
    pivot: Vec3,
    axis: 'x' | 'y' | 'z' = 'x',
    parent: THREE.Object3D = this.root,
    hub: { diameter?: number; length?: number } = {}
  ): THREE.Group {
    const g = pivotArm(this.kit, name, pivot, { axis, ...hub });
    parent.add(g);
    return g;
  }
}

/** Soma de vetores. */
export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** Interpolação linear entre dois pontos. */
export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Espelha um ponto no plano YZ. */
export function mirror(p: Vec3, side: 1 | -1): Vec3 {
  return [p[0] * side, p[1], p[2]];
}

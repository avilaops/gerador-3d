/**
 * Peças comuns aos equipamentos de cardio (esteira, bicicleta, elíptico, escada):
 * carenagem arredondada, roda/volante, console com tela e pedal.
 *
 * Convenção: o usuário olha para +Z. Logo o console fica à frente (+Z) e a face da tela
 * olha para −Z, na direção de quem usa.
 */
import * as THREE from 'three';
import type { MaterialRole } from '../../parts/kit';
import { mesh, upholstery } from '../../parts/primitives';
import type { Rig } from '../../parts/rig';
import type { Vec3 } from '../../spec/schema';

/** Caixa de cantos arredondados em qualquer material (carenagens, consoles, plataformas). */
export function shell(
  rig: Rig,
  g: THREE.Object3D,
  size: Vec3,
  center: Vec3,
  opts: { radius?: number; tiltX?: number; material?: MaterialRole; name?: string } = {}
): THREE.Mesh {
  const m = upholstery(rig.kit, size, center, {
    material: opts.material ?? 'frame',
    radius: opts.radius ?? 0.02,
    tiltX: opts.tiltX,
    name: opts.name,
  });
  g.add(m);
  return m;
}

/** Disco com eixo ao longo de X (volante de inércia, roda). */
export function wheel(
  rig: Rig,
  g: THREE.Object3D,
  center: Vec3,
  diameter: number,
  thickness: number,
  material: MaterialRole = 'plate',
  name?: string
): THREE.Mesh {
  const m = mesh(rig.kit, rig.kit.unitCylinder, material, name);
  m.scale.set(diameter, thickness, diameter);
  m.rotation.z = Math.PI / 2;
  m.position.set(...center);
  g.add(m);
  return m;
}

export type ScreenKind = 'led' | 'touch' | 'lcd';

/** Altura e largura do corpo do console para cada tipo de tela. */
export function consoleSize(screen: ScreenKind, maxWidth: number): { w: number; h: number; d: number } {
  switch (screen) {
    case 'led':
      return { w: Math.min(0.5, maxWidth), h: 0.2, d: 0.09 };
    case 'lcd':
      return { w: Math.min(0.56, maxWidth), h: 0.34, d: 0.08 };
    case 'touch':
      return { w: Math.min(0.6, maxWidth), h: 0.4, d: 0.07 };
  }
}

/**
 * Console: corpo escuro inclinado para o usuário, com a tela na face voltada a −Z.
 * `center` é o centro do corpo; `tilt` inclina o topo para longe de quem usa (rad).
 */
export function consoleHead(
  rig: Rig,
  parent: THREE.Object3D,
  o: { center: Vec3; size: { w: number; h: number; d: number }; tilt: number; name?: string }
): THREE.Group {
  const g = rig.group(o.name ?? 'console', parent);
  g.position.set(...o.center);
  g.rotation.x = o.tilt;
  const { w, h, d } = o.size;
  shell(rig, g, [w, h, d], [0, 0, 0], { radius: 0.025, name: 'console_body' });
  // Moldura e tela (preto fosco), levemente salientes na face do usuário.
  shell(rig, g, [w * 0.9, h * 0.78, 0.012], [0, 0, -d / 2 - 0.003], { radius: 0.008, material: 'rubber', name: 'screen' });
  // Faixa de cor da marca sob a tela.
  rig.box(g, [w * 0.5, 0.008, 0.006], [0, -h * 0.5 + 0.012, -d / 2 - 0.004], 'accent', 'console_stripe');
  return g;
}

/** Pedal: plataforma de borracha com base de estrutura. Centrada em `center`. */
export function pedal(rig: Rig, g: THREE.Object3D, center: Vec3, name = 'pedal'): void {
  rig.box(g, [0.1, 0.025, 0.12], center, 'frame', name);
  rig.box(g, [0.095, 0.01, 0.115], [center[0], center[1] + 0.016, center[2]], 'rubber', `${name}_tread`);
}

/** Apoios de borracha nas pontas de uma barra transversal (estabilizador). */
export function stabilizer(rig: Rig, g: THREE.Object3D, y: number, z: number, halfWidth: number, size = 0.05): void {
  rig.tube(g, [-halfWidth, y, z], [halfWidth, y, z], size);
  for (const s of [-1, 1] as const) rig.foot(g, s * halfWidth, z, [0.08, 0.08]);
}

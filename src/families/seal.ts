import * as THREE from 'three';
import { z } from 'zod';
import type { FamilyDefinition } from './types';

export const SEAL_KINDS = ['gasket', 'wiper', 'guide', 'oring', 'seal'] as const;

const SealParamsSchema = z.object({
  kind: z.enum(SEAL_KINDS),
  innerDiameter: z.number().positive(),
  bevel: z.number().nonnegative().max(0.45),
});
type SealParams = z.infer<typeof SealParamsSchema>;

/** Vedação anular plana, dimensionada por DI, DE e altura/espessura. */
export const seal: FamilyDefinition<SealParams> = {
  id: 'seal',
  label: 'Vedação anular',
  paramsSchema: SealParamsSchema,

  defaults(d, spec) {
    const meta = (spec.meta ?? {}) as Record<string, unknown>;
    const kind = typeof meta.kind === 'string' && SEAL_KINDS.includes(meta.kind as SealParams['kind'])
      ? (meta.kind as SealParams['kind'])
      : 'seal';
    return {
      kind,
      innerDiameter: Math.max(0.001, Math.min(d.length, d.width) * 0.8),
      bevel: kind === 'oring' ? 0.5 : 0.12,
    };
  },

  build({ dims, params, kit }) {
    const root = new THREE.Group();
    root.name = 'equipment';
    const outerDiameter = Math.min(dims.length, dims.width);
    const innerDiameter = Math.min(params.innerDiameter, outerDiameter * 0.98);
    const outer = outerDiameter / 2;
    const inner = innerDiameter / 2;
    const halfHeight = dims.height / 2;
    const bevel = Math.min(halfHeight * params.bevel, (outer - inner) * 0.2);
    const profile = [
      new THREE.Vector2(inner, -halfHeight + bevel),
      new THREE.Vector2(inner + bevel, -halfHeight),
      new THREE.Vector2(outer - bevel, -halfHeight),
      new THREE.Vector2(outer, -halfHeight + bevel),
      new THREE.Vector2(outer, halfHeight - bevel),
      new THREE.Vector2(outer - bevel, halfHeight),
      new THREE.Vector2(inner + bevel, halfHeight),
      new THREE.Vector2(inner, halfHeight - bevel),
      new THREE.Vector2(inner, -halfHeight + bevel),
    ];
    const geometry = params.kind === 'guide'
      ? guideGeometry(profile, outer, dims.height)
      : new THREE.LatheGeometry(profile, 64);
    geometry.name = `seal:${params.kind}`;
    const mesh = new THREE.Mesh(geometry, kit.materials.accent);
    mesh.name = 'seal_body';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return { root, articulations: [] };
  },
};

/** Corte obliquo: as pontas se sobrepoem na projecao, com folga real entre elas. */
function guideGeometry(profile: THREE.Vector2[], radius: number, height: number): THREE.BufferGeometry {
  const gap = Math.min(0.07, (radius - profile[0].x) * 0.25 / radius);
  const sweep = Math.PI * 2 - gap;
  const skew = Math.min(0.55, height / radius * 0.7);
  const lathe = new THREE.LatheGeometry(profile, 128, gap / 2, sweep);
  const position = lathe.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    const angle = Math.atan2(position.getX(i), position.getZ(i)) + y / height * skew;
    const r = Math.hypot(position.getX(i), position.getZ(i));
    position.setXYZ(i, Math.sin(angle) * r, y, Math.cos(angle) * r);
  }
  const surface = lathe.toNonIndexed();
  const vertices = Array.from((surface.getAttribute('position') as THREE.BufferAttribute).array);
  const contour = profile.slice(0, -1);
  const triangles = THREE.ShapeUtils.triangulateShape(contour, []);
  for (const end of [0, 1]) {
    for (const triangle of triangles) {
      const indices = end === 0 ? triangle : [...triangle].reverse();
      for (const index of indices) {
        const p = contour[index];
        const angle = gap / 2 + end * sweep + p.y / height * skew;
        vertices.push(Math.sin(angle) * p.x, p.y, Math.cos(angle) * p.x);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  geometry.userData.cut = 'diagonal';
  geometry.userData.cappedEnds = true;
  lathe.dispose();
  surface.dispose();
  return geometry;
}
import * as THREE from 'three';

export type CameraTarget = readonly [number, number, number];

/**
 * Returns the minimum safe distance that keeps a product's bounding sphere in
 * the vertical field of view, while honoring the distance selected in the spec.
 */
export function fitCameraDistance(
  bounds: THREE.Box3,
  target: CameraTarget,
  configuredDistance: number,
  fovDeg: number,
  margin = 1.15
): number {
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const targetVector = new THREE.Vector3(...target);
  const radius = size.length() / 2 + center.distanceTo(targetVector);
  const fov = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(fovDeg, 1, 179));
  const safeMargin = Number.isFinite(margin) && margin > 0 ? margin : 1.15;
  const fit = (radius * safeMargin) / Math.tan(fov / 2);
  return Math.max(Number.isFinite(configuredDistance) ? configuredDistance : 0, fit);
}

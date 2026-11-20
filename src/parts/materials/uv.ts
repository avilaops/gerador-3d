/**
 * UV em metros: a mesma textura tem o mesmo tamanho físico em peças grandes e pequenas.
 */
import * as THREE from 'three';

/** Lado, em metros, de um ladrilho de textura: o UV vale 1 a cada `TILE_M` de superfície. */
export const TILE_M = 0.12;

/**
 * Mapeamento por caixa (triplanar, pelo eixo dominante da normal) com UV em
 * unidades de `tileM` metros. Serve às caixas de cantos arredondados, cuja malha
 * traz UV de 0 a 1 por face, o que esticaria a textura conforme a medida da peça.
 */
export function applyMetricBoxUV(geometry: THREE.BufferGeometry, tileM: number): THREE.BufferGeometry {
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
  const nor = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    let u: number;
    let v: number;
    if (nx >= ny && nx >= nz) {
      u = pos.getZ(i);
      v = pos.getY(i);
    } else if (ny >= nz) {
      u = pos.getX(i);
      v = pos.getZ(i);
    } else {
      u = pos.getX(i);
      v = pos.getY(i);
    }
    uv[i * 2] = u / tileM;
    uv[i * 2 + 1] = v / tileM;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

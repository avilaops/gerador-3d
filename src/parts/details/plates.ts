/**
 * Chapas: antiderrapante (relevo em barras) e furada (furos de verdade, não textura).
 */
import * as THREE from 'three';
import type { PartKit } from '../kit';
import type { Vec3 } from '../../spec/schema';
import { chamferBox, groupOf, meshOf, mm, shared } from './base';

export interface TreadPlateOptions {
  /** Distância entre as barras de relevo (padrão 35 mm). */
  pitch?: number;
  name?: string;
}

/**
 * Chapa antiderrapante [largura X, espessura Y, profundidade Z]: chapa de cantos arredondados com
 * barras de relevo inclinadas (em espinha), cada uma com 2 mm de altura. As barras ficam dentro
 * da chapa: a inclinação é descontada da margem.
 */
export function treadPlate(kit: PartKit, size: Vec3, center: Vec3, o: TreadPlateOptions = {}): THREE.Group {
  const [w, h, d] = size;
  const g = groupOf(o.name ?? 'tread_plate');
  g.add(meshOf(kit, kit.roundedBox(w, h, d, Math.min(0.004, h * 0.4)), 'plate', 'tread_base'));
  const pitch = o.pitch ?? 0.035;
  const angle = 0.2;
  const barLen = mm(w - 0.03);
  // A barra inclinada avança em Z metade do comprimento vezes o seno do ângulo: sem essa margem as
  // barras das pontas saíam da chapa.
  const margin = 0.5 * barLen * Math.sin(angle) + 0.006;
  const n = Math.max(0, Math.floor((d - 2 * margin) / pitch) + 1);
  const bar = shared(kit, `tread:bar:${barLen}`, () => chamferBox(barLen, 0.002, 0.008, 0.0008));
  for (let i = 0; i < n; i++) {
    const m = meshOf(kit, bar, 'plate', 'tread_bar');
    // As barras alternam a inclinação, como o desenho em espinha da chapa real.
    m.rotation.y = i % 2 === 0 ? angle : -angle;
    m.position.set(0, h / 2 + 0.001, -d / 2 + margin + i * pitch);
    g.add(m);
  }
  g.position.set(...center);
  return g;
}

export interface PerforatedPlateOptions {
  /** Distância entre centros dos furos (padrão 20 mm). */
  pitch?: number;
  /** Diâmetro dos furos (padrão 8 mm). */
  hole?: number;
  name?: string;
}

/** Limite de furos: cada um custa cerca de 55 triângulos. */
export const MAX_HOLES = 48;

/**
 * Chapa furada [largura X, espessura Y, profundidade Z] com furos de verdade (a geometria é
 * vazada). Lança `RangeError` se a grade passar de `MAX_HOLES` furos.
 */
export function perforatedPlate(kit: PartKit, size: Vec3, center: Vec3, o: PerforatedPlateOptions = {}): THREE.Mesh {
  const [w, h, d] = size;
  const pitch = o.pitch ?? 0.02;
  const hole = o.hole ?? 0.008;
  const margin = hole / 2 + 0.006;
  const nx = Math.max(0, Math.floor((w - 2 * margin) / pitch) + 1);
  const nz = Math.max(0, Math.floor((d - 2 * margin) / pitch) + 1);
  if (nx * nz > MAX_HOLES) throw new RangeError(`Chapa furada com ${nx * nz} furos passa do limite de ${MAX_HOLES}: aumente o passo.`);
  const geo = shared(kit, `perforated:${mm(w)}:${mm(h)}:${mm(d)}:${mm(pitch)}:${mm(hole)}`, () => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, -d / 2);
    shape.lineTo(w / 2, -d / 2);
    shape.lineTo(w / 2, d / 2);
    shape.lineTo(-w / 2, d / 2);
    shape.closePath();
    const x0 = -((nx - 1) * pitch) / 2;
    const z0 = -((nz - 1) * pitch) / 2;
    for (let i = 0; i < nx; i++)
      for (let k = 0; k < nz; k++) {
        const c = new THREE.Path();
        c.absarc(x0 + i * pitch, z0 + k * pitch, hole / 2, 0, Math.PI * 2, true);
        shape.holes.push(c);
      }
    const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 6 });
    // A extrusão sai em Z com a forma em (x, y): deita para que a forma fique em (x, z) e a espessura em Y.
    g.rotateX(-Math.PI / 2);
    g.translate(0, -h / 2, 0);
    return g;
  });
  const m = meshOf(kit, geo, 'plate', o.name ?? 'perforated_plate');
  m.position.set(...center);
  return m;
}

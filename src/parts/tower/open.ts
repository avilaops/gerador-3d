/**
 * Quadro aberto da torre de bateria, como nas máquinas Core: dois montantes, cabeçote com a
 * plaqueta da marca e travessas atrás. Nada de chapa na frente nem nos lados: a pilha de placas
 * e as hastes-guia cromadas ficam à vista. A pilha em si vem de `weightStack` (assemblies.ts).
 *
 * O estilo carenado, de coluna fechada em chapa, continua sendo o padrão (`style: 'solid'`):
 * é o das fotos do Premium.
 */
import * as THREE from 'three';
import type { PartKit } from '../kit';
import { beam, box } from '../primitives';

/** Medidas do quadro aberto, em metros. Exportadas porque os testes conferem a geometria. */
export const OPEN_TOWER = {
  /** Meia distância entre as faces externas dos montantes. */
  halfWidth: 0.19,
  /** Profundidade do quadro (z). */
  depth: 0.2,
  /** Altura do cabeçote. */
  headerHeight: 0.17,
  /** Altura da travessa de base. */
  footHeight: 0.06,
  /** Lado dos montantes. */
  postWidth: 0.06,
} as const;

export interface OpenFrameOptions {
  /** Altura total da torre, incluindo o cabeçote. */
  height: number;
}

export interface OpenFrame {
  frame: THREE.Group;
  /** Altura da face de baixo do cabeçote: onde terminam as hastes-guia. */
  headerBottomY: number;
}

export function openTowerFrame(kit: PartKit, o: OpenFrameOptions): OpenFrame {
  const { halfWidth, depth, headerHeight, footHeight, postWidth } = OPEN_TOWER;
  const frame = new THREE.Group();
  frame.name = 'tower_frame';
  const headerBottomY = o.height - headerHeight;
  const postX = halfWidth - postWidth / 2;

  for (const s of [-1, 1] as const) {
    frame.add(
      beam(kit, [s * postX, 0, 0], [s * postX, headerBottomY, 0], [postWidth, 0.05], {
        name: s < 0 ? 'tower_post_left' : 'tower_post_right',
      })
    );
  }
  frame.add(box(kit, [2 * halfWidth, footHeight, depth], [0, footHeight / 2, 0], { name: 'tower_foot' }));
  frame.add(box(kit, [2 * halfWidth, headerHeight, depth], [0, o.height - headerHeight / 2, 0], { name: 'tower_header' }));
  // Plaqueta da marca na frente do cabeçote.
  frame.add(
    box(kit, [0.16, headerHeight * 0.5, 0.004], [0, o.height - headerHeight / 2, depth / 2 + 0.002], {
      material: 'label',
      name: 'tower_label',
    })
  );
  // Travessas atrás, entre os montantes: dão rigidez e fecham o fundo sem esconder a pilha.
  // Ficam atrás das placas (que ocupam z de -0,065 a 0,065): senão a pilha as atravessa ao subir.
  const braceSide = 0.03;
  const braceZ = -depth / 2 + braceSide / 2;
  for (const f of [0.3, 0.7]) {
    frame.add(
      beam(kit, [-postX, f * headerBottomY, braceZ], [postX, f * headerBottomY, braceZ], braceSide, {
        name: 'tower_brace',
      })
    );
  }
  return { frame, headerBottomY };
}

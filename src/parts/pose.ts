/**
 * Marca de pose: onde fica o quadril de quem usa o equipamento.
 *
 * É um nó vazio chamado `pose_hip`; o +Z local dele é a frente da pessoa. O
 * visualizador usa essa marca para sentar (ou pôr de pé) a pessoa de 1,75 m no
 * equipamento. Não tem geometria e não entra na caixa nem na planta.
 */
import * as THREE from 'three';

export interface PoseData {
  kind: 'seated' | 'standing';
  /** Inclinação do tronco para trás (rad). Negativo inclina para a frente. */
  tilt: number;
  /** Onde ficam os pés: no piso ou presos ao rolo da alavanca. */
  feet: 'floor' | 'roller';
}

export const POSE_NODE = 'pose_hip';

export function poseAnchor(position: [number, number, number], data: PoseData): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = POSE_NODE;
  o.position.set(...position);
  o.userData.pose = data;
  return o;
}

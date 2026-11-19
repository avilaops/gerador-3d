/**
 * Ambiente de estúdio de produto para os reflexos.
 *
 * O `RoomEnvironment` do Three é uma sala clara: tudo o que é brilhante reflete luz de
 * todos os lados e a tinta preta sai cinza. Um estúdio real é o contrário: o equipamento
 * fica numa sala escura, com poucas fontes grandes (um softbox no alto, duas tiras
 * laterais) e cartões pretos em volta. A tinta preta reflete preto e só os reflexos das
 * fontes aparecem, que é o que desenha a forma numa foto de produto.
 *
 * As fontes são painéis emissivos com intensidade acima de 1 (o PMREM guarda em ponto
 * flutuante), então não é preciso arquivo HDRI nenhum.
 */
import * as THREE from 'three';

export interface StudioPanel {
  name: string;
  /** Intensidade da emissão; acima de 1 é HDR. */
  intensity: number;
  size: [number, number];
  position: [number, number, number];
  /** Rotação em XYZ (rad). O painel nasce voltado para +Z. */
  rotation: [number, number, number];
}

/** Painéis do estúdio. O centro da sala é a origem, onde fica o equipamento. */
export const STUDIO_PANELS: readonly StudioPanel[] = [
  { name: 'softbox_alto', intensity: 6, size: [7, 5], position: [0, 6.5, 0], rotation: [Math.PI / 2, 0, 0] },
  { name: 'tira_esquerda', intensity: 4, size: [1.2, 6], position: [-6.5, 3, 0], rotation: [0, Math.PI / 2, 0] },
  { name: 'tira_direita', intensity: 3, size: [1.2, 6], position: [6.5, 3, 0], rotation: [0, -Math.PI / 2, 0] },
  { name: 'cartao_frente', intensity: 0.8, size: [8, 3], position: [0, 2, 6.5], rotation: [0, Math.PI, 0] },
  { name: 'tira_fundo', intensity: 2, size: [4, 6], position: [0, 3, -6.5], rotation: [0, 0, 0] },
];

/** Luminância do piso e das paredes da sala, em valores lineares. */
export const STUDIO_FLOOR = 0.35;
export const STUDIO_WALL = 0.006;

export function buildStudioScene(): THREE.Scene {
  const scene = new THREE.Scene();
  // Sala escura: as paredes são os "cartões pretos".
  const wallMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
  wallMat.color.setScalar(STUDIO_WALL);
  const room = new THREE.Mesh(new THREE.BoxGeometry(14, 10, 14), wallMat);
  room.name = 'sala';
  room.position.y = 3;
  scene.add(room);

  const floorMat = new THREE.MeshBasicMaterial();
  floorMat.color.setScalar(STUDIO_FLOOR);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), floorMat);
  floor.name = 'piso';
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.98;
  scene.add(floor);

  for (const p of STUDIO_PANELS) {
    const mat = new THREE.MeshBasicMaterial();
    mat.color.setScalar(p.intensity);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(...p.size), mat);
    panel.name = p.name;
    panel.position.set(...p.position);
    panel.rotation.set(...p.rotation);
    scene.add(panel);
  }
  return scene;
}

/** Libera geometrias e materiais de uma cena de estúdio. */
export function disposeStudioScene(scene: THREE.Scene): void {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    (m.material as THREE.Material | undefined)?.dispose();
  });
}

/**
 * Converte o estúdio em mapa de ambiente (PMREM). Quem chama é dono do alvo devolvido e
 * deve liberá-lo com `dispose()`.
 */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const scene = buildStudioScene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.04);
  pmrem.dispose();
  disposeStudioScene(scene);
  return target;
}

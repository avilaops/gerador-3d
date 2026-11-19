/**
 * Pessoa de 1,75 m usando o equipamento.
 *
 * As famílias marcam onde fica o quadril de quem usa com um nó vazio chamado
 * `pose_hip` (o +Z local dele é a frente da pessoa). A figura é montada a
 * partir desse ponto: tronco inclinado conforme o encosto, mãos nas pegadas
 * que se movem e pés no piso ou no rolo. Braços e pernas são resolvidos a cada
 * quadro, então a pessoa acompanha o movimento do equipamento.
 */
import * as THREE from 'three';
import { POSE_NODE, type PoseData } from '../parts/pose';

const TORSO = 0.5;
const UPPER_ARM = 0.3;
const FOREARM = 0.31;
const THIGH = 0.43;
const SHIN = 0.45;
const SHOULDER_HALF = 0.19;
const HIP_HALF = 0.1;

const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _m = new THREE.Matrix4();

/**
 * Membro afilado de comprimento 1 ao longo de Y (de -0,5, proximal, a +0,5, distal) e raio 1 no
 * começo. `taper` é o raio no fim (relativo ao começo) e `bulge` o volume do músculo no meio:
 * a barriga da perna, o bíceps. A escala não uniforme de `segment()` leva comprimento e raio
 * para as medidas reais. As pontas ficam escondidas dentro das esferas de junta.
 */
export function limbGeometry(taper: number, bulge = 0, bulgeAt = 0.45, rings = 6, sides = 18): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, -0.5)];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const muscle = 1 + bulge * Math.exp(-(((t - bulgeAt) / 0.28) ** 2));
    pts.push(new THREE.Vector2((1 + (taper - 1) * t) * muscle, -0.5 + t));
  }
  pts.push(new THREE.Vector2(0, 0.5));
  const g = new THREE.LatheGeometry(pts, sides);
  // O LatheGeometry do r149 deixa a normal do último ponto sem normalizar (o validador de glTF recusa).
  const n = g.getAttribute('normal') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < n.count; i++) {
    v.fromBufferAttribute(n, i);
    if (v.lengthSq() > 0) n.setXYZ(i, ...v.normalize().toArray());
  }
  return g;
}

/** Cores da figura: pele neutra, camisa e bermuda escuras, tênis claro. */
const TONES = { skin: 0xc9a98b, shirt: 0x2f3745, shorts: 0x20242c, shoe: 0xe9e7e1 } as const;
type Tone = keyof typeof TONES;

/** Material de cada peça do corpo. */
const LIMB_TONE: Record<string, Tone> = {
  torso: 'shirt', neck: 'skin',
  armL1: 'skin', armL2: 'skin', armR1: 'skin', armR2: 'skin',
  legL1: 'shorts', legL2: 'skin', legR1: 'shorts', legR2: 'skin',
};
const JOINT_TONE: Record<string, Tone> = {
  head: 'skin', pelvis: 'shorts', shL: 'shirt', shR: 'shirt', elL: 'skin', elR: 'skin',
  haL: 'skin', haR: 'skin', knL: 'skin', knR: 'skin', ftL: 'shoe', ftR: 'shoe',
};
/** Forma de cada membro: [afilamento, volume do músculo, posição do volume de 0 a 1]. */
const LIMB_SHAPE: Record<string, [number, number, number]> = {
  torso: [1.18, 0.04, 0.6], neck: [0.92, 0, 0.5],
  armL1: [0.84, 0.1, 0.4], armR1: [0.84, 0.1, 0.4], armL2: [0.7, 0.08, 0.3], armR2: [0.7, 0.08, 0.3],
  legL1: [0.74, 0.07, 0.35], legR1: [0.74, 0.07, 0.35], legL2: [0.62, 0.14, 0.28], legR2: [0.62, 0.14, 0.28],
};

export class Figure {
  readonly group = new THREE.Group();
  private readonly anchor: THREE.Object3D;
  private readonly pose: PoseData;
  private readonly materials: Record<Tone, THREE.MeshStandardMaterial>;
  private readonly ball = new THREE.SphereGeometry(1, 16, 10);
  private readonly head = new THREE.SphereGeometry(1, 24, 16);
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly limbs: Record<string, THREE.Mesh> = {};
  private readonly joints: Record<string, THREE.Mesh> = {};
  private readonly grips: THREE.Mesh[] = [];
  private readonly rollers: THREE.Mesh[] = [];

  static find(root: THREE.Object3D): THREE.Object3D | undefined {
    return root.getObjectByName(POSE_NODE) ?? undefined;
  }

  constructor(root: THREE.Object3D, anchor: THREE.Object3D, movingNodes: string[]) {
    this.anchor = anchor;
    this.pose = anchor.userData.pose as PoseData;
    this.group.name = 'figure';
    this.materials = Object.fromEntries(
      (Object.keys(TONES) as Tone[]).map((t) => {
        const m = new THREE.MeshStandardMaterial({ color: TONES[t], roughness: t === 'shoe' ? 0.7 : 0.85, metalness: 0 });
        m.name = `figure_${t}`;
        m.envMapIntensity = 0.2;
        return [t, m];
      })
    ) as Record<Tone, THREE.MeshStandardMaterial>;

    // Pegadas e rolos que se movem com as alavancas: é neles que a pessoa segura e apoia.
    const moving = new Set(movingNodes);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      let p: THREE.Object3D | null = mesh;
      let isMoving = false;
      while (p && p !== root) {
        if (moving.has(p.name)) isMoving = true;
        p = p.parent;
      }
      if (!isMoving) return;
      const name = `${mesh.name} ${mesh.parent?.name ?? ''}`;
      if (/grip/.test(name)) this.grips.push(mesh);
      else if (/roller/.test(name)) this.rollers.push(mesh);
    });

    for (const k of Object.keys(LIMB_TONE)) {
      const [taper, bulge, at] = LIMB_SHAPE[k];
      const geometry = limbGeometry(taper, bulge, at);
      this.geometries.push(geometry);
      this.limbs[k] = this.mesh(geometry, LIMB_TONE[k], `figure_${k}`);
    }
    for (const k of Object.keys(JOINT_TONE)) this.joints[k] = this.mesh(k === 'head' ? this.head : this.ball, JOINT_TONE[k], `figure_${k}`);
    this.update();
  }

  private mesh(geometry: THREE.BufferGeometry, tone: Tone, name: string): THREE.Mesh {
    const m = new THREE.Mesh(geometry, this.materials[tone]);
    m.name = name;
    m.castShadow = true;
    this.group.add(m);
    return m;
  }

  /** Mostra ou esconde a pessoa (as imagens de catálogo podem preferir o equipamento sozinho). */
  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  /** Centro de uma malha no mundo (as pegadas de tubo curvado têm a origem em outro lugar). */
  private center(mesh: THREE.Mesh, out: THREE.Vector3): THREE.Vector3 {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    return mesh.localToWorld(mesh.geometry.boundingBox!.getCenter(out));
  }

  private nearest(list: THREE.Mesh[], to: THREE.Vector3, maxDist: number): THREE.Vector3 | null {
    let best: THREE.Vector3 | null = null;
    let bestD = maxDist;
    for (const m of list) {
      const c = this.center(m, new THREE.Vector3());
      const d = c.distanceTo(to);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  private segment(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, r: number, rz = r) {
    _a.subVectors(b, a);
    const len = Math.max(_a.length(), 1e-4);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(UP, _a.normalize());
    mesh.scale.set(r, len, rz);
  }

  private joint(mesh: THREE.Mesh, p: THREE.Vector3, r: number) {
    mesh.position.copy(p);
    mesh.scale.setScalar(r);
  }

  /** Junta do meio de um membro de dois segmentos (cotovelo, joelho), puxada na direção de `pole`. */
  private bend(a: THREE.Vector3, target: THREE.Vector3, l1: number, l2: number, pole: THREE.Vector3, end: THREE.Vector3) {
    const dir = _a.subVectors(target, a);
    const dist = THREE.MathUtils.clamp(dir.length(), Math.abs(l1 - l2) + 0.02, l1 + l2 - 0.005);
    dir.normalize();
    end.copy(a).addScaledVector(dir, dist);
    const along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(l1 * l1 - along * along, 0));
    const side = _b.copy(pole).addScaledVector(dir, -pole.dot(dir));
    if (side.lengthSq() < 1e-6) side.set(0, 0, 1);
    side.normalize();
    return new THREE.Vector3().copy(a).addScaledVector(dir, along).addScaledVector(side, h);
  }

  update(): void {
    this.anchor.updateWorldMatrix(true, false);
    const hip = new THREE.Vector3().setFromMatrixPosition(this.anchor.matrixWorld);
    _m.extractRotation(this.anchor.matrixWorld);
    const right = new THREE.Vector3(1, 0, 0).applyMatrix4(_m).normalize();
    const fwd = new THREE.Vector3(0, 0, 1).applyMatrix4(_m).normalize();
    const { tilt, kind, feet } = this.pose;

    const spine = new THREE.Vector3().copy(UP).multiplyScalar(Math.cos(tilt)).addScaledVector(fwd, -Math.sin(tilt));
    const chest = new THREE.Vector3().copy(hip).addScaledVector(spine, TORSO);
    const head = new THREE.Vector3().copy(chest).addScaledVector(spine, 0.2);

    // Tronco: cilindro achatado, com a largura dos ombros em `right`.
    const torso = this.limbs.torso;
    torso.position.copy(hip).add(chest).multiplyScalar(0.5);
    _m.makeBasis(right, spine, new THREE.Vector3().crossVectors(right, spine));
    torso.quaternion.setFromRotationMatrix(_m);
    // A geometria do tronco afila: a escala é a da cintura (extremo do quadril); o peito sai 18% maior.
    torso.scale.set(0.15, TORSO, 0.1);
    this.segment(this.limbs.neck, chest, head, 0.048);
    this.joint(this.joints.head, head.clone().addScaledVector(spine, 0.06), 0.105);
    this.joints.pelvis.position.copy(hip);
    this.joints.pelvis.quaternion.copy(torso.quaternion);
    this.joints.pelvis.scale.set(0.17, 0.11, 0.12);

    for (const s of [-1, 1] as const) {
      const k = s < 0 ? 'L' : 'R';
      // Braço
      const shoulder = new THREE.Vector3().copy(chest).addScaledVector(right, s * SHOULDER_HALF).addScaledVector(spine, -0.04);
      const reach = new THREE.Vector3().copy(shoulder).addScaledVector(fwd, 0.3).addScaledVector(UP, -0.1);
      const hand =
        this.nearest(this.grips.filter((g) => this.center(g, _a).sub(hip).dot(right) * s > -0.02), reach, 0.72) ??
        new THREE.Vector3().copy(hip).addScaledVector(right, s * 0.15).addScaledVector(fwd, kind === 'seated' ? 0.3 : 0.05).addScaledVector(UP, kind === 'seated' ? 0.07 : -0.1);
      const handEnd = new THREE.Vector3();
      const armPole = new THREE.Vector3().copy(UP).multiplyScalar(-1).addScaledVector(right, s * 0.5).addScaledVector(fwd, -0.3);
      const elbow = this.bend(shoulder, hand, UPPER_ARM, FOREARM, armPole, handEnd);
      this.segment(this.limbs[`arm${k}1`], shoulder, elbow, 0.045);
      this.segment(this.limbs[`arm${k}2`], elbow, handEnd, 0.038);
      this.joint(this.joints[`sh${k}`], shoulder, 0.058);
      this.joint(this.joints[`el${k}`], elbow, 0.042);
      this.joint(this.joints[`ha${k}`], handEnd, 0.045);

      // Perna
      const hipJ = new THREE.Vector3().copy(hip).addScaledVector(right, s * HIP_HALF);
      let ankle: THREE.Vector3;
      const kneeRest = new THREE.Vector3().copy(hipJ).addScaledVector(fwd, THIGH);
      const roller = feet === 'roller' ? this.nearest(this.rollers, new THREE.Vector3().copy(kneeRest).addScaledVector(UP, -0.35), 0.8) : null;
      if (roller) {
        // Tornozelo encostado no rolo, do lado do corpo.
        ankle = roller.clone().addScaledVector(right, s * HIP_HALF - roller.clone().sub(hip).dot(right));
        ankle.addScaledVector(_a.subVectors(kneeRest, ankle).normalize(), 0.09);
      } else if (kind === 'seated') {
        ankle = new THREE.Vector3().copy(hipJ).addScaledVector(fwd, 0.46);
        ankle.y = Math.max(0.08, hip.y - 0.52);
      } else {
        ankle = new THREE.Vector3().copy(hipJ).addScaledVector(right, s * 0.03);
        ankle.y = hip.y - (THIGH + SHIN) + 0.02;
      }
      const footEnd = new THREE.Vector3();
      const legPole = new THREE.Vector3().copy(fwd).addScaledVector(UP, kind === 'seated' ? 0.6 : 0.1);
      const knee = this.bend(hipJ, ankle, THIGH, SHIN, legPole, footEnd);
      this.segment(this.limbs[`leg${k}1`], hipJ, knee, 0.07);
      this.segment(this.limbs[`leg${k}2`], knee, footEnd, 0.05);
      this.joint(this.joints[`kn${k}`], knee, 0.062);
      const foot = this.joints[`ft${k}`];
      foot.position.copy(footEnd).addScaledVector(fwd, 0.06);
      foot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fwd);
      foot.scale.set(0.048, 0.04, 0.12);
    }
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.ball.dispose();
    this.head.dispose();
    Object.values(this.materials).forEach((m) => m.dispose());
  }
}

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

export class Figure {
  readonly group = new THREE.Group();
  private readonly anchor: THREE.Object3D;
  private readonly pose: PoseData;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly cyl = new THREE.CylinderGeometry(1, 1, 1, 14);
  private readonly ball = new THREE.SphereGeometry(1, 18, 12);
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
    this.material = new THREE.MeshStandardMaterial({ color: 0xb7b1a6, roughness: 0.9 });
    this.material.envMapIntensity = 0.2;

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

    for (const k of ['torso', 'neck', 'armL1', 'armL2', 'armR1', 'armR2', 'legL1', 'legL2', 'legR1', 'legR2'])
      this.limbs[k] = this.mesh(this.cyl);
    for (const k of ['head', 'pelvis', 'shL', 'shR', 'elL', 'elR', 'haL', 'haR', 'knL', 'knR', 'ftL', 'ftR'])
      this.joints[k] = this.mesh(this.ball);
    this.update();
  }

  private mesh(geometry: THREE.BufferGeometry): THREE.Mesh {
    const m = new THREE.Mesh(geometry, this.material);
    m.castShadow = true;
    this.group.add(m);
    return m;
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
    torso.scale.set(0.165, TORSO, 0.105);
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
    this.cyl.dispose();
    this.ball.dispose();
    this.material.dispose();
  }
}

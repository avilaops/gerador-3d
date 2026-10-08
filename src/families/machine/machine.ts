/**
 * Máquina genérica: base + resistência (torre com bateria, ou anilhas) +
 * estação do corpo + alavancas do exercício.
 *
 * A caixa do catálogo entra pela estrutura: as longarinas ocupam o comprimento
 * C, a travessa traseira ocupa a largura L e a torre (ou o quadro) chega à
 * altura A. O mecanismo é dimensionado pelo corpo de quem usa.
 */
import * as THREE from 'three';
import type { FamilyBuildResult, DimsM } from '../types';
import type { PartKit } from '../../parts/kit';
import { Rig, lerp } from '../../parts/rig';
import { stackTower } from '../../parts/assemblies';
import type { Articulation, Vec3 } from '../../spec/schema';
import { buildStation } from './stations';
import { EXERCISES, type ExerciseId } from './exercises';

export interface MachineOptions {
  exercise: ExerciseId;
  resistance: 'stack' | 'plates';
  /** Número de baterias (1 no centro, 2 nas laterais). Ignorado com anilhas. */
  stacks: 1 | 2;
  tube: number;
  seatHeight: number;
  /** Posição do assento em z (referencial do equipamento). */
  seatZ: number;
  backTilt: number;
  stackPlates: number;
  stackTravel: number;
  /** Multiplicador do giro das alavancas. */
  swingScale: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

export function buildMachine(dims: DimsM, kit: PartKit, o: MachineOptions): FamilyBuildResult {
  const root = new THREE.Group();
  root.name = 'equipment';
  const rig = new Rig(kit, root);
  const ex = EXERCISES[o.exercise];
  const { length: L, width: W, height: H } = dims;
  const t = o.tube;
  const y0 = t / 2;
  const plates = o.resistance === 'plates';
  const stacks = plates ? 0 : o.stacks;
  // Iso-lateral com bateria: torres baixas nas laterais; o quadro dos braços é que chega à altura A.
  const tallFrame = plates || stacks === 2;
  const armMaterial = tallFrame ? 'accent' : 'frame';
  const articulations: Articulation[] = [];

  // Distribuição lateral: braços independentes por dentro das torres ou dos pinos.
  const towerX = stacks === 2 ? W / 2 - 0.2 : 0;
  const ax = plates
    ? clamp(W / 2 - 0.27, 0.3, 0.52)
    : stacks === 2
      ? clamp(towerX - 0.28, 0.3, 0.48)
      : clamp(W / 2 - 0.13, 0.3, 0.44);
  const railX = clamp(ax, 0.22, W / 2 - t / 2);
  const zRear = -L / 2;
  const zFront = L / 2;

  // Base: longarinas no comprimento todo, travessa traseira na largura toda.
  const base = rig.group('base');
  for (const s of [-1, 1] as const) {
    rig.tube(base, [s * railX, y0, zRear], [s * railX, y0, zFront], t);
    rig.foot(base, s * (W / 2 - 0.06), zRear + 0.06);
    rig.foot(base, s * railX, zFront - 0.06);
  }
  rig.tube(base, [-W / 2, y0, zRear + t / 2], [W / 2, y0, zRear + t / 2], t);
  rig.tube(base, [-railX, y0, zFront - t / 2], [railX, y0, zFront - t / 2], t);
  rig.tube(base, [0, y0, zRear + t / 2], [0, y0, zFront - t / 2], t);

  // Resistência: torre(s) com bateria.
  const towerZ = zRear + 0.125;
  if (stacks > 0) {
    const sides = stacks === 2 ? ([-1, 1] as const) : ([0] as const);
    for (const s of sides) {
      const unit = stackTower(kit, {
        suffix: s === 0 ? '' : s < 0 ? '_left' : '_right',
        x: s * towerX,
        z: towerZ,
        height: stacks === 2 ? Math.max(1.1, 0.64 * H) : H,
        post: t,
        plates: o.stackPlates,
        travel: o.stackTravel,
      });
      root.add(unit.group);
      articulations.push(unit.articulation);
    }
  }

  // Estação e alavancas, no referencial do usuário (virado para a torre quando facing = −1).
  const f = ex.facing;
  const station = rig.group('station');
  station.position.z = o.seatZ;
  if (f === -1) station.rotation.y = Math.PI;
  const toUser = (zw: number) => f * (zw - o.seatZ);
  const toWorld = (p: Vec3): Vec3 => [f * p[0], p[1], o.seatZ + f * p[2]];
  const uRear = toUser(zRear);
  const uFront = toUser(zFront);
  const zLo = Math.min(uRear, uFront) + 0.05;
  const zHi = Math.max(uRear, uFront) - 0.05;
  const towerUz = toUser(towerZ);

  buildStation(rig, station, {
    kind: ex.station,
    hs: o.seatHeight,
    tilt: o.backTilt,
    t,
    maxHeight: H,
  });

  const levers = ex.levers({ hs: o.seatHeight, H, W, ax, plates, zRear: uRear, zFront: uFront });
  const postTops: { x: number; y: number; z: number }[] = [];
  const tallest = levers
    .filter((l) => !l.noSupport)
    .reduce<(typeof levers)[number] | undefined>(
      (best, l) => (!best || l.pivot[1] > best.pivot[1] ? l : best),
      undefined
    );
  let frameDone = false;

  for (const def of levers) {
    const size = def.size ?? 0.06;
    const px = def.pivot[0];
    const py = clamp(def.pivot[1], 0.12, H - 0.04);
    const pz = clamp(def.pivot[2], zLo, zHi);
    const isStatic = def.swing === 0;
    const hornLen = clamp(W / 2 - px - size / 2 - 0.02, 0.1, 0.2);
    const tip: Vec3 = def.path.length ? def.path[def.path.length - 1] : [0, 0, 0];
    const single = !def.split;
    // Dobra do braço: um cotovelo no meio, deslocado na perpendicular (no plano do movimento).
    let armPath: Vec3[] = def.path;
    if (def.bend && def.path.length === 1) {
      const [, dy, dz] = def.path[0];
      const elbow: Vec3 = [def.path[0][0] / 2, dy / 2 - dz * def.bend, dz / 2 + dy * def.bend];
      armPath = [elbow, def.path[0]];
    }
    const baseName = def.node ?? (single ? 'lever' : 'arm');

    // Braço de um lado: `s` é o lado (+1 direita, −1 esquerda); `offX` desloca o braço dentro do grupo.
    const drawArm = (g: THREE.Group, s: 1 | -1, offX: number, name: string) => {
      const P = (p: Vec3): Vec3 => [offX + s * p[0], p[1], p[2]];
      if (armPath.length > 1) {
        rig.path(g, [[0, 0, 0] as Vec3, ...armPath].map(P), size, armMaterial, `${name}_bar`, 0.16);
      } else if (armPath.length === 1) {
        rig.tube(g, P([0, 0, 0]), P(armPath[0]), size, armMaterial, `${name}_bar`);
      }
      const T = P(tip);
      const inward = -s;
      switch (def.end) {
        case 'grip-x':
          rig.grip(g, T, [T[0] + inward * 0.16, T[1], T[2]], `${name}_grip`);
          break;
        case 'grip-y':
          rig.grip(g, [T[0] + inward * 0.05, T[1] + 0.07, T[2]], [T[0] + inward * 0.05, T[1] - 0.09, T[2]], `${name}_grip`);
          break;
        case 'grip-z': {
          const d = new THREE.Vector3(0, tip[1], tip[2]).normalize().multiplyScalar(0.15);
          rig.grip(g, T, [T[0], T[1] + d.y, T[2] + d.z], `${name}_grip`);
          break;
        }
        case 'roller':
          if (!single) rig.roller(g, T, [T[0] + inward * 0.22, T[1], T[2]], 0.11, `${name}_roller`);
          break;
        case 'pad':
          if (!single)
            rig.pad(g, [0.08, 0.22, 0.18], [T[0] + inward * 0.06, T[1], T[2]], 0, `${name}_pad`);
          break;
        default:
          break;
      }
      if (plates && def.horn !== undefined && armPath.length) {
        const h = lerp([0, 0, 0], armPath[0], def.horn);
        if (def.horn < 0) rig.tube(g, P([0, 0, 0]), P(h), size, armMaterial, `${name}_tail`);
        if (def.horn > 1) rig.tube(g, P(armPath[0]), P(h), size, armMaterial, `${name}_tail`);
        const hb = P(h);
        rig.horn(g, [hb[0] + s * (size / 2), hb[1], hb[2]], [s, 0, 0], hornLen, `${name}_horn`);
      }
    };

    // Peça que liga os dois lados numa alavanca única.
    const drawBridge = (g: THREE.Group, name: string) => {
      const half = Math.max(px, 0.02);
      const T = tip;
      if (px > 0.05 && !isStatic) rig.rod(g, [-half, 0, 0], [half, 0, 0], 0.045, 'chrome', `${name}_axle`);
      switch (def.end) {
        case 'roller':
          rig.roller(g, [-(half - 0.02), T[1], T[2]], [half - 0.02, T[1], T[2]], 0.12, `${name}_roller`);
          break;
        case 'pad':
          rig.pad(g, [clamp(2 * half - 0.06, 0.24, 0.56), 0.1, 0.26], [0, T[1], T[2]], 0, `${name}_pad`);
          break;
        case 'shoulder':
          rig.tube(g, [-half, T[1], T[2]], [half, T[1], T[2]], size, armMaterial);
          for (const s of [-1, 1] as const)
            rig.pad(g, [0.15, 0.09, 0.3], [s * 0.19, T[1] - 0.07, T[2]], 0, `${name}_shoulder_pad`);
          break;
        case 'bar':
          rig.rod(g, [-0.36, T[1], T[2]], [0.36, T[1], T[2]], 0.035, 'chrome', `${name}_handle`);
          break;
        case 'plate':
          rig.tube(g, [-half, T[1], T[2]], [half, T[1], T[2]], size, armMaterial);
          rig.box(g, [0.36, 0.02, 0.28], [0, T[1] - 0.04, T[2]], 'plate', `${name}_foot_plate`);
          break;
        case 'grip-z':
        case 'grip-x':
        case 'grip-y':
          if (px > 0.05)
            rig.tube(g, [-half, T[1] * 0.5, T[2] * 0.5], [half, T[1] * 0.5, T[2] * 0.5], size, armMaterial);
          break;
        default:
          break;
      }
    };

    if (single) {
      const g = isStatic
        ? rig.group(baseName, station)
        : rig.arm(baseName, [0, py, pz], 'x', station, { diameter: 0.08, length: 0.08 });
      if (isStatic) g.position.set(0, py, pz);
      if (px > 0.05) {
        drawArm(g, 1, px, baseName);
        drawArm(g, -1, -px, baseName);
      } else {
        drawArm(g, 1, 0, baseName);
        if (plates && def.horn !== undefined && armPath.length) {
          const h = lerp([0, 0, 0], armPath[0], def.horn);
          rig.horn(g, [-size / 2, h[1], h[2]], [-1, 0, 0], hornLen, `${baseName}_horn`);
        }
      }
      drawBridge(g, baseName);
      if (!isStatic) {
        articulations.push({
          node: baseName,
          type: 'revolute',
          axis: def.axis,
          pivot: toWorld([0, py, pz]),
          range: [0, def.swing * o.swingScale],
          driver: 'phase',
        });
      }
    } else {
      for (const s of [1, -1] as const) {
        const name = `${baseName}_${s > 0 ? 'right' : 'left'}`;
        const axisName = Math.abs(def.axis[1]) > 0.5 ? 'y' : Math.abs(def.axis[2]) > 0.5 ? 'z' : 'x';
        const g = isStatic
          ? rig.group(name, station)
          : rig.arm(name, [s * px, py, pz], axisName, station, { diameter: 0.09, length: 0.09 });
        if (isStatic) g.position.set(s * px, py, pz);
        drawArm(g, s, 0, name);
        if (!isStatic) {
          articulations.push({
            node: name,
            type: 'revolute',
            // Espelhar no plano YZ mantém o giro em X e inverte em Y e Z.
            axis: [def.axis[0], s * def.axis[1], s * def.axis[2]],
            pivot: toWorld([s * px, py, pz]),
            range: [0, def.swing * o.swingScale],
            driver: 'phase',
          });
        }
      }
    }

    // Colunas de apoio do pivô.
    if (def.noSupport) continue;
    const sx = single ? px + 0.075 : Math.max(px - 0.075, 0.05);
    const toRear = Math.sign(uRear) || -1;
    const lean = py > 1.0 ? 0.3 * toRear : 0;
    const footZ = clamp(pz + lean, zLo, zHi);
    const sup = rig.group(`${baseName}_support`, station);
    const clearOfBody =
      py > o.seatHeight + 0.95 || py < o.seatHeight - 0.12 || Math.abs(pz) > 0.42;
    // Com anilhas, o apoio mais alto vira o quadro: sobe até a altura A.
    const toTop = tallFrame && !frameDone && def === tallest && H - py <= 0.65;
    if ((clearOfBody && !single) || toTop) {
      // Arco de tubo curvado: sobe de um lado, atravessa e desce do outro.
      const yTop = toTop ? H - t / 2 : py;
      const zTop = toTop
        ? clamp(footZ + ((pz - footZ) * (yTop - y0)) / Math.max(py - y0, 1e-3), zLo, zHi)
        : pz;
      rig.path(
        sup,
        [
          [-sx, y0, footZ],
          [-sx, yTop, zTop],
          [sx, yTop, zTop],
          [sx, y0, footZ],
        ],
        t,
        'frame',
        'arch',
        0.15
      );
      if (toTop) frameDone = true;
      if (stacks === 1 && py < H - 0.05) {
        const yb = Math.min(py, H - 0.2);
        rig.tube(sup, [0, yb, towerUz], [0, py, pz], 0.06);
      }
    } else {
      for (const s of [1, -1] as const) rig.tube(sup, [s * sx, y0, footZ], [s * sx, py, pz], t);
    }
    if (!single)
      for (const s of [1, -1] as const)
        rig.rod(sup, [s * sx, py, pz], [s * (px - 0.03), py, pz], 0.045, 'chrome');
    rig.tube(sup, [-Math.max(sx, railX), y0, footZ], [Math.max(sx, railX), y0, footZ], t);
    if (stacks === 2) {
      const yb = Math.min(py, H - 0.25);
      for (const s of [1, -1] as const) rig.tube(sup, [s * towerX, yb, towerUz], [s * sx, py, pz], 0.06);
    }
    postTops.push({ x: sx, y: py, z: pz });
  }

  // Anilhas: a altura A vem do quadro (colunas prolongadas ou mastro traseiro).
  if (tallFrame) {
    const top = postTops.reduce<{ x: number; y: number; z: number } | undefined>(
      (best, p) => (!best || p.y > best.y ? p : best),
      undefined
    );
    const frame = rig.group('frame', station);
    const storageLen = (x: number) => clamp(W / 2 - x - t / 2 - 0.01, 0, 0.18);
    if (frameDone) {
      // O arco do apoio já chegou à altura A.
    } else if (top && H - top.y <= 0.65) {
      for (const s of [1, -1] as const)
        rig.tube(frame, [s * top.x, top.y, top.z], [s * top.x, H, top.z], t);
      rig.tube(frame, [-top.x, H - t / 2, top.z], [top.x, H - t / 2, top.z], t, 'frame', 'top_crossbar');
    } else {
      const mz = uRear - Math.sign(uRear) * (t / 2);
      const mx = railX;
      rig.path(
        frame,
        [
          [-mx, 0, mz],
          [-mx, H - t / 2, mz],
          [mx, H - t / 2, mz],
          [mx, 0, mz],
        ],
        t,
        'frame',
        'mast',
        0.15
      );
      for (const s of [1, -1] as const) {
        rig.tube(frame, [s * mx, Math.min(0.6 * H, 0.9), mz], [s * mx, y0, mz - Math.sign(uRear) * 0.4], 0.05);
        const len = storageLen(mx);
        if (plates && len >= 0.08)
          for (const y of [0.4, 0.8].filter((v) => v < H - 0.25))
            rig.horn(frame, [s * (mx + t / 2), y, mz], [s, 0, 0], len, 'storage_horn');
      }
    }
  }

  if (o.exercise === 'assisted-chin') buildChinStation(rig, station, { H, towerUz, t });

  return { root, articulations };
}

/** Barra fixa, paralelas e degraus do graviton (fixos). */
function buildChinStation(
  rig: Rig,
  g: THREE.Group,
  o: { H: number; towerUz: number; t: number }
): void {
  const { H, towerUz, t } = o;
  const top = rig.group('chin_bar', g);
  rig.tube(top, [0, H - 0.1, towerUz], [0, H - 0.1, 0.05], t);
  rig.tube(top, [-0.3, H - 0.1, 0.05], [0.3, H - 0.1, 0.05], 0.05);
  for (const s of [-1, 1] as const) {
    rig.grip(top, [s * 0.3, H - 0.1, 0.05], [s * 0.52, H - 0.2, 0.0]);
    rig.grip(top, [s * 0.12, H - 0.1, 0.05], [s * 0.12, H - 0.1, -0.12]);
  }
  const dip = rig.group('dip_bars', g);
  for (const s of [-1, 1] as const) {
    rig.tube(dip, [s * 0.17, 1.25, towerUz], [s * 0.29, 1.25, 0.25], 0.05);
    rig.grip(dip, [s * 0.29, 1.25, 0.25], [s * 0.29, 1.25, 0.02]);
    rig.tube(dip, [s * 0.17, 0.32, towerUz], [s * 0.26, 0.32, 0.3], 0.05);
    rig.box(dip, [0.2, 0.02, 0.14], [s * 0.3, 0.35, 0.3], 'plate', 'step');
  }
}

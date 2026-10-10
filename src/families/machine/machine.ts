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
import { bentTube, cable, pulley } from '../../parts/primitives';
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
  /** Carga total por bateria (kg), para a régua numerada da torre. */
  stackKg?: number;
  /** Torre preta e braços na cor de destaque, mesmo com uma bateria só. */
  darkTower?: boolean;
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
  const armMaterial = plates || stacks === 2 || o.darkTower ? 'accent' : 'frame';
  const articulations: Articulation[] = [];

  // Distribuição lateral: braços independentes por dentro das torres ou dos pinos.
  // Iso-lateral: nas máquinas altas as duas baterias ficam juntas no centro, atrás do
  // assento; nas baixas, uma de cada lado, na altura toda.
  const centralStacks = false as boolean;
  // Torre lateral: ao lado do assento e virada para quem usa, como na maioria das
  // máquinas de bateria. Precisa de largura para o assento e a torre lado a lado.
  const sideTower = stacks === 1 && ex.tower === 'side' && W >= 1.02;
  const stationX = sideTower ? W / 2 - 0.345 : 0;
  const towerX = sideTower ? -(W / 2 - 0.23) : stacks === 2 ? (centralStacks ? 0.215 : W / 2 - 0.2) : 0;
  const ax = plates
    ? clamp(W / 2 - 0.27, 0.3, 0.52)
    : stacks === 2
      ? centralStacks
        ? clamp(W / 2 - 0.2, 0.3, 0.52)
        : clamp(towerX - 0.28, 0.3, 0.48)
      : sideTower
        ? 0.33
        : clamp(W / 2 - 0.13, 0.3, 0.44);
  const railX = sideTower ? 0.3 : clamp(ax, 0.22, W / 2 - t / 2);
  const zRear = -L / 2;
  const zFront = L / 2;

  const base = rig.group('base');
  /** Tampa plástica preta na ponta aberta de um tubo da base. */
  const tampa = (x: number, zc: number, eixo: 'x' | 'z', sentido: 1 | -1) =>
    rig.box(
      base,
      eixo === 'x' ? [0.012, t + 0.004, t + 0.004] : [t + 0.004, t + 0.004, 0.012],
      eixo === 'x' ? [x + sentido * 0.006, y0, zc] : [x, y0, zc + sentido * 0.006],
      'rubber',
      'end_cap',
    );
  const sapata = (x: number, zc: number, ao_longo: 'x' | 'z' = 'x') => {
    rig.box(base, ao_longo === 'x' ? [0.17, 0.012, 0.1] : [0.1, 0.012, 0.17], [x, 0.006, zc], 'rubber', 'foot');
    // Parafusos de fixação ao piso.
    for (const d of [-0.055, 0.055]) {
      const [bx, bz] = ao_longo === 'x' ? [x + d, zc] : [x, zc + d];
      rig.rod(base, [bx, 0.012, bz], [bx, 0.022, bz], 0.022, 'chrome', 'foot_bolt');
    }
  };
  if (plates) {
    // Anilhas: longarinas no comprimento todo, travessa traseira na largura toda.
    for (const s of [-1, 1] as const) {
      rig.tube(base, [s * railX, y0, zRear], [s * railX, y0, zFront], t);
      sapata(s * (W / 2 - 0.09), zRear + t / 2);
      sapata(s * railX, zFront - 0.08, 'z');
      tampa(s * (W / 2 - 0.012), zRear + t / 2, 'x', s);
      tampa(s * railX, zFront - 0.012, 'z', 1);
    }
    rig.tube(base, [-W / 2, y0, zRear + t / 2], [W / 2, y0, zRear + t / 2], t);
    rig.tube(base, [-railX, y0, zFront - t / 2], [railX, y0, zFront - t / 2], t);
    rig.tube(base, [0, y0, zRear + t / 2], [0, y0, zFront - t / 2], t);
  } else if (sideTower) {
    // Torre lateral: quadro retangular em volta do assento, com sapata e parafusos nos
    // quatro cantos, e duas travessas até o pé da torre.
    for (const s of [-1, 1] as const) {
      const x = stationX + s * railX;
      rig.tube(base, [x, y0, zRear], [x, y0, zFront], t, 'frame', 'base_rail');
      sapata(x, zRear + 0.09, 'z');
      sapata(x, zFront - 0.09, 'z');
      tampa(x, zRear + 0.012, 'z', -1);
      tampa(x, zFront - 0.012, 'z', 1);
    }
    rig.tube(base, [stationX - railX, y0, zRear + 0.2], [stationX + railX, y0, zRear + 0.2], t);
    rig.tube(base, [stationX - railX, y0, zFront - 0.2], [stationX + railX, y0, zFront - 0.2], t);
  } else {
    // Bateria: base compacta. Estabilizador atrás (na largura toda), espinha central
    // e um pé na frente; os apoios das alavancas trazem as próprias travessas.
    const pe = Math.min(railX, 0.3);
    rig.tube(base, [-W / 2, y0, zRear + t / 2], [W / 2, y0, zRear + t / 2], t, 'frame', 'base_rear');
    rig.tube(base, [0, y0, zRear + t / 2], [0, y0, zFront - t / 2], t, 'frame', 'base_spine');
    rig.tube(base, [-pe, y0, zFront - t / 2], [pe, y0, zFront - t / 2], t, 'frame', 'base_front');
    for (const s of [-1, 1] as const) {
      sapata(s * (W / 2 - 0.09), zRear + t / 2);
      sapata(s * (pe - 0.06), zFront - t / 2);
      tampa(s * (W / 2 - 0.012), zRear + t / 2, 'x', s);
      tampa(s * (pe - 0.012), zFront - t / 2, 'x', s);
    }
  }

  // Resistência: torre(s) com bateria.
  const towerZ = sideTower ? clamp(o.seatZ + ex.facing * 0.12, zRear + 0.22, zFront - 0.22) : zRear + 0.125;
  if (stacks > 0) {
    const sides = stacks === 2 ? ([-1, 1] as const) : ([0] as const);
    for (const s of sides) {
      const unit = stackTower(kit, {
        suffix: s === 0 ? '' : s < 0 ? '_left' : '_right',
        x: s * towerX,
        dark: stacks === 2 || !!o.darkTower,
        cap: !(stacks === 2 || o.darkTower),
        z: towerZ,
        height: centralStacks ? Math.max(1.1, 0.64 * H) : H,
        post: t,
        plates: o.stackPlates,
        travel: o.stackTravel,
        title: ex.sticker,
        totalKg: o.stackKg,
      });
      if (sideTower) {
        // A frente da torre (a fenda e os adesivos) olha para o assento.
        unit.group.rotation.y = Math.PI / 2;
        for (const dz of [-0.14, 0.14])
          rig.tube(base, [stationX - railX, y0, towerZ + dz], [towerX + 0.1, y0, towerZ + dz], t, 'frame', 'base_tower_link');
      }
      root.add(unit.group);
      articulations.push(unit.articulation);
    }
  }

  // Estação e alavancas, no referencial do usuário (virado para a torre quando facing = −1).
  const f = ex.facing;
  const station = rig.group('station');
  station.position.set(stationX, 0, o.seatZ);
  if (f === -1) station.rotation.y = Math.PI;
  const toUser = (zw: number) => f * (zw - o.seatZ);
  const toWorld = (p: Vec3): Vec3 => [stationX + f * p[0], p[1], o.seatZ + f * p[2]];
  const uRear = toUser(zRear);
  const uFront = toUser(zFront);
  const zLo = Math.min(uRear, uFront) + 0.05;
  const zHi = Math.max(uRear, uFront) - 0.05;
  const towerUz = toUser(towerZ);

  const levers = ex.levers({
    hs: o.seatHeight,
    H,
    W,
    ax,
    plates,
    zRear: uRear,
    zFront: uFront,
  });
  // Máquina baixa de anilhas: nenhum apoio de alavanca chega perto da altura A. Com encosto,
  // é ele que sobe até lá; sem encosto, duas laterais em "A" ao lado de quem usa. Nada de
  // mastro atrás, que as máquinas reais não têm.
  const highestPivot = Math.max(0, ...levers.filter((l) => !l.noSupport).map((l) => clamp(l.pivot[1], 0.12, H - 0.04)));
  const lowFrame = tallFrame && !ex.noFrame && (!!ex.openFrame || H - highestPivot > 0.65);
  const backNeeded = (H - o.seatHeight - 0.13) / Math.cos(o.backTilt);
  const backIsTop = lowFrame && (ex.station === 'seat-back' || ex.station === 'recline') && backNeeded <= 1.0;

  buildStation(rig, station, {
    kind: ex.station,
    hs: o.seatHeight,
    tilt: o.backTilt,
    t,
    maxHeight: H,
    backHeight: backIsTop ? backNeeded : undefined,
  });

  const postTops: { x: number; y: number; z: number }[] = [];
  const tallest = levers
    .filter((l) => !l.noSupport)
    .reduce<(typeof levers)[number] | undefined>((best, l) => (!best || l.pivot[1] > best.pivot[1] ? l : best), undefined);
  let frameDone = false;

  const rearSign = Math.sign(uRear) || -1;
  const drawCage = (sup: THREE.Group, sx: number, yTop: number, zTop: number) => {
    // Gaiola das máquinas de anilhas: de cada lado, uma coluna reta atrás e uma perna
    // em ampulheta na frente, travadas entre si; as duas laterais se ligam pelo alto e
    // por travessas atrás, e a coluna leva os pinos de guardar anilha.
    const abre = Math.min(0.5, 0.34 * yTop);
    const zP = clamp(zTop + rearSign * 0.22, zLo, zHi);
    const zF = clamp(zTop - rearSign * abre, zLo, zHi);
    const zW = zTop - rearSign * 0.03;
    const zT = clamp(zTop - rearSign * 0.2, zLo, zHi);
    const chapa: [number, number] = [0.05, 0.1];
    // Com bateria, a gaiola fica por dentro das colunas.
    const gx = plates ? Math.max(sx, Math.min(W / 2 - 0.2, sx + 0.1)) : Math.min(sx, W / 2 - 0.46);
    for (const s of [1, -1] as const) {
      rig.tube(sup, [s * gx, y0, zP], [s * gx, yTop, zP], chapa, 'frame', 'cage_post');
      rig.path(
        sup,
        [
          [s * gx, y0, zF],
          [s * gx, 0.5 * yTop, zW],
          [s * gx, yTop, zT],
        ],
        chapa,
        'frame',
        'cage_leg',
        0.35,
      );
      rig.tube(sup, [s * gx, yTop, zP], [s * gx, yTop, zT], chapa, 'frame', 'cage_top');
      for (const k of [0.3, 0.7]) {
        const zk = k < 0.5 ? zF + (zW - zF) * (k / 0.5) : zW + (zT - zW) * ((k - 0.5) / 0.5);
        rig.tube(sup, [s * gx, k * yTop, zP], [s * gx, k * yTop, zk], [0.05, 0.08], 'frame', 'cage_brace');
      }
      rig.tube(sup, [s * gx, y0, zP], [s * gx, y0, zF], t);
      const len = clamp(W / 2 - gx - 0.035, 0, 0.18);
      if (plates && len >= 0.08) for (const k of [0.25, 0.45, 0.65]) rig.horn(sup, [s * (gx + 0.025), k * yTop, zP], [s, 0, 0], len, 'storage_horn');
      if (gx > sx + 0.01) rig.tube(sup, [s * sx, yTop, zTop], [s * gx, yTop, zTop], [0.05, 0.08]);
    }
    rig.tube(sup, [-gx, yTop, zT], [gx, yTop, zT], [0.06, 0.1], 'frame', 'top_crossbar');
    rig.tube(sup, [-gx, yTop, zP], [gx, yTop, zP], [0.05, 0.08]);
    rig.tube(sup, [-gx, 0.3 * yTop, zP], [gx, 0.3 * yTop, zP], [0.05, 0.08], 'frame', 'cage_rear_bar');
  };

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
          // Segunda pegada, neutra, um pouco antes da ponta.
          if (def.dualGrip) {
            const B: Vec3 = [T[0], T[1] * 0.86, T[2] * 0.86];
            rig.tube(g, B, [B[0] + inward * 0.07, B[1] - 0.02, B[2]], 0.035, armMaterial);
            rig.grip(g, [B[0] + inward * 0.07, B[1] + 0.06, B[2]], [B[0] + inward * 0.07, B[1] - 0.1, B[2]], `${name}_grip_neutral`);
          }
          break;
        case 'grip-y':
          rig.grip(g, [T[0] + inward * 0.05, T[1] + 0.07, T[2]], [T[0] + inward * 0.05, T[1] - 0.09, T[2]], `${name}_grip`);
          // Braço em "L": segunda pegada, horizontal, logo abaixo da vertical.
          if (def.dualGrip) {
            rig.tube(g, T, [T[0], T[1] - 0.16, T[2]], 0.04, armMaterial);
            rig.grip(g, [T[0], T[1] - 0.16, T[2]], [T[0] + inward * 0.17, T[1] - 0.16, T[2]], `${name}_grip_wide`);
          }
          break;
        case 'grip-z': {
          const d = new THREE.Vector3(0, tip[1], tip[2]).normalize().multiplyScalar(0.15);
          rig.grip(g, T, [T[0], T[1] + d.y, T[2] + d.z], `${name}_grip`);
          break;
        }
        case 'long-handles': {
          // Duas pegadas compridas por lado: uma segue o braço, outra desce para a frente.
          const d = new THREE.Vector3(0, tip[1], tip[2]).normalize();
          rig.grip(g, T, [T[0], T[1] + d.y * 0.42, T[2] + d.z * 0.42], `${name}_grip`);
          const M: Vec3 = [T[0], T[1] * 0.62, T[2] * 0.62];
          rig.grip(g, M, [M[0] + s * 0.06, M[1] - 0.3, M[2] + 0.3], `${name}_grip_low`);
          break;
        }
        case 'roller':
          if (!single) rig.roller(g, T, [T[0] + inward * 0.22, T[1], T[2]], 0.11, `${name}_roller`);
          break;
        case 'pad':
          if (!single) rig.pad(g, def.padSize ?? [0.08, 0.22, 0.18], [T[0] + inward * 0.06, T[1], T[2]], 0, `${name}_pad`);
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
      if (px > 0.05 && !isStatic && !def.noAxle) rig.rod(g, [-half, 0, 0], [half, 0, 0], 0.045, 'chrome', `${name}_axle`);
      switch (def.end) {
        case 'roller':
          rig.roller(g, [-(half - 0.02), T[1], T[2]], [half - 0.02, T[1], T[2]], def.rollerDia ?? 0.12, `${name}_roller`);
          break;
        case 'pad':
          rig.pad(g, [clamp(2 * half - 0.06, 0.24, 0.56), 0.1, 0.26], [0, T[1], T[2]], 0, `${name}_pad`);
          break;
        case 'shoulder':
          rig.tube(g, [-half, T[1], T[2]], [half, T[1], T[2]], size, armMaterial);
          for (const s of [-1, 1] as const) rig.pad(g, [0.15, 0.09, 0.3], [s * 0.19, T[1] - 0.07, T[2]], 0, `${name}_shoulder_pad`);
          break;
        case 'bar':
          rig.rod(g, [-0.36, T[1], T[2]], [0.36, T[1], T[2]], 0.035, 'chrome', `${name}_handle`);
          break;
        case 'plate':
          rig.tube(g, [-half, T[1], T[2]], [half, T[1], T[2]], size, armMaterial);
          rig.box(g, [0.36, 0.02, 0.28], [0, T[1] - 0.04, T[2]], 'plate', `${name}_foot_plate`);
          break;
        case 'long-handles':
          // Fecha o U na frente.
          rig.tube(g, [-half, T[1], T[2]], [half, T[1], T[2]], size, armMaterial);
          break;
        case 'grip-z':
        case 'grip-x':
        case 'grip-y':
          if (px > 0.05) rig.tube(g, [-half, T[1] * 0.5, T[2] * 0.5], [half, T[1] * 0.5, T[2] * 0.5], size, armMaterial);
          break;
        default:
          break;
      }
    };

    if (single) {
      const g = isStatic
        ? rig.group(baseName, station)
        : rig.arm(baseName, [0, py, pz], 'x', station, {
            diameter: 0.08,
            length: 0.08,
          });
      if (isStatic) g.position.set(0, py, pz);
      if (def.cam && !isStatic) {
        // Came: o disco por onde passa o cabo, ao lado do pivô.
        const cam = new THREE.Mesh(kit.disc(def.cam, 0.03), kit.materials.rubber);
        cam.name = `${baseName}_cam`;
        cam.rotation.z = Math.PI / 2;
        // Do lado da torre (à direita de quem usa, que é −X no referencial da estação).
        cam.position.set(-(px + 0.055), 0, 0);
        cam.castShadow = true;
        g.add(cam);
      }
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
          : rig.arm(name, [s * px, py, pz], axisName, station, {
              diameter: 0.09,
              length: 0.09,
            });
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
    const clearOfBody = py > o.seatHeight + 0.95 || py < o.seatHeight - 0.12 || Math.abs(pz) > 0.42;
    // Com anilhas, o apoio mais alto vira o quadro: sobe até a altura A.
    const toTop = tallFrame && !lowFrame && !frameDone && def === tallest && H - py <= 0.65;
    if ((clearOfBody && !single) || toTop) {
      // Arco de tubo curvado: sobe de um lado, atravessa e desce do outro.
      const yTop = toTop ? H - t / 2 : py;
      const zTop = toTop ? clamp(footZ + ((pz - footZ) * (yTop - y0)) / Math.max(py - y0, 1e-3), zLo, zHi) : pz;
      if (tallFrame && yTop > 1.0) {
        drawCage(sup, sx, yTop, zTop);
      } else if (tallFrame) {
        // Máquina baixa: cada lado tem o próprio cavalete, sem arco passando por cima de quem usa.
        for (const s of [1, -1] as const) {
          for (const d of [1, -1] as const) rig.tube(sup, [s * sx, y0, clamp(pz + d * 0.26, zLo, zHi)], [s * sx, py, pz], [0.05, 0.09], 'frame', 'trestle_leg');
          rig.tube(sup, [s * sx, y0, clamp(pz - 0.26, zLo, zHi)], [s * sx, y0, clamp(pz + 0.26, zLo, zHi)], t);
        }
      } else {
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
          0.15,
        );
      }
      if (toTop) frameDone = true;
      if (stacks === 1 && !sideTower && py < H - 0.05) {
        const yb = Math.min(py, H - 0.2);
        rig.tube(sup, [0, yb, towerUz], [0, py, pz], 0.06);
      }
    } else {
      for (const s of [1, -1] as const) rig.tube(sup, [s * sx, y0, footZ], [s * sx, py, pz], t);
    }
    if (!single) for (const s of [1, -1] as const) rig.rod(sup, [s * sx, py, pz], [s * (px - 0.03), py, pz], 0.045, 'chrome');
    rig.tube(sup, [-Math.max(sx, railX), y0, footZ], [Math.max(sx, railX), y0, footZ], t);
    // Chapas de junção com parafusos, no pé de cada coluna.
    for (const s of [1, -1] as const) {
      rig.box(sup, [0.012, 0.14, 0.16], [s * (sx + t / 2 + 0.006), t + 0.05, footZ], 'frame', 'gusset');
      for (const dz of [-0.05, 0.05])
        rig.rod(
          sup,
          [s * (sx + t / 2 + 0.012), t + 0.07, footZ + dz],
          [s * (sx + t / 2 + 0.02), t + 0.07, footZ + dz],
          0.022,
          'chrome',
          'bolt',
        );
    }
    if (stacks === 2) {
      const yb = Math.min(py, H - 0.25);
      for (const s of [1, -1] as const) rig.tube(sup, [s * towerX, yb, towerUz], [s * sx, py, pz], 0.06);
    }
    postTops.push({ x: sx, y: py, z: pz });
  }

  // Anilhas: a altura A vem do quadro (colunas prolongadas ou mastro traseiro).
  if (tallFrame && !ex.noFrame) {
    const top = postTops.reduce<{ x: number; y: number; z: number } | undefined>(
      (best, p) => (!best || p.y > best.y ? p : best),
      undefined,
    );
    const frame = rig.group('frame', station);
    const storageLen = (x: number) => clamp(W / 2 - x - t / 2 - 0.01, 0, 0.18);
    if (frameDone) {
      // O arco do apoio já chegou à altura A.
    } else if (!lowFrame && top && H - top.y <= 0.65) {
      for (const s of [1, -1] as const) rig.tube(frame, [s * top.x, top.y, top.z], [s * top.x, H, top.z], t);
      rig.tube(frame, [-top.x, H - t / 2, top.z], [top.x, H - t / 2, top.z], t, 'frame', 'top_crossbar');
    } else if (backIsTop) {
      // A altura A é a do encosto.
    } else if (lowFrame && ex.station === 'seat-back' && H >= 1.5) {
      drawCage(frame, clamp(Math.max(top?.x ?? 0, 0.36), 0.3, W / 2 - 0.16), H - t / 2, clamp(top?.z ?? 0, zLo + 0.3, zHi - 0.3));
    } else if (lowFrame) {
      const xs = clamp(Math.max(top?.x ?? 0, 0.36), 0.3, W / 2 - 0.06);
      const zc = clamp(top?.z ?? 0, zLo + 0.3, zHi - 0.3);
      const abre = Math.min(0.34, 0.3 * H);
      const chapa: [number, number] = [0.05, 0.1];
      for (const s of [1, -1] as const) {
        for (const d of [1, -1] as const)
          rig.path(
            frame,
            [
              [s * xs, y0, zc + d * abre],
              [s * xs, 0.6 * H, zc + d * 0.1],
              [s * xs, H - 0.05, zc + d * 0.1],
            ],
            chapa,
            'frame',
            'side_leg',
            0.25,
          );
        rig.tube(frame, [s * xs, 0.6 * H, zc - 0.1], [s * xs, 0.6 * H, zc + 0.1], [0.05, 0.08]);
        rig.tube(frame, [s * xs, H - 0.05, zc - 0.15], [s * xs, H - 0.05, zc + 0.15], chapa, 'frame', 'side_cap');
        rig.tube(frame, [s * xs, y0, zc - abre], [s * xs, y0, zc + abre], t);
        const len = storageLen(xs);
        if (plates && len >= 0.08) rig.horn(frame, [s * (xs + 0.025), 0.36 * H, zc - 0.6 * abre], [s, 0, 0], len, 'storage_horn');
      }
      rig.tube(frame, [-xs, y0, zc - abre], [xs, y0, zc - abre], t, 'frame', 'side_link');
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
        0.15,
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

  if (o.exercise === 'leg-extension' && sideTower) {
    // Bloco de apoio regulável acima do joelho, do lado da torre, e a alavanca de ajuste do encosto.
    const extra = rig.group('thigh_block', station);
    const hs = o.seatHeight;
    rig.tube(extra, [-0.4, y0, 0.3], [-0.4, hs + 0.3, 0.3], [0.05, 0.08]);
    rig.pad(extra, [0.2, 0.1, 0.26], [-0.34, hs + 0.36, 0.3], 0, 'thigh_block_pad');
    rig.rod(extra, [0.2, hs - 0.07, -0.16], [0.34, hs - 0.0, -0.22], 0.022, 'rubber', 'backrest_lever');
  }
  if (o.exercise === 'assisted-chin') buildChinStation(rig, station, { H, towerUz, t });
  if (o.exercise === 'cable-pulldown') {
    articulations.push(buildCablePulldown(rig, station, { H, towerUz, t, hs: o.seatHeight }));
  }

  return { root, articulations };
}

/** Barra fixa, paralelas e degraus do graviton (fixos). */
function buildChinStation(rig: Rig, g: THREE.Group, o: { H: number; towerUz: number; t: number }): void {
  const { H, towerUz, t } = o;
  const y0 = t / 2;
  // Pórtico: duas colunas na frente da torre, que sobem e voltam em curva até o alto dela.
  const zf = towerUz - Math.sign(towerUz) * 0.4;
  const px = 0.22;
  const frame = rig.group('chin_frame', g);
  for (const s of [-1, 1] as const) {
    rig.path(
      frame,
      [
        [s * px, 0, zf],
        [s * px, H - t / 2, zf],
        [s * px, H - t / 2, towerUz],
      ],
      t,
      'frame',
      'chin_post',
      0.16,
    );
    rig.tube(frame, [s * px, y0, zf], [s * px, y0, towerUz], t);
    rig.tube(frame, [s * px, 0.5 * H, zf], [s * px, 0.5 * H, towerUz], 0.05);
  }
  rig.tube(frame, [-px, y0, zf], [px, y0, zf], t);
  rig.tube(frame, [-px, H - t / 2, zf], [px, H - t / 2, zf], t);

  // Barra fixa com várias pegadas, à frente do pórtico.
  const top = rig.group('chin_bar', g);
  const zb = zf - Math.sign(towerUz) * 0.26;
  for (const s of [-1, 1] as const) {
    rig.tube(top, [s * px, H - t / 2, zf], [s * 0.3, H - 0.08, zb], 0.05);
    rig.grip(top, [s * 0.3, H - 0.08, zb], [s * 0.54, H - 0.16, zb + Math.sign(towerUz) * 0.06]);
    rig.grip(top, [s * 0.14, H - 0.08, zb], [s * 0.14, H - 0.08, zb - Math.sign(towerUz) * 0.14]);
  }
  rig.tube(top, [-0.3, H - 0.08, zb], [0.3, H - 0.08, zb], 0.045);

  // Paralelas a meia altura e degraus de subida.
  const dip = rig.group('dip_bars', g);
  for (const s of [-1, 1] as const) {
    rig.tube(dip, [s * px, 1.28, zf], [s * 0.3, 1.28, zf - Math.sign(towerUz) * 0.34], 0.05);
    rig.grip(dip, [s * 0.3, 1.28, zf - Math.sign(towerUz) * 0.14], [s * 0.3, 1.28, zf - Math.sign(towerUz) * 0.36]);
    const zs = zf - Math.sign(towerUz) * 0.42;
    rig.tube(dip, [s * px, y0, zf], [s * 0.44, y0, zs], t);
    rig.tube(dip, [s * 0.44, y0, zs], [s * 0.44, 0.36, zs], 0.06);
    rig.box(dip, [0.24, 0.025, 0.16], [s * 0.44, 0.37, zs], 'plate', 'step');
    rig.box(dip, [0.14, 0.012, 0.12], [s * 0.44, 0.006, zs], 'rubber', 'foot');
  }
}

/**
 * Puxada alta por cabo: lança que sai do alto da torre, polia, cabo e barra.
 * A barra desce em linha reta. O cabo tem dois trechos sobrepostos (um fixo, da
 * polia até a barra em repouso; outro que desce com a barra), de modo que o
 * conjunto parece um cabo só em qualquer ponto do movimento.
 */
function buildCablePulldown(rig: Rig, g: THREE.Group, o: { H: number; towerUz: number; t: number; hs: number }): Articulation {
  const { H, towerUz, t, hs } = o;
  const boom = rig.group('boom', g);
  const yb = H - 0.06;
  const zp = 0.08;
  rig.path(
    boom,
    [
      [0, H - 0.3, towerUz],
      [0, yb, towerUz - Math.sign(towerUz) * 0.18],
      [0, yb, zp],
    ],
    [t, 0.06],
    'frame',
    'boom_tube',
    0.14,
  );
  const py = yb - 0.1;
  boom.add(pulley(rig.kit, [0, py, zp], 0.11, 'x'));
  const travel = Math.min(0.55, py - (hs + 0.75));
  const barY = py - Math.max(travel, 0.3) - 0.02;
  boom.add(cable(rig.kit, [0, py, zp], [0, barY, zp], 'cable_fixed'));

  const bar = rig.group('bar', g);
  bar.position.set(0, barY, zp);
  bar.add(cable(rig.kit, [0, 0, 0], [0, travel, 0], 'cable_moving'));
  rig.rod(bar, [0, 0, 0], [0, -0.05, 0], 0.03, 'chrome', 'bar_swivel');
  // Barra larga com as pontas dobradas para baixo.
  bar.add(
    bentTube(
      rig.kit,
      [
        [-0.6, -0.17, 0],
        [-0.42, -0.06, 0],
        [0.42, -0.06, 0],
        [0.6, -0.17, 0],
      ],
      0.03,
      { round: true, material: 'chrome', radius: 0.08, name: 'bar_tube' },
    ),
  );
  for (const s of [-1, 1] as const) rig.grip(bar, [s * 0.44, -0.07, 0], [s * 0.6, -0.17, 0], 'bar_grip');
  return {
    node: 'bar',
    type: 'prismatic',
    axis: [0, -1, 0],
    pivot: [0, barY, zp],
    range: [0, travel],
    driver: 'phase',
  };
}

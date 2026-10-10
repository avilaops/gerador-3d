/**
 * Tabela de mecanismos: para cada exercício, a estação (apoio do corpo) e as
 * alavancas que se movem. As medidas partem do corpo de quem usa (altura do
 * assento, ombro, joelho), não da caixa do catálogo: a caixa entra pela base e
 * pela torre, em `machine.ts`.
 *
 * Referencial do usuário: origem no piso sob o assento, +Z à frente, X à direita.
 * Cada alavanca é descrita para o lado direito (x ≥ 0) e espelhada.
 *
 * Sentido de giro em X: +X leva "à frente → para baixo" e "para cima → à frente";
 * −X faz o contrário.
 */
import type { Vec3 } from '../../spec/schema';
import type { StationKind } from './stations';

export type LeverEnd =
  | 'grip-x' // pegada horizontal, voltada para dentro
  | 'grip-z' // pegada no sentido do braço (frente/trás)
  | 'long-handles' // quadro em U com duas pegadas compridas por lado
  | 'grip-y' // pegada vertical
  | 'roller' // rolo estofado atravessado
  | 'pad' // almofada (cotovelo, joelho, peito)
  | 'shoulder' // par de ombreiras
  | 'bar' // barra cromada atravessada
  | 'plate' // plataforma de pé
  | 'none';

export interface LeverDef {
  /** Nome base do nó. Padrão: "arm" (vira arm_left/arm_right) ou "lever" (alavanca única). */
  node?: string;
  /** Dois braços independentes (um de cada lado) ou uma alavanca única ligada por travessa. */
  split: boolean;
  /** Pivô no referencial do usuário, lado direito. */
  pivot: Vec3;
  /** Trechos do braço a partir do pivô (coordenadas locais, lado direito). */
  path: Vec3[];
  /** Eixo de giro do lado direito. */
  axis: Vec3;
  /** Giro do repouso ao fim do movimento (rad). */
  swing: number;
  end: LeverEnd;
  /** Seção do tubo do braço. */
  size?: number;
  /** Posição do pino de anilhas ao longo do primeiro trecho (0 = pivô, 1 = ponta; <0 = prolongamento atrás). */
  horn?: number;
  /** Tamanho da almofada da ponta [largura, altura, profundidade], quando `end` é "pad" em braço independente. */
  padSize?: Vec3;
  /** Diâmetro do came (disco) junto ao pivô, nas alavancas únicas de máquinas com bateria. */
  cam?: number;
  /** Sem o eixo cromado entre os dois braços (quando o pivô fica na linha dos joelhos). */
  noAxle?: boolean;
  /** Diâmetro do rolo estofado da ponta. */
  rollerDia?: number;
  /** Segunda pegada (neutra) perto da ponta, nos braços de empurrar e puxar. */
  dualGrip?: boolean;
  /** Dobra do braço (cotovelo), como fração do comprimento; o sinal escolhe o lado. Só para braço de um trecho. */
  bend?: number;
  /** Sem coluna de apoio própria (o pivô já está sobre outra estrutura). */
  noSupport?: boolean;
}

export interface ExerciseContext {
  /** Altura do assento. */
  hs: number;
  /** Altura total disponível. */
  H: number;
  /** Largura total. */
  W: number;
  /** Afastamento lateral padrão dos braços independentes. */
  ax: number;
  /** Carga por anilhas (em vez de bateria). */
  plates: boolean;
  /** Fundo e frente da máquina em z, no referencial do usuário. */
  zRear: number;
  zFront: number;
}

export interface ExerciseDef {
  label: string;
  station: StationKind;
  /** Altura do assento/tampo. */
  seatHeight: number;
  /** Inclinação do encosto (rad). */
  backTilt?: number;
  /** +1: usuário de costas para a torre; −1: de frente para ela. */
  facing: 1 | -1;
  /** Posição do assento ao longo do comprimento, como fração de C (−0,5 = fundo, +0,5 = frente). */
  seatAt: number;
  /** Torre ao lado do assento, virada para quem usa (padrão: atrás, em linha). */
  tower?: 'side';
  /** Nome do exercício no adesivo da torre, como vem de fábrica. */
  sticker?: string;
  /** Sem quadro alto nem mastro: a altura vem da própria estação (máquinas baixas de anilhas). */
  noFrame?: boolean;
  /** Máquina aberta: nunca leva a gaiola, mesmo com o pivô perto do alto. */
  openFrame?: boolean;
  levers(c: ExerciseContext): LeverDef[];
}

const X: Vec3 = [1, 0, 0];
const NX: Vec3 = [-1, 0, 0];

/** Empurrar à frente do peito: pivô no alto se houver altura, senão embaixo. */
function press(c: ExerciseContext, handY: number, handZ = 0.16): LeverDef[] {
  const hand = c.hs + handY;
  if (c.H >= 1.5) {
    const py = Math.min(c.hs + 1.12, c.H - 0.1);
    return [
      {
        split: true,
        pivot: [c.ax, py, -0.32],
        path: [[0, hand - py, handZ + 0.32]],
        axis: NX,
        swing: 0.36,
        end: 'grip-x',
        dualGrip: true,
        bend: -0.16,
        horn: 0.62,
      },
    ];
  }
  return [
    {
      split: true,
      pivot: [c.ax, 0.2, 0.55],
      path: [[0, hand - 0.2, handZ - 0.55]],
      axis: X,
      swing: 0.3,
      end: 'grip-x',
        dualGrip: true,
      bend: 0.16,
      horn: 0.5,
    },
  ];
}

/** Puxar em direção ao peito, com apoio de peito. */
function row(c: ExerciseContext, handY: number): LeverDef[] {
  const hand = c.hs + handY;
  if (c.H >= 1.6) {
    const py = Math.min(c.hs + 1.15, c.H - 0.1);
    return [
      {
        split: true,
        pivot: [c.ax, py, 0.42],
        path: [[0, hand - py, 0.2]],
        axis: X,
        swing: 0.36,
        end: 'grip-y',
        dualGrip: true,
        bend: -0.14,
        horn: c.plates ? -0.32 : 0.6,
      },
    ];
  }
  return [
    {
      split: true,
      pivot: [c.ax, 0.2, 0.72],
      path: [[0, hand - 0.2, -0.08]],
      axis: NX,
      swing: 0.34,
      end: 'grip-y',
        dualGrip: true,
      bend: 0.14,
      horn: 0.5,
    },
  ];
}

const DEFS = {
  'chest-press': {
    label: 'Supino (empurrar à frente)',
    sticker: 'CHEST PRESS',
    tower: 'side',
    station: 'seat-back',
    seatHeight: 0.48,
    backTilt: 0.18,
    facing: 1,
    seatAt: 0.12,
    levers: (c) => press(c, 0.42),
  },
  'incline-press': {
    label: 'Supino inclinado',
    sticker: 'INCLINE PRESS',
    station: 'seat-back',
    seatHeight: 0.42,
    backTilt: 0.55,
    facing: 1,
    seatAt: 0.16,
    levers: (c) => press(c, 0.58, 0.1),
  },
  'decline-press': {
    label: 'Supino declinado',
    sticker: 'DECLINE PRESS',
    station: 'seat-back',
    seatHeight: 0.52,
    backTilt: 0.06,
    facing: 1,
    seatAt: 0.12,
    levers: (c) => press(c, 0.32, 0.2),
  },
  'lying-press': {
    label: 'Supino deitado',
    station: 'supine',
    seatHeight: 0.44,
    facing: 1,
    seatAt: 0.18,
    levers: (c) => [
      {
        split: true,
        pivot: [c.ax, 0.34, -1.0],
        path: [[0, Math.min(0.5, c.H - 0.44), 0.78]],
        axis: NX,
        swing: 0.3,
        end: 'grip-x',
        bend: -0.14,
        horn: 0.72,
      },
    ],
  },
  'shoulder-press': {
    label: 'Desenvolvimento de ombros',
    sticker: 'SHOULDER PRESS',
    tower: 'side',
    station: 'seat-back',
    seatHeight: 0.46,
    backTilt: 0.1,
    facing: 1,
    seatAt: 0.1,
    levers: (c) => {
      const py = Math.min(c.hs + 0.52, c.H - 0.22);
      return [
        {
          split: true,
          pivot: [c.ax, py, -0.55],
          path: [[0, Math.min(0.12, c.H - py - 0.06), 0.55]],
          axis: NX,
          swing: 0.42,
          end: 'grip-x',
          dualGrip: true,
          bend: 0.14,
          horn: 0.55,
        },
      ];
    },
  },
  row: {
    label: 'Remada sentada',
    sticker: 'SEATED ROW',
    station: 'seat-chest',
    seatHeight: 0.46,
    facing: -1,
    seatAt: 0.22,
    levers: (c) => row(c, 0.4),
  },
  'low-row': {
    label: 'Remada baixa',
    sticker: 'LOW ROW',
    station: 'seat-chest',
    seatHeight: 0.46,
    facing: -1,
    seatAt: 0.22,
    levers: (c) => row(c, 0.22),
  },
  'cable-pulldown': {
    label: 'Puxada alta por cabo',
    sticker: 'LAT PULLDOWN',
    station: 'seat-thigh',
    seatHeight: 0.46,
    facing: -1,
    seatAt: 0.16,
    levers: () => [],
  },
  pulldown: {
    label: 'Puxada alta',
    sticker: 'LAT PULLDOWN',
    tower: 'side',
    station: 'seat-thigh',
    seatHeight: 0.46,
    facing: -1,
    seatAt: 0.2,
    levers: (c) => {
      const py = c.H - 0.1;
      const hand = Math.min(c.hs + 1.2, c.H - 0.2);
      return [
        {
          split: true,
          pivot: [c.ax, py, 0.62],
          path: [[0, hand - py, c.plates ? -0.82 : -0.6]],
          axis: NX,
          swing: 0.5,
          end: 'grip-x',
          bend: c.plates ? 0.2 : 0.14,
          horn: c.plates ? -0.62 : -0.45,
        },
      ];
    },
  },
  pullover: {
    label: 'Pullover',
    station: 'seat-back',
    seatHeight: 0.46,
    backTilt: 0.3,
    facing: 1,
    seatAt: 0.1,
    levers: (c) => [
      {
        split: false,
        pivot: [0.34, c.hs + 0.56, -0.32],
        path: [[0, Math.min(0.42, c.H - c.hs - 0.62), -0.12]],
        axis: X,
        swing: 1.3,
        end: 'pad',
        horn: -0.7,
      },
    ],
  },
  'lateral-raise': {
    label: 'Elevação lateral',
    sticker: 'LATERAL RAISE',
    tower: 'side',
    station: 'seat-chest',
    seatHeight: 0.46,
    facing: -1,
    seatAt: 0.2,
    levers: (c) => [
      {
        split: true,
        pivot: [0.2, c.hs + 0.56, 0.02],
        path: [[0.1, -0.3, 0]],
        axis: [0, 0, 1],
        swing: 1.15,
        end: 'pad',
        horn: 1.25,
      },
    ],
  },
  'biceps-curl': {
    openFrame: true,
    label: 'Rosca (apoio Scott)',
    sticker: 'BICEPS CURL',
    tower: 'side',
    station: 'preacher',
    seatHeight: 0.46,
    facing: -1,
    seatAt: 0.2,
    levers: (c) => [
      {
        split: c.ax < 0.42,
        pivot: [Math.min(c.ax, 0.34), c.hs + 0.3, 0.42],
        path: [[0, -0.14, 0.3]],
        axis: NX,
        cam: 0.26,
        swing: 1.45,
        end: 'grip-x',
        horn: -0.9,
      },
    ],
  },
  'triceps-extension': {
    label: 'Extensão de tríceps',
    sticker: 'TRICEPS EXTENSION',
    tower: 'side',
    station: 'preacher',
    seatHeight: 0.46,
    facing: -1,
    seatAt: 0.2,
    levers: (c) => [
      {
        split: c.ax < 0.42,
        pivot: [Math.min(c.ax, 0.34), c.hs + 0.3, 0.42],
        path: [[0, 0.3, -0.12]],
        axis: X,
        cam: 0.26,
        swing: 1.3,
        end: 'grip-x',
        horn: -0.9,
      },
    ],
  },
  'seated-dip': {
    openFrame: true,
    label: 'Tríceps sentado (mergulho)',
    station: 'seat-back',
    seatHeight: 0.46,
    backTilt: 0.12,
    facing: 1,
    seatAt: 0.18,
    levers: (c) => [
      {
        split: false,
        // Em máquina curta a alavanca encolhe para caber no comprimento.
        pivot: [0.36, Math.min(c.hs + 0.3, c.H - 0.1), Math.max(-0.62, c.zRear + 0.14)],
        path: [[0, 0, Math.min(0.72, c.zFront - Math.max(-0.62, c.zRear + 0.14) - 0.2)]],
        axis: X,
        swing: 0.4,
        end: 'grip-z',
        horn: -0.45,
      },
    ],
  },
  'ground-lever': {
    label: 'Alavanca de piso (agachamento, levantamento, búlgaro)',
    station: 'standing',
    seatHeight: 0.1,
    facing: 1,
    seatAt: 0.1,
    levers: (c) => [
      {
        // Quadro em U que gira atrás, com as pegadas longas saindo para a frente.
        split: false,
        pivot: [Math.min(c.ax, 0.46), Math.min(0.42, c.H - 0.3), c.zRear + 0.2],
        path: [[0, Math.min(0.26, c.H - 0.6), c.zFront - c.zRear - 0.75]],
        axis: NX,
        swing: 0.3,
        end: 'long-handles',
        horn: 0.5,
        size: 0.07,
      },
    ],
  },
  'horizontal-calf': {
    label: 'Panturrilha horizontal',
    station: 'seat-back',
    seatHeight: 0.5,
    backTilt: 0.22,
    facing: 1,
    seatAt: -0.12,
    levers: (c) => [
      {
        split: false,
        pivot: [0.3, 0.22, 1.0],
        path: [[0, c.hs - 0.06, -0.22]],
        axis: X,
        swing: 0.22,
        end: 'plate',
        horn: 0.45,
      },
    ],
  },
  shrug: {
    label: 'Encolhimento de ombros',
    station: 'standing',
    seatHeight: 0.1,
    facing: 1,
    seatAt: 0.12,
    levers: (c) => [
      {
        split: false,
        pivot: [0.36, 0.5, -0.5],
        path: [[0, 0.24, 0.55]],
        axis: NX,
        swing: 0.2,
        end: 'grip-z',
        horn: 0.7,
      },
      {
        split: true,
        node: 'rest',
        pivot: [0.36, Math.min(1.1, c.H - 0.08), -0.5],
        path: [],
        axis: X,
        swing: 0,
        end: 'none',
      },
    ],
  },
  jammer: {
    label: 'Jammer (empurrar em pé)',
    station: 'standing',
    seatHeight: 0.1,
    facing: 1,
    seatAt: 0.15,
    levers: (c) => [
      {
        split: true,
        pivot: [c.ax, 0.32, -0.5],
        path: [[0, Math.min(1.15, c.H - 0.9), 0.42]],
        axis: X,
        swing: 0.45,
        end: 'grip-x',
        bend: -0.1,
        horn: 0.5,
      },
    ],
  },
  'leg-extension': {
    label: 'Cadeira extensora',
    sticker: 'LEG EXTENSION',
    tower: 'side',
    station: 'recline',
    seatHeight: 0.58,
    backTilt: 0.32,
    facing: 1,
    seatAt: 0.02,
    levers: (c) => [
      {
        // Com anilhas, uma alavanca por perna.
        split: c.plates || c.ax >= 0.42,
        pivot: [0.3, c.hs + 0.02, 0.26],
        path: [[0, -0.42, 0.04]],
        axis: NX,
        noAxle: true,
        rollerDia: 0.16,
        cam: 0.36,
        swing: 1.15,
        end: 'roller',
        horn: 1.0,
      },
    ],
  },
  'leg-curl': {
    label: 'Cadeira flexora',
    sticker: 'SEATED LEG CURL',
    tower: 'side',
    station: 'recline',
    seatHeight: 0.58,
    backTilt: 0.32,
    facing: 1,
    seatAt: -0.02,
    levers: (c) => [
      {
        split: c.ax >= 0.42,
        pivot: [0.3, c.hs + 0.02, 0.26],
        path: [[0, -0.06, 0.44]],
        axis: X,
        noAxle: true,
        rollerDia: 0.16,
        cam: 0.26,
        swing: 1.2,
        end: 'roller',
        horn: 0.8,
      },
      {
        split: false,
        node: 'thigh_pad',
        pivot: [0.3, c.hs + 0.24, 0.3],
        path: [],
        axis: X,
        swing: 0,
        end: 'roller',
        noSupport: true,
      },
    ],
  },
  'kneeling-leg-curl': {
    label: 'Flexora ajoelhada',
    station: 'kneel-lean',
    noFrame: true,
    seatHeight: 0.38,
    facing: 1,
    seatAt: -0.05,
    levers: (c) => [
      {
        split: false,
        pivot: [0.3, c.hs + 0.06, -0.06],
        path: [[0, 0.02, -0.4]],
        axis: X,
        swing: 1.25,
        end: 'roller',
        horn: 0.75,
      },
    ],
  },
  'prone-leg-curl': {
    label: 'Mesa flexora',
    sticker: 'PRONE LEG CURL',
    tower: 'side',
    station: 'prone',
    seatHeight: 0.78,
    facing: 1,
    seatAt: 0.1,
    levers: () => [
      {
        split: false,
        pivot: [0.28, 0.74, -0.4],
        path: [[0, 0.14, -0.42]],
        axis: X,
        cam: 0.26,
        swing: 1.35,
        end: 'roller',
        horn: -0.75,
      },
    ],
  },
  'standing-leg-curl': {
    label: 'Flexora em pé',
    station: 'standing',
    seatHeight: 0.1,
    facing: -1,
    seatAt: 0.15,
    levers: (c) => [
      {
        split: false,
        pivot: [0.26, 0.56, 0.02],
        path: [[0, -0.4, -0.04]],
        axis: X,
        swing: 1.3,
        end: 'roller',
        horn: 0.9,
      },
      {
        split: false,
        node: 'thigh_pad',
        pivot: [0.22, Math.min(0.92, c.H - 0.2), 0.2],
        path: [],
        axis: X,
        swing: 0,
        end: 'pad',
      },
    ],
  },
  'hip-abduction': {
    label: 'Abdutor',
    sticker: 'HIP ABDUCTION',
    tower: 'side',
    station: 'recline',
    seatHeight: 0.52,
    backTilt: 0.35,
    facing: 1,
    seatAt: -0.05,
    levers: (c) => [
      {
        split: true,
        pivot: [0.12, c.hs + 0.02, 0.12],
        path: [[0.08, 0.06, 0.44]],
        axis: [0, 1, 0],
        swing: 0.62,
        end: 'pad',
        padSize: [0.09, 0.3, 0.3],
        horn: -0.5,
      },
    ],
  },
  'hip-adduction': {
    label: 'Adutor',
    sticker: 'HIP ADDUCTION',
    tower: 'side',
    station: 'recline',
    seatHeight: 0.52,
    backTilt: 0.35,
    facing: 1,
    seatAt: -0.05,
    levers: (c) => [
      {
        split: true,
        pivot: [0.12, c.hs + 0.02, 0.12],
        path: [[0.33, 0.06, 0.3]],
        axis: [0, -1, 0],
        swing: 0.62,
        end: 'pad',
        padSize: [0.09, 0.3, 0.3],
        horn: -0.5,
      },
    ],
  },
  'glute-kickback': {
    label: 'Glúteo (ajoelhado)',
    sticker: 'GLUTE ISOLATOR',
    station: 'kneel',
    seatHeight: 0.3,
    facing: -1,
    seatAt: 0.2,
    levers: (c) => [
      {
        split: false,
        pivot: [0.3, Math.min(0.98, c.H - 0.5), 0.32],
        path: [[0, -0.42, -0.5]],
        axis: X,
        cam: 0.44,
        noAxle: true,
        rollerDia: 0.15,
        swing: 0.8,
        end: 'roller',
        horn: 0.6,
      },
      {
        split: false,
        node: 'handle',
        pivot: [0.24, Math.min(1.5, c.H - 0.12), 0.3],
        path: [[0, 0, -0.3]],
        axis: X,
        swing: 0,
        end: 'grip-x',
        noSupport: true,
      },
    ],
  },
  'reverse-hyper': {
    label: 'Hiperextensão reversa',
    station: 'table',
    seatHeight: 1.05,
    facing: 1,
    seatAt: 0.05,
    levers: (c) => [
      {
        split: false,
        pivot: [0.2, c.hs - 0.02, -0.2],
        path: [[0, -(c.hs - 0.3), 0]],
        axis: X,
        swing: 0.8,
        end: 'roller',
        horn: 0.92,
        noSupport: true,
      },
    ],
  },
  'back-extension': {
    label: 'Extensão lombar',
    sticker: 'BACK EXTENSION',
    tower: 'side',
    station: 'seat-only',
    seatHeight: 0.5,
    facing: 1,
    seatAt: 0.0,
    levers: (c) => [
      {
        split: false,
        pivot: [0.3, c.hs + 0.12, -0.12],
        path: [[0, Math.min(0.5, c.H - c.hs - 0.2), 0.14]],
        axis: NX,
        noAxle: true,
        cam: 0.26,
        swing: 0.75,
        end: 'roller',
        horn: -0.6,
      },
    ],
  },
  'ab-crunch': {
    label: 'Abdominal',
    sticker: 'ABDOMINAL',
    tower: 'side',
    station: 'seat-back',
    seatHeight: 0.48,
    backTilt: 0.2,
    facing: 1,
    seatAt: 0.0,
    levers: (c) => [
      {
        split: false,
        pivot: [0.3, c.hs + 0.3, -0.2],
        path: [[0, Math.min(0.42, c.H - c.hs - 0.42), 0.22]],
        axis: X,
        noAxle: true,
        cam: 0.26,
        swing: 0.6,
        end: 'pad',
        horn: -0.6,
      },
    ],
  },
  'standing-calf': {
    label: 'Panturrilha em pé',
    sticker: 'CALF RAISE',
    station: 'standing',
    seatHeight: 0.1,
    facing: 1,
    seatAt: 0.15,
    levers: (c) => {
      const py = Math.min(1.4, c.H - 0.14);
      return [
        {
          split: false,
          pivot: [0.26, py, -0.6],
          path: [[0, Math.min(0.08, c.H - py - 0.08), 0.62]],
          axis: NX,
          swing: 0.14,
          end: 'shoulder',
          horn: 0.4,
        },
      ];
    },
  },
  'seated-calf': {
    label: 'Panturrilha sentada',
    station: 'seat-only',
    seatHeight: 0.46,
    facing: 1,
    seatAt: -0.2,
    levers: (c) => [
      {
        split: false,
        pivot: [0.22, 0.4, 0.92],
        path: [[0, c.hs - 0.16, -0.6]],
        axis: X,
        swing: 0.2,
        end: 'roller',
        horn: -0.25,
      },
    ],
  },
  'hip-thrust': {
    label: 'Elevação pélvica',
    station: 'supine',
    seatHeight: 0.42,
    facing: 1,
    seatAt: -0.05,
    levers: (c) => [
      {
        split: false,
        pivot: [0.4, 0.26, -0.95],
        path: [[0, Math.min(0.42, c.H - 0.36), 1.25]],
        axis: NX,
        swing: 0.26,
        end: 'roller',
        horn: 0.78,
      },
    ],
  },
  'assisted-chin': {
    label: 'Barra fixa e paralela com auxílio',
    sticker: 'CHIN DIP ASSIST',
    station: 'none',
    seatHeight: 0.5,
    facing: -1,
    seatAt: 0.18,
    levers: () => [
      {
        split: false,
        node: 'knee_pad',
        pivot: [0.17, 0.62, 0.5],
        path: [[0, 0.02, -0.62]],
        axis: X,
        swing: 0.55,
        end: 'pad',
        noSupport: true,
      },
    ],
  },
  nordic: {
    label: 'Flexão nórdica',
    station: 'kneel',
    seatHeight: 0.3,
    facing: 1,
    seatAt: -0.18,
    levers: (c) => [
      {
        split: false,
        pivot: [0.36, 0.34, 0.3],
        path: [[0, Math.min(0.75, c.H - 0.5), 0.2]],
        axis: X,
        swing: 0.9,
        end: 'pad',
        horn: -0.5,
      },
    ],
  },
  't-bar': {
    label: 'Remada T (cavalinho)',
    station: 'standing',
    seatHeight: 0.1,
    facing: 1,
    seatAt: 0.05,
    levers: (c) => [
      {
        split: false,
        pivot: [0, 0.16, c.zRear + 0.12],
        path: [[0, 0.2, c.zFront - c.zRear - 0.42]],
        axis: NX,
        swing: 0.25,
        end: 'bar',
        horn: 0.82,
        size: 0.07,
      },
    ],
  },
} satisfies Record<string, ExerciseDef>;

export type ExerciseId = keyof typeof DEFS;
export const EXERCISES: Record<ExerciseId, ExerciseDef> = DEFS;
export const EXERCISE_IDS = Object.keys(DEFS) as [ExerciseId, ...ExerciseId[]];

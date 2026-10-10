/**
 * Catálogo Ludus Premium: de cada produto do catálogo para um EquipmentSpec.
 *
 * Toda a lógica específica do cliente mora aqui (o núcleo em src/ não conhece
 * a Ludus). A tabela por código decide família e mecanismo; produtos novos,
 * fora da tabela, caem nas regras por nome. Specs gerados assim saem com
 * `review.status = "needs_review"`; os escritos à mão ficam em src/specs/.
 */
import type { EquipmentSpecInput, FamilyId } from '../../src/spec/schema';
import { HANDWRITTEN_SPECS } from '../../src/specs';

export interface LudusProduct {
  code: string;
  nome: string;
  linha: string;
  grupo_muscular: string;
  /** [C, L, A] em mm. */
  dim: [number, number, number];
  peso: string | null;
  bateria: string | null;
  descricao: string;
  pagina: number;
  foto: string;
}

type Params = Record<string, string | number | boolean>;
type Rule = [family: FamilyId, params: Params];

const st = (mechanism: string, extra: Params = {}): Rule => ['selectorized-tower', { mechanism, ...extra }];
const pl = (mechanism: string, extra: Params = {}): Rule => ['plate-loaded-lever', { mechanism, ...extra }];
const bench = (variant: string, extra: Params = {}): Rule => ['bench', { variant, ...extra }];
const rack = (variant: string, extra: Params = {}): Rule => ['rack', { variant, ...extra }];
const cable = (variant: string): Rule => ['cable-station', { variant }];
const legs = (variant: string, extra: Params = {}): Rule => ['leg-press', { variant, ...extra }];
const deg = (d: number) => Math.round(((d * Math.PI) / 180) * 1000) / 1000;

const BY_CODE: Record<string, Rule> = {
  'LD-A001': pl('reverse-hyper'),
  'LD-A003': pl('decline-press'),
  'LD-A004': pl('row'),
  'LD-A005': pl('pulldown'),
  'LD-A006': pl('pulldown'),
  'LD-A007': pl('lying-press'),
  'LD-A008': pl('t-bar'),
  'LD-A009': pl('low-row'),
  'LD-A010': pl('nordic'),
  'LD-A011': pl('row'),
  'LD-A012': pl('shoulder-press'),
  'LD-A013': pl('incline-press'),
  'LD-A014': pl('chest-press'),
  'LD-A015': pl('pulldown'),
  'LD-A016': pl('lateral-raise'),
  'LD-A017': pl('pullover'),
  'LD-A018': pl('seated-dip'),
  'LD-A019': pl('lying-press'),
  'LD-A020': pl('ground-lever'),
  'LD-A021': pl('prone-leg-curl'),
  'LD-A022': pl('leg-extension'),
  'LD-A023': legs('hack'),
  'LD-A024': pl('leg-extension'),
  'LD-A025': pl('seated-calf'),
  'LD-A026': pl('horizontal-calf'),
  'LD-A027': pl('hip-thrust'),
  'LD-A028': pl('jammer'),
  'LD-A029': pl('ground-lever'),
  'LD-A030': legs('lever-squat'),
  'LD-A031': pl('kneeling-leg-curl'),
  'LD-A032': pl('chest-press'),
  'LD-A033': pl('biceps-curl'),
  'LD-A034': legs('sled'),
  'LD-A035': pl('ab-crunch'),
  'LD-A036': legs('belt-squat'),
  'LD-A037': legs('belt-squat'),
  'LD-A038': legs('sled', { splitPlate: true }),
  'LD-A039': pl('seated-dip'),
  'LD-A040': pl('incline-press'),
  'LD-A041': legs('lever-squat'),
  'LD-A042': bench('flat', { wheels: false, aLegs: true }),
  'LD-A043': bench('decline'),
  'LD-A044': bench('incline', { backAngle: deg(30) }),
  'LD-A045': bench('incline', { backAngle: deg(55) }),
  'LD-A046': bench('incline', { backAngle: deg(75) }),
  'LD-A047': bench('decline'),
  'LD-A048': bench('flat', { adjustable: true }),
  'LD-A049': bench('decline'),
  'LD-A050': bench('olympic-flat'),
  'LD-A051': bench('olympic-incline', { backAngle: deg(35) }),
  'LD-A052': bench('olympic-decline'),
  'LD-A053': rack('bar-holder'),
  'LD-A054': bench('hyper'),
  'LD-A055': bench('preacher'),
  'LD-A056': rack('plate-tree', { showPlates: false }),
  'LD-B001': st('prone-leg-curl'),
  'LD-B002': st('leg-extension'),
  'LD-B003': legs('horizontal'),
  'LD-B005': st('lateral-raise'),
  'LD-B006': st('shoulder-press'),
  'LD-B007': st('pec-fly'),
  'LD-B008': st('chest-press'),
  'LD-B009': st('assisted-chin'),
  'LD-B010': st('standing-calf'),
  'LD-B011': st('glute-kickback'),
  'LD-B012': st('cable-pulldown'),
  'LD-B013': st('ab-crunch'),
  'LD-B014': st('hip-abduction'),
  'LD-B015': st('hip-adduction'),
  'LD-B016': st('leg-curl'),
  'LD-B017': st('triceps-extension'),
  'LD-B018': st('biceps-curl'),
  'LD-B019': st('back-extension'),
  'LD-B020': st('row'),
  'LD-B021': st('pulldown'),
  'LD-B022': st('biceps-curl'),
  'LD-B023': st('chest-press'),
  'LD-B024': st('row'),
  'LD-B025': st('incline-press'),
  'LD-B026': st('shoulder-press'),
  'LD-B027': st('decline-press'),
  'LD-B028': st('triceps-extension'),
  'LD-B029': st('pulldown'),
  'LD-B030': st('pulldown'),
  'LD-B031': st('ab-crunch', { darkTower: true }),
  'LD-B032': st('leg-curl'),
  'LD-B033': st('leg-extension'),
  'LD-B034': legs('lever-squat'),
  'LD-B035': cable('dual-arm'),
  'LD-B036': cable('cross-smith'),
  'LD-B037': cable('dual-pulley'),
  'LD-B038': cable('crossover'),
};

/** Cores das fotos do catálogo: peso livre em prata e azul; bateria e bancos em preto. */
const COLORS: Record<string, { frame: string; upholstery: string; accent: string }> = {
  'Peso livre': { frame: '#666a6f', upholstery: '#0c0c0c', accent: '#1f3a9e' },
  'Bateria de pesos': {
    frame: '#161616',
    upholstery: '#0c0c0c',
    accent: '#96764a',
  },
  'Bancos e suportes': {
    frame: '#161616',
    upholstery: '#0c0c0c',
    accent: '#96764a',
  },
};

/** Cores que fogem da linha: o V-squat de bateria é prata e azul; a estação dupla tem braços cinza. */
const COLORS_BY_CODE: Record<string, { frame: string; upholstery: string; accent: string }> = {
  'LD-B034': COLORS['Peso livre'],
  'LD-B035': { frame: '#161616', upholstery: '#0c0c0c', accent: '#59616b' },
};

/**
 * Lado da foto do catálogo. A câmera padrão das miniaturas mostra a frente para a
 * direita; as fotos das linhas abaixo mostram a frente para a esquerda.
 */
const FOTO_ESPELHADA = new Set<FamilyId>(['plate-loaded-lever', 'leg-press']);
const AZIMUTE_POR_CODIGO: Record<string, number> = {
  'LD-A026': -38,
  'LD-A041': -38,
  'LD-A046': 38,
};

/** Máquinas de bateria com a torre ao lado do assento: a foto do catálogo é tirada pelo outro lado. */
const TORRE_LATERAL = new Set([
  'shoulder-press',
  'lateral-raise',
  'biceps-curl',
  'triceps-extension',
  'leg-extension',
  'leg-curl',
  'prone-leg-curl',
  'hip-abduction',
  'hip-adduction',
  'back-extension',
  'ab-crunch',
  'chest-press',
]);

/** Regras por nome, para itens que ainda não estão na tabela. A primeira que casar vale. */
const BY_NAME: [RegExp, (stack: boolean) => Rule][] = [
  [/crossover|multifuncional|cross-smith/i, () => cable('crossover')],
  [/suporte para anilhas/i, () => rack('plate-tree')],
  [/suporte/i, () => rack('bar-holder')],
  [/banco/i, () => bench('flat')],
  [/leg press|hack|belt squat|v-squat|pendulum/i, () => legs('sled')],
  [/extensora/i, (s) => (s ? st('leg-extension') : pl('leg-extension'))],
  [/flexora/i, (s) => (s ? st('leg-curl') : pl('leg-curl'))],
  [/puxada|remada alta/i, (s) => (s ? st('pulldown') : pl('pulldown'))],
  [/remada/i, (s) => (s ? st('row') : pl('row'))],
  [/ombro|desenvolvimento/i, (s) => (s ? st('shoulder-press') : pl('shoulder-press'))],
  [/supino|peitoral/i, (s) => (s ? st('chest-press') : pl('chest-press'))],
];

export function parseStack(bateria: string | null): { perStack: number; stacks: number } | undefined {
  if (!bateria) return undefined;
  const m = bateria.match(/(?:(\d+)\s*[×x]\s*)?(\d+(?:[.,]\d+)?)\s*kg/i);
  if (!m) return undefined;
  return {
    perStack: Number(m[2].replace(',', '.')),
    stacks: m[1] ? Number(m[1]) : 1,
  };
}

/** Devolve o spec do produto, ou `null` se nenhuma família foi reconhecida. */
export function toSpec(product: LudusProduct): EquipmentSpecInput | null {
  const meta = {
    linha: product.linha,
    grupoMuscular: product.grupo_muscular,
    foto: product.foto,
    pagina: product.pagina,
    peso: product.peso,
    bateria: product.bateria,
    descricao: product.descricao,
  };
  const handwritten = HANDWRITTEN_SPECS.find((s) => s.id === product.code);
  if (handwritten) return { ...handwritten, meta: { ...handwritten.meta, ...meta } };

  const weightStackKg = parseStack(product.bateria);
  const rule = BY_CODE[product.code] ?? BY_NAME.find(([re]) => re.test(product.nome))?.[1](!!weightStackKg);
  if (!rule) return null;
  const [family, params] = rule;
  const [length, width, height] = product.dim;
  return {
    id: product.code,
    name: product.nome,
    family,
    dimensionsMm: { length, width, height },
    ...(weightStackKg ? { weightStackKg } : {}),
    params,
    ...(COLORS[product.linha]
      ? {
          // Iso-laterais e as demais de quadro prata com coluna preta usam as cores do peso livre.
          materials:
            COLORS_BY_CODE[product.code] ??
            (family === 'selectorized-tower' && (weightStackKg?.stacks === 2 || params.darkTower === true)
              ? COLORS['Peso livre']
              : COLORS[product.linha]),
        }
      : {}),
    trainingClearanceM: 0.6,
    review: {
      status: 'needs_review',
      notes: BY_CODE[product.code]
        ? 'Gerado pela tabela do catálogo (família e mecanismo por código). Conferir com a foto.'
        : 'Gerado pelas regras por nome. Conferir família e mecanismo com a foto.',
    },
    meta: (() => {
      const comprido = length > 1.7 * width;
      const azimute =
        AZIMUTE_POR_CODIGO[product.code] ??
        (family === 'selectorized-tower' && weightStackKg?.stacks !== 2 && TORRE_LATERAL.has(String(params.mechanism))
          ? 42
          : FOTO_ESPELHADA.has(family) || (family === 'selectorized-tower' && weightStackKg?.stacks === 2)
            ? comprido
              ? 62
              : 38
            : undefined);
      return azimute === undefined ? meta : { ...meta, thumbAzimuth: azimute };
    })(),
  };
}

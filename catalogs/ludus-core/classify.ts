import type { EquipmentSpecInput, FamilyId } from '../../src/spec/schema';

export interface CoreProduct {
  code: string;
  nome: string;
  linha: string;
  grupo_muscular: string;
  dim: [number, number, number];
  peso: string | null;
  bateria: string | null;
  descricao: string;
}

type Params = Record<string, string | number | boolean>;
type Rule = { family: FamilyId; params: Params };

const deg = (d: number) => Math.round(((d * Math.PI) / 180) * 1000) / 1000;
const st = (mechanism: string, extra: Params = {}): Rule => ({ family: 'selectorized-tower', params: { mechanism, ...extra } });
const pl = (mechanism: string, extra: Params = {}): Rule => ({ family: 'plate-loaded-lever', params: { mechanism, ...extra } });
const bench = (variant: string, extra: Params = {}): Rule => ({ family: 'bench', params: { variant, ...extra } });
const rack = (variant: string, extra: Params = {}): Rule => ({ family: 'rack', params: { variant, ...extra } });
const cable = (variant: string): Rule => ({ family: 'cable-station', params: { variant } });
const legs = (variant: string, extra: Params = {}): Rule => ({ family: 'leg-press', params: { variant, ...extra } });

/**
 * Família e mecanismo de cada produto, conferidos contra a foto do catálogo.
 * Só o que não está aqui cai nas regras por nome (`rule`), que erram os
 * supinos articulados, os Smith, os bancos especiais e as máquinas de anilha.
 */
const BY_CODE: Record<string, Rule> = {
  'LD-WH001': legs('lever-squat'),
  'LD-WH002': legs('lever-squat'),
  'LD-WH003': legs('belt-squat'),
  'LD-WH004': bench('hyper'),
  'LD-WH005': bench('preacher'),
  'LD-WH006': pl('nordic'),
  'LD-WH007': bench('olympic-decline'),
  'LD-WH008': bench('olympic-incline', { backAngle: deg(35) }),
  'LD-WH009': bench('olympic-flat'),
  'LD-WH010': bench('olympic-incline', { backAngle: deg(45) }),
  'LD-WH011': bench('incline', { backAngle: deg(60), adjustable: true }),
  'LD-WH012': bench('incline', { backAngle: deg(45), adjustable: true }),
  'LD-WH013': rack('smith'),
  'LD-WH014': rack('smith'),
  'LD-WH015': st('biceps-curl'),
  'LD-WH016': st('biceps-curl'),
  'LD-WH017': st('hip-abduction'),
  'LD-WH018': st('hip-adduction'),
  'LD-WH019': st('hip-abduction'),
  'LD-WH020': pl('leg-extension'),
  'LD-WH021': st('leg-extension'),
  'LD-WH022': st('leg-extension'),
  'LD-WH023': st('leg-curl'),
  'LD-WH024': cable('crossover'),
  'LD-WH025': cable('crossover'),
  'LD-WH026': cable('cross-smith'),
  'LD-WH027': pl('shoulder-press'),
  'LD-WH028': pl('shoulder-press'),
  'LD-WH029': pl('hip-thrust'),
  'LD-WH030': pl('hip-thrust'),
  'LD-WH031': st('standing-leg-curl'),
  'LD-WH032': pl('standing-leg-curl'),
  'LD-WH033': st('assisted-chin'),
  'LD-WH034': legs('hack'),
  'LD-WH035': legs('hack'),
  'LD-WH036': legs('hack'),
  'LD-WH037': legs('sled'),
  'LD-WH038': legs('sled'),
  'LD-WH039': legs('sled'),
  'LD-WH040': legs('horizontal'),
  'LD-WH041': st('glute-kickback'),
  'LD-WH042': st('prone-leg-curl'),
  'LD-WH043': st('prone-leg-curl'),
  'LD-WH044': st('prone-leg-curl'),
  'LD-WH045': st('standing-calf'),
  'LD-WH046': pl('seated-calf'),
  'LD-WH047': pl('ab-crunch'),
  'LD-WH048': st('pec-fly'),
  'LD-WH049': pl('incline-fly'),
  'LD-WH050': st('pec-fly'),
  'LD-WH051': bench('decline'),
  'LD-WH052': cable('dual-pulley'),
  'LD-WH053': pl('pulldown'),
  'LD-WH054': st('pulldown'),
  'LD-WH055': st('low-row'),
  'LD-WH056': st('cable-pulldown'),
  'LD-WH057': pl('t-bar'),
  'LD-WH058': pl('row'),
  'LD-WH059': st('row'),
  'LD-WH060': pl('decline-press'),
  'LD-WH061': pl('incline-press'),
  'LD-WH062': pl('lying-press'),
  'LD-WH063': pl('chest-press'),
  'LD-WH064': rack('bar-holder'),
  'LD-WH065': pl('standing-calf'),
  'LD-WH066': pl('ground-lever'),
};

// Cursos reduzidos apenas nos itens cuja caixa comercial é menor que a
// abertura paramétrica padrão. A geometria em repouso e as medidas publicadas
// permanecem intactas; o ajuste é documentado no spec para revisão visual.
const MOTION_OVERRIDES: Record<string, Params> = {
  'LD-WH001': { travel: 0 },
  'LD-WH006': { swingScale: 0.1 },
  'LD-WH017': { swingScale: 0.1 },
  'LD-WH019': { swingScale: 0.1 },
  'LD-WH020': { swingScale: 0.1 },
  'LD-WH021': { swingScale: 0.1, stackTravel: 0.08 },
  'LD-WH022': { swingScale: 0.1 },
  'LD-WH034': { travel: 0 },
  'LD-WH035': { travel: 0 },
  'LD-WH036': { travel: 0 },
  'LD-WH040': { travel: 0.05 },
  'LD-WH046': { swingScale: 0.1 },
  'LD-WH053': { swingScale: 0.1 },
  'LD-WH066': { swingScale: 0.1 },
  // Aberturas reduzidas para manter braços e roletes dentro do vão real do
  // assento, sem alterar a geometria de repouso publicada.
  'LD-WH015': { swingScale: 0.5 },
  'LD-WH016': { swingScale: 0.5 },
  'LD-WH018': { swingScale: 0.2 },
  'LD-WH023': { swingScale: 0.5 },
  'LD-WH031': { swingScale: 0.5 },
  'LD-WH032': { swingScale: 0.5 },
  'LD-WH042': { swingScale: 0.5 },
  'LD-WH044': { swingScale: 0.5 },
  'LD-WH049': { swingScale: 0.1 },
  'LD-WH062': { swingScale: 0.5 },
};

function stackValue(value: string | null): { perStack: number; stacks: number } | undefined {
  if (!value) return undefined;
  const match = value.match(/(?:(\d+)\s*[×x]\s*)?(\d+(?:[.,]\d+)?)\s*kg/i);
  if (!match) return undefined;
  return { perStack: Number(match[2].replace(',', '.')), stacks: match[1] ? Number(match[1]) : 1 };
}

function rule(name: string): Rule {
  const n = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/cross smith/.test(n)) return { family: 'cable-station', params: { variant: 'cross-smith' } };
  if (/cross over|cross over|polia mono/.test(n)) return { family: 'cable-station', params: { variant: 'crossover' } };
  if (/polia|puxador|puxada/.test(n)) return { family: 'cable-station', params: { variant: 'dual-pulley' } };
  if (/barra guiada/.test(n)) return { family: 'rack', params: { variant: 'bar-holder' } };
  if (/suporte agachamento|suporte remada/.test(n)) return { family: 'rack', params: { variant: 'bar-holder' } };
  if (/banco|supino|scott|sissy|prancha|panturrilha sentada/.test(n)) {
    const variant = /declinado/.test(n) ? 'decline' : /inclinado/.test(n) ? 'incline' : 'flat';
    return { family: 'bench', params: { variant } };
  }
  if (/leg press horizontal/.test(n)) return { family: 'leg-press', params: { variant: 'horizontal' } };
  if (/leg press 90|leg press 45|hack|agachamento|panturrilha em pe|panturrilha em pé/.test(n)) {
    return { family: 'leg-press', params: { variant: /hack/.test(n) ? 'hack' : 'sled' } };
  }
  if (/hip thrust|elevacao pelvica|elevação pélvica|gluteo|glúteo/.test(n)) {
    return { family: 'plate-loaded-lever', params: { mechanism: 'hip-thrust' } };
  }
  if (/extensora/.test(n)) return { family: 'selectorized-tower', params: { mechanism: 'leg-extension' } };
  if (/flexora/.test(n)) return { family: 'selectorized-tower', params: { mechanism: 'leg-curl' } };
  if (/abdutora/.test(n)) return { family: 'selectorized-tower', params: { mechanism: 'hip-abduction' } };
  if (/adutora/.test(n)) return { family: 'selectorized-tower', params: { mechanism: 'hip-adduction' } };
  if (/peck fly/.test(n)) return { family: 'selectorized-tower', params: { mechanism: 'pec-fly' } };
  if (/peitoral dorsal/.test(n)) return { family: 'selectorized-tower', params: { mechanism: 'chest-press' } };
  if (/remada/.test(n)) return { family: 'plate-loaded-lever', params: { mechanism: 'row' } };
  if (/puxada alta/.test(n)) return { family: 'plate-loaded-lever', params: { mechanism: 'pulldown' } };
  if (/desenvolvimento/.test(n)) return { family: 'plate-loaded-lever', params: { mechanism: 'shoulder-press' } };
  if (/paralela|abdominal|lombar/.test(n)) return { family: 'plate-loaded-lever', params: { mechanism: 'ab-crunch' } };
  return { family: 'plate-loaded-lever', params: { mechanism: 'chest-press' } };
}

export function toSpec(product: CoreProduct): EquipmentSpecInput {
  const selected = BY_CODE[product.code] ?? rule(product.nome);
  const stack = stackValue(product.bateria);
  return {
    id: product.code,
    name: product.nome,
    family: selected.family,
    dimensionsMm: { length: product.dim[0], width: product.dim[1], height: product.dim[2] },
    ...(stack ? { weightStackKg: stack } : {}),
    params: { ...selected.params, ...(MOTION_OVERRIDES[product.code] ?? {}) },
    // As fotos Core são todas pretas, sem detalhe colorido.
    materials: { frame: '#171717', upholstery: '#0b0b0b', accent: '#2a2a2a' },
    trainingClearanceM: 0.6,
    review: { status: 'needs_review', notes: MOTION_OVERRIDES[product.code]
      ? 'Curso paramétrico reduzido para respeitar a caixa comercial; conferir movimento na foto.'
      : 'Gerado pela classificação Core; conferir família, mecanismo e foto.' },
    meta: { linha: product.linha, grupoMuscular: product.grupo_muscular, peso: product.peso, bateria: product.bateria, descricao: product.descricao },
  };
}

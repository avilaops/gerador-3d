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

// Cursos reduzidos apenas nos itens cuja caixa comercial é menor que a
// abertura paramétrica padrão. A geometria em repouso e as medidas publicadas
// permanecem intactas; o ajuste é documentado no spec para revisão visual.
const MOTION_OVERRIDES: Record<string, Params> = {
  'LD-WH017': { swingScale: 0.1 },
  'LD-WH019': { swingScale: 0.1 },
  'LD-WH020': { swingScale: 0.1 },
  'LD-WH021': { swingScale: 0.1, stackTravel: 0.08 },
  'LD-WH022': { swingScale: 0.1 },
  'LD-WH034': { travel: 0 },
  'LD-WH035': { travel: 0 },
  'LD-WH036': { travel: 0 },
  'LD-WH040': { travel: 0.05 },
  // Aberturas reduzidas para manter braços e roletes dentro do vão real do
  // assento, sem alterar a geometria de repouso publicada.
  'LD-WH018': { swingScale: 0.2 },
  'LD-WH023': { swingScale: 0.5 },
  'LD-WH031': { swingScale: 0.5 },
  'LD-WH032': { swingScale: 0.5 },
  'LD-WH042': { swingScale: 0.5 },
  'LD-WH044': { swingScale: 0.5 },
  'LD-WH049': { stackTravel: 0 },
};

function stackValue(value: string | null): { perStack: number; stacks: number } | undefined {
  if (!value) return undefined;
  const match = value.match(/(?:(\d+)\s*[×x]\s*)?(\d+(?:[.,]\d+)?)\s*kg/i);
  if (!match) return undefined;
  return { perStack: Number(match[2].replace(',', '.')), stacks: match[1] ? Number(match[1]) : 1 };
}

function rule(name: string): { family: FamilyId; params: Params } {
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
  const selected = rule(product.nome);
  const stack = stackValue(product.bateria);
  return {
    id: product.code,
    name: product.nome,
    family: selected.family,
    dimensionsMm: { length: product.dim[0], width: product.dim[1], height: product.dim[2] },
    ...(stack ? { weightStackKg: stack } : {}),
    params: { ...selected.params, ...(MOTION_OVERRIDES[product.code] ?? {}) },
    materials: { frame: '#171717', upholstery: '#0b0b0b', accent: '#f2bd00' },
    trainingClearanceM: 0.6,
    review: { status: 'needs_review', notes: MOTION_OVERRIDES[product.code]
      ? 'Curso paramétrico reduzido para respeitar a caixa comercial; conferir movimento na foto.'
      : 'Gerado pela classificação Core; conferir família, mecanismo e foto.' },
    meta: { linha: product.linha, grupoMuscular: product.grupo_muscular, peso: product.peso, bateria: product.bateria, descricao: product.descricao },
  };
}

import type { EquipmentSpecInput, FamilyId } from '../../src/spec/schema';

export interface CardioProduct {
  code: string;
  nome: string;
  linha: string;
  grupo_muscular: string;
  dim: [number, number, number];
  peso: string | null;
  bateria: string | null;
  descricao: string;
  /** Código do modelo no fabricante. */
  modelo?: string;
  alimentacao?: string | null;
}

type Params = Record<string, string | number | boolean>;
type Rule = { family: FamilyId; params: Params; colors?: { frame?: string; upholstery?: string; accent?: string } };

const tread = (variant: string, screen: string): Rule => ({ family: 'treadmill', params: { variant, screen } });
const bike = (variant: string, screen: string, extra: Params = {}): Rule => ({ family: 'bike', params: { variant, screen, ...extra } });
const ell = (variant: string, screen: string, extra: Params = {}): Rule => ({ family: 'elliptical', params: { variant, screen, ...extra } });

/**
 * Família, variante e tela de cada produto, conferidas contra a foto do fabricante
 * (`fotos-cardio`). Nas bicicletas e elípticos, o sufixo "S" do modelo é a versão com
 * tela grande, que também é 200 mm mais alta na planilha.
 */
const BY_CODE: Record<string, Rule> = {
  'LD-C001': { family: 'stair-climber', params: { steps: 9, screen: 'led' } },
  'LD-C002': tread('standard', 'lcd'),
  'LD-C003': tread('standard', 'led'),
  'LD-C004': tread('standard', 'lcd'),
  'LD-C005': tread('standard', 'led'),
  'LD-C006': tread('arch', 'touch'),
  'LD-C007': tread('standard', 'led'),
  'LD-C008': { ...tread('curved', 'led'), colors: { frame: '#6c7075', accent: '#2a2d31' } },
  'LD-C009': bike('upright', 'tablet'),
  'LD-C010': bike('recumbent', 'tablet'),
  'LD-C011': bike('upright', 'tablet'),
  'LD-C012': bike('upright', 'led'),
  'LD-C013': bike('recumbent', 'tablet'),
  'LD-C014': bike('recumbent', 'led'),
  'LD-C015': bike('upright', 'tablet'),
  'LD-C016': bike('upright', 'led'),
  'LD-C017': bike('recumbent', 'tablet'),
  'LD-C018': bike('recumbent', 'led'),
  'LD-C019': bike('spin', 'led'),
  'LD-C020': bike('spin', 'led'),
  'LD-C021': bike('spin', 'led'),
  'LD-C022': ell('rear-drive', 'tablet'),
  'LD-C023': ell('rear-drive', 'tablet'),
  'LD-C024': ell('rear-drive', 'led'),
  'LD-C025': ell('rear-drive', 'led'),
  'LD-C026': ell('rear-drive', 'led', { inclineRamp: true }),
  'LD-C027': ell('adaptive', 'tablet'),
  'LD-C028': ell('adaptive', 'led'),
};

const round2 = (v: number) => Math.round(v * 100) / 100;

export function toSpec(product: CardioProduct): EquipmentSpecInput | null {
  const rule = BY_CODE[product.code];
  if (!rule) return null;
  const [length, width, height] = product.dim;
  const diagonalM = Math.hypot(length, width, height) / 1000;
  const params: Params = { ...rule.params };
  // O selim da bicicleta de spinning fica perto do topo do guidão.
  if (rule.family === 'bike' && rule.params.variant === 'spin') params.seatHeight = Math.round(height * 0.86) / 1000;
  return {
    id: product.code,
    name: product.nome,
    family: rule.family,
    dimensionsMm: { length, width, height },
    params,
    materials: { frame: '#1c1c1f', upholstery: '#0e0e0f', accent: '#8d9399', ...(rule.colors ?? {}) },
    // Câmera da miniatura: três-quartos, afastada o bastante para a máquina inteira caber.
    camera: {
      azimuthDeg: 35,
      elevationDeg: 16,
      distanceM: round2(diagonalM * 1.3),
      target: [0, round2(height / 1000 * 0.45), 0],
    },
    trainingClearanceM: 0.6,
    review: { status: 'needs_review', notes: 'Gerado pela classificação Cardio; conferir família, variante e foto do fabricante.' },
    meta: {
      linha: product.linha,
      grupoMuscular: product.grupo_muscular,
      peso: product.peso,
      bateria: product.bateria,
      descricao: product.descricao,
      modelo: product.modelo ?? null,
    },
  };
}

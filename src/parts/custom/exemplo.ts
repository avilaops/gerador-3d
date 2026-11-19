/**
 * Specs de exemplo escritos à mão com `parts`. Servem de modelo para refinar um item pela foto
 * sem escrever uma família nova, e de caso de teste para o campo.
 */
import type { EquipmentSpecInput } from '../../spec/schema';

const placa = (i: number): NonNullable<EquipmentSpecInput['parts']>['items'][number] => ({
  kind: 'box',
  name: `placa_${String(i + 1).padStart(2, '0')}`,
  group: 'pilha',
  material: 'plate',
  size: [0.22, 0.03, 0.12],
  center: [0, 0.15 + i * 0.04, -0.3],
});

/**
 * Torre simples montada só com peças (`replace`): base, dois montantes, cabeçote, hastes
 * cromadas, banco com encosto e uma pilha de 8 placas que sobe 15 cm. A família não monta nada.
 */
export const EXEMPLO_TORRE_SUBSTITUIDA: EquipmentSpecInput = {
  id: 'EX-PARTS-TORRE',
  name: 'Exemplo: torre só com peças',
  family: 'selectorized-tower',
  dimensionsMm: { length: 900, width: 700, height: 1500 },
  parts: {
    mode: 'replace',
    items: [
      { kind: 'box', name: 'base', size: [0.7, 0.06, 0.9], center: [0, 0.03, 0] },
      { kind: 'tube', name: 'montante_esquerdo', points: [[-0.3, 0.06, -0.3], [-0.3, 1.38, -0.3]], size: 0.06 },
      { kind: 'tube', name: 'montante_direito', points: [[0.3, 0.06, -0.3], [0.3, 1.38, -0.3]], size: 0.06 },
      { kind: 'box', name: 'cabecote', size: [0.7, 0.12, 0.14], center: [0, 1.44, -0.3] },
      { kind: 'cylinder', name: 'haste_esquerda', material: 'chrome', from: [-0.13, 0.08, -0.3], to: [-0.13, 1.38, -0.3], diameter: 0.02 },
      { kind: 'cylinder', name: 'haste_direita', material: 'chrome', from: [0.13, 0.08, -0.3], to: [0.13, 1.38, -0.3], diameter: 0.02 },
      { kind: 'pad', name: 'assento', size: [0.4, 0.08, 0.38], center: [0, 0.45, 0.15] },
      { kind: 'pad', name: 'encosto', size: [0.38, 0.6, 0.08], center: [0, 0.85, -0.05], tiltX: -0.2 },
      ...Array.from({ length: 8 }, (_, i) => placa(i)),
    ],
    articulations: [{ node: 'pilha', type: 'prismatic', axis: [0, 1, 0], pivot: [0, 0, -0.3], range: [0, 0.15], driver: 'phase' }],
  },
};

/** Banco reto com uma plaqueta acrescentada às peças que a família já monta (`extend`). */
export const EXEMPLO_BANCO_ESTENDIDO: EquipmentSpecInput = {
  id: 'EX-PARTS-BANCO',
  name: 'Exemplo: banco com plaqueta',
  family: 'bench',
  dimensionsMm: { length: 1300, width: 600, height: 450 },
  params: { variant: 'flat' },
  parts: {
    mode: 'extend',
    items: [{ kind: 'box', name: 'plaqueta', material: 'label', size: [0.12, 0.05, 0.004], center: [0, 0.25, 0.3] }],
  },
};

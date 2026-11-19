/**
 * Medida de um item: escolhe o azimute e o lado da foto que dão a melhor nota.
 *
 * A foto não traz o ponto de vista, então o modelo é renderizado em vários azimutes e vale a
 * **melhor** nota, que fica registrada junto com o azimute. A foto também é testada espelhada,
 * porque o lado em que o equipamento aparece varia. Biblioteca sem efeito colateral: a linha
 * de comando está em `cli.ts`.
 */
import type { EquipmentSpecInput } from '../../src/spec/schema';
import { lerImagem } from './imagem';
import { comparar, espelhar, fotoParaMascara, type Mask } from './mascara';
import type { ResultadoItem } from './relatorio';
import type { Renderizador } from './render';

export const AZIMUTES_PADRAO = [-80, -60, -40, -20, 0, 20, 40, 60, 80];

export type SpecMedido = EquipmentSpecInput & { id: string; name?: string };

export interface MedidaItem {
  resultado: ResultadoItem;
  /** Máscara da foto já no lado que deu a melhor nota. */
  foto: Mask;
  /** Máscara do modelo na melhor vista. */
  modelo: Mask;
}

export async function medirItem(
  spec: SpecMedido,
  fotoBytes: Buffer,
  renderizador: Pick<Renderizador, 'mascara'>,
  azimutes: number[] = AZIMUTES_PADRAO,
  elevacao = 16
): Promise<MedidaItem> {
  const px = await lerImagem(fotoBytes);
  const foto = fotoParaMascara(px.data, px.w, px.h);
  const fotoEspelhada = espelhar(foto.mask);
  let melhor: { nota: ReturnType<typeof comparar>; azimute: number; espelhado: boolean; modelo: Mask } | null = null;
  for (const azimute of azimutes) {
    const modelo = await renderizador.mascara(spec, { azimute, elevacao });
    for (const espelhado of [false, true]) {
      const nota = comparar(espelhado ? fotoEspelhada : foto.mask, modelo);
      if (!melhor || nota.nota > melhor.nota.nota) melhor = { nota, azimute, espelhado, modelo };
    }
  }
  if (!melhor) throw new Error('Nenhum azimute para testar.');
  return {
    resultado: {
      id: spec.id,
      nome: spec.name ?? spec.id,
      nota: melhor.nota.nota,
      iou: melhor.nota.iou,
      proporcao: melhor.nota.proporcao,
      regioes: melhor.nota.regioes,
      azimute: melhor.azimute,
      espelhado: melhor.espelhado,
      confiancaFoto: foto.confianca,
    },
    foto: melhor.espelhado ? fotoEspelhada : foto.mask,
    modelo: melhor.modelo,
  };
}

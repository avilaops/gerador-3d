/**
 * Mede o quanto cada modelo de um catálogo se parece com a foto e gera o relatório.
 *
 * Uso:
 *   npx vite-node scripts/medicao/cli.ts -- --catalog ludus-core
 *   npx vite-node scripts/medicao/cli.ts -- --catalog ludus --only LD-B004,LD-A002 --saida ./saida
 *
 * Opções:
 *   --catalog   ludus ou ludus-core (padrão: ludus-core)
 *   --only      lista de códigos separados por vírgula
 *   --cache     pasta de cache das fotos (padrão: <temp>/gerador-medicao/fotos)
 *   --origem    URL da vitrine ou pasta local com <codigo>.<ext> (padrão: vitrine publicada)
 *   --saida     pasta do relatório (padrão: <temp>/gerador-medicao/<catalogo>)
 *   --azimutes  azimutes testados, separados por vírgula (padrão: -80,-60,-40,-20,0,20,40,60,80)
 *   --elevacao  elevação da câmera em graus (padrão: 16)
 *
 * As fotos ficam fora do repositório. Requer Chrome ou Edge instalado (CHROME_PATH aponta outro).
 * Determinístico: mesmas entradas, mesma nota. Saída: relatorio.json e relatorio.html.
 *
 * Sobre a nota: serve para ordenar os itens e comparar antes e depois de uma mudança. Não aprova
 * ninguém: foto com máscara duvidosa (coluna "confiança") pode dar nota baixa sem culpa do modelo.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ORIGEM_PADRAO, obterFoto } from './fotos';
import { sobreposicaoPng } from './imagem';
import { normalizar } from './mascara';
import { AZIMUTES_PADRAO, medirItem, type SpecMedido } from './medir';
import { abrirRenderizador } from './render';
import { gerarHtml, ordenar, resumir, type ImagensItem, type ResultadoItem } from './relatorio';

function arg(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const catalogo = arg('catalog') ?? 'ludus-core';
const only = arg('only')?.split(',');
const base = join(tmpdir(), 'gerador-medicao');
const cache = resolve(arg('cache') ?? join(base, 'fotos'));
const origem = arg('origem') ?? ORIGEM_PADRAO;
const saida = resolve(arg('saida') ?? join(base, catalogo));
const azimutes = arg('azimutes')?.split(',').map(Number) ?? AZIMUTES_PADRAO;
const elevacao = Number(arg('elevacao') ?? 16);
const dirSpecs = resolve('catalogs', catalogo, 'specs');
const arquivos = readdirSync(dirSpecs).filter((f) => f.endsWith('.json')).sort();

mkdirSync(saida, { recursive: true });
const renderizador = await abrirRenderizador();
const itens: ResultadoItem[] = [];
const imagens: Record<string, ImagensItem> = {};
try {
  for (const arquivo of arquivos) {
    const spec = JSON.parse(readFileSync(join(dirSpecs, arquivo), 'utf8')) as SpecMedido;
    if (only && !only.includes(spec.id)) continue;
    try {
      const bytes = await obterFoto(spec.id, cache, origem);
      const medida = await medirItem(spec, bytes, renderizador, azimutes, elevacao);
      itens.push(medida.resultado);
      imagens[spec.id] = { sobreposicao: sobreposicaoPng(normalizar(medida.foto), normalizar(medida.modelo)).toString('base64') };
      const r = medida.resultado;
      console.log(`${spec.id}  nota ${r.nota.toFixed(2)}  (azimute ${r.azimute}°${r.espelhado ? ', foto espelhada' : ''})`);
    } catch (e) {
      itens.push({ id: spec.id, nome: spec.name ?? spec.id, nota: 0, iou: 0, proporcao: 0, regioes: [null, null, null], azimute: 0, espelhado: false, confiancaFoto: 0, erro: (e as Error).message });
      console.error(`erro ${spec.id}: ${(e as Error).message}`);
    }
  }
} finally {
  await renderizador.fechar();
}
writeFileSync(join(saida, 'relatorio.json'), JSON.stringify({ catalogo, resumo: resumir(itens), itens: ordenar(itens) }, null, 2) + '\n');
writeFileSync(join(saida, 'relatorio.html'), gerarHtml(catalogo, itens, imagens));
const r = resumir(itens);
console.log(`\n${r.medidos}/${r.total} medidos · média ${r.media.toFixed(2)} · mediana ${r.mediana.toFixed(2)} · ${r.abaixoDe06} abaixo de 0,60`);
console.log(`Relatório em ${saida}`);
process.exit(r.medidos === 0 && r.total > 0 ? 1 : 0);

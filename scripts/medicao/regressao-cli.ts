/**
 * Regressão visual das silhuetas dos modelos.
 *
 * Uso:
 *   npx vite-node scripts/medicao/regressao-cli.ts -- verificar --catalog ludus-core
 *   npx vite-node scripts/medicao/regressao-cli.ts -- aprovar --catalog ludus-core --only LD-WH013
 *
 * Comandos:
 *   verificar  compara cada modelo com a referência aprovada; sai com código 1 se algum mudou
 *              ou não tem referência.
 *   aprovar    grava a silhueta atual como a nova referência. É o único jeito de aceitar uma mudança.
 *
 * Opções:
 *   --catalog     ludus ou ludus-core (padrão: ludus-core)
 *   --only        lista de códigos separados por vírgula
 *   --refs        pasta das referências (padrão: tests/visual/referencias/<catalogo>)
 *   --tolerancia  fração máxima da união que pode mudar (padrão: 0,02)
 *
 * A vista é fixa (`VISTA_REFERENCIA`); mudar a vista invalida todas as referências. Compara
 * silhueta, não cor: mudança de material ou de luz não dispara.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { aprovarReferencia, VISTA_REFERENCIA, verificarReferencia } from './regressao';
import { abrirRenderizador } from './render';
import type { SpecMedido } from './medir';

function arg(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const comando = process.argv.find((a) => a === 'verificar' || a === 'aprovar');
if (!comando) {
  console.error('Informe o comando: verificar ou aprovar.');
  process.exit(2);
}
const catalogo = arg('catalog') ?? 'ludus-core';
const only = arg('only')?.split(',');
const refs = resolve(arg('refs') ?? join('tests', 'visual', 'referencias', catalogo));
const tolerancia = Number((arg('tolerancia') ?? '0.02').replace(',', '.'));
const dirSpecs = resolve('catalogs', catalogo, 'specs');
const arquivos = readdirSync(dirSpecs).filter((f) => f.endsWith('.json')).sort();

const renderizador = await abrirRenderizador();
let problemas = 0;
let total = 0;
try {
  for (const arquivo of arquivos) {
    const spec = JSON.parse(readFileSync(join(dirSpecs, arquivo), 'utf8')) as SpecMedido;
    if (only && !only.includes(spec.id)) continue;
    total++;
    const mascara = await renderizador.mascara(spec, VISTA_REFERENCIA);
    if (comando === 'aprovar') {
      aprovarReferencia(refs, spec.id, mascara);
      console.log(`aprovado  ${spec.id}`);
      continue;
    }
    const r = await verificarReferencia(refs, spec.id, mascara, tolerancia);
    if (r.situacao !== 'ok') problemas++;
    console.log(`${r.situacao.padEnd(14)} ${spec.id}  diferença ${r.diferenca.toFixed(3)}`);
  }
} finally {
  await renderizador.fechar();
}
if (comando === 'verificar') {
  console.log(`\n${total - problemas}/${total} dentro da tolerância de ${tolerancia}.`);
  process.exit(problemas ? 1 : 0);
}
console.log(`\n${total} referência(s) gravada(s) em ${refs}.`);

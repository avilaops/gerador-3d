/**
 * Linha de comando da checagem de escopo das frentes (usada pelo workflow).
 *
 *   npx vite-node scripts/escopo-frentes-cli.ts -- --branch frente/a-medicao --base origin/main
 *
 * Branches que não começam com `frente/` passam sem checagem. Sai com código 1 se algum
 * arquivo alterado estiver fora do escopo. A lógica fica em `escopo-frentes.ts`, que não
 * tem efeito colateral ao ser importada.
 */
import { arquivosAlterados, foraDoEscopo, lerMapa } from './escopo-frentes';

function arg(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const branch = arg('branch') ?? '';
const base = arg('base') ?? 'origin/main';

if (!branch.startsWith('frente/')) {
  console.log(`Branch "${branch}" não é de frente: sem checagem de escopo.`);
} else {
  const slug = branch.slice('frente/'.length);
  const arquivos = arquivosAlterados(base);
  const fora = foraDoEscopo(slug, arquivos, lerMapa());
  if (fora.length) {
    console.error(`A frente "${slug}" alterou ${fora.length} arquivo(s) fora do seu escopo:`);
    for (const f of fora) console.error(`  - ${f}`);
    console.error('Reverta essas mudanças ou descreva a necessidade no PR (seção "Pedidos para a integração").');
    process.exitCode = 1;
  } else {
    console.log(`Frente "${slug}": ${arquivos.length} arquivo(s), todos dentro do escopo.`);
  }
}

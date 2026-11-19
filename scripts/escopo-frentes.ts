/**
 * Confere se um PR de frente só altera os caminhos que o blueprint reservou para ela.
 *
 * Uso (no CI):
 *   npx vite-node scripts/escopo-frentes.ts -- --branch frente/a-medicao --base origin/main
 *
 * Branches que não começam com `frente/` passam sem checagem. Código de saída 1 se
 * algum arquivo alterado estiver fora do escopo da frente. O mapa fica em
 * `docs/frentes/escopo.json`; o brief de cada frente está em `docs/frentes/<slug>.md`.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface EscopoFrente {
  permitir: string[];
  excluir?: string[];
}
export interface MapaEscopo {
  frentes: Record<string, EscopoFrente>;
}

/** `**` casa qualquer caminho (com barras), `*` casa dentro de um segmento. */
export function globParaRegex(glob: string): RegExp {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      re += '.*';
      i++;
      if (glob[i + 1] === '/') i++;
    } else if (c === '*') re += '[^/]*';
    else re += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

/** Arquivos que o brief e a evidência de qualquer frente podem ter. */
function permitidosDaFrente(slug: string, escopo: EscopoFrente): string[] {
  return [...escopo.permitir, `docs/frentes/${slug}.md`, `docs/frentes/evidencias/${slug}/**`];
}

/** Devolve os arquivos alterados que estão fora do escopo da frente. */
export function foraDoEscopo(slug: string, arquivos: string[], mapa: MapaEscopo): string[] {
  const escopo = mapa.frentes[slug];
  if (!escopo) throw new Error(`Frente desconhecida: "${slug}". Cadastre em docs/frentes/escopo.json.`);
  const ok = permitidosDaFrente(slug, escopo).map(globParaRegex);
  const proibidos = (escopo.excluir ?? []).map(globParaRegex);
  return arquivos
    .map((a) => a.replace(/\\/g, '/'))
    .filter((a) => proibidos.some((r) => r.test(a)) || !ok.some((r) => r.test(a)));
}

function arg(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main(): void {
  const branch = arg('branch') ?? '';
  const base = arg('base') ?? 'origin/main';
  if (!branch.startsWith('frente/')) {
    console.log(`Branch "${branch}" não é de frente: sem checagem de escopo.`);
    return;
  }
  const slug = branch.slice('frente/'.length);
  const mapa = JSON.parse(readFileSync(resolve('docs/frentes/escopo.json'), 'utf8')) as MapaEscopo;
  const saida = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' });
  const arquivos = saida.split('\n').map((l) => l.trim()).filter(Boolean);
  const fora = foraDoEscopo(slug, arquivos, mapa);
  if (fora.length) {
    console.error(`A frente "${slug}" alterou ${fora.length} arquivo(s) fora do seu escopo:`);
    for (const f of fora) console.error(`  - ${f}`);
    console.error('Reverta essas mudanças ou descreva a necessidade no PR (seção "Pedidos para a integração").');
    process.exit(1);
  }
  console.log(`Frente "${slug}": ${arquivos.length} arquivo(s), todos dentro do escopo.`);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/escopo-frentes.ts')) main();

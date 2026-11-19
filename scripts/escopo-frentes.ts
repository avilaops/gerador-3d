/**
 * Confere se um PR de frente só altera os caminhos que o blueprint reservou para ela.
 *
 * Biblioteca sem efeito colateral: a linha de comando está em `escopo-frentes-cli.ts`.
 * O mapa fica em `docs/frentes/escopo.json`; o brief de cada frente está em
 * `docs/frentes/<slug>.md`.
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

/** Lê o mapa de escopo do repositório. */
export function lerMapa(raiz = process.cwd()): MapaEscopo {
  return JSON.parse(readFileSync(resolve(raiz, 'docs/frentes/escopo.json'), 'utf8')) as MapaEscopo;
}

/** Arquivos que o branch alterou em relação à base (união de três pontos, como no PR). */
export function arquivosAlterados(base: string): string[] {
  const saida = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' });
  return saida.split('\n').map((l) => l.trim()).filter(Boolean);
}

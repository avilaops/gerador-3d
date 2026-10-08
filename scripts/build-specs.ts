/**
 * Gera os specs de um catálogo a partir de `catalogs/<nome>/products.json`,
 * usando o `toSpec` de `catalogs/<nome>/classify.ts`.
 *
 * Uso:
 *   npm run specs                    # catálogo ludus
 *   npm run specs -- --catalog nome
 *
 * Saída: `catalogs/<nome>/specs/<id>.json` e `catalogs/<nome>/specs-report.json`
 * (itens sem família reconhecida aparecem no relatório, sem interromper o lote).
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { EquipmentSpecInput } from '../src';

const i = process.argv.indexOf('--catalog');
const catalog = i >= 0 ? process.argv[i + 1] : 'ludus';
const dir = resolve('catalogs', catalog);
const classifyPath = join(dir, 'classify.ts').split('\\').join('/');
const { toSpec } = (await import(/* @vite-ignore */ classifyPath)) as {
  toSpec: (product: unknown) => EquipmentSpecInput | null;
};
const products = JSON.parse(readFileSync(join(dir, 'products.json'), 'utf8')) as {
  code: string;
  nome: string;
}[];

const out = join(dir, 'specs');
mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) if (f.endsWith('.json')) rmSync(join(out, f));

const unmatched: { code: string; nome: string }[] = [];
const byFamily: Record<string, number> = {};
for (const product of products) {
  const spec = toSpec(product);
  if (!spec) {
    unmatched.push({ code: product.code, nome: product.nome });
    continue;
  }
  byFamily[spec.family] = (byFamily[spec.family] ?? 0) + 1;
  writeFileSync(join(out, `${spec.id}.json`), JSON.stringify(spec, null, 2) + '\n');
}
writeFileSync(
  join(dir, 'specs-report.json'),
  JSON.stringify(
    { total: products.length, generated: products.length - unmatched.length, byFamily, unmatched },
    null,
    2
  ) + '\n'
);
console.warn(`${products.length - unmatched.length}/${products.length} specs em ${out}`, byFamily);
if (unmatched.length) console.warn('Sem família:', unmatched.map((u) => u.code).join(', '));

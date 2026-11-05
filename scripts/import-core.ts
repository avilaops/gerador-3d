import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { toSpec, type CoreProduct } from '../catalogs/ludus-core/classify';

const source = process.argv[2] ?? resolve('../site-publication/src/data/core.json');
const catalog = resolve('catalogs/ludus-core');
const products = JSON.parse(readFileSync(source, 'utf8')) as CoreProduct[];
mkdirSync(join(catalog, 'specs'), { recursive: true });
writeFileSync(join(catalog, 'products.json'), JSON.stringify(products, null, 2) + '\n');
for (const product of products) {
  const path = join(catalog, 'specs', `${product.code}.json`);
  const generated = toSpec(product);
  // Preserva ajustes manuais (câmera, calibração, articulações e parâmetros)
  // quando a fonte comercial é reimportada.
  const previous = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown> : {};
  writeFileSync(path, JSON.stringify({ ...generated, ...previous, meta: { ...generated.meta, ...(previous.meta as object ?? {}) } }, null, 2) + '\n');
}
writeFileSync(join(catalog, 'specs-report.json'), JSON.stringify({ total: products.length, generated: products.length, unmatched: [] }, null, 2) + '\n');
console.log(`${products.length}/${products.length} specs Core gerados`);

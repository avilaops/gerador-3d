import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const catalog = process.argv[2] ?? 'ludus-core';
const root = resolve('catalogs', catalog);
const specs = readdirSync(join(root, 'specs')).filter((file) => file.endsWith('.json'));
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')) as { count: number; failed: number; items: { id: string; ok: boolean }[] };
const required = ['model.glb', 'model.usdz', 'plan.svg', 'footprint.json', 'spec.json', 'thumb.png'];
const missing: string[] = [];
for (const file of specs) {
  const id = file.replace(/\.json$/, '');
  for (const asset of required) {
    const path = join(root, 'models', id, asset);
    if (!existsSync(path) || statSync(path).size === 0) missing.push(`${id}/${asset}`);
  }
}
if (manifest.count !== specs.length || manifest.failed !== 0 || manifest.items.filter((item) => item.ok).length !== specs.length) {
  missing.push(`manifest count=${manifest.count} failed=${manifest.failed} specs=${specs.length}`);
}
if (missing.length) {
  console.error(`Galeria inválida (${catalog}):\n${missing.join('\n')}`);
  process.exit(1);
}
console.log(`Galeria válida: ${catalog} (${specs.length} produtos × ${required.length} assets)`);

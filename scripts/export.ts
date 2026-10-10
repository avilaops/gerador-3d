/**
 * Exporta equipamentos gerados: model.glb (com animação), model.usdz, plan.svg
 * e spec.json (spec resolvido) em <saída>/<id>/, mais um manifest.json do lote.
 *
 * Uso:
 *   npm run export                              # os specs de exemplo (src/specs), em dist/equipment
 *   npm run export -- --catalog ludus           # catalogs/ludus/specs → catalogs/ludus/models
 *   npm run export -- --specs lote.json --out ../saida
 *   npm run export -- --catalog ludus --only LD-B004,LD-A002
 *
 * Itens que falham (família sem gerador, spec inválido) vão para o manifesto
 * sem interromper o lote. Código de saída 1 se algum item falhou.
 */
import validator from 'gltf-validator';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { installNodeShims } from '../src/export/nodeShims';
import {
  EquipmentSpecError,
  HANDWRITTEN_SPECS,
  exportGlb,
  exportUsdz,
  generateEquipment,
  planSvg,
  type EquipmentSpecInput,
} from '../src';

installNodeShims();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const catalog = arg('catalog');
const specsPath = arg('specs');
const only = arg('only')?.split(',');
const catalogDir = catalog ? resolve('catalogs', catalog) : undefined;
const out = resolve(arg('out') ?? (catalogDir ? join(catalogDir, 'models') : 'dist/equipment'));
const manifestPath = catalogDir ? join(catalogDir, 'manifest.json') : join(out, 'manifest.json');

let specs: EquipmentSpecInput[];
if (specsPath) {
  specs = [JSON.parse(readFileSync(resolve(specsPath), 'utf8'))].flat();
} else if (catalogDir) {
  const dir = join(catalogDir, 'specs');
  specs = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
} else {
  specs = HANDWRITTEN_SPECS;
}
if (only) specs = specs.filter((s) => only.includes(String(s.id)));

interface ManifestItem {
  id: string;
  ok: boolean;
  name?: string;
  family?: string;
  review?: string;
  error?: string;
  issues?: string[];
  warnings?: string[];
  /** Caminhos relativos à pasta do manifesto. */
  files?: { glb: string; usdz: string; plan: string; spec: string; thumb?: string };
  dimensionsMm?: { length: number; width: number; height: number };
  deviationPct?: { length: number; width: number; height: number };
  trainingArea?: { widthM: number; lengthM: number; areaM2: number };
  animated?: boolean;
  triangles?: number;
  glbBytes?: number;
  usdzBytes?: number;
}

const items: ManifestItem[] = [];
const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
const rel = (id: string, file: string) =>
  join(out, id, file)
    .slice(resolve(manifestPath, '..').length + 1)
    .split('\\')
    .join('/');
mkdirSync(out, { recursive: true });

for (const spec of specs) {
  const id = String((spec as { id?: unknown }).id ?? '(sem id)');
  try {
    const eq = generateEquipment(spec);
    const dir = join(out, eq.spec.id);
    mkdirSync(dir, { recursive: true });
    const glb = await exportGlb(eq);
    const erros = (await validator.validateBytes(new Uint8Array(glb))).issues.messages.filter((m) => m.severity === 0);
    if (erros.length) throw new Error(`GLB inválido: ${erros[0].code} ${erros[0].message}`);
    const usdz = await exportUsdz(eq);
    writeFileSync(join(dir, 'model.glb'), Buffer.from(glb));
    writeFileSync(join(dir, 'model.usdz'), Buffer.from(usdz));
    writeFileSync(join(dir, 'plan.svg'), planSvg(eq));
    const mm = (pts: [number, number][]) => pts.map(([x, z]) => [round(x), round(z)]);
    writeFileSync(
      join(dir, 'footprint.json'),
      JSON.stringify({
        unit: 'm',
        bounds: eq.footprint.bounds,
        outline: mm(eq.footprint.outline),
        parts: eq.footprint.parts.map(mm),
      })
    );
    const size = eq.bbox.getSize(eq.bbox.min.clone());
    const { widthM, lengthM, areaM2 } = eq.footprint.trainingArea;
    writeFileSync(
      join(dir, 'spec.json'),
      JSON.stringify(
        {
          ...eq.spec,
          resolved: {
            params: eq.params,
            articulations: eq.articulations,
            bboxM: { length: round(size.z), width: round(size.x), height: round(size.y) },
            trainingArea: eq.footprint.trainingArea,
            stats: eq.stats,
          },
        },
        null,
        2
      ) + '\n'
    );
    items.push({
      id: eq.spec.id,
      ok: true,
      name: eq.spec.name,
      family: eq.spec.family,
      review: eq.spec.review?.status ?? 'auto',
      warnings: eq.warnings,
      files: {
        glb: rel(eq.spec.id, 'model.glb'),
        usdz: rel(eq.spec.id, 'model.usdz'),
        plan: rel(eq.spec.id, 'plan.svg'),
        spec: rel(eq.spec.id, 'spec.json'),
        ...(existsSync(join(dir, 'thumb.png')) ? { thumb: rel(eq.spec.id, 'thumb.png') } : {}),
      },
      dimensionsMm: eq.spec.dimensionsMm,
      deviationPct: {
        length: round(eq.deviation.length * 100, 2),
        width: round(eq.deviation.width * 100, 2),
        height: round(eq.deviation.height * 100, 2),
      },
      trainingArea: { widthM: round(widthM), lengthM: round(lengthM), areaM2: round(areaM2, 2) },
      animated: !!eq.clip,
      triangles: eq.stats.triangles,
      glbBytes: glb.byteLength,
      usdzBytes: usdz.byteLength,
    });
    eq.dispose();
  } catch (e) {
    const err = e as Error;
    items.push({
      id,
      ok: false,
      error: err.message,
      issues: e instanceof EquipmentSpecError ? e.issues : undefined,
    });
    console.warn(`erro ${id}  ${err.message}`);
  }
}

const failed = items.filter((r) => !r.ok).length;
const total = (k: 'glbBytes' | 'usdzBytes') => items.reduce((a, r) => a + (r[k] ?? 0), 0);
writeFileSync(
  manifestPath,
  JSON.stringify({ catalog: catalog ?? null, count: items.length, failed, items }, null, 2) + '\n'
);
console.warn(
  `${items.length - failed}/${items.length} exportados em ${out}` +
    `  (GLB ${(total('glbBytes') / 1e6).toFixed(1)} MB, USDZ ${(total('usdzBytes') / 1e6).toFixed(1)} MB)`
);
process.exit(failed ? 1 : 0);

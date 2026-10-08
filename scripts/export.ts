/**
 * Exporta equipamentos gerados: model.glb (com animação), model.usdz, plan.svg
 * e spec.json (spec resolvido) em <out>/<id>/, mais um report.json do lote.
 *
 * Uso:
 *   npm run equipment:export                         # os specs escritos à mão (Fase 1)
 *   npm run equipment:export -- --specs caminho.json # um spec ou uma lista de specs
 *   npm run equipment:export -- --out ../saida       # pasta de saída (padrão: dist/equipment)
 *
 * Itens que falham (família sem gerador, spec inválido) vão para o relatório
 * sem interromper o lote. Código de saída 1 se algum item falhou.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

const out = resolve(arg('out') ?? 'dist/equipment');
const specsPath = arg('specs');
const specs: EquipmentSpecInput[] = specsPath
  ? [JSON.parse(readFileSync(resolve(specsPath), 'utf8'))].flat()
  : HANDWRITTEN_SPECS;

interface ReportItem {
  id: string;
  ok: boolean;
  family?: string;
  error?: string;
  issues?: string[];
  warnings?: string[];
  deviationPct?: { length: number; width: number; height: number };
  triangles?: number;
  glbBytes?: number;
  usdzBytes?: number;
}

const report: ReportItem[] = [];
mkdirSync(out, { recursive: true });

for (const spec of specs) {
  const id = String((spec as { id?: unknown }).id ?? '(sem id)');
  try {
    const eq = generateEquipment(spec);
    const dir = join(out, eq.spec.id);
    mkdirSync(dir, { recursive: true });
    const glb = await exportGlb(eq);
    const usdz = await exportUsdz(eq);
    writeFileSync(join(dir, 'model.glb'), Buffer.from(glb));
    writeFileSync(join(dir, 'model.usdz'), Buffer.from(usdz));
    writeFileSync(join(dir, 'plan.svg'), planSvg(eq));
    const size = eq.bbox.getSize(eq.bbox.min.clone());
    writeFileSync(
      join(dir, 'spec.json'),
      JSON.stringify(
        {
          ...eq.spec,
          resolved: {
            params: eq.params,
            articulations: eq.articulations,
            bboxM: { length: size.z, width: size.x, height: size.y },
            trainingArea: eq.footprint.trainingArea,
            stats: eq.stats,
          },
        },
        null,
        2
      )
    );
    const pct = (v: number) => Math.round(v * 10000) / 100;
    report.push({
      id: eq.spec.id,
      ok: true,
      family: eq.spec.family,
      warnings: eq.warnings,
      deviationPct: {
        length: pct(eq.deviation.length),
        width: pct(eq.deviation.width),
        height: pct(eq.deviation.height),
      },
      triangles: eq.stats.triangles,
      glbBytes: glb.byteLength,
      usdzBytes: usdz.byteLength,
    });
    console.warn(
      `ok   ${eq.spec.id}  GLB ${(glb.byteLength / 1024).toFixed(0)} KB  ${eq.stats.triangles} tri`
    );
    eq.dispose();
  } catch (e) {
    const err = e as Error;
    report.push({
      id,
      ok: false,
      error: err.message,
      issues: e instanceof EquipmentSpecError ? e.issues : undefined,
    });
    console.warn(`erro ${id}  ${err.message}`);
  }
}

writeFileSync(
  join(out, 'report.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), items: report }, null, 2)
);
const failed = report.filter((r) => !r.ok).length;
console.warn(`\n${report.length - failed}/${report.length} exportados em ${out}`);
process.exit(failed ? 1 : 0);

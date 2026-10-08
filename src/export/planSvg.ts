/**
 * Planta 2D em SVG: silhueta do equipamento em vista superior, área de treino
 * (folga) e cotas. Unidade do desenho: metros (viewBox em metros), com +Z (a
 * frente do equipamento) para baixo na folha.
 *
 * O SVG é autônomo (cores inline) e também tematizável: cada elemento tem uma
 * classe (`eq-part`, `eq-zone`, `eq-dim`, `eq-text`, `eq-zone-label`) que o
 * CSS da página pode sobrescrever.
 */
import type { GeneratedEquipment } from '../generate';
import type { Point2 } from '../footprint';

export interface PlanSvgOptions {
  /** Cor da silhueta. */
  ink?: string;
  /** Cor da área de treino e do rótulo. */
  accent?: string;
  muted?: string;
  /** Inclui <title>/<desc> acessíveis. */
  title?: string;
}

const fmtM = (m: number) =>
  m.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMm = (m: number) =>
  Math.round(m * 1000)
    .toLocaleString('pt-BR')
    .replace(/\./g, '');
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function polygon(points: Point2[], cls: string, style: string): string {
  const d = points.map(([x, z]) => `${r4(x)},${r4(z)}`).join(' ');
  return `<polygon class="${cls}" points="${d}" style="${style}"/>`;
}

export function planSvg(eq: GeneratedEquipment, opts: PlanSvgOptions = {}): string {
  const ink = opts.ink ?? '#141413';
  const accent = opts.accent ?? '#96764a';
  const muted = opts.muted ?? '#6d6a63';
  const { bounds: b, trainingArea: ta, parts } = eq.footprint;
  const spec = eq.spec;

  // Cotas usam as medidas do catálogo (C × L), desenhadas sobre a envolvente real.
  const W = b.maxX - b.minX;
  const D = b.maxZ - b.minZ;
  const extent = Math.max(ta.widthM, ta.lengthM);
  const fs = 0.036 * extent; // tamanho do texto proporcional ao desenho
  const sw = 0.006 * extent;
  const tick = 0.025 * extent;
  const gapDim = 0.08 * extent;

  const pad = 0.05 * extent;
  const minX = ta.minX - pad;
  const minY = ta.minZ - pad - fs * 1.6;
  const maxX = ta.maxX + gapDim + fs * 2.2;
  const maxY = ta.maxZ + gapDim + fs * 2.6;
  const vb = [minX, minY, maxX - minX, maxY - minY].map(r4).join(' ');

  const zoneStyle = `fill:${accent};fill-opacity:.12;stroke:${accent};stroke-width:${r4(sw)};stroke-dasharray:${r4(sw * 6)} ${r4(sw * 4)}`;
  const partStyle = `fill:${ink};stroke:${ink};stroke-width:${r4(sw * 0.4)};stroke-linejoin:round`;
  const dimStyle = `stroke:${muted};stroke-width:${r4(sw * 0.8)}`;
  const textStyle = `font-family:Barlow,Inter,Arial,sans-serif;font-size:${r4(fs)}px;fill:${muted};text-anchor:middle`;
  const zoneTextStyle = `font-family:Barlow,Inter,Arial,sans-serif;font-size:${r4(fs * 0.95)}px;fill:${accent};text-anchor:middle`;

  // Cota horizontal (largura, L) abaixo da área de treino.
  const yW = ta.maxZ + gapDim;
  const dimW = [
    `<line class="eq-dim" x1="${r4(b.minX)}" y1="${r4(yW)}" x2="${r4(b.maxX)}" y2="${r4(yW)}" style="${dimStyle}"/>`,
    `<line class="eq-dim" x1="${r4(b.minX)}" y1="${r4(yW - tick)}" x2="${r4(b.minX)}" y2="${r4(yW + tick)}" style="${dimStyle}"/>`,
    `<line class="eq-dim" x1="${r4(b.maxX)}" y1="${r4(yW - tick)}" x2="${r4(b.maxX)}" y2="${r4(yW + tick)}" style="${dimStyle}"/>`,
    `<text class="eq-text" x="${r4((b.minX + b.maxX) / 2)}" y="${r4(yW + fs * 1.4)}" style="${textStyle}">L ${fmtMm(spec.dimensionsMm.width / 1000)} mm</text>`,
  ];
  // Cota vertical (profundidade, C) à direita.
  const xD = ta.maxX + gapDim;
  const cy = (b.minZ + b.maxZ) / 2;
  const tx = xD + fs * 1.3;
  const dimD = [
    `<line class="eq-dim" x1="${r4(xD)}" y1="${r4(b.minZ)}" x2="${r4(xD)}" y2="${r4(b.maxZ)}" style="${dimStyle}"/>`,
    `<line class="eq-dim" x1="${r4(xD - tick)}" y1="${r4(b.minZ)}" x2="${r4(xD + tick)}" y2="${r4(b.minZ)}" style="${dimStyle}"/>`,
    `<line class="eq-dim" x1="${r4(xD - tick)}" y1="${r4(b.maxZ)}" x2="${r4(xD + tick)}" y2="${r4(b.maxZ)}" style="${dimStyle}"/>`,
    `<text class="eq-text" x="${r4(tx)}" y="${r4(cy)}" transform="rotate(90 ${r4(tx)} ${r4(cy)})" style="${textStyle}">C ${fmtMm(spec.dimensionsMm.length / 1000)} mm</text>`,
  ];
  // Indicador de frente (+Z).
  const fy = ta.maxZ + gapDim + fs * 2.4;
  const front = `<text class="eq-text" x="${r4((ta.minX + ta.maxX) / 2)}" y="${r4(fy)}" style="${textStyle};font-size:${r4(fs * 0.8)}px;letter-spacing:.1em">▼ FRENTE</text>`;

  const zoneLabel = `área de treino · ${fmtM(ta.widthM)} × ${fmtM(ta.lengthM)} m · ${fmtM(ta.areaM2)} m²`;
  const title =
    opts.title ??
    `Planta do ${spec.name} (${spec.id}): ${fmtMm(W)} × ${fmtMm(D)} mm, com ${Math.round(eq.footprint.clearanceM * 100)} cm de área de treino em volta`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${esc(title)}" data-equipment="${esc(spec.id)}" data-unit="m">`,
    `<title>${esc(title)}</title>`,
    `<rect class="eq-zone" x="${r4(ta.minX)}" y="${r4(ta.minZ)}" width="${r4(ta.widthM)}" height="${r4(ta.lengthM)}" style="${zoneStyle}"/>`,
    `<text class="eq-zone-label" x="${r4((ta.minX + ta.maxX) / 2)}" y="${r4(ta.minZ - fs * 0.5)}" style="${zoneTextStyle}">${esc(zoneLabel)}</text>`,
    `<g class="eq-parts">`,
    ...parts.filter((p) => p.length >= 3).map((p) => polygon(p, 'eq-part', partStyle)),
    `</g>`,
    ...dimW,
    ...dimD,
    front,
    `</svg>`,
  ].join('\n');
}

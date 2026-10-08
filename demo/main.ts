/**
 * Demo local: os dois modelos da Fase 1 lado a lado no componente de visualização.
 * Rodar com `npm run dev` e abrir /src/features/equipment-generator/demo/index.html
 */
import { EquipmentViewer } from '../viewer/EquipmentViewer';
import { HANDWRITTEN_SPECS } from '../specs';
import { exportGlb } from '../export/glb';
import { exportUsdz } from '../export/usdz';
import { planSvg } from '../export/planSvg';

const grid = document.getElementById('grid')!;
const params = new URLSearchParams(location.search);
const shot = params.has('shot'); // modo print: sem auto-rotação, buffer preservado

const pct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`;
const download = (data: BlobPart, name: string, type: string) => {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const viewers: EquipmentViewer[] = [];
for (const spec of HANDWRITTEN_SPECS) {
  const card = document.createElement('section');
  card.className = 'card';
  card.innerHTML = `<div><div class="code">${spec.id}</div><h2>${spec.name}</h2></div>`;
  const host = document.createElement('div');
  card.append(host);
  grid.append(card);

  const viewer = new EquipmentViewer(host, {
    autoRotate: !shot,
    preserveDrawingBuffer: shot,
    initial: shot ? { motion: false } : undefined,
  });
  const eq = viewer.setEquipment(spec);
  viewers.push(viewer);

  const s = eq.bbox.getSize(eq.bbox.min.clone());
  const dev = eq.deviation;
  const okDev = (v: number) => (Math.abs(v) <= 0.02 ? 'ok' : 'bad');
  const table = document.createElement('table');
  table.innerHTML = `
    <tr><td>Família</td><td>${eq.spec.family}</td></tr>
    <tr><td>Catálogo C × L × A</td><td>${eq.spec.dimensionsMm.length} × ${eq.spec.dimensionsMm.width} × ${eq.spec.dimensionsMm.height} mm</td></tr>
    <tr><td>Modelo C × L × A</td><td>${Math.round(s.z * 1000)} × ${Math.round(s.x * 1000)} × ${Math.round(s.y * 1000)} mm</td></tr>
    <tr><td>Desvio C / L / A</td><td><span class="${okDev(dev.length)}">${pct(dev.length)}</span> / <span class="${okDev(dev.width)}">${pct(dev.width)}</span> / <span class="${okDev(dev.height)}">${pct(dev.height)}</span></td></tr>
    <tr><td>Triângulos</td><td>${eq.stats.triangles.toLocaleString('pt-BR')}</td></tr>
    <tr><td>Malhas / geometrias / materiais</td><td>${eq.stats.meshes} / ${eq.stats.geometries} / ${eq.stats.materials}</td></tr>
    <tr><td>Articulações</td><td>${eq.articulations.map((a) => a.node).join(', ')}</td></tr>
    <tr><td>Área de treino</td><td>${eq.footprint.trainingArea.areaM2.toFixed(2).replace('.', ',')} m²</td></tr>`;
  card.append(table);
  if (eq.warnings.length) {
    const w = document.createElement('p');
    w.className = 'warn';
    w.textContent = eq.warnings.join(' · ');
    card.append(w);
  }

  const plan = document.createElement('div');
  plan.className = 'plan';
  const svg = planSvg(eq);
  plan.innerHTML = svg;
  card.append(plan);

  const dl = document.createElement('div');
  dl.className = 'dl';
  const btn = (label: string, fn: () => void) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = fn;
    dl.append(b);
  };
  btn('Baixar GLB', async () =>
    download(await exportGlb(eq), `${eq.spec.id}.glb`, 'model/gltf-binary')
  );
  btn('Baixar USDZ', async () =>
    download(await exportUsdz(eq), `${eq.spec.id}.usdz`, 'model/vnd.usdz+zip')
  );
  btn('Baixar planta SVG', () => download(svg, `${eq.spec.id}-planta.svg`, 'image/svg+xml'));
  card.append(dl);
}

// Gancho para prints automatizados (scripts de QA).
(window as unknown as { __eqDemo: unknown }).__eqDemo = { viewers };

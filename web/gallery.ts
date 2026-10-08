/**
 * Galeria de revisão: todos os specs de `catalogs/<nome>/specs`, com miniatura,
 * filtro por linha e busca. Clicar abre o visualizador, a ficha e os downloads.
 *
 * `?id=LD-B004` abre direto um equipamento; `?id=LD-B004&embed=1` mostra só o
 * visualizador (para iframe na página de produto).
 */
import { EquipmentViewer } from '../src/viewer/EquipmentViewer';
import { exportGlb } from '../src/export/glb';
import { exportUsdz } from '../src/export/usdz';
import { planSvg } from '../src/export/planSvg';
import type { EquipmentSpecInput } from '../src/spec/schema';

const specModules = import.meta.glob<EquipmentSpecInput>('../catalogs/*/specs/*.json', {
  eager: true,
  import: 'default',
});
const thumbModules = import.meta.glob<string>('../catalogs/*/models/*/thumb.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const thumbs = new Map<string, string>();
for (const [path, url] of Object.entries(thumbModules)) thumbs.set(path.split('/').at(-2)!, url);
const specs = Object.values(specModules).sort((a, b) => a.id.localeCompare(b.id));
const byId = new Map(specs.map((s) => [s.id, s]));

interface SiteInfo {
  brand: string;
  brandSub?: string;
  title: string;
  lead: string;
  note?: string;
}
const site = Object.values(
  import.meta.glob<SiteInfo>('../catalogs/*/site.json', { eager: true, import: 'default' })
)[0];

const params = new URLSearchParams(location.search);
/** `?dev=1` mostra os dados técnicos (família, desvio, triângulos) e os downloads. */
const dev = params.has('dev');
if (site) {
  document.title = `${site.brand} ${site.brandSub ?? ''} · ${site.title}`;
  document.getElementById('brand')!.innerHTML =
    `<b>${site.brand}</b>${site.brandSub ? ` <span>${site.brandSub}</span>` : ''}`;
  document.getElementById('title')!.textContent = site.title;
  document.getElementById('lead')!.textContent = site.lead;
}
const grid = document.getElementById('grid')!;
const bar = document.getElementById('bar')!;
const dialog = document.getElementById('dialog') as HTMLDialogElement;

const lineOf = (s: EquipmentSpecInput) => String(s.meta?.linha ?? 'Outros');
const kindOf = (s: EquipmentSpecInput) => String(s.params?.mechanism ?? s.params?.variant ?? '');
const pct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`;
const download = (data: BlobPart, name: string, type: string) => {
  const url = URL.createObjectURL(new Blob([data], { type }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

let viewer: EquipmentViewer | null = null;

function openDetail(spec: EquipmentSpecInput) {
  viewer?.dispose();
  dialog.innerHTML = `<button class="close" aria-label="Fechar">Fechar</button>
    <div class="detail"><div id="host"></div><div id="info"></div></div>`;
  dialog.querySelector('.close')!.addEventListener('click', () => dialog.close());
  dialog.showModal();
  viewer = new EquipmentViewer(dialog.querySelector<HTMLElement>('#host')!);
  const eq = viewer.setEquipment(spec);
  const info = dialog.querySelector<HTMLElement>('#info')!;
  const s = eq.bbox.getSize(eq.bbox.min.clone());
  const d = eq.deviation;
  const cls = (v: number) => (Math.abs(v) <= 0.02 ? 'ok' : 'bad');
  const dm = eq.spec.dimensionsMm;
  const svg = planSvg(eq);
  const meta = (eq.spec.meta ?? {}) as Record<string, string | null | undefined>;
  const row = (k: string, v: string) => `<tr><td>${k}</td><td>${v}</td></tr>`;
  const rows = [
    row('Dimensões (C × L × A)', `${dm.length} × ${dm.width} × ${dm.height} mm`),
    meta.peso ? row('Peso do equipamento', meta.peso) : '',
    meta.bateria ? row('Bateria de pesos', meta.bateria) : meta.linha === 'Peso livre' ? row('Carga', 'Anilhas') : '',
    row('Área de treino', `${eq.footprint.trainingArea.areaM2.toFixed(1).replace('.', ',')} m²`),
  ];
  if (dev) {
    rows.push(
      row('Família', `${eq.spec.family}${kindOf(spec) ? ` · ${kindOf(spec)}` : ''}`),
      row('Revisão', eq.spec.review?.status ?? 'auto'),
      row('Modelo C × L × A', `${Math.round(s.z * 1000)} × ${Math.round(s.x * 1000)} × ${Math.round(s.y * 1000)} mm`),
      row('Desvio C / L / A', `<span class="${cls(d.length)}">${pct(d.length)}</span> / <span class="${cls(d.width)}">${pct(d.width)}</span> / <span class="${cls(d.height)}">${pct(d.height)}</span>`),
      row('Triângulos', eq.stats.triangles.toLocaleString('pt-BR')),
      row('Articulações', eq.articulations.map((a) => a.node).join(', ') || 'nenhuma')
    );
  }
  info.innerHTML = `
    <div class="code">${eq.spec.id}</div><h2>${eq.spec.name}</h2>
    ${meta.linha ? `<div class="kicker">${meta.linha}${meta.grupoMuscular ? ` · ${meta.grupoMuscular}` : ''}</div>` : ''}
    <table>${rows.join('')}</table>
    ${meta.descricao ? `<p class="desc">${meta.descricao}</p>` : ''}
    ${dev && eq.warnings.length ? `<p class="warn">${eq.warnings.join(' · ')}</p>` : ''}
    <div class="blk-t">Planta do equipamento</div>
    <div class="plan">${svg}</div>
    ${site?.note ? `<p class="note">${site.note}</p>` : ''}
    <div class="dl"></div>`;
  const dl = info.querySelector('.dl')!;
  const btn = (label: string, fn: () => void) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = fn;
    dl.append(b);
  };
  if (dev) {
    btn('Baixar GLB', async () => download(await exportGlb(eq), `${eq.spec.id}.glb`, 'model/gltf-binary'));
    btn('Baixar USDZ', async () => download(await exportUsdz(eq), `${eq.spec.id}.usdz`, 'model/vnd.usdz+zip'));
  }
  btn('Baixar planta', () => download(svg, `${eq.spec.id}-planta.svg`, 'image/svg+xml'));
  history.replaceState(null, '', `?id=${eq.spec.id}${dev ? '&dev=1' : ''}`);
}

dialog.addEventListener('close', () => {
  viewer?.dispose();
  viewer = null;
  history.replaceState(null, '', location.pathname + (dev ? '?dev=1' : ''));
});

if (params.has('embed') && byId.has(params.get('id') ?? '')) {
  document.body.classList.add('embed');
  new EquipmentViewer(document.getElementById('embed')!).setEquipment(byId.get(params.get('id')!)!);
} else {
  const lines = ['Todos', ...new Set(specs.map(lineOf))];
  let line = 'Todos';
  let query = '';
  const search = Object.assign(document.createElement('input'), {
    type: 'search',
    placeholder: 'Buscar por nome ou código',
  });
  search.setAttribute('aria-label', 'Buscar por nome ou código');
  const count = Object.assign(document.createElement('span'), { className: 'count' });
  const chips = lines.map((l) => {
    const b = Object.assign(document.createElement('button'), { className: 'chip', textContent: l });
    b.type = 'button';
    b.onclick = () => {
      line = l;
      render();
    };
    return b;
  });
  bar.append(search, ...chips, count);
  search.oninput = () => {
    query = search.value.trim().toLowerCase();
    render();
  };

  const render = () => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.textContent === line)));
    const list = specs.filter(
      (s) =>
        (line === 'Todos' || lineOf(s) === line) &&
        (!query || `${s.id} ${s.name}`.toLowerCase().includes(query))
    );
    count.textContent = `${list.length} de ${specs.length}`;
    grid.replaceChildren(
      ...list.map((s) => {
        const b = document.createElement('button');
        b.className = 'item';
        b.type = 'button';
        const approved = s.review?.status === 'approved';
        b.innerHTML = `${thumbs.has(s.id) ? `<img loading="lazy" alt="" src="${thumbs.get(s.id)}" />` : '<img alt="" />'}
          <div class="txt"><div class="code">${s.id}</div><div class="name">${s.name}</div>
          ${dev ? `<span class="tag ${approved ? 'ok' : ''}">${approved ? 'aprovado' : 'precisa revisão'}</span>` : `<span class="tag">${lineOf(s)}</span>`}</div>`;
        b.onclick = () => openDetail(s);
        return b;
      })
    );
  };
  render();
  const first = byId.get(params.get('id') ?? '');
  if (first) openDetail(first);
}

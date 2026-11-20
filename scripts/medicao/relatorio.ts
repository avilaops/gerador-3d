/**
 * Relatório de medição: JSON e uma folha de contato HTML ordenada do pior para o melhor.
 */

export interface ResultadoItem {
  id: string;
  nome: string;
  /** `iou × proporcao`; 0 quando não foi possível medir. */
  nota: number;
  iou: number;
  proporcao: number;
  /** IoU das faixas de cima, do meio e de baixo. */
  regioes: (number | null)[];
  /** Azimute da vista em que o modelo mais se parece com a foto. */
  azimute: number;
  /** A foto estava espelhada em relação ao modelo naquela vista. */
  espelhado: boolean;
  /** Confiança da segmentação da foto. Nota baixa com confiança baixa pode ser a máscara, não o modelo. */
  confiancaFoto: number;
  erro?: string;
}

export interface ImagensItem {
  /** PNG em base64. */
  sobreposicao: string;
}

export function ordenar(itens: ResultadoItem[]): ResultadoItem[] {
  return [...itens].sort((a, b) => a.nota - b.nota || a.id.localeCompare(b.id));
}

const f = (n: number | null, d = 2) => (n === null ? '–' : n.toFixed(d));
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export interface ResumoRelatorio {
  total: number;
  medidos: number;
  media: number;
  mediana: number;
  /** Itens com nota abaixo de 0,6. */
  abaixoDe06: number;
  /** Itens cuja foto teve segmentação duvidosa (confiança abaixo de 0,6). */
  fotoDuvidosa: number;
}

export function resumir(itens: ResultadoItem[]): ResumoRelatorio {
  const medidos = itens.filter((i) => !i.erro);
  const notas = medidos.map((i) => i.nota).sort((a, b) => a - b);
  const media = notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : 0;
  const mediana = notas.length ? notas[Math.floor(notas.length / 2)] : 0;
  return {
    total: itens.length,
    medidos: medidos.length,
    media,
    mediana,
    abaixoDe06: medidos.filter((i) => i.nota < 0.6).length,
    fotoDuvidosa: medidos.filter((i) => i.confiancaFoto < 0.6).length,
  };
}

export function gerarHtml(catalogo: string, itens: ResultadoItem[], imagens: Record<string, ImagensItem> = {}): string {
  const ord = ordenar(itens);
  const r = resumir(itens);
  const linhas = ord
    .map((i) => {
      const img = imagens[i.id]?.sobreposicao;
      const cor = i.nota < 0.5 ? '#c0392b' : i.nota < 0.7 ? '#d68910' : '#1e8449';
      return `<tr>
  <td>${img ? `<img src="data:image/png;base64,${img}" width="128" height="128" alt="">` : ''}</td>
  <td><b>${esc(i.id)}</b><br>${esc(i.nome)}${i.erro ? `<br><em>${esc(i.erro)}</em>` : ''}</td>
  <td style="color:${cor}"><b>${f(i.nota)}</b></td>
  <td>${f(i.iou)}</td><td>${f(i.proporcao)}</td>
  <td>${i.regioes.map((x) => f(x)).join(' · ')}</td>
  <td>${i.azimute}°${i.espelhado ? ' (foto espelhada)' : ''}</td>
  <td${i.confiancaFoto < 0.6 ? ' style="color:#c0392b"' : ''}>${f(i.confiancaFoto)}</td>
</tr>`;
    })
    .join('\n');
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Medição foto × modelo · ${esc(catalogo)}</title>
<style>body{font:14px Arial,sans-serif;margin:24px;color:#222}table{border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:6px 10px;text-align:left;vertical-align:middle}th{background:#f3f3f3}.legenda{margin:8px 0 16px}</style></head><body>
<h1>Medição foto × modelo · ${esc(catalogo)}</h1>
<p>${r.medidos} de ${r.total} itens medidos. Nota média ${f(r.media)}, mediana ${f(r.mediana)}. ${r.abaixoDe06} abaixo de 0,60. ${r.fotoDuvidosa} com foto de segmentação duvidosa.</p>
<p class="legenda">Sobreposição: <span style="color:#3c78dc">azul</span> só na foto, <span style="color:#f09628">laranja</span> só no modelo, cinza escuro nos dois. Ordem: pior primeiro. Nota = IoU × proporção; serve para ordenar e para comparar antes e depois, não para aprovar.</p>
<table><thead><tr><th>Sobreposição</th><th>Item</th><th>Nota</th><th>IoU</th><th>Proporção</th><th>Topo · meio · base</th><th>Melhor vista</th><th>Confiança da foto</th></tr></thead>
<tbody>
${linhas}
</tbody></table></body></html>`;
}

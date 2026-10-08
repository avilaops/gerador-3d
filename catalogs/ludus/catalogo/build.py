"""Catálogo Ludus Premium (protótipo) com os modelos do gerador 3D.

Cada ficha traz o QR que abre o equipamento em 3D, o render do modelo e a
planta real (silhueta vista de cima). A planta do kit usa as mesmas silhuetas.

Uso (na raiz do repositório, depois de `npm run catalog`):
  python catalogs/ludus/catalogo/build.py --assets "<pasta com as fotos e logos>"

As fotos e os logos são do cliente e não ficam no repositório: `--assets`
aponta para a pasta com `LD-xxxx.png`, `logo_grande.png` e `logo_pequeno.png`.
Saída em `catalogs/ludus/catalogo/out/` (HTML, PDF e prévias PNG).
Dependências: qrcode, playwright (usa o Chrome instalado) e pymupdf.
"""
import argparse, json, sys
from pathlib import Path
import qrcode

HERE = Path(__file__).resolve().parent
CATALOG = HERE.parent
ap = argparse.ArgumentParser()
ap.add_argument('--assets', required=True, help='pasta com as fotos (LD-xxxx.png) e os logos')
ap.add_argument('--site', default='https://ludus.avilaops.com', help='endereço que o QR abre')
ap.add_argument('--out', default=str(HERE / 'out'))
args = ap.parse_args()
ASSETS = Path(args.assets).resolve()
OUT = Path(args.out).resolve()
OUT.mkdir(parents=True, exist_ok=True)
MODELS = CATALOG / 'models'

P = {i['code']: i for i in json.load(open(CATALOG / 'products.json', encoding='utf-8'))}
FOLGA = 0.6  # metros de área livre em volta de cada equipamento (premissa do protótipo)

def asset(name): return (ASSETS / name).as_uri()
def img(code): return asset(f'{code}.png')
def model(code, name): return (MODELS / code / name).as_uri()
def url3d(code): return f'{args.site}/?id={code}'
def m(mm): return mm / 1000

def qr_svg(text):
    q = qrcode.QRCode(border=0, box_size=10, error_correction=qrcode.constants.ERROR_CORRECT_M)
    q.add_data(text); q.make(fit=True)
    mtx = q.get_matrix(); n = len(mtx)
    rects = ''.join(f'<rect x="{x}" y="{y}" width="1.02" height="1.02"/>' for y, r in enumerate(mtx) for x, v in enumerate(r) if v)
    return f'<svg viewBox="0 0 {n} {n}" class="qr" shape-rendering="crispEdges"><g fill="#111">{rects}</g></svg>'

def area_treino(p):
    c, l, _ = p['dim']
    return (m(c) + 2 * FOLGA) * (m(l) + 2 * FOLGA)

def fmt(x, d=1): return f'{x:.{d}f}'.replace('.', ',')

def header(secao):
    return f'''<div class="hdr"><img src="{asset('logo_pequeno.png')}" class="logo-s"><span>{secao}</span></div>'''

def footer(secao, n):
    return f'''<div class="ftr"><span>Ludus Premium Equipamentos</span><span>{secao}</span><span>{n:02d}</span></div>'''

# ---------------------------------------------------------------- planta mini (ficha)
def mini_planta(p):
    """Planta do gerador 3D: silhueta real vista de cima, área de treino e cotas."""
    return f'<div class="miniplan"><img src="{model(p["code"], "plan.svg")}"></div>'

def silhueta(code, cx, cy, klass='equip'):
    """Silhueta em planta (as peças vistas de cima), centrada em (cx, cy). Frente do equipamento para baixo."""
    fp = json.load(open(MODELS / code / 'footprint.json'))
    polys = ''.join('<polygon points="' + ' '.join(f'{cx + x:.3f},{cy + z:.3f}' for x, z in part) + '"/>' for part in fp['parts'])
    return f'<g class="{klass}">{polys}</g>'

# ---------------------------------------------------------------- página 1: capa
def capa():
    n_total = len(P)
    return f'''
<section class="page capa">
  <div class="capa-foto"><img src="{img('LD-A030')}"></div>
  <div class="capa-tag">Protótipo para validação · Outubro 2026</div>
  <div class="capa-base">
    <div class="lockup"><img src="{asset('logo_grande.png')}" class="logo-l inv"><span class="prem">Premium</span></div>
    <div class="capa-txt">
      <div class="kicker">Catálogo de equipamentos</div>
      <h1>Força profissional,<br>do projeto à entrega.</h1>
      <div class="capa-meta">
        <div><b>{n_total}</b><span>equipamentos</span></div>
        <div><b>3</b><span>linhas</span></div>
        <div><b>Planta</b><span>da sua academia em escala</span></div>
        <div><b>3D</b><span>cada equipamento pelo QR</span></div>
      </div>
    </div>
  </div>
</section>'''

# ---------------------------------------------------------------- página 2: abertura de linha
def abertura():
    linha = [p for p in P.values() if p['linha'] == 'Peso livre']
    grupos = {}
    for p in linha: grupos[p['grupo_muscular']] = grupos.get(p['grupo_muscular'], 0) + 1
    mx = max(grupos.values())
    barras = ''.join(f'<div class="bar"><span class="bl">{g}</span><span class="bt"><i style="width:{v/mx*100:.0f}%"></i></span><span class="bv">{v}</span></div>'
                     for g, v in sorted(grupos.items(), key=lambda x: -x[1]))
    thumbs = ''.join(f'<div class="th"><div class="thimg"><img src="{img(c)}"></div><div class="thc">{c}</div><div class="thn">{P[c]["nome"]}</div></div>'
                     for c in ['LD-A030', 'LD-A023', 'LD-A034', 'LD-A004', 'LD-A013', 'LD-A008'])
    return f'''
<section class="page dark abertura">
  {header('Linhas de equipamentos')}
  <div class="ab-top">
    <div class="num">01</div>
    <div>
      <div class="kicker">Linha</div>
      <h2>Peso Livre Articulado</h2>
      <p class="lead">{len(linha)} equipamentos com carga por anilhas e braços independentes, para treinar cada lado do corpo com a mesma exigência.</p>
    </div>
  </div>
  <div class="ab-grid">
    <div class="difs">
      <div class="dif"><b>Braços independentes</b><p>Cada lado trabalha sozinho, o que corrige desequilíbrios de força e amplia a variedade de exercícios.</p></div>
      <div class="dif"><b>Trajetória natural</b><p>O movimento segue o arco do corpo humano, com sensação próxima ao peso livre e mais segurança.</p></div>
      <div class="dif"><b>Carga por anilhas</b><p>A progressão não tem o limite de uma bateria de pesos: o aluno avançado continua evoluindo no mesmo equipamento.</p></div>
    </div>
    <div class="dist">
      <div class="dist-t">Equipamentos por grupo muscular</div>
      {barras}
    </div>
  </div>
  <div class="ths">{thumbs}</div>
  {footer('Peso Livre Articulado', 2)}
</section>'''

# ---------------------------------------------------------------- páginas 3 e 4: fichas
CORES_ESTR = [('Piano Black', '#121212'), ('Graphite Black', '#3a3b3d'), ('Light Grey', '#c8cacc'), ('Titanium Grey', '#5e6367'), ('Performance Red', '#b8242a')]
CORES_BRACO = [('Preto', '#121212'), ('Grafite', '#3a3b3d'), ('Cinza', '#c8cacc'), ('Vermelho', '#b8242a'), ('Laranja', '#e2702a'), ('Amarelo', '#e5c92c'), ('Azul', '#1f4ea5')]

def swatches(lst):
    return ''.join(f'<span class="sw" style="background:{h}" title="{n}"></span>' for n, h in lst)

def ficha(code, musc_p, musc_s, n, secao, cores_braco=True):
    p = P[code]; c, l, a = p['dim']
    specs = [('Dimensões (C × L × A)', f'{c} × {l} × {a} mm'), ('Peso do equipamento', p['peso'])]
    specs.append(('Bateria de pesos', p['bateria']) if p['bateria'] else ('Carga', 'Anilhas'))
    specs.append(('Área de treino', f'{fmt(area_treino(p))} m²'))
    specs.append(('Carga máxima', '<em class="tbd">a confirmar</em>'))
    spec_html = ''.join(f'<div class="sp"><span>{k}</span><b>{v}</b></div>' for k, v in specs)
    chips = ''.join(f'<span class="chip p">{x}</span>' for x in musc_p) + ''.join(f'<span class="chip s">{x}</span>' for x in musc_s)
    braco = f'<div class="swl">Braços</div><div class="sws">{swatches(CORES_BRACO)}</div>' if cores_braco else ''
    return f'''
<section class="page ficha">
  {header(secao)}
  <div class="f-foto"><img src="{img(code)}">
    <a class="f-3d" href="{url3d(code)}"><img src="{model(code, 'thumb.png')}"><span>Modelo 3D interativo</span></a></div>
  <div class="f-head">
    <div><div class="f-code">{code}</div><h2>{p['nome']}</h2></div>
    <a class="f-qr" href="{url3d(code)}">{qr_svg(url3d(code))}<span>Veja em 3D<br>e em movimento</span></a>
  </div>
  <div class="f-body">
    <div class="f-col">
      <div class="specs">{spec_html}</div>
      <p class="desc">{p['descricao']}</p>
      <div class="blk"><div class="blk-t">Músculos trabalhados</div><div class="chips">{chips}</div>
        <div class="legend"><span class="chip p mini"></span>principal <span class="chip s mini"></span>auxiliar</div></div>
    </div>
    <div class="f-col side">
      <div class="blk"><div class="blk-t">Planta do equipamento</div>{mini_planta(p)}
        <div class="note">Silhueta real do equipamento visto de cima, com {int(FOLGA*100)} cm de folga em volta para uso e circulação.</div></div>
      <div class="blk"><div class="blk-t">Cores disponíveis</div>
        <div class="swl">Estrutura</div><div class="sws">{swatches(CORES_ESTR)}</div>{braco}
        <div class="note">Opções do fornecedor. Disponibilidade a confirmar.</div></div>
    </div>
  </div>
  {footer(secao, n)}
</section>'''

# ---------------------------------------------------------------- página 5: kit com planta
SALA_W, SALA_H = 15.0, 10.0
def kit_layout():
    pos = []
    def row(codes, x0, ytop=None, ybot=None):
        x = x0
        for c in codes:
            p = P['LD-' + c]; C, L = m(p['dim'][0]), m(p['dim'][1])
            y = ytop if ytop is not None else ybot - C
            pos.append(('LD-' + c, x, y, L, C)); x += L + FOLGA
    row('B012 B020 B004 B008 B006 B018 B017'.split(), 0.6, ytop=0.35)
    row('B003 B002 B016 B001 B014 B015'.split(), 2.9, ybot=SALA_H - 0.35)
    cx = P['LD-B038']; pos.append(('LD-B038', SALA_W - 0.35 - m(cx['dim'][1]), 2.75, m(cx['dim'][1]), m(cx['dim'][0])))
    for c, x, y, rot in [('A042', 6.3, 4.35, False), ('A046', 7.75, 4.35, False), ('A056', 9.35, 4.75, False)]:
        p = P['LD-' + c]; C, L = m(p['dim'][0]), m(p['dim'][1])
        pos.append(('LD-' + c, x, y, L, C))
    return pos

def kit():
    pos = kit_layout()
    # checagem de sobreposição entre equipamentos
    for i, a in enumerate(pos):
        for b in pos[i+1:]:
            if a[1] < b[1]+b[3] and b[1] < a[1]+a[3] and a[2] < b[2]+b[4] and b[2] < a[2]+a[4]:
                sys.exit(f'sobreposição {a[0]} {b[0]}')
        assert a[1] >= 0 and a[2] >= 0 and a[1]+a[3] <= SALA_W and a[2]+a[4] <= SALA_H, a
    # área ocupada por equipamento e união das áreas de treino (grade de 5 cm)
    ocup = sum(w*h for _, _, _, w, h in pos)
    g = 0.05; nx, ny = int(SALA_W/g), int(SALA_H/g); cnt = 0
    for i in range(nx):
        x = (i+0.5)*g
        for j in range(ny):
            y = (j+0.5)*g
            if any(px-FOLGA <= x <= px+w+FOLGA and py-FOLGA <= y <= py+h+FOLGA for _, px, py, w, h in pos): cnt += 1
    treino = cnt*g*g
    livre = SALA_W*SALA_H - treino
    zonas = ''.join(f'<rect x="{max(0,x-FOLGA)}" y="{max(0,y-FOLGA)}" width="{min(SALA_W,x+w+FOLGA)-max(0,x-FOLGA)}" height="{min(SALA_H,y+h+FOLGA)-max(0,y-FOLGA)}" class="zona"/>' for _, x, y, w, h in pos)
    eqs = ''.join(silhueta(c, x + w/2, y + h/2) + f'<circle cx="{x+w/2}" cy="{y+h/2}" r="0.21" class="eqdot"/><text x="{x+w/2}" y="{y+h/2}" class="eqn" dominant-baseline="central">{k+1}</text>' for k, (c, x, y, w, h) in enumerate(pos))
    # cotas da sala
    svg = f'''<svg viewBox="-0.9 -0.9 {SALA_W+1.6} {SALA_H+2.1}" class="planta">
      <rect x="-0.2" y="-0.2" width="{SALA_W+0.4}" height="{SALA_H+0.4}" class="parede"/>
      <rect x="0" y="0" width="{SALA_W}" height="{SALA_H}" class="piso"/>
      <rect x="0.6" y="{SALA_H-0.05}" width="1.2" height="0.3" fill="#f7f6f3"/>
      <path d="M0.6 {SALA_H} L0.6 {SALA_H-1.2} A1.2 1.2 0 0 1 1.8 {SALA_H}" class="porta"/>
      <text x="1.2" y="{SALA_H+0.6}" class="lbl">Entrada</text>
      <rect x="0.55" y="3.0" width="4.4" height="3.55" class="livre"/>
      <text x="2.75" y="4.7" class="lbl">Área livre</text><text x="2.75" y="5.15" class="lbl s">alongamento e funcional</text>
      {zonas}{eqs}
      <text x="7.9" y="6.0" class="lbl s">peso livre</text>
      <line x1="0" y1="-0.55" x2="{SALA_W}" y2="-0.55" class="cota"/><text x="{SALA_W/2}" y="-0.68" class="cotatxt">15,00 m</text>
      <line x1="-0.55" y1="0" x2="-0.55" y2="{SALA_H}" class="cota"/><text x="-0.68" y="{SALA_H/2}" class="cotatxt" transform="rotate(-90 -0.68 {SALA_H/2})">10,00 m</text>
      <g transform="translate({SALA_W-2.2},{SALA_H+0.5})"><rect x="0" y="0" width="1" height="0.12" fill="#111"/><rect x="1" y="0" width="1" height="0.12" fill="#fff" stroke="#111" stroke-width="0.02"/>
        <text x="0" y="0.5" class="esc">0</text><text x="1" y="0.5" class="esc">1</text><text x="2" y="0.5" class="esc">2 m</text></g>
    </svg>'''
    lista = ''.join(f'<div class="li"><span class="lin">{k+1}</span><span class="lic">{c}</span><span class="lnm">{P[c]["nome"]}</span></div>' for k, (c, *_rest) in enumerate(pos))
    return f'''
<section class="page kit">
  {header('Kits prontos')}
  <div class="kit-head">
    <div><div class="kicker">Kit Studio</div><h2>Academia de 150 m²</h2>
    <p class="lead">Uma musculação completa em 15 × 10 m: corpo inteiro na bateria de pesos, área de peso livre e espaço para funcional.</p></div>
    <div class="kpis">
      <div><b>{len(pos)}</b><span>equipamentos</span></div>
      <div><b>{fmt(ocup,0)} m²</b><span>ocupados pelas máquinas</span></div>
      <div><b>{fmt(livre,0)} m²</b><span>de circulação livre</span></div>
    </div>
  </div>
  {svg}
  <div class="kit-list">{lista}</div>
  <div class="note wide">Planta gerada automaticamente com a silhueta de cada equipamento em escala, com {int(FOLGA*100)} cm de área de treino em volta de cada equipamento. A Ludus entrega este estudo adaptado à planta real do cliente.</div>
  <div class="kits">
    <div class="kc on"><b>Studio</b><span>150 m² · 17 equipamentos</span></div>
    <div class="kc"><b>Academia</b><span>300 m² · em montagem</span></div>
    <div class="kc"><b>Completa</b><span>600 m² · em montagem</span></div>
  </div>
  {footer('Kit Studio 150 m²', 5)}
</section>'''

# ---------------------------------------------------------------- página 6: fechamento
def fechamento():
    def item(t, txt): return f'<div class="fc"><b>{t}</b><p>{txt}</p></div>'
    tbd = '<em class="tbd">a preencher pela Ludus</em>'
    return f'''
<section class="page dark fech">
  {header('Compra com segurança')}
  <div class="kicker">Do pedido ao primeiro treino</div>
  <h2>Por que comprar da Ludus</h2>
  <div class="fgrid">
    {item('Garantia', f'Estrutura: {tbd}<br>Peças e estofados: {tbd}')}
    {item('Assistência técnica', f'Atendimento e peças de reposição no Brasil. Prazo de atendimento: {tbd}')}
    {item('Prazo de entrega', f'Pronta entrega: {tbd}<br>Sob encomenda: {tbd}')}
    {item('Instalação e montagem', f'Montagem no local por equipe própria ou credenciada. Condições: {tbd}')}
    {item('Projeto da academia', 'Estudo de layout em planta com os equipamentos em escala, adaptado ao espaço do cliente, antes da compra.')}
    {item('Formas de pagamento', f'{tbd}')}
  </div>
  <div class="steps-t">Como funciona</div>
  <div class="steps">
    <div class="st"><i>1</i><b>Envie a planta</b><p>Medidas do espaço ou a planta do imóvel.</p></div>
    <div class="st"><i>2</i><b>Receba o layout</b><p>Equipamentos em escala, com circulação e áreas de treino.</p></div>
    <div class="st"><i>3</i><b>Aprove a proposta</b><p>Lista final, prazo e condições em um só documento.</p></div>
    <div class="st"><i>4</i><b>Entrega e montagem</b><p>Equipamentos instalados e prontos para o primeiro treino.</p></div>
  </div>
  <div class="contato">
    <div class="lockup"><img src="{asset('logo_grande.png')}" class="logo-l inv"><span class="prem">Premium</span></div>
    <div class="ct">
      <div class="kicker">Fale com um consultor</div>
      <div class="ctl">WhatsApp {tbd}</div>
      <div class="ctl">E-mail {tbd}</div>
      <div class="ctl">Site {tbd}</div>
    </div>
  </div>
  {footer('Contato', 6)}
</section>'''

CSS = open(HERE / 'style.css', encoding='utf-8').read()
html = f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"><style>{CSS}</style></head><body>
{capa()}{abertura()}
{ficha('LD-A002', ['Peitoral', 'Grande dorsal'], ['Deltoides', 'Tríceps', 'Bíceps'], 3, 'Peso Livre Articulado · Peitoral')}
{ficha('LD-B004', ['Peitoral'], ['Deltoide anterior'], 4, 'Bateria de Pesos · Peitoral', cores_braco=False)}
{kit()}{fechamento()}
</body></html>'''
html_path = OUT / 'catalogo.html'
html_path.write_text(html, encoding='utf-8')

from playwright.sync_api import sync_playwright
import pymupdf

pdf_path = OUT / 'Catalogo Ludus Premium - Prototipo 3D.pdf'
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    pg = b.new_page()
    pg.goto(html_path.as_uri())
    pg.wait_for_load_state('networkidle')
    pg.evaluate('document.fonts.ready')
    pg.pdf(path=str(pdf_path), format='A4', print_background=True, prefer_css_page_size=True)
    b.close()
d = pymupdf.open(pdf_path)
for i, pp in enumerate(d):
    pp.get_pixmap(dpi=90).save(OUT / f'prev{i+1}.png')
print(f'{len(d)} páginas em {pdf_path}')

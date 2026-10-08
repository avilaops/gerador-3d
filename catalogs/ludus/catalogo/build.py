"""Catálogo Ludus Premium (protótipo) com os modelos do gerador 3D.

Cada ficha traz o QR que abre o equipamento em 3D, o render do modelo e a
planta real (silhueta vista de cima). A planta do kit usa as mesmas silhuetas.

Uso (na raiz do repositório, depois de `npm run catalog`):
  python catalogs/ludus/catalogo/build.py --assets "<fotos>" --assets "<logos>"
  python catalogs/ludus/catalogo/build.py --assets ... --prototipo   # só as 6 páginas do protótipo

As fotos e os logos são do cliente e não ficam no repositório: `--assets`
(pode repetir) aponta para as pastas com `LD-xxxx.png` ou `.jpg`,
`logo_grande.png` e `logo_pequeno.png`.
Saída em `catalogs/ludus/catalogo/out/` (HTML, PDF e prévias PNG).
Dependências: qrcode, playwright (usa o Chrome instalado) e pymupdf.
"""
import argparse, json, re, sys, unicodedata
from pathlib import Path
import qrcode

HERE = Path(__file__).resolve().parent
CATALOG = HERE.parent
ap = argparse.ArgumentParser()
ap.add_argument('--assets', required=True, action='append', help='pasta com as fotos (LD-xxxx.png/.jpg) e os logos; pode repetir')
ap.add_argument('--prototipo', action='store_true', help='gera só o protótipo de 6 páginas (duas fichas)')
ap.add_argument('--site', default='https://ludus.avilaops.com', help='endereço que o QR abre')
ap.add_argument('--out', default=str(HERE / 'out'))
args = ap.parse_args()
ASSETS = [Path(a).resolve() for a in args.assets]
OUT = Path(args.out).resolve()
OUT.mkdir(parents=True, exist_ok=True)
MODELS = CATALOG / 'models'

P = {i['code']: i for i in json.load(open(CATALOG / 'products.json', encoding='utf-8'))}
FOLGA = 0.6  # metros de área livre em volta de cada equipamento (premissa do protótipo)

def asset(name):
    for d in ASSETS:
        if (d / name).exists(): return (d / name).as_uri()
    sys.exit(f'arquivo não encontrado em --assets: {name}')
def img(code):
    for d in ASSETS:
        for ext in ('png', 'jpg'):
            if (d / f'{code}.{ext}').exists(): return (d / f'{code}.{ext}').as_uri()
    sys.exit(f'foto não encontrada em --assets: {code}')
def slug(p):
    t = unicodedata.normalize('NFKD', p['nome']).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-') + '-' + p['code'].lower()
def model(code, name): return (MODELS / code / name).as_uri()
def url3d(code): return f'{args.site}/loja/{slug(P[code])}/?origem=catalogo'

MUSC = json.load(open(CATALOG / 'musculos.json', encoding='utf-8'))
def musculos(code):
    if code in MUSC['porCodigo']: return MUSC['porCodigo'][code]
    params = json.load(open(CATALOG / 'specs' / f'{code}.json', encoding='utf-8')).get('params', {})
    return MUSC['porMecanismo'].get(str(params.get('mechanism') or params.get('variant') or ''))
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
LINHAS = {
    'Peso livre': dict(titulo='Peso Livre Articulado', lead='equipamentos com carga por anilhas e braços independentes, para treinar cada lado do corpo com a mesma exigência.',
        difs=[('Braços independentes', 'Cada lado trabalha sozinho, o que corrige desequilíbrios de força e amplia a variedade de exercícios.'),
              ('Trajetória natural', 'O movimento segue o arco do corpo humano, com sensação próxima ao peso livre e mais segurança.'),
              ('Carga por anilhas', 'A progressão não tem o limite de uma bateria de pesos: o aluno avançado continua evoluindo no mesmo equipamento.')],
        thumbs=['LD-A030', 'LD-A023', 'LD-A034', 'LD-A004', 'LD-A013', 'LD-A008']),
    'Bateria de pesos': dict(titulo='Bateria de Pesos', lead='equipamentos com troca de carga por pino e movimento guiado, a base de qualquer sala de musculação.',
        difs=[('Troca de carga em segundos', 'O pino seletor muda o peso sem sair do equipamento, o que mantém o ritmo do treino e o giro da sala.'),
              ('Movimento guiado', 'A trajetória definida dá segurança ao iniciante e permite isolar o músculo com precisão.'),
              ('Ajuste para cada corpo', 'Regulagens de assento e de amplitude adaptam o mesmo equipamento a alunos de alturas diferentes.')],
        thumbs=['LD-B004', 'LD-B012', 'LD-B002', 'LD-B003', 'LD-B038', 'LD-B023']),
    'Bancos e suportes': dict(titulo='Bancos e Suportes', lead='bancos e suportes que organizam a área de peso livre e completam a sala.',
        difs=[('Estrutura firme', 'Base larga e tubos reforçados, para treinar pesado sem balanço.'),
              ('Do reto ao regulável', 'Bancos fixos para cada ângulo e modelos reguláveis para quem precisa de versatilidade em pouco espaço.'),
              ('Sala organizada', 'Suportes de barras e de anilhas mantêm o material no lugar e a circulação livre.')],
        thumbs=['LD-A050', 'LD-A051', 'LD-A042', 'LD-A048', 'LD-A053', 'LD-A056']),
}

def abertura(linha_id='Peso livre', num=1, n=2):
    L = LINHAS[linha_id]
    linha = [p for p in P.values() if p['linha'] == linha_id]
    grupos = {}
    for p in linha: grupos[p['grupo_muscular']] = grupos.get(p['grupo_muscular'], 0) + 1
    mx = max(grupos.values())
    barras = ''.join(f'<div class="bar"><span class="bl">{g}</span><span class="bt"><i style="width:{v/mx*100:.0f}%"></i></span><span class="bv">{v}</span></div>'
                     for g, v in sorted(grupos.items(), key=lambda x: -x[1]))
    thumbs = ''.join(f'<div class="th"><div class="thimg"><img src="{img(c)}"></div><div class="thc">{c}</div><div class="thn">{P[c]["nome"]}</div></div>'
                     for c in L['thumbs'])
    difs = ''.join(f'<div class="dif"><b>{t}</b><p>{x}</p></div>' for t, x in L['difs'])
    return f'''
<section class="page dark abertura">
  {header('Linhas de equipamentos')}
  <div class="ab-top">
    <div class="num">{num:02d}</div>
    <div>
      <div class="kicker">Linha</div>
      <h2>{L['titulo']}</h2>
      <p class="lead">{len(linha)} {L['lead']}</p>
    </div>
  </div>
  <div class="ab-grid">
    <div class="difs">{difs}</div>
    <div class="dist">
      <div class="dist-t">Equipamentos por grupo muscular</div>
      {barras}
    </div>
  </div>
  <div class="ths">{thumbs}</div>
  {footer(L['titulo'], n)}
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
    bloco_musc = f'<div class="blk"><div class="blk-t">Músculos trabalhados</div><div class="chips">{chips}</div><div class="legend"><span class="chip p mini"></span>principal <span class="chip s mini"></span>auxiliar</div></div>' if chips else ''
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
      {bloco_musc}
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

def kit(n=5):
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
  {footer('Kit Studio 150 m²', n)}
</section>'''

# ---------------------------------------------------------------- página 6: fechamento
def fechamento(n=6):
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
      <div class="ctl">WhatsApp (17) 99777-5154</div>
      <div class="ctl">comercial@ludusequipamentos.com.br</div>
      <div class="ctl">{args.site.replace('https://', '')}</div>
      <div class="ctl" style="font-size:7.5pt;opacity:.7;margin-top:2mm">Ludus Equipamentos para Musculação Ltda · CNPJ 66.058.955/0001-08</div>
    </div>
  </div>
  {footer('Contato', n)}
</section>'''

CSS = open(HERE / 'style.css', encoding='utf-8').read()
def ficha_auto(code, n):
    p = P[code]
    m = musculos(code) or {'principais': [], 'auxiliares': []}
    secao = f"{LINHAS[p['linha']]['titulo']} · {p['grupo_muscular']}"
    return ficha(code, m['principais'], m['auxiliares'], n, secao, cores_braco=p['linha'] == 'Peso livre')

paginas = [capa()]
if args.prototipo:
    paginas += [abertura('Peso livre', 1, 2), ficha_auto('LD-A002', 3), ficha_auto('LD-B004', 4), kit(5), fechamento(6)]
else:
    n = 2
    for num, linha_id in enumerate(LINHAS, 1):
        paginas.append(abertura(linha_id, num, n)); n += 1
        itens = sorted((p for p in P.values() if p['linha'] == linha_id), key=lambda p: (p['grupo_muscular'], p['code']))
        for p in itens:
            paginas.append(ficha_auto(p['code'], n)); n += 1
    paginas += [kit(n), fechamento(n + 1)]

html = f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"><style>{CSS}</style></head><body>
{''.join(paginas)}
</body></html>'''
html_path = OUT / 'catalogo.html'
html_path.write_text(html, encoding='utf-8')

from playwright.sync_api import sync_playwright
import pymupdf

pdf_path = OUT / ('Catalogo Ludus Premium - Prototipo 3D.pdf' if args.prototipo else 'Catalogo Ludus Premium.pdf')
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
    if args.prototipo or i < 12: pp.get_pixmap(dpi=90).save(OUT / f'prev{i+1}.png')
print(f'{len(d)} páginas em {pdf_path}')

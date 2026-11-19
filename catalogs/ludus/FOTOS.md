# Fotos dos equipamentos da Ludus

Onde estão as fotos que servem de referência para os modelos 3D, para a nota de silhueta (`silhueta.py --fotos`) e para o catálogo impresso (`catalogo/build.py --assets`). Situação em 19/11/2026.

## Fonte oficial: ERP (R2)

A fonte de verdade de cada produto é a foto principal da ficha técnica no ERP. Os arquivos ficam no bucket R2 `ludus-equipamentos-midias`:

```
ludus/catalogo/v1/<colecao>/<SKU>/
  source.jpg | source.png   original (premium em JPG, core em PNG)
  web.webp                  versão web sem perda (foto principal da ficha)
  thumbnail.jpg             miniatura
  black.png                 recorte sobre fundo preto
```

- `<colecao>` é `core` para LD-WH001 a LD-WH066 e `premium` para LD-A e LD-B.
- Os 157 produtos ativos de força têm as quatro versões. Desde 19/11/2026, cada ficha aponta para o `web.webp` como foto principal.
- LD-B010, LD-B011 e LD-B034 estão arquivados no ERP e não têm foto.

Como baixar:

- **Sem credencial**, pelo catálogo publicado:
  - `https://ludusequipamentos.com/midias/produtos/<SKU>` traz o WebP do produto.
  - `https://ludusequipamentos.com/midias/catalogo.json` traz a lista com código, nome, linha, dimensões, peso e `imageKey`.
  - O arquivo de cada `imageKey` fica em `https://ludusequipamentos.com/midias/<imageKey sem o prefixo ludus/catalogo/>`.
- **Originais**, pelo ERP: `GET /api/v1/products/<id>/media/<mediaId>` com sessão autenticada.

## Fotos brutas dos catálogos DHZ (Google Drive)

Na pasta do Drive `Fotos dos equipamentos — catálogos DHZ`, que fica em https://drive.google.com/drive/folders/1R2cAPOGqXO_HKDvdgXpMVjDfWY99ahW8:

- `Fotos_DHZ_104_modelos.zip` tem 104 JPG, nomeados pelo código do fabricante (SM5014, SM-2001, E6250, U2016…), não pelo código LD.
- O `indice_fotos.csv` dentro do zip liga cada foto ao catálogo, à página do PDF, ao lado da máquina e ao SHA-256.
- Para chegar ao código LD, use o modelo do fabricante gravado na ficha do ERP (`manufacturer_model`). Os 91 LD-A e LD-B ativos têm foto no zip.
- Fotos do zip sem produto cadastrado ficam fora do catálogo: E6247, E6251A, E6251B, EMI1000, SM-2049, SM5010, SM5011, U1017C, U1017F, U2016, U2017, U2017P e U3016.
- Na mesma pasta estão os PDFs de origem: `Brochure- HammerForce Pro.pdf`, `Brochure- Hammer S-FORCE.pdf` e `DHZ Brochure- Cable Motion.pdf`.

## Cardio: novo, ainda sem foto

Em 19/11/2026 entraram no ERP 28 equipamentos de cardio da DHZ, de LD-C001 a LD-C028: esteiras, bicicletas, elípticos, escada e PMT.

- Eles **não estão** em `products.json`.
- Têm dimensões C × L × A, peso, modelo DHZ e especificações na ficha técnica do ERP.
- Ainda **não têm foto**: os catálogos do Drive não trazem cardio. As fotos serão cadastradas à mão no ERP e passam a seguir o mesmo caminho do R2 acima, na coleção `premium`.
- Para modelar no gerador, falta família paramétrica de cardio: esteira, bicicleta vertical, bicicleta horizontal, spinning, elíptico e escada.

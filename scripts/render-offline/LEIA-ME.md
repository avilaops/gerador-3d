# Render offline (Blender)

Transforma o `model.glb` de cada produto em imagem de estúdio com o Blender, sem tela. Serve para
catálogo, miniatura de revista e foto de venda. Não toca no gerador: lê só o GLB.

## Obter o Blender

Zip portátil oficial, sem instalar no sistema:

- Versão: **Blender 4.5.16 LTS**, `blender-4.5.16-windows-x64.zip`
- Origem: `https://download.blender.org/release/Blender4.5/`
- SHA-256: `e258e90a1ebc14798ad65b3426bc5f11f5e0e013541c61cc7c3ee9bbf4ca0ce6`

Confira o hash antes de extrair (`Get-FileHash -Algorithm SHA256 arquivo.zip`) e extraia numa pasta
nova. Passe o caminho do `blender.exe` em `--blender` ou na variável `BLENDER`.

## Rodar

Na raiz do repositório:

```bash
python scripts/render-offline/render.py --blender C:/abs/blender.exe --saida C:/abs/imagens \
  --codigos "LD-WH013,LD-WH02*" --vistas tres-quartos,frente,lado --fundos opaco,transparente
```

| Opção | Padrão | O que faz |
| --- | --- | --- |
| `--modelos` | `catalogs/ludus-core/models` | Pasta com `<código>/model.glb` |
| `--saida` | (obrigatório) | Pasta de saída, **caminho absoluto** |
| `--codigos` | todos | Códigos ou curingas separados por vírgula, sem diferenciar caixa |
| `--vistas` | `tres-quartos` | `frente`, `lado`, `tres-quartos` |
| `--fundos` | `opaco` | `opaco` (fundo infinito) e/ou `transparente` (só sombra no piso) |
| `--largura`, `--altura` | 1024 × 768 | Tamanho em pixels |
| `--amostras` | 64 | Amostras do Cycles (denoise ligado) |
| `--semente` | 7 | Semente do Cycles |
| `--max` | sem limite | Para depois de N imagens novas |
| `--simular` | | Só lista o que seria feito |

Saída: `<saida>/<código>/<vista>-<fundo>.png` e `<saida>/registro.json`.

## Retomada

Cada imagem é um processo do Blender, gravada em `*.parcial.png` e renomeada só quando termina.
O `registro.json` guarda tempo, semente e parâmetros. Rodar de novo **pula o que está no registro e
no disco**. Arquivo sem registro (render interrompido) e registro sem arquivo (apagado à mão) são
refeitos. Falha de uma imagem não derruba o lote; o código de saída é 1 se alguma falhou.

## O estúdio

- **Fundo infinito** (curva de 90° entre piso e parede) que gira com a câmera, sempre atrás do modelo.
- **Cinco luzes de área** em tamanho proporcional ao modelo (energia com o quadrado do raio): principal
  alta, preenchimento, contraluz e duas tiras laterais que desenham a borda.
- **Dois cartões pretos** fora do quadro, só para refletir nas partes metálicas e dar definição ao preto.
- **Lente** de 85 mm para peça pequena e 50 mm para máquina; a câmera enquadra projetando os 8 cantos da
  caixa, com 8% de folga, nos dois formatos de imagem.
- Cor: AgX. Mundo fraco (0,08), a luz vem das luzes de área.

## Tempo e determinismo

Medido em CPU, 1024 × 768, 64 amostras, num servidor de 2 vCPU e 4 GB: **190 a 207 s por imagem**.

Mesma semente, mesmo GLB e mesma versão do Blender dão a **mesma imagem em pixels** (testado: 0 pixels
diferentes). O arquivo PNG tem hash diferente porque o Blender grava metadados; compare pixels.
Mudar o Blender ou a CPU pode mudar o ruído; o registro anota o motor (`cycles-cpu`).

## Testes

A lógica pura (enquadramento, câmera, luzes, seleção, retomada, linha de comando) é testada sem Blender:

```bash
python -I -m unittest discover -s scripts/render-offline -p "test_*.py"
```

O render em si não tem teste automático: é validado olhando as imagens do PR.

## Armadilhas

1. Caminho de saída relativo vai parar na raiz do disco: `--saida` é recusado se não for absoluto.
2. O importador glTF converte Y para cima em Z para cima; a frente do modelo vira -Y. Já tratado em `planejar.py`.
3. O preto sai cinza se o mundo for claro demais ou o material do gerador for metálico demais. Aqui o
   mundo é fraco e há cartões escuros; **o material não é corrigido** (é da frente D).
4. Fundo transparente exige o piso como *shadow catcher*; por isso nesse modo não há curva de fundo.

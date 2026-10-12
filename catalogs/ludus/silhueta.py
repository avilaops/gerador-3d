"""Nota de silhueta foto x modelo de cada item do catálogo.

Compara o contorno da foto com o da miniatura sem sombra (`mask.png`, gerada por
`npm run thumbs -- --mask --name mask`). Cada contorno é recortado na própria caixa,
encaixado num quadro de 128 px mantendo a proporção, e a nota é a interseção sobre a
união (0 = nada em comum, 1 = idênticos). É uma medida grosseira: serve para ordenar
os itens do que mais diverge para o que menos diverge, não para aprovar ninguém.

Uso:
    python catalogs/ludus/silhueta.py --fotos <pasta com LD-xxxx.jpg>

As fotos ficam fora deste repositório. Saída: `catalogs/ludus/silhueta.json`.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

AQUI = Path(__file__).parent
LADO = 128


def contorno(caminho: Path, tolerancia: int) -> np.ndarray:
    """Máscara do que difere da cor de fundo (lida nos quatro cantos)."""
    img = np.asarray(Image.open(caminho).convert('RGB'), dtype=np.int16)
    cantos = np.stack([img[2, 2], img[2, -3], img[-3, 2], img[-3, -3]])
    fundo = np.median(cantos, axis=0)
    return np.abs(img - fundo).max(axis=2) > tolerancia


def enquadrar(mascara: np.ndarray) -> np.ndarray:
    linhas = np.flatnonzero(mascara.any(axis=1))
    colunas = np.flatnonzero(mascara.any(axis=0))
    if linhas.size == 0:
        return np.zeros((LADO, LADO), dtype=bool)
    recorte = mascara[linhas[0] : linhas[-1] + 1, colunas[0] : colunas[-1] + 1]
    h, w = recorte.shape
    escala = LADO / max(h, w)
    novo = Image.fromarray(recorte).resize((max(1, round(w * escala)), max(1, round(h * escala))), Image.NEAREST)
    quadro = np.zeros((LADO, LADO), dtype=bool)
    nh, nw = novo.size[1], novo.size[0]
    y, x = (LADO - nh) // 2, (LADO - nw) // 2
    quadro[y : y + nh, x : x + nw] = np.asarray(novo)
    return quadro


def nota(foto: Path, modelo: Path) -> float:
    # A foto tem sombra suave no piso: tolerância maior para não contar a sombra como máquina.
    a = enquadrar(contorno(foto, 45))
    b = enquadrar(contorno(modelo, 14))
    uniao = np.logical_or(a, b).sum()
    return float(np.logical_and(a, b).sum() / uniao) if uniao else 0.0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--fotos', required=True, type=Path)
    args = ap.parse_args()
    notas: dict[str, float] = {}
    for pasta in sorted((AQUI / 'models').iterdir()):
        foto, modelo = args.fotos / f'{pasta.name}.jpg', pasta / 'mask.png'
        if foto.exists() and modelo.exists():
            notas[pasta.name] = round(nota(foto, modelo), 3)
    (AQUI / 'silhueta.json').write_text(json.dumps(notas, indent=2) + '\n', encoding='utf-8')
    ordem = sorted(notas.items(), key=lambda kv: kv[1])
    media = sum(notas.values()) / max(1, len(notas))
    print(f'{len(notas)} itens, média {media:.3f}')
    print('piores:', ', '.join(f'{k} {v:.2f}' for k, v in ordem[:15]))
    print('melhores:', ', '.join(f'{k} {v:.2f}' for k, v in ordem[-8:]))


if __name__ == '__main__':
    main()

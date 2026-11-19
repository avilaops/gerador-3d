"""Lote de render offline: GLB do catálogo -> PNG de estúdio com o Blender, retomável.

    python scripts/render-offline/render.py --blender C:/caminho/blender.exe \
        --saida C:/abs/pasta --codigos "LD-WH013,LD-WH02*" --vistas tres-quartos,frente

Não depende de nada fora da biblioteca padrão do Python. Cada imagem é um processo do Blender
(isolado: uma falha não derruba o lote). Grava `registro.json` na pasta de saída com tempo, semente
e parâmetros de cada imagem; rodar de novo pula o que já está no registro e no disco.
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import planejar  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))


def ler_args(argv=None) -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--blender", default=os.environ.get("BLENDER"), help="blender.exe (ou variável BLENDER)")
    ap.add_argument("--modelos", default="catalogs/ludus-core/models", help="pasta com <código>/model.glb")
    ap.add_argument("--saida", required=True, help="pasta de saída (caminho absoluto)")
    ap.add_argument("--codigos", default="", help="códigos ou curingas separados por vírgula; vazio = todos")
    ap.add_argument("--vistas", default="tres-quartos", help=f"entre {', '.join(planejar.VISTAS)}")
    ap.add_argument("--fundos", default="opaco", help=f"entre {', '.join(planejar.FUNDOS)}")
    ap.add_argument("--largura", type=int, default=1024)
    ap.add_argument("--altura", type=int, default=768)
    ap.add_argument("--amostras", type=int, default=64)
    ap.add_argument("--semente", type=int, default=7)
    ap.add_argument("--max", type=int, default=0, help="para depois de N imagens novas (0 = sem limite)")
    ap.add_argument("--simular", action="store_true", help="só lista o que seria feito")
    return ap.parse_args(argv)


def csv(texto: str) -> list[str]:
    return [p.strip() for p in texto.split(",") if p.strip()]


def main(argv=None) -> int:
    a = ler_args(argv)
    if not os.path.isabs(a.saida):
        print("--saida precisa ser caminho absoluto", file=sys.stderr)
        return 2
    if not a.simular and not (a.blender and os.path.exists(a.blender)):
        print("informe --blender (ou a variável BLENDER) com o caminho do blender.exe", file=sys.stderr)
        return 2

    disponiveis = [d for d in os.listdir(a.modelos) if os.path.exists(os.path.join(a.modelos, d, "model.glb"))]
    codigos = planejar.selecionar(disponiveis, csv(a.codigos))
    if not codigos:
        print("nenhum modelo casa com o filtro", file=sys.stderr)
        return 2
    tarefas = planejar.montar_tarefas(codigos, csv(a.vistas), csv(a.fundos))
    registro_path = os.path.join(a.saida, "registro.json")
    registro = planejar.carregar_registro(registro_path)
    faltam = planejar.pendentes(tarefas, a.saida, registro)
    print(f"{len(tarefas)} imagens pedidas, {len(tarefas) - len(faltam)} já prontas, {len(faltam)} a fazer")
    if a.max:
        faltam = faltam[: a.max]
    if a.simular:
        for t in faltam:
            print("  ", t.chave)
        return 0

    feitas, falhas = 0, []
    for t in faltam:
        final = t.arquivo(a.saida)
        os.makedirs(os.path.dirname(final), exist_ok=True)
        parcial = final[:-4] + ".parcial.png"
        glb = os.path.abspath(os.path.join(a.modelos, t.codigo, "model.glb"))
        cmd = planejar.comando_blender(a.blender, os.path.join(AQUI, "cena_blender.py"), glb, parcial, t, a.largura, a.altura, a.amostras, a.semente)
        inicio = time.time()
        proc = subprocess.run(cmd, capture_output=True, text=True)
        segundos = round(time.time() - inicio, 1)
        if proc.returncode != 0 or not os.path.exists(parcial):
            falhas.append(t.chave)
            print(f"FALHOU {t.chave} ({segundos}s): {(proc.stderr or proc.stdout).strip().splitlines()[-1:]}", file=sys.stderr)
            continue
        os.replace(parcial, final)  # só vira imagem pronta quando o render terminou inteiro
        registro[t.chave] = {
            "segundos": segundos, "semente": a.semente, "amostras": a.amostras,
            "largura": a.largura, "altura": a.altura, "motor": "cycles-cpu",
        }
        planejar.salvar_registro(registro_path, registro)
        feitas += 1
        print(f"ok {t.chave} {segundos}s")
    print(f"{feitas} feitas, {len(falhas)} falhas")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())

"""Lógica pura do render offline: sem Blender, sem rede, testável com unittest.

Convenção do gerador: metros, Y para cima, frente em +Z. O importador glTF do Blender converte
para Z para cima, então a frente do modelo fica em -Y no mundo do Blender. Tudo aqui já trabalha
nas coordenadas do Blender (X direita, Y fundo, Z cima).
"""
from __future__ import annotations

import fnmatch
import json
import math
import os
from dataclasses import dataclass
from typing import Iterable, Sequence

SENSOR_MM = 36.0

# nome: (azimute em graus, elevação em graus). Azimute 0 é de frente; 90 é pela direita do modelo.
VISTAS: dict[str, tuple[float, float]] = {
    "frente": (0.0, 8.0),
    "lado": (90.0, 8.0),
    "tres-quartos": (35.0, 18.0),
}
FUNDOS = ("opaco", "transparente")


@dataclass(frozen=True)
class Caixa:
    """Caixa do modelo no mundo do Blender: mínimo e máximo em cada eixo."""

    lo: tuple[float, float, float]
    hi: tuple[float, float, float]

    @property
    def centro(self) -> tuple[float, float, float]:
        return tuple((a + b) / 2 for a, b in zip(self.lo, self.hi))  # type: ignore[return-value]

    @property
    def tamanho(self) -> tuple[float, float, float]:
        return tuple(b - a for a, b in zip(self.lo, self.hi))  # type: ignore[return-value]

    @property
    def diagonal(self) -> float:
        return math.sqrt(sum(v * v for v in self.tamanho))


def fov_efetivo(lente_mm: float, largura: int, altura: int) -> float:
    """Menor campo de visão (rad) entre horizontal e vertical: é ele que limita o enquadramento.

    O sensor de 36 mm vale para o lado maior da imagem (ajuste automático do Blender).
    """
    if lente_mm <= 0 or largura <= 0 or altura <= 0:
        raise ValueError("lente e dimensões precisam ser positivas")
    lado_maior = 2 * math.atan(SENSOR_MM / (2 * lente_mm))
    razao = min(largura, altura) / max(largura, altura)
    return 2 * math.atan(math.tan(lado_maior / 2) * razao)


def distancia_camera(caixa: Caixa, lente_mm: float, largura: int, altura: int, folga: float = 1.2) -> float:
    """Distância do centro até a câmera para a esfera que envolve a caixa caber com `folga`."""
    if folga < 1:
        raise ValueError("folga menor que 1 cortaria o modelo")
    raio = max(caixa.diagonal, 0.1) / 2
    return raio / math.sin(fov_efetivo(lente_mm, largura, altura) / 2) * folga


def posicao_camera(centro: Sequence[float], distancia: float, azimute: float, elevacao: float) -> tuple[float, float, float]:
    """Posição da câmera. Azimute 0 olha de frente (câmera em -Y); cresce para a direita do modelo."""
    az, el = math.radians(azimute), math.radians(elevacao)
    return (
        centro[0] + distancia * math.cos(el) * math.sin(az),
        centro[1] - distancia * math.cos(el) * math.cos(az),
        centro[2] + distancia * math.sin(el),
    )


def lente_para(caixa: Caixa) -> float:
    """Lente de 85 mm para peça pequena (menos distorção) e 50 mm para máquina grande."""
    return 85.0 if caixa.diagonal < 1.6 else 50.0


@dataclass(frozen=True)
class Luz:
    nome: str
    posicao: tuple[float, float, float]
    energia: float
    tamanho: tuple[float, float]  # (largura, altura) do retângulo de luz de área


def layout_luzes(caixa: Caixa, azimute: float) -> list[Luz]:
    """Luzes do estúdio em torno do modelo, giradas junto com a câmera.

    A energia cresce com o quadrado do raio: a mesma imagem sai igual em modelos de tamanhos
    diferentes. A luz principal é grande e alta; duas tiras laterais desenham a borda; o contraluz
    separa o modelo do fundo.
    """
    r = max(caixa.diagonal, 1.0)
    cx, cy, cz = caixa.centro
    giro = math.radians(azimute)

    def girar(x: float, y: float) -> tuple[float, float]:
        # Rotação em torno do centro: a câmera em azimute 0 está em -Y.
        return (cx + x * math.cos(giro) - y * math.sin(giro), cy + x * math.sin(giro) + y * math.cos(giro))

    def luz(nome: str, dx: float, dy: float, dz: float, energia: float, w: float, h: float) -> Luz:
        x, y = girar(dx * r, dy * r)
        return Luz(nome, (x, y, cz + dz * r), energia * r * r, (w * r, h * r))

    return [
        luz("principal", 1.2, -1.6, 1.8, 170, 2.2, 2.2),
        luz("preenchimento", -2.0, -1.0, 0.8, 40, 2.5, 2.5),
        luz("contraluz", -0.4, 2.0, 1.6, 90, 1.5, 1.5),
        luz("tira_direita", 1.9, 0.2, 0.5, 60, 0.35, 2.2),
        luz("tira_esquerda", -1.9, 0.2, 0.5, 60, 0.35, 2.2),
    ]


def cartoes_escuros(caixa: Caixa, azimute: float) -> list[tuple[str, tuple[float, float, float], float, tuple[float, float]]]:
    """Cartões pretos fora do quadro: refletem nas partes metálicas e dão definição ao preto.

    Devolve (nome, posição, giro em Z em graus, (largura, altura)).
    """
    r = max(caixa.diagonal, 1.0)
    cx, cy, cz = caixa.centro
    giro = math.radians(azimute)
    saida = []
    for nome, lado in (("cartao_direito", 1.0), ("cartao_esquerdo", -1.0)):
        x, y = lado * 1.25 * r, -0.15 * r
        px = cx + x * math.cos(giro) - y * math.sin(giro)
        py = cy + x * math.sin(giro) + y * math.cos(giro)
        saida.append((nome, (px, py, cz), azimute + (90.0 if lado > 0 else -90.0), (1.4 * r, 1.6 * r)))
    return saida


# --- seleção, retomada e linha de comando --------------------------------------------------------


def selecionar(codigos_disponiveis: Iterable[str], filtros: Sequence[str] | None) -> list[str]:
    """Códigos que casam com algum filtro (curinga ao estilo shell, sem diferenciar caixa)."""
    todos = sorted(codigos_disponiveis)
    if not filtros:
        return todos
    padroes = [f.strip().lower() for f in filtros if f.strip()]
    return [c for c in todos if any(fnmatch.fnmatch(c.lower(), p) for p in padroes)]


@dataclass(frozen=True)
class Tarefa:
    codigo: str
    vista: str
    fundo: str

    @property
    def chave(self) -> str:
        return f"{self.codigo}/{self.vista}/{self.fundo}"

    def arquivo(self, pasta_saida: str) -> str:
        return os.path.join(pasta_saida, self.codigo, f"{self.vista}-{self.fundo}.png")


def montar_tarefas(codigos: Sequence[str], vistas: Sequence[str], fundos: Sequence[str]) -> list[Tarefa]:
    for v in vistas:
        if v not in VISTAS:
            raise ValueError(f"vista desconhecida: {v} (use {', '.join(VISTAS)})")
    for f in fundos:
        if f not in FUNDOS:
            raise ValueError(f"fundo desconhecido: {f} (use {', '.join(FUNDOS)})")
    return [Tarefa(c, v, f) for c in codigos for v in vistas for f in fundos]


def pendentes(tarefas: Sequence[Tarefa], pasta_saida: str, registro: dict, existe=os.path.exists) -> list[Tarefa]:
    """Tarefas que ainda precisam ser feitas.

    Só conta como pronta a imagem que está no registro **e** no disco: arquivo sem registro pode
    ser de um render interrompido, e registro sem arquivo foi apagado à mão.
    """
    return [t for t in tarefas if not (t.chave in registro and existe(t.arquivo(pasta_saida)))]


def carregar_registro(caminho: str) -> dict:
    if not os.path.exists(caminho):
        return {}
    with open(caminho, encoding="utf-8") as f:
        return json.load(f)


def salvar_registro(caminho: str, registro: dict) -> None:
    """Grava por arquivo temporário e troca, para uma interrupção não deixar JSON pela metade."""
    tmp = caminho + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(registro, f, ensure_ascii=False, indent=2, sort_keys=True)
    os.replace(tmp, caminho)


def comando_blender(blender: str, script: str, glb: str, saida: str, tarefa: Tarefa, largura: int, altura: int, amostras: int, semente: int) -> list[str]:
    azimute, elevacao = VISTAS[tarefa.vista]
    cmd = [
        blender, "-b", "--python", script, "--",
        "--glb", glb, "--out", saida,
        "--az", str(azimute), "--el", str(elevacao),
        "--width", str(largura), "--height", str(altura),
        "--samples", str(amostras), "--seed", str(semente),
    ]
    if tarefa.fundo == "transparente":
        cmd.append("--transparent")
    return cmd

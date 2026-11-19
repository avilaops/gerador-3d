"""Testes da lógica pura (sem Blender). Rodar na raiz do repositório:

    python -I -m unittest discover -s scripts/render-offline -p "test_*.py"
"""
import math
import os
import tempfile
import unittest

import planejar as p
import render


def caixa(tx=1.0, ty=1.0, tz=1.0, centro=(0.0, 0.0, 0.5)):
    return p.Caixa(
        (centro[0] - tx / 2, centro[1] - ty / 2, centro[2] - tz / 2),
        (centro[0] + tx / 2, centro[1] + ty / 2, centro[2] + tz / 2),
    )


class Enquadramento(unittest.TestCase):
    def extremos(self, c, largura, altura, az, el, d):
        """Maior |x|/tan e |y|/tan dos cantos, vistos da câmera a distância d: 1.0 = encosta na borda."""
        th, tv = p.meia_tangente(50, largura, altura)
        pior_x = max(abs(x) / ((d - w) * th) for x, y, w in p.projetar_cantos(c, az, el))
        pior_y = max(abs(y) / ((d - w) * tv) for x, y, w in p.projetar_cantos(c, az, el))
        return pior_x, pior_y

    def test_todos_os_cantos_cabem_e_o_maior_encosta_na_folga(self):
        c = caixa(1.2, 0.9, 1.5)
        for largura, altura in ((1024, 768), (768, 1024), (1000, 1000)):
            for az, el in p.VISTAS.values():
                d = p.distancia_camera(c, 50, largura, altura, az, el, folga=1.1)
                pior = max(self.extremos(c, largura, altura, az, el, d))
                self.assertAlmostEqual(pior, 1 / 1.1, places=6)

    def test_e_mais_justo_que_a_esfera(self):
        c = caixa(1.5, 1.0, 2.3)
        _, tv = p.meia_tangente(50, 1024, 768)  # lado limitante em paisagem
        esfera = (c.diagonal / 2) / math.sin(math.atan(tv))  # esfera que envolve a caixa, sem folga
        self.assertLess(p.distancia_camera(c, 50, 1024, 768, 35, 18, folga=1.0), esfera)

    def test_retrato_e_paisagem_nao_dao_o_mesmo(self):
        c = caixa(1.5, 0.6, 1.0)
        self.assertNotAlmostEqual(p.distancia_camera(c, 50, 1024, 768, 0, 8), p.distancia_camera(c, 50, 768, 1024, 0, 8))

    def test_folga_menor_que_um_e_recusada(self):
        with self.assertRaises(ValueError):
            p.distancia_camera(caixa(), 50, 1024, 768, 0, 0, folga=0.9)

    def test_dimensao_invalida(self):
        with self.assertRaises(ValueError):
            p.meia_tangente(50, 0, 768)

    def test_lente_85_para_peca_pequena_e_50_para_maquina(self):
        self.assertEqual(p.lente_para(caixa(0.5, 0.5, 0.5)), 85.0)
        self.assertEqual(p.lente_para(caixa(1.5, 1.0, 2.3)), 50.0)


class PosicaoDaCamera(unittest.TestCase):
    def test_azimute_zero_olha_de_frente_em_menos_y(self):
        x, y, z = p.posicao_camera((0, 0, 0.5), 3.0, 0, 0)
        self.assertAlmostEqual(x, 0, places=9)
        self.assertAlmostEqual(y, -3.0, places=9)
        self.assertAlmostEqual(z, 0.5, places=9)

    def test_azimute_90_vai_para_a_direita_do_modelo(self):
        x, y, _ = p.posicao_camera((0, 0, 0), 3.0, 90, 0)
        self.assertAlmostEqual(x, 3.0, places=9)
        self.assertAlmostEqual(y, 0.0, places=9)

    def test_a_distancia_ao_centro_e_a_pedida_em_qualquer_vista(self):
        centro = (0.2, -0.1, 0.8)
        for az, el in p.VISTAS.values():
            pos = p.posicao_camera(centro, 2.5, az, el)
            self.assertAlmostEqual(math.dist(pos, centro), 2.5, places=9)

    def test_elevacao_sobe_a_camera(self):
        self.assertGreater(p.posicao_camera((0, 0, 0), 2, 0, 30)[2], p.posicao_camera((0, 0, 0), 2, 0, 5)[2])


class Luzes(unittest.TestCase):
    def test_energia_cresce_com_o_quadrado_do_tamanho(self):
        pequeno = {l.nome: l.energia for l in p.layout_luzes(caixa(2, 2, 2), 0)}
        grande = {l.nome: l.energia for l in p.layout_luzes(caixa(4, 4, 4), 0)}
        for nome in pequeno:
            self.assertAlmostEqual(grande[nome] / pequeno[nome], 4.0, places=6)

    def test_luzes_giram_com_a_camera(self):
        c = caixa(2, 2, 2, centro=(0, 0, 1))
        antes = {l.nome: l.posicao for l in p.layout_luzes(c, 0)}
        depois = {l.nome: l.posicao for l in p.layout_luzes(c, 90)}
        for nome in antes:
            # mesma distância ao centro no plano, mesma altura
            self.assertAlmostEqual(math.hypot(antes[nome][0], antes[nome][1]), math.hypot(depois[nome][0], depois[nome][1]), places=9)
            self.assertAlmostEqual(antes[nome][2], depois[nome][2], places=9)
        self.assertNotAlmostEqual(antes["principal"][0], depois["principal"][0])

    def test_ha_cartoes_dos_dois_lados(self):
        nomes = [n for n, *_ in p.cartoes_escuros(caixa(), 0)]
        self.assertEqual(sorted(nomes), ["cartao_direito", "cartao_esquerdo"])


class SelecaoERetomada(unittest.TestCase):
    CODIGOS = ["LD-WH013", "LD-WH021", "LD-WH022", "LD-A001"]

    def test_sem_filtro_devolve_todos_ordenados(self):
        self.assertEqual(p.selecionar(self.CODIGOS, None), sorted(self.CODIGOS))

    def test_curinga_e_caixa_baixa(self):
        self.assertEqual(p.selecionar(self.CODIGOS, ["ld-wh02*"]), ["LD-WH021", "LD-WH022"])

    def test_varios_filtros_e_codigo_exato(self):
        self.assertEqual(p.selecionar(self.CODIGOS, ["LD-A001", "LD-WH013"]), ["LD-A001", "LD-WH013"])

    def test_filtro_sem_resultado(self):
        self.assertEqual(p.selecionar(self.CODIGOS, ["XX*"]), [])

    def test_vista_ou_fundo_desconhecido(self):
        with self.assertRaises(ValueError):
            p.montar_tarefas(["A"], ["diagonal"], ["opaco"])
        with self.assertRaises(ValueError):
            p.montar_tarefas(["A"], ["frente"], ["vermelho"])

    def test_produto_cartesiano(self):
        t = p.montar_tarefas(["A", "B"], ["frente", "lado"], ["opaco", "transparente"])
        self.assertEqual(len(t), 8)
        self.assertEqual(len({x.chave for x in t}), 8)

    def test_so_pula_o_que_esta_no_registro_e_no_disco(self):
        tarefas = p.montar_tarefas(["A", "B", "C"], ["frente"], ["opaco"])
        a, b, c = tarefas
        registro = {a.chave: {}, b.chave: {}}
        no_disco = {a.arquivo("/s")}  # B está no registro mas o arquivo sumiu; C nunca foi feito
        faltam = p.pendentes(tarefas, "/s", registro, existe=lambda f: f in no_disco)
        self.assertEqual([t.codigo for t in faltam], ["B", "C"])

    def test_arquivo_sem_registro_conta_como_pendente(self):
        (t,) = p.montar_tarefas(["A"], ["frente"], ["opaco"])
        self.assertEqual(p.pendentes([t], "/s", {}, existe=lambda f: True), [t])


class Registro(unittest.TestCase):
    def test_ida_e_volta_e_sem_temporario(self):
        with tempfile.TemporaryDirectory() as d:
            caminho = os.path.join(d, "registro.json")
            self.assertEqual(p.carregar_registro(caminho), {})
            p.salvar_registro(caminho, {"A/frente/opaco": {"segundos": 1.5, "semente": 7}})
            self.assertEqual(p.carregar_registro(caminho)["A/frente/opaco"]["segundos"], 1.5)
            self.assertFalse(os.path.exists(caminho + ".tmp"))


class LinhaDeComando(unittest.TestCase):
    def test_opaco_nao_leva_transparente(self):
        (t,) = p.montar_tarefas(["A"], ["lado"], ["opaco"])
        cmd = p.comando_blender("blender", "cena.py", "m.glb", "/o.png", t, 800, 600, 32, 3)
        self.assertNotIn("--transparent", cmd)
        self.assertEqual(cmd[cmd.index("--az") + 1], "90.0")
        self.assertEqual(cmd[cmd.index("--seed") + 1], "3")
        self.assertEqual(cmd[:4], ["blender", "-b", "--python", "cena.py"])

    def test_transparente_leva_a_opcao(self):
        (t,) = p.montar_tarefas(["A"], ["frente"], ["transparente"])
        self.assertIn("--transparent", p.comando_blender("b", "c.py", "m.glb", "/o.png", t, 8, 8, 1, 1))


class Lote(unittest.TestCase):
    def test_simular_nao_chama_o_blender_e_pede_caminho_absoluto(self):
        with tempfile.TemporaryDirectory() as d:
            modelos = os.path.join(d, "m")
            os.makedirs(os.path.join(modelos, "X1"))
            open(os.path.join(modelos, "X1", "model.glb"), "wb").close()
            self.assertEqual(render.main(["--modelos", modelos, "--saida", os.path.join(d, "s"), "--simular"]), 0)
            self.assertEqual(render.main(["--modelos", modelos, "--saida", "relativo", "--simular"]), 2)
            self.assertEqual(render.main(["--modelos", modelos, "--saida", os.path.join(d, "s"), "--codigos", "ZZ*", "--simular"]), 2)


if __name__ == "__main__":
    unittest.main()

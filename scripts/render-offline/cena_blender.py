"""Cena de estúdio e render de um GLB. Roda DENTRO do Blender, sem tela:

    blender -b --python cena_blender.py -- --glb model.glb --out C:/abs/saida.png \
        [--az 35] [--el 18] [--samples 64] [--width 1024] [--height 768] [--transparent] [--seed 7]

A saída precisa ser caminho absoluto (relativo vai parar na raiz do disco). Quem escolhe vista,
lente, luzes e cartões é `planejar.py`, que é testado sem Blender.
"""
import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import planejar  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--glb", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--az", type=float, default=35.0)
ap.add_argument("--el", type=float, default=18.0)
ap.add_argument("--samples", type=int, default=64)
ap.add_argument("--width", type=int, default=1024)
ap.add_argument("--height", type=int, default=768)
ap.add_argument("--seed", type=int, default=7)
ap.add_argument("--transparent", action="store_true")
args = ap.parse_args(argv)
if not os.path.isabs(args.out):
    sys.exit("--out precisa ser caminho absoluto")

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=args.glb)

meshes = [o for o in scene.objects if o.type == "MESH" and o.name != "contact_shadow"]
corners = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
caixa = planejar.Caixa(
    (min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)),
    (max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)),
)
centro = Vector(caixa.centro)
r = max(caixa.diagonal, 1.0)


def material(nome, cor, rugosidade):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*cor, 1)
    bsdf.inputs["Roughness"].default_value = rugosidade
    return m


def apontar(obj, alvo):
    obj.rotation_euler = (Vector(alvo) - obj.location).to_track_quat("-Z", "Y").to_euler()


# Piso: recebe a sombra; no fundo transparente vira "shadow catcher".
bpy.ops.mesh.primitive_plane_add(size=40, location=(centro.x, centro.y, caixa.lo[2]))
piso = bpy.context.object
piso.name = "piso"
piso.data.materials.append(material("piso", (0.82, 0.82, 0.8), 0.9))
piso.is_shadow_catcher = args.transparent

# Fundo infinito (curva): só no fundo opaco; gira junto com a câmera para ficar sempre atrás do modelo.
if not args.transparent:
    raio_curva, largura_curva, recuo = 0.9 * r, 8 * r, 1.4 * r
    passos = 16
    # Perfil (y para o fundo, z para cima): piso -> curva de 90° -> parede.
    prof = [(-4 * r, 0.0), (recuo, 0.0)]
    for i in range(1, passos + 1):
        a = (math.pi / 2) * i / passos
        prof.append((recuo + raio_curva * math.sin(a), raio_curva - raio_curva * math.cos(a)))
    prof.append((prof[-1][0], prof[-1][1] + 3 * r))
    mesh = bpy.data.meshes.new("fundo")
    vs, fs = [], []
    for k, (y, z) in enumerate(prof):
        vs += [(-largura_curva / 2, y, z), (largura_curva / 2, y, z)]
        if k:
            b = 2 * (k - 1)
            fs.append((b, b + 1, b + 3, b + 2))
    mesh.from_pydata(vs, [], fs)
    mesh.update()
    for p in mesh.polygons:
        p.use_smooth = True
    fundo = bpy.data.objects.new("fundo", mesh)
    scene.collection.objects.link(fundo)
    fundo.data.materials.append(material("fundo", (0.86, 0.86, 0.85), 1.0))
    fundo.location = (centro.x, centro.y, caixa.lo[2])
    fundo.rotation_euler = (0, 0, math.radians(args.az))
    piso.hide_render = True  # a curva já tem o piso, na mesma altura.

# Ambiente: fundo claro e fraco; a luz vem das luzes de área.
mundo = bpy.data.worlds.new("estudio")
mundo.use_nodes = True
bg = mundo.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.9, 0.9, 0.88, 1)
bg.inputs["Strength"].default_value = 0.08
scene.world = mundo

for l in planejar.layout_luzes(caixa, args.az):
    dados = bpy.data.lights.new(l.nome, "AREA")
    dados.energy = l.energia
    dados.shape = "RECTANGLE"
    dados.size, dados.size_y = l.tamanho
    obj = bpy.data.objects.new(l.nome, dados)
    scene.collection.objects.link(obj)
    obj.location = l.posicao
    apontar(obj, centro)
    obj.visible_camera = False  # a luz não pode aparecer no quadro

# Cartões escuros: pretos foscos, fora do quadro, só refletem.
preto = material("cartao", (0.01, 0.01, 0.01), 0.6)
for nome, pos, giro, (w, h) in planejar.cartoes_escuros(caixa, args.az):
    bpy.ops.mesh.primitive_plane_add(size=1, location=pos)
    c = bpy.context.object
    c.name = nome
    c.scale = (w, h, 1)
    c.rotation_euler = (math.radians(90), 0, math.radians(giro))
    c.data.materials.append(preto)
    c.visible_camera = False
    c.visible_shadow = False

# Câmera.
lente = planejar.lente_para(caixa)
cam_dados = bpy.data.cameras.new("camera")
cam_dados.lens = lente
cam = bpy.data.objects.new("camera", cam_dados)
scene.collection.objects.link(cam)
dist = planejar.distancia_camera(caixa, lente, args.width, args.height)
cam.location = planejar.posicao_camera(caixa.centro, dist, args.az, args.el)
alvo = bpy.data.objects.new("alvo", None)
alvo.location = centro
scene.collection.objects.link(alvo)
trilho = cam.constraints.new("TRACK_TO")
trilho.target = alvo
trilho.track_axis = "TRACK_NEGATIVE_Z"
trilho.up_axis = "UP_Y"
scene.camera = cam

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = args.samples
scene.cycles.use_denoising = True
scene.cycles.seed = args.seed
scene.cycles.use_animated_seed = False
scene.render.resolution_x = args.width
scene.render.resolution_y = args.height
scene.render.resolution_percentage = 100
scene.render.film_transparent = args.transparent
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA" if args.transparent else "RGB"
scene.view_settings.view_transform = "AgX"
scene.render.filepath = args.out
bpy.ops.render.render(write_still=True)
print("OK", args.out)

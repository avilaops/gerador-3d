"""Teste de viabilidade do render offline: GLB -> PNG com Blender sem tela.

Uso:
    blender -b --python spike_render.py -- --glb model.glb --out saida.png \
        [--az 35] [--el 18] [--samples 64] [--width 1024] [--height 768] [--transparent]

Convenção do gerador: metros, Y para cima, frente em +Z. O importador glTF do Blender
converte para Z para cima, então a frente do modelo fica em -Y no mundo do Blender.
"""
import argparse
import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--glb", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--az", type=float, default=35.0)
ap.add_argument("--el", type=float, default=18.0)
ap.add_argument("--samples", type=int, default=64)
ap.add_argument("--width", type=int, default=1024)
ap.add_argument("--height", type=int, default=768)
ap.add_argument("--transparent", action="store_true")
args = ap.parse_args(argv)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=args.glb)

meshes = [o for o in scene.objects if o.type == "MESH"]
corners = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
hi = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
center = (lo + hi) / 2
size = hi - lo
diag = size.length

# Piso: recebe a sombra; no modo transparente vira "shadow catcher".
bpy.ops.mesh.primitive_plane_add(size=40, location=(center.x, center.y, lo.z))
floor = bpy.context.object
floor.name = "piso"
fmat = bpy.data.materials.new("piso")
fmat.use_nodes = True
fmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.82, 0.82, 0.8, 1)
fmat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
floor.data.materials.append(fmat)
floor.is_shadow_catcher = args.transparent

# Ambiente: fundo neutro claro; ilumina o conjunto com luz difusa.
world = bpy.data.worlds.new("estudio")
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.9, 0.9, 0.88, 1)
bg.inputs["Strength"].default_value = 0.08
scene.world = world

def area(name, loc, energy, size_m):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.size = size_m
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = loc
    direction = center - Vector(loc)
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

r = max(diag, 1.0)
area("principal", (center.x + 1.6 * r, center.y - 1.6 * r, center.z + 1.8 * r), 170 * r * r, 2.2 * r)
area("preenchimento", (center.x - 2.0 * r, center.y - 1.0 * r, center.z + 0.8 * r), 40 * r * r, 2.5 * r)
area("contraluz", (center.x - 0.4 * r, center.y + 2.0 * r, center.z + 1.6 * r), 90 * r * r, 1.5 * r)

# Câmera: azimute 0 = de frente (frente do modelo em -Y no Blender).
cam_data = bpy.data.cameras.new("camera")
cam_data.lens = 50
cam = bpy.data.objects.new("camera", cam_data)
scene.collection.objects.link(cam)
fov = 2 * math.atan(18 / cam_data.lens)
dist = (diag / 2) / math.tan(fov / 2) * 1.25
az, el = math.radians(args.az), math.radians(args.el)
cam.location = center + Vector((
    dist * math.cos(el) * math.sin(az),
    -dist * math.cos(el) * math.cos(az),
    dist * math.sin(el),
))
target = bpy.data.objects.new("alvo", None)
target.location = center
scene.collection.objects.link(target)
track = cam.constraints.new("TRACK_TO")
track.target = target
track.track_axis = "TRACK_NEGATIVE_Z"
track.up_axis = "UP_Y"
scene.camera = cam

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = args.samples
scene.cycles.use_denoising = True
scene.cycles.seed = 7
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

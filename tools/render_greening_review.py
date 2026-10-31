"""Headless Blender 3D multi-angle renderer for Island Greening & Harbor verification."""
import sys
import os
import json
import math

try:
    import bpy
    import bmesh
    from mathutils import Vector, Euler
except ImportError:
    print("Error: bpy module must be run inside Blender: blender --background --python tools/render_greening_review.py")
    sys.exit(1)

ROOT_DIR = os.getcwd()
DATA_PATH = os.path.join(ROOT_DIR, "art/greening-and-harbor/greening_scene_data.json")
RENDER_DIR = os.path.join(ROOT_DIR, "art/greening-and-harbor/render")
os.makedirs(RENDER_DIR, exist_ok=True)

with open(DATA_PATH, "r", encoding="utf-8") as f:
    scene_data = json.load(f)

# Clear existing scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 16
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'

# Material factory
def create_mat(name, color, roughness=0.8, metalness=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color
        bsdf.inputs['Roughness'].default_value = roughness
        if 'Metallic' in bsdf.inputs:
            bsdf.inputs['Metallic'].default_value = metalness
    return mat

mat_grass = create_mat("Grass", (0.28, 0.46, 0.22, 1.0), roughness=0.92)
mat_water = create_mat("Water", (0.08, 0.42, 0.58, 0.8), roughness=0.15)
mat_sand = create_mat("Sand", (0.84, 0.76, 0.56, 1.0), roughness=0.95)
mat_path = create_mat("Path", (0.82, 0.78, 0.70, 1.0), roughness=0.75)
mat_paving = create_mat("Paving", (0.72, 0.70, 0.65, 1.0), roughness=0.7)
mat_stone = create_mat("Stone", (0.58, 0.60, 0.56, 1.0), roughness=0.8)
mat_wood = create_mat("Wood", (0.56, 0.36, 0.22, 1.0), roughness=0.7)
mat_iron = create_mat("Iron", (0.24, 0.28, 0.30, 1.0), roughness=0.4, metalness=0.6)
mat_apple_crown = create_mat("AppleCrown", (0.35, 0.54, 0.24, 1.0), roughness=0.85)
mat_willow_crown = create_mat("WillowCrown", (0.45, 0.58, 0.35, 1.0), roughness=0.88)
mat_linden_crown = create_mat("LindenCrown", (0.25, 0.44, 0.20, 1.0), roughness=0.84)
mat_birch_crown = create_mat("BirchCrown", (0.55, 0.62, 0.28, 1.0), roughness=0.82)
mat_birch_trunk = create_mat("BirchTrunk", (0.88, 0.86, 0.80, 1.0), roughness=0.85)
mat_fruit = create_mat("Fruit", (0.88, 0.42, 0.18, 1.0), roughness=0.6)
mat_blossom_pink = create_mat("BlossomPink", (0.85, 0.38, 0.45, 1.0), roughness=0.7)
mat_blossom_gold = create_mat("BlossomGold", (0.92, 0.72, 0.25, 1.0), roughness=0.7)
mat_heather = create_mat("Heather", (0.58, 0.38, 0.65, 1.0), roughness=0.85)
mat_soil = create_mat("Soil", (0.28, 0.20, 0.14, 1.0), roughness=0.98)
mat_building = create_mat("BuildingWall", (0.82, 0.76, 0.66, 1.0), roughness=0.85)
mat_roof = create_mat("BuildingRoof", (0.32, 0.44, 0.42, 1.0), roughness=0.7)
mat_boat = create_mat("BoatHull", (0.20, 0.50, 0.65, 1.0), roughness=0.4)
mat_rope = create_mat("MooringRope", (0.75, 0.66, 0.48, 1.0), roughness=0.9)
mat_lighthouse_red = create_mat("LighthouseRed", (0.85, 0.22, 0.18, 1.0), roughness=0.6)
mat_lighthouse_white = create_mat("LighthouseWhite", (0.95, 0.95, 0.92, 1.0), roughness=0.6)

# 1. Build Continuous Terrain Mesh
grid = scene_data["elevationGrid"]
rows = len(grid)
cols = len(grid[0])

mesh = bpy.data.meshes.new("TerrainMesh")
obj_terrain = bpy.data.objects.new("Terrain", mesh)
bpy.context.collection.objects.link(obj_terrain)

bm = bmesh.new()
verts = []
for rz, row in enumerate(grid):
    row_verts = []
    for rx, pt in enumerate(row):
        v = bm.verts.new((pt["x"], pt["z"], pt["y"]))
        row_verts.append(v)
    verts.append(row_verts)

for rz in range(rows - 1):
    for rx in range(cols - 1):
        v1 = verts[rz][rx]
        v2 = verts[rz][rx + 1]
        v3 = verts[rz + 1][rx + 1]
        v4 = verts[rz + 1][rx]
        bm.faces.new((v1, v2, v3, v4))

bm.to_mesh(mesh)
bm.free()
mesh.materials.append(mat_grass)

# 2. Build Ocean Floor
bpy.ops.mesh.primitive_plane_add(size=300, location=(40, 40, -0.15))
ocean = bpy.context.active_object
ocean.name = "Ocean"
ocean.data.materials.append(mat_water)

# 3. Build Curved Garden Walks
for w_idx, walk in enumerate(scene_data["walks"]):
    points = walk["points"]
    w_width = walk["width"]
    w_mesh = bpy.data.meshes.new(f"WalkMesh_{w_idx}")
    w_obj = bpy.data.objects.new(f"Walk_{w_idx}", w_mesh)
    bpy.context.collection.objects.link(w_obj)
    
    w_bm = bmesh.new()
    left_verts = []
    right_verts = []
    
    for i in range(len(points) - 1):
        p1 = points[i]
        p2 = points[i + 1]
        dx = p2["x"] - p1["x"]
        dz = p2["z"] - p1["z"]
        length = math.hypot(dx, dz)
        if length == 0:
            continue
        nx = -dz / length * (w_width / 2)
        nz = dx / length * (w_width / 2)
        
        y = p1["y"] + 0.03
        v_l = w_bm.verts.new((p1["x"] + nx, p1["z"] + nz, y))
        v_r = w_bm.verts.new((p1["x"] - nx, p1["z"] - nz, y))
        left_verts.append(v_l)
        right_verts.append(v_r)
        
        if i == len(points) - 2:
            y_end = p2["y"] + 0.03
            left_verts.append(w_bm.verts.new((p2["x"] + nx, p2["z"] + nz, y_end)))
            right_verts.append(w_bm.verts.new((p2["x"] - nx, p2["z"] - nz, y_end)))
            
    for i in range(len(left_verts) - 1):
        w_bm.faces.new((left_verts[i], right_verts[i], right_verts[i + 1], left_verts[i + 1]))
        
    w_bm.to_mesh(w_mesh)
    w_bm.free()
    w_mesh.materials.append(mat_path)

# 4. Build Paved Plazas
for p_idx, plaza in enumerate(scene_data["restingPlazas"]):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24,
        radius=plaza["radius"],
        depth=0.06,
        location=(plaza["x"], plaza["z"], plaza["y"] + 0.03)
    )
    p_obj = bpy.context.active_object
    p_obj.name = f"Plaza_{p_idx}"
    p_obj.data.materials.append(mat_paving)

# 5. Build Retaining Walls
for wall in scene_data["retainingWalls"]:
    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=(wall["x"], wall["z"], wall["y"] + 0.28)
    )
    w_obj = bpy.context.active_object
    w_obj.scale = (wall["width"], wall["depth"], 0.55)
    w_obj.rotation_euler.z = -wall["rotation"]
    w_obj.data.materials.append(mat_stone)

# 6. Build Distinct Trees
for tree in scene_data["distinctTrees"]:
    tx = tree["x"]
    tz = tree["z"]
    ty = tree["y"]
    s = tree["scale"]
    k = tree["kind"]
    
    # Trunk
    t_mat = mat_birch_trunk if k == 'birch' else mat_wood
    t_radius = 0.08 * s if k == 'birch' else 0.12 * s
    t_height = 2.4 * s if k == 'birch' else 1.8 * s
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8,
        radius=t_radius,
        depth=t_height,
        location=(tx, tz, ty + t_height / 2)
    )
    t_obj = bpy.context.active_object
    t_obj.data.materials.append(t_mat)
    
    # Crown
    c_mat = (
        mat_apple_crown if k == 'apple' else
        mat_willow_crown if k == 'willow' else
        mat_linden_crown if k == 'linden' else
        mat_birch_crown
    )
    c_rad = (
        1.1 * s if k == 'apple' else
        1.3 * s if k == 'willow' else
        1.4 * s if k == 'linden' else
        0.85 * s
    )
    c_z_offset = (
        1.9 * s if k == 'apple' else
        2.2 * s if k == 'willow' else
        2.6 * s if k == 'linden' else
        2.5 * s
    )
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=1,
        radius=c_rad,
        location=(tx, tz, ty + c_z_offset)
    )
    c_obj = bpy.context.active_object
    c_obj.data.materials.append(c_mat)
    
    # Weeping willow skirts
    if k == 'willow':
        bpy.ops.mesh.primitive_cone_add(
            vertices=8,
            radius1=1.1 * s,
            radius2=0.3 * s,
            depth=1.2 * s,
            location=(tx, tz, ty + 1.5 * s)
        )
        skirt = bpy.context.active_object
        skirt.rotation_euler.x = math.pi
        skirt.data.materials.append(c_mat)
        
    # Apple tree fruit
    if k == 'apple':
        for f_idx in range(6):
            fa = f_idx * 1.05
            fr = 0.8 * s
            bpy.ops.mesh.primitive_ico_sphere_add(
                subdivisions=0,
                radius=0.1 * s,
                location=(tx + math.cos(fa) * fr, tz + math.sin(fa) * fr, ty + 1.7 * s)
            )
            f_obj = bpy.context.active_object
            f_obj.data.materials.append(mat_fruit)

# 7. Build Formed Flowerbeds
for bed in scene_data["flowerbeds"]:
    bx = bed["x"]
    bz = bed["z"]
    by = bed["y"]
    # Soil bed
    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=(bx, bz, by + 0.08)
    )
    b_soil = bpy.context.active_object
    b_soil.scale = (bed["width"], bed["depth"], 0.16)
    b_soil.rotation_euler.z = -bed["rotation"]
    b_soil.data.materials.append(mat_soil)
    
    # Curb stones
    if bed["hasCurbs"]:
        bpy.ops.mesh.primitive_cube_add(
            size=1,
            location=(bx, bz, by + 0.12)
        )
        b_curb = bpy.context.active_object
        b_curb.scale = (bed["width"] + 0.28, bed["depth"] + 0.28, 0.22)
        b_curb.rotation_euler.z = -bed["rotation"]
        b_curb.data.materials.append(mat_paving)
        
    # Floral surface
    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=(bx, bz, by + 0.24)
    )
    b_fl = bpy.context.active_object
    b_fl.scale = (bed["width"] * 0.9, bed["depth"] * 0.9, 0.1)
    b_fl.rotation_euler.z = -bed["rotation"]
    b_fl.data.materials.append(mat_blossom_pink if "pink" in bed["id"] or "Square" in bed["name"] else mat_heather)

# 8. Build Quay Water Stairs
st = scene_data["quayStairs"]
for s_idx in range(st["stepCount"]):
    t = (s_idx + 0.5) / st["stepCount"]
    s_z = st["z"] - st["depth"] / 2 + t * st["depth"]
    s_y = st["topElevation"] - t * (st["topElevation"] - st["bottomElevation"])
    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=(st["x"], s_z, s_y)
    )
    step = bpy.context.active_object
    step.scale = (st["width"], st["depth"] / st["stepCount"], 0.15)
    step.data.materials.append(mat_stone)

# Iron railings on quay stairs
for r_side in [-1, 1]:
    r_x = st["x"] + r_side * (st["width"] / 2 - 0.1)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6,
        radius=0.04,
        depth=st["depth"],
        location=(r_x, st["z"], (st["topElevation"] + st["bottomElevation"]) / 2 + 0.75)
    )
    rail = bpy.context.active_object
    rail.rotation_euler.x = math.atan2(st["topElevation"] - st["bottomElevation"], st["depth"]) - math.pi / 2
    rail.data.materials.append(mat_iron)

# 9. Build Breakwater Capstones
for cap in scene_data["breakwaterCaps"]:
    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=(cap["x"], cap["z"], cap["y"] + 0.12)
    )
    c_obj = bpy.context.active_object
    c_obj.scale = (cap["width"], cap["depth"], 0.24)
    c_obj.rotation_euler.z = -cap["rotation"]
    c_obj.data.materials.append(mat_paving)

# 10. Build Pier & Lighthouse
lh = scene_data["lighthouse"]
bpy.ops.mesh.primitive_cylinder_add(
    vertices=16,
    radius=lh["width"] / 2,
    depth=7.5,
    location=(lh["x"], lh["z"], 3.75)
)
lh_obj = bpy.context.active_object
lh_obj.data.materials.append(mat_lighthouse_white)

for d in scene_data["pierDecks"]:
    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=(d["x"], d["z"], 0.1)
    )
    deck = bpy.context.active_object
    deck.scale = (d["width"], d["depth"], 0.22)
    deck.data.materials.append(mat_wood)

# 11. Build Mooring Ropes & Boats
for boat in scene_data["boats"]:
    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=(boat["x"], boat["z"], 0.2)
    )
    b_obj = bpy.context.active_object
    b_obj.scale = (1.8, 4.2, 0.7)
    b_obj.rotation_euler.z = -boat["rotation"]
    b_obj.data.materials.append(mat_boat)

for rope in scene_data["mooringRopes"]:
    sx, sy, sz = rope["start"]["x"], rope["start"]["y"], rope["start"]["z"]
    ex, ey, ez = rope["end"]["x"], rope["end"]["y"], rope["end"]["z"]
    mx, my, mz = (sx + ex) / 2, (sy + ey) / 2 - rope["sag"], (sz + ez) / 2
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6,
        radius=0.03,
        depth=math.hypot(ex - sx, ez - sz),
        location=(mx, mz, my)
    )
    r_obj = bpy.context.active_object
    r_obj.rotation_euler.z = math.atan2(ex - sx, ez - sz)
    r_obj.data.materials.append(mat_rope)

# 12. Build Harbor Props (Crates & Barrels)
for prop in scene_data["harborProps"]:
    px = prop["x"]
    pz = prop["z"]
    py = prop["y"]
    if prop["kind"] == 'crate_stack':
        bpy.ops.mesh.primitive_cube_add(
            size=1,
            location=(px, pz, py + 0.35)
        )
        c = bpy.context.active_object
        c.scale = (prop["width"], prop["depth"], 0.7)
        c.data.materials.append(mat_wood)
    elif prop["kind"] == 'barrel_group':
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=10,
            radius=prop["width"] / 2,
            depth=0.7,
            location=(px, pz, py + 0.35)
        )
        b = bpy.context.active_object
        b.data.materials.append(mat_wood)

# 13. Build Front Garden Fences & Town Buildings
for garden in scene_data["frontGardens"]:
    for seg in garden["fenceSegments"]:
        bpy.ops.mesh.primitive_cube_add(
            size=1,
            location=(seg["x"], seg["z"], 0.42)
        )
        f_obj = bpy.context.active_object
        f_obj.scale = (seg["width"], seg["depth"], 0.84)
        f_obj.rotation_euler.z = -seg["rotation"]
        f_obj.data.materials.append(mat_paving)

for b in scene_data["buildings"]:
    bh = b["floors"] * 2.8
    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=(b["x"], b["z"], bh / 2)
    )
    b_obj = bpy.context.active_object
    b_obj.scale = (b["width"], b["depth"], bh)
    b_obj.data.materials.append(mat_building)
    
    # Roof
    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=(b["x"], b["z"], bh + 0.3)
    )
    r_obj = bpy.context.active_object
    r_obj.scale = (b["width"] + 0.4, b["depth"] + 0.4, 0.4)
    r_obj.data.materials.append(mat_roof)

# 14. Setup Sun Light & Ambient World
if scene.world is None:
    scene.world = bpy.data.worlds.new("World")
world = scene.world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
if bg:
    bg.inputs['Color'].default_value = (0.75, 0.85, 0.92, 1.0)
    bg.inputs['Strength'].default_value = 0.7

sun_data = bpy.data.lights.new(name="SunLight", type='SUN')
sun_data.energy = 3.2
sun_data.color = (1.0, 0.95, 0.88)
sun_obj = bpy.data.objects.new("Sun", sun_data)
bpy.context.collection.objects.link(sun_obj)
sun_obj.location = (20, -30, 60)
sun_obj.rotation_euler = Euler((math.radians(52), math.radians(22), math.radians(-38)), 'XYZ')

# 15. Camera Configuration & Multi-Angle Review Renders
camera_data = bpy.data.cameras.new(name="ReviewCamera")
camera_data.type = 'ORTHO'
cam_obj = bpy.data.objects.new("Camera", camera_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj

VIEWS = [
    {
        "name": "overview-greening",
        "target": (46, 38, 0),
        "offset": (35, 45, 38),
        "scale": 76.0,
    },
    {
        "name": "harbor-quay-steps",
        "target": (58, 78, 0),
        "offset": (14, 18, 16),
        "scale": 22.0,
    },
    {
        "name": "apple-orchard-gardens",
        "target": (8, 56, 0),
        "offset": (12, 15, 14),
        "scale": 16.0,
    },
    {
        "name": "willow-pond-banks",
        "target": (88, 58, 0),
        "offset": (15, 18, 16),
        "scale": 20.0,
    },
    {
        "name": "mill-hillside-flora",
        "target": (86, 24, 0.7),
        "offset": (15, 18, 16),
        "scale": 22.0,
    },
    {
        "name": "town-square-facades",
        "target": (40, 56, 0),
        "offset": (14, 16, 15),
        "scale": 18.0,
    },
]

for v in VIEWS:
    tgt = v["target"]
    off = v["offset"]
    # In Blender: X = x, Y = z, Z = y (elevation)
    cam_x = tgt[0] + off[0]
    cam_y = tgt[1] + off[1]
    cam_z = tgt[2] + off[2]
    
    cam_obj.location = (cam_x, cam_y, cam_z)
    camera_data.ortho_scale = v["scale"]
    
    # Track towards target
    dx = tgt[0] - cam_x
    dy = tgt[1] - cam_y
    dz = tgt[2] - cam_z
    dist_xy = math.hypot(dx, dy)
    
    pitch = math.atan2(dist_xy, -dz)
    yaw = math.atan2(-dx, dy)
    cam_obj.rotation_euler = Euler((pitch, 0, yaw), 'ZXY')
    
    out_file = os.path.join(RENDER_DIR, f"{v['name']}.png")
    scene.render.filepath = out_file
    print(f"Rendering view: {v['name']} -> {out_file}...")
    bpy.ops.render.render(write_still=True)

print("ALL_VIEWS_RENDERED_SUCCESSFULLY")

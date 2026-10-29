import sys
import os
import json
import math

try:
    import bpy
    import bmesh
    from mathutils import Vector, Euler
except ImportError:
    print("Error: bpy module must be run inside Blender: blender --background --python tools/render_terrain_review.py")
    sys.exit(1)

# Ensure output directory exists
ROOT_DIR = os.getcwd()
DATA_PATH = os.path.join(ROOT_DIR, "art/terrain-and-routes/island_scene_data.json")
RENDER_DIR = os.path.join(ROOT_DIR, "art/terrain-and-routes/render")
os.makedirs(RENDER_DIR, exist_ok=True)

with open(DATA_PATH, "r", encoding="utf-8") as f:
    scene_data = json.load(f)

# Clear existing objects in scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'

# Materials
def create_mat(name, color, roughness=0.8):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color
        bsdf.inputs['Roughness'].default_value = roughness
    return mat

mat_grass = create_mat("Grass", (0.22, 0.42, 0.20, 1.0), roughness=0.9)
mat_terrace = create_mat("TerraceGrass", (0.28, 0.48, 0.24, 1.0), roughness=0.9)
mat_mill_plateau = create_mat("MillGrass", (0.35, 0.52, 0.26, 1.0), roughness=0.85)
mat_sand = create_mat("Sand", (0.85, 0.78, 0.55, 1.0), roughness=0.95)
mat_path = create_mat("Path", (0.82, 0.80, 0.76, 1.0), roughness=0.7)
mat_wall = create_mat("Wall", (0.25, 0.28, 0.32, 1.0), roughness=0.6)
mat_water = create_mat("Water", (0.05, 0.45, 0.65, 0.8), roughness=0.1)
mat_wood = create_mat("Wood", (0.55, 0.32, 0.18, 1.0), roughness=0.6)
mat_mill = create_mat("Mill", (0.65, 0.35, 0.15, 1.0), roughness=0.7)
mat_rock = create_mat("Rock", (0.35, 0.38, 0.42, 1.0), roughness=0.85)
mat_foliage = create_mat("Foliage", (0.12, 0.48, 0.16, 1.0), roughness=0.8)

# 1. Build Terrain Mesh
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
        # In Blender: X = x, Y = z, Z = y (elevation)
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

# 3. Build Curved Path Ribbons
for w_idx, walk in enumerate(scene_data["walks"]):
    points = walk["points"]
    w_width = walk["width"]
    w_mesh = bpy.data.meshes.new(f"WalkMesh_{w_idx}")
    w_obj = bpy.data.objects.new(f"Walk_{w_idx}", w_mesh)
    bpy.context.collection.objects.link(w_obj)
    
    w_bm = bmesh.new()
    left_verts = []
    right_verts = []
    
    n_pts = len(points)
    for i in range(n_pts):
        p = points[i]
        p_next = points[(i + 1) % n_pts] if i < n_pts - 1 else points[i]
        p_prev = points[i - 1] if i > 0 else points[0]
        
        dx = p_next["x"] - p_prev["x"]
        dz = p_next["z"] - p_prev["z"]
        length = math.hypot(dx, dz)
        if length < 1e-4:
            nx, nz = 1, 0
        else:
            nx = -dz / length
            nz = dx / length
            
        half_w = w_width / 2.0
        # Elevate slightly above terrain (+0.035m) to ensure pristine visibility without z-fighting
        alt = p["y"] + 0.035
        v_l = w_bm.verts.new((p["x"] + nx * half_w, p["z"] + nz * half_w, alt))
        v_r = w_bm.verts.new((p["x"] - nx * half_w, p["z"] - nz * half_w, alt))
        left_verts.append(v_l)
        right_verts.append(v_r)
        
    count = n_pts if walk["closed"] else n_pts - 1
    for i in range(count):
        next_i = (i + 1) % n_pts
        v1 = left_verts[i]
        v2 = right_verts[i]
        v3 = right_verts[next_i]
        v4 = left_verts[next_i]
        w_bm.faces.new((v1, v2, v3, v4))
        
    w_bm.to_mesh(w_mesh)
    w_bm.free()
    w_mesh.materials.append(mat_path)

# 4. Build Retaining Walls
for i, wall in enumerate(scene_data["retainingWalls"]):
    # Wall box: width, depth, height
    # In Blender coordinate frame: X = wall.width, Y = wall.depth, Z = wall.height
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(wall["x"], wall["z"], wall["y"] + wall["height"] / 2.0)
    )
    w_box = bpy.context.active_object
    w_box.name = f"RetainingWall_{i}"
    w_box.scale = (wall["width"], wall["depth"], wall["height"])
    w_box.rotation_euler = Euler((0, 0, -wall["rotation"]), 'XYZ')
    w_box.data.materials.append(mat_wall)

# 5. Build Resting Plazas (Disks) & Benches
for i, area in enumerate(scene_data["restingAreas"]):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=area["radius"],
        depth=0.08,
        location=(area["x"], area["z"], area["y"] + 0.04)
    )
    plaza = bpy.context.active_object
    plaza.name = f"Plaza_{area['name']}"
    plaza.data.materials.append(mat_path)

for i, bench in enumerate(scene_data["benches"]):
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(bench["x"], bench["z"], bench["y"] + 0.25)
    )
    b_obj = bpy.context.active_object
    b_obj.name = f"Bench_{i}"
    b_obj.scale = (1.6, 0.55, 0.45)
    b_obj.rotation_euler = Euler((0, 0, -bench["rotation"]), 'XYZ')
    b_obj.data.materials.append(mat_wood)

# 6. Build Arched Pond Bridge
br = scene_data["bridge"]
# Curved bridge deck: 12 segments across X
br_mesh = bpy.data.meshes.new("BridgeMesh")
br_obj = bpy.data.objects.new("PondBridge", br_mesh)
bpy.context.collection.objects.link(br_obj)

br_bm = bmesh.new()
br_segments = 16
half_len = br["width"] / 2.0
half_dep = br["depth"] / 2.0
br_verts_l = []
br_verts_r = []

for s in range(br_segments + 1):
    t = s / br_segments
    x_pos = br["x"] - half_len + t * br["width"]
    dist_center = abs(x_pos - br["x"])
    arc = max(0.0, (half_len - dist_center) * (br["arcHeight"] / half_len))
    z_pos = br["y"] + arc + 0.12
    vl = br_bm.verts.new((x_pos, br["z"] + half_dep, z_pos))
    vr = br_bm.verts.new((x_pos, br["z"] - half_dep, z_pos))
    br_verts_l.append(vl)
    br_verts_r.append(vr)

for s in range(br_segments):
    br_bm.faces.new((br_verts_l[s], br_verts_r[s], br_verts_r[s + 1], br_verts_l[s + 1]))

br_bm.to_mesh(br_mesh)
br_bm.free()
br_mesh.materials.append(mat_wood)

# Bridge rails
for side in [-1, 1]:
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(br["x"], br["z"] + side * 1.18, br["y"] + br["arcHeight"] * 0.7 + 0.45)
    )
    rail = bpy.context.active_object
    rail.name = f"BridgeRail_{side}"
    rail.scale = (br["width"] - 0.4, 0.08, 0.7)
    rail.data.materials.append(mat_wood)

# 7. Build Mill Building
mill = scene_data["mill"]
bpy.ops.mesh.primitive_cylinder_add(
    radius=1.8,
    depth=5.5,
    location=(mill["x"], mill["z"], mill["y"] + 2.75)
)
mill_tower = bpy.context.active_object
mill_tower.name = "MillTower"
mill_tower.data.materials.append(mat_mill)

bpy.ops.mesh.primitive_cone_add(
    radius1=2.2,
    depth=2.0,
    location=(mill["x"], mill["z"], mill["y"] + 5.5 + 1.0)
)
mill_roof = bpy.context.active_object
mill_roof.name = "MillRoof"
mill_roof.data.materials.append(mat_wood)

# 8. Build Trees & Cliffs
for i, tree in enumerate(scene_data["trees"]):
    # Trunk
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.2 * tree["scale"],
        depth=1.2 * tree["scale"],
        location=(tree["x"], tree["z"], tree["y"] + 0.6 * tree["scale"])
    )
    trunk = bpy.context.active_object
    trunk.data.materials.append(mat_wood)
    # Foliage
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=1.3 * tree["scale"],
        location=(tree["x"], tree["z"], tree["y"] + 1.8 * tree["scale"])
    )
    foliage = bpy.context.active_object
    foliage.data.materials.append(mat_foliage)

for i, cliff in enumerate(scene_data["cliffs"]):
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=2,
        radius=1.2 * cliff["scale"],
        location=(cliff["x"], cliff["z"], cliff["y"] + 0.5)
    )
    c_obj = bpy.context.active_object
    c_obj.scale = (1.0, 1.2, 0.7)
    c_obj.rotation_euler = Euler((0.2, 0.1, cliff["rotation"]), 'XYZ')
    c_obj.data.materials.append(mat_rock)

# 9. Lighting Setup
bpy.ops.object.light_add(type='SUN', location=(60, 20, 80))
sun = bpy.context.active_object
sun.data.energy = 4.0
sun.data.color = (1.0, 0.96, 0.88)
sun.rotation_euler = Euler((math.radians(45), math.radians(20), math.radians(35)), 'XYZ')

# Ambient fill light
bpy.ops.object.light_add(type='SUN', location=(-20, 60, 60))
fill = bpy.context.active_object
fill.data.energy = 1.2
fill.data.color = (0.75, 0.85, 1.0)
fill.rotation_euler = Euler((math.radians(-30), math.radians(-40), math.radians(120)), 'XYZ')

# World Sky Background
if scene.world:
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs['Color'].default_value = (0.50, 0.72, 0.92, 1.0)
        bg.inputs['Strength'].default_value = 1.0

# 10. Camera Setups & Renders with Look-At Targeting
def point_camera_at(cam_obj, target_pos):
    direction = target_pos - cam_obj.location
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam_obj.rotation_euler = rot_quat.to_euler()

CAMERAS = [
    {
        "id": "overview-isometric",
        "type": "ORTHO",
        "ortho_scale": 135.0,
        "location": Vector((-35.0, -35.0, 85.0)),
        "target": Vector((48.0, 42.0, 0.3)),
        "description": "High-angle isometric overview showing island terraces, retaining walls, and curved routes"
    },
    {
        "id": "mill-terrace",
        "type": "PERSP",
        "lens": 35.0,
        "location": Vector((68.0, 36.0, 3.6)),
        "target": Vector((86.0, 24.0, 1.2)),
        "description": "Close-up perspective of the Mill terrace slope, western retaining wall, and ascent path"
    },
    {
        "id": "belvedere-overlook",
        "type": "PERSP",
        "lens": 32.0,
        "location": Vector((88.0, 32.0, 2.2)),
        "target": Vector((96.0, 38.0, 0.6)),
        "description": "Ocean overlook perspective showing the Belvedere plaza, resting benches, and sea cliffs"
    },
    {
        "id": "pond-bridge",
        "type": "PERSP",
        "lens": 28.0,
        "location": Vector((72.0, 46.0, 3.8)),
        "target": Vector((88.0, 58.0, 0.4)),
        "description": "Waterside perspective of the willow pond, arched bridge crossing, and retaining walls"
    }
]

cam_data = bpy.data.cameras.new("RenderCam")
cam_obj = bpy.data.objects.new("RenderCamObj", cam_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj

print("Starting Blender rendering passes...")
for cam_info in CAMERAS:
    cam_id = cam_info["id"]
    out_file = os.path.join(RENDER_DIR, f"{cam_id}.png")
    
    cam_data.type = cam_info["type"]
    if cam_info["type"] == 'ORTHO':
        cam_data.ortho_scale = cam_info["ortho_scale"]
    else:
        cam_data.lens = cam_info["lens"]
        
    cam_obj.location = cam_info["location"]
    point_camera_at(cam_obj, cam_info["target"])
    
    scene.render.filepath = out_file
    print(f"  Rendering [{cam_id}] to {out_file}...")
    bpy.ops.render.render(write_still=True)
    print(f"  Done: {out_file}")

print("All Blender renders completed successfully!")

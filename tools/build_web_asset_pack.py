"""Build the original CyberShield web asset pack with Blender 5.2 and OptiX.

blender -b --debug-cycles --python-exit-code 1 -P build_web_asset_pack.py -- OUTPUT [ASSETS...]
All coordinates in modelling helpers are game X/Y/Z (Y up, +Z forward).
"""
import bpy
import bmesh
import hashlib
import json
import math
import sys
from pathlib import Path
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:]
OUT = Path(ARGS[0])
for folder in ('models', 'source', 'previews'):
    (OUT / folder).mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.save_version = 0
PALETTE = dict(teal='347D78', cream='EEE4CD', sand='D8BC8B', ochre='BB914D',
               green='8BA474', wood='8B694D', dark='3E4C4C', skin='C99C79')
LIMITS = {
    'hero': (2500, 5), 'master': (2500, 5), 'medic': (2500, 5),
    'workshop': (3000, 5), 'clinic': (5000, 5), 'house-base': (2500, 4),
    'tree': (400, 2), 'bench': (300, 2), 'aid-kit': (200, 2),
}
ROOT_NAMES = {'house-base': 'house-root'}
MATERIALS = {}
OWNER = None
SOURCE_MEASUREMENTS = {}


def pos(x, y, z):
    return (x, -z, y)


def reset():
    global OWNER, SOURCE_MEASUREMENTS
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = 1
    MATERIALS.clear()
    OWNER = None
    SOURCE_MEASUREMENTS = {}


def material(key):
    if key in MATERIALS:
        return MATERIALS[key]
    color = PALETTE.get(key, key)
    def linear(c):
        return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
    rgba = tuple(linear(int(color[i:i+2], 16) / 255) for i in (0, 2, 4)) + (1,)
    mat = bpy.data.materials.new(key)
    mat.diffuse_color = rgba
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = rgba
    bsdf.inputs['Roughness'].default_value = .8
    bsdf.inputs['Metallic'].default_value = 0
    MATERIALS[key] = mat
    return mat


def parent(obj, target):
    bpy.context.view_layer.update()
    world = obj.matrix_world.copy()
    obj.parent = target
    obj.matrix_world = world
    return obj


def empty(name, xyz=(0, 0, 0), owner=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = pos(*xyz)
    if owner:
        parent(obj, owner)
    return obj


def finish(obj, name, mat, owner=None):
    obj.name = name
    obj.data.materials.append(material(mat))
    return parent(obj, owner or OWNER) if (owner or OWNER) else obj


def box(name, xyz, size, mat, bevel=0, owner=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos(*xyz))
    obj = bpy.context.object
    obj.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Small edge bevel', 'BEVEL')
        mod.width = min(bevel, min(size) * .2)
        mod.segments = 1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(obj, name, mat, owner)


def ellipsoid(name, xyz, size, mat, owner=None, ico=False):
    if ico:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=pos(*xyz))
    else:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=1, location=pos(*xyz))
    obj = bpy.context.object
    obj.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, owner)


def mesh(name, vertices, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata([pos(*v) for v in vertices], [], faces)
    bm = bmesh.new()
    bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(data)
    bm.free()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, mat)


def taper(name, xyz, width, height, depth, top_width, mat, owner=None):
    x, y, z = xyz
    vertices = [(x + sx*w/2, yy, z + sz*depth/2)
                for yy, w in ((y-height/2, width), (y+height/2, top_width))
                for sz in (-1, 1) for sx in (-1, 1)]
    obj = mesh(name, vertices, [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1),
                               (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)], mat)
    if owner:
        parent(obj, owner)
    return obj


def bounds(objects):
    bpy.context.view_layer.update()
    points = [obj.matrix_world @ v.co for obj in objects if obj.type == 'MESH' for v in obj.data.vertices]
    lo = [min(v[i] for v in points) for i in range(3)]
    hi = [max(v[i] for v in points) for i in range(3)]
    return {'min': [lo[0], lo[2], -hi[1]], 'max': [hi[0], hi[2], -lo[1]],
            'size': [hi[0]-lo[0], hi[2]-lo[2], hi[1]-lo[1]]}


def measure(name, obj):
    SOURCE_MEASUREMENTS[name] = bounds([obj])


def character(kind):
    shirt = {'hero': 'teal', 'master': 'green', 'medic': 'cream'}[kind]
    accent = {'hero': 'ochre', 'master': 'ochre', 'medic': 'teal'}[kind]
    hair = 'cream' if kind == 'master' else 'dark'
    for sign, side in ((1, 'left'), (-1, 'right')):
        leg = empty(side+'-leg', (sign*.115, .85, 0), OWNER)
        taper(side+'-trouser', (sign*.115, .49, 0), .15, .72, .18, .18, 'dark', leg)
        box(side+'-shoe', (sign*.115, .065, .045), (.17, .13, .29), 'dark', .026, leg)
        arm = empty(side+'-arm', (sign*.26, 1.32, 0), OWNER)
        box(side+'-sleeve', (sign*.265, 1.13, 0), (.14, .40, .19), shirt, .026, arm)
        box(side+'-hand', (sign*.265, .86, .015), (.12, .15, .14), 'skin', .024, arm)
    box('waist', (0, .84, 0), (.37, .15, .22), 'dark', .025)
    taper('jacket', (0, 1.10, 0), .35, .47, .25, .44, shirt)
    box('collar-left', (.075, 1.32, .13), (.11, .055, .032), accent, .007)
    box('collar-right', (-.075, 1.32, .13), (.11, .055, .032), accent, .007)
    box('neck', (0, 1.395, 0), (.12, .14, .12), 'skin', .018)
    ellipsoid('face', (0, 1.555, .015), (.22, .255, .21), 'skin')
    box('hair-cap', (0, 1.66, -.008), (.228, .08, .205), hair, .025)
    box('hair-back', (0, 1.585, -.087), (.216, .17, .055), hair, .018)
    box('side-fringe', (-.071, 1.635, .097), (.082, .075, .022), hair, .008)
    for sign in (-1, 1):
        ellipsoid('ear', (sign*.113, 1.55, 0), (.036, .068, .04), 'skin')
        box('eye', (sign*.047, 1.576, .111), (.019, .023, .012), 'dark', .003)
    box('nose', (0, 1.542, .12), (.036, .043, .032), 'skin', .007)
    if kind == 'hero':
        box('backpack', (0, 1.12, -.20), (.29, .34, .15), accent, .035)
        for sign in (-1, 1):
            box('backpack-strap', (sign*.145, 1.13, .131), (.037, .36, .016), accent)
    elif kind == 'master':
        box('apron', (0, .98, .141), (.30, .47, .025), accent, .008)
        box('apron-pocket', (0, .98, .159), (.18, .10, .018), shirt, .005)
        box('apron-bib', (0, 1.25, .137), (.19, .14, .023), accent, .008)
    else:
        box('coat-front', (0, .91, .13), (.35, .26, .035), shirt, .01)
        box('coat-pocket', (.105, 1.11, .144), (.075, .08, .023), accent, .005)
        ellipsoid('hair-bun', (0, 1.595, -.155), (.13, .13, .13), 'dark')
    empty('aid-kit-socket', (0, .85, .30), OWNER)


def window(x, y, z, side=False):
    if side:
        box('window-frame', (x, y, z), (.10, 1.48, 1.18), 'cream')
        box('window-glass', (x + (.056 if x > 0 else -.056), y, z), (.025, 1.22, .92), 'dark')
        box('window-mullion', (x + (.073 if x > 0 else -.073), y, z), (.025, 1.25, .055), 'cream')
    else:
        box('window-frame', (x, y, z), (1.25, 1.48, .10), 'cream')
        box('window-glass', (x, y, z+.056), (1.00, 1.22, .025), 'dark')
        box('window-mullion', (x, y, z+.073), (.055, 1.25, .025), 'cream')
        box('window-sill', (x, y-.75, z+.065), (1.38, .10, .22), 'cream', .01)


def gable(width, base, height, roof_mat):
    w = width / 2 + .2
    z = 4.2
    mesh('gable-roof', [(-w, base, -z), (w, base, -z), (0, height, -z),
                        (-w, base, z), (w, base, z), (0, height, z)],
         [(0, 2, 1), (3, 4, 5), (0, 1, 4, 3), (0, 3, 5, 2), (1, 2, 5, 4)], roof_mat)
    # Thin ridge and fascia stay within the height/overhang budgets.
    box('ridge', (0, height-.035, 0), (.12, .07, 8.4), roof_mat)
    for sign in (-1, 1):
        box('eave', (sign*(width/2+.15), base+.015, 0), (.10, .12, 8.4), roof_mat)


def building(kind):
    floors = {'workshop': 1, 'clinic': 3, 'house-base': 2}[kind]
    width = 10 if kind == 'clinic' else 9
    height = floors*3.2
    wall_mat = 'cream' if kind == 'clinic' else 'sand'
    roof_mat = 'green' if kind == 'house-base' else 'teal'
    wall = box('wall-volume', (0, height/2, 0), (width, height, 8), wall_mat)
    measure('walls', wall)
    # Door panel is flush at +Z=4; the frame surrounds its exact dimensions.
    dw = 1.3 if kind == 'clinic' else 1.2
    door = box('door-panel', (0, 1.1, 3.985), (dw, 2.2, .03), 'dark')
    # Cut the door recess into the front wall to avoid coincident surfaces.
    cutter = box('door-cut', (0, 1.1, 4), (dw+.002, 2.202, .10), 'dark')
    bpy.context.view_layer.objects.active = wall
    mod = wall.modifiers.new('Closed doorway recess', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
    measure('door', door)
    for sign in (-1, 1):
        box('door-jamb', (sign*(dw/2+.085), 1.15, 4.025), (.17, 2.3, .07), 'cream')
    box('door-lintel', (0, 2.3, 4.025), (dw+.34, .20, .07), 'cream')
    box('door-glazing', (0, 1.43, 4.009), (dw-.30, 1.1, .016), roof_mat)
    box('door-handle', (dw*.32, .98, 4.038), (.045, .20, .025), 'cream')
    for floor in range(floors):
        yy = floor*3.2+1.7
        xs = (-2.6, 2.6) if kind == 'workshop' else (-3.45, -1.75, 1.75, 3.45)
        for x in xs:
            window(x, yy, 4.025)
        for sign in (-1, 1):
            for z in (-2.35, 0, 2.35):
                window(sign*(width/2+.025), yy, z, True)
        if floor:
            box('floor-band', (0, floor*3.2, 4.045), (width, .10, .09), roof_mat)
    # Rear windows keep the building useful from every isometric direction.
    for floor in range(floors):
        for x in (-2.6, 2.6):
            box('rear-frame', (x, floor*3.2+1.7, -4.025), (1.25, 1.48, .10), 'cream')
            box('rear-glass', (x, floor*3.2+1.7, -4.085), (1, 1.22, .025), 'dark')
    if kind == 'clinic':
        box('roof-cap', (0, 9.67, 0), (10.3, .14, 8.3), roof_mat)
        for sign in (-1, 1):
            box('parapet-front-back', (0, 9.9, sign*4), (10.15, .40, .15), wall_mat)
            box('parapet-side', (sign*5, 9.9, 0), (.15, .40, 8), wall_mat)
        box('entry-canopy', (0, 2.58, 4.24), (2.4, .18, .70), roof_mat, .035)
        box('blank-sign', (0, 2.99, 4.06), (2.3, .28, .09), roof_mat, .025)
    else:
        gable(width, height, 4.65 if floors == 1 else 7.7, roof_mat)
        if kind == 'workshop':
            box('blank-sign', (0, 2.82, 4.07), (2.7, .38, .12), roof_mat, .025)
    # No sidewalk, threshold step, interior furniture or baked lighting.


def tree():
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=.20, radius2=.105, depth=2.8, location=pos(0, 1.4, 0))
    finish(bpy.context.object, 'trunk', 'wood')
    ellipsoid('crown-center', (0, 3.35, 0), (2.8, 2.3, 2.8), 'green', ico=True)
    ellipsoid('crown-left', (-.54, 3.0, .22), (1.65, 1.8, 1.7), 'green', ico=True)
    ellipsoid('crown-right', (.60, 3.15, -.20), (1.6, 1.7, 1.65), 'green', ico=True)
    ellipsoid('crown-tip', (0, 3.91, -.08), (1.6, 1.18, 1.5), 'green', ico=True)


def bench():
    for z in (-.165, 0, .165):
        box('seat-plank', (0, .415, z), (1.6, .07, .15), 'wood')
    for y in (.61, .79):
        box('back-plank', (0, y, -.24), (1.6, .12, .07), 'wood')
    for x in (-.58, .58):
        for z in (-.19, .19):
            box('leg', (x, .20, z), (.065, .40, .065), 'dark')
        box('back-upright', (x, .56, -.25), (.065, .50, .05), 'dark')
        box('seat-rail', (x, .36, 0), (.065, .07, .50), 'dark')
    # Frontmost rail edge defines exactly 0.55 m total depth.
    box('front-rail', (0, .355, .25), (1.23, .06, .05), 'dark')


def aid_kit():
    box('case', (0, .085, -.002), (.30, .17, .156), 'cream', .018)
    for x in (-.055, .055):
        box('handle-upright', (x, .19, 0), (.018, .04, .027), 'teal', .003)
    box('handle-top', (0, .211, 0), (.128, .018, .027), 'teal', .003)
    box('plain-front-patch', (0, .087, .078), (.10, .065, .004), 'teal')


def combine_batches():
    # Batch by parent and material while preserving articulation pivots.
    global OWNER
    groups = {}
    for obj in list(bpy.context.scene.objects):
        if obj.type == 'MESH' and obj.name not in ('wall-volume', 'door-panel'):
            groups.setdefault((obj.parent.name, obj.data.materials[0].name), []).append(obj)
    for key, objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        obj = bpy.context.object
        obj.name = 'batch-'+key[0]+'-'+key[1]
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)


def configure_render():
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'
    prefs.refresh_devices()
    selected = []
    for device in prefs.devices:
        device.use = device.type == 'OPTIX' and '4070' in device.name
        if device.use:
            selected.append(device.name)
    if not selected:
        raise RuntimeError('The expected RTX 4070 OptiX device is unavailable')
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'GPU'
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'AgX'
    scene.world = bpy.data.worlds.new('Soft studio world')
    scene.world.use_nodes = True
    bg = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (.70, .76, .82, 1)
    bg.inputs['Strength'].default_value = .25
    print('OPTIX_DEVICES '+json.dumps(selected), flush=True)
    return selected


def studio(size, center):
    global OWNER
    OWNER = None
    floor = box('preview-floor', (center[0], -.055, center[2]), (size*8, .10, size*8), 'E5E2D5')
    floor['preview_only'] = True
    for name, location, power, radius in (
        ('Key', (-size*.7, size*1.2, size*.8), size*size*45, size*.75),
        ('Fill', (size*.7, size*.7, size*.15), size*size*12, size*.65),
    ):
        data = bpy.data.lights.new(name, 'AREA')
        data.energy = power
        data.shape = 'DISK'
        data.size = radius
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = pos(location[0]+center[0], location[1], location[2]+center[2])
        obj.rotation_euler = (Vector(pos(*center))-obj.location).to_track_quat('-Z', 'Y').to_euler()
    data = bpy.data.cameras.new('Preview camera')
    camera = bpy.data.objects.new('Preview camera', data)
    bpy.context.collection.objects.link(camera)
    data.type = 'ORTHO'
    bpy.context.scene.camera = camera
    return camera


def render_view(camera, target, distance, view, path, ortho, write=True):
    directions = {'front': (0, 0, 1), 'side': (1, 0, 0), 'iso': (1, .88, 1.25)}
    direction = Vector(pos(*directions[view])).normalized()
    camera.location = Vector(pos(*target)) + direction*distance
    camera.rotation_euler = (Vector(pos(*target))-camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.ortho_scale = ortho
    camera.data.clip_end = max(1000, distance*4)
    bpy.context.scene.render.filepath = str(path)
    if write:
        bpy.ops.render.render(write_still=True)


def build(name):
    global OWNER
    reset()
    OWNER = empty(ROOT_NAMES.get(name, name+'-root'))
    if name in ('hero', 'master', 'medic'):
        character(name)
    elif name in ('workshop', 'clinic', 'house-base'):
        building(name)
    else:
        {'tree': tree, 'bench': bench, 'aid-kit': aid_kit}[name]()
    bpy.context.view_layer.update()
    source_metrics = dict(SOURCE_MEASUREMENTS)
    combine_batches()
    objects = list(bpy.context.scene.objects)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    glb = OUT/'models'/(name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True,
                             export_yup=True, export_animations=False, export_cameras=False,
                             export_lights=False)
    # Keep a genuinely editable Blender scene before testing the exported artifact.
    configure_render()
    b = bounds(objects)
    size = max(b['size'])
    center = [(a+c)/2 for a, c in zip(b['min'], b['max'])]
    camera = studio(size, center)
    render_view(camera, center, size*4, 'iso', OUT/'previews'/(name+'-source.png'), size*1.5, write=False)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source'/(name+'.blend')))
    reset()
    bpy.ops.import_scene.gltf(filepath=str(glb))
    objects = list(bpy.context.scene.objects)
    meshes = [o for o in objects if o.type == 'MESH']
    b = bounds(meshes)
    triangles = 0
    for obj in meshes:
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
    mats = {m.name for obj in meshes for m in obj.data.materials}
    assert triangles <= LIMITS[name][0], (name, triangles)
    assert len(mats) <= LIMITS[name][1], (name, mats)
    assert abs(b['min'][1]) < .0001, (name, b)
    if name in ('hero', 'master', 'medic'):
        assert abs(b['size'][1]-1.7) < .01 and b['size'][0] <= .7, (name, b)
    devices = configure_render()
    size = max(b['size'])
    center = [(a+c)/2 for a, c in zip(b['min'], b['max'])]
    camera = studio(size, center)
    for view in ('front', 'side', 'iso'):
        render_view(camera, center, size*4, view, OUT/'previews'/(name+'-'+view+'.png'), size*(1.5 if view == 'iso' else 1.22))
    result = {'name': name, 'bounds': b, 'triangles': triangles, 'materials': sorted(mats),
              'bytes': glb.stat().st_size, 'sha256': hashlib.sha256(glb.read_bytes()).hexdigest(),
              'root': ROOT_NAMES.get(name, name+'-root'), 'source_measurements': source_metrics,
              'reimported': True, 'rendered_from_reimport': True, 'gpu': devices,
              'blender': bpy.app.version_string}
    (OUT/(name+'-report.json')).write_text(json.dumps(result, indent=2), encoding='utf-8')
    print('ASSET_COMPLETE '+json.dumps(result), flush=True)
    return result


def comparison():
    reset()
    placement = [('workshop', (-6.2, 0, 0)), ('clinic', (6.3, 0, 0)),
                 ('hero', (-6.2, 0, 5.1)), ('hero', (6.3, 0, 5.1))]
    if (OUT/'models'/'tree.glb').exists():
        placement += [('tree', (-13, 0, 1)), ('tree', (13.6, 0, 1)),
                      ('bench', (-.6, 0, 4.5)), ('master', (-7.2, 0, 5.2)),
                      ('medic', (7.3, 0, 5.2))]
    for name, xyz in placement:
        before = set(bpy.context.scene.objects)
        bpy.ops.import_scene.gltf(filepath=str(OUT/'models'/(name+'.glb')))
        added = set(bpy.context.scene.objects)-before
        for obj in added:
            if obj.parent is None:
                obj.location += Vector(pos(*xyz))
    configure_render()
    bpy.context.scene.render.resolution_x = 1800
    bpy.context.scene.render.resolution_y = 1100
    camera = studio(22, (0, 4, 1))
    render_view(camera, (0, 3.8, 1.4), 70, 'iso', OUT/'previews'/'scale-comparison.png', 36)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source'/'scale-comparison.blend'))
    # Orthographic front view makes the door-to-person ratio easy to verify visually.
    render_view(camera, (0, 4.5, 1), 70, 'front', OUT/'previews'/'scale-front.png', 31)


names = ARGS[1:] or list(LIMITS)
for name in names:
    if name not in LIMITS:
        raise ValueError('Unknown asset: '+name)
    print('BUILDING_ASSET '+name, flush=True)
    build(name)
if all((OUT/'models'/(n+'.glb')).exists() for n in ('hero', 'workshop', 'clinic')):
    comparison()
reports = [json.loads(p.read_text(encoding='utf-8')) for p in sorted(OUT.glob('*-report.json'))]
(OUT/'manifest.json').write_text(json.dumps({'assets': reports, 'total_glb_bytes': sum(r['bytes'] for r in reports),
    'total_triangles': sum(r['triangles'] for r in reports), 'coordinate_system': 'metres, Y up, +Z forward'}, indent=2), encoding='utf-8')
print('PACK_COMPLETE '+str(OUT), flush=True)

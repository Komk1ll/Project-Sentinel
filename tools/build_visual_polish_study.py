"""Build and render a workshop art study; it does not update runtime assets.

Run with Blender and an output directory, or through render-web-assets-remote.py.
The exported building is reimported before all review renders and measurements.
"""
import hashlib
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
from mathutils import Vector
import build_web_asset_pack as b

OUT = b.OUT
COLORS = dict(plaster='E4C99B', trim='F1E5CD', brick='926D50', roof='265E63',
              metal='283E43', glass='477780', glint='88AFAC', timber='A36A3C')
b.PALETTE.update(COLORS)


def beam(name, start, end, width, mat):
    a, c = Vector(b.pos(*start)), Vector(b.pos(*end))
    bpy.ops.mesh.primitive_cube_add(size=1, location=(a+c)/2)
    obj = bpy.context.object
    obj.dimensions = (width, width, (c-a).length)
    obj.rotation_euler = (c-a).to_track_quat('Z', 'Y').to_euler()
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return b.finish(obj, name, mat)


def recess(wall, name, xyz, size):
    cutter = b.box(name+'-cut', xyz, size, 'metal')
    bpy.context.view_layer.objects.active = wall
    modifier = wall.modifiers.new(name+'-recess', 'BOOLEAN')
    modifier.operation = 'DIFFERENCE'
    modifier.object = cutter
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def window(x, y, z, side=False):
    # Model a whole window facing +Z, then rotate it onto the right facade.
    before = set(bpy.context.scene.objects)
    w, h = 1.48, 1.62
    b.box('window-shadow', (0, 0, -.06), (w, h, .08), 'metal')
    b.box('opaque-window', (0, 0, -.007), (w-.16, h-.16, .025), 'glass')
    for sx in (-1, 1):
        b.box('window-jamb', (sx*w/2, 0, .035), (.11, h+.14, .18), 'trim', .016)
    for sy in (-1, 1):
        b.box('window-rail', (0, sy*h/2, .035), (w+.11, .11, .18), 'trim', .016)
    b.box('window-crossbar', (0, .10, .045), (w-.1, .055, .055), 'trim')
    b.box('window-mullion', (0, 0, .045), (.055, h-.1, .055), 'trim')
    b.box('window-sill', (0, -h/2-.09, .11), (w+.32, .12, .38), 'trim', .022)
    b.box('window-hood', (0, h/2+.11, .065), (w+.27, .12, .28), 'trim', .018)
    # Broad opaque reflection shapes survive at gameplay distance, without refraction.
    b.mesh('window-reflection', [(-.63,.7,.009),(-.30,.7,.009),(-.63,.20,.009)], [(0,1,2)], 'glint')
    for obj in set(bpy.context.scene.objects)-before:
        if side:
            # Rotate the entire modeled window around the origin, including its mesh.
            from mathutils import Matrix
            obj.matrix_world = Matrix.Rotation(math.pi/2, 4, 'Z') @ obj.matrix_world
        obj.location += Vector(b.pos(x,y,z))


def workshop():
    b.reset()
    b.OWNER = b.empty('workshop-root')
    wall = b.box('wall-volume', (0, 1.6, 0), (9,3.2,8), 'plaster')
    recess(wall, 'door', (0,1.101,3.99), (1.202,2.202,.22))
    for x in (-2.7,2.7):
        recess(wall, 'front-window', (x,1.76,3.99), (1.48,1.62,.27))
        window(x,1.76,3.99)
    for z in (-2.5,0,2.5):
        recess(wall, 'side-window', (4.49,1.76,z), (.27,1.62,1.48))
        window(4.49,1.76,z,True)
    # Back and left facades remain authored, even though they are not the hero view.
    for z in (-2.5,0,2.5):
        b.box('left-window-frame', (-4.52,1.76,z), (.08,1.76,1.62), 'trim')
        b.box('left-window-glass', (-4.57,1.76,z), (.025,1.55,1.4), 'glass')
    for x in (-2.7,2.7):
        b.box('rear-window-frame', (x,1.76,-4.02), (1.62,1.76,.08), 'trim')
        b.box('rear-window-glass', (x,1.76,-4.07), (1.4,1.55,.025), 'glass')
    b.box('door-panel', (0,1.1,3.9), (1.2,2.2,.06), 'metal', .012)
    for x in (-.305,.305):
        b.box('door-glass', (x,1.46,3.94), (.48,1.12,.025), 'glass')
        b.box('door-bottom-panel', (x,.40,3.94), (.48,.58,.03), 'roof', .018)
        b.box('door-handle', (x/3,1.02,3.99), (.025,.24,.04), 'trim')
    for x in (-.69,.69):
        b.box('door-jamb', (x,1.13,4.015), (.16,2.26,.18), 'trim', .012)
    b.box('door-lintel', (0,2.29,4.015), (1.54,.16,.18), 'trim', .012)
    # Plinth is split at the entrance; the walkable threshold stays at ground level.
    for x in (-2.65,2.65):
        b.box('front-plinth', (x,.20,4.01), (3.7,.4,.10), 'brick', .015)
        b.box('front-plinth-cap', (x,.43,4.04), (3.7,.07,.16), 'trim')
    for x in (-4.51,4.51):
        b.box('side-plinth', (x,.20,0), (.10,.40,8), 'brick', .015)
        b.box('side-plinth-cap', (x,.43,0), (.16,.07,8), 'trim')
    b.box('rear-plinth', (0,.20,-4.01), (9,.4,.10), 'brick')
    for x in (-4.35,4.35):
        b.box('corner-pier', (x,1.78,4.035), (.29,2.64,.15), 'trim', .018)
        for y in (.65,1.05,1.45,1.85,2.25,2.65):
            b.box('corner-block', (x,y,4.125), (.36,.22,.06), 'plaster', .01)
    b.box('fascia', (0,3.16,0), (9.38,.22,8.38), 'trim', .025)
    b.box('eave-shadow', (0,3.31,0), (9.6,.09,8.6), 'metal')
    # Hipped roof has a longer, lower silhouette than a simple triangular prism.
    roof_vertices = [(-4.8,3.35,-4.3),(4.8,3.35,-4.3),(4.8,3.35,4.3),(-4.8,3.35,4.3),
                     (-2.25,4.65,0),(2.25,4.65,0)]
    b.mesh('hip-roof', roof_vertices, [(0,1,5,4),(1,2,5),(2,3,4,5),(3,0,4)], 'roof')
    for a,c in ((0,4),(1,5),(2,5),(3,4),(4,5)):
        beam('roof-fold',roof_vertices[a],roof_vertices[c],.055,'roof')
    for x in (-1.8,-.9,0,.9,1.8):
        for z in (-4.3,4.3):
            beam('standing-seam',(x,3.37,z),(x,4.67,0),.025,'roof')
    # Gutter and downpipe read as architectural scale cues.
    for z in (-4.29,4.29):
        b.box('gutter',(0,3.34,z),(9.6,.105,.12),'metal',.015)
    for x in (-4.43,4.43):
        beam('downpipe',(x,.20,4.12),(x,3.25,4.12),.075,'roof')
    b.box('chimney',(2.9,4.24,-1.25),(.58,1.55,.65),'brick',.025)
    b.box('chimney-cap',(2.9,5.04,-1.25),(.76,.14,.83),'trim',.018)
    b.box('chimney-top',(2.9,5.115,-1.25),(.49,.015,.56),'metal')
    # Blank sign stays procedural text-free in the GLB; the game supplies its label.
    b.box('sign-frame',(0,2.84,4.09),(2.9,.44,.16),'timber',.025)
    b.box('sign-board',(0,2.84,4.18),(2.72,.32,.025),'roof',.01)
    b.box('entry-canopy',(0,2.48,4.27),(1.95,.11,.58),'roof',.02)
    for x in (-.85,.85):
        beam('canopy-bracket',(x,2.16,4.04),(x,2.43,4.48),.055,'metal')
    for x in (-1.08,1.08):
        b.box('lamp-back',(x,1.94,4.10),(.15,.32,.12),'metal',.015)
        b.box('lamp-pane',(x,1.94,4.18),(.11,.20,.05),'trim',.012)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source'/'workshop-authoring.blend'))
    b.combine_batches()
    bpy.ops.object.select_all(action='SELECT')
    path = OUT/'models'/'workshop.glb'
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
        export_yup=True, export_animations=False, export_cameras=False, export_lights=False)
    b.reset()
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects=list(bpy.context.scene.objects)
    meshes=[o for o in objects if o.type=='MESH']
    triangles=0
    for o in meshes:
        o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
    materials={m.name for o in meshes for m in o.data.materials}
    metrics=b.bounds(meshes)
    assert triangles<=12000 and len(materials)<=8,(triangles,materials)
    assert abs(metrics['min'][1])<1e-5,metrics
    door=next(o for o in meshes if o.name=='door-panel')
    assert abs(b.bounds([door])['size'][1]-2.2)<.001
    report=dict(asset='workshop',triangles=triangles,materials=sorted(materials),meshes=len(meshes),
        bounds=metrics,bytes=path.stat().st_size,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        reimported=True,rendered_from_reimport=True,runtime_integrated=False,
        door_bounds=b.bounds([door]),blender=bpy.app.version_string,gpu=b.configure_render())
    (OUT/'workshop-report.json').write_text(json.dumps(report,indent=2))
    camera=b.studio(10,(0,2.5,0))
    b.render_view(camera,(0,2.4,.15),40,'iso',OUT/'previews'/'workshop-iso.png',15.0)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source'/'workshop.blend'))
    return report


def street():
    b.reset()
    bpy.ops.import_scene.gltf(filepath=str(OUT/'models'/'workshop.glb'))
    # Dressing is review-only. It is deliberately excluded from the building GLB.
    b.OWNER=None
    b.box('study-base',(0,-.26,1.2),(17,.5,16),'66846A',.15)
    b.box('front-pavement',(0,-.035,5.65),(17,.06,3.1),'C9BEA5')
    b.box('right-pavement',(5.6,-.035,-.4),(1.8,.06,9),'C9BEA5')
    b.box('road',(0,-.05,8.1),(17,.08,1.8),'50656A')
    b.box('curb',(0,.015,7.13),(17,.06,.18),'E1D4B9')
    for x in range(-8,9):
        for z in (4.85,5.65,6.45):
            b.box('paver-seam',(x,-.001,z),(.012,.003,1.56),'A89E8B')
    for z in (4.85,5.65,6.45):
        b.box('paver-seam',(0,0,z),(17,.002,.012),'A89E8B')
    for x in (-6,-3,0,3,6):
        b.box('road-dash',(x,-.004,8.2),(1.25,.004,.07),'E1D4B9')
    for x in (-6.2,6.8):
        for z in (-2.5,2.4):
            b.OWNER=b.empty('review-tree',(x,0,z))
            # Local tree is built at origin, then the whole hierarchy is moved.
            b.OWNER.location=(0,0,0)
            b.PALETTE['green']='6F8F4A'
            b.tree(); b.OWNER.location=b.pos(x,0,z)
    for x in (-3.9,3.9):
        b.OWNER=b.empty('review-planter')
        b.box('planter',(x,.22,4.6),(.62,.44,.55),'926D50',.04)
        for dx,dz,s in ((-.15,0,.48),(.15,.03,.5),(0,-.08,.59)):
            b.ellipsoid('plant',(x+dx,.56,4.6+dz),(s,.55,s),'6F8F4A',ico=True)
    b.OWNER=b.empty('review-bench')
    b.bench(); b.OWNER.location=b.pos(5.75,0,4.65)
    # Keep the existing 1.70 m hero solely as a scale reference, not a v4 character.
    b.OWNER=b.empty('v3-hero-scale-reference')
    b.character('hero');b.OWNER.location=b.pos(.65,0,5.55)
    b.OWNER=None
    bpy.ops.object.text_add(location=b.pos(0,2.84,4.205))
    label=bpy.context.object;label.name='review-only-sign-text'
    label.rotation_euler=(math.pi/2,0,0)
    font=Path('C:/Windows/Fonts/arialbd.ttf')
    if font.exists():label.data.font=bpy.data.fonts.load(str(font))
    label.data.body='МАЯК';label.data.align_x='CENTER';label.data.align_y='CENTER'
    label.data.size=.25;label.data.materials.append(b.material('trim'))
    b.configure_render()
    scene=bpy.context.scene;scene.render.resolution_x=1800;scene.render.resolution_y=1250
    camera=b.studio(18,(0,2,1.4))
    bpy.data.objects['preview-floor'].location.z=-.58
    b.render_view(camera,(0,1.8,1.4),65,'iso',OUT/'previews'/'workshop-street.png',23.5)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source'/'workshop-street.blend'))
    scene.render.resolution_x=1600;scene.render.resolution_y=1000
    b.render_view(camera,(0,2.3,2),65,'front',OUT/'previews'/'scale-front.png',18)


report=workshop()
street()
(OUT/'manifest.json').write_text(json.dumps(dict(stage='art-direction-study',assets=[report],
    notes=['Offline Cycles renders, not browser screenshots.','The hero is the unchanged v3 scale reference.',
           'The study is not installed in the game.']),indent=2))
print('STUDY_COMPLETE '+json.dumps(report),flush=True)

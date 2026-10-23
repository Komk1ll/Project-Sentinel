"""Author metric architectural accents and three instanced tree species in Blender.

Submit through Blender Remote with build_web_asset_pack.py and lots.json as inputs.
No textures, cameras or lights are exported. Named lot roots remain at the origin.
"""
import bpy
import hashlib
import json
import math
import sys
from pathlib import Path
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).parent))
import build_web_asset_pack as b

OUT = Path(sys.argv[sys.argv.index('--')+1])
LOTS = json.loads(Path(__file__).with_name('lots.json').read_text(encoding='utf-8'))
b.PALETTE.update(trim='EFE2C5', metal='4B6663', brick='A57A5C', accent='4B8580',
                 oak_bark='80624B', oak_foliage='759459', birch_bark='D4CFB8',
                 birch_foliage='90A965', pine_bark='77634F', pine_foliage='507D68')


def beam(name, start, end, width, mat):
    a, c = Vector(b.pos(*start)), Vector(b.pos(*end))
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=width/2, radius2=width*.30,
                                   depth=(c-a).length, location=(a+c)/2)
    obj = bpy.context.object
    obj.rotation_euler = (c-a).to_track_quat('Z', 'Y').to_euler()
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return b.finish(obj, name, mat)


def window_detail(x, y, z, side=False, imported=False, narrow=False):
    # Keep details outside existing opaque glass and preserve visible glass area.
    before = set(bpy.context.scene.objects)
    width = .8 if narrow else 1.25 if imported else 1.1
    b.box('sill', (0,-.79,.15), (width+.20,.12,.36), 'trim')
    b.box('lintel', (0,.79,.08), (width+.13,.10,.20), 'trim')
    b.box('mullion', (0,0,.105), (.045,1.21,.045), 'trim')
    b.box('crossbar', (0,.12,.105), (width-.2,.045,.045), 'trim')
    for obj in set(bpy.context.scene.objects)-before:
        if side:
            from mathutils import Matrix
            obj.matrix_world = Matrix.Rotation(math.pi/2,4,'Z') @ obj.matrix_world
        obj.location += Vector(b.pos(x,y,z))


def architecture(lot):
    b.OWNER = b.empty('detail-'+lot['id'])
    w,d,h = lot['width'],lot['depth'],lot['floors']*3.2
    imported = lot['id']=='clinic' or (w==9 and d==8 and lot['floors']==2)
    if lot['id'] != 'station':
        for floor in range(lot['floors']):
            yy = floor*3.2+1.7
            columns = max(2, math.floor((w-1)/1.65))
            xs = [-3.45,-1.75,1.75,3.45] if imported else [(i+.5)*w/columns-w/2 for i in range(columns)]
            for x in xs:
                if floor==0 and abs(x)<1.25: continue
                window_detail(x,yy,d/2+.025,imported=imported,narrow=floor==0 and abs(x)<1.5)
            zs = [-2.35,0,2.35] if imported else [(-d/2+1.4)+i*2.1 for i in range(math.ceil((d-2.2)/2.1))]
            for z in zs:
                window_detail(w/2+.025,yy,z,True,imported)
            if floor:
                for side in [-1,1]:
                    b.box('floor-course',(side*(w/2+.06),floor*3.2,0),(.12,.13,d), 'trim')
                b.box('front-course',(0,floor*3.2,d/2+.06),(w,.13,.12),'trim')
    # Drainage and roof equipment read at game camera distance.
    for x in [-w/2+.18,w/2-.18]:
        b.box('downpipe',(x,h/2,d/2+.16),(.09,h-.25,.09),'metal')
    b.box('front-gutter',(0,h+.13,d/2+.21),(w+.3,.12,.12),'metal')
    b.box('rear-gutter',(0,h+.13,-d/2-.21),(w+.3,.12,.12),'metal')
    for x in [-w*.28,w*.28]:
        top = h+(.9 if lot['kind'] in ['home','cafe','workshop'] else .4)
        b.box('chimney',(x,top+.22,-d*.15),(.56,1.0,.55),'brick',.025)
        b.box('chimney-cap',(x,top+.76,-d*.15),(.72,.14,.70),'trim')
        b.box('chimney-opening',(x,top+.84,-d*.15),(.42,.025,.40),'metal')
    if lot['kind'] in ['shop','cafe','library','townhall']:
        # Canopy starts above sign and door; no new ground obstacle.
        b.box('canopy',(0,3.10,d/2+.40),(3.05,.10,.96),'accent')
        for i in [-1,0,1]:
            b.box('canopy-stripe',(i*.9,3.16,d/2+.40),(.32,.02,.96),'trim')
        for x in [-1.35,1.35]:
            beam('canopy-bracket',(x,2.68,d/2+.09),(x,3.06,d/2+.78),.065,'metal')
    if lot['kind'] in ['home','cafe']:
        for x in [-w*.30,w*.30]:
            b.box('window-box',(x,3.95,d/2+.26),(1.05,.24,.38),'brick')
            # Small sculpted shrubs, batched into the accent material.
            for offset in [-.3,0,.3]:
                bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=b.pos(x+offset,4.15,d/2+.27))
                herb=bpy.context.object;herb.scale=(.165,.15,.15)
                bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
                b.finish(herb,'window-herbs','accent')


def crown(name, xyz, size, species):
    # 80 triangles per lobed cluster; broad silhouettes survive distance.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=5, radius=1, location=b.pos(*xyz))
    obj=bpy.context.object
    for vert in obj.data.vertices:
        angle=math.atan2(vert.co.y,vert.co.x)
        vert.co *= 1+.075*math.sin(angle*5+vert.co.z*3)
    obj.dimensions=(size[0],size[2],size[1])
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for poly in obj.data.polygons: poly.use_smooth=True
    b.finish(obj,name,species+'_foliage')


def tree(species):
    b.OWNER=b.empty('tree-'+species)
    beam('trunk',(0,0,0),(0,3.15,0),.36,species+'_bark')
    if species=='pine':
        for level,(y,r) in enumerate([(1.95,1.25),(2.65,1.0),(3.30,.72),(3.86,.40)]):
            # Ragged tier outline instead of a single smooth cone.
            n=14;vertices=[(0,y+.69,0)]
            vertices += [(math.cos(i*math.tau/n)*r*(1 if i%2 else .88),y-.18*(i%2),math.sin(i*math.tau/n)*r*(1 if i%2 else .88)) for i in range(n)]
            faces=[(0,i+1,(i+1)%n+1) for i in range(n)]+[tuple(range(n,0,-1))]
            b.mesh('needle-tier',vertices,faces,species+'_foliage')
            for i in range(3):
                a=i*math.tau/3+level
                beam('branch',(0,y-.25,0),(math.cos(a)*r*.85,y,math.sin(a)*r*.85),.065,species+'_bark')
    else:
        for i in range(6):
            a=i*math.tau/5+.25
            if i==5:
                x,z,y=0,0,3.75
            else:
                radius=.68 if species=='oak' else .50
                x,z,y=math.cos(a)*radius,math.sin(a)*radius,2.5+(i%3)*.33
            beam('branch',(0,1.6+i*.14,0),(x,y,z),.12,species+'_bark')
            crown('leaf-cluster',(x,y+.25,z),(1.45 if species=='oak' else 1.18,1.35 if species=='oak' else 1.65,1.40 if species=='oak' else 1.15),species)
        if species=='birch':
            for i in range(7):
                b.box('bark-mark',(.01, .3+i*.32,.16-i*.007),(.15,.045,.02),'metal')
                # Keep a single bark material; vertex colour distinguishes the birch markings.
                obj=bpy.context.object;obj.data.materials.clear();obj.data.materials.append(b.material('birch_bark'))
                obj['dark_bark_mark']=True
            mat=b.material('birch_bark')
            tint=mat.node_tree.nodes.new('ShaderNodeVertexColor');tint.layer_name='BarkTint'
            bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
            bark_color=tuple(bsdf.inputs['Base Color'].default_value)
            mat.node_tree.links.new(tint.outputs['Color'],bsdf.inputs['Base Color'])
            for obj in b.OWNER.children:
                if obj.type!='MESH' or obj.data.materials[0]!=mat:continue
                attribute=obj.data.color_attributes.new(name='BarkTint',type='BYTE_COLOR',domain='CORNER')
                obj.data.color_attributes.active_color=attribute
                factor=.18 if obj.get('dark_bark_mark') else 1
                for color in attribute.data:color.color=tuple(c*factor for c in bark_color[:3])+(1,)


def export_pack(name, root_prefix):
    objects=list(bpy.context.scene.objects)
    meshes=[o for o in objects if o.type=='MESH']
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source'/(name+'.blend')))
    b.combine_batches()
    bpy.ops.object.select_all(action='SELECT')
    path=OUT/'models'/(name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
                             export_yup=True,export_texcoords=False,export_animations=False,export_cameras=False,export_lights=False)
    b.reset();bpy.ops.import_scene.gltf(filepath=str(path))
    result={'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'groups':{}}
    for root in [o for o in bpy.context.scene.objects if o.name.startswith(root_prefix) and o.type=='EMPTY']:
        parts=[o for o in root.children_recursive if o.type=='MESH'];triangles=0
        for part in parts:part.data.calc_loop_triangles();triangles+=len(part.data.loop_triangles)
        result['groups'][root.name]={'triangles':triangles,'meshes':len(parts),'bounds':b.bounds(parts)}
    return result


b.reset()
for lot in LOTS:architecture(lot)
report={'architecture-details':export_pack('architecture-details','detail-')}
b.reset()
for species in ['oak','birch','pine']:tree(species)
report['tree']=export_pack('tree','tree-')
assert len(report['architecture-details']['groups'])==len(LOTS)
assert len(report['tree']['groups'])==3
assert sum(g['triangles'] for g in report['architecture-details']['groups'].values())<18000
assert all(g['triangles']<1000 for g in report['tree']['groups'].values())
# Render actual reimported tree variants side by side at consistent metric scale.
for index,species in enumerate(['oak','birch','pine']):
    bpy.data.objects['tree-'+species].location.x=(index-1)*3.6
b.configure_render();camera=b.studio(11,(0,2,0))
bpy.context.scene.render.resolution_x=1400;bpy.context.scene.render.resolution_y=700
b.render_view(camera,(0,2.1,0),25,'iso',OUT/'previews'/'trees.png',17)
(OUT/'manifest.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('DETAIL_PACK_COMPLETE '+json.dumps(report),flush=True)

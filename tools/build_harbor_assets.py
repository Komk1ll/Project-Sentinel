"""Original lightweight lighthouse, pier, boats and coastal vegetation."""
import bpy,sys,math,json,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import build_web_asset_pack as b
OUT=Path(sys.argv[sys.argv.index('--')+1])
b.PALETTE.update(ivory='DCD3B5',red='A75A49',roof='37555B',glass='537B83',lamp='FFE0A5',
 wood='917351',wood_light='AA8B65',iron='40575A',rope='C1AC84',stone='999D8B',grass='84946B',hull='547E82')
b.reset()
def cyl(name,xyz,r1,r2,height,mat,n=20):
    bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r1,radius2=r2,depth=height,location=b.pos(*xyz))
    return b.finish(bpy.context.object,name,mat)
def glow(key,power):
    mat=b.material(key);bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bsdf.inputs['Emission Color'].default_value=mat.diffuse_color;bsdf.inputs['Emission Strength'].default_value=power

b.OWNER=b.empty('lighthouse')
cyl('stone-foundation',(0,.18,0),2.05,2.05,.36,'stone')
cyl('tower',(0,4.25,0),1.65,.92,7.8,'ivory')
for y in [3,5.5]:
    radius=lambda h:1.65-(h-.35)/7.8*.73
    cyl('red-band',(0,y,0),radius(y-.34)+.012,radius(y+.34)+.012,.68,'red')
b.box('entry',(0,1.15,1.59),(.72,1.6,.10),'roof',.035)
b.box('entry-lintel',(0,2.0,1.61),(.93,.16,.20),'ivory')
for y in [3.9,6.5]:
    r=1.65-(y-.35)/7.8*.73
    b.box('window-frame',(0,y,r),(.50,.85,.13),'roof',.03)
    b.box('lit-window',(0,y,r+.073),(.35,.66,.012),'lamp')
cyl('gallery',(0,8.22,0),1.65,1.65,.18,'roof')
for i in range(16):
    a=i*math.tau/16;x=math.cos(a)*1.53;z=math.sin(a)*1.53
    cyl('gallery-post',(x,8.72,z),.035,.035,.85,'iron',8)
    nxt=(i+1)*math.tau/16
    # Rail follows the polygon, preserving a light silhouette.
    dx=math.cos(nxt)*1.53-x;dz=math.sin(nxt)*1.53-z
    obj=b.box('gallery-rail',(x+dx/2,9.12,z+dz/2),(.055,.065,math.hypot(dx,dz)),'iron')
    obj.rotation_euler.z=math.atan2(dx,dz)
cyl('lantern-glazing',(0,9.25,0),.94,.94,1.85,'glass',8)
for i in range(8):
    a=(i+.5)*math.tau/8
    cyl('lantern-mullion',(math.cos(a)*.95,9.25,math.sin(a)*.95),.045,.045,1.9,'iron',8)
cyl('lantern-light',(0,9.25,0),.957,.957,.30,'lamp',8)
cyl('roof-eave',(0,10.23,0),1.18,1.18,.14,'roof',8)
cyl('lantern-roof',(0,10.72,0),1.21,.12,.88,'roof',8)
cyl('finial',(0,11.35,0),.045,.045,.65,'iron',8)

b.OWNER=b.empty('pier')
for i in range(55):
    z=(i+.5)*19.2/55
    b.box('deck-board',(0,-.025,z),(3.6,.14,19.2/55-.012),'wood_light' if i%4==0 else 'wood')
for i in range(11):
    z=19.2+(i+.5)*3.6/11
    b.box('cross-deck',(0,-.025,z),(14,.14,3.6/11-.012),'wood_light' if i%3==0 else 'wood')
for side in [-1,1]:
    b.box('support-beam',(side*1.4,-.23,9.6),(.20,.30,19.2),'wood')
    for z in [1,4,7,10,13,16,19]:
        cyl('piling',(side*1.66,-.65,z),.13,.13,2.1,'wood',10)
    for z in [7,10,13,16,19]:
        cyl('rail-post',(side*1.66,.55,z),.065,.065,1.12,'iron',8)
    for y in [.52,1.05]:b.box('side-rail',(side*1.66,y,13),(.055,.055,12),'rope')
    for x in [side*3,side*5,side*6.8]:
        cyl('cross-piling',(x,-.65,22.6),.13,.13,2.1,'wood',10)
        cyl('cross-post',(x,.55,22.6),.065,.065,1.12,'iron',8)
    for x in [side*4.2,side*6.8]:cyl('front-post',(x,.55,19.35),.065,.065,1.12,'iron',8)
    b.box('cross-front-rail',(side*4.35,1.05,19.35),(5.1,.055,.055),'rope')
    b.box('cross-side-rail',(side*6.8,1.05,21),(.055,.055,3.2),'rope')
for y in [.52,1.05]:b.box('cross-back-rail',(0,y,22.6),(13.6,.055,.055),'rope')
for x,z in [(-1.5,4),(1.5,5),(-6.5,21),(6.5,21)]:
    cyl('bollard',(x,.22,z),.12,.12,.45,'iron',10)
    b.box('bollard-cap',(x,.44,z),(.40,.08,.12),'iron',.02)

for side in [-1,1]:
    cyl('pier-lamp-pole',(side*6,1.0,21.5),.055,.055,2,'iron',8)
    b.box('pier-lamp',(side*6,2.0,21.5),(.22,.33,.22),'lamp')
    b.box('pier-lamp-cap',(side*6,2.20,21.5),(.32,.07,.32),'roof')

b.OWNER=b.empty('boat')
vertices=[(-.73,.18,-1.9),(.73,.18,-1.9),(-.85,.18,.9),(.85,.18,.9),(0,.27,2.35),
          (-.43,-.3,-1.75),(.43,-.3,-1.75),(-.45,-.3,.8),(.45,-.3,.8),(0,-.23,1.9)]
b.mesh('hull',vertices,[(0,5,6,1),(0,2,7,5),(1,6,8,3),(2,4,9,7),(3,8,9,4),(5,7,8,6),(7,9,8)],'hull')
b.box('floor',(0,-.12,-.3),(1.1,.10,3.1),'wood')
for z in [-1.2,.0,.9]:b.box('seat',(0,.18,z),(1.5,.10,.25),'wood_light')
for side in [-1,1]:b.box('gunwale',(side*.78,.23,-.5),(.10,.10,2.9),'ivory')
b.box('stern-gunwale',(0,.23,-1.9),(1.5,.10,.10),'ivory')
for side in [-1,1]:
    obj=b.box('bow-gunwale',(side*.41,.25,1.62),(.09,.10,1.68),'ivory');obj.rotation_euler.z=-side*.53
b.box('oar',(0,.30,-.3),(.07,.07,2.6),'wood_light')

b.OWNER=b.empty('coast-rock')
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=b.pos(0,.25,0))
obj=bpy.context.object;obj.scale=(.85,.65,.55);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);b.finish(obj,'stone','stone')
b.OWNER=b.empty('dune-grass')
for i in range(9):
    a=i*2.4;dx=math.cos(a)*.18;dz=math.sin(a)*.18;h=.24+(i%4)*.09
    b.mesh('blade',[(dx-.035,0,dz),(dx+.035,0,dz),(dx+math.cos(a)*.16,h,dz+math.sin(a)*.16)],[(0,1,2)],'grass')
b.material('grass').surface_render_method='DITHERED'
b.material('grass').use_backface_culling=False
glow('lamp',2)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source'/'harbor-kit.blend'))
b.combine_batches();bpy.ops.object.select_all(action='SELECT')
path=OUT/'models'/'harbor-kit.glb'
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_texcoords=False,export_animations=False,export_cameras=False,export_lights=False)
report={'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
(OUT/'manifest.json').write_text(json.dumps(report,indent=2))
b.reset();bpy.ops.import_scene.gltf(filepath=str(path))
bpy.data.objects['pier'].location.x=8
bpy.data.objects['boat'].location.x=3
bpy.data.objects['coast-rock'].location.x=-3
bpy.data.objects['dune-grass'].location.x=-4
b.configure_render();camera=b.studio(30,(4,3,8));bpy.context.scene.render.resolution_x=1400;bpy.context.scene.render.resolution_y=1000
b.render_view(camera,(4,3,8),42,'iso',OUT/'previews'/'harbor-kit.png',42)
print('HARBOR_COMPLETE '+json.dumps(report),flush=True)

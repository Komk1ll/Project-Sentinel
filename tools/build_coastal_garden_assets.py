"""Original metre-scale landscape modules for the approved coastal garden concept."""
import bpy,sys,math,json,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import build_web_asset_pack as b
OUT=Path(sys.argv[sys.argv.index('--')+1])
b.PALETTE.update(stone='999B88',stone_light='BCB69D',stone_dark='737E75',wood='927558',
    foliage='718F52',foliage_light='91A461',fruit='C68C4C',petal='E7BB76',pink='C88C96',reed='819468')
b.reset()
def ico(name,xyz,size,mat):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=b.pos(*xyz))
    obj=bpy.context.object;obj.scale=(size[0]/2,size[2]/2,size[1]/2)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return b.finish(obj,name,mat)
def cone(name,xyz,r1,r2,height,mat,n=8):
    bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r1,radius2=r2,depth=height,location=b.pos(*xyz))
    return b.finish(bpy.context.object,name,mat)

b.OWNER=b.empty('cliff-module')
# Four staggered rings create broad weathered planes instead of an icosphere pebble.
rings=[]
for level,(y,scale,shift) in enumerate([(-1.25,.9,0),(-.25,1.06,.07),(.45,.94,-.08),(1.25,.65,.12)]):
    rings.append([(math.cos(i*math.tau/8)*2*scale+shift,y+math.sin(i*2.8+level)*.15,
                   math.sin(i*math.tau/8)*1.4*scale) for i in range(8)])
for row in range(3):
    verts=rings[row]+rings[row+1]
    b.mesh('stratum',verts,[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)],['stone_dark','stone','stone_light'][row])
b.mesh('summit',rings[-1],[tuple(range(8))],'stone_light')
b.mesh('base',rings[0],[tuple(reversed(range(8)))],'stone_dark')

b.OWNER=b.empty('seawall')
b.box('wall',(0,-.02,0),(2,1.1,.42),'stone')
b.box('cap',(0,.57,0),(2.05,.12,.53),'stone_light',.018)
for y in [-.32,.04,.36]:
    b.box('course',(0,y,.214),(2,.018,.012),'stone_dark')
for x,y in [(-.5,-.15),(.5,-.15),(0,.20)]:
    b.box('joint',(x,y,.214),(.018,.30,.012),'stone_dark')

b.OWNER=b.empty('garden-fence')
for x in [-.98,.98]:
    b.box('post',(x,.48,0),(.10,.96,.10),'wood',.015)
for y in [.30,.70]:b.box('rail',(0,y,0),(2,.07,.065),'wood',.008)

b.OWNER=b.empty('apple-tree')
cone('trunk',(0,1.25,0),.18,.105,2.5,'wood',10)
for i in range(4):
    a=i*math.tau/4
    obj=cone('branch',(math.cos(a)*.35,2.0,math.sin(a)*.35),.075,.035,1.2,'wood')
    obj.rotation_euler.x=math.cos(a)*.55;obj.rotation_euler.y=math.sin(a)*.55
for i in range(5):
    a=i*2.4;ico('crown',(math.cos(a)*.7,2.85+(i%2)*.45,math.sin(a)*.65),(1.7,1.6,1.6),'foliage' if i%2 else 'foliage_light')
for i in range(12):
    a=i*2.4;ico('apple',(math.cos(a)*1.06,2.5+(i%4)*.3,math.sin(a)*1.06),(.14,.15,.14),'fruit')

b.OWNER=b.empty('flower-cluster')
for i in range(7):
    a=i*2.4;x=math.cos(a)*.35;z=math.sin(a)*.30;h=.25+(i%3)*.12
    b.mesh('stem',[(x-.012,0,z),(x+.012,0,z),(x+.012,h,z),(x-.012,h,z)],[(0,1,2,3)],'foliage')
    vertices=[(x,h+.025,z)]+[(x+math.cos(j*math.tau/8)*.10,h,z+math.sin(j*math.tau/8)*.10) for j in range(8)]
    b.mesh('flower',vertices,[(0,j+1,(j+1)%8+1) for j in range(8)],'petal' if i%2 else 'pink')
    b.mesh('leaf',[(x,.08,z),(x+.15,h*.55,z+.06),(x,h*.7,z)],[(0,1,2)],'foliage')

b.OWNER=b.empty('reed-cluster')
for i in range(12):
    a=i*2.4;x=math.cos(a)*.32;z=math.sin(a)*.28;h=.45+(i%4)*.12
    b.mesh('blade',[(x-.025,0,z),(x+.025,0,z),(x+math.cos(a)*.15,h,z+math.sin(a)*.15)],[(0,1,2)],'reed')
for key in ['foliage','foliage_light','petal','pink','reed']:b.material(key).use_backface_culling=False

b.OWNER=b.empty('garden-bridge')
def deck_height(x):return min(.24,(8.5-abs(x))*.12)
for i in range(51):
    x=-8.5+(i+.5)*17/51
    b.box('plank',(x,deck_height(x)-.065,0),(17/51-.015,.13,2.6),'wood')
for side in [-1,1]:
    for x in [-8,-6,-4,-2,0,2,4,6,8]:
        h=deck_height(x)
        b.box('post',(x,h+.5,side*1.18),(.075,1.0,.075),'wood')
    for i in range(16):
        x=-8+(i+.5);h=deck_height(x)
        b.box('rail',(x,h+.92,side*1.18),(1.03,.07,.07),'wood')
    for x in [-6,-2,2,6]:cone('foot',(x,-.28,side*1.05),.09,.09,1.0,'wood')

bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source'/'coastal-garden-kit.blend'))
b.combine_batches();bpy.ops.object.select_all(action='SELECT')
path=OUT/'models'/'coastal-garden-kit.glb'
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_texcoords=False,export_animations=False,export_cameras=False,export_lights=False)
report={'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'roots':[obj.name for obj in bpy.context.scene.objects if obj.parent is None]}
(OUT/'manifest.json').write_text(json.dumps(report,indent=2))
b.reset();bpy.ops.import_scene.gltf(filepath=str(path))
for name,x,z in [('cliff-module',-6,1),('seawall',-3,-3),('garden-fence',0,-3),('apple-tree',3,1),('flower-cluster',0,1),('reed-cluster',-2,1),('garden-bridge',0,6)]:
    bpy.data.objects[name].location=b.pos(x,0,z)
b.configure_render();camera=b.studio(28,(0,1,2));bpy.context.scene.render.resolution_x=1500;bpy.context.scene.render.resolution_y=1000
b.render_view(camera,(0,1,2),24,'iso',OUT/'previews'/'coastal-garden-kit.png',24)
print('COASTAL_GARDEN_COMPLETE '+json.dumps(report),flush=True)

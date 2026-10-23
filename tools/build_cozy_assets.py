"""Reproducible Blender source for the original CyberShield cozy town asset set.
Run: blender -b -t 6 -P tools/build_cozy_assets.py -- <repository root>
World X/Y/Z maps to Blender X/-Y/Z through p(x, height, depth).
"""
import bpy, json, math, os, random, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(sys.argv[sys.argv.index('--')+1]); OUT=ROOT/'public/assets/models/cozy'; SRC=ROOT/'art/source'; PRE=ROOT/'art/previews'
DATA=json.loads((SRC/'town-layout.json').read_text()); random.seed(42)
for folder in (OUT,SRC,PRE): folder.mkdir(parents=True,exist_ok=True)
FONT=os.environ.get('CYBERSHIELD_FONT', str(SRC/'fonts/DejaVuSans.ttf'))
if not Path(FONT).is_file(): raise RuntimeError('Set CYBERSHIELD_FONT to a Cyrillic-capable TTF font before exporting')
bpy.context.preferences.filepaths.save_version=0
materials={}; manifest=[]

def reset():
 bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
 for block in (bpy.data.meshes,bpy.data.curves,bpy.data.materials):
  for item in list(block):
   if item.users==0: block.remove(item)
 materials.clear()

def srgb_linear(value):return value/12.92 if value<=.04045 else ((value+.055)/1.055)**2.4

def mat(name,hexcolor,rough=.75,metal=0,emission=0):
 if name in materials:return materials[name]
 m=bpy.data.materials.new(name); m.diffuse_color=tuple(srgb_linear(int(hexcolor[i:i+2],16)/255) for i in (0,2,4))+(1,);m.use_nodes=True
 bs=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None) or m.node_tree.nodes.new('ShaderNodeBsdfPrincipled'); output=next((n for n in m.node_tree.nodes if n.type=='OUTPUT_MATERIAL'),None) or m.node_tree.nodes.new('ShaderNodeOutputMaterial'); m.node_tree.links.new(bs.outputs['BSDF'],output.inputs['Surface']); bs.inputs['Base Color'].default_value=m.diffuse_color;bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 if emission:bs.inputs['Emission Color'].default_value=m.diffuse_color;bs.inputs['Emission Strength'].default_value=emission
 materials[name]=m;return m

def p(x,h,z):return (x,-z,h)
def parent(obj,owner):
 if owner:obj.parent=owner;obj.matrix_parent_inverse=owner.matrix_world.inverted()
 return obj

def box(name,x,h,z,w,high,d,m,bevel=.035,owner=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p(x,h,z));o=bpy.context.object;o.name=name;o.dimensions=(w,d,high)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:
  mod=o.modifiers.new('Soft crafted edges','BEVEL');mod.width=min(bevel,min(w,high,d)*.18);mod.segments=2
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return parent(o,owner)

def sphere(name,x,h,z,sx,sy,sz,m,owner=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=p(x,h,z));o=bpy.context.object;o.name=name;o.scale=(sx,sz,sy);o.data.materials.append(m)
 for poly in o.data.polygons:poly.use_smooth=True
 return parent(o,owner)

def cylinder(name,x,h,z,r,high,m,owner=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=high,location=p(x,h,z));o=bpy.context.object;o.name=name;o.data.materials.append(m)
 return parent(o,owner)

def empty(name,x=0,h=0,z=0):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=p(x,h,z);bpy.context.view_layer.update();return o

def sign(text,x,h,z,w):
 cream=mat('Lettering','F4E5C7');blue=mat('Sign teal','305B60')
 box('Enamel sign',x,h,z,w,.5,.1,blue)
 curve=bpy.data.curves.new('Sign lettering','FONT');curve.body=text;curve.align_x='CENTER';curve.align_y='CENTER';curve.size=.22;curve.extrude=.004
 if Path(FONT).exists():curve.font=bpy.data.fonts.load(FONT,check_existing=True)
 o=bpy.data.objects.new('Sign '+text,curve);bpy.context.collection.objects.link(o);o.location=p(x,h,z+.065);o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(cream)
 bpy.context.view_layer.update()
 if o.dimensions.x>w-.15:o.scale.x=(w-.15)/o.dimensions.x
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)

def roof(x,h,z,w,d,wall,m):
 rise=min(w*.22,1.65)
 points=[(x-w/2,h,z-d/2),(x+w/2,h,z-d/2),(x-w/2,h,z+d/2),(x+w/2,h,z+d/2),(x,h+rise,z-d/2),(x,h+rise,z+d/2)]
 mesh=bpy.data.meshes.new('Gabled roof');mesh.from_pydata([p(*v) for v in points],[],[(0,2,5,4),(4,5,3,1),(0,4,1),(2,3,5)]);mesh.materials.append(m);mesh.materials.append(wall)
 obj=bpy.data.objects.new('Pitched roof',mesh);bpy.context.collection.objects.link(obj)
 for poly in mesh.polygons:poly.material_index=1 if poly.index>1 else 0
 box('Roof ridge',x,h+rise,z,.18,.18,d+.15,m)
 for edge in (-1,1): box('Rain gutter',x+edge*w/2,h-.03,z,.13,.14,d+.1,mat('Gutter','DBD7BD'))
 for t in range(1,int(d/0.5)):
  zz=z-d/2+t*.5
  # Thin roof seams remain subtle at gameplay scale.
  for side in (-1,1):
   ob=box('Roof seam',x+side*w/4,h+rise/2+.02,zz,math.hypot(w/2,rise),.025,.035,m,0)
   ob.rotation_euler[1]=side*math.atan2(rise,w/2)

def town():
 reset(); grass=mat('Sage meadow','91A981');stone=mat('Warm limestone','D8D2BA');road=mat('Slate road','687879');trim=mat('Ivory trim','F0DFBD');wood=mat('Honey oak','AF8055');trunk=mat('Bark','795B48')
 box('District plinth',32,-.32,32,65,.8,65,mat('Island edge','71897A'),.4)
 box('Meadow',32,.04,32,64,.12,64,grass,.15)
 def road_segments(half_width):
  start=0
  for center in sorted(DATA['roads']):
   if center-half_width>start:yield start,center-half_width
   start=center+half_width
  if start<64:yield start,64
 for r in DATA['roads']:
  box('Sidewalk',r,.08,32,6.7,.08,64,stone,0)
  for lo,hi in road_segments(3.35):box('Sidewalk',(lo+hi)/2,.08,r,hi-lo,.08,6.7,stone,0)
  box('Street',r,.12,32,4.1,.06,64,road,0)
  for lo,hi in road_segments(2.05):box('Street',(lo+hi)/2,.12,r,hi-lo,.06,4.1,road,0)
  for side in (-1,1):
   for lo,hi in road_segments(3.35):
    box('Kerb',r+side*2.18,.16,(lo+hi)/2,.18,.18,hi-lo,trim)
    box('Kerb',(lo+hi)/2,.16,r+side*2.18,hi-lo,.18,.18,trim)
  for k in range(1,64,3):
   if not any(abs(k-o)<4 for o in DATA['roads']):
    box('Lane mark',r,.16,k,.07,.01,.8,trim,0);box('Lane mark',k,.16,r,.8,.01,.07,trim,0)
 for x in DATA['roads']:
  for z in DATA['roads']:
   for stripe in range(5):
    box('Crosswalk',x-1.6+stripe*.8,.175,z+3.7,.42,.012,1.25,trim,0)
    box('Crosswalk',x+3.7,.175,z-1.6+stripe*.8,1.25,.012,.42,trim,0)
 palettes=['D9BE91','E0B8A0','A6B8A0','B8C4C2','D5C9A9'];roofs=['47727A','667B70','AD7761']
 names={'station':'МАЯК','clinic':'ПОЛИКЛИНИКА','library':'БИБЛИОТЕКА','townhall':'ЗАРЕЧЕНСК','cafe':'ЛИСТВА','bakery':'ТЁПЛЫЙ ХЛЕБ','grocery':'У ДОМА','post':'ПОЧТА'}
 for index,b in enumerate(DATA['buildings']):
  print('BUILDING',b['id'],flush=True)
  x,z,w,d=b['x'],b['z'],b['width'],b['depth'];h=b['floors']*2.25;front=z+d/2
  wall=mat('Facade '+str(index%5),palettes[index%5]);rm=mat('Roof '+str(index%3),roofs[index%3]);glass=mat('Warm window','F3D59D',.3,0,.25);dark=mat('Window shade','4C6D70')
  box('Paved lot',x,.14,z,w+.8,.18,d+.8,stone)
  box('Facade '+b['id'],x,h/2+.2,z,w,h,d,wall,.12)
  box('Stone foundation',x,.4,z,w+.12,.5,d+.12,mat('Sandstone','BCAB8A'))
  for floor in range(b['floors']):
   yy=floor*2.25+1.4
   for j in range(max(2,int(w/1.8))):
    xx=x-w/2+(j+.5)*w/max(2,int(w/1.8))
    if floor==0 and abs(xx-x)<1:continue
    box('Window frame',xx,yy,front+.06,.97,1.25,.12,trim)
    box('Glass',xx,yy,front+.14,.77,1.05,.055,glass if (j+floor)%3 else dark)
    box('Mullion',xx,yy,front+.18,.045,1.1,.04,trim)
    box('Sill',xx,yy-.66,front+.21,1.13,.1,.35,trim)
    if floor==0:
     box('Planter',xx,yy-.8,front+.23,.87,.17,.3,wood)
     for q in (-.26,0,.26):sphere('Window flowers',xx+q,yy-.67,front+.25,.16,.12,.12,mat('Flowers','C18478'))
   for side in (-1,1):
    for j in range(max(2,int(d/2))):
     zz=z-d/2+(j+.5)*d/max(2,int(d/2))
     box('Side frame',x+side*(w/2+.05),yy,zz,.12,1.25,.97,trim)
     box('Side glass',x+side*(w/2+.13),yy,zz,.04,1.05,.77,glass if j%2 else dark)
   box('Cornice',x,(floor+1)*2.25+.16,z,w+.22,.13,d+.22,trim)
  box('Door casing',x,1.08,front+.12,1.3,1.93,.21,trim)
  box('Teal door',x,1.03,front+.25,1.03,1.75,.08,mat('Door','365F65'))
  box('Door glass',x,1.25,front+.3,.67,.85,.03,glass)
  sphere('Brass handle',x+.32,.85,front+.35,.045,.045,.045,mat('Brass','C5A16B',.35,.5))
  box('Welcome step',x,.24,front+.55,1.55,.25,.9,stone)
  roof(x,h+.23,z,w+.55,d+.55,wall,rm)
  box('Chimney',x+w*.25,h+.75,z-d*.2,.6,1.1,.55,mat('Chimney brick','B58A73'))
  box('Chimney cap',x+w*.25,h+1.32,z-d*.2,.77,.13,.72,trim)
  if b['kind']!='home':
   sign(names.get(b['id'],b['name']).upper(),x,2.1,front+.42,min(w-.4,5))
   awning=mat('Awning '+str(index%2),'B77561' if index%2 else '477A73')
   box('Shop canopy',x,2.65,front+.55,min(w-.3,5.6),.17,1.1,awning)
   for j in range(7):box('Canopy stripe',x-2.35+j*.78,2.75,front+.55,.28,.025,1.12,trim,0)
 # Park has open paths and low ornamental detail.
 box('Park lawn',24,.17,24,11.8,.12,11.8,mat('Park grass','7F9E79'),.3)
 box('Park path',24,.25,24,1.7,.08,12,stone);box('Park path',24,.25,24,12,.08,1.7,stone)
 box('Memorial base',24,.5,24,1.8,.7,1.8,mat('Memorial stone','ACA996'),.1)
 box('Memorial pillar',24,1.6,24,.8,1.5,.8,mat('Memorial bronze','537D74'),.1)
 sphere('Memorial lantern',24,2.6,24,.5,.5,.5,mat('Lantern glass','F5DBA8',.25,0,.3))
 trees=[(19,19),(29,19),(19,29),(29,29),(3,17),(12,19),(3,31),(60,32),(51,3),(31,3),(35,61),(19,60),(61,46),(3,48),(20,3),(45,3),(51,18),(18,51)]
 leaves=[mat('Leaf sage','6D956E'),mat('Leaf gold','D0AC68'),mat('Leaf light','A7B478')]
 for idx,(x,z) in enumerate(trees):
  cylinder('Tree trunk',x,1.3,z,.17,2.5,trunk)
  for n in range(6):
   a=n*math.tau/6;sphere('Rounded foliage',x+math.cos(a)*.6,2.8+(n%2)*.45,z+math.sin(a)*.6,.95,.95,.95,leaves[(idx+n//3)%3])
  cylinder('Tree crown',x,3.25,z,.8,.9,leaves[idx%3])
 for x,z in [(20,22),(28,26),(27,20),(21,28)]:
  box('Bench seat',x,.65,z,1.65,.17,.55,wood)
  box('Bench back',x,1.03,z-.3,1.65,.5,.13,wood)
  for side in (-.6,.6):box('Bench leg',x+side,.35,z,.12,.6,.45,mat('Iron','365259'))
 for x,z in [(14,19),(18,35),(30,45),(34,29),(46,43),(50,19),(30,11),(34,53)]:
  cylinder('Street lamp',x,1.6,z,.065,3.1,mat('Iron','365259'));box('Lamp housing',x,3.2,z,.42,.5,.42,mat('Lantern glass','F5DBA8',.25,0,.3),.08)
  box('Lamp cap',x,3.5,z,.55,.12,.55,mat('Iron','365259'))
 for c in DATA['cars']:
  x,z=c['x'],c['z'];swapped=abs(math.sin(c['rotation']))>.5;w,d=(2.7,1.3) if swapped else (1.3,2.7)
  box('Parked car',x,.65,z,w,.8,d,mat('Car paint','769797'),.2);box('Car cabin',x,1.17,z,w*.85,.6,d*.55,mat('Car paint','769797'),.16)
  box('Car windshield',x,1.2,z+d*.28,w*.7,.35,.04,mat('Window shade','4C6D70'))
  for a in (-1,1):
   for q in (-1,1):sphere('Tyre',x+a*w*.46,.34,z+q*d*.33,.2,.25,.2,mat('Rubber','354748'))


def interior(layout):
 reset();ivory=mat('Warm plaster','E5DCC3');floor=mat('Oak floor','C3A47D');tile=mat('Tile','CCDDCE');wood=mat('Honey oak','AC7C50');metal=mat('Steel','668B8C');cloth=mat('Sage upholstery','7D9D87');white=mat('Linen','F3E9D3')
 box('Interior plinth',0,-.16,0,10.3,.35,8.3,mat('Foundation','597877'),.12)
 for r in layout['rooms']:
  m=floor if r['finish']=='wood' else tile if r['finish']=='tile' else mat('Concrete','B7B9A4')
  box('Room floor',r['x'],.025,r['z'],r['width'],.06,r['depth'],m,.015)
  # Simple inlaid lines communicate texture without tiny noisy bitmap detail.
  for zz in range(int(r['depth']/.65)):
   box('Floor joint',r['x'],.06,r['z']-r['depth']/2+(zz+1)*.65,r['width'],.006,.018,mat('Floor seam','A4AF9B'),0)
 box('Rear wall',0,1.5,-4,10,3,.18,ivory);box('Left wall',-5,1.5,0,.18,3,8,ivory)
 box('Right cutaway',5,.3,0,.18,.6,8,ivory)
 for side in (-1,1):box('Front cutaway',side*3,.3,4,4,.6,.18,ivory)
 for part in layout['partitions']:box('Partition',part['x'],part['height']/2,part['z'],part['width'],part['height'],part['depth'],ivory)
 for side in (-1,1):
  box('Wall skirting',side*4.86,.12,0,.1,.22,7.8,wood)
 for x in (-3,1,3):
  box('Window surround',x,1.8,-3.86,1.25,1.45,.12,white)
  box('Window light',x,1.8,-3.77,1.02,1.2,.06,mat('Daylight','D6E9DC',.4,0,.15))
  box('Window crossbar',x,1.8,-3.72,1.04,.06,.03,wood)
  box('Window mullion',x,1.8,-3.7,.06,1.23,.03,wood)
 for f in layout['furniture']:
  x,z,w,d,h,k=f['x'],f['z'],f['width'],f['depth'],f['height'],f['kind']
  if k in ('shelf','wardrobe'):
   box('Cabinet back',x,h/2,z-d*.4,w,h,d*.18,wood)
   for side in (-1,1):box('Cabinet side',x+side*w*.45,h/2,z,w*.1,h,d,wood)
   for row in range(4):
    yy=.12+row*(h-.2)/3;box('Shelf',x,yy,z,w,.1,d,wood)
    if row<3:
     for j in range(max(2,int(w/.22))):box('Books and files',x-w*.4+j*w*.8/max(2,int(w/.22)),yy+.21,z,.12,.32,d*.6,mat('Book'+str(j%3),['8EA89E','C49A77','DBCEAA'][j%3]),.01)
  elif k in ('bed','exam-bed','sofa'):
   box('Furniture base',x,h*.35,z,w,h*.5,d,wood,.06)
   box('Cushion',x,h*.72,z,w*.94,h*.3,d*.93,white if k!='sofa' else cloth,.09)
   if k=='sofa':box('Upholstered back',x+w*.4,h,z,w*.2,h*.8,d,cloth,.1)
   else:
    box('Pillow',x,h*.96,z-d*.28,w*.75,.18,d*.25,white,.09)
    box('Folded blanket',x,h*.94,z+d*.15,w*.94,.1,d*.5,cloth,.03)
  elif k in ('table','desk','workbench','counter','kitchen'):
   box('Rounded worktop',x,h,z,w,.12,d,wood if k!='counter' else white,.045)
   for dx in (-1,1):
    for dz in (-1,1):box('Furniture leg',x+dx*w*.4,h/2,z+dz*d*.35,.09,h,.09,metal)
   if k in ('desk','counter','kitchen'):
    box('Drawer unit',x+w*.28,h*.45,z,w*.35,h*.8,d*.85,ivory)
    for yy in (.25,.55):box('Drawer pull',x+w*.28,h*yy,z+d*.44,w*.15,.035,.04,metal,.01)
   if k=='workbench':
    box('Tool tray',x,h+.12,z,w*.5,.12,d*.5,metal)
    for j in range(3):box('Tools',x+(j-1)*.2,h+.2,z,.06,.06,d*.45,wood,.01)
   if k=='desk':box('Paper stack',x-w*.2,h+.1,z,.4,.08,.3,white,.01)
  elif k=='fridge':
   box('Refrigerator',x,h/2,z,w,h,d,white,.06);box('Fridge handle',x+w*.3,h*.55,z+d*.52,.04,h*.3,.07,metal)
  elif k=='crate':
   box('Supply crate',x,h/2,z,w,h,d,wood)
   for yy in (.2,.7):box('Crate band',x,h*yy,z,w+.04,.08,d+.04,metal)
  else:
   box('Display pedestal',x,h*.4,z,w,h*.8,d,wood)
   cylinder('Pot',x,h*.88,z,min(w,d)*.3,.22,mat('Terracotta','B78369'))
   for a in range(4):sphere('Houseplant',x+math.cos(a)*.1,h+(.1 if a%2 else .25),z+math.sin(a)*.1,.16,.25,.16,mat('Houseplant','6C9476'))
 box('Welcome rug',0,.08,2.65,1.45,.05,1.35,mat('Woven rug','A7B99B'),.08)
 # Wall clock and a framed local photograph give interiors a lived-in focal point.
 cylinder('Clock',-3,2.45,-3.72,.26,.08,wood).rotation_euler[0]=math.pi/2
 box('Notice frame',3,2.35,-3.72,.75,.5,.06,wood)
 box('Notice paper',3,2.35,-3.67,.65,.4,.025,white,.01)
 if layout['kind']=='clinic':sign('ПУНКТ ПОМОЩИ',1.3,2.7,-3.7,2.8)
 if layout['kind']=='workshop':sign('МАЯК · МАСТЕРСКАЯ',1.3,2.7,-3.7,3.5)


def character(role):
 reset();skin=mat('Skin','D8AF8D');hair=mat('Hair','55463C' if role in ('hero','medic') else 'A8A69B');shoe=mat('Boot leather','5C5145');pants=mat('Trousers','52686D')
 cloth=mat('Clothing',{'hero':'3C777F','master':'789379','medic':'F0E6D2','resident':'C29577'}[role]);accent=mat('Accent','CDA161' if role!='medic' else '72A39B')
 body=empty(role+'-root'); seated=role=='resident'
 torso=box('Jacket',0,1.12,0,.54,.66,.35,cloth,.1,body)
 box('Shirt',0,1.34,.18,.22,.3,.04,accent,.03,body)
 for side in (-1,1):
  limb=empty('left-leg' if side<0 else 'right-leg',side*.14,.78,0);parent(limb,body)
  box('Trouser leg',side*.14,.45,.12 if seated else 0,.2,.64 if not seated else .35,.24,pants,.05,limb)
  if seated:box('Bent knee',side*.14,.65,.23,.2,.2,.54,pants,.05,limb)
  box('Boot',side*.14,.12,.1 if not seated else .43,.24,.21,.4,shoe,.06,limb)
  box('Sole',side*.14,.035,.1 if not seated else .43,.25,.045,.4,mat('Sole','3F4947'),.02,limb)
  arm=empty('left-arm' if side<0 else 'right-arm',side*.34,1.4,0);parent(arm,body)
  box('Sleeve',side*.34,1.14,.02,.19,.49,.24,cloth,.07,arm)
  sphere('Hand',side*.34,.84,.03,.105,.125,.105,skin,arm)
 box('Neck',0,1.5,0,.16,.2,.17,skin,.06,body)
 sphere('Face',0,1.77,0,.235,.28,.22,skin,body)
 sphere('Hair cap',0,1.94,-.035,.24,.16,.23,hair,body)
 for side in (-1,1):
  sphere('Ear',side*.235,1.78,0,.05,.075,.045,skin,body)
  sphere('Eye white',side*.082,1.8,.202,.045,.047,.023,mat('Eye white','F9F2DE'),body)
  sphere('Pupil',side*.082,1.8,.224,.019,.026,.012,mat('Eye','34464A'),body)
  box('Eyebrow',side*.082,1.88,.208,.075,.022,.018,hair,.004,body)
 sphere('Nose',0,1.74,.225,.045,.055,.045,skin,body)
 box('Smile',0,1.65,.193,.075,.015,.015,mat('Smile','9D6D58'),.004,body)
 if role=='hero':
  box('Backpack',0,1.12,-.28,.46,.57,.25,mat('Backpack','C49058'),.08,body)
  for side in (-1,1):box('Pack strap',side*.19,1.22,.19,.055,.5,.04,mat('Straps','D8BA85'),.02,body)
 if role=='master':
  box('Apron',0,1.06,.2,.43,.65,.06,mat('Apron','B98757'),.04,body)
  box('Apron pocket',0,.96,.24,.27,.2,.035,accent,.02,body)
 if role=='medic':
  sphere('Hair bun',0,1.88,-.23,.13,.14,.12,hair,body)
  box('Badge',.12,1.29,.22,.1,.13,.025,mat('Badge','DBB268'),.01,body)
  for x in (-.08,.08):cylinder('Stethoscope tube',x,1.25,.21,.018,.3,pants,body)
  sphere('Stethoscope bell',.07,1.06,.24,.06,.06,.025,metal:=mat('Medical steel','A3B9B0',.35,.4),body)
 if role in ('master','medic'):
  kit=empty('aid-kit-parcel',0,.86,.32);parent(kit,body)
  box('Aid kit case',0,.86,.32,.4,.28,.24,mat('Canvas kit','DCD8B8'),.05,kit)
  box('Kit label',0,.87,.45,.17,.13,.025,mat('Kit teal','518E87'),.01,kit)
  box('Kit mark',0,.87,.465,.1,.035,.015,mat('White mark','F0EDDC'),.004,kit)


def join_materials():
 groups={}
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH' and len(o.data.materials)==1:groups.setdefault(o.data.materials[0].name,[]).append(o)
 for name,items in groups.items():
  if len(items)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in items:o.select_set(True)
  bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();items[0].name='Surface '+name

def export(name,merge=False):
 if merge:join_materials()
 file=OUT/(name+'.glb');bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=False)
 manifest.append({'file':file.name,'bytes':file.stat().st_size,'meshes':sum(o.type=='MESH' for o in bpy.context.scene.objects)})
 print('EXPORTED',file.name,file.stat().st_size,flush=True)

def preview(name,target,offset,scale,res=(1100,850)):
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True;scene.cycles.device='CPU';scene.render.resolution_x=res[0];scene.render.resolution_y=res[1];scene.render.resolution_percentage=100
 scene.world.color=(.7,.78,.8);scene.world.use_nodes=True;next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND').inputs[0].default_value=(.72,.8,.84,1);next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND').inputs[1].default_value=.7
 bpy.ops.object.light_add(type='AREA',location=p(target[0]-15,40,target[2]+10));light=bpy.context.object;light.data.energy=2500 if scale>20 else 350;light.data.shape='DISK';light.data.size=25 if scale>20 else 8
 direction=Vector(p(*target))-light.location;light.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.light_add(type='SUN',location=(0,0,20));sun=bpy.context.object;sun.data.energy=1.5;sun.data.angle=.15;sun.rotation_euler=(math.radians(25),math.radians(-25),math.radians(-30))
 bpy.ops.object.camera_add(location=p(target[0]+offset[0],target[1]+offset[1],target[2]+offset[2]));camera=bpy.context.object;camera.rotation_euler=(Vector(p(*target))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=scale;scene.camera=camera
 scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(PRE/(name+'.png'));bpy.ops.render.render(write_still=True)

if '--previews-only' in sys.argv:
 for source,name,target,offset,scale,res in [
  ('zarechensk-cozy','town-overview',(32,0,32),(50,58,58),99,(1100,850)),
  ('hero','hero',(0,1.1,0),(3,1.7,5),3.3,(620,760)),
  ('interior-clinic','clinic-interior',(0,.3,0),(11,10,13),15,(1100,850))]:
  bpy.ops.wm.open_mainfile(filepath=str(SRC/(source+'.blend')))
  preview(name,target,offset,scale,res)
 sys.exit(0)

# Editable sources retain separate parts; exported scenery batches common materials.
town();bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'zarechensk-cozy.blend'));export('town',True);preview('town-overview',(32,0,32),(50,58,58),99)
for role in ('hero','master','medic','resident'):
 character(role);bpy.ops.wm.save_as_mainfile(filepath=str(SRC/(role+'.blend')));export(role)
 if role=='hero':preview('hero',(0,1.1,0),(3,1.7,5),3.3,(620,760))
for layout in DATA['interiors']:
 interior(layout)
 if layout['id'] in ('station','clinic'):bpy.ops.wm.save_as_mainfile(filepath=str(SRC/('interior-'+layout['id']+'.blend')))
 export('interior-'+layout['id'],True)
 if layout['id']=='clinic':preview('clinic-interior',(0,.3,0),(11,10,13),15)
(OUT/'manifest.json').write_text(json.dumps({'generator':'Blender 5.2.1; tools/build_cozy_assets.py','style':'Original stylized cozy town; solid PBR materials','assets':manifest},indent=2))
print('ALL ASSETS COMPLETE',sum(a['bytes'] for a in manifest),flush=True)

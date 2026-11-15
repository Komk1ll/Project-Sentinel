"""Create compact street assets, warm window panes and authored actor clips."""
import bpy
import json
import math
import hashlib
import sys
from pathlib import Path
from mathutils import Vector, Matrix
sys.path.insert(0,str(Path(__file__).parent))
import build_web_asset_pack as b
OUT=Path(sys.argv[sys.argv.index('--')+1])
LOTS=json.loads(Path(__file__).with_name('lots.json').read_text())
b.PALETTE.update(paint='CAD3CE',glass='324D61',rubber='253038',chrome='8EAAA8',
                 lamp='FFD29A',tail='C85342',soil='534F3E',stone='B0AA90',leaf='567C54',
                 petal='E7AD8A',berry='B77C8B',iron='3F545C',window='FFD596',window_dim='DCA574')


def emission(key,power):
    mat=b.material(key);bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bsdf.inputs['Emission Color'].default_value=mat.diffuse_color
    bsdf.inputs['Emission Strength'].default_value=power


def cylinder(name,xyz,radius,depth,mat,side=False,vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=b.pos(*xyz))
    obj=bpy.context.object
    if side:obj.rotation_euler.y=math.pi/2
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    return b.finish(obj,name,mat)


def car(kind):
    b.OWNER=b.empty('car-'+kind)
    b.box('shaped-body',(0,.57,0),(1.45,.54,3.32),'paint',.13)
    b.box('lower-sill',(0,.32,0),(1.38,.16,2.8),'rubber',.045)
    # Cabin is a tapered prism, with separate inset glass panels.
    long=kind=='wagon';rear=-1.25 if long else -.90;front=.63
    b.mesh('cabin',[(-.68,.77,rear),(.68,.77,rear),(-.68,.77,front),(.68,.77,front),
                    (-.51,1.35,rear+.18),(.51,1.35,rear+.18),(-.51,1.35,.23),(.51,1.35,.23)],
           [(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)],'paint')
    b.mesh('windshield',[(-.59,.85,.587),(.59,.85,.587),(.455,1.29,.278),(-.455,1.29,.278)],[(0,1,2,3)],'glass')
    b.mesh('rear-glass',[(-.59,.86,rear+.013),(-.455,1.29,rear+.16),(.455,1.29,rear+.16),(.59,.86,rear+.013)],[(0,1,2,3)],'glass')
    for side in [-1,1]:
        for za,zb in [(rear+.12,-.25),(-.19,.48)]:
            b.mesh('side-glass',[(side*.662,.85,za),(side*.662,.85,zb),(side*.54,1.27,zb-.16),(side*.54,1.27,za+.08)],[(0,1,2,3)],'glass')
        b.box('door-handle',(side*.724,.77,-.12),(.025,.04,.18),'chrome',.006)
        b.box('mirror',(side*.739,.89,.43),(.07,.10,.18),'paint',.02)
        for z in [-1.01,1.02]:
            cylinder('tire',(side*.692,.29,z),.29,.15,'rubber',True)
            cylinder('wheel-hub',(side*.774,.29,z),.17,.012,'chrome',True)
        b.box('headlight',(side*.49,.66,1.666),(.30,.17,.024),'lamp',.022)
        b.box('tail-light',(side*.52,.65,-1.666),(.23,.18,.025),'tail',.02)
    for z in [-1.65,1.65]:
        b.box('bumper',(0,.44,z),(1.20,.13,.07),'chrome',.02)
    b.box('grille',(0,.59,1.674),(.54,.11,.015),'rubber')
    b.box('plate',(0,.42,1.69),(.38,.09,.014),'stone')
    if long:
        for side in [-1,1]:b.box('roof-rail',(side*.38,1.386,-.43),(.045,.06,1.2),'chrome',.012)


def shrub():
    b.OWNER=b.empty('shrub')
    for i,(x,y,z) in enumerate([(-.3,.35,0),(.29,.39,.03),(0,.52,-.16),(0,.25,.26)]):
        b.ellipsoid('leaf-clump',(x,y,z),(.65,.65,.62),'leaf',ico=True)
    cylinder('root',(0,.14,0),.065,.28,'soil')


def flowerbed():
    b.OWNER=b.empty('flowerbed')
    b.box('bed-base',(0,.14,0),(1.35,.28,1.05),'stone',.06)
    b.box('soil',(0,.28,0),(1.16,.045,.87),'soil')
    for i in range(9):
        x=(i%3-1)*.36;z=(i//3-1)*.27;y=.49+(i%2)*.09
        cylinder('stem',(x,(.30+y)/2,z),.018,y-.30,'leaf',vertices=6)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=b.pos(x+.055,.38,z))
        obj=bpy.context.object;obj.scale=(.095,.045,.035);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        b.finish(obj,'leaves','leaf')
        for j in range(5):
            a=j*math.tau/5
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=b.pos(x+math.cos(a)*.075,y,z+math.sin(a)*.075))
            obj=bpy.context.object;obj.scale=(.072,.06,.028);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
            b.finish(obj,'petals','petal' if i%2 else 'berry')


def lantern():
    b.OWNER=b.empty('lantern')
    cylinder('base',(0,.12,0),.16,.24,'iron')
    cylinder('pole',(0,1.25,0),.045,2.5,'iron')
    b.box('arm',(.14,2.52,0),(.35,.055,.06),'iron')
    b.box('glowing-lantern',(.28,2.37,0),(.23,.28,.23),'lamp',.015)
    b.box('lantern-cap',(.28,2.55,0),(.34,.09,.34),'iron',.02)
    b.box('lantern-foot',(.28,2.2,0),(.29,.06,.29),'iron')
    for x in [.15,.41]:
        for z in [-.13,.13]:b.box('frame',(x,2.37,z),(.027,.30,.027),'iron')


def litterbin():
    b.OWNER=b.empty('litter-bin')
    cylinder('bin',(0,.39,0),.23,.78,'iron')
    cylinder('rim',(0,.79,0),.25,.07,'chrome')
    cylinder('opening',(0,.835,0),.18,.01,'rubber')
    for i in range(8):
        a=i*math.tau/8;b.box('slat',(math.cos(a)*.233,.4,math.sin(a)*.233),(.035,.57,.035),'chrome')


def pane(x,y,z,width,height,side=False,dim=False):
    # Four quadrants leave the physical mullions visible, no glowing door panels.
    for sx in [-1,1]:
        for sy in [-1,1]:
            dx=sx*(width/4+.013);dy=sy*(height/4+.012)
            if side:b.box('lit-pane',(x,y+dy,z+dx),(.012,height/2-.035,width/2-.035),'window_dim' if dim else 'window')
            else:b.box('lit-pane',(x+dx,y+dy,z),(width/2-.035,height/2-.035,.012),'window_dim' if dim else 'window')


def windows():
    b.OWNER=b.empty('evening-windows')
    for index,lot in enumerate(LOTS):
        w,d=lot['width'],lot['depth'];cx,cz=lot['x'],lot['z'];station=lot['id']=='station'
        imported=lot['id']=='clinic' or (w==9 and d==8 and lot['floors']==2)
        for floor in range(lot['floors']):
            y=3.2*floor+1.7
            cols=max(2,math.floor((w-1)/1.65))
            xs=[-2.7,2.7] if station else [-3.45,-1.75,1.75,3.45] if imported else [(i+.5)*w/cols-w/2 for i in range(cols)]
            for i,x in enumerate(xs):
                if floor==0 and abs(x)<1.25:continue
                if (i+floor+index)%4==0:continue
                pane(cx+x,1.76 if station else y,cz+d/2+(.02 if station else .10),1.23 if station else .96 if imported else .85,1.40 if station else 1.15,dim=(i+floor)%3==0)
            zs=[-2.5,0,2.5] if station else [-2.35,0,2.35] if imported else [-d/2+1.4+i*2.1 for i in range(math.ceil((d-2.2)/2.1))]
            for i,z in enumerate(zs):
                for side in [-1,1]:
                    if (i+floor+index+side)%4==0:continue
                    pane(cx+side*(w/2+(.02 if station and side==1 else .10)),1.76 if station else y,cz+z,1.23 if station else .96 if imported else .85,1.4 if station else 1.15,True,dim=(i+index)%3==0)


def export(name,animations=False):
    path=OUT/'models'/(name+'.glb')
    bpy.ops.object.select_all(action='SELECT')
    kwargs=dict(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,
                export_texcoords=False,export_animations=animations,export_cameras=False,export_lights=False)
    if animations:kwargs.update(export_animation_mode='NLA_TRACKS',export_force_sampling=True)
    bpy.ops.export_scene.gltf(**kwargs)
    return {'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}


b.reset()
car('hatch');car('wagon');shrub();flowerbed();lantern();litterbin();windows()
for key,power in [('lamp',2.0),('tail',.65),('window',1.8),('window_dim',.8)]:emission(key,power)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source'/'street-kit.blend'))
b.combine_batches();report={'street-kit':export('street-kit')}
b.reset();bpy.ops.import_scene.gltf(filepath=str(OUT/'models'/'street-kit.glb'))
# Model review uses exported assets at the same scale, excluding the full-map window set.
for obj in [bpy.data.objects['evening-windows'],*bpy.data.objects['evening-windows'].children_recursive]:obj.hide_render=True
for root,x in [('car-hatch',-3),('car-wagon',0),('shrub',2.5),('flowerbed',4.2),('lantern',-4.8),('litter-bin',-1.6)]:
    bpy.data.objects[root].location.x=x
b.configure_render();camera=b.studio(12,(0,1,0))
bpy.context.scene.render.resolution_x=1500;bpy.context.scene.render.resolution_y=800
b.render_view(camera,(0,1.0,0),25,'iso',OUT/'previews'/'street-kit.png',15)

b.reset();bpy.ops.import_scene.gltf(filepath=str(Path(__file__).with_name('hero.glb')))
scene=bpy.context.scene;scene.render.fps=24
for clip,end in [('Idle',49),('Walk',25),('Greet',49)]:
    for name in ['left-leg','right-leg','left-arm','right-arm']:
        obj=bpy.data.objects[name];obj.rotation_mode='XYZ';rest=obj.rotation_euler.copy()
        for frame in range(1,end+1,3):
            t=(frame-1)/(end-1)*math.tau;side=1 if name.startswith('left') else -1
            if clip=='Walk':angle=math.sin(t)*(.48 if 'leg' in name else -.32)*side;wave=0
            elif clip=='Idle':angle=math.sin(t)*(.025 if 'arm' in name else 0)*side;wave=0
            else:angle=-.75*(math.sin(t/2)**2) if name=='right-arm' else 0;wave=-.65*(math.sin(t/2)**2) if name=='right-arm' else 0
            obj.rotation_euler=(rest.x+angle,rest.y+wave,rest.z)
            obj.keyframe_insert('rotation_euler',frame=frame)
        # Explicit endpoint closes the loop at the rest pose.
        obj.rotation_euler=rest;obj.keyframe_insert('rotation_euler',frame=end)
        action=obj.animation_data.action;action.name=clip+'_'+name
        track=obj.animation_data.nla_tracks.new();track.name=clip
        track.strips.new(clip,1,action);obj.animation_data.action=None
        obj.rotation_euler=rest
scene.frame_start=1;scene.frame_end=49;scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source'/'hero-animated.blend'))
report['hero']=export('hero',True)
# Reimport to verify the exported animation names and sample animation visibly.
b.reset();bpy.ops.import_scene.gltf(filepath=str(OUT/'models'/'hero.glb'))
report['hero']['actions']=[a.name for a in bpy.data.actions]
b.configure_render();camera=b.studio(2,(0,.85,0));bpy.context.scene.render.resolution_x=600;bpy.context.scene.render.resolution_y=800
b.render_view(camera,(0,.85,0),5,'iso',OUT/'previews'/'hero.png',2.6)
(OUT/'manifest.json').write_text(json.dumps(report,indent=2))
print('EVENING_ASSETS_COMPLETE '+json.dumps(report),flush=True)

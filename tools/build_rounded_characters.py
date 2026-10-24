"""Author metre-scale rounded actors while retaining the game's articulation contract."""
import sys
import math
import json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
import build_web_asset_pack as b


def smooth(obj):
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def rounded(name, xyz, size, mat, radius, owner=None):
    obj=b.box(name,xyz,size,mat,owner=owner)
    bpy.context.view_layer.objects.active=obj
    mod=obj.modifiers.new('Rounded garment edges','BEVEL');mod.width=min(radius,min(size)*.4);mod.segments=3
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def form(name,rings,mat,owner=None,segments=12):
    # Each ring is (height, center x, center z, horizontal radius, depth radius).
    vertices=[(x+rx*math.cos(i*2*math.pi/segments),y,z+rz*math.sin(i*2*math.pi/segments))
              for y,x,z,rx,rz in rings for i in range(segments)]
    faces=[tuple(range(segments-1,-1,-1))]
    for j in range(len(rings)-1):
        for i in range(segments):
            a=j*segments+i;c=j*segments+(i+1)%segments
            faces.append((a,c,c+segments,a+segments))
    faces.append(tuple((len(rings)-1)*segments+i for i in range(segments)))
    obj=b.mesh(name,vertices,faces,mat)
    if owner:b.parent(obj,owner)
    smooth(obj)
    # Keep the end surfaces flat; smooth only the contour.
    obj.data.polygons[0].use_smooth=False;obj.data.polygons[-1].use_smooth=False
    return obj


def sphere(name,xyz,size,mat,owner=None):
    return smooth(b.ellipsoid(name,xyz,size,mat,owner))


def hair_cap(kind):
    # A continuous curved cap and irregular hairline, with no cube-shaped fringe.
    segments=16;rows=6;vertices=[]
    for j in range(rows):
        t=j/(rows-1)
        for i in range(segments):
            angle=i*2*math.pi/segments
            front=max(0,math.sin(angle))
            end=1.86-.63*front+.10*math.cos(2*angle)
            phi=.06+t*(end-.06)
            vertices.append((.125*math.sin(phi)*math.cos(angle),
                             1.551+.149*math.cos(phi),
                             -.012+.119*math.sin(phi)*math.sin(angle)))
    faces=[tuple(range(segments-1,-1,-1))]
    for j in range(rows-1):
        for i in range(segments):
            a=j*segments+i;c=j*segments+(i+1)%segments
            faces.append((a,c,c+segments,a+segments))
    cap=smooth(b.mesh('shaped-hair',vertices,faces,'cream' if kind=='master' else 'hair'))
    # The topmost ring has a small cap; normalize the exact apex to 1.70 m.
    for v in cap.data.vertices:
        if v.co.z>1.698:v.co.z=1.7
    if kind=='medic':sphere('hair-bun',(0,1.585,-.135),(.135,.14,.13),'hair')
    else:
        tuft=sphere('swept-lock',(-.047,1.651,.063),(.16,.077,.117),'cream' if kind=='master' else 'hair')
        tuft.rotation_euler.y=-.15


def character(kind):
    shirt={'hero':'teal','master':'green','medic':'cream'}[kind]
    accent={'hero':'ochre','master':'ochre','medic':'teal'}[kind]
    for sign,side in ((1,'left'),(-1,'right')):
        leg=b.empty(side+'-leg',(sign*.115,.85,0),b.OWNER)
        form(side+'-trouser',[(.115,sign*.115,.008,.065,.075),(.21,sign*.115,0,.065,.075),
             (.43,sign*.113,.006,.079,.09),(.61,sign*.112,-.008,.093,.105),(.85,sign*.109,0,.095,.106)],'dark',leg)
        rounded(side+'-shoe',(sign*.115,.067,.043),(.17,.134,.29),'hair',.04,leg)
        arm=b.empty(side+'-arm',(sign*.26,1.32,0),b.OWNER)
        form(side+'-sleeve',[(.91,sign*.285,.018,.056,.063),(1.01,sign*.287,.003,.061,.072),
             (1.12,sign*.274,-.008,.074,.08),(1.25,sign*.259,0,.082,.09),
             (1.32,sign*.244,0,.077,.082),(1.35,sign*.210,0,.060,.074),(1.365,sign*.150,0,.050,.055)],shirt,arm)
        form(side+'-cuff',[(.9,sign*.285,.018,.058,.065),(.94,sign*.286,.014,.058,.065)],accent,arm)
        sphere(side+'-hand',(sign*.285,.854,.025),(.106,.135,.12),'skin',arm)
        sphere(side+'-thumb',(sign*.246,.87,.064),(.042,.067,.048),'skin',arm)
    form('hips',[(.79,0,0,.164,.104),(.88,0,0,.181,.117),(.94,0,0,.167,.12)],'dark')
    form('tailored-jacket',[(.865,0,0,.18,.133),(.94,0,0,.183,.137),(1.08,0,0,.178,.137),
        (1.23,0,0,.208,.13),(1.31,0,0,.222,.12),(1.355,0,-.004,.181,.103),
        (1.38,0,-.004,.105,.08)],shirt,segments=16)
    sphere('neck',(0,1.411,-.003),(.115,.12,.11),'skin')
    sphere('face',(0,1.548,.014),(.233,.275,.224),'skin')
    for sign in (-1,1):
        sphere('ear',(sign*.116,1.546,.003),(.038,.065,.04),'skin')
        sphere('eye',(sign*.046,1.568,.120),(.016,.021,.011),'hair')
        collar=rounded('collar',(sign*.065,1.355,.099),(.09,.046,.054),accent,.012)
        collar.rotation_euler.y=sign*.25
    sphere('nose',(0,1.536,.128),(.039,.047,.045),'skin')
    hair_cap(kind)
    rounded('zipper',(0,1.13,.129),(.013,.36,.012),'cream',.003)
    if kind=='hero':
        rounded('backpack',(0,1.13,-.185),(.275,.34,.17),accent,.055)
        rounded('backpack-pocket',(0,1.063,-.276),(.215,.15,.033),accent,.015)
        for sign in (-1,1):
            # Curved straps follow the chest and wrap over the shoulders.
            form('strap',[(.94,sign*.12,.105,.018,.02),(1.13,sign*.145,.126,.018,.02),
                 (1.30,sign*.145,.109,.019,.02),(1.355,sign*.128,.03,.02,.02)],accent,segments=8)
    elif kind=='master':
        rounded('apron',(0,1.04,.129),(.29,.40,.032),accent,.018)
        rounded('apron-bib',(0,1.28,.126),(.17,.15,.033),accent,.014)
        rounded('apron-pocket',(0,1.02,.154),(.17,.10,.022),shirt,.012)
    else:
        form('coat-hem',[(.80,0,.005,.195,.15),(.92,0,.005,.19,.15),(1.02,0,0,.183,.145)],shirt)
        rounded('coat-pocket',(.105,1.14,.136),(.07,.08,.022),accent,.01)
    b.empty('aid-kit-socket',(0,.85,.30),b.OWNER)
    bpy.ops.wm.save_as_mainfile(filepath=str(b.OUT/'source'/(kind+'-authoring.blend')))


b.PALETTE.update(teal='267E7B',dark='354857',hair='3A302D',skin='D2A17B',ochre='CF9A43',cream='EFE7D5',green='69896B')
b.character=character
for name in ('hero','master','medic'):
    b.LIMITS[name]=(6000,6)
    b.build(name)
    if name=='hero':
        for side in ('left','right'):
            arm=bpy.data.objects.get(side+'-arm');arm.rotation_mode='XYZ';arm.rotation_euler.x=-.75
            arm.rotation_euler.y=.28 if side=='left' else -.28
        b.OWNER=b.empty('preview-aid-kit')
        b.aid_kit();b.OWNER.location=b.pos(0,.85,.30)
        b.render_view(bpy.context.scene.camera,(0,.85,0),6.8,'iso',b.OUT/'previews'/'hero-carry.png',2.55)
reports=[json.loads(p.read_text()) for p in sorted(b.OUT.glob('*-report.json'))]
(b.OUT/'manifest.json').write_text(json.dumps({'assets':reports,'total_glb_bytes':sum(a['bytes'] for a in reports),
    'total_triangles':sum(a['triangles'] for a in reports)},indent=2))
print('ROUNDED_ACTORS_COMPLETE',flush=True)

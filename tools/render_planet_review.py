"""Render the exported runtime scene on the configured Blender workstation."""
import bpy
import sys
import json
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent))
import build_web_asset_pack as base
out=Path(sys.argv[sys.argv.index('--')+1]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(Path(__file__).with_name('planet-review.glb')))
devices=base.configure_render()
scene=bpy.context.scene
scene.render.resolution_x=1500;scene.render.resolution_y=1000
scene.cycles.samples=48
bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
bg.inputs['Color'].default_value=(.52,.72,.76,1);bg.inputs['Strength'].default_value=.6
sun_data=bpy.data.lights.new('Review sunlight','SUN');sun_data.energy=2.3;sun_data.angle=.08
sun=bpy.data.objects.new('Review sunlight',sun_data);scene.collection.objects.link(sun)
views=json.loads(Path(__file__).with_name('views.json').read_text())
for view in views:
    camera=bpy.data.objects.get(view['name'])
    if camera is None or camera.type!='CAMERA':raise RuntimeError('Missing exported runtime camera '+view['name'])
    scene.camera=camera
    # Match runtime vertical span explicitly; Three r170 exports doubled camera magnitudes.
    camera.data.ortho_scale=view['span']*3
    target=Vector((view['target'][0],-view['target'][2],view['target'][1]))
    direction=(camera.location-target).normalized()
    sun.rotation_euler=(-direction).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(out/(view['name']+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'planet-review.blend'))
(out/'render-verification.json').write_text(json.dumps({'gpu':devices,'source':'Exported runtime Three.js geometry and cameras','views':[v['name'] for v in views],'browser_verified':False,'sign_textures':'omitted from offline review'},indent=2))

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
bpy.ops.import_scene.gltf(filepath=str(Path(__file__).with_name('island-review.glb')))
# glTF has no additive blend mode. Recreate only the cheap runtime spill decals
# with transparent + vertex-coloured emission so the offline view has no dark disks.
spill_materials=set()
for obj in bpy.data.objects:
    if obj.type!='MESH' or obj.active_material is None:continue
    mat=obj.active_material
    if mat.name!='lantern-spill':continue
    if mat.name in spill_materials:continue
    spill_materials.add(mat.name);mat.use_nodes=True;tree=mat.node_tree;tree.nodes.clear()
    output=tree.nodes.new('ShaderNodeOutputMaterial');add=tree.nodes.new('ShaderNodeAddShader')
    transparent=tree.nodes.new('ShaderNodeBsdfTransparent');emission=tree.nodes.new('ShaderNodeEmission')
    vertex=tree.nodes.new('ShaderNodeVertexColor');vertex.layer_name=obj.data.color_attributes.active_color.name
    emission.inputs['Strength'].default_value=.3
    tree.links.new(vertex.outputs['Color'],emission.inputs['Color'])
    tree.links.new(transparent.outputs[0],add.inputs[0]);tree.links.new(emission.outputs[0],add.inputs[1])
    tree.links.new(add.outputs[0],output.inputs['Surface'])
print('ADDITIVE_SPILL_MATERIALS '+str(len(spill_materials)),flush=True)
if Path(__file__).with_name('lighting.json').exists() and not spill_materials:
    raise RuntimeError('Missing additive lamp material in evening review export')
devices=base.configure_render()
scene=bpy.context.scene
scene.render.resolution_x=1500;scene.render.resolution_y=1000
scene.cycles.samples=48
bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
bg.inputs['Color'].default_value=(.52,.72,.76,1);bg.inputs['Strength'].default_value=.6
sun_data=bpy.data.lights.new('Review sunlight','SUN');sun_data.energy=2.3;sun_data.angle=.08
sun=bpy.data.objects.new('Review sunlight',sun_data);scene.collection.objects.link(sun)
lighting_path=Path(__file__).with_name('lighting.json')
lighting=json.loads(lighting_path.read_text()) if lighting_path.exists() else None
if lighting:
    def rgb(hex_value):
        return tuple(((hex_value>>shift)&255)/255 for shift in (16,8,0))
    sun_data.energy=lighting['sunIntensity'];sun_data.color=rgb(lighting['sun'])
    bg.inputs['Color'].default_value=rgb(lighting['ambientSky'])+(1,)
    bg.inputs['Strength'].default_value=.35
    scene.view_settings.exposure=-.1
views=json.loads(Path(__file__).with_name('views.json').read_text())
for view in views:
    camera=bpy.data.objects.get(view['name'])
    if camera is None or camera.type!='CAMERA':raise RuntimeError('Missing exported runtime camera '+view['name'])
    scene.camera=camera
    # Match runtime vertical span explicitly; Three r170 exports doubled camera magnitudes.
    camera.data.ortho_scale=view['span']*3
    target=Vector((view['target'][0],-view['target'][2],view['target'][1]))
    direction=Vector((lighting['sunOffset'][0],-lighting['sunOffset'][2],lighting['sunOffset'][1]) if lighting else (-35,25,65)).normalized()
    sun.rotation_euler=(-direction).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(out/(view['name']+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'island-review.blend'))
(out/'render-verification.json').write_text(json.dumps({'gpu':devices,'source':'Exported runtime Three.js geometry and cameras','views':[v['name'] for v in views],'browser_verified':False,'sign_textures':'omitted from offline review','water':'PBR approximation; custom WebGL shaders not evaluated','light_pools':'additive vertex colour reconstructed in Blender','lighting':'offline approximation, not browser pixel proof'},indent=2))

pose_path=Path(__file__).with_name('actor-poses.glb')
if pose_path.exists():
    base.reset();bpy.ops.import_scene.gltf(filepath=str(pose_path))
    base.configure_render();camera=base.studio(6,(0,.85,0))
    bpy.context.scene.render.resolution_x=1500;bpy.context.scene.render.resolution_y=800
    base.render_view(camera,(0,.85,0),10,'iso',out/'actor-poses.png',5.2)

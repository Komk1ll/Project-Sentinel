/** Export actual runtime geometry for an offline Blender review, without launching a browser. */
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
const dom=new JSDOM('<!doctype html>');globalThis.document=dom.window.document;
dom.window.HTMLCanvasElement.prototype.getContext=()=>null;
globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(value=>{this.result=`data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;this.onloadend?.();});}
};
const server=await createServer({server:{middlewareMode:true}});
try{
  const {createWebTown}=await server.ssrLoadModule('/src/game/render/web-town.ts');
  const {TownLifeView}=await server.ssrLoadModule('/src/game/render/town-life-view.ts');
  const {TownWorld}=await server.ssrLoadModule('/src/game/systems/town-world.ts');
  const {FirstAidMission}=await server.ssrLoadModule('/src/game/systems/first-aid-mission.ts');
  const {placeOnGround}=await server.ssrLoadModule('/src/game/render/world-surface.ts');
  const {createOcean}=await server.ssrLoadModule('/src/game/render/island-terrain.ts');
  const assets=new Map();
  for(const name of ['hero','workshop','clinic','house-base','tree','bench','architecture-details']){
    const folder=['tree','architecture-details'].includes(name)?'island-detail':['hero','workshop'].includes(name)?'polish-v4':'web-mvp';
    const bytes=await readFile(`public/assets/models/${folder}/${name}.glb`);
    const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');assets.set(name,asset.scene);
  }
  const world=new TownWorld(),mission=new FirstAidMission(world),scene=new THREE.Scene();
  scene.add(createWebTown(assets));const life=new TownLifeView(mission.life,assets.get('hero'));scene.add(life.group);
  const hero=assets.get('hero').clone(true);hero.name='player';placeOnGround(hero,32,35,0,.065);scene.add(hero);
  // Canvas signage is browser-generated and excluded from this geometry review only.
  scene.traverse(object=>{if(object.isMesh){for(const mat of Array.isArray(object.material)?object.material:[object.material])if(mat.map)mat.map=null;}});
  // GLTF cannot serialize custom WebGL shaders: offline water is a PBR approximation.
  const ocean=createOcean({value:0});ocean.material.dispose();
  ocean.material=new THREE.MeshStandardMaterial({color:0x568e96,roughness:.24,metalness:.18});
  ocean.position.y=-.65;scene.add(ocean);
  const views=[];
  for(const [name,x,z,span,overview] of [['overview',46,32,58,true],['street',32,35,11,false],['garden',86,38,22,false],['facades',38,26,12,false]]){
    const target=new THREE.Vector3(x,0,z);
    const camera=new THREE.OrthographicCamera(-span*1.5,span*1.5,span,-span,.1,400);camera.name=name;
    camera.up.set(0,1,0);
    camera.position.copy(target).add(new THREE.Vector3(28,34,28).multiplyScalar(overview?2.2:1));camera.lookAt(target);scene.add(camera);
    views.push({name,position:camera.position.toArray(),target:target.toArray(),up:camera.up.toArray(),span});
  }
  scene.updateMatrixWorld(true);
  const output=process.argv[2]??'art/coastal-island';await mkdir(output,{recursive:true});
  const glb=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true});await writeFile(`${output}/island-review.glb`,Buffer.from(glb));
  await writeFile(`${output}/views.json`,JSON.stringify(views,null,2));
  let meshes=0,triangles=0;scene.traverse(object=>{if(object.isMesh){meshes++;triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);}});
  await writeFile(`${output}/geometry.json`,JSON.stringify({meshes,triangles,bytes:glb.byteLength,source:'Actual runtime scene; canvas signs omitted; water PBR approximation; custom WebGL shaders not evaluated',browserVerified:false},null,2));
  console.log({meshes,triangles,bytes:glb.byteLength});mission.destroy();
}finally{await server.close();}

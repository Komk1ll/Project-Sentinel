const reportRoot=process.argv[2]??'art/island-harbor';
/** Measure shipped assets with the real GLTFLoader; this is not an FPS test. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
globalThis.document={baseURI:'http://localhost/'};
const server=await createServer({server:{middlewareMode:true}}),files=[];
const original=GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync=async function(url){
  const path=new URL(url).pathname,bytes=await readFile(`public${path}`);
  files.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
};
try{
  const {loadTownAssets,disposeObject}=await server.ssrLoadModule('/src/game/render/town-assets.ts');
  const {CAR_SIZE}=await server.ssrLoadModule('/src/content/street-details.ts');
  const assets=await loadTownAssets();assert.equal(assets.size,16);assert.equal(files.length,16);
  const payload=files.reduce((n,file)=>n+file.bytes,0);assert.ok(payload<=5_500_000,`Payload ${payload} exceeds 5.5 MB`);
  const manifest=JSON.parse(await readFile('art/evening-island/assets/manifest.json','utf8'));
  for(const name of ['hero','street-kit']){
    const file=files.find(file=>file.path.endsWith(`evening/${name}.glb`));
    assert.equal(file.sha256,manifest[name].sha256);assert.equal(file.bytes,manifest[name].bytes);
  }
  const harborManifest=JSON.parse(await readFile('art/island-harbor/assets/manifest.json','utf8'));
  const harborFile=files.find(file=>file.path.endsWith('/harbor/harbor-kit.glb'));
  assert.equal(harborFile.sha256,harborManifest.sha256);
  const metrics={};
  for(const group of [...assets.get('harbor-kit').children,...assets.get('coastal-garden-kit').children]){
    group.updateMatrixWorld(true);let triangles=0,meshes=0;const materials=new Set();
    group.traverse(object=>{
      if(!object.isMesh)return;meshes++;
      const geometry=object.geometry,pos=geometry.attributes.position,normal=geometry.attributes.normal,idx=geometry.index,n=idx?.count??pos.count;
      triangles+=n/3;assert.ok(!Array.isArray(object.material));materials.add(object.material.uuid);
      assert.ok(!object.material.map&&!object.material.normalMap,'No texture downloads');
      const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),edge=new THREE.Vector3();
      for(let i=0;i<pos.count;i++){
        a.fromBufferAttribute(pos,i);assert.ok(a.toArray().every(Number.isFinite));
        b.fromBufferAttribute(normal,i);assert.ok(Math.abs(b.length()-1)<.02,'Unit normal');
      }
      for(let i=0;i<n;i+=3){
        a.fromBufferAttribute(pos,idx?idx.getX(i):i);b.fromBufferAttribute(pos,idx?idx.getX(i+1):i+1);c.fromBufferAttribute(pos,idx?idx.getX(i+2):i+2);
        edge.subVectors(b,a).cross(c.sub(a));assert.ok(edge.lengthSq()>1e-14,`Nondegenerate triangle ${group.name}`);
      }
    });
    const size=new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
    metrics[group.name]={triangles,meshes,materials:materials.size,size:size.toArray()};
    if(group.name.startsWith('car-')){
      assert.ok(size.x<=CAR_SIZE.width&&size.z<=CAR_SIZE.depth,`Car collider ${size.toArray()}`);
      assert.ok(size.y>1.3&&size.y<1.5);
    }
  }
  const gardenManifest=JSON.parse(await readFile('art/coastal-garden/assets/manifest.json','utf8'));
  assert.equal(files.find(f=>f.path.endsWith('/coastal-garden-kit.glb')).sha256,gardenManifest.sha256);
  assert.ok(Math.abs(metrics['garden-bridge'].size[0]-17)<.05);
  assert.ok(metrics['apple-tree'].size[1]>3.5&&metrics['apple-tree'].size[1]<4.5);
  const windows=assets.get('street-kit').getObjectByName('evening-windows');assert.ok(windows);
  windows.traverse(object=>{if(object.isMesh){assert.ok(object.material.emissiveIntensity>0);assert.ok(object.material.emissive.r>object.material.emissive.b);}});
  assert.ok(metrics.lighthouse.size[0]<=4.4&&metrics.lighthouse.size[2]<=4.4);
  assert.ok(metrics.lighthouse.size[1]>11&&metrics.lighthouse.size[1]<12);
  assert.ok(Math.abs(metrics.pier.size[0]-14)<.05);
  assert.ok(metrics.boat.size[0]<2&&metrics.boat.size[2]<5);
  const hero=assets.get('hero');assert.ok(Math.abs(new THREE.Box3().setFromObject(hero).getSize(new THREE.Vector3()).y-1.7)<.01);
  assert.deepEqual(hero.animations.map(clip=>clip.name).sort(),['Greet','Idle','Walk']);
  const clips=hero.animations.map(clip=>({name:clip.name,duration:clip.duration,tracks:clip.tracks.map(track=>track.name)}));
  for(const clip of hero.animations)for(const track of clip.tracks){assert.ok(/^(left|right)-(arm|leg)\.quaternion$/.test(track.name));assert.ok([...track.values].every(Number.isFinite));}
  const scene=JSON.parse(await readFile(`${reportRoot}/geometry.json`,'utf8'));
  assert.ok(scene.triangles<=260_000,`${scene.triangles} triangles`);assert.ok(scene.meshes<=600);
  const report={payload,requests:files.length,files,groups:metrics,clips,scene,checks:['real GLTFLoader decode','verified source hashes','finite geometry and unit normals','nondegenerate triangles','car collision bounds','hero metre scale','authored limb-only animation clips','warm emissive panes','payload and scene budgets'],browserVerified:false};
  await writeFile(`${reportRoot}/asset-verification.json`,JSON.stringify(report,null,2));
  console.log({payload,requests:files.length,meshes:scene.meshes,triangles:scene.triangles});assets.forEach(disposeObject);
}finally{GLTFLoader.prototype.loadAsync=original;await server.close();}

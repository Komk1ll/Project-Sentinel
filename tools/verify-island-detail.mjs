/** Decode the shipped GLBs and measure real geometry, payload and entry clearance. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
const dom=new JSDOM('<!doctype html>',{url:'http://localhost/'});globalThis.document=dom.window.document;
dom.window.HTMLCanvasElement.prototype.getContext=()=>null;
const server=await createServer({server:{middlewareMode:true}}),files=[];
const original=GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync=async function(url){
  const path=new URL(url).pathname,bytes=await readFile(`public${path}`);
  files.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
};
try{
  const {loadTownAssets,disposeObject}=await server.ssrLoadModule('/src/game/render/town-assets.ts');
  const {TOWN_BUILDINGS}=await server.ssrLoadModule('/src/content/town.ts');
  const {createWebTown}=await server.ssrLoadModule('/src/game/render/web-town.ts');
  const assets=await loadTownAssets(),details=assets.get('architecture-details'),trees=assets.get('tree');
  assert.equal(files.length,13);
  const payload=files.reduce((n,file)=>n+file.bytes,0);assert.ok(payload<=4_000_000,`Payload ${payload} exceeds 4 MB`);
  const manifest=JSON.parse(await readFile('art/living-island-detail/assets/manifest.json','utf8'));
  for(const name of ['tree','architecture-details']){
    const file=files.find(file=>file.path.endsWith(`island-detail/${name}.glb`));
    assert.equal(file.sha256,manifest[name].sha256);assert.equal(file.bytes,manifest[name].bytes);
  }
  const groupMetrics={};
  for(const group of [...details.children,...trees.children]){
    group.updateMatrixWorld(true);let triangles=0,meshes=0;const materials=new Set();
    group.traverse(object=>{
      if(!object.isMesh)return;meshes++;
      const geometry=object.geometry,pos=geometry.attributes.position,normal=geometry.attributes.normal,idx=geometry.index;
      const n=idx?.count??pos.count;triangles+=n/3;
      const mat=object.material;assert.ok(!Array.isArray(mat));materials.add(mat.uuid);
      assert.ok(!mat.map && !mat.normalMap && !mat.roughnessMap,'No external maps');
      const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),edge=new THREE.Vector3();
      for(let i=0;i<pos.count;i++){
        a.fromBufferAttribute(pos,i);assert.ok(a.toArray().every(Number.isFinite));
        b.fromBufferAttribute(normal,i);assert.ok(Math.abs(b.length()-1)<.02,'Unit normal');
      }
      for(let i=0;i<n;i+=3){
        a.fromBufferAttribute(pos,idx?idx.getX(i):i);
        b.fromBufferAttribute(pos,idx?idx.getX(i+1):i+1);
        c.fromBufferAttribute(pos,idx?idx.getX(i+2):i+2);
        edge.subVectors(b,a).cross(c.sub(a));assert.ok(edge.lengthSq()>1e-14,'Nondegenerate triangle');
      }
    });
    groupMetrics[group.name]={triangles,meshes,materials:materials.size};
  }
  for(const species of ['oak','birch','pine']){
    const tree=trees.getObjectByName(`tree-${species}`);assert.ok(tree);
    const bounds=new THREE.Box3().setFromObject(tree),size=bounds.getSize(new THREE.Vector3());
    assert.ok(Math.abs(bounds.min.y)<1e-5 && size.y>=4.4 && size.y<4.9);
    assert.ok(size.x<2.9 && size.z<2.9);assert.equal(groupMetrics[tree.name].materials,2);
    assert.ok(groupMetrics[tree.name].triangles<=1000);
  }
  for(const lot of TOWN_BUILDINGS){
    const detail=details.getObjectByName(`detail-${lot.id}`);assert.ok(detail);
    assert.ok(detail.position.length()<1e-6);assert.deepEqual(detail.scale.toArray(),[1,1,1]);
    detail.updateMatrixWorld(true);
    // No triangle bounds may enter the clear doorway prism (height 2.2 m).
    const doorway=new THREE.Box3(new THREE.Vector3(-.70,.01,lot.depth/2),new THREE.Vector3(.70,2.2,lot.depth/2+1));
    detail.traverse(object=>{
      if(!object.isMesh)return;
      const pos=object.geometry.attributes.position,idx=object.geometry.index,n=idx?.count??pos.count;
      for(let i=0;i<n;i+=3){
        const vertices=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(pos,idx?idx.getX(i+k):i+k).applyMatrix4(object.matrixWorld));
        assert.ok(!new THREE.Box3().setFromPoints(vertices).intersectsBox(doorway),`Door clearance ${lot.id}`);
      }
    });
  }
  const town=createWebTown(assets,{value:0});
  const geometry=JSON.parse(await readFile('art/living-island-detail/geometry.json','utf8'));
  assert.ok(geometry.triangles<=220_000);assert.ok(geometry.meshes<=450);
  const hero=assets.get('hero');assert.ok(Math.abs(new THREE.Box3().setFromObject(hero).getSize(new THREE.Vector3()).y-1.70)<.01);
  const report={payload,requests:files.length,files,groups:groupMetrics,scene:geometry,checks:['actual GLTFLoader decode','source hashes','finite vertices and unit normals','nondegenerate triangles','entry clearance','hero and tree metre scale','payload and scene budgets'],browserVerified:false};
  await writeFile('art/living-island-detail/asset-verification.json',JSON.stringify(report,null,2));
  console.log({payload,requests:files.length,meshes:geometry.meshes,triangles:geometry.triangles});
  disposeObject(town);assets.forEach(disposeObject);
}finally{GLTFLoader.prototype.loadAsync=original;await server.close();}

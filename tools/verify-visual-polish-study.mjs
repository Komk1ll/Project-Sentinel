/** Verify the review GLB independently of Blender; never modifies runtime files. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { Box3, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const folder = resolve(process.argv[2] ?? 'art/visual-polish-v4');
const report = JSON.parse(await readFile(`${folder}/workshop-report.json`, 'utf8'));
const data = await readFile(`${folder}/models/workshop.glb`);
assert.equal(data.toString('ascii', 0, 4), 'glTF');
assert.equal(data.readUInt32LE(4), 2);
assert.equal(data.readUInt32LE(8), data.length);
assert.equal(data.length, report.bytes);
assert.equal(createHash('sha256').update(data).digest('hex'), report.sha256);
const json = JSON.parse(data.toString('utf8', 20, 20+data.readUInt32LE(12)));
assert.ok(json.buffers.every(buffer => !buffer.uri));
assert.ok(!json.textures?.length && !json.images?.length);
assert.ok(!json.cameras?.length && !json.animations?.length);
assert.ok(!json.extensions?.KHR_lights_punctual);
assert.ok(json.materials.length <= 8);
assert.ok(json.materials.every(material => !material.alphaMode || material.alphaMode === 'OPAQUE'));
const { scene } = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset+data.byteLength), '');
scene.updateMatrixWorld(true);
const near = (actual, wanted) => assert.ok(Math.abs(actual-wanted)<.0001, `${actual} != ${wanted}`);
const root = scene.getObjectByName('workshop-root');
assert.ok(root);
root.position.toArray().forEach(value => near(value, 0));
root.scale.toArray().forEach(value => near(value, 1));
near(root.quaternion.angleTo(scene.quaternion), 0);
const bounds = new Box3().setFromObject(root);
bounds.getSize(new Vector3()).toArray().forEach((value, i) => near(value, report.bounds.size[i]));
near(bounds.min.y, 0);
const wall = scene.getObjectByName('wall-volume');
const door = scene.getObjectByName('door-panel');
assert.ok(wall && door);
new Box3().setFromObject(wall).getSize(new Vector3()).toArray().forEach((value,i) => near(value,[9,3.2,8][i]));
const db = new Box3().setFromObject(door);
near(db.min.y, 0);near(db.max.y, 2.2);near(db.max.x-db.min.x,1.2);
assert.ok(db.max.z <= 4 && db.min.z > 3.8, 'Recessed door must remain at front entrance');
let triangles=0, primitives=0;
scene.traverse(object => {
  assert.ok(!/preview|tree|bench|hero|camera|lamp-pane-text/.test(object.name));
  if (!(object instanceof Mesh)) return;
  primitives++;
  const g=object.geometry, p=g.getAttribute('position'), n=g.getAttribute('normal');
  assert.ok(p && n);
  assert.ok([...p.array,...n.array].every(Number.isFinite));
  const count=g.index?.count ?? p.count;
  assert.equal(count%3,0);triangles+=count/3;
  for(let i=0;i<count;i+=3){
    const vs=[], ns=new Vector3();
    for(let k=0;k<3;k++){
      const idx=g.index?g.index.getX(i+k):i+k;
      vs.push(new Vector3().fromBufferAttribute(p,idx));
      ns.add(new Vector3().fromBufferAttribute(n,idx));
    }
    const cross=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0]));
    assert.ok(cross.lengthSq()>1e-18,'Degenerate triangle');
    assert.ok(cross.dot(ns)>0,'Inconsistent winding');
  }
});
assert.equal(triangles,report.triangles);assert.ok(triangles<=12000);
const result={passed:true,sha256:report.sha256,bytes:data.length,triangles,primitives,
  materials:json.materials.length,root:'workshop-root',wallMetres:[9,3.2,8],doorHeightMetres:2.2,
  browserVerified:false,runtimeIntegrated:false};
await writeFile(`${folder}/verification.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));

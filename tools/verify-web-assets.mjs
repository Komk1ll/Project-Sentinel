/** Independently validate the exported pack with the game's Three.js GLTFLoader. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { Box3, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const root = resolve(process.argv[2] ?? 'art/web-mvp-v3');
const expected = {
  hero: [2500, 5], master: [2500, 5], medic: [2500, 5],
  workshop: [3000, 5], clinic: [5000, 5], 'house-base': [2500, 4],
  tree: [400, 2], bench: [300, 2], 'aid-kit': [200, 2],
};
const manifest = JSON.parse(await readFile(`${root}/manifest.json`, 'utf8'));
assert.deepEqual(manifest.assets.map(a => a.name).sort(), Object.keys(expected).sort());
const near = (actual, wanted, eps = .0001) => assert.ok(Math.abs(actual-wanted) <= eps, `${actual} != ${wanted}`);
const report = [];
for (const asset of manifest.assets) {
  const bytes = await readFile(`${root}/models/${asset.name}.glb`);
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(bytes.length, asset.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
  const json = JSON.parse(bytes.toString('utf8', 20, 20+bytes.readUInt32LE(12)).trim());
  assert.ok(!json.images?.length && !json.textures?.length, 'No textures or images');
  assert.ok(!json.cameras?.length && !json.extensions?.KHR_lights_punctual, 'No cameras or lights');
  assert.ok(!json.animations?.length && !json.skins?.length, 'No unwanted skeletal animation');
  assert.ok(json.buffers.every(b => !b.uri), 'No external buffers');
  assert.ok(json.materials.length <= expected[asset.name][1]);
  for (const mat of json.materials) {
    assert.equal(mat.pbrMetallicRoughness.metallicFactor, 0);
    near(mat.pbrMetallicRoughness.roughnessFactor, .8);
    assert.ok(!mat.alphaMode || mat.alphaMode === 'OPAQUE');
  }
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset+bytes.byteLength), '');
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  const base = scene.getObjectByName(asset.root);
  assert.ok(base, asset.root);
  base.position.toArray().forEach(v => near(v, 0));
  base.scale.toArray().forEach(v => near(v, 1));
  near(base.quaternion.angleTo(scene.quaternion), 0);
  const bounds = new Box3().setFromObject(scene);
  const size = bounds.getSize(new Vector3());
  near(bounds.min.y, 0);
  size.toArray().forEach((v, i) => near(v, asset.bounds.size[i]));
  let triangles = 0, meshes = 0;
  scene.traverse(object => {
    assert.ok(object.scale.toArray().every(v => v > 0), `Non-positive scale: ${object.name}`);
    if (!(object instanceof Mesh)) return;
    meshes++;
    const geom = object.geometry;
    const position = geom.getAttribute('position');
    const normal = geom.getAttribute('normal');
    assert.ok(normal && position);
    assert.ok([...position.array, ...normal.array].every(Number.isFinite));
    const count = geom.index?.count ?? position.count;
    assert.equal(count % 3, 0);
    triangles += count / 3;
    const v = [new Vector3(), new Vector3(), new Vector3()];
    const geometric = new Vector3(), n = new Vector3(), sum = new Vector3();
    for (let j = 0; j < count; j += 3) {
      sum.set(0, 0, 0);
      for (let k = 0; k < 3; k++) {
        const index = geom.index ? geom.index.getX(j+k) : j+k;
        v[k].fromBufferAttribute(position, index);
        n.fromBufferAttribute(normal, index);
        near(n.length(), 1, .002);
        sum.add(n);
      }
      geometric.crossVectors(v[1].clone().sub(v[0]), v[2].clone().sub(v[0]));
      assert.ok(geometric.lengthSq() > 1e-18, `${asset.name}: degenerate triangle`);
      assert.ok(geometric.dot(sum) > 0, `${asset.name}: reversed normal`);
    }
  });
  assert.equal(triangles, asset.triangles);
  assert.ok(triangles <= expected[asset.name][0]);
  if (['hero', 'master', 'medic'].includes(asset.name)) {
    near(size.y, 1.7, .01);
    assert.ok(size.x <= .7);
    for (const limb of ['left-leg', 'right-leg', 'left-arm', 'right-arm']) {
      const pivot = scene.getObjectByName(limb);
      assert.ok(pivot && pivot.children.length, limb);
      const wp = pivot.getWorldPosition(new Vector3());
      assert.equal(Math.sign(wp.x), limb.startsWith('left') ? 1 : -1);
      near(wp.y, limb.endsWith('leg') ? .85 : 1.32);
      const original = new Box3().setFromObject(pivot);
      pivot.rotation.x = .3;
      scene.updateMatrixWorld(true);
      assert.ok(!new Box3().setFromObject(pivot).equals(original), 'Pivot must move its child geometry');
      pivot.rotation.x = 0;
    }
    const socket = scene.getObjectByName('aid-kit-socket');
    assert.ok(socket);
    socket.getWorldPosition(new Vector3()).toArray().forEach((v,i) => near(v, [0,.85,.30][i]));
  } else if (['workshop', 'clinic', 'house-base'].includes(asset.name)) {
    const wall = scene.getObjectByName('wall-volume');
    const door = scene.getObjectByName('door-panel');
    assert.ok(wall && door, 'Keep measurable wall and door meshes');
    const wb = new Box3().setFromObject(wall), db = new Box3().setFromObject(door);
    const floors = asset.name === 'workshop' ? 1 : asset.name === 'clinic' ? 3 : 2;
    wb.getSize(new Vector3()).toArray().forEach((v,i) => near(v, [asset.name === 'clinic' ? 10 : 9, floors*3.2, 8][i]));
    near(db.min.y, 0);
    near(db.max.z, 4);
    near(db.getSize(new Vector3()).y, 2.2);
    near(db.getSize(new Vector3()).x, asset.name === 'clinic' ? 1.3 : 1.2);
    assert.ok(size.y <= ({workshop:4.7, clinic:11, 'house-base':7.8}[asset.name]));
    assert.ok(bounds.max.z <= (asset.name === 'clinic' ? 4.6 : 4.25));
  } else {
    const dims = {tree:[2.8,4.5,2.8], bench:[1.6,.85,.55], 'aid-kit':[.30,.22,.16]}[asset.name];
    size.toArray().forEach((v,i) => near(v, dims[i], dims[i]*.01));
  }
  report.push({name:asset.name, triangles, meshes, materials:json.materials.length,
    size:size.toArray().map(v=>+v.toFixed(4)), bytes:bytes.length});
}
const result = {status:'PASS', independentLoader:'Three.js GLTFLoader', assets:report,
  totalBytes:report.reduce((sum,a)=>sum+a.bytes,0), totalTriangles:report.reduce((sum,a)=>sum+a.triangles,0),
  limitations:['Offline validation; no browser GPU performance measurement or gameplay integration.']};
await writeFile(`${root}/verification.json`, JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));

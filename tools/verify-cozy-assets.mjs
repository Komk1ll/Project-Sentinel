import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const root = new URL('../public/assets/models/cozy/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
const layout = JSON.parse(await readFile(new URL('../art/source/town-layout.json', import.meta.url), 'utf8'));
const expected = ['town', 'hero', 'master', 'medic', 'resident', ...layout.buildings.map(b => `interior-${b.id}`)];
assert.deepEqual(manifest.assets.map(a => a.file).sort(), expected.map(name => `${name}.glb`).sort());
const report = [];
for (const asset of manifest.assets) {
  const bytes = await readFile(new URL(asset.file, root));
  assert.equal(bytes.length, asset.bytes, asset.file);
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const scene = gltf.scene;
  const bounds = new Box3().setFromObject(scene);
  const size = bounds.getSize(new Vector3());
  assert.ok([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite), asset.file);
  assert.ok(size.x > 0 && size.y > 0 && size.z > 0, asset.file);
  let triangles = 0, meshes = 0;
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    meshes += 1;
    const geometry = object.geometry;
    triangles += (geometry.index?.count ?? geometry.attributes.position.count) / 3;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      assert.ok(!material.map, 'The solid-material asset set must not require remote textures');
    }
  });
  if (asset.file === 'town.glb') {
    assert.ok(bounds.min.x < 0 && bounds.max.x > 64 && bounds.max.y < 15);
  } else if (asset.file.startsWith('interior-')) {
    assert.ok(size.x <= 10.5 && size.z <= 8.5 && size.y < 4, asset.file);
  } else {
    assert.ok(size.x < 1 && size.y > 1.8 && size.y < 2.3 && size.z < 1, asset.file);
    for (const name of ['left-leg', 'right-leg', 'left-arm', 'right-arm']) assert.ok(scene.getObjectByName(name), `${asset.file}: ${name}`);
    if (['master.glb', 'medic.glb'].includes(asset.file)) assert.ok(scene.getObjectByName('aid-kit-parcel'));
  }
  report.push({ file: asset.file, meshes, triangles, size: size.toArray().map(n => +n.toFixed(3)) });
}
console.log(JSON.stringify({ assets: report, totalBytes: manifest.assets.reduce((sum, a) => sum + a.bytes, 0) }, null, 2));

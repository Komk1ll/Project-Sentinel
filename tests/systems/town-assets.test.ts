// @vitest-environment jsdom
import { expect, it, vi, afterEach } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadTownAssets } from '@game/render/town-assets';

afterEach(()=>vi.restoreAllMocks());
it('releases every successful partial asset if one requested GLB fails',async()=>{
  const geometries: BoxGeometry[]=[];
  const materialDisposals: ReturnType<typeof vi.spyOn>[]=[];
  vi.spyOn(GLTFLoader.prototype,'loadAsync').mockImplementation(async url=>{
    if(url.endsWith('/bench.glb')) throw new Error('offline');
    const scene=new Group(),geometry=new BoxGeometry(),material=new MeshStandardMaterial();
    scene.add(new Mesh(geometry,material));geometries.push(geometry);
    vi.spyOn(geometry,'dispose');materialDisposals.push(vi.spyOn(material,'dispose'));
    const decoded=await new GLTFLoader().parseAsync(JSON.stringify({asset:{version:'2.0'},scenes:[{}],scene:0}), '');
    return {...decoded,scene,scenes:[scene]};
  });
  await expect(loadTownAssets()).rejects.toThrow('could not be loaded');
  expect(geometries).toHaveLength(12);
  expect(geometries.every(geometry=>vi.mocked(geometry.dispose).mock.calls.length===1)).toBe(true);
  expect(materialDisposals.every(spy=>spy.mock.calls.length===1)).toBe(true);
});

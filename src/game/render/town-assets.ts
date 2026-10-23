import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function disposeObject(group: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}

/** All assets are bundled locally, with no CDN or external texture dependencies. */
export async function loadTownAssets(): Promise<Map<string, THREE.Group>> {
  const loader = new GLTFLoader();
  const web = ['hero', 'master', 'medic', 'workshop', 'clinic', 'house-base', 'tree', 'bench', 'aid-kit'];
  const names = [...web, 'resident', 'interior-station', 'interior-clinic'];
  const results = await Promise.allSettled(names.map(async name => {
    const folder = web.includes(name) ? 'web-mvp' : 'cozy';
    const url = new URL(`${import.meta.env.BASE_URL}assets/models/${folder}/${name}.glb`, document.baseURI).href;
    const gltf = await loader.loadAsync(url);
    gltf.scene.name = `${web.includes(name) ? 'web' : 'cozy'}-${name}`;
    gltf.scene.traverse(object => {
      if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
    });
    return { name, scene: gltf.scene };
  }));
  if (results.some(result => result.status === 'rejected')) {
    for (const result of results) if (result.status === 'fulfilled') disposeObject(result.value.scene);
    throw new AggregateError(results.flatMap(result => result.status === 'rejected' ? [result.reason] : []), 'The local town asset set could not be loaded');
  }
  const assets = new Map<string, THREE.Group>();
  for (const result of results) if (result.status === 'fulfilled') assets.set(result.value.name, result.value.scene);
  return assets;
}

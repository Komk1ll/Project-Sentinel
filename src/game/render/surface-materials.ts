import * as THREE from 'three';

const size = 64;
const pixels = new Uint8Array(size * size * 4);
let seed = 421;
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const index = (y * size + x) * 4;
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  const grain = seed >>> 24;
  const course = Math.floor(y / 16);
  const joint = y % 16 === 0 || (x + (course % 2) * 16) % 32 === 0;
  const tileEdge = y % 16 <= 1 || x % 16 === 0;
  pixels[index] = grain;
  pixels[index + 1] = joint ? 72 : 143 + (grain >> 3);
  pixels[index + 2] = tileEdge ? 86 : 140 + (grain >> 2);
  pixels[index + 3] = 255;
}
const detailAtlas = new THREE.DataTexture(pixels, size, size);
detailAtlas.wrapS = detailAtlas.wrapT = THREE.RepeatWrapping;
detailAtlas.magFilter = THREE.LinearFilter;
detailAtlas.minFilter = THREE.LinearMipmapLinearFilter;
detailAtlas.generateMipmaps = true;
detailAtlas.needsUpdate = true;

/** One shared mipmapped sample adds grain, masonry joints or roof seams. */
export function enhanceSurfaceMaterials(root: THREE.Object3D): void {
  const materials = new Set<THREE.MeshStandardMaterial>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material])
      if (material instanceof THREE.MeshStandardMaterial) materials.add(material);
  });
  for (const material of materials) {
    if (material.userData.islandDetail || material.map || /glass|lamp|glint|window|foliage|petal|berry|leaf/.test(material.name)) continue;
    material.userData.islandDetail = true;
    const style = /roof|^(green|teal)$/.test(material.name) ? 'roof' : /brick|stone|plaster|cream/.test(material.name) ? 'masonry' : 'grain';
    const channel = style === 'roof' ? 'b' : style === 'masonry' ? 'g' : 'r';
    const scale = style === 'grain' ? '0.68' : style === 'roof' ? '0.8' : '0.9';
    const strength = style === 'grain' ? '.15' : '.29';
    const prior = material.onBeforeCompile;
    const key = material.customProgramCacheKey();
    material.onBeforeCompile = (shader, renderer) => {
      prior.call(material, shader, renderer);
      shader.uniforms.townDetailAtlas = { value: detailAtlas };
      shader.vertexShader = 'varying vec2 townDetailUV;\n' + shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        vec3 axis = abs(normal);
        if (axis.y >= max(axis.x, axis.z)) townDetailUV = position.xz;
        else if (axis.z >= axis.x) townDetailUV = position.xy;
        else townDetailUV = position.zy;
        townDetailUV *= ${scale};`);
      shader.fragmentShader = 'uniform sampler2D townDetailAtlas;\nvarying vec2 townDetailUV;\n' +
        shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          float townDetail = texture2D(townDetailAtlas, townDetailUV).${channel};
          diffuseColor.rgb *= 1.0 + (townDetail - .52) * ${strength};`);
    };
    material.customProgramCacheKey = () => key + '-town-atlas-' + style;
    material.needsUpdate = true;
  }
}

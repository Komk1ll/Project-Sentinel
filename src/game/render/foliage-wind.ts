import * as THREE from 'three';

/** Shared by the colour and directional-shadow passes; tree geometry is ground-origin. */
const WIND_DISPLACEMENT = `
  vec3 windOrigin = vec3(0.0);
  #ifdef USE_INSTANCING
    windOrigin = instanceMatrix[3].xyz;
  #endif
  float windPhase = dot(windOrigin.xz, vec2(0.37, 0.23));
  float windWeight = smoothstep(1.6, 4.5, transformed.y);
  float gust = sin(foliageTime * 1.25 + windPhase) * 0.085
             + sin(foliageTime * 2.2 + windPhase + position.x * 2.0) * 0.025;
  transformed.x += gust * windWeight;
  transformed.z += sin(foliageTime * 1.1 + windPhase + 0.7) * 0.055 * windWeight;
`;

function addWind(material: THREE.Material, time: {value:number}): void {
  const previous = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.foliageTime = time;
    shader.vertexShader = `uniform float foliageTime;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${WIND_DISPLACEMENT}`);
  };
  material.customProgramCacheKey = () => `${previousKey()}-foliage-wind-v1`;
  material.needsUpdate = true;
}

/** Does not modify the library material or animate instances on the CPU. */
export function animateFoliage(mesh: THREE.InstancedMesh, time: {value:number}): void {
  if (Array.isArray(mesh.material)) throw new Error('Foliage must be batched by material');
  mesh.material = mesh.material.clone();
  addWind(mesh.material, time);
  const depth = new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  addWind(depth, time);
  mesh.customDepthMaterial = depth;
  mesh.computeBoundingSphere();
  mesh.computeBoundingBox();
  // Displacement is < 0.13 m before instance scaling (maximum authored scale 1.15).
  if (mesh.boundingSphere) mesh.boundingSphere.radius += .2;
  mesh.boundingBox?.expandByScalar(.2);
  mesh.userData.animatedFoliage = true;
}

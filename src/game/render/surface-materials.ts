import * as THREE from 'three';

/** Add world-space grain and roughness without textures; preserve existing shader hooks. */
export function enhanceSurfaceMaterials(root:THREE.Object3D):void {
  const materials=new Set<THREE.MeshStandardMaterial>();
  root.traverse(object=>{if(object instanceof THREE.Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material])
    if(material instanceof THREE.MeshStandardMaterial)materials.add(material);});
  for(const material of materials){
    if(material.userData.islandDetail)continue;
    material.userData.islandDetail=true;
    const prior=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
    material.onBeforeCompile=(shader,renderer)=>{
      prior.call(material,shader,renderer);
      shader.vertexShader='varying vec3 islandSurfacePosition;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        vec4 islandDetailWorld=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          islandDetailWorld=instanceMatrix*islandDetailWorld;
        #endif
        islandSurfacePosition=(modelMatrix*islandDetailWorld).xyz;`);
      shader.fragmentShader=`varying vec3 islandSurfacePosition;
        float islandHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
        float islandNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
          return mix(mix(mix(islandHash(i),islandHash(i+vec3(1,0,0)),f.x),mix(islandHash(i+vec3(0,1,0)),islandHash(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(islandHash(i+vec3(0,0,1)),islandHash(i+vec3(1,0,1)),f.x),mix(islandHash(i+vec3(0,1,1)),islandHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
        `+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float islandGrain=islandNoise(islandSurfacePosition*24.);
        float islandBroad=islandNoise(islandSurfacePosition*.8);
        diffuseColor.rgb*=.91+.10*islandGrain+.07*islandBroad;`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor=clamp(roughnessFactor+(islandGrain-.5)*.12,.12,1.);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec3 surfaceDx=dFdx(-vViewPosition),surfaceDy=dFdy(-vViewPosition);
        vec3 gradientX=cross(surfaceDy,normal),gradientY=cross(normal,surfaceDx);
        float surfaceDet=dot(surfaceDx,gradientX);
        vec3 surfaceGradient=sign(surfaceDet)*(dFdx(islandGrain)*gradientX+dFdy(islandGrain)*gradientY);
        normal=normalize(abs(surfaceDet)*normal-.007*surfaceGradient);`);
    };
    material.customProgramCacheKey=()=>cacheKey+'-island-grain-v1';
    material.needsUpdate=true;
  }
}

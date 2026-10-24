/** Assemble production shader hooks through Three's actual WebGLProgram preprocessor.
 * Native compilation is a syntax/link check, not a WebGL browser or pixel test.
 */
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import * as THREE from 'three';
import {WebGLProgram} from 'three/src/renderers/webgl/WebGLProgram.js';
const server=await createServer({server:{middlewareMode:true}});
try {
  const {createOcean}=await server.ssrLoadModule('/src/game/render/island-terrain.ts');
  const {ThreeRenderer}=await server.ssrLoadModule('/src/game/render/ThreeRenderer.ts');
  const root=new THREE.Group(),material=new THREE.MeshStandardMaterial();
  root.add(new THREE.Mesh(new THREE.BoxGeometry(),material));
  ThreeRenderer.prototype.setupCharacterCutaway.call({
    cutawayPosition:{value:new THREE.Vector3()},sightDirection:{value:new THREE.Vector3(28,34,28).normalize()},surfaceUp:{value:new THREE.Vector3(0,1,0)},
  },root);
  const pbr={...THREE.ShaderLib.standard,uniforms:{...THREE.ShaderLib.standard.uniforms}};
  material.onBeforeCompile(pbr,{});
  const {animateFoliage}=await server.ssrLoadModule('/src/game/render/foliage-wind.ts');
  const leaves=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial(),1);
  leaves.setMatrixAt(0,new THREE.Matrix4());animateFoliage(leaves,{value:1});
  ThreeRenderer.prototype.setupCharacterCutaway.call({
    cutawayPosition:{value:new THREE.Vector3()},sightDirection:{value:new THREE.Vector3(28,34,28).normalize()},surfaceUp:{value:new THREE.Vector3(0,1,0)},
  },leaves);
  const foliage={...THREE.ShaderLib.standard,uniforms:{...THREE.ShaderLib.standard.uniforms}};
  leaves.material.onBeforeCompile(foliage,{});
  const depth={...THREE.ShaderLib.depth,uniforms:{...THREE.ShaderLib.depth.uniforms}};
  leaves.customDepthMaterial.onBeforeCompile(depth,{});
  const ocean=createOcean({value:0});
  const programs=[];
  for(const [name,source,extra] of [
    ['water',ocean.material,{}],
    ['terrain',pbr,{vertexColors:true}],
    ['instanced-props',pbr,{instancing:true}],
    ['birch-bark',pbr,{instancing:true,vertexColors:true}],
    ['buildings',pbr,{}],
    ['foliage',foliage,{instancing:true}],
    ['foliage-shadow',depth,{instancing:true,useDepthPacking:true,depthPacking:THREE.RGBADepthPacking,shadowMapEnabled:false}],
  ]){
    const shaders=[];
    const gl={VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,createProgram:()=>({}),createShader:type=>({type}),shaderSource:(shader,text)=>shaders.push({type:shader.type,source:text}),compileShader:()=>{},attachShader:()=>{},linkProgram:()=>{}};
    const parameters={vertexShader:source.vertexShader,fragmentShader:source.fragmentShader,defines:{},precision:'highp',shaderName:name,shaderType:'IslandReview',outputColorSpace:THREE.SRGBColorSpace,toneMapping:THREE.ACESFilmicToneMapping,shadowMapType:THREE.PCFSoftShadowMap,shadowMapEnabled:name!=='water',numDirLights:2,numDirLightShadows:1,numHemiLights:1,numPointLights:0,numSpotLights:0,numSpotLightMaps:0,numSpotLightShadows:0,numSpotLightShadowsWithMaps:0,numPointLightShadows:0,numRectAreaLights:0,numLightProbes:0,numClippingPlanes:0,numClipIntersection:0,useFog:true,fog:true,...extra};
    new WebGLProgram({getContext:()=>gl},name,parameters,{});
    programs.push({name,shaders});
  }
  const output=process.argv[2]??'art/coastal-island/shaders';
  await mkdir(output,{recursive:true});
  await writeFile(`${output}/programs.json`,JSON.stringify(programs,null,2));
  console.log(`Exported ${programs.length} production shader variants for native compilation.`);
} finally {await server.close();}

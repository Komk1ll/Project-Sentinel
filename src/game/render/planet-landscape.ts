import * as THREE from 'three';
import { PLANET_PONDS } from '@content/planet-life';
import { placeOnPlanet,surfaceDisk,surfaceStrip } from '@game/render/planet-surface';

/** Small shared meshes create recognisable gardens instead of an empty reverse hemisphere. */
export function createPlanetLandscape():THREE.Group {
  const group=new THREE.Group();group.name='planet-landscape';
  for(const [x,z,w,d,color] of [[88,20,27,24,0x93ad78],[152,22,34,28,0x9cad70],[208,20,33,27,0x7f9b70],[112,59,30,23,0x819e74],[168,59,27,19,0x9ba977]])
    group.add(surfaceDisk(x!,z!,w!,d!,color!));
  for(const pond of PLANET_PONDS){
    group.add(surfaceDisk(pond.x,pond.z,pond.width+1.5,pond.depth+1.5,0xd6c6a0,.055));
    group.add(surfaceDisk(pond.x,pond.z,pond.width,pond.depth,0x69aeb8,.07));
    group.add(surfaceDisk(pond.x+1,pond.z-.6,pond.width*.65,pond.depth*.68,0x80bfc1,.075));
  }
  // Garden spokes connect destinations to the equatorial promenade.
  for(const x of [88,152,208])group.add(surfaceStrip(x,24,1.5,16,0xd8c9ac,.17));
  for(let row=0;row<5;row++)group.add(surfaceStrip(162,18+row*1.4,8,.9,row%2?0xc3b279:0xb7a56a,.06));
  const grassGeo=new THREE.ConeGeometry(.08,.35,4),flowerGeo=new THREE.IcosahedronGeometry(.09,0),stoneGeo=new THREE.IcosahedronGeometry(.3,0);
  const locations=Array.from({length:420},(_,i)=>{
    const patch=i%3,x=[88,152,208][patch]!+Math.sin(i*2.4)*10,z=13+Math.cos(i*3.1)*8;
    return {x,z};
  }).filter(p=>!PLANET_PONDS.some(pond=>Math.abs(p.x-pond.x)<pond.width/2+1&&Math.abs(p.z-pond.z)<pond.depth/2+1)&&Math.abs(p.x-152)>3);
  const grass=new THREE.InstancedMesh(grassGeo,new THREE.MeshStandardMaterial({color:0x6e8e56}),locations.length);
  const flowers=new THREE.InstancedMesh(flowerGeo,new THREE.MeshStandardMaterial({color:0xf1cd85}),locations.length);
  grass.name='meadow-grass';flowers.name='meadow-flowers';
  const placement=new THREE.Object3D();
  locations.forEach((p,i)=>{
    placeOnPlanet(placement,p.x,p.z,i,.15);placement.updateMatrix();grass.setMatrixAt(i,placement.matrix);
    placeOnPlanet(placement,p.x,p.z,i,.36);placement.updateMatrix();flowers.setMatrixAt(i,placement.matrix);
    flowers.setColorAt(i,new THREE.Color([0xf1cd85,0xc9979b,0xe5dfbf][i%3]!));
  });
  grass.computeBoundingSphere();flowers.computeBoundingSphere();group.add(grass,flowers);
  const stones=new THREE.InstancedMesh(stoneGeo,new THREE.MeshStandardMaterial({color:0xb1b39d}),24);
  for(let i=0;i<24;i++){
    const pond=PLANET_PONDS[i%2]!,angle=i*Math.PI/6;
    placeOnPlanet(placement,pond.x+Math.cos(angle)*(pond.width/2+1),pond.z+Math.sin(angle)*(pond.depth/2+1),i,.15);
    placement.updateMatrix();stones.setMatrixAt(i,placement.matrix);
  }
  stones.computeBoundingSphere();group.add(stones);
  return group;
}

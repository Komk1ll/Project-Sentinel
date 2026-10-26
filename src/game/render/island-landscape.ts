import { GARDEN_WALKS,onGardenWalk,onGardenBridge } from '@content/coastal-garden';
import * as THREE from 'three';
import { ROAD_CENTERS,TOWN_OPEN_SPACES } from '@content/town';
import { ISLAND_PONDS } from '@content/town-life';
import { placeOnGround,surfaceDisk,surfaceStrip,pathRibbon } from '@game/render/world-surface';

/** Small shared meshes create recognisable gardens around the island gardens. */
export function createIslandLandscape():THREE.Group {
  const group=new THREE.Group();group.name='island-landscape';
  for(const [x,z,w,d,color] of [[84,20,27,24,0x93ad78],[86,55,27,23,0x819e74],[78,5,20,14,0x9ba977]])
    group.add(pondDisk(x!,z!,w!,d!,color!,.035));
  for(const pond of ISLAND_PONDS){
    group.add(pondDisk(pond.x,pond.z,pond.width+1.5,pond.depth+1.5,0xd6c6a0,.055));
    group.add(pondDisk(pond.x,pond.z,pond.width,pond.depth,0x4d969f,.07));
    group.add(pondDisk(pond.x+.7,pond.z-.3,pond.width*.7,pond.depth*.72,0x72b1ad,.075));
  }
  // Soft planting islands give the orchard and western shore a distinct garden edge.
  for(const [x,z,w,d] of [[1,55,4,10],[10,65,11,3],[31,66,8,3],[73,60,4,9]])
    group.add(pondDisk(x!,z!,w!,d!,0x789563,.04));
  for(const walk of GARDEN_WALKS)group.add(pathRibbon(walk.points,walk.width,0xd8c9ac,.055,walk.closed));
  for(let row=0;row<5;row++)group.add(surfaceStrip(91,7+row*1.2,8,.9,row%2?0xc3b279:0xb7a56a,.06));
  const grassGeo=new THREE.ConeGeometry(.08,.35,4),flowerGeo=new THREE.IcosahedronGeometry(.09,0),stoneGeo=new THREE.IcosahedronGeometry(.3,0);
  const locations=Array.from({length:420},(_,i)=>{
    const patch=i%6,x=[73,86,94,1,10,73][patch]!+Math.sin(i*2.4)*[4,4,4,1.2,4,1.2][patch]!,z=[9,9,9,55,65,60][patch]!+Math.cos(i*3.1)*[5,5,5,4,1,3.5][patch]!;
    return {x,z};
  }).filter(p=>!onGardenWalk(p,.5)&&!ROAD_CENTERS.some(road=>(p.x>=0&&p.x<=64&&Math.abs(p.z-road)<3.6)||(p.z>=0&&p.z<=64&&Math.abs(p.x-road)<3.6))
    && !TOWN_OPEN_SPACES.some(space=>Math.abs(p.x-space.x)<1.5&&Math.abs(p.z-space.z)<space.depth/2 || Math.abs(p.z-space.z)<1.5&&Math.abs(p.x-space.x)<space.width/2)
    && !ISLAND_PONDS.some(pond=>Math.abs(p.x-pond.x)<pond.width/2+1&&Math.abs(p.z-pond.z)<pond.depth/2+1)&&Math.abs(p.z-16)>2);
  const grass=new THREE.InstancedMesh(grassGeo,new THREE.MeshStandardMaterial({color:0x6e8e56}),locations.length);
  const flowers=new THREE.InstancedMesh(flowerGeo,new THREE.MeshStandardMaterial({color:0xf1cd85}),locations.length);
  grass.name='meadow-grass';flowers.name='meadow-flowers';
  const placement=new THREE.Object3D();
  locations.forEach((p,i)=>{
    placeOnGround(placement,p.x,p.z,i,.15);placement.updateMatrix();grass.setMatrixAt(i,placement.matrix);
    placeOnGround(placement,p.x,p.z,i,.36);placement.updateMatrix();flowers.setMatrixAt(i,placement.matrix);
    flowers.setColorAt(i,new THREE.Color([0xf1cd85,0xc9979b,0xe5dfbf][i%3]!));
  });
  grass.computeBoundingSphere();flowers.computeBoundingSphere();group.add(grass,flowers);
  const shoreStones=Array.from({length:24},(_,i)=>{
    const pond=ISLAND_PONDS[i%2]!,a=i*Math.PI/6;
    return {x:pond.x+Math.cos(a)*(pond.width/2+1),z:pond.z+Math.sin(a)*(pond.depth/2+1)};
  }).filter(p=>!onGardenBridge(p,-.5)&&!onGardenWalk(p,.5));
  const stones=new THREE.InstancedMesh(stoneGeo,new THREE.MeshStandardMaterial({color:0xb1b39d}),shoreStones.length);
  shoreStones.forEach((p,i)=>{
    placeOnGround(placement,p.x,p.z,i,.15);placement.updateMatrix();stones.setMatrixAt(i,placement.matrix);
  });
  stones.computeBoundingSphere();group.add(stones);
  return group;
}

function pondDisk(x:number,z:number,width:number,depth:number,color:number,y:number):THREE.Mesh {
  const mesh=surfaceDisk(x,z,width,depth,color,y),positions=mesh.geometry.getAttribute('position');
  for(let i=1;i<positions.count;i++){
    const dx=positions.getX(i)-x,dz=positions.getZ(i)-z,a=Math.atan2(dz/(depth/2),dx/(width/2));
    const r=.94+.04*Math.sin(a*3)+.02*Math.cos(a*5);positions.setXYZ(i,x+dx*r,y,z+dz*r);
  }
  positions.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();return mesh;
}

import * as THREE from 'three';
import { COAST_CLIFFS,GARDEN_BRIDGE,ORCHARD_FENCES,SEAWALLS,onGardenWalk } from '@content/coastal-garden';
import { BREAKWATERS } from '@content/harbor';
import { ROAD_CENTERS } from '@content/town';
import { COAST_PATH } from '@content/island';
import { segmentDistance } from '@content/coastal-garden';
import { ISLAND_PONDS } from '@content/town-life';
import { TOWN_TREES } from '@content/town-props';
import { animateFoliage } from '@game/render/foliage-wind';
import { placeOnGround } from '@game/render/world-surface';

type Placement={readonly x:number;readonly z:number;readonly rotation?:number;readonly scale?:number;readonly y?:number};

/** Every repeated landscape module is drawn once per material, with shared buffers. */
export function createCoastalGarden(kit:THREE.Group,time:{value:number}):THREE.Group {
  const group=new THREE.Group();group.name='coastal-garden';
  const placement=new THREE.Object3D();
  const instances=(name:string,points:readonly Placement[],wind=false):void=>{
    const prototype=kit.getObjectByName(name);if(!prototype||!points.length)return;
    prototype.updateWorldMatrix(true,true);
    prototype.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      const mesh=new THREE.InstancedMesh(object.geometry.clone().applyMatrix4(object.matrixWorld),object.material,points.length);
      mesh.name=`garden-${name}`;mesh.castShadow=!['flower-cluster','reed-cluster'].includes(name);mesh.receiveShadow=true;
      points.forEach((p,i)=>{
        placeOnGround(placement,p.x,p.z,p.rotation??0,p.y??0);placement.scale.setScalar(p.scale??1);
        placement.updateMatrix();mesh.setMatrixAt(i,placement.matrix);
      });
      mesh.computeBoundingSphere();
      if(wind&&!Array.isArray(mesh.material)&&['foliage','foliage_light','petal','pink','reed'].includes(mesh.material.name))
        animateFoliage(mesh,time,new THREE.Vector3(name==='apple-tree'?1.8:0,name==='apple-tree'?3.8:.7,.65));
      group.add(mesh);
    });
  };
  instances('cliff-module',COAST_CLIFFS);
  const harborWalls=BREAKWATERS.flatMap(arm=>arm.slice(1).flatMap((end,i)=>{
    const start=arm[i]!,dx=end.x-start.x,dz=end.z-start.z,n=Math.ceil(Math.hypot(dx,dz)/2);
    return Array.from({length:n},(_,j)=>({x:start.x+dx*(j+.5)/n,z:start.z+dz*(j+.5)/n,rotation:-Math.atan2(dz,dx),y:.05}));
  }));
  instances('seawall',[...SEAWALLS,...harborWalls]);
  instances('garden-fence',ORCHARD_FENCES);
  instances('apple-tree',TOWN_TREES.filter(t=>t.x<=12&&t.z>=52),true);
  const flowers=Array.from({length:130},(_,i)=>{
    const patch=i%5,cx=[1,10,74,95,73][patch]!,cz=[55,65,8,42,61][patch]!;
    return {x:cx+Math.sin(i*2.399)*[1.5,4.5,3,2.2,1.8][patch]!,z:cz+Math.cos(i*2.399)*[4,1.2,3.5,3,3][patch]!,rotation:i*1.7,scale:.8+(i%4)*.13};
  }).filter(p=>!onGardenWalk(p,.7)
    && COAST_PATH.every((q,i)=>segmentDistance(p,q,COAST_PATH[(i+1)%COAST_PATH.length]!)>1.9)
    && !ROAD_CENTERS.some(c=>p.z>=0&&p.z<=64&&Math.abs(p.x-c)<3.8 || p.x>=0&&p.x<=64&&Math.abs(p.z-c)<3.8)&&!ISLAND_PONDS.some(pond=>Math.hypot((p.x-pond.x)/(pond.width/2+1),(p.z-pond.z)/(pond.depth/2+1))<1));
  instances('flower-cluster',flowers,true);
  instances('reed-cluster',ISLAND_PONDS.flatMap(pond=>Array.from({length:15},(_,i)=>{
    const a=i/15*Math.PI*2;return {x:pond.x+Math.cos(a)*(pond.width/2+.25),z:pond.z+Math.sin(a)*(pond.depth/2+.25),rotation:a,scale:.75+(i%3)*.15};
  })).filter(p=>Math.abs(p.z-GARDEN_BRIDGE.z)>1.9),true);
  const bridge=kit.getObjectByName('garden-bridge')?.clone(true);
  if(bridge){bridge.name='pond-garden-bridge';placeOnGround(bridge,GARDEN_BRIDGE.x,GARDEN_BRIDGE.z);group.add(bridge);}
  return group;
}

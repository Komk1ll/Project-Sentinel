import * as THREE from 'three';
import { LIGHTHOUSE,PIER_ORIGIN,HARBOR_BOATS } from '@content/harbor';
import { coastRadius,ISLAND_CENTER,SEA_LEVEL } from '@content/island';
import { placeOnGround,surfaceStrip } from '@game/render/world-surface';
import { animateFoliage } from '@game/render/foliage-wind';

export function createHarbor(kit:THREE.Group,time:{value:number}):THREE.Group {
  const group=new THREE.Group();group.name='island-harbor';
  for(const [name,p] of [['lighthouse',LIGHTHOUSE],['pier',PIER_ORIGIN]] as const){
    const model=kit.getObjectByName(name)?.clone(true);if(!model)continue;
    placeOnGround(model,p.x,p.z);group.add(model);
  }
  HARBOR_BOATS.forEach((p,i)=>{
    const boat=kit.getObjectByName('boat')?.clone(true);if(!boat)return;
    boat.name=`harbor-boat-${i}`;placeOnGround(boat,p.x,p.z,p.rotation,SEA_LEVEL+.15);group.add(boat);
  });
  const placement=new THREE.Object3D();
  for(const [name,count,fraction] of [['coast-rock',64,.984],['dune-grass',240,.92]] as const){
    const prototype=kit.getObjectByName(name);if(!prototype)continue;prototype.updateWorldMatrix(true,true);
    prototype.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
      const points=Array.from({length:count},(_,i)=>{
        const a=name==='dune-grass'?(Math.floor(i/6)/40*Math.PI*2+(i%6-2.5)*.006):i/count*Math.PI*2;
        const r=coastRadius(a)*(fraction+Math.sin(i*2.3)*(name==='dune-grass'?.016:.012));
        return {x:ISLAND_CENTER.x+Math.cos(a)*r,z:ISLAND_CENTER.z+Math.sin(a)*r};
      }).filter((p,i)=>!(Math.abs(p.x-58)<10&&p.z>65)&&(name!=='coast-rock'||i%9<5));
      const mesh=new THREE.InstancedMesh(geometry,object.material,points.length);mesh.name=name==='coast-rock'?'coastal-boulders':'dune-grass';
      mesh.castShadow=name==='coast-rock';mesh.receiveShadow=true;
      points.forEach((p,i)=>{
        placeOnGround(placement,p.x,p.z,i*1.7,name==='coast-rock'?-.2:.035);
        placement.scale.setScalar(name==='coast-rock'?.7+(i%5)*.23:.7+(i%4)*.18);
        placement.updateMatrix();mesh.setMatrixAt(i,placement.matrix);
      });
      mesh.computeBoundingSphere();
      if(name==='dune-grass')animateFoliage(mesh,time,new THREE.Vector3(0,.5,.6));
      group.add(mesh);
    });
  }
  group.add(surfaceStrip(0,67.2,1.7,4,0xc9b998,.055),surfaceStrip(2,68.5,6,1.7,0xc9b998,.055));
  group.add(surfaceStrip(58,66,3.6,5,0xc9b998,.055));
  // A single additive volume suggests the beacon; no dynamic shadow light or bloom.
  const rotor=new THREE.Group();rotor.name='lighthouse-beacon';rotor.position.set(LIGHTHOUSE.x,9.25,LIGHTHOUSE.z);
  const beamGeometry=new THREE.ConeGeometry(2.1,22,12,1,true);beamGeometry.translate(0,-11,0);beamGeometry.rotateZ(Math.PI/2);
  const beam=new THREE.Mesh(beamGeometry,new THREE.MeshBasicMaterial({color:0xffdda4,transparent:true,opacity:.025,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  beam.name='beacon-spill';rotor.add(beam);group.add(rotor);
  return group;
}
export function updateHarbor(group:THREE.Object3D|null,time:number):void {
  if(!group||!Number.isFinite(time))return;
  const rotor=group.getObjectByName('lighthouse-beacon');if(rotor)rotor.rotation.y=time*.22;
  HARBOR_BOATS.forEach((_,i)=>{
    const boat=group.getObjectByName(`harbor-boat-${i}`);if(!boat)return;
    boat.position.y=SEA_LEVEL+.15+Math.sin(time*1.1+i*2)*.035;
    boat.rotation.z=Math.sin(time*.8+i)*.025;
  });
}

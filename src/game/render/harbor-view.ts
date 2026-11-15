import * as THREE from 'three';
import { LIGHTHOUSE,PIER_ORIGIN,HARBOR_BOATS,HARBOR_PATHS,HARBOR_RAILS,boatAltitude } from '@content/harbor';
import { coastRadius,ISLAND_CENTER,SEA_LEVEL } from '@content/island';
import { placeOnGround,surfaceStrip } from '@game/render/world-surface';
import { animateFoliage } from '@game/render/foliage-wind';

export function createHarbor(kit:THREE.Group,time:{value:number}):THREE.Group {
  const group=new THREE.Group();group.name='island-harbor';
  for(const [name,p] of [['lighthouse',LIGHTHOUSE],['pier',PIER_ORIGIN]] as const){
    const model=kit.getObjectByName(name)?.clone(true);if(!model)continue;
    if (name === 'pier') model.getObjectByName('batch-pier-rope')?.removeFromParent();
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
  for(const p of HARBOR_PATHS)group.add(surfaceStrip(p.x,p.z,p.width,p.depth,0xc9b998,.055));
  const rope = new THREE.MeshStandardMaterial({ color: 0x82715b, roughness: 1 });
  const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), rope, HARBOR_RAILS.length * 2);
  HARBOR_RAILS.forEach((rail, index) => {
    [.52, 1.05].forEach((height, level) => {
      placeOnGround(placement, rail.x, rail.z, 0, height);
      placement.scale.set(rail.width, .055, rail.depth);
      placement.updateMatrix();
      rails.setMatrixAt(index * 2 + level, placement.matrix);
    });
  });
  const stepMaterial = new THREE.MeshStandardMaterial({ color: 0x918b77, roughness: .94 });
  const steps = new THREE.InstancedMesh(new THREE.BoxGeometry(1.75, .33, .55), stepMaterial, 4);
  for (let i = 0; i < 4; i++) {
    placeOnGround(placement, 62.1, 75.35 + i * .47, 0, -.04 - i * .15);
    placement.scale.setScalar(1);
    placement.updateMatrix();
    steps.setMatrixAt(i, placement.matrix);
  }
  steps.name = 'quay-steps';
  steps.receiveShadow = true;
  group.add(steps);
  const ropeGeometry = new THREE.BoxGeometry(.045, .045, 1);
  HARBOR_BOATS.forEach((_, index) => {
    const line = new THREE.Mesh(ropeGeometry, rope);
    line.name = 'mooring-line-' + index;
    group.add(line);
  });
  const berthMarkers = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.65, .01, .16),
    new THREE.MeshStandardMaterial({ color: 0xe4bc76, roughness: .9 }),
    HARBOR_BOATS.length,
  );
  HARBOR_BOATS.forEach((berth, index) => {
    placement.position.set(berth.boarding.x, .053, 90.55);
    placement.rotation.set(0, 0, 0);
    placement.scale.setScalar(1);
    placement.updateMatrix();
    berthMarkers.setMatrixAt(index, placement.matrix);
  });
  berthMarkers.receiveShadow = true;
  group.add(berthMarkers);
  rails.castShadow = true;
  rails.receiveShadow = true;
  group.add(rails);
  // A single additive volume suggests the beacon; no dynamic shadow light or bloom.
  const rotor=new THREE.Group();rotor.name='lighthouse-beacon';rotor.position.set(LIGHTHOUSE.x,9.25,LIGHTHOUSE.z);
  const beamGeometry=new THREE.ConeGeometry(2.1,22,12,1,true);beamGeometry.translate(0,-11,0);beamGeometry.rotateZ(Math.PI/2);
  const beam=new THREE.Mesh(beamGeometry,new THREE.MeshBasicMaterial({color:0xffdda4,transparent:true,opacity:.025,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  beam.name='beacon-spill';rotor.add(beam);group.add(rotor);
  return group;
}
export function updateHarbor(group:THREE.Object3D|null,time:number, active?: { index: number; x: number; z: number; heading: number }):void {
  if(!group||!Number.isFinite(time))return;
  const rotor=group.getObjectByName('lighthouse-beacon');if(rotor)rotor.rotation.y=time*.22;
  HARBOR_BOATS.forEach((berth,i)=>{
    const boat=group.getObjectByName(`harbor-boat-${i}`);if(!boat)return;
    const pose = active?.index === i ? active : berth;
    boat.position.set(pose.x, boatAltitude(time, i), pose.z);
    boat.rotation.y = active?.index === i ? active.heading : berth.rotation;
    boat.rotation.z=Math.sin(time*.8+i)*.025;
    const line = group.getObjectByName('mooring-line-' + i);
    if (line) {
      line.visible = active?.index !== i;
      const start = new THREE.Vector3(berth.x + .37, .37, 90.53);
      const end = new THREE.Vector3(berth.x + .24, boat.position.y + .25, berth.z - 1.48);
      line.position.copy(start).lerp(end, .5);
      line.scale.z = start.distanceTo(end);
      line.lookAt(end);
    }
  });
}

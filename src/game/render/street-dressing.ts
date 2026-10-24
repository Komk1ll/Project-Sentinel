import * as THREE from 'three';
import { STREET_BEDS,STREET_BUSHES,STREET_LAMPS,STREET_BINS } from '@content/street-details';
import { TOWN_CARS,TOWN_PLANTERS } from '@content/town-props';
import { placeOnGround } from '@game/render/world-surface';
import { animateFoliage } from '@game/render/foliage-wind';

type Placement={readonly x:number;readonly z:number;readonly rotation?:number};

export function createStreetDressing(kit:THREE.Group,time:{value:number}):THREE.Group {
  const group=new THREE.Group();group.name='evening-streets';
  const placement=new THREE.Object3D();
  const instances=(name:string,points:readonly Placement[]):void=>{
    const prototype=kit.getObjectByName(name);if(!prototype)return;
    prototype.updateWorldMatrix(true,true);
    prototype.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
      const mesh=new THREE.InstancedMesh(geometry,object.material,points.length);
      mesh.name=`street-${name}`;mesh.castShadow=true;mesh.receiveShadow=true;
      points.forEach((point,i)=>{placeOnGround(placement,point.x,point.z,point.rotation??0);placement.updateMatrix();mesh.setMatrixAt(i,placement.matrix);});
      mesh.computeBoundingSphere();
      if(!Array.isArray(mesh.material)&&['leaf','petal','berry'].includes(mesh.material.name))
        animateFoliage(mesh,time,new THREE.Vector3(.2,.9,.28));
      group.add(mesh);
    });
  };
  instances('shrub',STREET_BUSHES);
  instances('flowerbed',[...STREET_BEDS,...TOWN_PLANTERS]);
  instances('lantern',STREET_LAMPS);
  instances('litter-bin',STREET_BINS);
  for(const [i,car] of TOWN_CARS.entries()){
    const prototype=kit.getObjectByName(i%2?'car-wagon':'car-hatch');if(!prototype)continue;
    const model=prototype.clone(true);model.name=`parked-car-${i}`;
    const paints=new Map<THREE.Material,THREE.Material>();
    model.traverse(object=>{
      if(!(object instanceof THREE.Mesh)||Array.isArray(object.material))return;
      const material=object.material;
      if(material instanceof THREE.MeshStandardMaterial && material.name==='paint'){
        let tinted=paints.get(material);
        if(!tinted){const copy=material.clone();copy.color.setHex(car.color);paints.set(material,copy);tinted=copy;}
        object.material=tinted;
      }
    });
    placeOnGround(model,car.x,car.z,car.rotation);group.add(model);
  }
  const windows=kit.getObjectByName('evening-windows')?.clone(true);
  if(windows){windows.name='illuminated-windows';group.add(windows);}

  // Warm vertex-faded pools simulate spill light with one cheap draw, no point-light shadows.
  const positions=[0,.075,0],colors=[1,.55,.19],indices:number[]=[];
  for(let i=0;i<=24;i++){
    const a=i/24*Math.PI*2;positions.push(Math.cos(a)*1.7,.075,Math.sin(a)*1.7);colors.push(0,0,0);
    if(i<24)indices.push(0,i+1,i+2);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);
  const material=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.3,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  const pools=new THREE.InstancedMesh(geometry,material,STREET_LAMPS.length);pools.name='lantern-light-pools';
  STREET_LAMPS.forEach((lamp,i)=>{placeOnGround(placement,lamp.x+.28,lamp.z);placement.updateMatrix();pools.setMatrixAt(i,placement.matrix);});
  pools.computeBoundingSphere();group.add(pools);
  return group;
}

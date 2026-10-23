import { MILL,COAST_PATH } from '@content/island';
import * as THREE from 'three';
import { TOWN_STOPS } from '@content/town-life';
import { placeOnGround } from '@game/render/world-surface';
import type { TownLife } from '@game/systems/town-life';

export class TownLifeView {
  readonly group=new THREE.Group();
  private elapsed=0;
  private readonly actors:THREE.Group[]=[];
  private readonly butterflies:THREE.Group[]=[];
  private readonly jets:THREE.Mesh[]=[];
  private readonly sails=new THREE.Group();
  private readonly flowers:THREE.Mesh[]=[];
  private readonly materials=new Map<number,THREE.MeshStandardMaterial>();
  private readonly sphere=new THREE.SphereGeometry(1,10,8);
  private readonly cube=new THREE.BoxGeometry(1,1,1);
  constructor(private readonly life:TownLife,prototype?:THREE.Group){
    this.group.name='town-life';
    const mesh=(parent:THREE.Object3D,color:number,x:number,y:number,z:number,w:number,h:number,d:number,round=false):THREE.Mesh=>{
      let material=this.materials.get(color);if(!material){material=new THREE.MeshStandardMaterial({color,roughness:.8});this.materials.set(color,material);}
      const item=new THREE.Mesh(round?this.sphere:this.cube,material);item.position.set(x,y,z);item.scale.set(w,h,d);item.castShadow=true;item.receiveShadow=true;parent.add(item);return item;
    };
    for(const resident of life.residents){
      const actor=prototype?.clone(true)??new THREE.Group();actor.name=`resident-${resident.data.id}`;
      // Recolour only clothing; preserve skin, face and shared geometry.
      if(prototype){const copied=new Map<THREE.Material,THREE.Material>();actor.traverse(object=>{
        if(!(object instanceof THREE.Mesh))return;
        const recolour=(source:THREE.Material):THREE.Material=>{
          if(copied.has(source))return copied.get(source)!;
          const material=source.clone();
          if(material instanceof THREE.MeshStandardMaterial && /coat|jacket|fabric|shirt|teal/i.test(material.name))material.color.setHex(resident.data.color);
          copied.set(source,material);return material;
        };object.material=Array.isArray(object.material)?object.material.map(recolour):recolour(object.material);
      });}else {mesh(actor,resident.data.color,0,1,0,.24,.5,.19,true);mesh(actor,0xc29b7a,0,1.55,0,.18,.21,.18,true);}
      this.actors.push(actor);this.group.add(actor);
    }
    for(const stop of TOWN_STOPS){
      const group=new THREE.Group();group.name=`stop-${stop.id}`;placeOnGround(group,stop.x,stop.z);this.group.add(group);
      if(stop.kind==='board'){
        mesh(group,0x80644b,0,.65,0,.12,1.3,.12);mesh(group,0x387d78,0,1.45,0,1.3,.65,.12);
        for(let i=0;i<3;i++)mesh(group,0xf1dfb1,-.36+i*.36,1.45,.07,.23,.35,.02);
      }else {
        for(let i=0;i<12;i++){
          const x=(i%4)*.3-.45,z=Math.floor(i/4)*.3-.3;
          mesh(group,0x5e8057,x,.14,z,.025,.28,.025);
          this.flowers.push(mesh(group,i%2?0xe9be68:0xc48083,x,.32,z,.10,.055,.10,true));
        }
        mesh(group,0x488f93,.8,.2,0,.16,.19,.15,true);
      }
    }
    const fountain=new THREE.Group();fountain.name='garden-fountain';placeOnGround(fountain,24,24);this.group.add(fountain);
    mesh(fountain,0xb4baa5,0,.22,0,.9,.22,.9,true);mesh(fountain,0x6aadae,0,.41,0,.75,.025,.75,true);
    for(let i=0;i<12;i++)this.jets.push(mesh(fountain,0xbfe5e1,0,.7,0,.035,.07,.035,true));
    const mill=new THREE.Group();mill.scale.setScalar(1.4);mill.name='meadow-windmill';placeOnGround(mill,MILL.x,MILL.z);this.group.add(mill);
    const tower=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.3,4,16),new THREE.MeshStandardMaterial({color:0xeadbb9,roughness:.9}));
    tower.position.y=2;tower.castShadow=true;tower.receiveShadow=true;mill.add(tower);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(1.4,1.3,16),new THREE.MeshStandardMaterial({color:0x667b6c,roughness:.85}));
    roof.position.y=4.6;roof.castShadow=true;mill.add(roof);
    mesh(mill,0x387d78,0,.8,1.22,.65,1.6,.08);
    mesh(mill,0x4b6668,-.55,2.7,.92,.35,.55,.08);mesh(mill,0x4b6668,.55,2.7,.92,.35,.55,.08);
    this.sails.name='windmill-sails';this.sails.position.set(0,3.5,1.28);mill.add(this.sails);
    for(let i=0;i<4;i++){const blade=new THREE.Group();blade.rotation.z=i*Math.PI/2;this.sails.add(blade);mesh(blade,0xf4e2be,.14,1.1,0,.3,1.8,.08);}
    for(let i=0;i<20;i++){
      const lamp=new THREE.Group();lamp.name='promenade-lamp';const point=COAST_PATH[Math.floor(i*COAST_PATH.length/20)]!;placeOnGround(lamp,point.x,point.z);this.group.add(lamp);
      mesh(lamp,0x485f59,0,1.15,0,.07,2.3,.07);mesh(lamp,0xf9d99d,0,2.4,0,.18,.20,.18,true);
    }
    for(let i=0;i<12;i++){
      const butterfly=new THREE.Group();butterfly.name='butterfly';
      for(const side of [-1,1])mesh(butterfly,i%2?0xe6bb67:0x85bbbd,side*.09,0,0,.11,.02,.13,true);
      this.butterflies.push(butterfly);this.group.add(butterfly);
    }
    this.update(0);
  }
  update(delta:number):void{
    this.elapsed+=Math.min(Math.max(delta,0),.05);
    this.actors.forEach((actor,i)=>{
      const resident=this.life.residents[i]!;placeOnGround(actor,resident.position.x,resident.position.z,resident.heading,.065);
      const stride=resident.walking?Math.sin(this.elapsed*7+i)*.48:0;
      for(const [name,angle] of [['left-leg',stride],['right-leg',-stride],['left-arm',-stride*.65],['right-arm',stride*.65]] as const){
        const limb=actor.getObjectByName(name);if(limb)limb.rotation.x=angle;
      }
    });
    this.sails.rotation.z=this.elapsed*.3;
    this.jets.forEach((jet,i)=>{const t=(this.elapsed*.7+i/12)%1,angle=i*Math.PI/6;jet.position.set(Math.cos(angle)*t*.65,.42+Math.sin(t*Math.PI)*.85,Math.sin(angle)*t*.65);});
    this.butterflies.forEach((object,i)=>{
      const x=i<6?23:86,z=i<6?27:36;
      placeOnGround(object,x+Math.sin(this.elapsed*.5+i)*2,z+Math.cos(this.elapsed*.35+i)*2,this.elapsed*.3,1.5+Math.sin(this.elapsed+i)*.3);
      object.children.forEach((wing,j)=>wing.rotation.z=Math.sin(this.elapsed*12+i)*(j?1:-1));
    });
    this.flowers.forEach((flower,i)=>{flower.position.y=.32+(this.life.watered ? .10 : 0);flower.rotation.z=Math.sin(this.elapsed*2+i)*.1;});
  }
}

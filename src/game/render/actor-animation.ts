import * as THREE from 'three';

/** Blender-authored transform clips; movement and parcel attachment remain simulation-owned. */
export class ActorAnimation {
  private readonly mixer:THREE.AnimationMixer;
  private readonly actions=new Map<string,THREE.AnimationAction>();
  private active:THREE.AnimationAction|null=null;
  constructor(private readonly root:THREE.Object3D,clips:readonly THREE.AnimationClip[]){
    this.mixer=new THREE.AnimationMixer(root);
    for(const clip of clips)if(['Idle','Walk','Greet'].includes(clip.name))this.actions.set(clip.name,this.mixer.clipAction(clip));
  }
  get available():boolean{return this.actions.has('Idle')&&this.actions.has('Walk');}
  update(delta:number,walking:boolean,greeting=false):void{
    const action=this.actions.get(greeting?'Greet':walking?'Walk':'Idle');
    if(!action)return;
    if(action!==this.active){
      const previous=this.active;
      action.reset().setEffectiveWeight(1).play();
      if(previous)action.crossFadeFrom(previous,.18,false);
      this.active=action;
    }
    this.mixer.update(Number.isFinite(delta)?Math.max(0,Math.min(.05,delta)):0);
  }
  dispose():void{this.mixer.stopAllAction();this.mixer.uncacheRoot(this.root);}
}

import { PLANET_RESIDENTS, PLANET_STOPS } from '@content/planet-life';
import { planetDistance, longitudeDelta, latitudeScale } from '@game/systems/planet';
import { isWalkableTownPosition, type TownPosition, type TownWorld } from '@game/systems/town-world';

export class TownLife {
  readonly residents=PLANET_RESIDENTS.map(data=>({data,position:{...data.route[0]!},heading:0,walking:false,index:1,pause:1}));
  private clock=0;
  private wateredUntil=0;
  private noticeUntil=0;
  private notice='';
  private readonly listeners=new Set<()=>void>();
  constructor(readonly world:TownWorld) {}
  get watered():boolean {return this.clock<this.wateredUntil;}
  get message():string {return this.clock<this.noticeUntil?this.notice:'';}
  get interaction():{id:string;label:string;text:string}|null {
    if(this.world.interior)return null;
    const candidates=[...this.residents.map(r=>({id:r.data.id,label:`${r.data.name} · поговорить`,text:r.data.dialogue,position:r.position})),
      ...PLANET_STOPS.map(s=>({...s,position:s}))];
    return candidates.map(item=>({...item,distance:planetDistance(this.world.position,item.position)})).filter(item=>item.distance<2.5).sort((a,b)=>a.distance-b.distance)[0]??null;
  }
  interact():boolean {
    const target=this.interaction;if(!target)return false;
    this.notice=target.text;this.noticeUntil=this.clock+12;
    if(target.id==='flowers')this.wateredUntil=this.clock+30;
    const resident=this.residents.find(r=>r.data.id===target.id);if(resident)resident.pause=12;
    this.notify();return true;
  }
  update(delta:number):void {
    if(!Number.isFinite(delta)||delta<=0)return;
    const dt=Math.min(delta,.05);const hadMessage=Boolean(this.message);this.clock+=dt;
    for(const resident of this.residents){
      resident.walking=false;
      if(resident.pause>0){resident.pause-=dt;continue;}
      const goal=resident.data.route[resident.index]!;
      const scale=latitudeScale(resident.position.z);
      const dx=longitudeDelta(resident.position.x,goal.x)*scale,dz=goal.z-resident.position.z,length=Math.hypot(dx,dz);
      if(length<.12){resident.index=(resident.index+1)%resident.data.route.length;resident.pause=2.5;continue;}
      const next:TownPosition={x:resident.position.x+dx/length*dt*.85/scale,z:resident.position.z+dz/length*dt*.85};
      if(isWalkableTownPosition(next)){resident.position=next;resident.walking=true;resident.heading=Math.atan2(dx,dz);}
      else {resident.index=(resident.index+1)%resident.data.route.length;resident.pause=1;}
    }
    // HUD updates at a modest rate while idle, rather than rebuilding every frame.
    if(Math.floor((this.clock-dt)*4)!==Math.floor(this.clock*4)||hadMessage!==Boolean(this.message))this.notify();
  }
  subscribe(listener:()=>void):()=>void {this.listeners.add(listener);listener();return()=>this.listeners.delete(listener);}
  destroy():void {this.listeners.clear();}
  private notify():void {this.listeners.forEach(listener=>listener());}
}

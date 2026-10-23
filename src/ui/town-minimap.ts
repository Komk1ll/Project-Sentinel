import { buildingEntrance, PARK, ROAD_CENTERS, TOWN_BUILDINGS, TOWN_SIZE } from '@content/town';
import { getInteriorLayout } from '@content/interiors';
import { MASTER, MEDIC } from '@content/first-aid';
import type { FirstAidMission } from '@game/systems/first-aid-mission';
import type { TownWorld } from '@game/systems/town-world';
import { navigationGoal, walkingRoute } from '@game/systems/town-navigation';

/** North stays at the top. Indoors uses the same metric bounds as room collision. */
export function minimapProjection(size: number, indoors: boolean): { x: (value: number) => number; z: (value: number) => number; scale: number } {
  const scale = (size-24)/(indoors ? 10 : TOWN_SIZE);
  return {scale, x:value=>indoors ? size/2+value*scale : 12+value*scale,
    z:value=>indoors ? size/2+value*scale : 12+value*scale};
}

export function drawMinimap(canvas: HTMLCanvasElement, world: TownWorld, mission: FirstAidMission): void {
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const size = canvas.clientWidth || 240, ratio = Math.min(window.devicePixelRatio || 1, 2);
  const resolution = Math.round(size*ratio);
  if (canvas.width!==resolution || canvas.height!==resolution) canvas.width=canvas.height=resolution;
  ctx.setTransform(ratio,0,0,ratio,0,0); ctx.clearRect(0,0,size,size);
  ctx.fillStyle='#dce4cf'; ctx.fillRect(0,0,size,size);
  const p=minimapProjection(size,world.interior!==null), {scale}=p;
  const rect=(x:number,z:number,w:number,d:number):void=>ctx.fillRect(p.x(x-w/2),p.z(z-d/2),w*scale,d*scale);
  const dot=(x:number,z:number,r:number,color:string):void=>{
    ctx.beginPath(); ctx.arc(p.x(x),p.z(z),r,0,Math.PI*2); ctx.fillStyle=color; ctx.fill();
    ctx.strokeStyle='#fff9e8'; ctx.lineWidth=1.5; ctx.stroke();
  };
  const label=(text:string,x:number,z:number,color='#244747'):void=>{
    ctx.font='bold 11px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.lineWidth=3; ctx.strokeStyle='#fff9e8'; ctx.strokeText(text,p.x(x),p.z(z));
    ctx.fillStyle=color; ctx.fillText(text,p.x(x),p.z(z));
  };
  if (world.interior) {
    ctx.fillStyle='#f6f2e5'; rect(0,0,10,8);
    ctx.strokeStyle='#829782'; ctx.lineWidth=2; ctx.strokeRect(p.x(-5),p.z(-4),10*scale,8*scale);
    ctx.fillStyle='#9dab9f';
    for (const obstacle of getInteriorLayout(world.interior).obstacles) rect(obstacle.x,obstacle.z,obstacle.width,obstacle.depth);
    ctx.fillStyle='#347d78'; rect(0,4,1.6,.16);
    label('Выход',0,3.65);
  } else {
    ctx.fillStyle='#f3eddb';
    for (const road of ROAD_CENTERS) { rect(road,32,5,64); rect(32,road,64,5); }
    ctx.fillStyle='#99b987'; rect(PARK.x,PARK.z,PARK.width,PARK.depth);
    label('Парк',PARK.x,PARK.z);
    for (const building of TOWN_BUILDINGS) {
      ctx.fillStyle=building.id==='station'||building.id==='clinic' ? '#347d78' : '#b3b8a6';
      rect(building.x,building.z,building.width,building.depth);
    }
  }
  const goal=navigationGoal(world,mission.snapshot.targetBuildingId);
  if (goal) {
    const route=walkingRoute(world.position,goal.position,world.interior);
    ctx.beginPath(); route.forEach((point,i)=>i===0 ? ctx.moveTo(p.x(point.x),p.z(point.z)) : ctx.lineTo(p.x(point.x),p.z(point.z)));
    ctx.strokeStyle='#fff9e8'; ctx.lineWidth=5; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.stroke();
    ctx.strokeStyle='#b87919'; ctx.lineWidth=2.5; ctx.stroke();
    dot(goal.position.x,goal.position.z,5,'#b87919');
  }
  if (!world.interior) for (const [id,symbol] of [['station','М'],['clinic','+']] as const) {
    const building=TOWN_BUILDINGS.find(b=>b.id===id)!;
    label(symbol,building.x,building.z,'#164e49');
    const entry=buildingEntrance(building);
    if (mission.snapshot.targetBuildingId===id) {
      ctx.strokeStyle='#b87919'; ctx.lineWidth=2;
      ctx.strokeRect(p.x(building.x-building.width/2)-2,p.z(building.z-building.depth/2)-2,building.width*scale+4,building.depth*scale+4);
      // The endpoint marks the actual interaction position, not the building centre.
      dot(entry.x,entry.z,5,'#b87919');
    }
  }
  if (world.interior) {
    const actor=[MASTER,MEDIC].find(person=>person.buildingId===world.interior?.id);
    if (actor) { dot(actor.x,actor.z,4,mission.snapshot.targetBuildingId===actor.buildingId?'#b87919':'#6e8c7a'); label(actor===MASTER?'Мастер':'Медик',actor.x,actor.z-.65); }
  }
  dot(world.position.x,world.position.z,5,'#146fca');
  ctx.font='bold 11px Arial'; ctx.textAlign=p.x(world.position.x)>size/2?'right':'left'; ctx.textBaseline='bottom';
  const labelX=p.x(world.position.x)+(ctx.textAlign==='right'?-8:8), labelY=Math.max(14,p.z(world.position.z)-5);
  ctx.strokeStyle='#fff9e8'; ctx.lineWidth=3; ctx.strokeText('Вы',labelX,labelY);
  ctx.fillStyle='#174e85'; ctx.fillText('Вы',labelX,labelY);
}

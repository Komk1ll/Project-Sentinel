import { LIGHTHOUSE,PIER_DECKS,COASTAL_TREES,HARBOR_PATHS,BREAKWATERS } from '@content/harbor';
import { ISLAND_BOUNDS, COAST_PATH, coastOutline, MILL } from '@content/island';
import { TOWN_STOPS, WILD_TREES, ISLAND_PONDS } from '@content/town-life';
import { TOWN_OPEN_SPACES, ROAD_CENTERS, TOWN_BUILDINGS, TOWN_SIZE } from '@content/town';
import { TOWN_TREES } from '@content/town-props';
import { getInteriorLayout } from '@content/interiors';
import { MASTER, MEDIC } from '@content/first-aid';
import type { FirstAidMission } from '@game/systems/first-aid-mission';
import type { TownPosition, TownWorld } from '@game/systems/town-world';
import { navigationGoal, walkingRoute } from '@game/systems/town-navigation';

export type MinimapMode = 'nearby' | 'district' | 'island';
interface MapProjection { readonly x: (value: number) => number; readonly z: (value: number) => number; readonly scale: number; }

/** North stays at the top; room dimensions match movement collision. */
export function minimapProjection(size: number, indoors: boolean): MapProjection {
  const scale = (size-24)/(indoors ? 10 : TOWN_SIZE);
  return {scale, x:value=>indoors ? size/2+value*scale : 12+value*scale,
    z:value=>indoors ? size/2+value*scale : 12+value*scale};
}

/** Frame the complete route, never just the player with an off-screen destination. */
export function routeMapProjection(size: number, points: readonly TownPosition[], mode: MinimapMode): MapProjection {
  if(mode==='island'){
    const scale=(size-24)/(ISLAND_BOUNDS.maxX-ISLAND_BOUNDS.minX);
    return {scale,x:value=>12+(value-ISLAND_BOUNDS.minX)*scale,z:value=>size/2+(value-32)*scale};
  }
  if(points.some(point=>point.x<0||point.x>64||point.z<0||point.z>64)&&mode==='nearby'){
    const xs=points.map(point=>point.x),zs=points.map(point=>point.z);
    const span=Math.max(32,Math.max(...xs)-Math.min(...xs)+16,Math.max(...zs)-Math.min(...zs)+16);
    const scale=(size-24)/span,startX=(Math.max(...xs)+Math.min(...xs)-span)/2,startZ=(Math.max(...zs)+Math.min(...zs)-span)/2;
    return {scale,x:value=>12+(value-startX)*scale,z:value=>12+(value-startZ)*scale};
  }
  if (mode==='district' || points.length===0) return minimapProjection(size,false);
  const xs=points.map(point=>point.x), zs=points.map(point=>point.z);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minZ=Math.min(...zs), maxZ=Math.max(...zs);
  const span=Math.min(64,Math.max(32,maxX-minX+12,maxZ-minZ+12));
  const startX=Math.max(0,Math.min(64-span,(minX+maxX-span)/2));
  const startZ=Math.max(0,Math.min(64-span,(minZ+maxZ-span)/2));
  const scale=(size-24)/span;
  return {scale,x:value=>12+(value-startX)*scale,z:value=>12+(value-startZ)*scale};
}

export function drawMinimap(canvas: HTMLCanvasElement, world: TownWorld, mission: FirstAidMission, mode: MinimapMode = 'nearby'): void {
  const ctx=canvas.getContext('2d'); if (!ctx) return;
  const size=canvas.clientWidth || 240, ratio=Math.min(window.devicePixelRatio || 1,2);
  const resolution=Math.round(size*ratio);
  if(canvas.width!==resolution || canvas.height!==resolution) canvas.width=canvas.height=resolution;
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,size,size);
  const goal=navigationGoal(world,mission.snapshot.targetBuildingId);
  const route=goal ? walkingRoute(world.position,goal.position,world.interior) : [];
  const p=world.interior ? minimapProjection(size,true) : routeMapProjection(size,[world.position,...route,...(goal?[goal.position]:[])],mode);
  const visible=(x:number,z:number):boolean=>p.x(x)>9 && p.x(x)<size-9 && p.z(z)>9 && p.z(z)<size-9;
  const rect=(x:number,z:number,w:number,d:number):void=>ctx.fillRect(p.x(x-w/2),p.z(z-d/2),w*p.scale,d*p.scale);
  const text=(label:string,x:number,z:number,color='#304b49'):void=>{
    if(!visible(x,z) || p.z(z)<20 || p.z(z)>size-20)return;
    ctx.lineJoin='round';ctx.miterLimit=2;
    ctx.font=`600 ${size>360?13:10}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.strokeStyle='#fffaf0';ctx.lineWidth=3;ctx.strokeText(label,p.x(x),p.z(z));
    ctx.fillStyle=color;ctx.fillText(label,p.x(x),p.z(z));
  };
  ctx.fillStyle=world.interior?'#edf0e2':'#9cc8ce';ctx.fillRect(0,0,size,size);
  ctx.save();ctx.beginPath();ctx.rect(7,7,size-14,size-14);ctx.clip();
  if(world.interior){
    ctx.fillStyle='#fffaf0';rect(0,0,10,8);
    ctx.strokeStyle='#839890';ctx.lineWidth=2;ctx.strokeRect(p.x(-5),p.z(-4),10*p.scale,8*p.scale);
    ctx.fillStyle='#b0b9ac';
    for(const item of getInteriorLayout(world.interior).obstacles)rect(item.x,item.z,item.width,item.depth);
    ctx.fillStyle='#267e7b';rect(0,4,1.6,.16);
    text('Выход',0,3.65);
  } else {
    for(const [fraction,color] of [[1.06,'#dfd0ac'],[.94,'#c7d6ad']] as const){
      ctx.beginPath();coastOutline(fraction).forEach((point,i)=>i?ctx.lineTo(p.x(point.x),p.z(point.z)):ctx.moveTo(p.x(point.x),p.z(point.z)));
      ctx.closePath();ctx.fillStyle=color;ctx.fill();
    }
    ctx.beginPath();COAST_PATH.forEach((point,i)=>i?ctx.lineTo(p.x(point.x),p.z(point.z)):ctx.moveTo(p.x(point.x),p.z(point.z)));
    ctx.closePath();ctx.strokeStyle='#f2e6c9';ctx.lineWidth=2.6*p.scale;ctx.stroke();
    ctx.fillStyle='#f2e6c9';
    for(const road of ROAD_CENTERS){rect(road,-3,2.6,6);rect(road,67,2.6,6);rect(-4,road,8,2.6);rect(82,road,36,2.6);}

    for(const space of TOWN_OPEN_SPACES){
      ctx.fillStyle=space.kind==='square'?'#e5d4b1':'#bdd3a7';rect(space.x,space.z,space.width,space.depth);
      ctx.fillStyle='#ede5cd';rect(space.x,space.z,2.4,space.depth);rect(space.x,space.z,space.width,2.4);
    }
    ctx.fillStyle='#fdf9ef';
    for(const road of ROAD_CENTERS){rect(road,32,6.6,64);rect(32,road,64,6.6);}
    ctx.fillStyle='#a5b4b2';
    for(const road of ROAD_CENTERS){rect(road,32,4.1,64);rect(32,road,64,4.1);}
    ctx.fillStyle='#88a175';
    for(const tree of [...TOWN_TREES,...WILD_TREES,...COASTAL_TREES]){ctx.beginPath();ctx.arc(p.x(tree.x),p.z(tree.z),Math.max(1.8,tree.scale*.65*p.scale),0,Math.PI*2);ctx.fill();}
    for(const b of TOWN_BUILDINGS){
      ctx.fillStyle=b.id==='station'?'#427d7a':b.id==='clinic'?'#7197a0':'#c4bbaa';rect(b.x,b.z,b.width,b.depth);
      ctx.strokeStyle='#fdf9ef';ctx.lineWidth=1;ctx.strokeRect(p.x(b.x-b.width/2),p.z(b.z-b.depth/2),b.width*p.scale,b.depth*p.scale);
      // A short gap/entry tab shows which facade has the door.
      ctx.fillStyle='#fffaf0';rect(b.x,b.z+b.depth/2,1.6,.6);
    }
    if(mode!=='island')for(const space of TOWN_OPEN_SPACES)text(space.kind==='orchard'?'Сад':space.label,space.x,space.z-2.1,'#4b6a40');
    ctx.fillStyle='#69aeb8';for(const pond of ISLAND_PONDS){ctx.beginPath();ctx.ellipse(p.x(pond.x),p.z(pond.z),pond.width*p.scale/2,pond.depth*p.scale/2,0,0,Math.PI*2);ctx.fill();}
    for(const stop of TOWN_STOPS){ctx.fillStyle='#6c9a81';rect(stop.x,stop.z,1.8,1.8);}
    for(const resident of mission.life.residents){ctx.fillStyle='#8e6182';ctx.beginPath();ctx.arc(p.x(resident.position.x),p.z(resident.position.z),2.4,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#f2e6c9';for(const path of HARBOR_PATHS)rect(path.x,path.z,path.width,path.depth);
    ctx.strokeStyle='#92998c';ctx.lineWidth=2.3*p.scale;ctx.lineJoin='round';
    for(const arm of BREAKWATERS){ctx.beginPath();arm.forEach((point,i)=>i?ctx.lineTo(p.x(point.x),p.z(point.z)):ctx.moveTo(p.x(point.x),p.z(point.z)));ctx.stroke();}
    ctx.fillStyle='#a78962';for(const deck of PIER_DECKS)rect(deck.x,deck.z,deck.width,deck.depth);
    ctx.fillStyle='#ad6651';rect(LIGHTHOUSE.x,LIGHTHOUSE.z,4,4);
    if(mode==='island'){text('Морской маяк',LIGHTHOUSE.x+7,LIGHTHOUSE.z-2);text('Причал',58,85);text('Зареченск',32,-10);text('Мельница',MILL.x,MILL.z-3);text('Береговая тропа',25,73);}
    ctx.fillStyle='#b3a686';rect(MILL.x,MILL.z,3.8,3.8);
    if(mode!=='island'||size>360)for(const b of TOWN_BUILDINGS){
      if(b.id==='station'||b.id==='clinic')text(b.id==='station'?'Маяк':'Клиника',b.x,b.z);
      else if(size>360&&mode!=='island')text(b.kind==='home'?'Дом':b.id==='townhall'?'Администрация':b.id==='post'?'Почта':b.id==='grocery'?'Магазин':b.name.replace(/ «.*»/,''),b.x,b.z);
    }
  }
  if(route.length){
    ctx.beginPath();route.forEach((point,i)=>i?ctx.lineTo(p.x(point.x),p.z(point.z)):ctx.moveTo(p.x(point.x),p.z(point.z)));
    ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle='#fffaf0';ctx.lineWidth=6;ctx.stroke();
    ctx.strokeStyle='#b67c1e';ctx.lineWidth=3;ctx.stroke();
  }
  if(goal){
    const x=p.x(goal.position.x), y=p.z(goal.position.z), r=6;
    ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();
    ctx.fillStyle='#bc801d';ctx.fill();ctx.strokeStyle='#fffaf0';ctx.lineWidth=2;ctx.stroke();
  }
  if(world.interior){
    const actor=[MASTER,MEDIC].find(person=>person.buildingId===world.interior?.id);
    if(actor)text(actor===MASTER?'Мастер':'Медик',actor.x,actor.z-.65);
  }
  // A directional triangle distinguishes the player from destination diamonds.
  const px=p.x(world.position.x), pz=p.z(world.position.z), heading=world.heading;
  ctx.beginPath();
  for(const [index,angle] of [heading,heading+2.4,heading-2.4].entries()){
    const x=px+Math.sin(angle)*7,y=pz+Math.cos(angle)*7;
    if(index===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.closePath();ctx.fillStyle='#146fca';ctx.fill();ctx.strokeStyle='#fffaf0';ctx.lineWidth=2;ctx.stroke();
  ctx.font='bold 11px Arial';ctx.textAlign=px>size/2?'right':'left';ctx.textBaseline='bottom';
  const tx=px+(px>size/2?-10:10),ty=Math.max(19,pz-7);
  ctx.strokeStyle='#fffaf0';ctx.lineWidth=3;ctx.strokeText('Вы',tx,ty);ctx.fillStyle='#174e85';ctx.fillText('Вы',tx,ty);
  ctx.restore();
  // Metric scale is map-specific, separate from the game's camera controls.
  const metres=world.interior?2:mode==='island'?20:10,length=metres*p.scale;
  ctx.strokeStyle='#304b49';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(12,size-14);ctx.lineTo(12+length,size-14);ctx.stroke();
  ctx.font='10px Arial';ctx.textAlign='left';ctx.textBaseline='bottom';ctx.fillStyle='#304b49';ctx.fillText(`${metres} м`,12,size-18);
}

import { expect,it } from 'vitest';
import { STREET_BEDS,STREET_BUSHES } from '@content/street-details';
import { ROAD_CENTERS,TOWN_OPEN_SPACES } from '@content/town';
import { BREAKWATER_ROCKS,HARBOR_BOATS,HARBOR_PATHS,LIGHTHOUSE,PIER_DECKS } from '@content/harbor';
import { TOWN_STOPS } from '@content/town-life';
import { isTownWorldState,isWalkableTownPosition } from '@game/systems/town-world';
import { clearWalkingSegment,walkingRoute } from '@game/systems/town-navigation';
import { parseTownSave,TownSaveStore } from '@game/systems/town-save';

it.each([...STREET_BEDS,...STREET_BUSHES])('keeps planting footprints off town pavement at $x,$z',p=>{
  for(const road of ROAD_CENTERS){
    if(p.z>=0&&p.z<=64)expect(Math.abs(p.x-road)-p.width/2).toBeGreaterThan(3.3);
    if(p.x>=0&&p.x<=64)expect(Math.abs(p.z-road)-p.depth/2).toBeGreaterThan(3.3);
  }
});
it.each([...STREET_BEDS,...STREET_BUSHES])('keeps planting off garden cross paths at $x,$z',p=>{
  for(const park of TOWN_OPEN_SPACES.filter(p=>p.kind!=='square')){
    const vertical=Math.abs(p.x-park.x)<1.2+p.width/2&&Math.abs(p.z-park.z)<park.depth/2+p.depth/2;
    const horizontal=Math.abs(p.z-park.z)<1.2+p.depth/2&&Math.abs(p.x-park.x)<park.width/2+p.width/2;
    expect(vertical||horizontal).toBe(false);
  }
});
it('keeps harbor approaches walkable and the boat channel clear',()=>{
  expect(Math.hypot(LIGHTHOUSE.x-58,LIGHTHOUSE.z-68)).toBeLessThan(10);
  for(const p of HARBOR_PATHS)expect(isWalkableTownPosition(p)).toBe(true);
  for(const stop of TOWN_STOPS.filter(p=>['lighthouse','harbor','flowers'].includes(p.id))){
    const path=walkingRoute({x:32,z:35},stop,null);expect(path.length).toBeGreaterThan(1);
    for(let i=1;i<path.length;i++)expect(clearWalkingSegment(path[i-1]!,path[i]!,null)).toBe(true);
  }
  for(const rock of BREAKWATER_ROCKS){
    for(const deck of PIER_DECKS)expect(Math.abs(rock.x-deck.x)>deck.width/2+1.3||Math.abs(rock.z-deck.z)>deck.depth/2+1.3).toBe(true);
    for(const boat of HARBOR_BOATS)expect(Math.hypot(rock.x-boat.x,rock.z-boat.z)).toBeGreaterThan(4);
  }
});
const encode=(x:number,z:number,layout='coastal-island-v3')=>JSON.stringify({schemaVersion:1,layout,buildId:'cybershield-first-aid',savedAt:1,stage:'completed',world:{interiorId:null,position:{x,z},outdoorReturn:{x,z}}});
it('relocates valid v3 positions covered by the new lighthouse or beds and preserves completion',()=>{
  for(const p of [LIGHTHOUSE,{x:36.5,z:54.3},{x:4,z:38}]){
    const save=parseTownSave(encode(p.x,p.z));expect(save?.stage).toBe('completed');expect(save?.layout).toBe('coastal-island-v4');
    expect(isTownWorldState(save?.world)).toBe(true);expect(save?.world.position).not.toEqual({x:p.x,z:p.z});
    expect(parseTownSave(encode(p.x,p.z,'coastal-island-v4'))).toBeNull();
  }
});
it('rejects invalid old saves, keeps the pier save and writes v4',()=>{
  expect(parseTownSave(encode(0,63))).toBeNull();
  expect(parseTownSave(encode(60.2,82))).toBeNull();
  const save=parseTownSave(encode(58,89));expect(save?.world.position).toEqual({x:58,z:89});
  const data=new Map<string,string>();const store=new TownSaveStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);}});
  expect(store.save(save!)).toBe(true);expect(store.load().data).toEqual(save);
});

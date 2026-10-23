import { describe, expect, it } from 'vitest';
import { buildingEntrance, LEGACY_TOWN_BUILDINGS, RETIRED_HOME_IDS, TOWN_BUILDINGS, TOWN_OPEN_SPACES, TOWN_SPAWN } from '@content/town';
import { TOWN_TREES, TOWN_BENCHES, TOWN_PLANTERS } from '@content/town-props';
import { TownWorld, isWalkableTownPosition, isTownWorldState } from '@game/systems/town-world';
import { parseTownSave } from '@game/systems/town-save';
import { clearWalkingSegment, walkingRoute } from '@game/systems/town-navigation';
import { routeMapProjection } from '@ui/town-minimap';

const save = (world: unknown, stage='deliver-aid'): string => JSON.stringify({schemaVersion:1,buildId:'cybershield-first-aid',savedAt:1,world,stage});
describe('Open district and existing progress',()=>{
  it('replaces eight repeated lots with connected public spaces, retaining mission entrances',()=>{
    expect(TOWN_BUILDINGS).toHaveLength(11);
    const area=(items:typeof TOWN_BUILDINGS):number=>items.reduce((sum,b)=>sum+b.width*b.depth,0);
    expect(area(TOWN_BUILDINGS)).toBeLessThan(area(LEGACY_TOWN_BUILDINGS)*.72);
    for(const id of ['station','clinic'])expect(TOWN_BUILDINGS.find(b=>b.id===id)).toEqual(LEGACY_TOWN_BUILDINGS.find(b=>b.id===id));
    for(const space of TOWN_OPEN_SPACES){
      expect(TOWN_BUILDINGS.some(b=>Math.abs(b.x-space.x)<(b.width+space.width)/2 && Math.abs(b.z-space.z)<(b.depth+space.depth)/2)).toBe(false);
      const goal={x:space.x,z:space.z+(space.kind==='park'?3:0)};
      const route=walkingRoute(TOWN_SPAWN,goal,null);
      expect(route.at(-1)).toEqual(goal);
      for(let i=1;i<route.length;i++)expect(clearWalkingSegment(route[i-1]!,route[i]!,null)).toBe(true);
    }
  });
  it('uses the displayed tree, bench and planter locations as real obstacles',()=>{
    for(const prop of [...TOWN_TREES,...TOWN_BENCHES,...TOWN_PLANTERS])expect(isWalkableTownPosition(prop)).toBe(false);
  });
  it.each([...RETIRED_HOME_IDS])('restores a carried kit from removed home %s without resetting the mission',id=>{
    const old=LEGACY_TOWN_BUILDINGS.find(b=>b.id===id)!;
    const loaded=parseTownSave(save({interiorId:id,position:{x:0,z:2},outdoorReturn:buildingEntrance(old)}));
    expect(loaded?.stage).toBe('deliver-aid');expect(loaded?.world.interiorId).toBeNull();
    expect(isTownWorldState(loaded?.world)).toBe(true);
    const world=new TownWorld();expect(world.restore(loaded!.world)).toBe(true);
    expect(isWalkableTownPosition(world.position)).toBe(true);
  });
  it('moves an old outdoor position clear of a newly planted tree and retains completion',()=>{
    const pos={x:3,z:36};
    const loaded=parseTownSave(save({interiorId:null,position:pos,outdoorReturn:pos},'completed'));
    expect(loaded?.stage).toBe('completed');expect(loaded?.world.position).not.toEqual(pos);
    expect(isTownWorldState(loaded?.world)).toBe(true);
    expect(parseTownSave(save({interiorId:'home-6',position:{x:0,z:2},outdoorReturn:{x:63,z:63}}))).toBeNull();
  });
  it('keeps both ends and detours inside nearby framing at small and large canvas sizes',()=>{
    for(const size of [158,240,520])for(const points of [
      [{x:24,z:45},{x:40,z:45}], [{x:1,z:1},{x:63,z:63}], [{x:60,z:60},{x:56,z:45}],
    ]){
      const p=routeMapProjection(size,points,'nearby');
      for(const point of points){expect(p.x(point.x)).toBeGreaterThanOrEqual(12);expect(p.x(point.x)).toBeLessThanOrEqual(size-12);expect(p.z(point.z)).toBeGreaterThanOrEqual(12);expect(p.z(point.z)).toBeLessThanOrEqual(size-12);}
    }
    const full=routeMapProjection(240,[TOWN_SPAWN],'district');
    expect(full.x(0)).toBe(12);expect(full.z(64)).toBe(228);
  });
});

import { describe,expect,it } from 'vitest';
import { COAST_PATH,coastRatio } from '@content/island';
import { TOWN_SPAWN } from '@content/town';
import { walkTo } from '../fixtures/first-aid-route';
import { TownWorld,isWalkableTownPosition,isTownWorldState } from '@game/systems/town-world';
import { FirstAidMission } from '@game/systems/first-aid-mission';
import { walkingRoute,clearWalkingSegment } from '@game/systems/town-navigation';
import { TOWN_RESIDENTS } from '@content/town-life';
import { parseTownSave } from '@game/systems/town-save';

describe('Coastal island and life',()=>{
  it('walks a closed coastal loop without obstacles or crossing the sea',()=>{
    const world=new TownWorld(COAST_PATH[0]!);
    for(let i=1;i<=COAST_PATH.length;i++){
      const target=COAST_PATH[i%COAST_PATH.length]!;
      expect(clearWalkingSegment(world.position,target,null)).toBe(true);
      walkTo(world,target);expect(coastRatio(world.position)).toBeLessThan(.94);
    }
    expect(world.position.x).toBeCloseTo(COAST_PATH[0]!.x,3);
    expect(world.position.z).toBeCloseTo(COAST_PATH[0]!.z,3);
  });
  it('stops at the beach instead of wrapping to the other side',()=>{
    const world=new TownWorld({x:98,z:32});
    for(let i=0;i<1200;i++)world.move(1,0,.05);
    expect(world.position.x).toBeGreaterThan(98);expect(world.position.x).toBeLessThan(112);
    expect(coastRatio(world.position)).toBeLessThanOrEqual(.94);
    const stopped={...world.position};world.move(1,0,.05);expect(world.position).toEqual(stopped);
    world.move(-1,0,.05);expect(world.position.x).toBeLessThan(stopped.x);
  });
  it.each([-6,32,70])('keeps metre speed on the flat island at z=%s',z=>{
    const world=new TownWorld({x:32,z});world.move(1,0,.02);
    expect(world.position.x).toBeCloseTo(32.1,6);expect(world.position.z).toBe(z);
  });
  it('routes from the garden to the clinic around ponds and buildings',()=>{
    const route=walkingRoute({x:98,z:58},{x:40,z:45},null);
    expect(route.length).toBeGreaterThan(1);
    for(let i=1;i<route.length;i++)expect(clearWalkingSegment(route[i-1]!,route[i]!,null)).toBe(true);
  });
  it('keeps all resident patrol segments walkable and advances each resident',()=>{
    const mission=new FirstAidMission(new TownWorld());
    for(const resident of TOWN_RESIDENTS)for(let i=0;i<resident.route.length;i++)
      expect(clearWalkingSegment(resident.route[i]!,resident.route[(i+1)%resident.route.length]!,null),resident.id).toBe(true);
    for(let i=0;i<400;i++)mission.life.update(.05);
    mission.life.residents.forEach((resident,i)=>{expect(isWalkableTownPosition(resident.position)).toBe(true);expect(Math.hypot(resident.position.x-TOWN_RESIDENTS[i]!.route[0]!.x,resident.position.z-TOWN_RESIDENTS[i]!.route[0]!.z)).toBeGreaterThan(.5);});
    mission.destroy();
  });
  it('waters the flower bed and expires its feedback without changing quest inventory',()=>{
    const mission=new FirstAidMission(new TownWorld({x:22,z:30}));
    expect(mission.interaction?.kind).toBe('ambient');expect(mission.interact()).toBe(true);
    expect(mission.life.watered).toBe(true);expect(mission.life.message).toContain('полил');
    expect(mission.snapshot.stage).toBe('meet-master');expect(mission.snapshot.inventory).toEqual([]);
    for(let i=0;i<700;i++)mission.life.update(.05);
    expect(mission.life.message).toBe('');expect(mission.life.watered).toBe(false);mission.destroy();
  });
  it('relocates a validated old globe save to land and retains completion',()=>{
    const world=new TownWorld({x:220,z:32});const encoded=JSON.stringify({schemaVersion:1,buildId:'cybershield-first-aid',savedAt:123,world:world.snapshot,stage:'completed'});
    const save=parseTownSave(encoded);expect(save?.stage).toBe('completed');expect(save?.world.position).toEqual(TOWN_SPAWN);
    const restored=new TownWorld();expect(restored.restore(save!.world)).toBe(true);expect(isTownWorldState(restored.snapshot)).toBe(true);
  });
  it('does not treat a blocked new-hemisphere save as a valid legacy save',()=>{
    const point={x:208,z:18};expect(isWalkableTownPosition(point)).toBe(false);
    expect(parseTownSave(JSON.stringify({schemaVersion:1,buildId:'cybershield-first-aid',savedAt:123,world:{interiorId:null,position:point,outdoorReturn:point},stage:'completed'}))).toBeNull();
  });
  it('rejects blocked island saves instead of treating them as an older layout',()=>{
    const point={x:88,z:58};
    expect(parseTownSave(JSON.stringify({schemaVersion:1,layout:'coastal-island-v1',buildId:'cybershield-first-aid',savedAt:123,world:{interiorId:null,position:point,outdoorReturn:point},stage:'completed'}))).toBeNull();
  });
  it('prioritizes a door over a nearby ambient resident',()=>{
    const mission=new FirstAidMission(new TownWorld({x:24,z:45}));
    mission.life.residents[0]!.position={x:24,z:45};
    expect(mission.interaction?.kind).toBe('enter');mission.interact();expect(mission.world.interior?.id).toBe('station');mission.destroy();
  });
});

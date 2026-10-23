import { describe,expect,it } from 'vitest';
import { Vector3 } from 'three';
import { TownWorld,isWalkableTownPosition,isTownWorldState } from '@game/systems/town-world';
import { PLANET_RADIUS,planetDistance,planetFrame,longitudeDelta } from '@game/systems/planet';
import { FirstAidMission } from '@game/systems/first-aid-mission';
import { walkingRoute,clearWalkingSegment } from '@game/systems/town-navigation';
import { PLANET_RESIDENTS } from '@content/planet-life';
import { parseTownSave } from '@game/systems/town-save';

describe('Spherical world and life',()=>{
  it('walks the entire equator and returns to the same physical place without a boundary',()=>{
    const world=new TownWorld({x:32,z:32});const start={...world.position};
    for(let i=0;i<1024;i++)world.move(1,0,.05);
    expect(planetDistance(start,world.position)).toBeLessThan(.001);
    expect(world.position.x).toBeCloseTo(32,6);
    expect(isTownWorldState(world.snapshot)).toBe(true);
  });
  it('crosses both poles with continuous camera basis and keeps walking forward',()=>{
    const world=new TownWorld({x:100,z:-31.9});
    const before=planetFrame(world.position);world.move(0,-1,.05);
    expect(world.position.z).toBeCloseTo(-31.85);expect(world.position.x).toBeCloseTo(228);
    expect(Math.abs(world.viewTurn)).toBeCloseTo(Math.PI);
    expect(planetDistance({x:100,z:-31.9},world.position)).toBeCloseTo(.25,5);
    const after=planetFrame(world.position);
    expect(new Vector3(0,0,1).applyQuaternion(before.rotation).dot(new Vector3(0,0,-1).applyQuaternion(after.rotation))).toBeGreaterThan(.99);
    world.move(0,1,.05);expect(world.position.z).toBeCloseTo(-31.6);
    const south=new TownWorld({x:100,z:95.9});south.move(0,1,.05);
    expect(south.position.z).toBeCloseTo(95.85);expect(Math.abs(south.viewTurn)).toBeCloseTo(Math.PI);
  });
  it('can move east from the exact pole without getting stuck',()=>{
    const world=new TownWorld({x:100,z:-32}),before={...world.position};world.move(1,0,.05);
    expect(planetDistance(before,world.position)).toBeCloseTo(.25,5);expect(world.position.z).toBeGreaterThan(-32);
  });
  it.each([0,32,64,80])('maintains metre speed and radial scale at latitude chart z=%s',z=>{
    const world=new TownWorld({x:130,z}),before={...world.position};world.move(1,0,.02);
    expect(planetDistance(before,world.position)).toBeCloseTo(.1,4);
    const frame=planetFrame(world.position);expect(frame.position.length()).toBeCloseTo(PLANET_RADIUS);
    expect(new Vector3(0,1,0).applyQuaternion(frame.rotation).distanceTo(frame.up)).toBeLessThan(1e-7);
  });
  it('routes from the reverse hemisphere through the seam to the clinic without crossing solids',()=>{
    const route=walkingRoute({x:220,z:32},{x:40,z:45},null);
    expect(route.length).toBeGreaterThan(1);
    for(let i=1;i<route.length;i++)expect(clearWalkingSegment(route[i-1]!,route[i]!,null)).toBe(true);
    expect(route.some((point,i)=>i>0&&Math.abs(point.x-route[i-1]!.x)>128)).toBe(true);
    expect(Math.abs(longitudeDelta(255,1))).toBe(2);
  });
  it('keeps all resident patrol segments walkable and advances each resident',()=>{
    const mission=new FirstAidMission(new TownWorld());
    for(const resident of PLANET_RESIDENTS)for(let i=0;i<resident.route.length;i++)
      expect(clearWalkingSegment(resident.route[i]!,resident.route[(i+1)%resident.route.length]!,null),resident.id).toBe(true);
    for(let i=0;i<400;i++)mission.life.update(.05);
    mission.life.residents.forEach((resident,i)=>{expect(isWalkableTownPosition(resident.position)).toBe(true);expect(planetDistance(resident.position,PLANET_RESIDENTS[i]!.route[0]!)).toBeGreaterThan(.5);});
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
  it('restores a saved completed mission on the reverse hemisphere',()=>{
    const world=new TownWorld({x:220,z:32});const encoded=JSON.stringify({schemaVersion:1,buildId:'cybershield-first-aid',savedAt:123,world:world.snapshot,stage:'completed'});
    const save=parseTownSave(encoded);expect(save?.stage).toBe('completed');expect(save?.world.position).toEqual(world.position);
    const restored=new TownWorld();expect(restored.restore(save!.world)).toBe(true);expect(restored.position.x).toBe(220);
  });
  it('does not treat a blocked new-hemisphere save as a valid legacy save',()=>{
    const point={x:208,z:18};expect(isWalkableTownPosition(point)).toBe(false);
    expect(parseTownSave(JSON.stringify({schemaVersion:1,buildId:'cybershield-first-aid',savedAt:123,world:{interiorId:null,position:point,outdoorReturn:point},stage:'completed'}))).toBeNull();
  });
  it('prioritizes a door over a nearby ambient resident',()=>{
    const mission=new FirstAidMission(new TownWorld({x:24,z:45}));
    mission.life.residents[0]!.position={x:24,z:45};
    expect(mission.interaction?.kind).toBe('enter');mission.interact();expect(mission.world.interior?.id).toBe('station');mission.destroy();
  });
});

import { describe, expect, it } from 'vitest';
import { TOWN_BUILDINGS, buildingEntrance } from '@content/town';
import { getInteriorLayout } from '@content/interiors';
import { TownWorld, isWalkableTownPosition, type TownPosition } from '@game/systems/town-world';
import { clearWalkingSegment, navigationGoal, walkingRoute } from '@game/systems/town-navigation';
import { minimapProjection } from '@ui/town-minimap';

function verifyRoute(start: TownPosition, end: TownPosition, interior: typeof TOWN_BUILDINGS[number] | null): void {
  const route = walkingRoute(start,end,interior);
  expect(route[0]).toEqual(start); expect(route.at(-1)).toEqual(end);
  for (let i=1;i<route.length;i++) expect(clearWalkingSegment(route[i-1]!,route[i]!,interior)).toBe(true);
  // Walk the route through the real movement system as a second collision check.
  const world=new TownWorld(start);
  if (interior) expect(world.restore({interiorId:interior.id,position:start,outdoorReturn:buildingEntrance(interior)})).toBe(true);
  for (const target of route.slice(1)) {
    for (let frame=0;frame<2000 && Math.hypot(world.position.x-target.x,world.position.z-target.z)>.01;frame++) {
      const dx=target.x-world.position.x,dz=target.z-world.position.z;
      world.move(dx,dz,Math.min(.02,Math.hypot(dx,dz)/5));
    }
    expect(Math.hypot(world.position.x-target.x,world.position.z-target.z)).toBeLessThan(.02);
  }
}

describe('Mission map navigation',()=>{
  it('guides spawn to Mayak and Mayak to the clinic around building footprints',()=>{
    verifyRoute({x:32,z:35},{x:24,z:45},null);
    verifyRoute({x:24,z:45},{x:40,z:45},null);
    verifyRoute({x:24,z:34},{x:24,z:45},null);
  });
  it('routes from room entries to actors and back to exits around furniture',()=>{
    for (const id of ['station','clinic']) {
      const room=TOWN_BUILDINGS.find(b=>b.id===id)!;
      const world=new TownWorld(buildingEntrance(room)); world.interact();
      const approach=navigationGoal(world,id)!.position;
      expect(Math.hypot(approach.x-1.8,approach.z-.25)).toBeLessThan(1.4);
      verifyRoute({x:0,z:2},approach,room);
      verifyRoute(approach,{x:0,z:3},room);
    }
  });
  it('does not offer a route into walls or furniture',()=>{
    expect(walkingRoute({x:32,z:35},{x:24,z:40},null)).toEqual([]);
    const room=TOWN_BUILDINGS.find(b=>b.id==='station')!;
    const obstacle=getInteriorLayout(room).obstacles[0]!;
    expect(isWalkableTownPosition(obstacle,room)).toBe(false);
    expect(walkingRoute({x:0,z:2},obstacle,room)).toEqual([]);
  });
  it('changes the map destination to the exit when the next goal is in another building',()=>{
    const world=new TownWorld({x:24,z:45}); world.interact();
    expect(navigationGoal(world,'station')?.label).toBe('Мастер');
    expect(navigationGoal(world,'clinic')?.label).toBe('Выход на улицу');
    world.interact();
    expect(navigationGoal(world,'clinic')?.position).toEqual({x:40,z:45});
    expect(navigationGoal(world,null)).toBeNull();
  });
  it('keeps player, room boundaries and street doors in the same map coordinate system',()=>{
    for (const size of [148,240]) {
      const room=minimapProjection(size,true), street=minimapProjection(size,false);
      expect(room.x(0)).toBe(size/2); expect(room.z(0)).toBe(size/2);
      expect(room.x(-5)).toBeCloseTo(12); expect(room.x(5)).toBeCloseTo(size-12);
      expect(room.z(-4)).toBeGreaterThan(0); expect(room.z(4)).toBeLessThan(size);
      expect(street.x(0)).toBe(12); expect(street.z(64)).toBeCloseTo(size-12);
    }
  });
});

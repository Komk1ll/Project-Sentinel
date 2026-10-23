import { walkTo } from '../fixtures/first-aid-route';
import { describe, expect, it } from 'vitest';
import { buildingEntrance, TOWN_BUILDINGS, TOWN_SIZE, TOWN_SPAWN } from '@content/town';
import { OUTDOOR_OBSTACLES } from '@content/town-props';
import { getInteriorLayout } from '@content/interiors';
import { TownWorld, isWalkableTownPosition } from '@game/systems/town-world';

describe('Town world', () => {
  it('starts outdoors at the town spawn', () => {
    const world = new TownWorld();
    expect(world.position).toEqual(TOWN_SPAWN);
    expect(world.interior).toBeNull();
    expect(world.canExit).toBe(false);
    expect(world.interact()).toBe(false);
  });

  it.each(TOWN_BUILDINGS)('enters and exits $id through its walkable entrance', (building) => {
    const entrance = buildingEntrance(building);
    const world = new TownWorld(entrance);
    expect(world.nearbyBuilding).toEqual(building);
    world.move(1, 0, 0.02);
    expect(world.position.x).toBeCloseTo(entrance.x + 0.1);
    const returnPosition = world.position;
    expect(world.interact()).toBe(true);
    expect(world.interior).toEqual(building);
    expect(world.position).toEqual({ x: 0, z: 2 });
    expect(world.nearbyBuilding).toBeNull();
    expect(world.canExit).toBe(true);
    expect(world.interact()).toBe(true);
    expect(world.interior).toBeNull();
    expect(world.position).toEqual(returnPosition);
  });

  it.each(TOWN_BUILDINGS)('blocks movement through the front wall of $id', (building) => {
    const world = new TownWorld(buildingEntrance(building));
    for (let step = 0; step < 100; step += 1) world.move(0, -1, 0.05);
    expect(world.position.z).toBeGreaterThanOrEqual(building.z + building.depth / 2 + 0.3);
  });

  it('can walk from the actual spawn to every entrance and enter its building', () => {
    // Build one half-unit navigation grid from the editable town footprints.
    const stride = TOWN_SIZE * 2 + 1;
    const start = TOWN_SPAWN.x * 2 + TOWN_SPAWN.z * 2 * stride;
    const parents = new Map<number, number | null>([[start, null]]);
    const queue = [start];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor]!;
      const x = current % stride;
      const z = Math.floor(current / stride);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nextX = x + dx;
        const nextZ = z + dz;
        if (nextX < 1 || nextX >= TOWN_SIZE * 2 || nextZ < 1 || nextZ >= TOWN_SIZE * 2) continue;
        const next = nextX + nextZ * stride;
        if (parents.has(next)) continue;
        if(!isWalkableTownPosition({x:nextX/2,z:nextZ/2}))continue;
        parents.set(next, current);
        queue.push(next);
      }
    }

    for (const building of TOWN_BUILDINGS) {
      const entrance = buildingEntrance(building);
      const destination = entrance.x * 2 + entrance.z * 2 * stride;
      expect(parents.has(destination), `${building.id} entrance must connect to spawn`).toBe(true);
      const path: number[] = [];
      let node: number | null = destination;
      while (node !== null && node !== start) {
        path.push(node);
        node = parents.get(node) ?? null;
      }

      const world = new TownWorld();
      for (const waypoint of path.reverse()) {
        const x = (waypoint % stride) / 2;
        const z = Math.floor(waypoint / stride) / 2;
        walkTo(world,{x,z});
        expect(world.position.x, `walkable path to ${building.id}`).toBeCloseTo(x,3);
        expect(world.position.z).toBeCloseTo(z,3);
      }
      expect(Math.hypot(world.position.x - entrance.x, world.position.z - entrance.z)).toBeLessThan(0.4);
      expect(world.interact(), `enter ${building.id} after walking from spawn`).toBe(true);
      expect(world.interior?.id).toBe(building.id);
    }
  });

  it.each(OUTDOOR_OBSTACLES)('blocks the outdoor obstacle at $x, $z', (obstacle) => {
    const front = obstacle.z + obstacle.depth / 2 + 0.31;
    const world = new TownWorld({ x: obstacle.x, z: front });
    for (let step = 0; step < 40; step += 1) world.move(0, -1, 0.05);
    expect(world.position.z).toBeGreaterThanOrEqual(obstacle.z + obstacle.depth / 2 + 0.3);
    expect(world.position.x).toBe(obstacle.x);
  });

  it('keeps the main streets traversable past parked cars', () => {
    const world = new TownWorld({ x: 32, z: 0.5 });
    for (let step = 0; step < 252; step += 1) world.move(0, 1, 0.05);
    expect(world.position).toEqual({ x: 32, z: 63.5 });
    const crossStreet = new TownWorld({ x: 0.5, z: 32 });
    for (let step = 0; step < 252; step += 1) crossStreet.move(1, 0, 0.05);
    expect(crossStreet.position).toEqual({ x: 63.5, z: 32 });
  });

  it('slides along a wall when diagonal movement is blocked', () => {
    const world = new TownWorld({ x: 23, z: 44.31 });
    world.move(1, -1, 0.05);
    expect(world.position.x).toBeGreaterThan(23);
    expect(world.position.z).toBe(44.31);
  });

  it('normalizes movement and caps frame duration', () => {
    const world = new TownWorld();
    world.move(8, 8, 10);
    expect(Math.hypot(world.position.x - TOWN_SPAWN.x, world.position.z - TOWN_SPAWN.z)).toBeCloseTo(0.25);
    world.move(0, 0, 0.05);
    expect(Math.hypot(world.position.x - TOWN_SPAWN.x, world.position.z - TOWN_SPAWN.z)).toBeCloseTo(0.25);
  });

  it.each([
    [1, 0, -0.05],
    [1, 0, 0],
    [Number.NaN, 0, 0.05],
    [0, Number.NaN, 0.05],
    [1, 0, Number.NaN],
    [Number.POSITIVE_INFINITY, 0, 0.05],
    [0, Number.NEGATIVE_INFINITY, 0.05],
    [1, 0, Number.POSITIVE_INFINITY],
  ])('ignores invalid or non-positive movement input (%s, %s, %s)', (dx, dz, delta) => {
    const world = new TownWorld();
    let updates = 0;
    world.subscribe(() => { updates += 1; });
    world.move(dx, dz, delta);
    expect(world.position).toEqual(TOWN_SPAWN);
    expect(updates).toBe(1);
  });

  it.each([
    [{ x: 0.51, z: 32 }, -1, 0, { x: 0.26, z: 32 }],
    [{ x: 63.49, z: 32 }, 1, 0, { x: 63.74, z: 32 }],
    [{ x: 32, z: 0.51 }, 0, -1, { x: 32, z: 0.26 }],
    [{ x: 32, z: 63.49 }, 0, 1, { x: 32, z: 63.74 }],
  ] as const)('allows walking beyond the original town border', (position, dx, dz, expected) => {
    const world = new TownWorld(position);
    world.move(dx, dz, 0.05);
    expect(world.position.x).toBeCloseTo(expected.x);
    expect(world.position.z).toBeCloseTo(expected.z);
  });

  it('requires proximity to the interior exit and confines interior movement', () => {
    const building = TOWN_BUILDINGS[0]!;
    const world = new TownWorld(buildingEntrance(building));
    world.interact();
    for (let step = 0; step < 100; step += 1) world.move(1, 0, 0.05);
    for (let step = 0; step < 100; step += 1) world.move(0, -1, 0.05);
    expect(world.position.x).toBeLessThanOrEqual(4.5);
    expect(world.position.z).toBeGreaterThanOrEqual(-3.5);
    expect(world.canExit).toBe(false);
    expect(world.interact()).toBe(false);
    expect(world.interior).toEqual(building);
    for (let step = 0; step < 100; step += 1) world.move(1, 1, 0.05);
    expect(world.position.x).toBeLessThanOrEqual(4.5);
    expect(world.position.z).toBeLessThanOrEqual(3.5);
    for (let step = 0; step < 100; step += 1) world.move(-1, 0, 0.05);
    expect(world.position.x).toBeGreaterThanOrEqual(-4.5);
  });

  it.each(TOWN_BUILDINGS)('has connected furnished rooms and a working return route in $id', (building) => {
    const layout = getInteriorLayout(building);
    expect(layout.rooms.length).toBeGreaterThanOrEqual(2);
    expect(layout.furniture.length).toBeGreaterThanOrEqual(5);
    expect(layout.partitions.length).toBeGreaterThanOrEqual(2);
    expect(layout.obstacles).toHaveLength(layout.furniture.length + layout.partitions.length + layout.actors.length);
    const stride = 37;
    const encode = (x: number, z: number): number => Math.round((x + 4.5) * 4) + Math.round((z + 3.5) * 4) * stride;
    const decode = (key: number): { x: number; z: number } => ({ x: (key % stride) / 4 - 4.5, z: Math.floor(key / stride) / 4 - 3.5 });
    const start = encode(0, 2);
    const parents = new Map<number, number | null>([[start, null]]);
    const queue = [start];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor]!;
      const position = decode(current);
      for (const [dx, dz] of [[.25, 0], [-.25, 0], [0, .25], [0, -.25]] as const) {
        const x = position.x + dx;
        const z = position.z + dz;
        if (x < -4.5 || x > 4.5 || z < -3.5 || z > 3.5) continue;
        const next = encode(x, z);
        if (parents.has(next)) continue;
        if (layout.obstacles.some(obstacle => Math.abs(x - obstacle.x) < obstacle.width / 2 + .3
          && Math.abs(z - obstacle.z) < obstacle.depth / 2 + .3)) continue;
        parents.set(next, current);
        queue.push(next);
      }
    }
    const world = new TownWorld(buildingEntrance(building));
    world.interact();
    for (const target of [...layout.rooms.map(room => room.center), { x: 0, z: 3 }]) {
      const destination = encode(target.x, target.z);
      expect(parents.has(destination), `${building.id}: reachable room at ${target.x}, ${target.z}`).toBe(true);
      const path: number[] = [];
      let cursor: number | null = destination;
      while (cursor !== null && cursor !== start) {
        path.push(cursor);
        cursor = parents.get(cursor) ?? null;
      }
      const route = path.reverse();
      for (const waypoint of route) {
        const position = decode(waypoint);
        world.move(position.x - world.position.x, position.z - world.position.z, .05);
        expect(world.position).toEqual(position);
      }
      expect(world.position).toEqual(target);
      for (const waypoint of [...route.slice(0, -1).reverse(), start]) {
        const position = decode(waypoint);
        world.move(position.x - world.position.x, position.z - world.position.z, .05);
        expect(world.position).toEqual(position);
      }
    }
    // Approach each furniture footprint from a reachable cell, then attempt entry.
    for (const furniture of layout.furniture) {
      let approach: { key: number; dx: number; dz: number } | undefined;
      for (const key of queue) {
        const position = decode(key);
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          if (Math.abs(position.x + dx * .25 - furniture.x) < furniture.width / 2 + .3
            && Math.abs(position.z + dz * .25 - furniture.z) < furniture.depth / 2 + .3) {
            approach = { key, dx, dz };
            break;
          }
        }
        if (approach) break;
      }
      expect(approach, `${building.id}: accessible side of ${furniture.id}`).toBeDefined();
      if (!approach) continue;
      const path: number[] = [];
      let cursor: number | null = approach.key;
      while (cursor !== null && cursor !== start) {
        path.push(cursor);
        cursor = parents.get(cursor) ?? null;
      }
      const route = path.reverse();
      for (const key of route) {
        const position = decode(key);
        world.move(position.x - world.position.x, position.z - world.position.z, .05);
      }
      const previous = world.position;
      world.move(approach.dx, approach.dz, .05);
      expect(world.position, `${building.id}: blocks ${furniture.id}`).toEqual(previous);
      for (const key of [...route.slice(0, -1).reverse(), start]) {
        const position = decode(key);
        world.move(position.x - world.position.x, position.z - world.position.z, .05);
      }
      expect(world.position).toEqual({ x: 0, z: 2 });
    }
    expect(world.canExit).toBe(true);
    expect(world.interact()).toBe(true);
    expect(world.interior).toBeNull();
  });

  it('provides different homes and distinct layouts for public buildings', () => {
    const homes = TOWN_BUILDINGS.filter(building => building.kind === 'home');
    expect(new Set(homes.map(building => JSON.stringify(getInteriorLayout(building)))).size).toBeGreaterThanOrEqual(2);
    const kinds = new Set(TOWN_BUILDINGS.map(building => building.kind));
    const layouts = [...kinds].map(kind => getInteriorLayout(TOWN_BUILDINGS.find(building => building.kind === kind)!));
    expect(new Set(layouts.map(layout => layout.furniture.map(furniture => furniture.kind).join(','))).size).toBe(kinds.size);
  });

  it.each(TOWN_BUILDINGS)('blocks partitions while allowing the open doorway in $id', (building) => {
    const world = new TownWorld(buildingEntrance(building));
    world.interact();
    for (let step = 0; step < 8; step += 1) world.move(-1, 0, .05);
    expect(world.position.x).toBeGreaterThan(-1);
    for (let step = 0; step < 7; step += 1) world.move(0, -1, .05);
    for (let step = 0; step < 8; step += 1) world.move(-1, 0, .05);
    expect(world.position.x).toBeLessThan(-1.5);
  });

  it('notifies immediately and on movement or transitions, and unsubscribes', () => {
    const world = new TownWorld(buildingEntrance(TOWN_BUILDINGS[0]!));
    let updates = 0;
    const unsubscribe = world.subscribe((updatedWorld) => {
      expect(updatedWorld).toBe(world);
      updates += 1;
    });
    expect(updates).toBe(1);
    world.move(1, 0, 0.01);
    expect(updates).toBe(2);
    world.interact();
    expect(updates).toBe(3);
    world.interact();
    expect(updates).toBe(4);
    unsubscribe();
    world.move(1, 0, 0.01);
    expect(updates).toBe(4);
  });
});

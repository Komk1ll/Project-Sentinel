import { expect, it } from 'vitest';
import { STAIR_LANDING, getInteriorLayout, interiorFloorName } from '@content/interiors';
import { TOWN_BUILDINGS, buildingEntrance } from '@content/town';
import { FirstAidMission } from '@game/systems/first-aid-mission';
import { parseTownSave } from '@game/systems/town-save';
import { TownWorld, isTownWorldState } from '@game/systems/town-world';

it.each(TOWN_BUILDINGS.filter(building => building.floors > 1))('walks to the stairs, visits every furnished floor and returns outside at $id', building => {
  const entrance = buildingEntrance(building);
  const world = new TownWorld(entrance);
  const mission = new FirstAidMission(world);
  expect(mission.interact()).toBe(true);
  for (let step = 0; step < 7; step++) world.move(0, -1, .05);
  expect(world.stairAction).toBe('up');
  const floorNames = new Set([interiorFloorName(building, 0)]);
  const layouts = new Set([JSON.stringify(getInteriorLayout(building).furniture)]);
  for (let floor = 1; floor < building.floors; floor++) {
    expect(mission.interaction?.kind).toBe('stairs');
    expect(mission.interact()).toBe(true);
    expect(world.interiorFloor).toBe(floor);
    expect(world.position).toEqual(STAIR_LANDING);
    expect(isTownWorldState(world.snapshot)).toBe(true);
    expect(world.canExit).toBe(false);
    floorNames.add(interiorFloorName(building, floor));
    const layout = getInteriorLayout(building, floor);
    expect(layout.furniture.length).toBeGreaterThanOrEqual(4);
    expect(layout.actors).toHaveLength(0);
    layouts.add(JSON.stringify(layout.furniture));
    world.move(1, 0, .05);
    expect(world.position.x).toBeGreaterThan(STAIR_LANDING.x);
  }
  expect(floorNames.size).toBe(building.floors);
  expect(layouts.size).toBe(building.floors);
  while (world.interiorFloor > 0) expect(world.changeFloor(-1)).toBe(true);
  for (let step = 0; step < 10; step++) world.move(0, 1, .05);
  expect(mission.interact()).toBe(true);
  expect(world.position).toEqual(entrance);
  mission.destroy();
});

it('loads old saves on the ground floor and round-trips an upstairs save', () => {
  const clinic = TOWN_BUILDINGS.find(building => building.id === 'clinic')!;
  const entrance = buildingEntrance(clinic);
  const world = new TownWorld(entrance);
  const ground = { interiorId: clinic.id, position: STAIR_LANDING, outdoorReturn: entrance };
  expect(world.restore(ground)).toBe(true);
  expect(world.interiorFloor).toBe(0);
  expect(world.changeFloor(1)).toBe(true);
  expect(world.changeFloor(1)).toBe(true);
  const save = parseTownSave(JSON.stringify({ schemaVersion: 1, layout: 'coastal-island-v5',
    buildId: 'cybershield-first-aid', savedAt: 1, stage: 'deliver-aid', world: world.snapshot }));
  expect(save?.world.interiorFloor).toBe(2);
  expect(world.restore(save!.world)).toBe(true);
  expect(world.interiorFloor).toBe(2);
  expect(isTownWorldState({ ...save!.world, interiorFloor: 3 })).toBe(false);
});

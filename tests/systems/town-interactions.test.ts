import { expect, it } from 'vitest';
import { HARBOR_BOATS, LIGHTHOUSE } from '@content/harbor';
import { buildingEntrance, TOWN_BUILDINGS } from '@content/town';
import { TOWN_CARS } from '@content/town-props';
import { FirstAidMission } from '@game/systems/first-aid-mission';
import { TownWorld, isTownWorldState, townNavigationObstacles } from '@game/systems/town-world';
import { clearWalkingSegment, navigationGoal, walkingRoute } from '@game/systems/town-navigation';
import { TownSession } from '@game/systems/town-session';
import { TownSaveStore } from '@game/systems/town-save';
import { walkTo } from '../fixtures/first-aid-route';

it('enters the relocated lighthouse, saves inside and exits onto the forecourt', () => {
  const door = buildingEntrance(LIGHTHOUSE);
  const world = new TownWorld(door);
  const mission = new FirstAidMission(world);
  expect(mission.interaction?.label).toBe('Войти · Морской маяк');
  expect(mission.interact()).toBe(true);
  expect(isTownWorldState(world.snapshot)).toBe(true);
  expect(world.interior?.id).toBe(LIGHTHOUSE.id);
  expect(mission.interact()).toBe(true);
  expect(world.position).toEqual(door);
  mission.destroy();
});

it('boards the red car, drives, parks and reboards at the new location', () => {
  const car = TOWN_CARS[2];
  const world = new TownWorld({ x: car.x, z: car.z - 1.5 });
  const mission = new FirstAidMission(world);
  expect(mission.interaction?.label).toBe('Сесть за руль');
  expect(mission.interact()).toBe(true);
  for (let i = 0; i < 8; i++) world.driveCar(1, 0, .05);
  expect(world.position.x).toBeGreaterThan(car.x + 3);
  expect(world.carPoses[2]!.x).toBe(world.position.x);
  const heading = world.heading;
  const ahead = world.position.x;
  world.driveCar(-1, 0, .05);
  expect(world.position.x).toBeLessThan(ahead);
  expect(world.heading).toBe(heading);
  world.driveCar(1, 1, .05);
  expect(world.heading).toBeLessThan(heading);
  expect(isTownWorldState(world.snapshot)).toBe(true);
  expect(mission.interact()).toBe(true);
  expect(world.activeCar).toBeNull();
  expect(mission.interact()).toBe(true);
  expect(world.activeCar).toBe(2);
  mission.destroy();
});

it('routes to the clinic from the vacated parking spot and resets cars in a new game', () => {
  const car = TOWN_CARS[2];
  const approach = { x: car.x, z: car.z - 1.5 };
  const world = new TownWorld(approach);
  const mission = new FirstAidMission(world);
  const session = new TownSession(world, mission, new TownSaveStore(null));
  mission.restore('deliver-aid');
  const clinic = navigationGoal(world, mission.snapshot.targetBuildingId)!.position;
  expect(walkingRoute(approach, clinic, null, world.carPoses).length).toBeGreaterThan(1);
  expect(walkingRoute(car, clinic, null, world.carPoses)).toEqual([]);

  expect(world.interact()).toBe(true);
  for (let i = 0; i < 8; i++) world.driveCar(1, 0, .05);
  const movedCar = world.carPoses[2]!;
  expect(movedCar.x).toBeGreaterThan(car.x + 3);
  expect(world.interact()).toBe(true);
  walkTo(world, approach);
  walkTo(world, car);
  const route = walkingRoute(world.position, clinic, null, world.carPoses);
  expect(route.at(-1)).toEqual(clinic);
  const obstacles = townNavigationObstacles(world.carPoses);
  expect(route.slice(1).every((point, i) => clearWalkingSegment(route[i]!, point, null, obstacles))).toBe(true);
  expect(walkingRoute(movedCar, clinic, null, world.carPoses)).toEqual([]);

  session.newGame();
  expect(world.carPoses).toEqual(TOWN_CARS);
  expect(walkingRoute(car, clinic, null, world.carPoses)).toEqual([]);
  walkTo(world, { x: 32, z: approach.z });
  walkTo(world, approach);
  world.move(0, 1, .05);
  const parkingEdge = world.position;
  world.move(0, 1, .05);
  expect(world.position).toEqual(parkingEdge);
  session.destroy();
  mission.destroy();
});

it('sails past the old offshore limit and returns to berth', () => {
  const berth = HARBOR_BOATS[0]!;
  const world = new TownWorld(berth.boarding);
  expect(world.interact()).toBe(true);
  for (let i = 0; i < 140; i++) world.move(0, 1, .05);
  expect(world.position.z).toBeGreaterThan(140);
  for (let i = 0; i < 140; i++) world.move(0, -1, .05);
  expect(world.interact()).toBe(true);
  expect(world.position).toEqual(berth.boarding);
});

it('toggles a lamp from the living room and preserves the exit', () => {
  const home = TOWN_BUILDINGS.find(building => building.kind === 'home')!;
  const door = buildingEntrance(home);
  const world = new TownWorld(door);
  expect(world.restore({ interiorId: home.id, position: { x: 1.13, z: 1.7 }, outdoorReturn: door })).toBe(true);
  const mission = new FirstAidMission(world);
  expect(mission.interaction?.label).toBe('Включить настольную лампу');
  expect(mission.interact()).toBe(true);
  expect(world.homeLampOn).toBe(true);
  expect(mission.interact()).toBe(true);
  expect(world.homeLampOn).toBe(false);
  mission.destroy();
});

it('turns from the eastbound street onto the cross street without an instant rotation', () => {
  const car = TOWN_CARS[2];
  const world = new TownWorld({ x: car.x, z: car.z - 1.5 });
  expect(world.interact()).toBe(true);
  for (let i = 0; i < 14; i++) world.driveCar(1, 0, .05);
  for (let i = 0; i < 13; i++) world.driveCar(1, 1, .05);
  expect(world.heading).toBeCloseTo(0, 1);
  expect(world.position.x).toBeCloseTo(48, 0);
  const afterTurn = world.position.z;
  for (let i = 0; i < 4; i++) world.driveCar(1, 0, .05);
  expect(world.position.z).toBeGreaterThan(afterTurn + 1.4);
});

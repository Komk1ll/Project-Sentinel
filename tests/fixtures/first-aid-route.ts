import { latitudeScale, longitudeDelta } from '@game/systems/planet';
import type { TownPosition, TownWorld } from '@game/systems/town-world';
import type { FirstAidMission } from '@game/systems/first-aid-mission';

/** Move through the real collision model without teleporting or editing mission state. */
export function walkTo(world: TownWorld, target: TownPosition): void {
  for (let step = 0; step < 600; step += 1) {
    const dx = world.interior?target.x-world.position.x:longitudeDelta(world.position.x,target.x)*latitudeScale(world.position.z);
    const dz = target.z - world.position.z;
    const remaining = Math.hypot(dx, dz);
    if (remaining < .001) return;
    world.move(dx, dz, Math.min(.05, remaining / 5));
  }
  throw new Error(`Route blocked at ${JSON.stringify(world.position)} on the way to ${JSON.stringify(target)}`);
}

export function approachMaster(mission: FirstAidMission): void {
  walkTo(mission.world, { x: 32, z: 46 });
  walkTo(mission.world, { x: 24, z: 46 });
  if (!mission.interact()) throw new Error('Cannot enter the workshop');
  walkTo(mission.world, { x: 0, z: .25 });
  walkTo(mission.world, { x: .75, z: .25 });
}

export function leaveWorkshop(mission: FirstAidMission): void {
  walkTo(mission.world, { x: 0, z: .25 });
  walkTo(mission.world, { x: 0, z: 2 });
  if (!mission.interact()) throw new Error('Cannot leave the workshop');
}

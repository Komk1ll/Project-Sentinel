import { describe, expect, it, vi } from 'vitest';
import { AID_KIT, CLINIC_ID, FIRST_AID_TEXT, MASTER } from '@content/first-aid';
import { buildingEntrance, TOWN_BUILDINGS } from '@content/town';
import { TownWorld } from '@game/systems/town-world';
import { FirstAidMission } from '@game/systems/first-aid-mission';
import { approachMaster, leaveWorkshop, walkTo } from '../fixtures/first-aid-route';

describe('First aid mission through real town actions', () => {
  it('starts with an empty inventory and a workshop objective; no remote pickup', () => {
    const mission = new FirstAidMission(new TownWorld());
    expect(mission.snapshot.stage).toBe('meet-master');
    expect(mission.snapshot.inventory).toEqual([]);
    expect(mission.snapshot.targetBuildingId).toBe('station');
    expect(mission.interaction).toBeNull();
    expect(mission.interact()).toBe(false);
    expect(mission.snapshot.dialogue).toBeNull();
    mission.destroy();
  });

  it('requires approaching the master after entering the correct building', () => {
    const station = TOWN_BUILDINGS.find(building => building.id === 'station')!;
    const mission = new FirstAidMission(new TownWorld(buildingEntrance(station)));
    expect(mission.interaction?.kind).toBe('enter');
    mission.interact();
    expect(mission.interaction?.kind).toBe('exit');
    expect(mission.snapshot.inventory).toEqual([]);
    walkTo(mission.world, { x: 0, z: .25 });
    expect(mission.interaction).toBeNull();
    expect(mission.interact()).toBe(false);
    expect(mission.snapshot.inventory).toEqual([]);
    mission.destroy();
  });

  it('walks from the actual spawn to the master, issues one kit and changes the objective atomically', () => {
    const mission = new FirstAidMission(new TownWorld());
    approachMaster(mission);
    expect(mission.interaction?.kind).toBe('master');
    const notifications = vi.fn();
    mission.subscribe(notifications);
    notifications.mockClear();
    expect(mission.interact()).toBe(true);
    expect(notifications).toHaveBeenCalledTimes(1);
    expect(notifications).toHaveBeenLastCalledWith(expect.objectContaining({
      stage: 'deliver-aid', inventory: [AID_KIT], targetBuildingId: CLINIC_ID,
    }));
    expect(mission.snapshot.objective).toBe(FIRST_AID_TEXT.deliverObjective);
    expect(mission.snapshot.dialogue).toBe(FIRST_AID_TEXT.received);
    mission.destroy();
  });

  it('repeats only the reminder and does not duplicate the kit after repeated actions or re-entry', () => {
    const mission = new FirstAidMission(new TownWorld());
    approachMaster(mission);
    for (let press = 0; press < 30; press += 1) mission.interact();
    expect(mission.snapshot.inventory).toEqual([AID_KIT]);
    expect(mission.snapshot.dialogue).toBe(FIRST_AID_TEXT.reminder);
    leaveWorkshop(mission);
    mission.interact();
    walkTo(mission.world, { x: 0, z: .25 });
    walkTo(mission.world, { x: .75, z: .25 });
    mission.interact();
    expect(mission.snapshot.inventory).toEqual([AID_KIT]);
    mission.destroy();
  });

  it('does not expose the master at identical interior coordinates in another building', () => {
    const clinic = TOWN_BUILDINGS.find(building => building.id === CLINIC_ID)!;
    const mission = new FirstAidMission(new TownWorld(buildingEntrance(clinic)));
    mission.interact();
    walkTo(mission.world, { x: 0, z: .25 });
    walkTo(mission.world, { x: .75, z: .25 });
    expect(mission.interaction).toBeNull();
    expect(mission.interact()).toBe(false);
    expect(mission.snapshot.inventory).toEqual([]);
    mission.destroy();
  });

  it('keeps the kit and delivery objective while walking all the way to the clinic', () => {
    const mission = new FirstAidMission(new TownWorld());
    approachMaster(mission);
    mission.interact();
    leaveWorkshop(mission);
    walkTo(mission.world, { x: 32, z: 46 });
    walkTo(mission.world, { x: 40, z: 46 });
    expect(mission.interaction?.kind).toBe('enter');
    mission.interact();
    expect(mission.world.interior?.id).toBe(CLINIC_ID);
    expect(mission.snapshot.inventory).toEqual([AID_KIT]);
    expect(mission.snapshot.stage).toBe('deliver-aid');
    expect(mission.snapshot.hint).toBe(FIRST_AID_TEXT.clinicHint);
    mission.destroy();
  });

  it('blocks walking through the master while leaving the doorway usable', () => {
    const mission = new FirstAidMission(new TownWorld());
    approachMaster(mission);
    for (let step = 0; step < 20; step += 1) mission.world.move(1, 0, .05);
    expect(mission.world.position.x).toBeLessThanOrEqual(MASTER.x - MASTER.width / 2 - .3 + .001);
    expect(mission.interaction?.kind).toBe('master');
    leaveWorkshop(mission);
    expect(mission.world.interior).toBeNull();
    mission.destroy();
  });

  it('releases listeners and world subscriptions when disposed', () => {
    const mission = new FirstAidMission(new TownWorld());
    const listener = vi.fn();
    const unsubscribe = mission.subscribe(listener);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    mission.world.move(0, 1, .05);
    expect(listener).toHaveBeenCalledTimes(1);
    mission.subscribe(listener);
    listener.mockClear();
    mission.destroy();
    mission.world.move(0, 1, .05);
    expect(listener).not.toHaveBeenCalled();
  });
});

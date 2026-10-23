import { afterEach, describe, expect, it, vi } from 'vitest';
import { FirstAidMission } from '@game/systems/first-aid-mission';
import { TownWorld } from '@game/systems/town-world';
import { TownSession } from '@game/systems/town-session';
import { TownSaveStore, TOWN_SAVE_KEY, TOWN_BACKUP_KEY, parseTownSave, type SaveStorage } from '@game/systems/town-save';
import { approachMaster, leaveWorkshop, walkTo } from '../fixtures/first-aid-route';

class MemoryStorage implements SaveStorage {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}
function setup(storage: SaveStorage) {
  const world = new TownWorld();
  const mission = new FirstAidMission(world);
  const session = new TownSession(world, mission, new TownSaveStore(storage));
  return { world, mission, session, close: () => { session.destroy(); mission.destroy(); } };
}
function reachMedic(mission: FirstAidMission): void {
  leaveWorkshop(mission);
  walkTo(mission.world, { x: 32, z: 46 });
  walkTo(mission.world, { x: 40, z: 46 });
  mission.interact();
  walkTo(mission.world, { x: 0, z: .25 });
  walkTo(mission.world, { x: .75, z: .25 });
}
afterEach(() => vi.useRealTimers());

describe('Delivery and persistent town progress', () => {
  it('delivers once, removes the kit, restores the clinic and persists completion immediately', () => {
    const storage = new MemoryStorage();
    const game = setup(storage);
    approachMaster(game.mission);
    game.mission.interact();
    reachMedic(game.mission);
    expect(game.mission.interaction?.kind).toBe('medic');
    game.mission.interact();
    expect(game.mission.snapshot).toMatchObject({ stage: 'completed', inventory: [], clinicSupplied: true, targetBuildingId: null });
    const saved = parseTownSave(storage.getItem(TOWN_SAVE_KEY));
    expect(saved?.stage).toBe('completed');
    expect(saved?.world.interiorId).toBe('clinic');
    for (let i = 0; i < 10; i++) game.mission.interact();
    expect(game.mission.snapshot.inventory).toEqual([]);
    game.close();
    const resumed = setup(storage);
    expect(resumed.mission.snapshot.stage).toBe('completed');
    expect(resumed.mission.snapshot.clinicSupplied).toBe(true);
    expect(resumed.world.snapshot).toEqual(saved?.world);
    expect(resumed.mission.interaction?.kind).toBe('medic');
    walkTo(resumed.world, { x: 0, z: .25 });
    walkTo(resumed.world, { x: 0, z: 2 });
    resumed.mission.interact();
    expect(resumed.world.interior).toBeNull();
    walkTo(resumed.world, { x: 32, z: 46 });
    walkTo(resumed.world, { x: 24, z: 46 });
    resumed.mission.interact();
    walkTo(resumed.world, { x: 0, z: .25 });
    walkTo(resumed.world, { x: .75, z: .25 });
    resumed.mission.interact();
    expect(resumed.mission.snapshot.stage).toBe('completed');
    expect(resumed.mission.snapshot.inventory).toEqual([]);
    resumed.close();
  });

  it('restores a carried kit and location before delivery without granting another kit', () => {
    const storage = new MemoryStorage();
    const game = setup(storage);
    approachMaster(game.mission); game.mission.interact();
    const expected = game.world.snapshot;
    game.close();
    const resumed = setup(storage);
    expect(resumed.world.snapshot).toEqual(expected);
    expect(resumed.mission.snapshot.inventory).toHaveLength(1);
    resumed.mission.interact();
    expect(resumed.mission.snapshot.inventory).toHaveLength(1);
    resumed.close();
  });

  it('saves movement at a bounded interval and flushes the latest position before closing', () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    const game = setup(storage);
    game.world.move(0, 1, .05);
    expect(storage.getItem(TOWN_SAVE_KEY)).toBeNull();
    vi.advanceTimersByTime(500);
    expect(parseTownSave(storage.getItem(TOWN_SAVE_KEY))?.world.position).toEqual(game.world.position);
    game.world.move(0, 1, .05); game.close();
    expect(parseTownSave(storage.getItem(TOWN_SAVE_KEY))?.world.position).toEqual(game.world.position);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('loads a valid backup even if primary is absent or corrupt and never backs up corrupt primary', () => {
    const storage = new MemoryStorage();
    const game = setup(storage);
    approachMaster(game.mission); game.mission.interact(); game.close();
    const good = storage.getItem(TOWN_SAVE_KEY)!;
    storage.setItem(TOWN_BACKUP_KEY, good);
    storage.setItem(TOWN_SAVE_KEY, '{broken');
    const resumed = setup(storage);
    expect(resumed.session.message).toContain('резервной');
    expect(resumed.mission.snapshot.stage).toBe('deliver-aid');
    resumed.world.move(0, 1, .05); resumed.session.flush();
    expect(storage.getItem(TOWN_BACKUP_KEY)).toBe(good);
    resumed.close();
    storage.values.delete(TOWN_SAVE_KEY);
    expect(new TownSaveStore(storage).load().status).toBe('recovered');
  });

  it.each(['schema', 'stage', 'unknown room', 'out of bounds', 'inside wall', 'invalid return', 'nonfinite'])('rejects invalid save: %s', (kind) => {
    const storage = new MemoryStorage(); const game = setup(storage);
    approachMaster(game.mission); game.mission.interact(); game.close();
    const save = JSON.parse(storage.getItem(TOWN_SAVE_KEY)!) as Record<string, unknown>;
    const world = save.world as Record<string, unknown>;
    if (kind === 'schema') save.schemaVersion = 99;
    if (kind === 'stage') save.stage = 'invented';
    if (kind === 'unknown room') world.interiorId = 'no-such-building';
    if (kind === 'out of bounds') world.position = { x: 900, z: 0 };
    if (kind === 'inside wall') world.position = { x: -1, z: -2.4 };
    if (kind === 'invalid return') world.outdoorReturn = { x: 1, z: 1 };
    if (kind === 'nonfinite') world.position = { x: null, z: 0 };
    expect(parseTownSave(JSON.stringify(save))).toBeNull();
  });

  it('continues in memory with a visible warning when storage is forbidden', () => {
    const unavailable: SaveStorage = { getItem: () => { throw new Error('Denied'); }, setItem: () => { throw new Error('Denied'); } };
    const game = setup(unavailable);
    approachMaster(game.mission); game.mission.interact(); reachMedic(game.mission); game.mission.interact();
    expect(game.mission.snapshot.stage).toBe('completed');
    expect(game.session.message).toContain('недоступно');
    game.close();
  });

  it('reports quota failure without rolling back gameplay', () => {
    const storage = new MemoryStorage();
    const game = setup(storage);
    vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    approachMaster(game.mission); game.mission.interact();
    expect(game.mission.snapshot.stage).toBe('deliver-aid');
    expect(game.session.message).toContain('недоступно');
    game.close();
  });

  it('restarts only the town session, preserving unrelated storage', () => {
    const storage = new MemoryStorage(); storage.setItem('unrelated', 'keep');
    const game = setup(storage);
    approachMaster(game.mission); game.mission.interact(); game.session.newGame();
    expect(game.world.interior).toBeNull();
    expect(game.world.position).toEqual({ x: 32, z: 35 });
    expect(game.mission.snapshot.stage).toBe('meet-master');
    expect(parseTownSave(storage.getItem(TOWN_SAVE_KEY))?.stage).toBe('meet-master');
    expect(storage.getItem('unrelated')).toBe('keep');
    game.close();
  });
});

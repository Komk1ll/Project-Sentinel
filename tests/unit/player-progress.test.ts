import { describe, expect, it, vi } from 'vitest';
import { PlayerProgress } from '@game/systems/player-progress';

describe('Player progress', () => {
  it('starts all player statistics, level, and experience at zero', () => {
    expect(new PlayerProgress().snapshot).toEqual({
      health: 0,
      stamina: 0,
      hunger: 0,
      mood: 0,
      level: 0,
      experience: 0,
    });
  });

  it('provides current statistics immediately and publishes item-driven changes', () => {
    const progress = new PlayerProgress();
    const listener = vi.fn();
    progress.subscribe(listener);

    expect(listener).toHaveBeenCalledWith(progress.snapshot);
    progress.update({ health: 25 });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith({
      health: 25,
      stamina: 0,
      hunger: 0,
      mood: 0,
      level: 0,
      experience: 0,
    });
  });

  it('bounds statistics and experience to their display range', () => {
    const progress = new PlayerProgress();
    progress.update({ health: 150, stamina: -5, hunger: 200, mood: -1, experience: 120 });

    expect(progress.snapshot).toEqual({
      health: 100,
      stamina: 0,
      hunger: 100,
      mood: 0,
      level: 0,
      experience: 100,
    });
    progress.update({ experience: -10 });
    expect(progress.snapshot.experience).toBe(0);
  });

  it('keeps level a nonnegative integer without imposing a percentage cap', () => {
    const progress = new PlayerProgress();
    progress.update({ level: 123.9 });
    expect(progress.snapshot.level).toBe(123);
    progress.update({ level: -2 });
    expect(progress.snapshot.level).toBe(0);
  });

  it('normalizes nonfinite values to zero', () => {
    const progress = new PlayerProgress();
    progress.update({ health: Infinity, stamina: NaN, hunger: -Infinity, mood: NaN, level: Infinity, experience: NaN });
    expect(Object.values(progress.snapshot)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('stops notifying a subscriber after unsubscribe', () => {
    const progress = new PlayerProgress();
    const listener = vi.fn();
    const unsubscribe = progress.subscribe(listener);
    unsubscribe();
    progress.update({ stamina: 20 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(progress.snapshot.stamina).toBe(20);
  });

  it('preserves previous snapshots when progress changes', () => {
    const progress = new PlayerProgress();
    const previous = progress.snapshot;
    progress.update({ health: 25 });

    expect(previous.health).toBe(0);
    expect(progress.snapshot.health).toBe(25);
    expect(progress.snapshot).not.toBe(previous);
  });
});

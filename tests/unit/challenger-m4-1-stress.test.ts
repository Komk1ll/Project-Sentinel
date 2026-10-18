/**
 * Challenger 1 Empirical Stress Test Suite
 * Milestone 4: Diorama Zones & Dynamic Lighting
 * 
 * Adversarial empirical tests covering:
 * 1. Out-of-bounds coordinates & negative coordinates:
 *    - Negative integer and floating coordinates
 *    - Out-of-bounds integer and floating coordinates
 *    - Infinity and -Infinity
 *    - NaN coordinates vulnerability discovery
 *    - Boundary float edges
 * 2. Rapidly transitioning through zones:
 *    - Rapid sequential cycles across all 11 diorama zones (550 transitions)
 *    - Concurrent Promise.all zone load race conditions
 *    - Listener notification integrity under rapid bursts
 * 3. Entity obstacle clearing idempotency:
 *    - Repeated clearing of the same obstacle
 *    - Clearing nonexistent entities or entities without blocked tiles
 *    - Cross-zone persistence behavior of cleared obstacles
 * 4. Corrupted state recovery in loadState():
 *    - Empty, partial, null/undefined states
 *    - Corrupted / unvalidated zoneId in loadState leaving instance poisoned
 *    - Nonexistent lightingState in loadState
 *    - Malformed / duplicate interactedPropIds
 * 5. Persistence of powerRestored:
 *    - Persistence across rapid sequential zone loads in memory
 *    - Persistence across saveState() and loadState() in lab corridor
 *    - Loss of powerRestored when saving outside lab corridor
 * 6. ThreeRenderer async model synchronization:
 *    - Concurrent loadZone calls with async model spawning delays
 *    - Error rejection tolerance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DioramaManager } from '@/game/systems/DioramaManager';
import type { DioramaZoneId } from '@/types/campaign';
import type { ThreeRenderer } from '@/game/render/ThreeRenderer';
import type { PixelArtModelInstance } from '@/game/render/PixelArtModelInstance';

describe('Challenger 1 Empirical Stress Suite: DioramaManager (Milestone 4)', () => {
  let manager: DioramaManager;

  const ALL_ZONES: DioramaZoneId[] = [
    'zone_01_gate',
    'zone_02_deans_basement',
    'zone_03_courtyard_alley',
    'zone_04_lab_corridor',
    'zone_05_security_room',
    'zone_06_winter_garden',
    'zone_07_cable_tunnel',
    'zone_08_grand_lobby',
    'zone_09_datacenter',
    'zone_10_finale_celebration',
    'zone_11_finale_cleanup',
  ];

  beforeEach(() => {
    manager = new DioramaManager();
  });

  // =========================================================================
  // 1. Out-of-Bounds and Negative Coordinates Stress Tests
  // =========================================================================
  describe('1. Out-of-Bounds and Negative Coordinates', () => {
    it('STRESS-COORD-01: negative integers are strictly non-walkable', async () => {
      await manager.loadZone('zone_01_gate');
      expect(manager.isWalkable(-1, 0)).toBe(false);
      expect(manager.isWalkable(0, -1)).toBe(false);
      expect(manager.isWalkable(-1, -1)).toBe(false);
      expect(manager.isWalkable(-100, 5)).toBe(false);
      expect(manager.isWalkable(5, -100)).toBe(false);
    });

    it('STRESS-COORD-02: negative floats between -1 and 0 are strictly non-walkable', async () => {
      await manager.loadZone('zone_01_gate');
      expect(manager.isWalkable(-0.0001, 3)).toBe(false);
      expect(manager.isWalkable(3, -0.0001)).toBe(false);
      expect(manager.isWalkable(-0.9999, 3)).toBe(false);
      expect(manager.isWalkable(3, -0.9999)).toBe(false);
    });

    it('STRESS-COORD-03: coordinates beyond zone dimensions are strictly non-walkable', async () => {
      await manager.loadZone('zone_01_gate');
      const desc = manager.getActiveZoneDescriptor();

      expect(manager.isWalkable(desc.width, 0)).toBe(false);
      expect(manager.isWalkable(0, desc.height)).toBe(false);
      expect(manager.isWalkable(desc.width, desc.height)).toBe(false);
      expect(manager.isWalkable(desc.width + 100, 5)).toBe(false);
      expect(manager.isWalkable(5, desc.height + 100)).toBe(false);
      expect(manager.isWalkable(Number.MAX_SAFE_INTEGER, 0)).toBe(false);
    });

    it('STRESS-COORD-04: Infinity and -Infinity are strictly non-walkable', async () => {
      await manager.loadZone('zone_01_gate');
      expect(manager.isWalkable(Infinity, 0)).toBe(false);
      expect(manager.isWalkable(0, Infinity)).toBe(false);
      expect(manager.isWalkable(-Infinity, 0)).toBe(false);
      expect(manager.isWalkable(0, -Infinity)).toBe(false);
      expect(manager.isWalkable(Infinity, Infinity)).toBe(false);
      expect(manager.isWalkable(-Infinity, -Infinity)).toBe(false);
    });

    it('STRESS-COORD-05: verifies NaN coordinates are strictly non-walkable', async () => {
      await manager.loadZone('zone_01_gate');
      const isNaNWalkableX = manager.isWalkable(NaN, 5);
      const isNaNWalkableY = manager.isWalkable(5, NaN);
      const isNaNWalkableBoth = manager.isWalkable(NaN, NaN);

      expect(isNaNWalkableX).toBe(false);
      expect(isNaNWalkableY).toBe(false);
      expect(isNaNWalkableBoth).toBe(false);
    });

    it('STRESS-COORD-06: sub-tile floating point boundaries around walkabilityBounds', async () => {
      await manager.loadZone('zone_02_deans_basement');
      const desc = manager.getActiveZoneDescriptor();
      const bounds = desc.walkabilityBounds!;

      // Interior walkable tile
      expect(manager.isWalkable(bounds.minX + 1, bounds.minY + 1)).toBe(true);

      // Exactly at minimum bounds
      expect(manager.isWalkable(bounds.minX, bounds.minY)).toBe(true);

      // Just below minimum bounds
      expect(manager.isWalkable(bounds.minX - 0.001, bounds.minY)).toBe(false);
      expect(manager.isWalkable(bounds.minX, bounds.minY - 0.001)).toBe(false);

      // Exactly at maximum bounds (integer tile index)
      expect(manager.isWalkable(bounds.maxX, bounds.maxY)).toBe(true);

      // Sub-tile continuous float coordinates inside maximum tile [maxX, maxX + 1)
      expect(manager.isWalkable(bounds.maxX + 0.08, bounds.maxY)).toBe(true);
      expect(manager.isWalkable(bounds.maxX, bounds.maxY + 0.08)).toBe(true);
      expect(manager.isWalkable(bounds.maxX + 0.999, bounds.maxY)).toBe(true);

      // Beyond maximum bounds (>= maxX + 1)
      expect(manager.isWalkable(bounds.maxX + 1.0, bounds.maxY)).toBe(false);
      expect(manager.isWalkable(bounds.maxX, bounds.maxY + 1.0)).toBe(false);
      expect(manager.isWalkable(bounds.maxX + 1.001, bounds.maxY)).toBe(false);
      expect(manager.isWalkable(bounds.maxX, bounds.maxY + 1.001)).toBe(false);
    });
  });

  // =========================================================================
  // 2. Rapid Zone Transitions & Concurrency
  // =========================================================================
  describe('2. Rapid Zone Transitions & Concurrency', () => {
    it('STRESS-TRANS-01: rapidly transitions across all 11 zones sequentially for 50 cycles (550 transitions)', async () => {
      for (let cycle = 0; cycle < 50; cycle++) {
        for (const zone of ALL_ZONES) {
          await manager.loadZone(zone);
          expect(manager.getActiveZone()).toBe(zone);
          expect(manager.getActiveZoneDescriptor().id).toBe(zone);
        }
      }
      expect(manager.getActiveZone()).toBe('zone_11_finale_cleanup');
    });

    it('STRESS-TRANS-02: listener notification count matches exact number of zone transitions', async () => {
      let callCount = 0;
      const unsub = manager.onZoneChange((zoneId, desc) => {
        expect(desc.id).toBe(zoneId);
        callCount++;
      });

      for (let i = 0; i < 30; i++) {
        const targetZone = ALL_ZONES[i % ALL_ZONES.length]!;
        await manager.loadZone(targetZone);
      }

      expect(callCount).toBe(30);
      unsub();

      await manager.loadZone('zone_01_gate');
      expect(callCount).toBe(30); // Unsubscribed
    });

    it('STRESS-TRANS-03: concurrent Promise.all zone load calls resolve to a valid catalog zone', async () => {
      const promises = [
        manager.loadZone('zone_01_gate'),
        manager.loadZone('zone_04_lab_corridor'),
        manager.loadZone('zone_07_cable_tunnel'),
        manager.loadZone('zone_09_datacenter'),
        manager.loadZone('zone_02_deans_basement'),
      ];

      await Promise.all(promises);

      const active = manager.getActiveZone();
      expect(ALL_ZONES).toContain(active);
      const desc = manager.getActiveZoneDescriptor();
      expect(desc.id).toBe(active);
    });
  });

  // =========================================================================
  // 3. Entity Obstacle Clearing Idempotency & Persistence
  // =========================================================================
  describe('3. Entity Obstacle Clearing Idempotency & Persistence', () => {
    it('STRESS-OBS-01: repeated calls to clearEntityObstacle are completely idempotent', async () => {
      await manager.loadZone('zone_03_courtyard_alley');
      expect(manager.isWalkable(8, 8)).toBe(false);

      // Clear once
      manager.clearEntityObstacle('robot_blocker_bot_01');
      expect(manager.isWalkable(8, 8)).toBe(true);

      // Repeat 15 times
      for (let i = 0; i < 15; i++) {
        expect(() => manager.clearEntityObstacle('robot_blocker_bot_01')).not.toThrow();
        expect(manager.isWalkable(8, 8)).toBe(true);
      }
    });

    it('STRESS-OBS-02: clearing non-existent entity IDs is a safe no-op', async () => {
      await manager.loadZone('zone_03_courtyard_alley');
      expect(manager.isWalkable(8, 8)).toBe(false);

      expect(() => manager.clearEntityObstacle('non_existent_entity_999')).not.toThrow();
      expect(() => manager.clearEntityObstacle('')).not.toThrow();
      expect(() => manager.clearEntityObstacle(null as any)).not.toThrow();
      expect(() => manager.clearEntityObstacle(undefined as any)).not.toThrow();

      // Original obstacle remains blocked
      expect(manager.isWalkable(8, 8)).toBe(false);
    });

    it('STRESS-OBS-03: clearing entity with empty or undefined blockedTiles is safe', async () => {
      await manager.loadZone('zone_01_gate');
      expect(() => manager.clearEntityObstacle('robot_patrol_droid_01')).not.toThrow();
      expect(manager.isWalkable(10, 8)).toBe(true);
    });

    it('STRESS-OBS-04: verifies that clearEntityObstacle persists when reloading the zone', async () => {
      await manager.loadZone('zone_03_courtyard_alley');
      expect(manager.isWalkable(8, 8)).toBe(false);

      // Disassemble blocker bot -> clears tile (8, 8)
      manager.clearEntityObstacle('robot_blocker_bot_01');
      expect(manager.isWalkable(8, 8)).toBe(true);

      // Travel to laboratory and come back
      await manager.loadZone('zone_04_lab_corridor');
      await manager.loadZone('zone_03_courtyard_alley');

      // Cleared obstacle persists across zone reload
      expect(manager.isWalkable(8, 8)).toBe(true);
    });

    it('STRESS-OBS-05: verifies cleared obstacles persist across saveState and loadState', async () => {
      await manager.loadZone('zone_03_courtyard_alley');
      expect(manager.isWalkable(8, 8)).toBe(false);

      manager.clearEntityObstacle('robot_blocker_bot_01');
      expect(manager.isWalkable(8, 8)).toBe(true);

      const savedState = manager.saveState();
      expect(savedState.clearedEntityIds).toContain('robot_blocker_bot_01');

      const freshManager = new DioramaManager();
      freshManager.loadState(savedState);
      expect(freshManager.isWalkable(8, 8)).toBe(true);
    });
  });

  // =========================================================================
  // 4. Corrupted State Recovery in loadState()
  // =========================================================================
  describe('4. Corrupted State Recovery in loadState()', () => {
    it('STRESS-STATE-01: empty or partial save states do not throw and preserve valid manager state', () => {
      const initialZone = manager.getActiveZone();
      const initialLighting = manager.getLightingState();

      expect(() => manager.loadState({})).not.toThrow();
      expect(manager.getActiveZone()).toBe(initialZone);
      expect(manager.getLightingState()).toBe(initialLighting);

      expect(() => manager.loadState({ currentZoneId: undefined })).not.toThrow();
      expect(() => manager.loadState({ lightingState: undefined })).not.toThrow();
      expect(() => manager.loadState({ interactedPropIds: undefined })).not.toThrow();
    });

    it('STRESS-STATE-02: malformed interactedPropIds with empty strings and duplicates', () => {
      manager.loadState({
        interactedPropIds: ['prop_1', 'prop_1', '', 'prop_2'],
      });

      expect(manager.isPropInteracted('prop_1')).toBe(true);
      expect(manager.isPropInteracted('prop_2')).toBe(true);
      expect(manager.isPropInteracted('prop_3')).toBe(false);
    });

    it('STRESS-STATE-03: verifies loading corrupted zoneId is safely ignored without poisoning manager', () => {
      const corruptedState: any = {
        currentZoneId: 'corrupted_zone_non_existent',
      };

      const initialZone = manager.getActiveZone();
      manager.loadState(corruptedState);
      // Valid active zone is preserved
      expect(manager.getActiveZone()).toBe(initialZone);

      // Subsequent public methods work safely without throwing
      expect(() => manager.getActiveZoneDescriptor()).not.toThrow();
      expect(manager.getActiveZoneDescriptor().id).toBe(initialZone);
      expect(() => manager.isWalkable(0, 0)).not.toThrow();
      expect(() => manager.saveState()).not.toThrow();
      expect(() => manager.clearEntityObstacle('foo')).not.toThrow();
    });

    it('STRESS-STATE-04: loading invalid lightingState retains defined state without crashing controller', () => {
      expect(() => {
        manager.loadState({
          lightingState: 'unknown_corrupted_lighting' as any,
        });
      }).not.toThrow();

      expect(manager.getLightingState()).toBeDefined();
    });
  });

  // =========================================================================
  // 5. Persistence of powerRestored across Transitions and Saves
  // =========================================================================
  describe('5. Persistence of powerRestored across Transitions and Saves', () => {
    it('STRESS-PWR-01: power restoration persists across 20 sequential round-trip zone transitions in memory', async () => {
      await manager.loadZone('zone_04_lab_corridor');
      expect(manager.getLightingState()).toBe('dark_emergency');

      // Restore power
      manager.notifyPowerRestored();
      expect(manager.isPowerGridRestored()).toBe(true);
      expect(manager.getLightingState()).toBe('warm_restored');

      // Sequentially visit all other 10 zones
      for (const zone of ALL_ZONES) {
        if (zone === 'zone_04_lab_corridor') continue;
        await manager.loadZone(zone);
        expect(manager.isPowerGridRestored()).toBe(true);
      }

      // Return to lab corridor
      await manager.loadZone('zone_04_lab_corridor');
      expect(manager.isPowerGridRestored()).toBe(true);
      expect(manager.getLightingState()).toBe('warm_restored');
    });

    it('STRESS-PWR-02: power restoration persists after saving and loading state while in zone_04_lab_corridor', async () => {
      await manager.loadZone('zone_04_lab_corridor');
      manager.notifyPowerRestored();
      expect(manager.getLightingState()).toBe('warm_restored');

      const savedState = manager.saveState();
      expect(savedState.currentZoneId).toBe('zone_04_lab_corridor');
      expect(savedState.lightingState).toBe('warm_restored');

      const freshManager = new DioramaManager();
      freshManager.loadState(savedState);

      expect(freshManager.getActiveZone()).toBe('zone_04_lab_corridor');
      expect(freshManager.getLightingState()).toBe('warm_restored');
      expect(freshManager.isPowerGridRestored()).toBe(true);
    });

    it('STRESS-PWR-03: verifies powerRestored persists across save/load when saved outside zone_04_lab_corridor', async () => {
      await manager.loadZone('zone_04_lab_corridor');
      manager.notifyPowerRestored();
      expect(manager.isPowerGridRestored()).toBe(true);

      // Player progresses to security room
      await manager.loadZone('zone_05_security_room');
      expect(manager.getLightingState()).toBe('twilight');

      // Save game in security room
      const savedState = manager.saveState();
      expect(savedState.isPowerRestored).toBe(true);

      // Restore game in a fresh manager instance
      const freshManager = new DioramaManager();
      freshManager.loadState(savedState);

      // In freshManager, isPowerRestored is preserved:
      expect(freshManager.isPowerGridRestored()).toBe(true);

      // Returning to lab corridor retains warm_restored because isPowerRestored was preserved!
      await freshManager.loadZone('zone_04_lab_corridor');
      expect(freshManager.getLightingState()).toBe('warm_restored');
    });
  });

  // =========================================================================
  // 6. ThreeRenderer Async Synchronization Stress
  // =========================================================================
  describe('6. ThreeRenderer Async Synchronization Stress', () => {
    it('STRESS-RENDER-01: gracefully handles async spawn delays and rapid zone switching without unhandled rejection', async () => {
      const removedModels: any[] = [];
      const spawnedModels: any[] = [];

      const mockThreeRenderer: Partial<ThreeRenderer> = {
        ambientLight: {} as any,
        directionalLight: {} as any,
        spawnModel: vi.fn(async (url: string, opts: any) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          const modelInstance = {
            url,
            position: opts.position,
          } as unknown as PixelArtModelInstance;
          spawnedModels.push(modelInstance);
          return modelInstance;
        }),
        removeModel: vi.fn((model: PixelArtModelInstance) => {
          removedModels.push(model);
        }),
      };

      manager.setThreeRenderer(mockThreeRenderer as ThreeRenderer);

      await manager.loadZone('zone_01_gate');
      await manager.loadZone('zone_02_deans_basement');
      await manager.loadZone('zone_03_courtyard_alley');

      expect(mockThreeRenderer.spawnModel).toHaveBeenCalled();
      expect(manager.getActiveZone()).toBe('zone_03_courtyard_alley');
    });

    it('STRESS-RENDER-02: tolerant when ThreeRenderer.spawnModel throws an error', async () => {
      const mockThreeRenderer: Partial<ThreeRenderer> = {
        ambientLight: {} as any,
        directionalLight: {} as any,
        spawnModel: vi.fn().mockRejectedValue(new Error('GLB file corrupted')),
        removeModel: vi.fn(),
      };

      manager.setThreeRenderer(mockThreeRenderer as ThreeRenderer);

      await expect(manager.loadZone('zone_01_gate')).resolves.toBeUndefined();
      expect(manager.getActiveZone()).toBe('zone_01_gate');
    });
  });
});

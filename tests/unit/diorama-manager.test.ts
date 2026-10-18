/**
 * Unit Test Suite: DioramaManager
 * Validates environmental diorama simulation, 11 campaign zones,
 * dynamic lighting rules, walkability collision, and persistence.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DioramaManager } from '../../src/game/systems/DioramaManager';
import { SwitchboardPuzzleSystem } from '../../src/game/systems/SwitchboardPuzzleSystem';
import type { DioramaZoneId } from '../../src/types/campaign';

describe('DioramaManager Unit Tests', () => {
  let manager: DioramaManager;

  beforeEach(() => {
    manager = new DioramaManager();
  });

  describe('1. Zone Lifecycle & Navigation', () => {
    it('initializes in starting zone_01_gate with twilight lighting', () => {
      expect(manager.getActiveZone()).toBe('zone_01_gate');
      expect(manager.getLightingState()).toBe('twilight');
    });

    it('transitions across all 11 campaign diorama zones', async () => {
      const allZones: DioramaZoneId[] = [
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

      for (const zone of allZones) {
        await manager.loadZone(zone);
        expect(manager.getActiveZone()).toBe(zone);
      }
    });

    it('notifies listeners when zone changes', async () => {
      const onZoneChange = vi.fn();
      const unsub = manager.onZoneChange(onZoneChange);

      await manager.loadZone('zone_02_deans_basement');
      expect(onZoneChange).toHaveBeenCalledWith('zone_02_deans_basement', expect.any(Object));

      unsub();
      await manager.loadZone('zone_03_courtyard_alley');
      expect(onZoneChange).toHaveBeenCalledTimes(1);
    });

    it('throws error when loading non-existent zone', async () => {
      await expect(manager.loadZone('invalid_zone' as any)).rejects.toThrow();
    });
  });

  describe('2. Dynamic Lighting Transitions', () => {
    it('automatically applies dark_emergency lighting in zone_04_lab_corridor', async () => {
      await manager.loadZone('zone_04_lab_corridor');
      expect(manager.getLightingState()).toBe('dark_emergency');
    });

    it('automatically applies sunny_day lighting in zone_10_finale_celebration', async () => {
      await manager.loadZone('zone_10_finale_celebration');
      expect(manager.getLightingState()).toBe('sunny_day');
    });

    it('automatically applies twilight lighting in zone_11_finale_cleanup', async () => {
      await manager.loadZone('zone_11_finale_cleanup');
      expect(manager.getLightingState()).toBe('twilight');
    });

    it('supports explicit setLightingState override and listener notification', () => {
      const onLightingChange = vi.fn();
      const unsub = manager.onLightingChange(onLightingChange);

      manager.setLightingState('warm_restored');
      expect(manager.getLightingState()).toBe('warm_restored');
      expect(onLightingChange).toHaveBeenCalledWith('warm_restored');

      unsub();
      manager.setLightingState('twilight');
      expect(onLightingChange).toHaveBeenCalledTimes(1);
    });

    it('transitions laboratory corridor to warm_restored upon power restoration', async () => {
      await manager.loadZone('zone_04_lab_corridor');
      expect(manager.getLightingState()).toBe('dark_emergency');

      manager.notifyPowerRestored();
      expect(manager.getLightingState()).toBe('warm_restored');
      expect(manager.isPowerGridRestored()).toBe(true);
    });

    it('preserves warm_restored state on subsequent visits to zone_04_lab_corridor after power restoration', async () => {
      await manager.loadZone('zone_04_lab_corridor');
      expect(manager.getLightingState()).toBe('dark_emergency');

      manager.notifyPowerRestored();
      expect(manager.getLightingState()).toBe('warm_restored');

      // Leave corridor to another zone
      await manager.loadZone('zone_05_security_room');
      expect(manager.getLightingState()).toBe('twilight');

      // Return to corridor: power was restored, so it must stay warm_restored!
      await manager.loadZone('zone_04_lab_corridor');
      expect(manager.getLightingState()).toBe('warm_restored');
    });

    it('integrates seamlessly with SwitchboardPuzzleSystem onPowerRestored event', async () => {
      await manager.loadZone('zone_04_lab_corridor');
      expect(manager.getLightingState()).toBe('dark_emergency');

      const switchboard = new SwitchboardPuzzleSystem({
        onPowerRestored: () => {
          manager.notifyPowerRestored();
        },
      });

      switchboard.isolateLine();
      switchboard.insertFuse('item_module_battery');
      const rebootResult = switchboard.rebootGrid();

      expect(rebootResult.powerRestored).toBe(true);
      expect(manager.getLightingState()).toBe('warm_restored');
    });
  });

  describe('3. Zone Descriptors & Spatial Coordinates', () => {
    const allZones: DioramaZoneId[] = [
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

    it('provides valid dimensions and player spawn coordinates for each zone', () => {
      for (const zone of allZones) {
        const desc = manager.getZoneDescriptor(zone);
        expect(desc).toBeDefined();
        expect(desc.width).toBeGreaterThan(0);
        expect(desc.height).toBeGreaterThan(0);
        expect(desc.playerSpawn.x).toBeGreaterThanOrEqual(0);
        expect(desc.playerSpawn.y).toBeGreaterThanOrEqual(0);
        expect(desc.playerSpawn.x).toBeLessThan(desc.width);
        expect(desc.playerSpawn.y).toBeLessThan(desc.height);
      }
    });

    it('retrieves active zone descriptor matching activeZone', async () => {
      expect(manager.getActiveZoneDescriptor().id).toBe('zone_01_gate');
      await manager.loadZone('zone_08_grand_lobby');
      expect(manager.getActiveZoneDescriptor().id).toBe('zone_08_grand_lobby');
    });

    it('returns catalog of all 11 zones via getAllZoneDescriptors()', () => {
      const all = manager.getAllZoneDescriptors();
      expect(Object.keys(all).length).toBe(11);
      for (const zone of allZones) {
        expect(all[zone]).toBeDefined();
      }
    });

    it('defines valid 3D GLB model paths for key entities and props', () => {
      const gateDesc = manager.getZoneDescriptor('zone_01_gate');
      const patrolDroid = gateDesc.entities.find((e) => e.type === 'robot');
      expect(patrolDroid?.modelUrl).toContain('patrol_droid.glb');

      const labDesc = manager.getZoneDescriptor('zone_04_lab_corridor');
      const professor = labDesc.entities.find((e) => e.type === 'npc');
      expect(professor?.modelUrl).toContain('character_professor.glb');
      const switchboard = labDesc.entities.find((e) => e.id === 'prop_switchboard');
      expect(switchboard?.modelUrl).toContain('prop_power_switchboard.glb');

      const datacenterDesc = manager.getZoneDescriptor('zone_09_datacenter');
      const consoleProp = datacenterDesc.entities.find((e) => e.id === 'prop_holo_console');
      expect(consoleProp?.modelUrl).toContain('prop_holo_console.glb');
    });
  });

  describe('4. Walkability Bounds and Dynamic Obstacles', () => {
    it('correctly reports walkability inside and outside bounds', async () => {
      await manager.loadZone('zone_03_courtyard_alley');
      const desc = manager.getZoneDescriptor('zone_03_courtyard_alley');

      // Player spawn is walkable
      expect(manager.isWalkable(desc.playerSpawn.x, desc.playerSpawn.y)).toBe(true);

      // Outside bounds
      expect(manager.isWalkable(-1, 0)).toBe(false);
      expect(manager.isWalkable(desc.width + 5, 0)).toBe(false);
      expect(manager.isWalkable(0, -1)).toBe(false);
      expect(manager.isWalkable(0, desc.height + 5)).toBe(false);
    });

    it('blocks tiles occupied by entities and allows clearing obstacles on disassembly', async () => {
      await manager.loadZone('zone_03_courtyard_alley');

      // Courier Blocker Bot is at (8, 8) and blocks tile
      expect(manager.isWalkable(8, 8)).toBe(false);

      // Disassemble robot -> clear obstacle
      manager.clearEntityObstacle('robot_blocker_bot_01');

      // (8, 8) is now unblocked and walkable!
      expect(manager.isWalkable(8, 8)).toBe(true);

      // Reloading the zone retains obstacle clearance
      await manager.loadZone('zone_04_lab_corridor');
      await manager.loadZone('zone_03_courtyard_alley');
      expect(manager.isWalkable(8, 8)).toBe(true);
    });

    it('rejects non-finite and out-of-bounds coordinates but permits continuous sub-tile floats', async () => {
      await manager.loadZone('zone_01_gate');
      const desc = manager.getActiveZoneDescriptor();

      expect(manager.isWalkable(NaN, 5)).toBe(false);
      expect(manager.isWalkable(5, NaN)).toBe(false);
      expect(manager.isWalkable(Infinity, 5)).toBe(false);

      // Continuous float within tile maxX
      expect(manager.isWalkable(desc.walkabilityBounds!.maxX + 0.08, 5)).toBe(true);
      // Beyond maxX tile
      expect(manager.isWalkable(desc.walkabilityBounds!.maxX + 1.05, 5)).toBe(false);
    });

    it('tracks interacted props', () => {
      expect(manager.isPropInteracted('prop_terminal_duty')).toBe(false);
      manager.markPropInteracted('prop_terminal_duty');
      expect(manager.isPropInteracted('prop_terminal_duty')).toBe(true);
    });
  });

  describe('5. State Serialization & Deserialization', () => {
    it('serializes and deserializes active zone, lighting state, and interacted props accurately', async () => {
      await manager.loadZone('zone_06_winter_garden');
      manager.setLightingState('twilight');
      manager.markPropInteracted('prop_greenhouse_plant');

      const savedState = manager.saveState();
      expect(savedState.currentZoneId).toBe('zone_06_winter_garden');
      expect(savedState.lightingState).toBe('twilight');
      expect(savedState.interactedPropIds).toContain('prop_greenhouse_plant');

      const newManager = new DioramaManager();
      newManager.loadState(savedState);

      expect(newManager.getActiveZone()).toBe('zone_06_winter_garden');
      expect(newManager.getLightingState()).toBe('twilight');
      expect(newManager.isPropInteracted('prop_greenhouse_plant')).toBe(true);
    });

    it('serializes and restores isPowerRestored and clearedEntityIds', async () => {
      await manager.loadZone('zone_03_courtyard_alley');
      manager.clearEntityObstacle('robot_blocker_bot_01');
      manager.notifyPowerRestored();

      const saved = manager.saveState();
      expect(saved.isPowerRestored).toBe(true);
      expect(saved.clearedEntityIds).toContain('robot_blocker_bot_01');

      const newManager = new DioramaManager();
      newManager.loadState(saved);

      expect(newManager.isPowerGridRestored()).toBe(true);
      expect(newManager.isWalkable(8, 8)).toBe(true);
    });

    it('resets to starting zone and lighting state via reset()', async () => {
      await manager.loadZone('zone_09_datacenter');
      manager.notifyPowerRestored();
      manager.markPropInteracted('prop_holo_console');

      manager.reset();

      expect(manager.getActiveZone()).toBe('zone_01_gate');
      expect(manager.getLightingState()).toBe('twilight');
      expect(manager.isPowerGridRestored()).toBe(false);
      expect(manager.isPropInteracted('prop_holo_console')).toBe(false);
    });
  });
});

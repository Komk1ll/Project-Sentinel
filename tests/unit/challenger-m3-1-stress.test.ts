/**
 * Challenger 1 Empirical Stress Test Suite
 * Milestone 3: Impulse Debugger, Modular Disassembly, Keypad Passcode, and Power Switchboard
 * 
 * Adversarial empirical tests covering:
 * 1. Impulse Debugger:
 *    - Friendly fire safety interlocks against NPCs (Professor) with rapid multi-firing
 *    - Out of range precision boundaries (4.499m, 4.500m, 4.501m, beyond, unregistered)
 *    - Rapid fire & concurrency stress (un-aimed dissipation, aim lock reset invariant)
 *    - Retargeting already disassembled / deactivated robots
 * 2. Modular Disassembly & Ground Drops:
 *    - Disassembly when inventory is 100% full (drops persist on ground)
 *    - Multi-zone ground drop persistence and zone-filtered queries
 *    - Partial pickup when inventory capacity frees up incrementally
 *    - Drop stress fuzzing (high volume concurrent drops and collections)
 *    - Full save/restore round-trip serialization of ground drops
 * 3. Keypad Passcode Puzzle:
 *    - Code 1984 verification and permanent unlock invariant
 *    - Invalid keypad inputs: negative integers, non-integers, floats, NaN, Infinity, out of bounds (>9)
 *    - Buffer clamping at 4 digits and auto-resetting on incorrect codes
 *    - Idempotency of clear() when locked vs unlocked (clear must NEVER re-lock)
 *    - Repeated brute-force wrong attempts followed by successful code
 * 4. Switchboard Repair Puzzle:
 *    - Strict 3-step sequence: 1) isolateLine -> 2) insertFuse -> 3) rebootGrid
 *    - All out-of-order permutations (tripping circuit breaker, residual voltage arcing)
 *    - Missing component rejection when fuse is absent from inventory
 *    - Duplicate / redundant calls at every phase (idempotent completion)
 *    - Insulating tape requirement configuration
 * 5. CampaignDriver Integration Verification:
 *    - Full boundary verification across all four subsystems via high-level driver
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ImpulseDebuggerSystem,
  GroundDropManager,
  KeypadPuzzleSystem,
  SwitchboardPuzzleSystem,
} from '@/game/systems/PuzzleSystems';
import { createCampaignDriver, CampaignDriver } from '../e2e/harness';

describe('Challenger 1 Empirical Stress Suite: Debugger, Disassembly, Keypad, Switchboard', () => {
  // =========================================================================
  // 1. Impulse Debugger Stress Tests
  // =========================================================================
  describe('1. Impulse Debugger Stress & Boundary Tests', () => {
    let debuggerSystem: ImpulseDebuggerSystem;

    beforeEach(() => {
      debuggerSystem = new ImpulseDebuggerSystem();
    });

    it('STRESS-DBG-01: friendly fire interlock strictly prevents NPC deactivation across repeated rapid firings', () => {
      let friendlyFireCount = 0;
      debuggerSystem.onFriendlyFireBlocked((targetId) => {
        expect(targetId).toBe('professor_npc');
        friendlyFireCount++;
      });

      // Aim at NPC
      const aimed = debuggerSystem.aimAt('professor_npc');
      expect(aimed).toBe(true);
      expect(debuggerSystem.getAimedTargetId()).toBe('professor_npc');

      // Attempt to fire 10 times in sequence at Professor NPC
      for (let i = 0; i < 10; i++) {
        debuggerSystem.aimAt('professor_npc');
        const res = debuggerSystem.firePulse();
        expect(res.hit).toBe(false);
        expect(res.error).toBe('Target is not an infected device');
        expect(res.disassembledModules).toBeUndefined();
        expect(debuggerSystem.getTarget('professor_npc')?.deactivated).toBe(false);
      }

      expect(friendlyFireCount).toBe(10);
      expect(debuggerSystem.getTarget('professor_npc')?.deactivated).toBe(false);
    });

    it('STRESS-DBG-02: precision distance thresholds for effective range (4.5m boundary)', () => {
      debuggerSystem.setPlayerPosition({ x: 0, y: 0 });

      // Inside boundary: 4.49m
      debuggerSystem.registerTarget('bot_4_49', 'robot', undefined, {
        position: { x: 4.49, y: 0 },
      });
      expect(debuggerSystem.aimAt('bot_4_49')).toBe(true);

      // Exactly on boundary: 4.50m
      debuggerSystem.registerTarget('bot_4_50', 'robot', undefined, {
        position: { x: 4.5, y: 0 },
      });
      expect(debuggerSystem.aimAt('bot_4_50')).toBe(true);

      // Outside boundary: 4.51m
      debuggerSystem.registerTarget('bot_4_51', 'robot', undefined, {
        position: { x: 4.51, y: 0 },
      });
      expect(debuggerSystem.aimAt('bot_4_51')).toBe(false);

      // Diagonal distance: (3.18, 3.18) -> sqrt(2 * 3.18^2) ≈ 4.497m <= 4.5m
      debuggerSystem.registerTarget('bot_diag_in', 'robot', undefined, {
        position: { x: 3.18, y: 3.18 },
      });
      expect(debuggerSystem.aimAt('bot_diag_in')).toBe(true);

      // Diagonal distance: (3.20, 3.20) -> sqrt(2 * 3.20^2) ≈ 4.525m > 4.5m
      debuggerSystem.registerTarget('bot_diag_out', 'robot', undefined, {
        position: { x: 3.20, y: 3.20 },
      });
      expect(debuggerSystem.aimAt('bot_diag_out')).toBe(false);
    });

    it('STRESS-DBG-03: rapid un-aimed firing dissipates cleanly into open air without side effects', () => {
      // 50 rapid pulses with no aim lock
      for (let i = 0; i < 50; i++) {
        const pulse = debuggerSystem.firePulse();
        expect(pulse.hit).toBe(false);
        expect(pulse.error).toBe('Pulse dissipated into open space');
        expect(pulse.disassembledModules).toBeUndefined();
      }

      // Default targets should remain untouched
      expect(debuggerSystem.getTarget('blocker_bot_01')?.deactivated).toBe(false);
      expect(debuggerSystem.getTarget('robo_dog_01')?.deactivated).toBe(false);
    });

    it('STRESS-DBG-04: aim lock is cleared immediately on every pulse, preventing double-tap exploit', () => {
      debuggerSystem.aimAt('blocker_bot_01');
      expect(debuggerSystem.getAimedTargetId()).toBe('blocker_bot_01');

      // First shot: hits and disassembles
      const shot1 = debuggerSystem.firePulse();
      expect(shot1.hit).toBe(true);
      expect(debuggerSystem.getAimedTargetId()).toBeNull();

      // Second immediate shot without re-aiming: dissipates
      const shot2 = debuggerSystem.firePulse();
      expect(shot2.hit).toBe(false);
      expect(shot2.error).toBe('Pulse dissipated into open space');
    });

    it('STRESS-DBG-05: preventing re-firing at already disassembled / deactivated robots', () => {
      // Deactivate Blocker Bot
      debuggerSystem.aimAt('blocker_bot_01');
      const pulse1 = debuggerSystem.firePulse();
      expect(pulse1.hit).toBe(true);
      expect(debuggerSystem.getTarget('blocker_bot_01')?.deactivated).toBe(true);

      // Aim at the same deactivated bot
      const aimAgain = debuggerSystem.aimAt('blocker_bot_01');
      expect(aimAgain).toBe(true); // Can still aim at entity in range
      const pulse2 = debuggerSystem.firePulse();
      expect(pulse2.hit).toBe(false);
      expect(pulse2.error).toBe('Target is already deactivated');

      // Same check for Robo-Dog
      debuggerSystem.aimAt('robo_dog_01');
      const dogPulse1 = debuggerSystem.firePulse();
      expect(dogPulse1.hit).toBe(true);
      expect(dogPulse1.disassembledModules).toEqual(['item_server_keyring', 'item_dog_modules']);

      debuggerSystem.aimAt('robo_dog_01');
      const dogPulse2 = debuggerSystem.firePulse();
      expect(dogPulse2.hit).toBe(false);
      expect(dogPulse2.error).toBe('Target is already deactivated');
    });

    it('STRESS-DBG-06: aiming at unregistered or removed target safely fails', () => {
      expect(debuggerSystem.aimAt('unknown_droid_999')).toBe(false);
      expect(debuggerSystem.getAimedTargetId()).toBeNull();

      debuggerSystem.unregisterTarget('blocker_bot_01');
      expect(debuggerSystem.aimAt('blocker_bot_01')).toBe(false);
      expect(debuggerSystem.getAimedTargetId()).toBeNull();

      const pulse = debuggerSystem.firePulse();
      expect(pulse.hit).toBe(false);
      expect(pulse.error).toBe('Pulse dissipated into open space');
    });
  });

  // =========================================================================
  // 2. Modular Disassembly & Ground Drops Stress Tests
  // =========================================================================
  describe('2. Modular Disassembly & Ground Drops Stress Tests', () => {
    let dropManager: GroundDropManager;

    beforeEach(() => {
      dropManager = new GroundDropManager();
    });

    it('STRESS-DIS-01: robot disassembly with full inventory routes 100% of modules to ground drops', () => {
      const debuggerSys = new ImpulseDebuggerSystem();
      debuggerSys.aimAt('blocker_bot_01');
      const pulse = debuggerSys.firePulse();

      expect(pulse.hit).toBe(true);
      const modules = pulse.disassembledModules!;
      expect(modules).toHaveLength(4);

      // Simulate 100% full inventory: consumer returns false
      const inventoryFull = () => false;

      // Spawn all modules to ground
      for (const mod of modules) {
        dropManager.spawnDrop(mod, { x: 2.5, y: 3.5 }, 'zone_03_courtyard_alley');
      }

      expect(dropManager.getDrops()).toHaveLength(4);

      // Attempting to collect each drop while inventory is full
      for (const drop of dropManager.getDrops()) {
        const collected = dropManager.collectDrop(drop.id, inventoryFull);
        expect(collected).toBe(false);
      }

      // All 4 drops remain on ground intact
      expect(dropManager.getDrops()).toHaveLength(4);
    });

    it('STRESS-DIS-02: multi-zone ground drop persistence across zone transitions', () => {
      // Spawn drops across 3 different campaign zones
      dropManager.spawnDrop('item_module_wheels', { x: 1, y: 1 }, 'zone_01_gate');
      dropManager.spawnDrop('item_module_casing', { x: 2, y: 2 }, 'zone_03_courtyard_alley');
      const drop3 = dropManager.spawnDrop('item_module_battery', { x: 3, y: 3 }, 'zone_04_lab_corridor');
      dropManager.spawnDrop('item_server_keyring', { x: 4, y: 4 }, 'zone_06_winter_garden');

      expect(dropManager.getDrops()).toHaveLength(4);

      // Query by zone
      expect(dropManager.getDropsByZone('zone_01_gate')).toHaveLength(1);
      expect(dropManager.getDropsByZone('zone_03_courtyard_alley')).toHaveLength(1);
      expect(dropManager.getDropsByZone('zone_04_lab_corridor')).toHaveLength(1);
      expect(dropManager.getDropsByZone('zone_06_winter_garden')).toHaveLength(1);
      expect(dropManager.getDropsByZone('zone_08_grand_lobby')).toHaveLength(0);

      // Collect drop from zone_04 only
      const collected = dropManager.collectDrop(drop3.id, () => true);
      expect(collected).toBe(true);
      expect(dropManager.getDrops()).toHaveLength(3);
      expect(dropManager.getDropsByZone('zone_04_lab_corridor')).toHaveLength(0);
      expect(dropManager.getDropsByZone('zone_01_gate')).toHaveLength(1);
    });

    it('STRESS-DIS-03: incremental partial pickup as inventory capacity opens up', () => {
      // 4 modules on ground
      const d1 = dropManager.spawnDrop('item_module_wheels', { x: 1, y: 1 }, 'zone_03_courtyard_alley');
      const d2 = dropManager.spawnDrop('item_module_casing', { x: 1, y: 2 }, 'zone_03_courtyard_alley');
      const d3 = dropManager.spawnDrop('item_module_camera', { x: 1, y: 3 }, 'zone_03_courtyard_alley');
      const d4 = dropManager.spawnDrop('item_module_battery', { x: 1, y: 4 }, 'zone_03_courtyard_alley');

      let availableInventorySlots = 1; // Only 1 slot available initially

      const inventoryConsumer = () => {
        if (availableInventorySlots > 0) {
          availableInventorySlots--;
          return true;
        }
        return false;
      };

      // Try picking up d1: succeeds
      expect(dropManager.collectDrop(d1.id, inventoryConsumer)).toBe(true);
      expect(dropManager.getDrops()).toHaveLength(3);

      // Try picking up d2: fails (no space left)
      expect(dropManager.collectDrop(d2.id, inventoryConsumer)).toBe(false);
      expect(dropManager.getDrops()).toHaveLength(3);

      // Free up 2 slots
      availableInventorySlots = 2;

      // Pick up d2 and d4
      expect(dropManager.collectDrop(d2.id, inventoryConsumer)).toBe(true);
      expect(dropManager.collectDrop(d4.id, inventoryConsumer)).toBe(true);
      expect(dropManager.getDrops()).toHaveLength(1);
      expect(dropManager.getDrops()[0]?.id).toBe(d3.id);
    });

    it('STRESS-DIS-04: drop volume stress fuzzing with 100 concurrent drops and unique IDs', () => {
      const dropIds = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const drop = dropManager.spawnDrop(`item_test_${i}`, { x: i, y: i * 2 }, 'zone_03_courtyard_alley');
        expect(dropIds.has(drop.id)).toBe(false);
        dropIds.add(drop.id);
      }

      expect(dropManager.getDrops()).toHaveLength(100);
      expect(dropIds.size).toBe(100);

      // Batch collect 50 drops
      const dropsList = dropManager.getDrops();
      for (let i = 0; i < 50; i++) {
        const targetDrop = dropsList[0];
        if (targetDrop) {
          expect(dropManager.collectDrop(targetDrop.id, () => true)).toBe(true);
        }
      }

      expect(dropManager.getDrops()).toHaveLength(50);
    });

    it('STRESS-DIS-05: full round-trip serialization of ground drops with coordinates and zones', () => {
      dropManager.spawnDrop('item_module_camera', { x: 12.34, y: 56.78 }, 'zone_02_deans_basement');
      dropManager.spawnDrop('item_module_wheels', { x: -3.14, y: 0.0 }, 'zone_07_cable_tunnel');

      const serialized = dropManager.serialize();
      expect(serialized).toHaveLength(2);

      const restoredManager = new GroundDropManager();
      restoredManager.deserialize(serialized);

      const restoredDrops = restoredManager.getDrops();
      expect(restoredDrops).toHaveLength(2);
      expect(restoredDrops[0]?.itemId).toBe('item_module_camera');
      expect(restoredDrops[0]?.position.x).toBeCloseTo(12.34);
      expect(restoredDrops[0]?.position.y).toBeCloseTo(56.78);
      expect(restoredDrops[0]?.zone).toBe('zone_02_deans_basement');

      expect(restoredDrops[1]?.itemId).toBe('item_module_wheels');
      expect(restoredDrops[1]?.position.x).toBeCloseTo(-3.14);
      expect(restoredDrops[1]?.zone).toBe('zone_07_cable_tunnel');
    });
  });

  // =========================================================================
  // 3. Keypad Passcode Puzzle Stress Tests
  // =========================================================================
  describe('3. Keypad Passcode Puzzle Stress Tests', () => {
    let keypad: KeypadPuzzleSystem;

    beforeEach(() => {
      keypad = new KeypadPuzzleSystem();
    });

    it('STRESS-KEY-01: unlocks on 1984 and remains permanently unlocked regardless of subsequent inputs', () => {
      keypad.inputDigit(1);
      keypad.inputDigit(9);
      keypad.inputDigit(8);
      const res = keypad.inputDigit(4);

      expect(res).toEqual({ buffer: '1984', success: true });
      expect(keypad.isUnlocked()).toBe(true);

      // Attempt additional inputs after unlock
      for (let i = 0; i < 10; i++) {
        const extra = keypad.inputDigit(i);
        expect(extra.success).toBe(true);
        expect(extra.error).toBeUndefined();
        expect(keypad.isUnlocked()).toBe(true);
      }
    });

    it('STRESS-KEY-02: fuzzing invalid inputs (negative, floats, NaN, Infinity, out of bounds)', () => {
      const invalidInputs = [-1, -999, 1.5, 0.1, 9.99, NaN, Infinity, -Infinity, 10, 42, 100];

      for (const invalid of invalidInputs) {
        const res = keypad.inputDigit(invalid);
        expect(res.error).toBe(true);
        expect(res.buffer).toBe('');
        expect(keypad.isUnlocked()).toBe(false);
      }

      // Valid digit after fuzzing starts clean
      const valid = keypad.inputDigit(1);
      expect(valid.error).toBeUndefined();
      expect(valid.buffer).toBe('1');
    });

    it('STRESS-KEY-03: incorrect 4-digit code auto-clears internal buffer immediately', () => {
      // Enter wrong code: 0000
      keypad.inputDigit(0);
      keypad.inputDigit(0);
      keypad.inputDigit(0);
      const res0 = keypad.inputDigit(0);
      expect(res0.error).toBe(true);
      expect(res0.buffer).toBe('0000');
      expect(keypad.getBuffer()).toBe(''); // Internal buffer reset
      expect(keypad.isUnlocked()).toBe(false);

      // Enter another wrong code: 9999
      keypad.inputDigit(9);
      keypad.inputDigit(9);
      keypad.inputDigit(9);
      const res9 = keypad.inputDigit(9);
      expect(res9.error).toBe(true);
      expect(res9.buffer).toBe('9999');
      expect(keypad.getBuffer()).toBe(''); // Internal buffer reset

      // Now enter correct code: 1984
      keypad.inputDigit(1);
      keypad.inputDigit(9);
      keypad.inputDigit(8);
      const resOk = keypad.inputDigit(4);
      expect(resOk.success).toBe(true);
      expect(resOk.error).toBeUndefined();
      expect(keypad.isUnlocked()).toBe(true);
    });

    it('STRESS-KEY-04: clear() behavior on empty buffer, mid-input, and post-unlock', () => {
      // Clear on empty buffer
      keypad.clear();
      expect(keypad.getBuffer()).toBe('');

      // Mid-input clear
      keypad.inputDigit(1);
      keypad.inputDigit(9);
      expect(keypad.getBuffer()).toBe('19');
      keypad.clear();
      expect(keypad.getBuffer()).toBe('');

      // Unlock
      keypad.inputDigit(1);
      keypad.inputDigit(9);
      keypad.inputDigit(8);
      keypad.inputDigit(4);
      expect(keypad.isUnlocked()).toBe(true);

      // Clear after unlock MUST NOT re-lock the door or erase buffer
      keypad.clear();
      expect(keypad.isUnlocked()).toBe(true);
      expect(keypad.getBuffer()).toBe('1984');
    });

    it('STRESS-KEY-05: custom codes and length clamping', () => {
      const customKeypad = new KeypadPuzzleSystem({
        targetCode: '042',
        maxDigits: 3,
      });

      customKeypad.inputDigit(0);
      customKeypad.inputDigit(4);
      const unlock = customKeypad.inputDigit(2);

      expect(unlock.success).toBe(true);
      expect(customKeypad.isUnlocked()).toBe(true);
    });
  });

  // =========================================================================
  // 4. Switchboard Repair Puzzle Stress Tests
  // =========================================================================
  describe('4. Switchboard Repair Puzzle Stress Tests', () => {
    let inventory: Set<string>;
    let switchboard: SwitchboardPuzzleSystem;

    beforeEach(() => {
      inventory = new Set(['item_module_battery']);
      switchboard = new SwitchboardPuzzleSystem({
        inventoryChecker: (id) => inventory.has(id),
      });
    });

    it('STRESS-SW-01: out-of-order permutation: Reboot -> Isolate -> Insert -> Reboot', () => {
      // Step 3 prematurely
      const reboot1 = switchboard.rebootGrid();
      expect(reboot1.success).toBe(false);
      expect(reboot1.powerRestored).toBe(false);
      expect(reboot1.message).toContain('Circuit breaker tripped');

      // Step 1
      const isolate = switchboard.isolateLine();
      expect(isolate.success).toBe(true);

      // Step 3 prematurely again (isolated but no fuse)
      const reboot2 = switchboard.rebootGrid();
      expect(reboot2.success).toBe(false);
      expect(reboot2.powerRestored).toBe(false);
      expect(reboot2.message).toContain('Circuit breaker tripped');

      // Step 2
      const insert = switchboard.insertFuse('item_module_battery');
      expect(insert.success).toBe(true);

      // Step 3 correctly
      const reboot3 = switchboard.rebootGrid();
      expect(reboot3.success).toBe(true);
      expect(reboot3.powerRestored).toBe(true);
      expect(switchboard.getState().isComplete).toBe(true);
    });

    it('STRESS-SW-02: out-of-order permutation: Insert -> Isolate -> Reboot', () => {
      // Step 2 prematurely: arcing residual voltage warning
      const insertFail = switchboard.insertFuse('item_module_battery');
      expect(insertFail.success).toBe(false);
      expect(insertFail.message).toContain('residual voltage');
      expect(switchboard.getState().fuseInserted).toBe(false);

      // Reboot prematurely
      const rebootFail = switchboard.rebootGrid();
      expect(rebootFail.success).toBe(false);
      expect(rebootFail.powerRestored).toBe(false);

      // Now do Step 1
      const isolate = switchboard.isolateLine();
      expect(isolate.success).toBe(true);

      // Now Step 2 succeeds
      const insertOk = switchboard.insertFuse('item_module_battery');
      expect(insertOk.success).toBe(true);

      // Step 3 succeeds
      const rebootOk = switchboard.rebootGrid();
      expect(rebootOk.success).toBe(true);
      expect(rebootOk.powerRestored).toBe(true);
    });

    it('STRESS-SW-03: missing component rejection when required battery is not in inventory', () => {
      inventory.clear(); // Empty player inventory
      switchboard.isolateLine();

      const insertFail = switchboard.insertFuse('item_module_battery');
      expect(insertFail.success).toBe(false);
      expect(insertFail.message).toContain('Required component missing');
      expect(switchboard.getState().fuseInserted).toBe(false);

      // Reboot should still fail
      const rebootFail = switchboard.rebootGrid();
      expect(rebootFail.success).toBe(false);
      expect(rebootFail.powerRestored).toBe(false);

      // Player acquires battery
      inventory.add('item_module_battery');
      const insertOk = switchboard.insertFuse('item_module_battery');
      expect(insertOk.success).toBe(true);

      const rebootOk = switchboard.rebootGrid();
      expect(rebootOk.success).toBe(true);
      expect(rebootOk.powerRestored).toBe(true);
    });

    it('STRESS-SW-04: multiple duplicate calls at every step are strictly idempotent', () => {
      // 5 line isolation calls
      for (let i = 0; i < 5; i++) {
        expect(switchboard.isolateLine().success).toBe(true);
      }
      expect(switchboard.getState().lineIsolated).toBe(true);

      // Insert fuse
      expect(switchboard.insertFuse('item_module_battery').success).toBe(true);

      // 5 grid reboot calls
      for (let i = 0; i < 5; i++) {
        const reboot = switchboard.rebootGrid();
        expect(reboot.success).toBe(true);
        expect(reboot.powerRestored).toBe(true);
        expect(switchboard.getState().isComplete).toBe(true);
      }
    });

    it('STRESS-SW-05: power restoration event callback fires exactly once upon completion', () => {
      let callbackCount = 0;
      const cbSwitchboard = new SwitchboardPuzzleSystem({
        inventoryChecker: () => true,
        onPowerRestored: () => {
          callbackCount++;
        },
      });

      cbSwitchboard.isolateLine();
      cbSwitchboard.insertFuse('item_module_battery');
      cbSwitchboard.rebootGrid();

      expect(callbackCount).toBe(1);

      // Subsequent reboots do not re-trigger callback
      cbSwitchboard.rebootGrid();
      cbSwitchboard.rebootGrid();
      expect(callbackCount).toBe(1);
    });

    it('STRESS-SW-06: insulating tape requirement and inventory consumption', () => {
      let consumedTape = false;
      const tapeSwitchboard = new SwitchboardPuzzleSystem({
        requireTapeForIsolation: true,
        inventoryChecker: (id) => id === 'item_insulating_tape',
        inventoryConsumer: (id) => {
          if (id === 'item_insulating_tape') consumedTape = true;
          return true;
        },
      });

      // Without tape: fails
      const failWithoutTape = new SwitchboardPuzzleSystem({
        requireTapeForIsolation: true,
        inventoryChecker: () => false,
      }).isolateLine();
      expect(failWithoutTape.success).toBe(false);
      expect(failWithoutTape.message).toContain('Required component missing: insulating tape');

      // With tape: succeeds and consumes
      const successWithTape = tapeSwitchboard.isolateLine();
      expect(successWithTape.success).toBe(true);
      expect(consumedTape).toBe(true);
    });
  });

  // =========================================================================
  // 5. CampaignDriver Combined Integration Stress
  // =========================================================================
  describe('5. CampaignDriver Integration Stress Tests', () => {
    let driver: CampaignDriver;

    beforeEach(() => {
      driver = createCampaignDriver();
    });

    it('STRESS-DRIVER-01: end-to-end multi-puzzle boundary chain in single campaign flow', () => {
      // 1. Keypad: wrong code fails then 1984 succeeds
      driver.keypad.inputDigit(9);
      driver.keypad.inputDigit(9);
      driver.keypad.inputDigit(9);
      expect(driver.keypad.inputDigit(9).error).toBe(true);

      driver.keypad.inputDigit(1);
      driver.keypad.inputDigit(9);
      driver.keypad.inputDigit(8);
      expect(driver.keypad.inputDigit(4).success).toBe(true);
      expect(driver.keypad.isUnlocked()).toBe(true);

      // 2. Debugger: Dissipation when firing without aim
      const diss = driver.debugger.firePulse();
      expect(diss.hit).toBe(false);
      expect(diss.error).toBe('Pulse dissipated into open space');

      // 3. Debugger: Friendly fire blocked on Professor
      driver.debugger.aimAt('professor_npc');
      const ff = driver.debugger.firePulse();
      expect(ff.hit).toBe(false);
      expect(ff.error).toBe('Target is not an infected device');

      // 4. Debugger: Disassemble Blocker Bot
      driver.debugger.aimAt('blocker_bot_01');
      const pulse = driver.debugger.firePulse();
      expect(pulse.hit).toBe(true);
      expect(pulse.disassembledModules).toEqual([
        'item_module_wheels',
        'item_module_casing',
        'item_module_camera',
        'item_module_battery',
      ]);

      // 5. Re-firing at blocker bot is blocked
      driver.debugger.aimAt('blocker_bot_01');
      const rePulse = driver.debugger.firePulse();
      expect(rePulse.hit).toBe(false);
      expect(rePulse.error).toBe('Target is already deactivated');

      // 6. Switchboard: premature reboot fails
      expect(driver.switchboard.rebootGrid().success).toBe(false);

      // 7. Switchboard: premature fuse insertion fails
      expect(driver.switchboard.insertFuse('item_module_battery').success).toBe(false);

      // 8. Switchboard: correct sequence with battery from disassembly
      for (const mod of pulse.disassembledModules!) {
        driver.addItem(mod, 1);
      }
      expect(driver.hasItem('item_module_battery')).toBe(true);

      expect(driver.switchboard.isolateLine().success).toBe(true);
      expect(driver.switchboard.insertFuse('item_module_battery').success).toBe(true);
      const reboot = driver.switchboard.rebootGrid();
      expect(reboot.success).toBe(true);
      expect(reboot.powerRestored).toBe(true);
      expect(driver.switchboard.getState().isComplete).toBe(true);
    });
  });
});

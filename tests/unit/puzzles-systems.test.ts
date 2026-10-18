/**
 * Unit Test Suite: Milestone 3 Puzzle & Interaction Systems
 * Tests all 6 puzzle subsystems, ground drop manager, and aggregate exports:
 * - ImpulseDebuggerSystem & GroundDropManager
 * - KeypadPuzzleSystem
 * - SwitchboardPuzzleSystem
 * - CCTVSystem
 * - JammerSystem
 * - ServerRecoveryProtocolSystem (Vault Door & Central Console)
 * - PuzzleSystems aggregate module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ImpulseDebuggerSystem,
  GroundDropManager,
  KeypadPuzzleSystem,
  SwitchboardPuzzleSystem,
  CCTVSystem,
  JammerSystem,
  ServerRecoveryProtocolSystem,
  ServerVaultDoorController,
  CentralServerConsoleController,
} from '@/game/systems/PuzzleSystems';
import type { IQuestEngine, IDialogueEngine, DialogueNode } from '@/types/campaign';

describe('Milestone 3 Puzzle & Interaction Systems', () => {
  // ==========================================
  // 1. ImpulseDebuggerSystem & GroundDropManager
  // ==========================================
  describe('1. ImpulseDebuggerSystem & GroundDropManager', () => {
    let debuggerSystem: ImpulseDebuggerSystem;

    beforeEach(() => {
      debuggerSystem = new ImpulseDebuggerSystem();
    });

    it('pre-registers default campaign targets in range', () => {
      expect(debuggerSystem.getTarget('blocker_bot_01')).not.toBeNull();
      expect(debuggerSystem.getTarget('robo_dog_01')).not.toBeNull();
      expect(debuggerSystem.getTarget('professor_npc')).not.toBeNull();
      expect(debuggerSystem.getTarget('jammer_antenna_01')).not.toBeNull();
    });

    it('successfully aims at a target in range', () => {
      expect(debuggerSystem.aimAt('blocker_bot_01')).toBe(true);
      expect(debuggerSystem.getAimedTargetId()).toBe('blocker_bot_01');
    });

    it('rejects aiming at non-existent target', () => {
      expect(debuggerSystem.aimAt('non_existent_target')).toBe(false);
      expect(debuggerSystem.getAimedTargetId()).toBeNull();
    });

    it('rejects aiming at target explicitly registered as out of range', () => {
      debuggerSystem.registerTarget('far_droid', 'robot', false);
      expect(debuggerSystem.aimAt('far_droid')).toBe(false);
      expect(debuggerSystem.getAimedTargetId()).toBeNull();
    });

    it('calculates Euclidean distance against effective range (4.5m)', () => {
      debuggerSystem.setPlayerPosition({ x: 0, y: 0 });
      debuggerSystem.registerTarget('bot_near', 'robot', undefined as any, {
        position: { x: 3.0, y: 3.0 }, // ~4.24m <= 4.5m
      });
      debuggerSystem.registerTarget('bot_far', 'robot', undefined as any, {
        position: { x: 4.0, y: 4.0 }, // ~5.66m > 4.5m
      });

      expect(debuggerSystem.aimAt('bot_near')).toBe(true);
      expect(debuggerSystem.aimAt('bot_far')).toBe(false);
    });

    it('respects line-of-sight checks when LOS checker is provided', () => {
      debuggerSystem.setLineOfSightChecker((_from, to) => to.x <= 5.0);
      debuggerSystem.registerTarget('bot_visible', 'robot', undefined as any, {
        position: { x: 2.0, y: 2.0 },
      });
      debuggerSystem.registerTarget('bot_occluded', 'robot', undefined as any, {
        position: { x: 8.0, y: 2.0 },
      });

      expect(debuggerSystem.aimAt('bot_visible')).toBe(true);
      expect(debuggerSystem.aimAt('bot_occluded')).toBe(false);
    });

    it('dissipates into open space when firing without an aimed target', () => {
      const result = debuggerSystem.firePulse();
      expect(result.hit).toBe(false);
      expect(result.error).toBe('Pulse dissipated into open space');
    });

    it('clears aim lock on firing, causing subsequent shot to dissipate', () => {
      debuggerSystem.aimAt('blocker_bot_01');
      const shot1 = debuggerSystem.firePulse();
      expect(shot1.hit).toBe(true);

      const shot2 = debuggerSystem.firePulse();
      expect(shot2.hit).toBe(false);
      expect(shot2.error).toBe('Pulse dissipated into open space');
    });

    it('activates friendly fire safety interlock against Professor NPC', () => {
      let buzzTriggered = false;
      debuggerSystem.onFriendlyFireBlocked(() => {
        buzzTriggered = true;
      });

      expect(debuggerSystem.aimAt('professor_npc')).toBe(true);
      const result = debuggerSystem.firePulse();

      expect(result.hit).toBe(false);
      expect(result.error).toBe('Target is not an infected device');
      expect(buzzTriggered).toBe(true);
      expect(debuggerSystem.getTarget('professor_npc')?.deactivated).toBe(false);
    });

    it('prevents firing at already deactivated robots', () => {
      debuggerSystem.aimAt('blocker_bot_01');
      debuggerSystem.firePulse();

      debuggerSystem.aimAt('blocker_bot_01');
      const secondPulse = debuggerSystem.firePulse();
      expect(secondPulse.hit).toBe(false);
      expect(secondPulse.error).toBe('Target is already deactivated');
    });

    it('disassembles Blocker Bot into exact 4 constituent modules in canonical order', () => {
      debuggerSystem.aimAt('blocker_bot_01');
      const result = debuggerSystem.firePulse();

      expect(result.hit).toBe(true);
      expect(result.targetId).toBe('blocker_bot_01');
      expect(result.disassembledModules).toEqual([
        'item_module_wheels',
        'item_module_casing',
        'item_module_camera',
        'item_module_battery',
      ]);
    });

    it('disassembles Robo-Dog cleanly into key ring and dog modules', () => {
      debuggerSystem.aimAt('robo_dog_01');
      const result = debuggerSystem.firePulse();

      expect(result.hit).toBe(true);
      expect(result.targetId).toBe('robo_dog_01');
      expect(result.disassembledModules).toEqual(['item_server_keyring', 'item_dog_modules']);
    });

    it('allows unregistering a target and resetting the system', () => {
      expect(debuggerSystem.unregisterTarget('blocker_bot_01')).toBe(true);
      expect(debuggerSystem.getTarget('blocker_bot_01')).toBeNull();

      debuggerSystem.reset();
      expect(debuggerSystem.getTarget('blocker_bot_01')).not.toBeNull();
    });

    describe('GroundDropManager', () => {
      it('spawns and filters ground drops by zone', () => {
        const dropManager = new GroundDropManager();
        dropManager.spawnDrop('item_module_wheels', { x: 5, y: 5 }, 'zone_03_courtyard_alley');
        dropManager.spawnDrop('item_module_battery', { x: 10, y: 10 }, 'zone_04_lab_corridor');

        expect(dropManager.getDrops()).toHaveLength(2);
        expect(dropManager.getDropsByZone('zone_03_courtyard_alley')).toHaveLength(1);
        expect(dropManager.getDropsByZone('zone_04_lab_corridor')).toHaveLength(1);
      });

      it('persists drops when inventory is full and collects when inventory has space', () => {
        const dropManager = new GroundDropManager();
        const drop = dropManager.spawnDrop('item_module_casing', { x: 1, y: 1 }, 'zone_03_courtyard_alley');

        // Inventory full: collection fails, drop remains on ground
        const fullCollect = dropManager.collectDrop(drop.id, () => false);
        expect(fullCollect).toBe(false);
        expect(dropManager.getDrops()).toHaveLength(1);

        // Inventory has space: collection succeeds, drop removed
        const successCollect = dropManager.collectDrop(drop.id, () => true);
        expect(successCollect).toBe(true);
        expect(dropManager.getDrops()).toHaveLength(0);
      });

      it('serializes and deserializes ground drops cleanly', () => {
        const dropManager = new GroundDropManager();
        dropManager.spawnDrop('item_server_keyring', { x: 2, y: 3 }, 'zone_06_winter_garden');
        const serialized = dropManager.serialize();

        const freshManager = new GroundDropManager();
        freshManager.deserialize(serialized);

        expect(freshManager.getDrops()).toHaveLength(1);
        expect(freshManager.getDrops()[0]?.itemId).toBe('item_server_keyring');
        expect(freshManager.getDrops()[0]?.zone).toBe('zone_06_winter_garden');
      });
    });
  });

  // ==========================================
  // 2. KeypadPuzzleSystem
  // ==========================================
  describe('2. KeypadPuzzleSystem', () => {
    let keypad: KeypadPuzzleSystem;

    beforeEach(() => {
      keypad = new KeypadPuzzleSystem();
    });

    it('initializes in locked state with empty buffer', () => {
      expect(keypad.isUnlocked()).toBe(false);
      expect(keypad.getBuffer()).toBe('');
    });

    it('accumulates digits sequentially in buffer', () => {
      expect(keypad.inputDigit(1)).toEqual({ buffer: '1' });
      expect(keypad.inputDigit(9)).toEqual({ buffer: '19' });
      expect(keypad.inputDigit(8)).toEqual({ buffer: '198' });
    });

    it('unlocks electronic door on entering correct founding year code 1984', () => {
      let unlockCalled = false;
      const customKeypad = new KeypadPuzzleSystem({
        onUnlock: (code) => {
          unlockCalled = true;
          expect(code).toBe('1984');
        },
      });

      customKeypad.inputDigit(1);
      customKeypad.inputDigit(9);
      customKeypad.inputDigit(8);
      const res = customKeypad.inputDigit(4);

      expect(res).toEqual({ buffer: '1984', success: true });
      expect(customKeypad.isUnlocked()).toBe(true);
      expect(unlockCalled).toBe(true);
    });

    it('rejects incorrect 4-digit passcode, fires error, and auto-resets buffer', () => {
      let errorReported = '';
      const customKeypad = new KeypadPuzzleSystem({
        onError: (code) => {
          errorReported = code;
        },
      });

      customKeypad.inputDigit(1);
      customKeypad.inputDigit(2);
      customKeypad.inputDigit(3);
      const res = customKeypad.inputDigit(4);

      expect(res).toEqual({ buffer: '1234', error: true });
      expect(errorReported).toBe('1234');
      expect(customKeypad.isUnlocked()).toBe(false);
      expect(customKeypad.getBuffer()).toBe(''); // Auto-reset

      // Next input starts clean
      const nextRes = customKeypad.inputDigit(9);
      expect(nextRes).toEqual({ buffer: '9' });
    });

    it('rejects non-integer, negative, or out-of-range digits', () => {
      expect(keypad.inputDigit(-1)).toEqual({ buffer: '', error: true });
      expect(keypad.inputDigit(1.5)).toEqual({ buffer: '', error: true });
      expect(keypad.inputDigit(10)).toEqual({ buffer: '', error: true });
    });

    it('retains unlocked state idempotently on additional inputs', () => {
      keypad.inputDigit(1);
      keypad.inputDigit(9);
      keypad.inputDigit(8);
      keypad.inputDigit(4);
      expect(keypad.isUnlocked()).toBe(true);

      const extraInput = keypad.inputDigit(5);
      expect(extraInput).toEqual({ buffer: '1984', success: true });
      expect(keypad.isUnlocked()).toBe(true);
    });

    it('clears buffer when locked, but clear does not re-lock when unlocked', () => {
      keypad.inputDigit(1);
      keypad.inputDigit(2);
      expect(keypad.getBuffer()).toBe('12');

      keypad.clear();
      expect(keypad.getBuffer()).toBe('');

      // Unlock
      keypad.inputDigit(1);
      keypad.inputDigit(9);
      keypad.inputDigit(8);
      keypad.inputDigit(4);
      expect(keypad.isUnlocked()).toBe(true);

      keypad.clear();
      expect(keypad.isUnlocked()).toBe(true);
      expect(keypad.getBuffer()).toBe('1984');
    });

    it('serializes and restores state', () => {
      keypad.inputDigit(1);
      keypad.inputDigit(9);
      keypad.inputDigit(8);
      keypad.inputDigit(4);

      const data = keypad.serialize();
      const fresh = new KeypadPuzzleSystem();
      fresh.loadState(data);

      expect(fresh.isUnlocked()).toBe(true);
      expect(fresh.getBuffer()).toBe('1984');
    });
  });

  // ==========================================
  // 3. SwitchboardPuzzleSystem
  // ==========================================
  describe('3. SwitchboardPuzzleSystem', () => {
    let inventory: Set<string>;
    let switchboard: SwitchboardPuzzleSystem;

    beforeEach(() => {
      inventory = new Set(['item_module_battery']);
      switchboard = new SwitchboardPuzzleSystem({
        inventoryChecker: (id) => inventory.has(id),
      });
    });

    it('initializes in unpowered state with 0 steps complete', () => {
      expect(switchboard.getState()).toEqual({
        lineIsolated: false,
        fuseInserted: false,
        gridRebooted: false,
        isComplete: false,
      });
    });

    it('trips circuit breaker if rebootGrid is called prematurely', () => {
      let breakerReason = '';
      const customSwitchboard = new SwitchboardPuzzleSystem({
        onCircuitBreakerTripped: (r) => {
          breakerReason = r;
        },
      });

      const res = customSwitchboard.rebootGrid();
      expect(res.success).toBe(false);
      expect(res.powerRestored).toBe(false);
      expect(res.message).toContain('Circuit breaker tripped');
      expect(breakerReason).toContain('Circuit breaker tripped');

      // Also after step 1 alone
      customSwitchboard.isolateLine();
      const res2 = customSwitchboard.rebootGrid();
      expect(res2.success).toBe(false);
      expect(res2.powerRestored).toBe(false);
    });

    it('warns of residual voltage if fuse is inserted before line isolation', () => {
      let warningFired = false;
      const customSwitchboard = new SwitchboardPuzzleSystem({
        inventoryChecker: () => true,
        onResidualVoltageWarning: () => {
          warningFired = true;
        },
      });

      const res = customSwitchboard.insertFuse('item_module_battery');
      expect(res.success).toBe(false);
      expect(res.message).toContain('residual voltage');
      expect(warningFired).toBe(true);
      expect(customSwitchboard.getState().fuseInserted).toBe(false);
    });

    it('rejects fuse insertion if required fuse is missing from inventory', () => {
      switchboard.isolateLine();
      inventory.delete('item_module_battery');

      const res = switchboard.insertFuse('item_module_battery');
      expect(res.success).toBe(false);
      expect(res.message).toContain('Required component missing');
      expect(switchboard.getState().fuseInserted).toBe(false);
    });

    it('supports insulating tape requirement for line isolation when configured', () => {
      const tapeSwitchboard = new SwitchboardPuzzleSystem({
        requireTapeForIsolation: true,
        inventoryChecker: (id) => id === 'item_insulating_tape',
      });

      // Missing tape
      const failIsolation = new SwitchboardPuzzleSystem({
        requireTapeForIsolation: true,
        inventoryChecker: () => false,
      }).isolateLine();
      expect(failIsolation.success).toBe(false);
      expect(failIsolation.message).toContain('Required component missing: insulating tape');

      // With tape
      const successIsolation = tapeSwitchboard.isolateLine();
      expect(successIsolation.success).toBe(true);
      expect(tapeSwitchboard.getState().lineIsolated).toBe(true);
    });

    it('successfully restores power through strict 3-step sequence', () => {
      let powerCallbackFired = false;
      const customSwitchboard = new SwitchboardPuzzleSystem({
        inventoryChecker: (id) => inventory.has(id),
        onPowerRestored: () => {
          powerCallbackFired = true;
        },
      });

      // Step 1: Isolate Line
      const step1 = customSwitchboard.isolateLine();
      expect(step1.success).toBe(true);
      expect(step1.message).toBe('Line Phase B successfully isolated.');
      expect(customSwitchboard.getState().lineIsolated).toBe(true);

      // Step 2: Insert Fuse
      const step2 = customSwitchboard.insertFuse('item_module_battery');
      expect(step2.success).toBe(true);
      expect(step2.message).toBe('Replacement fuse cartridge inserted.');
      expect(customSwitchboard.getState().fuseInserted).toBe(true);

      // Step 3: Reboot Grid
      const step3 = customSwitchboard.rebootGrid();
      expect(step3.success).toBe(true);
      expect(step3.powerRestored).toBe(true);
      expect(step3.message).toBe('Grid rebooted! Wing power fully restored.');
      expect(customSwitchboard.getState().isComplete).toBe(true);
      expect(powerCallbackFired).toBe(true);
    });

    it('handles duplicate and redundant calls idempotently after completion', () => {
      switchboard.isolateLine();
      switchboard.isolateLine(); // Idempotent
      switchboard.insertFuse('item_module_battery');
      switchboard.rebootGrid();

      expect(switchboard.getState().isComplete).toBe(true);

      const secondReboot = switchboard.rebootGrid();
      expect(secondReboot.success).toBe(true);
      expect(secondReboot.powerRestored).toBe(true);
    });

    it('serializes and deserializes switchboard state', () => {
      switchboard.isolateLine();
      switchboard.insertFuse('item_module_battery');

      const data = switchboard.serialize();
      const fresh = new SwitchboardPuzzleSystem();
      fresh.loadState(data);

      expect(fresh.getState().lineIsolated).toBe(true);
      expect(fresh.getState().fuseInserted).toBe(true);
      expect(fresh.getState().gridRebooted).toBe(false);
    });
  });

  // ==========================================
  // 4. CCTVSystem
  // ==========================================
  describe('4. CCTVSystem', () => {
    let cctv: CCTVSystem;

    beforeEach(() => {
      cctv = new CCTVSystem();
    });

    it('initializes in unpowered and incomplete state', () => {
      expect(cctv.isPowered()).toBe(false);
      expect(cctv.isComplete()).toBe(false);
    });

    it('rejects rewind while terminal is unpowered', () => {
      const res = cctv.rewind(15);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Terminal unpowered');
      expect(cctv.isComplete()).toBe(false);
    });

    it('powers on terminal successfully and toggling off resets readiness', () => {
      expect(cctv.powerTerminal(true)).toBe(true);
      expect(cctv.isPowered()).toBe(true);

      cctv.powerTerminal(false);
      expect(cctv.isPowered()).toBe(false);
      expect(cctv.rewind(15).success).toBe(false);
    });

    it('rejects zero, negative, or invalid minutes safely', () => {
      cctv.powerTerminal(true);
      expect(cctv.rewind(0).success).toBe(false);
      expect(cctv.rewind(-10).success).toBe(false);
      expect(cctv.rewind(NaN).success).toBe(false);
    });

    it('rejects insufficient rewind offset (<10 minutes)', () => {
      cctv.powerTerminal(true);
      const res = cctv.rewind(5);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Incident occurred 15 minutes ago');
      expect(cctv.isComplete()).toBe(false);
    });

    it('reveals Robo-Dog key theft footage and Winter Garden location upon rewinding >= 10m', () => {
      let discoveredResult: any = null;
      const customCctv = new CCTVSystem({
        onFootageDiscovered: (r) => {
          discoveredResult = r;
        },
      });
      customCctv.powerTerminal(true);

      const res = customCctv.rewind(15);
      expect(res.success).toBe(true);
      expect(res.footageId).toBe('cctv_archive_dog_heist');
      expect(res.clueLocation).toBe('zone_06_winter_garden');
      expect(customCctv.isComplete()).toBe(true);
      expect(discoveredResult).toEqual(res);
    });

    it('maintains complete state on subsequent rewinds idempotently', () => {
      cctv.powerTerminal(true);
      cctv.rewind(15);
      expect(cctv.isComplete()).toBe(true);

      const second = cctv.rewind(20);
      expect(second.success).toBe(true);
      expect(cctv.isComplete()).toBe(true);
    });

    it('serializes and restores CCTV state', () => {
      cctv.powerTerminal(true);
      cctv.rewind(15);

      const state = cctv.serialize();
      const fresh = new CCTVSystem();
      fresh.loadState(state);

      expect(fresh.isPowered()).toBe(true);
      expect(fresh.isComplete()).toBe(true);
      expect(fresh.getState().discoveredFootageId).toBe('cctv_archive_dog_heist');
    });
  });

  // ==========================================
  // 5. JammerSystem
  // ==========================================
  describe('5. JammerSystem', () => {
    let jammer: JammerSystem;

    beforeEach(() => {
      jammer = new JammerSystem();
    });

    it('initializes active and undisrupted', () => {
      expect(jammer.isDisabled()).toBe(false);
    });

    it('triggers HUD interference distortion between 3m and 6m', () => {
      const approach5m = jammer.approach(5.0);
      expect(approach5m.status).toBe('hud_distortion');
      expect(approach5m.message).toContain('electromagnetic interference');

      const approach4m = jammer.approach(3.5);
      expect(approach4m.status).toBe('hud_distortion');
    });

    it('triggers physical barrier repulsion field within 3m', () => {
      const approach2m = jammer.approach(2.0);
      expect(approach2m.status).toBe('barrier_repulsion');
      expect(approach2m.message).toContain('repulsion pushes you back');
    });

    it('returns safe status beyond 6m', () => {
      const approach8m = jammer.approach(8.0);
      expect(approach8m.status).toBe('safe');
      expect(approach8m.message).toBeUndefined();
    });

    it('calculates Euclidean distance to transmitter mast', () => {
      const dist = jammer.calculateDistance({ x: 12.0, y: 15.0 });
      expect(dist).toBe(0);
    });

    it('rejects EMP disruption if wrong tool is equipped', () => {
      const res = jammer.disableWithPulse('item_scrap_metal', 1500);
      expect(res.success).toBe(false);
      expect(res.doorsUnlocked).toBe(false);
      expect(res.error).toBe('Impulse Debugger required');
      expect(jammer.isDisabled()).toBe(false);
    });

    it('rejects EMP disruption if charge time is insufficient (<1000ms)', () => {
      const res = jammer.disableWithPulse('item_impulse_debugger', 800);
      expect(res.success).toBe(false);
      expect(res.doorsUnlocked).toBe(false);
      expect(res.error).toBe('Insufficient charge time');
      expect(jammer.isDisabled()).toBe(false);
    });

    it('disables jammer and unlocks doors with Impulse Debugger and >=1000ms charge', () => {
      let disruptedCalled = false;
      const customJammer = new JammerSystem({
        onDisrupted: () => {
          disruptedCalled = true;
        },
      });

      const res = customJammer.disableWithPulse('item_impulse_debugger', 1200);
      expect(res.success).toBe(true);
      expect(res.doorsUnlocked).toBe(true);
      expect(customJammer.isDisabled()).toBe(true);
      expect(disruptedCalled).toBe(true);

      // Approaching disabled mast is safe at any distance
      const safeCheck = customJammer.approach(1.0);
      expect(safeCheck.status).toBe('safe');
      expect(safeCheck.message).toContain('Path clear');
    });

    it('handles redundant disable calls idempotently without re-enabling', () => {
      jammer.disableWithPulse('item_impulse_debugger', 1500);
      expect(jammer.isDisabled()).toBe(true);

      const second = jammer.disableWithPulse('item_impulse_debugger', 1500);
      expect(second.success).toBe(true);
      expect(second.doorsUnlocked).toBe(true);
      expect(jammer.isDisabled()).toBe(true);
    });

    it('serializes and deserializes jammer state', () => {
      jammer.disableWithPulse('item_impulse_debugger', 1500);
      const data = jammer.serialize();

      const fresh = new JammerSystem();
      fresh.loadState(data);
      expect(fresh.isDisabled()).toBe(true);
    });
  });

  // ==========================================
  // 6. ServerRecoveryProtocolSystem (Vault Door & Console)
  // ==========================================
  describe('6. ServerRecoveryProtocolSystem', () => {
    describe('ServerVaultDoorController', () => {
      let door: ServerVaultDoorController;

      beforeEach(() => {
        door = new ServerVaultDoorController();
      });

      it('initializes in locked state', () => {
        expect(door.isUnlocked()).toBe(false);
      });

      it('rejects digital/keyless access and requires master brass key ring', () => {
        const fakeInventory = {
          hasItem: (id: string) => id === 'item_module_casing' || id === 'item_module_battery',
        };

        const res = door.attemptUnlock(fakeInventory);
        expect(res.success).toBe(false);
        expect(res.error).toContain('Master brass keys required');
        expect(door.isUnlocked()).toBe(false);
      });

      it('unlocks successfully when player possesses item_server_keyring', () => {
        const validInventory = {
          hasItem: (id: string) => id === 'item_server_keyring',
        };

        const res = door.attemptUnlock(validInventory);
        expect(res.success).toBe(true);
        expect(door.isUnlocked()).toBe(true);
      });

      it('handles redundant unlocks idempotently without key consumption', () => {
        const validInventory = {
          hasItem: (id: string) => id === 'item_server_keyring',
        };

        door.attemptUnlock(validInventory);
        expect(door.isUnlocked()).toBe(true);

        const res2 = door.attemptUnlock(validInventory);
        expect(res2.success).toBe(true);
        expect(door.isUnlocked()).toBe(true);
      });

      it('serializes and deserializes door state', () => {
        const validInventory = {
          hasItem: (id: string) => id === 'item_server_keyring',
        };
        door.attemptUnlock(validInventory);

        const saved = door.serialize();
        const fresh = new ServerVaultDoorController();
        fresh.loadState(saved);
        expect(fresh.isUnlocked()).toBe(true);
      });
    });

    describe('CentralServerConsoleController', () => {
      let mockQuestEngine: IQuestEngine;
      let mockDialogueEngine: IDialogueEngine;
      let consoleCtrl: CentralServerConsoleController;

      beforeEach(() => {
        mockQuestEngine = {
          getActiveQuest: vi.fn(),
          startQuest: vi.fn().mockReturnValue(true),
          completeObjective: vi.fn().mockReturnValue(true),
          completeQuest: vi.fn().mockReturnValue(true),
          isQuestCompleted: vi.fn().mockReturnValue(true),
          selectEnding: vi.fn().mockImplementation((choice: 'A' | 'B' | 'C') => {
            if (choice === 'A') return 'quest_14_finale_ideal';
            return 'quest_15_finale_pragmatic';
          }),
          getState: vi.fn().mockReturnValue({}),
          loadState: vi.fn(),
        };

        mockDialogueEngine = {
          startDialogue: vi.fn(),
          advance: vi.fn(),
          selectOption: vi.fn(),
          getCurrentNode: vi.fn().mockReturnValue({
            id: 'node_console_select',
            speaker: 'console',
            textRu: 'Выберите финальный вектор',
            textEn: 'Select final vector',
            options: [
              { id: 'opt_a', labelRu: 'Полная перепрошивка (А)', labelEn: 'Full Reflash (A)', nextNodeId: 'node_ending_a' },
              { id: 'opt_b', labelRu: 'Аварийный сброс (Б)', labelEn: 'Emergency Reset (B)', nextNodeId: 'node_ending_b' },
              { id: 'opt_c', labelRu: 'Автономный карантин (В)', labelEn: 'Autonomous Quarantine (C)', nextNodeId: 'node_ending_b' },
            ],
          } as unknown as DialogueNode),
          isActive: vi.fn().mockReturnValue(true),
        } as unknown as IDialogueEngine;

        consoleCtrl = new CentralServerConsoleController({
          questEngine: mockQuestEngine,
          dialogueEngine: mockDialogueEngine,
        });
      });

      it('boots holographic terminal and triggers dialogue tree', () => {
        const boot = consoleCtrl.bootConsole();
        expect(boot.success).toBe(true);
        expect(boot.dialogueStarted).toBe(true);
        expect(mockDialogueEngine.startDialogue).toHaveBeenCalledWith('console_protocol_q13');
      });

      it('reports pinned status while selection options are pending', () => {
        expect(consoleCtrl.isPinned()).toBe(true);
      });

      it('rejects invalid option index outside [0, 2]', () => {
        const invalidUnder = consoleCtrl.selectProtocol(-1);
        expect(invalidUnder.success).toBe(false);
        expect(invalidUnder.error).toContain('Invalid option index');

        const invalidOver = consoleCtrl.selectProtocol(3);
        expect(invalidOver.success).toBe(false);
      });

      it('routes Option 0 (A) to quest_14_finale_ideal', () => {
        const res = consoleCtrl.selectProtocol(0);
        expect(res.success).toBe(true);
        expect(res.endingBranch).toBe('quest_14_finale_ideal');
        expect(consoleCtrl.getSelectedProtocol()).toBe('A');
        expect(consoleCtrl.isCompleted()).toBe(true);
        expect(mockQuestEngine.selectEnding).toHaveBeenCalledWith('A');
        expect(mockDialogueEngine.selectOption).toHaveBeenCalledWith(0);
      });

      it('routes Option 1 (B) to quest_15_finale_pragmatic', () => {
        const res = consoleCtrl.selectProtocol(1);
        expect(res.success).toBe(true);
        expect(res.endingBranch).toBe('quest_15_finale_pragmatic');
        expect(consoleCtrl.getSelectedProtocol()).toBe('B');
        expect(mockQuestEngine.selectEnding).toHaveBeenCalledWith('B');
      });

      it('routes Option 2 (C) to quest_15_finale_pragmatic', () => {
        const res = consoleCtrl.selectProtocol(2);
        expect(res.success).toBe(true);
        expect(res.endingBranch).toBe('quest_15_finale_pragmatic');
        expect(consoleCtrl.getSelectedProtocol()).toBe('C');
        expect(mockQuestEngine.selectEnding).toHaveBeenCalledWith('C');
      });
    });

    describe('ServerRecoveryProtocolSystem Facade', () => {
      it('coordinates both door unlock and console selection', () => {
        const system = new ServerRecoveryProtocolSystem();
        expect(system.isDoorUnlocked()).toBe(false);

        const inventory = { hasItem: (id: string) => id === 'item_server_keyring' };
        system.attemptUnlock(inventory);
        expect(system.isDoorUnlocked()).toBe(true);

        const boot = system.bootConsole();
        expect(boot.success).toBe(true);

        const res = system.selectProtocol(0);
        expect(res.success).toBe(true);
        expect(res.endingBranch).toBe('quest_14_finale_ideal');
        expect(system.getSelectedProtocol()).toBe('A');
      });
    });
  });
});

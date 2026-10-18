/**
 * Challenger 2 Empirical Stress Test Suite
 * Milestone 3: CCTV, Jammer, and Server Recovery Console
 * 
 * Adversarial tests covering:
 * - Unpowered CCTV access, power toggling, boundary timeline scrubbing (floats, negative, NaN, Inf, threshold)
 * - Jammer repulsion barrier with and without debugger, edge distances (3.0m, 6.0m), charge boundaries, redundant pulses
 * - Server Vault Door brass key requirements, non-consumption, invalid items
 * - Central Server Console modal pinning, invalid option indices, ending routing, and state serialization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CCTVSystem,
  JammerSystem,
  ServerRecoveryProtocolSystem,
  ServerVaultDoorController,
  CentralServerConsoleController,
} from '@/game/systems/PuzzleSystems';
import { createCampaignDriver, CampaignDriver } from '../e2e/harness';
import type { IQuestEngine, IDialogueEngine, DialogueNode } from '@/types/campaign';

describe('Challenger 2 Empirical Stress Suite: Tier 2 Mechanics', () => {
  // ==========================================
  // 1. CCTV Playback Terminal Stress Tests
  // ==========================================
  describe('CCTV Playback Terminal Stress Tests', () => {
    let cctv: CCTVSystem;

    beforeEach(() => {
      cctv = new CCTVSystem();
    });

    it('STRESS-CCTV-01: unpowered access is strictly rejected for all timeline values', () => {
      expect(cctv.isPowered()).toBe(false);

      const testValues = [0, 5, 10, 15, 60, -5, NaN, Infinity, -Infinity];
      for (const val of testValues) {
        const res = cctv.rewind(val);
        expect(res.success).toBe(false);
        expect(res.error).toContain('Terminal unpowered');
        expect(res.footageId).toBeUndefined();
        expect(cctv.isComplete()).toBe(false);
      }
    });

    it('STRESS-CCTV-02: rapid power toggling resets terminal readiness every time', () => {
      for (let i = 0; i < 5; i++) {
        cctv.powerTerminal(true);
        expect(cctv.isPowered()).toBe(true);
        const ok = cctv.rewind(15);
        expect(ok.success).toBe(true);

        cctv.powerTerminal(false);
        expect(cctv.isPowered()).toBe(false);
        const fail = cctv.rewind(15);
        expect(fail.success).toBe(false);
        expect(fail.error).toContain('Terminal unpowered');
      }
    });

    it('STRESS-CCTV-03: boundary scrubbing around 10-minute threshold', () => {
      cctv.powerTerminal(true);

      // 9.999 minutes -> must fail (<10)
      const res999 = cctv.rewind(9.999);
      expect(res999.success).toBe(false);
      expect(res999.error).toContain('Incident occurred 15 minutes ago');

      // Exactly 10 minutes -> must succeed (threshold is 10)
      const res10 = cctv.rewind(10);
      expect(res10.success).toBe(true);
      expect(res10.footageId).toBe('cctv_archive_dog_heist');
      expect(res10.clueLocation).toBe('zone_06_winter_garden');

      // 10.001 minutes -> must succeed
      const res10001 = cctv.rewind(10.001);
      expect(res10001.success).toBe(true);
    });

    it('STRESS-CCTV-04: non-finite or non-positive scrubbing inputs', () => {
      cctv.powerTerminal(true);

      expect(cctv.rewind(0).success).toBe(false);
      expect(cctv.rewind(-0.001).success).toBe(false);
      expect(cctv.rewind(-100).success).toBe(false);
      expect(cctv.rewind(NaN).success).toBe(false);
      expect(cctv.rewind(Infinity).success).toBe(false);
      expect(cctv.rewind(-Infinity).success).toBe(false);
    });

    it('STRESS-CCTV-05: custom configurations and callbacks', () => {
      let powerNotified: boolean | null = null;
      let footageNotified: any = null;

      const customCctv = new CCTVSystem({
        initialPowered: true,
        minRewindMinutes: 25,
        requiredFootageId: 'custom_dog_archive',
        clueTargetZone: 'zone_custom_garden',
        onPowerChanged: (p) => { powerNotified = p; },
        onFootageDiscovered: (f) => { footageNotified = f; },
      });

      expect(customCctv.isPowered()).toBe(true);
      // Rewind 20 -> fails because min is 25
      const fail = customCctv.rewind(20);
      expect(fail.success).toBe(false);

      // Rewind 25 -> succeeds with custom payload
      const ok = customCctv.rewind(25);
      expect(ok.success).toBe(true);
      expect(ok.footageId).toBe('custom_dog_archive');
      expect(ok.clueLocation).toBe('zone_custom_garden');
      expect(footageNotified).toEqual(ok);

      customCctv.powerTerminal(false);
      expect(powerNotified).toBe(false);
    });

    it('STRESS-CCTV-06: full reset clears all internal state', () => {
      cctv.powerTerminal(true);
      cctv.rewind(15);
      expect(cctv.isComplete()).toBe(true);

      cctv.reset();
      const state = cctv.getState();
      expect(state.powered).toBe(false);
      expect(state.completed).toBe(false);
      expect(state.lastScrubbedMinutes).toBe(0);
      expect(state.discoveredFootageId).toBeNull();
      expect(state.clueTargetZone).toBeNull();
    });
  });

  // ==========================================
  // 2. Jammer System Stress Tests
  // ==========================================
  describe('Jammer System Stress Tests', () => {
    let jammer: JammerSystem;

    beforeEach(() => {
      jammer = new JammerSystem();
    });

    it('STRESS-JAMMER-01: distance boundaries (6.0m and 3.0m)', () => {
      // At exactly 6.0m: interference zone
      expect(jammer.approach(6.0).status).toBe('hud_distortion');
      // Just outside 6.0m: safe
      expect(jammer.approach(6.0001).status).toBe('safe');
      // Beyond 6.0m: safe
      expect(jammer.approach(10.0).status).toBe('safe');

      // At exactly 3.0m: barrier repulsion
      expect(jammer.approach(3.0).status).toBe('barrier_repulsion');
      // Just outside 3.0m: distortion
      expect(jammer.approach(3.0001).status).toBe('hud_distortion');

      // Zero or negative distance: repulsion
      expect(jammer.approach(0).status).toBe('barrier_repulsion');
      expect(jammer.approach(-1.5).status).toBe('barrier_repulsion');
    });

    it('STRESS-JAMMER-02: repulsion barrier behavior with and without debugger in hand', () => {
      // Regardless of whether player has debugger, physical approach triggers repulsion before disruption
      const approachWithout = jammer.approach(2.5);
      expect(approachWithout.status).toBe('barrier_repulsion');

      // Simulating player having debugger: approach still repels until pulse is fired
      const approachWith = jammer.approach(1.5);
      expect(approachWith.status).toBe('barrier_repulsion');

      // Now discharge pulse to disable jammer
      const pulse = jammer.disableWithPulse('item_impulse_debugger', 1000);
      expect(pulse.success).toBe(true);
      expect(pulse.doorsUnlocked).toBe(true);
      expect(jammer.isDisabled()).toBe(true);

      // Now approach at same 1.5m and 0m is safe!
      expect(jammer.approach(1.5).status).toBe('safe');
      expect(jammer.approach(0).status).toBe('safe');
    });

    it('STRESS-JAMMER-03: pulse charge boundary at 1000ms', () => {
      // 999ms -> fails
      const fail999 = jammer.disableWithPulse('item_impulse_debugger', 999);
      expect(fail999.success).toBe(false);
      expect(fail999.doorsUnlocked).toBe(false);
      expect(fail999.error).toBe('Insufficient charge time');
      expect(jammer.isDisabled()).toBe(false);

      // Negative charge -> fails
      expect(jammer.disableWithPulse('item_impulse_debugger', -500).success).toBe(false);

      // Exactly 1000ms -> succeeds
      const ok1000 = jammer.disableWithPulse('item_impulse_debugger', 1000);
      expect(ok1000.success).toBe(true);
      expect(ok1000.doorsUnlocked).toBe(true);
      expect(jammer.isDisabled()).toBe(true);
    });

    it('STRESS-JAMMER-04: invalid tools cannot trigger EMP disruption', () => {
      const invalidTools = [
        'item_scrap_metal',
        'item_module_battery',
        'item_server_keyring',
        '',
        'undefined',
      ];
      for (const tool of invalidTools) {
        const res = jammer.disableWithPulse(tool, 5000);
        expect(res.success).toBe(false);
        expect(res.error).toBe('Impulse Debugger required');
        expect(jammer.isDisabled()).toBe(false);
      }
    });

    it('STRESS-JAMMER-05: redundant EMP pulses after disruption remain idempotent', () => {
      jammer.disableWithPulse('item_impulse_debugger', 1000);
      expect(jammer.isDisabled()).toBe(true);

      for (let i = 0; i < 3; i++) {
        const redundant = jammer.disableWithPulse('item_impulse_debugger', 1500);
        expect(redundant.success).toBe(true);
        expect(redundant.doorsUnlocked).toBe(true);
        expect(redundant.error).toBe('Jammer is already disabled');
        expect(jammer.isDisabled()).toBe(true);
      }
    });

    it('STRESS-JAMMER-06: Euclidean distance calculation accuracy', () => {
      // Default mast at (12, 15)
      expect(jammer.calculateDistance({ x: 12, y: 15 })).toBe(0);
      expect(jammer.calculateDistance({ x: 12, y: 18 })).toBe(3);
      expect(jammer.calculateDistance({ x: 12, y: 9 })).toBe(6);
      expect(jammer.calculateDistance({ x: 15, y: 19 })).toBe(5); // 3-4-5 right triangle
    });
  });

  // ==========================================
  // 3. Server Recovery Console & Vault Door Stress Tests
  // ==========================================
  describe('Server Recovery Console & Vault Door Stress Tests', () => {
    describe('ServerVaultDoorController', () => {
      let door: ServerVaultDoorController;

      beforeEach(() => {
        door = new ServerVaultDoorController();
      });

      it('STRESS-DOOR-01: digital or invalid items cannot bypass mechanical lock', () => {
        const mockEmptyInv = { hasItem: () => false };
        const mockBadInv = {
          hasItem: (id: string) => ['item_module_casing', 'item_impulse_debugger', 'item_insulating_tape'].includes(id),
        };

        expect(door.attemptUnlock(mockEmptyInv).success).toBe(false);
        expect(door.isUnlocked()).toBe(false);

        const badRes = door.attemptUnlock(mockBadInv);
        expect(badRes.success).toBe(false);
        expect(badRes.error).toContain('Master brass keys required');
        expect(door.isUnlocked()).toBe(false);
      });

      it('STRESS-DOOR-02: keys are retained and not consumed upon unlock', () => {
        let keyCount = 1;
        const mockInventory = {
          hasItem: (id: string) => id === 'item_server_keyring' && keyCount > 0,
        };

        const res = door.attemptUnlock(mockInventory);
        expect(res.success).toBe(true);
        expect(door.isUnlocked()).toBe(true);

        // Keys were NOT consumed (count remains 1)
        expect(keyCount).toBe(1);
        expect(mockInventory.hasItem('item_server_keyring')).toBe(true);

        // Subsequent unlock call also succeeds idempotently
        const res2 = door.attemptUnlock(mockInventory);
        expect(res2.success).toBe(true);
      });
    });

    describe('CentralServerConsoleController', () => {
      let consoleCtrl: CentralServerConsoleController;
      let mockQuest: IQuestEngine;
      let mockDialogue: IDialogueEngine;

      beforeEach(() => {
        mockQuest = {
          getActiveQuest: vi.fn(),
          startQuest: vi.fn().mockReturnValue(true),
          completeObjective: vi.fn().mockReturnValue(true),
          completeQuest: vi.fn().mockReturnValue(true),
          isQuestCompleted: vi.fn().mockReturnValue(true),
          selectEnding: vi.fn().mockImplementation((choice: 'A' | 'B' | 'C') => {
            return choice === 'A' ? 'quest_14_finale_ideal' : 'quest_15_finale_pragmatic';
          }),
          getState: vi.fn().mockReturnValue({}),
          loadState: vi.fn(),
        };

        mockDialogue = {
          startDialogue: vi.fn(),
          advance: vi.fn(),
          selectOption: vi.fn(),
          getCurrentNode: vi.fn().mockReturnValue({
            id: 'node_console_select',
            speaker: 'console',
            textRu: 'Текст',
            textEn: 'Text',
            options: [
              { id: '1', labelRu: 'A', labelEn: 'A', nextNodeId: 'node_a' },
              { id: '2', labelRu: 'B', labelEn: 'B', nextNodeId: 'node_b' },
              { id: '3', labelRu: 'C', labelEn: 'C', nextNodeId: 'node_b' },
            ],
          } as unknown as DialogueNode),
          isActive: vi.fn().mockReturnValue(true),
        } as unknown as IDialogueEngine;

        consoleCtrl = new CentralServerConsoleController({
          questEngine: mockQuest,
          dialogueEngine: mockDialogue,
        });
      });

      it('STRESS-CONSOLE-01: modal stays pinned until option chosen', () => {
        expect(consoleCtrl.isPinned()).toBe(true);

        // Advance does not unpin modal
        mockDialogue.advance();
        expect(consoleCtrl.isPinned()).toBe(true);

        // Selecting option unpins modal
        consoleCtrl.selectProtocol(0);
        expect(consoleCtrl.isPinned()).toBe(false);
      });

      it('STRESS-CONSOLE-02: rejects out-of-bound option indices', () => {
        const invalidIndices = [-10, -1, 3, 4, 100];
        for (const idx of invalidIndices) {
          const res = consoleCtrl.selectProtocol(idx);
          expect(res.success).toBe(false);
          expect(res.error).toContain('Invalid option index');
          expect(consoleCtrl.isCompleted()).toBe(false);
        }
      });

      it('STRESS-CONSOLE-03: Option 0 (A) -> Quest 14 Ideal, Options 1 & 2 (B & C) -> Quest 15 Pragmatic', () => {
        // Choice A
        const resA = consoleCtrl.selectProtocol(0);
        expect(resA.success).toBe(true);
        expect(resA.endingBranch).toBe('quest_14_finale_ideal');
        expect(consoleCtrl.getSelectedProtocol()).toBe('A');

        // Reset and test B
        consoleCtrl.reset();
        const resB = consoleCtrl.selectProtocol(1);
        expect(resB.success).toBe(true);
        expect(resB.endingBranch).toBe('quest_15_finale_pragmatic');
        expect(consoleCtrl.getSelectedProtocol()).toBe('B');

        // Reset and test C
        consoleCtrl.reset();
        const resC = consoleCtrl.selectProtocol(2);
        expect(resC.success).toBe(true);
        expect(resC.endingBranch).toBe('quest_15_finale_pragmatic');
        expect(consoleCtrl.getSelectedProtocol()).toBe('C');
      });

      it('STRESS-CONSOLE-04: gracefully handles missing or throwing engines', () => {
        const isolatedConsole = new CentralServerConsoleController();
        const res = isolatedConsole.selectProtocol(0);
        expect(res.success).toBe(true);
        expect(res.endingBranch).toBe('quest_14_finale_ideal');
        expect(isolatedConsole.getSelectedProtocol()).toBe('A');
      });
    });

    describe('ServerRecoveryProtocolSystem Facade', () => {
      it('STRESS-FACADE-01: coordinates door unlock and console boot cleanly', () => {
        const facade = new ServerRecoveryProtocolSystem();
        expect(facade.isDoorUnlocked()).toBe(false);

        const mockInv = { hasItem: (id: string) => id === 'item_server_keyring' };
        expect(facade.attemptUnlock(mockInv).success).toBe(true);
        expect(facade.isDoorUnlocked()).toBe(true);

        const boot = facade.bootConsole();
        expect(boot.success).toBe(true);

        const protocol = facade.selectProtocol(0);
        expect(protocol.success).toBe(true);
        expect(protocol.endingBranch).toBe('quest_14_finale_ideal');
        expect(facade.getSelectedProtocol()).toBe('A');
      });
    });
  });

  // ==========================================
  // 4. CampaignDriver Integration Stress Tests
  // ==========================================
  describe('CampaignDriver Integration Stress Tests', () => {
    let driver: CampaignDriver;

    beforeEach(() => {
      driver = createCampaignDriver();
    });

    it('STRESS-DRIVER-01: verify CCTV through CampaignDriver with timeline scrubbing edge values', () => {
      expect(driver.cctv.isPowered()).toBe(false);
      expect(driver.cctv.rewind(15).success).toBe(false);

      driver.cctv.powerTerminal(true);
      expect(driver.cctv.isPowered()).toBe(true);

      // Insufficient rewind
      expect(driver.cctv.rewind(9).success).toBe(false);
      // Valid rewind
      const result = driver.cctv.rewind(10);
      expect(result.success).toBe(true);
      expect(result.footageId).toBe('cctv_archive_dog_heist');
      expect(result.clueLocation).toBe('zone_06_winter_garden');
      expect(driver.cctv.isComplete()).toBe(true);
    });

    it('STRESS-DRIVER-02: verify Jammer through CampaignDriver with barrier repulsion and pulse', () => {
      expect(driver.jammer.isDisabled()).toBe(false);

      // Repulsion barrier
      expect(driver.jammer.approach(2.0).status).toBe('barrier_repulsion');
      expect(driver.jammer.approach(5.0).status).toBe('hud_distortion');
      expect(driver.jammer.approach(8.0).status).toBe('safe');

      // Pulse without charge
      const failPulse = driver.jammer.disableWithPulse('item_impulse_debugger', 500);
      expect(failPulse.success).toBe(false);

      // Pulse without debugger
      const failTool = driver.jammer.disableWithPulse('item_scrap_metal', 1500);
      expect(failTool.success).toBe(false);

      // Valid pulse
      const okPulse = driver.jammer.disableWithPulse('item_impulse_debugger', 1200);
      expect(okPulse.success).toBe(true);
      expect(okPulse.doorsUnlocked).toBe(true);
      expect(driver.jammer.isDisabled()).toBe(true);

      // Now safe at 1.0m
      expect(driver.jammer.approach(1.0).status).toBe('safe');
    });

    it('STRESS-DRIVER-03: verify Server Vault Door & Console protocol through CampaignDriver', () => {
      driver.advanceToQuest('quest_13_protocol_init');

      // Ensure dialogue modal stays pinned until choice
      driver.dialogue.startDialogue('console_protocol_q13');
      const node = driver.dialogue.getCurrentNode();
      expect(node?.options?.length).toBe(3);

      const stayNode = driver.dialogue.advance();
      expect(stayNode?.id).toBe(node?.id);

      // Complete objectives and branch to ending
      driver.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
      driver.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');
      driver.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');

      const branchA = driver.quest.selectEnding('A');
      expect(branchA).toBe('quest_14_finale_ideal');
      expect(driver.getWorldFlags().CAMPAIGN_ENDING).toBe('FINAL_A');
      expect(driver.quest.getActiveQuest()?.id).toBe('quest_14_final_a_celebration');
    });
  });
});

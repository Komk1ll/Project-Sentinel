/**
 * Adversarial Stress & Fuzzing Harness for QuestSystem and DialogueSystem
 * Authored by: challenger_m1_1 (Empirical Challenger)
 * Milestone: M1 (teamwork_preview_challenger)
 *
 * Systematic stress-testing and empirical verification of:
 * 1. Illegal quest state transitions (locked quests, non-existent objectives, double completion, out-of-order, loadState desync)
 * 2. Quest 13 invalid ending inputs ('D', empty, null, undefined)
 * 3. Dialogue tree cyclic references (self-cycles, mutual cycles, auto-advance endless loops, production dialogues.json DAG validation)
 * 4. Invalid dialogue option indices & exception handling (negative index, out-of-bounds, NaN, onSelect exceptions)
 * 5. Rapid advance calls & radio queue bleed-through
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuestSystem } from '@/game/systems/QuestSystem';
import { DialogueSystem } from '@/game/systems/DialogueSystem';
import defaultQuestsJson from '@/content/quests/cybershield_quests.json';
import defaultDialoguesJson from '@/content/quests/dialogues.json';
import type {
  CampaignQuestRecord,
  DialogueDatabase,
  DialogueTree,
  EndingChoice,
  QuestState,
} from '@/types/campaign';
import type { InventorySlot } from '@/types';

describe('Adversarial Stress Test: QuestSystem & DialogueSystem', () => {
  // =========================================================================
  // SECTION 1: Illegal Quest State Transitions
  // =========================================================================
  describe('1. Illegal Quest State Transitions (QuestSystem)', () => {
    let questSystem: QuestSystem;
    let inventory: InventorySlot[];

    beforeEach(() => {
      inventory = [];
      questSystem = new QuestSystem(
        defaultQuestsJson as unknown as CampaignQuestRecord[],
        {},
        inventory
      );
    });

    it('rejects starting a locked quest directly while another quest is active', () => {
      expect(questSystem.getActiveQuest()?.id).toBe('quest_01_gate_barrier');
      const result = questSystem.startQuest('quest_02_deans_password');
      expect(result).toBe(false);
      expect(questSystem.getActiveQuest()?.id).toBe('quest_01_gate_barrier');
      expect(questSystem.getQuestState('quest_02_deans_password')?.status).toBe('locked');
    });

    it('rejects starting a non-existent or malformed quest ID', () => {
      // Non-existent ID
      expect(questSystem.startQuest('quest_999_bogus')).toBe(false);
      // Empty string
      expect(questSystem.startQuest('')).toBe(false);
      // Null / undefined casting
      expect(questSystem.startQuest(null as unknown as string)).toBe(false);
      expect(questSystem.startQuest(undefined as unknown as string)).toBe(false);
    });

    it('rejects starting an already completed quest', () => {
      // Complete quest 1
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_evade_patrol');
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_reach_basement');
      expect(questSystem.isQuestCompleted('quest_01_gate_barrier')).toBe(true);

      // Attempt to restart quest 1
      const restarted = questSystem.startQuest('quest_01_gate_barrier');
      expect(restarted).toBe(false);
      expect(questSystem.getQuestState('quest_01_gate_barrier')?.status).toBe('completed');
    });

    it('rejects starting an already active quest (idempotency check)', () => {
      expect(questSystem.getActiveQuest()?.id).toBe('quest_01_gate_barrier');
      // Calling startQuest on already active quest must return false
      const restarted = questSystem.startQuest('quest_01_gate_barrier');
      expect(restarted).toBe(false);
    });

    it('rejects completing non-existent or malformed objective IDs', () => {
      expect(questSystem.completeObjective('quest_01_gate_barrier', 'non_existent_obj_id')).toBe(false);
      expect(questSystem.completeObjective('quest_01_gate_barrier', '')).toBe(false);
      expect(questSystem.completeObjective('quest_01_gate_barrier', null as unknown as string)).toBe(false);
      expect(questSystem.completeObjective('quest_999_fake', 'obj_01_radio_curator')).toBe(false);
    });

    it('rejects completing objectives on locked or inactive quests', () => {
      // Quest 2 is locked
      expect(questSystem.getQuestState('quest_02_deans_password')?.status).toBe('locked');
      const result = questSystem.completeObjective('quest_02_deans_password', 'obj_02_inspect_terminal');
      expect(result).toBe(false);
      expect(questSystem.getQuestState('quest_02_deans_password')?.completedObjectives).toHaveLength(0);
    });

    it('enforces objective completion idempotency (double completion returns false)', () => {
      const first = questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
      expect(first).toBe(true);

      // Duplicate attempt
      const second = questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
      expect(second).toBe(false);

      // Triplicate attempt
      const third = questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
      expect(third).toBe(false);

      const state = questSystem.getQuestState('quest_01_gate_barrier');
      expect(state?.completedObjectives).toEqual(['obj_01_radio_curator']);
    });

    it('rejects double completeQuest calls', () => {
      // Complete quest 1 legitimately
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_evade_patrol');
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_reach_basement');

      expect(questSystem.isQuestCompleted('quest_01_gate_barrier')).toBe(true);

      // Attempt manual completeQuest on already completed quest
      const doubleComplete = questSystem.completeQuest('quest_01_gate_barrier');
      expect(doubleComplete).toBe(false);
    });

    it('FINDING: completeQuest allows completing an active quest directly without completing its objectives', () => {
      // Quest 1 is active with 0 completed objectives
      expect(questSystem.getActiveQuest()?.id).toBe('quest_01_gate_barrier');
      expect(questSystem.getQuestState('quest_01_gate_barrier')?.completedObjectives).toHaveLength(0);

      // Direct completeQuest call
      const forced = questSystem.completeQuest('quest_01_gate_barrier');
      expect(forced).toBe(true);
      expect(questSystem.isQuestCompleted('quest_01_gate_barrier')).toBe(true);

      // State anomaly: quest marked completed, but completedObjectives is completely empty!
      const q1State = questSystem.getQuestState('quest_01_gate_barrier');
      expect(q1State?.status).toBe('completed');
      expect(q1State?.completedObjectives).toHaveLength(0);
    });

    it('FINDING: completing objectives out of order causes currentObjectiveIndex to regress backward', () => {
      // Quest 1 has objectives: 0: obj_01_radio_curator, 1: obj_01_evade_patrol, 2: obj_01_reach_basement
      // Complete objective index 2 first
      const res2 = questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_reach_basement');
      expect(res2).toBe(true);
      expect(questSystem.getQuestState('quest_01_gate_barrier')?.currentObjectiveIndex).toBe(3);

      // Now complete objective index 0
      const res0 = questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
      expect(res0).toBe(true);

      // Anomaly: currentObjectiveIndex regressed from 3 to 1!
      const state = questSystem.getQuestState('quest_01_gate_barrier');
      expect(state?.currentObjectiveIndex).toBe(1);
    });

    it('FIX VERIFIED: loadState normalizes multiple active quests to single-active-quest invariant', () => {
      const corruptedState: Record<string, QuestState> = {
        quest_01_gate_barrier: {
          id: 'quest_01_gate_barrier',
          status: 'active',
          currentObjectiveIndex: 0,
          completedObjectives: [],
        },
        quest_02_deans_password: {
          id: 'quest_02_deans_password',
          status: 'active',
          currentObjectiveIndex: 0,
          completedObjectives: [],
        },
        quest_03_blocker_disassembly: {
          id: 'quest_03_blocker_disassembly',
          status: 'active',
          currentObjectiveIndex: 0,
          completedObjectives: [],
        },
      };

      questSystem.loadState(corruptedState);

      // activeQuestId points to the last one processed
      expect(questSystem.getActiveQuest()?.id).toBe('quest_03_blocker_disassembly');

      // Single-active-quest invariant: non-active quests are normalized to 'completed'
      expect(questSystem.getQuestState('quest_01_gate_barrier')?.status).toBe('completed');
      expect(questSystem.getQuestState('quest_02_deans_password')?.status).toBe('completed');
      expect(questSystem.getQuestState('quest_03_blocker_disassembly')?.status).toBe('active');

      const activeQuests = Object.values(questSystem.getState()).filter(s => s.status === 'active');
      expect(activeQuests.length).toBe(1);

      // Invariant upheld: objectives on quest 1 cannot be completed because it is no longer active!
      const canCompleteQ1Obj = questSystem.completeObjective(
        'quest_01_gate_barrier',
        'obj_01_radio_curator'
      );
      expect(canCompleteQ1Obj).toBe(false);
    });

    it('FIX VERIFIED: loadState with empty state object re-initializes root quest cleanly without bricking', () => {
      // Loading empty state
      questSystem.loadState({});
      // activeQuestId becomes quest_01_gate_barrier
      expect(questSystem.getActiveQuest()?.id).toBe('quest_01_gate_barrier');
      // quest 1 is 'active' in states map
      expect(questSystem.getQuestState('quest_01_gate_barrier')?.status).toBe('active');
      // Quest progression is intact
      expect(questSystem.getActiveQuest()).not.toBeNull();
    });
  });

  // =========================================================================
  // SECTION 2: Quest 13 Invalid Ending Inputs
  // =========================================================================
  describe('2. Quest 13 Invalid Ending Inputs (QuestSystem)', () => {
    let questSystem: QuestSystem;

    function advanceToQuest13(qs: QuestSystem): void {
      const quests = (defaultQuestsJson as unknown as CampaignQuestRecord[]).slice(0, 12);
      for (const q of quests) {
        for (const obj of q.objectives) {
          qs.completeObjective(q.id, obj.id);
        }
      }
      expect(qs.getActiveQuest()?.id).toBe('quest_13_protocol_init');
    }

    beforeEach(() => {
      questSystem = new QuestSystem(defaultQuestsJson as unknown as CampaignQuestRecord[]);
    });

    it('throws error when selectEnding is called before Quest 13 is reached', () => {
      expect(questSystem.getActiveQuest()?.id).toBe('quest_01_gate_barrier');
      expect(() => questSystem.selectEnding('A')).toThrow(
        /selectEnding must be called while quest_13_protocol_init is active/
      );
    });

    it('FIX VERIFIED: selectEnding rejects invalid choice "D" with Error', () => {
      advanceToQuest13(questSystem);
      expect(() => questSystem.selectEnding('D' as unknown as EndingChoice)).toThrow('Invalid ending choice: D');
    });

    it('FIX VERIFIED: selectEnding rejects empty string "" with Error', () => {
      advanceToQuest13(questSystem);
      expect(() => questSystem.selectEnding('' as unknown as EndingChoice)).toThrow(/Invalid ending choice/);
    });

    it('FIX VERIFIED: selectEnding rejects null / undefined with Error', () => {
      advanceToQuest13(questSystem);
      expect(() => questSystem.selectEnding(null as unknown as EndingChoice)).toThrow(/Invalid ending choice/);
      expect(() => questSystem.selectEnding(undefined as unknown as EndingChoice)).toThrow(/Invalid ending choice/);
    });

    it('allows idempotent selectEnding calls for matching ending and throws error for conflicting ending after epilogue active', () => {
      advanceToQuest13(questSystem);
      const first = questSystem.selectEnding('A');
      expect(questSystem.getActiveQuest()?.id).toBe('quest_14_final_a_celebration');

      // Idempotent repeat call with matching choice returns existing contract
      expect(questSystem.selectEnding('A')).toBe(first);

      // Attempting to select conflicting ending while Quest 14 active throws error
      expect(() => questSystem.selectEnding('B')).toThrow(
        /selectEnding must be called while quest_13_protocol_init is active/
      );
    });
  });

  // =========================================================================
  // SECTION 3: Dialogue Tree Cyclic References & Production Data Validation
  // =========================================================================
  describe('3. Dialogue Tree Cyclic References & Production Data (DialogueSystem)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('FAILURE MODE: self-referential dialogue node (A -> A) causes infinite loop during manual advance traversal', () => {
      const cyclicDb: DialogueDatabase = {
        speakers: defaultDialoguesJson.speakers as unknown as DialogueDatabase['speakers'],
        trees: {
          tree_cyclic_self: {
            id: 'tree_cyclic_self',
            initialNodeId: 'node_self_loop',
            nodes: {
              node_self_loop: {
                id: 'node_self_loop',
                speaker: 'alexey',
                textRu: 'Зацикленный узел',
                textEn: 'Self-looping node',
                next: 'node_self_loop', // points to self
              },
            },
          },
        },
      };

      const cyclicDialogue = new DialogueSystem(cyclicDb);
      cyclicDialogue.startDialogue('tree_cyclic_self');
      expect(cyclicDialogue.isActive()).toBe(true);

      // Traversal with safety counter
      let steps = 0;
      const MAX_STEPS = 50;
      while (cyclicDialogue.isActive() && steps < MAX_STEPS) {
        cyclicDialogue.advance();
        steps++;
      }

      // Proves that it reached MAX_STEPS without ever finishing (infinite loop failure mode)
      expect(steps).toBe(MAX_STEPS);
      expect(cyclicDialogue.isActive()).toBe(true);
      expect(cyclicDialogue.getCurrentNode()?.id).toBe('node_self_loop');
    });

    it('FAILURE MODE: mutual cycle (A -> B -> A) causes infinite loop', () => {
      const mutualCycleDb: DialogueDatabase = {
        speakers: defaultDialoguesJson.speakers as unknown as DialogueDatabase['speakers'],
        trees: {
          tree_mutual_cycle: {
            id: 'tree_mutual_cycle',
            initialNodeId: 'node_a',
            nodes: {
              node_a: {
                id: 'node_a',
                speaker: 'alexey',
                textRu: 'Узел А',
                textEn: 'Node A',
                next: 'node_b',
              },
              node_b: {
                id: 'node_b',
                speaker: 'curator',
                textRu: 'Узел Б',
                textEn: 'Node B',
                next: 'node_a',
              },
            },
          },
        },
      };

      const cyclicDialogue = new DialogueSystem(mutualCycleDb);
      cyclicDialogue.startDialogue('tree_mutual_cycle');

      let steps = 0;
      const MAX_STEPS = 100;
      while (cyclicDialogue.isActive() && steps < MAX_STEPS) {
        cyclicDialogue.advance();
        steps++;
      }

      expect(steps).toBe(MAX_STEPS);
      expect(cyclicDialogue.isActive()).toBe(true);
    });

    it('FAILURE MODE: auto_advance mutual cycle creates endless recurring timers', () => {
      const autoAdvanceCycleDb: DialogueDatabase = {
        speakers: defaultDialoguesJson.speakers as unknown as DialogueDatabase['speakers'],
        trees: {
          tree_auto_cycle: {
            id: 'tree_auto_cycle',
            initialNodeId: 'node_auto_1',
            nodes: {
              node_auto_1: {
                id: 'node_auto_1',
                speaker: 'curator',
                textRu: 'Авто 1',
                textEn: 'Auto 1',
                mode: 'auto_advance',
                autoAdvanceDelayMs: 1000,
                next: 'node_auto_2',
              },
              node_auto_2: {
                id: 'node_auto_2',
                speaker: 'curator',
                textRu: 'Авто 2',
                textEn: 'Auto 2',
                mode: 'auto_advance',
                autoAdvanceDelayMs: 1000,
                next: 'node_auto_1',
              },
            },
          },
        },
      };

      const autoCycleDialogue = new DialogueSystem(autoAdvanceCycleDb);
      autoCycleDialogue.startDialogue('tree_auto_cycle');

      // Fast-forward 10 seconds (10 cycles)
      for (let i = 0; i < 10; i++) {
        expect(autoCycleDialogue.isActive()).toBe(true);
        vi.advanceTimersByTime(1000);
      }

      // Still active indefinitely
      expect(autoCycleDialogue.isActive()).toBe(true);
    });

    it('EMPIRICAL INTEGRITY CHECK: validates all production dialogues.json trees are DAGs with zero cycles', () => {
      const trees = defaultDialoguesJson.trees as unknown as Record<string, DialogueTree>;
      const treeIds = Object.keys(trees);
      expect(treeIds.length).toBeGreaterThanOrEqual(15);

      for (const treeId of treeIds) {
        const tree = trees[treeId];
        expect(tree).toBeDefined();
        if (!tree) continue;

        // Verify initial node exists
        expect(tree.nodes[tree.initialNodeId]).toBeDefined();

        // Detect cycles via DFS with recursion stack tracking
        const visited = new Set<string>();
        const inStack = new Set<string>();

        function checkNode(nodeId: string): void {
          expect(inStack.has(nodeId)).toBe(false); // cycle detected if already in current path
          if (visited.has(nodeId)) return;

          visited.add(nodeId);
          inStack.add(nodeId);

          const node = tree?.nodes[nodeId];
          expect(node).toBeDefined();

          if (node?.next) {
            expect(tree?.nodes[node.next]).toBeDefined(); // target exists
            checkNode(node.next);
          }

          if (node?.options) {
            for (const opt of node.options) {
              expect(tree?.nodes[opt.nextNodeId]).toBeDefined();
              checkNode(opt.nextNodeId);
            }
          }

          inStack.delete(nodeId);
        }

        checkNode(tree.initialNodeId);
      }
    });
  });

  // =========================================================================
  // SECTION 4: Invalid Dialogue Option Indices & Exception Handling
  // =========================================================================
  describe('4. Invalid Option Indices & Exception Handling (DialogueSystem)', () => {
    let dialogueSystem: DialogueSystem;

    beforeEach(() => {
      dialogueSystem = new DialogueSystem(defaultDialoguesJson as unknown as DialogueDatabase);
    });

    it('selectOption(-1) returns null for negative index', () => {
      // Start Quest 13 branching dialogue
      dialogueSystem.startDialogue('tree_quest_13_protocol');
      expect(dialogueSystem.isBranching()).toBe(true);
      const originalNode = dialogueSystem.getCurrentNode();

      const result = dialogueSystem.selectOption(-1);
      expect(result).toBeNull();
      expect(dialogueSystem.getCurrentNode()).toBe(originalNode);
      expect(dialogueSystem.isActive()).toBe(true);
    });

    it('selectOption(99) returns null for out of bounds index', () => {
      dialogueSystem.startDialogue('tree_quest_13_protocol');
      expect(dialogueSystem.isBranching()).toBe(true);
      const originalNode = dialogueSystem.getCurrentNode();

      const result = dialogueSystem.selectOption(99);
      expect(result).toBeNull();
      expect(dialogueSystem.getCurrentNode()).toBe(originalNode);
      expect(dialogueSystem.isActive()).toBe(true);
    });

    it('handles NaN and floating point option indices gracefully returning null', () => {
      dialogueSystem.startDialogue('tree_quest_13_protocol');
      const originalNode = dialogueSystem.getCurrentNode();

      // NaN
      const nanResult = dialogueSystem.selectOption(NaN);
      expect(nanResult).toBeNull();

      // Float 1.5
      const floatResult = dialogueSystem.selectOption(1.5);
      expect(floatResult).toBeNull();

      // Infinity
      const infResult = dialogueSystem.selectOption(Infinity);
      expect(infResult).toBeNull();

      expect(dialogueSystem.getCurrentNode()).toBe(originalNode);
    });

    it('returns null when selectOption is called while dialogue is not active', () => {
      expect(dialogueSystem.isActive()).toBe(false);
      expect(dialogueSystem.selectOption(0)).toBeNull();
    });

    it('returns null when selectOption is called on a non-branching node', () => {
      dialogueSystem.startDialogue('tree_quest_01_radio');
      expect(dialogueSystem.isBranching()).toBe(false);
      expect(dialogueSystem.selectOption(0)).toBeNull();
    });

    it('isolates exceptions inside an option onSelect callback and continues safely', () => {
      const errorDb: DialogueDatabase = {
        speakers: defaultDialoguesJson.speakers as unknown as DialogueDatabase['speakers'],
        trees: {
          tree_error_option: {
            id: 'tree_error_option',
            initialNodeId: 'node_opt_error',
            nodes: {
              node_opt_error: {
                id: 'node_opt_error',
                speaker: 'console',
                textRu: 'Текст',
                textEn: 'Text',
                options: [
                  {
                    id: 'opt_exploding',
                    labelRu: 'Взрыв',
                    labelEn: 'Explode',
                    nextNodeId: 'node_next',
                    onSelect: () => {
                      throw new Error('Unexpected callback crash');
                    },
                  },
                ],
              },
              node_next: {
                id: 'node_next',
                speaker: 'console',
                textRu: 'Следующий',
                textEn: 'Next',
              },
            },
          },
        },
      };

      const errorDialogue = new DialogueSystem(errorDb);
      errorDialogue.startDialogue('tree_error_option');

      // Exception in onSelect is caught internally and does not crash selectOption
      expect(() => errorDialogue.selectOption(0)).not.toThrow();
      expect(errorDialogue.getCurrentNode()?.id).toBe('node_next');
    });
  });

  // =========================================================================
  // SECTION 5: Rapid Advance & Queue Bleed-Through
  // =========================================================================
  describe('5. Rapid Advance & Queue Bleed-Through (DialogueSystem)', () => {
    let dialogueSystem: DialogueSystem;

    beforeEach(() => {
      vi.useFakeTimers();
      dialogueSystem = new DialogueSystem(defaultDialoguesJson as unknown as DialogueDatabase);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('survives rapid advance call bursts on a normal dialogue without crashing', () => {
      dialogueSystem.startDialogue('tree_quest_01_radio');
      expect(dialogueSystem.isActive()).toBe(true);

      // Spam advance 50 times in rapid succession
      for (let i = 0; i < 50; i++) {
        dialogueSystem.advance();
      }

      // Finishes cleanly
      expect(dialogueSystem.isActive()).toBe(false);
    });

    it('protects queue transition with cooldown window to prevent rapid advance bursts from devouring unread radio transmissions', () => {
      dialogueSystem.registerTree({
        id: 'tree_radio_test',
        initialNodeId: 'node_radio_01',
        isRadio: true,
        nodes: {
          node_radio_01: {
            id: 'node_radio_01',
            speaker: 'curator',
            textRu: 'Срочное сообщение по рации',
            textEn: 'Urgent radio transmission',
            isRadio: true,
          },
        },
      });

      // Start a 2-node dialogue
      dialogueSystem.startDialogue('tree_quest_01_radio'); // 2 nodes: q01_curator_01, q01_alexey_02
      expect(dialogueSystem.isActive()).toBe(true);

      // Queue a 1-node radio transmission
      dialogueSystem.enqueueRadio('tree_radio_test');
      expect(dialogueSystem.getQueuedRadioCount()).toBe(1);

      // Advance 1: advances tree_quest_01_radio to node 2
      dialogueSystem.advance();
      // Advance 2: finishes tree_quest_01_radio -> triggers processNextInQueue() -> starts tree_radio_test!
      dialogueSystem.advance();
      expect(dialogueSystem.getStateSnapshot().treeId).toBe('tree_radio_test');

      // Advance 3 (overflow from the same user click spam within cooldown):
      // Absorbed by queue cooldown! Node is preserved!
      const burstAdvance = dialogueSystem.advance();
      expect(burstAdvance).not.toBeNull();
      expect(dialogueSystem.isActive()).toBe(true);
      expect(dialogueSystem.getStateSnapshot().treeId).toBe('tree_radio_test');

      // Fast forward past cooldown
      vi.advanceTimersByTime(250);

      // Advance 4: now advances and finishes tree_radio_test
      dialogueSystem.advance();
      expect(dialogueSystem.isActive()).toBe(false);
    });

    it('isolates exceptions in onComplete callback so radio queue is not stranded', () => {
      dialogueSystem.registerTree({
        id: 'tree_radio_test',
        initialNodeId: 'node_radio_01',
        isRadio: true,
        nodes: {
          node_radio_01: {
            id: 'node_radio_01',
            speaker: 'curator',
            textRu: 'Срочное сообщение по рации',
            textEn: 'Urgent radio transmission',
            isRadio: true,
          },
        },
      });

      // Start dialogue with an onComplete callback that throws
      dialogueSystem.startDialogue('tree_quest_01_radio', () => {
        throw new Error('OnComplete listener failure');
      });

      // Queue another radio transmission
      dialogueSystem.enqueueRadio('tree_radio_test');
      expect(dialogueSystem.getQueuedRadioCount()).toBe(1);

      // Advance to end of tree_quest_01_radio
      dialogueSystem.advance();

      // Completing the tree invokes callback which catches error and processes queue
      expect(() => dialogueSystem.advance()).not.toThrow();

      // processNextInQueue() executed: tree_radio_test is playing!
      expect(dialogueSystem.isActive()).toBe(true);
      expect(dialogueSystem.getStateSnapshot().treeId).toBe('tree_radio_test');
      expect(dialogueSystem.getQueuedRadioCount()).toBe(0);
    });
  });
});

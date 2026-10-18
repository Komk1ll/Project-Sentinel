import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DialogueSystem } from '@/game/systems/DialogueSystem';
import dialogueDataJson from '@/content/quests/dialogues.json';
import type { DialogueDatabase } from '@/types/campaign';

describe('DialogueSystem Unit Tests', () => {
  let dialogueSystem: DialogueSystem;

  beforeEach(() => {
    vi.useFakeTimers();
    dialogueSystem = new DialogueSystem(dialogueDataJson as unknown as DialogueDatabase, 'ru');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly loads all 5 speakers and verifies metadata', () => {
    const expectedSpeakers = ['alexey', 'curator', 'professor', 'console', 'system'];
    for (const sp of expectedSpeakers) {
      // @ts-expect-error key lookup
      const meta = dialogueDataJson.speakers[sp];
      expect(meta).toBeDefined();
      expect(meta.nameRu).toBeTruthy();
      expect(meta.nameEn).toBeTruthy();
      expect(meta.theme).toBeTruthy();
    }
  });

  it('plays Quest 1 dialogue with Russian verbatim text and auto-advance radio', () => {
    expect(dialogueSystem.startDialogue('tree_quest_01_radio')).toBe(true);
    expect(dialogueSystem.isActive()).toBe(true);
    expect(dialogueSystem.isRadioActive()).toBe(true);

    const snapshot = dialogueSystem.getStateSnapshot();
    expect(snapshot.speaker).toBe('curator');
    expect(snapshot.speakerName).toBe('Куратор (по рации)');
    expect(snapshot.text).toContain('Алексей, главный вход под жёсткой сетевой блокировкой');

    // Switch to English and verify localization
    dialogueSystem.setLanguage('en');
    const snapshotEn = dialogueSystem.getStateSnapshot();
    expect(snapshotEn.speakerName).toBe('Curator (Radio)');
    expect(snapshotEn.text).toContain('Alexey, the main entrance is under hard network lockdown');

    // Advance to Alexey's response
    dialogueSystem.setLanguage('ru');
    const nextNode = dialogueSystem.advance();
    expect(nextNode).not.toBeNull();
    expect(nextNode?.speaker).toBe('alexey');
    expect(nextNode?.textRu).toBe('«Понял, ухожу с линии обзора патрульных дронов, ищу обход».');

    // Complete tree
    const finished = dialogueSystem.advance();
    expect(finished).toBeNull();
    expect(dialogueSystem.isActive()).toBe(false);
  });

  it('handles Quest 13 protocol branching choices correctly (Option A)', () => {
    expect(dialogueSystem.startDialogue('tree_quest_13_protocol')).toBe(true);
    expect(dialogueSystem.isBranching()).toBe(true);

    const snapshot = dialogueSystem.getStateSnapshot();
    expect(snapshot.options).toHaveLength(3);
    expect(snapshot.options[0]?.label).toContain('Полная перепрошивка (А)');
    expect(snapshot.options[1]?.label).toContain('Аварийный сброс (Б)');
    expect(snapshot.options[2]?.label).toContain('Автономный карантин (В)');

    const events: string[] = [];
    dialogueSystem.onEvent((ev) => events.push(ev));

    // Select Option A
    const selectedNode = dialogueSystem.selectOption(0);
    expect(selectedNode?.id).toBe('q13_choice_a_confirm');
    expect(events).toContain('PROTOCOL_A_SELECTED');
    expect(dialogueSystem.getStateSnapshot().text).toContain('Выбираю полную перепрошивку');

    // Advance to system confirmation
    dialogueSystem.advance();
    expect(dialogueSystem.getStateSnapshot().speaker).toBe('console');
    expect(dialogueSystem.getStateSnapshot().text).toContain('Протокол А принят');

    // Advance to finish
    dialogueSystem.advance();
    expect(dialogueSystem.isActive()).toBe(false);
    expect(events).toContain('ROUTE_CAMPAIGN_ENDING');
  });

  it('handles Quest 13 Option B selection routing', () => {
    expect(dialogueSystem.startDialogue('tree_quest_13_protocol')).toBe(true);
    const events: string[] = [];
    dialogueSystem.onEvent((ev) => events.push(ev));

    const selectedNode = dialogueSystem.selectOption(1);
    expect(selectedNode?.id).toBe('q13_choice_b_confirm');
    expect(events).toContain('PROTOCOL_B_SELECTED');
    expect(dialogueSystem.getStateSnapshot().text).toContain('Выбираю аварийный сброс');
  });

  it('manages Curator radio queue correctly without overlapping', () => {
    // Start regular dialogue
    expect(dialogueSystem.startDialogue('tree_quest_04_professor')).toBe(true);
    expect(dialogueSystem.isActive()).toBe(true);

    // Incoming radio while dialogue is busy
    expect(dialogueSystem.enqueueRadio('tree_quest_01_radio')).toBe(true);
    expect(dialogueSystem.getQueuedRadioCount()).toBe(1);

    // Second radio transmission
    expect(dialogueSystem.enqueueRadio('tree_quest_15_finale')).toBe(true);
    expect(dialogueSystem.getQueuedRadioCount()).toBe(2);

    // Finish professor dialogue (Prof -> Alexey -> finish)
    dialogueSystem.advance();
    dialogueSystem.advance(); // finishes tree_quest_04_professor

    // tree_quest_01_radio should automatically pop and activate
    expect(dialogueSystem.isActive()).toBe(true);
    expect(dialogueSystem.getStateSnapshot().treeId).toBe('tree_quest_01_radio');
    expect(dialogueSystem.getQueuedRadioCount()).toBe(1);
  });

  it('triggers auto-advance timers when mode is auto_advance', () => {
    dialogueSystem.startDialogue('tree_quest_08_power_restore');
    expect(dialogueSystem.getStateSnapshot().currentNodeId).toBe('q08_system_01');

    // Fast-forward timer by 3600ms
    vi.advanceTimersByTime(3600);

    // Node should have automatically advanced to Professor
    expect(dialogueSystem.getStateSnapshot().currentNodeId).toBe('q08_prof_02');
    expect(dialogueSystem.getStateSnapshot().speaker).toBe('professor');
  });

  it('verifies all 15 campaign quest dialogue trees can run without error', () => {
    const treeKeys = Object.keys(dialogueDataJson.trees);
    expect(treeKeys.length).toBeGreaterThanOrEqual(15);

    for (const treeId of treeKeys) {
      const started = dialogueSystem.startDialogue(treeId);
      expect(started).toBe(true);
      expect(dialogueSystem.isActive()).toBe(true);

      // Walk through the tree
      let steps = 0;
      while (dialogueSystem.isActive() && steps < 10) {
        if (dialogueSystem.isBranching()) {
          dialogueSystem.selectOption(0);
        } else {
          dialogueSystem.advance();
        }
        steps++;
      }
      expect(dialogueSystem.isActive()).toBe(false);
    }
  });

  it('notifies state change listeners on each transition', () => {
    let snapshotCount = 0;
    dialogueSystem.onStateChange(() => {
      snapshotCount++;
    });

    expect(snapshotCount).toBe(1); // Immediate callback upon subscription

    dialogueSystem.startDialogue('tree_quest_01_radio');
    expect(snapshotCount).toBe(2);

    dialogueSystem.advance();
    expect(snapshotCount).toBe(3);

    dialogueSystem.advance();
    expect(snapshotCount).toBe(4);
  });
});

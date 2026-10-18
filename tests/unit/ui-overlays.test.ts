/**
 * Unit Tests for UI Overlay Components: QuestHUD, DialogueOverlay, HoloConsoleUI
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QuestHUD, DialogueOverlay, HoloConsoleUI } from '@/ui';
import { QuestSystem } from '@/game/systems/QuestSystem';
import { DialogueSystem } from '@/game/systems/DialogueSystem';
import { CentralServerConsoleController } from '@/game/systems/ServerRecoveryProtocolSystem';
import questDefinitionsJson from '@/content/quests/cybershield_quests.json';
import type { CampaignQuestRecord, DialogueDatabase } from '@/types/campaign';

class MockElement {
  public id: string = '';
  public className: string = '';
  public innerHTML: string = '';
  public style: Record<string, string> = {};
  public dataset: Record<string, string> = {};
  public parentNode: MockElement | null = null;
  private listeners: Map<string, ((e: unknown) => void)[]> = new Map();

  constructor(public tagName: string) {}

  public appendChild(child: MockElement): MockElement {
    child.parentNode = this;
    return child;
  }

  public addEventListener(event: string, handler: (e: unknown) => void): void {
    const list = this.listeners.get(event) || [];
    list.push(handler);
    this.listeners.set(event, list);
  }

  public triggerClick(targetElement?: MockElement): void {
    const target = targetElement || this;
    const event = {
      target,
      type: 'click',
    };
    const list = this.listeners.get('click') || [];
    for (const fn of list) {
      fn(event);
    }
  }

  public closest<T extends MockElement>(selector: string): T | null {
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      if (this.className.split(/\s+/).includes(cls)) return this as unknown as T;
    }
    return this.parentNode ? this.parentNode.closest(selector) : null;
  }

  public querySelectorAll<T extends MockElement>(selector: string): T[] {
    if (selector.includes('quest-objective-item')) {
      const count = (this.innerHTML.match(/quest-objective-item/g) || []).length;
      return Array.from({ length: count }, () => new MockElement('li') as unknown as T);
    }
    if (selector.includes('objective-done')) {
      const count = (this.innerHTML.match(/objective-done/g) || []).length;
      return Array.from({ length: count }, () => {
        const el = new MockElement('li');
        el.innerHTML = '✓';
        return el as unknown as T;
      });
    }
    if (selector.includes('dialogue-option-btn')) {
      const matches = this.innerHTML.match(/data-index="(\d+)"[^>]*>[\s\S]*?<span class="option-label">([^<]+)<\/span>/g) || [];
      return matches.map((m, idx) => {
        const btn = new MockElement('button');
        btn.dataset = { index: String(idx) };
        btn.className = 'dialogue-option-btn';
        btn.innerHTML = m;
        btn.parentNode = this;
        return btn as unknown as T;
      });
    }
    if (selector.includes('holo-option-card')) {
      const count = (this.innerHTML.match(/holo-option-card/g) || []).length;
      return Array.from({ length: count }, () => new MockElement('div') as unknown as T);
    }
    return [];
  }

  public querySelector<T extends MockElement>(selector: string): T | null {
    if (selector.includes('dialogue-advance-btn')) {
      if (this.innerHTML.includes('dialogue-advance-btn')) {
        const btn = new MockElement('button');
        btn.className = 'dialogue-advance-btn';
        btn.parentNode = this;
        return btn as unknown as T;
      }
    }
    const all = this.querySelectorAll<T>(selector);
    return all.length > 0 && all[0] !== undefined ? all[0] : null;
  }
}

const elementsById = new Map<string, MockElement>();

const mockDocument = {
  body: new MockElement('body'),
  createElement(tag: string): MockElement {
    const el = new MockElement(tag);
    return el;
  },
  getElementById(id: string): MockElement | null {
    return elementsById.get(id) ?? null;
  },
};

describe('UI Overlay Components Suite', () => {
  let originalDocument: unknown;

  beforeEach(() => {
    originalDocument = (globalThis as unknown as { document: unknown }).document;
    (globalThis as unknown as { document: unknown }).document = mockDocument;
    elementsById.clear();
    mockDocument.body = new MockElement('body');

    const uiContainer = new MockElement('div');
    uiContainer.id = 'ui-container';
    elementsById.set('ui-container', uiContainer);
    mockDocument.body.appendChild(uiContainer);
  });

  afterEach(() => {
    (globalThis as unknown as { document: unknown }).document = originalDocument;
    elementsById.clear();
  });

  describe('QuestHUD Component', () => {
    let questSystem: QuestSystem;
    let questHud: QuestHUD;

    beforeEach(() => {
      questSystem = new QuestSystem(questDefinitionsJson as unknown as CampaignQuestRecord[]);
      questHud = new QuestHUD(questSystem);
    });

    afterEach(() => {
      questHud.destroy();
    });

    it('renders the initial active quest (Quest 1) title and objectives into #quest-tracker', () => {
      const container = questHud.getContainer();
      expect(container).not.toBeNull();
      expect(container?.id).toBe('quest-tracker');

      expect(container?.innerHTML).toContain('Цифровой барьер главных ворот');
      expect(container?.innerHTML).toContain('ACT 1');
      expect(container?.querySelectorAll('.quest-objective-item').length).toBe(3);
    });

    it('updates objective status when an objective is completed', () => {
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');

      const container = questHud.getContainer();
      const doneItems = (container as unknown as MockElement)?.querySelectorAll<MockElement>('.objective-done');
      expect(doneItems?.length).toBe(1);
      expect((doneItems?.[0] as unknown as MockElement)?.innerHTML).toContain('✓');
    });

    it('updates rendered quest when a new quest starts', () => {
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_evade_patrol');
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_reach_basement');
      questSystem.completeQuest('quest_01_gate_barrier');

      const container = questHud.getContainer();
      expect(container?.innerHTML).toContain('Забытый пароль Деканата');
    });

    it('supports switching language to English', () => {
      questHud.setLanguage('en');
      const container = questHud.getContainer();
      expect(container?.innerHTML).toContain('Digital Barrier of the Main Gates');
    });

    it('cleans up listeners and DOM upon destroy', () => {
      questHud.destroy();
      expect(questHud.getContainer()).toBeNull();
    });
  });

  describe('DialogueOverlay Component', () => {
    let dialogueSystem: DialogueSystem;
    let dialogueOverlay: DialogueOverlay;

    const testDb: DialogueDatabase = {
      speakers: {
        alexey: {
          id: 'alexey',
          nameRu: 'Алексей',
          nameEn: 'Alexey',
          titleRu: 'Студент-инженер',
          titleEn: 'Engineering Student',
          avatar: 'avatar_alexey',
          theme: 'standard',
        },
        curator: {
          id: 'curator',
          nameRu: 'Куратор',
          nameEn: 'Curator',
          titleRu: 'Руководитель безопасности',
          titleEn: 'Security Lead',
          avatar: 'avatar_curator',
          theme: 'radio',
        },
      },
      trees: {
        tree_test_linear: {
          id: 'tree_test_linear',
          act: 1,
          isRadio: true,
          initialNodeId: 'node_1',
          nodes: {
            node_1: {
              id: 'node_1',
              speaker: 'curator',
              textRu: 'Внимание, база на связи.',
              textEn: 'Attention, base online.',
              next: 'node_2',
            },
            node_2: {
              id: 'node_2',
              speaker: 'alexey',
              textRu: 'Вас понял.',
              textEn: 'Understood.',
              next: null,
            },
          },
        },
        tree_test_branch: {
          id: 'tree_test_branch',
          act: 4,
          isRadio: false,
          initialNodeId: 'node_branch',
          nodes: {
            node_branch: {
              id: 'node_branch',
              speaker: 'curator',
              textRu: 'Сделайте выбор.',
              textEn: 'Make a choice.',
              options: [
                { id: 'opt_1', labelRu: 'Вариант 1', labelEn: 'Choice 1', nextNodeId: 'node_end_1' },
                { id: 'opt_2', labelRu: 'Вариант 2', labelEn: 'Choice 2', nextNodeId: 'node_end_2' },
              ],
            },
            node_end_1: { id: 'node_end_1', speaker: 'alexey', textRu: 'Выбран 1', textEn: 'Chosen 1', next: null },
            node_end_2: { id: 'node_end_2', speaker: 'alexey', textRu: 'Выбран 2', textEn: 'Chosen 2', next: null },
          },
        },
      },
    };

    beforeEach(() => {
      dialogueSystem = new DialogueSystem(testDb, 'ru');
      dialogueOverlay = new DialogueOverlay(dialogueSystem);
    });

    afterEach(() => {
      dialogueOverlay.destroy();
    });

    it('initializes hidden when no dialogue is active', () => {
      expect(dialogueOverlay.isVisible()).toBe(false);
    });

    it('displays speaker metadata, text, and advance button when dialogue starts', () => {
      dialogueSystem.startDialogue('tree_test_linear');
      expect(dialogueOverlay.isVisible()).toBe(true);

      const container = dialogueOverlay.getContainer();
      expect(container?.innerHTML).toContain('Куратор');
      expect(container?.innerHTML).toContain('Внимание, база на связи.');
      expect(container?.innerHTML).toContain('RADIO');
      expect(container?.querySelector('.dialogue-advance-btn')).not.toBeNull();
    });

    it('advances dialogue on advance button click', () => {
      dialogueSystem.startDialogue('tree_test_linear');
      dialogueOverlay.advance();

      const container = dialogueOverlay.getContainer();
      expect(container?.innerHTML).toContain('Алексей');
      expect(container?.innerHTML).toContain('Вас понял.');
    });

    it('renders interactive choice buttons for branching dialogues and triggers selection on click', () => {
      dialogueSystem.startDialogue('tree_test_branch');
      const container = dialogueOverlay.getContainer();

      const optionBtns = (container as unknown as MockElement)?.querySelectorAll<MockElement>('.dialogue-option-btn');
      expect(optionBtns?.length).toBe(2);
      expect((optionBtns?.[0] as unknown as MockElement)?.innerHTML).toContain('Вариант 1');

      // Select option 0
      dialogueOverlay.selectOption(0);

      expect(dialogueSystem.getCurrentNode()?.id).toBe('node_end_1');
      expect(container?.innerHTML).toContain('Выбран 1');
    });

    it('hides overlay when dialogue finishes', () => {
      dialogueSystem.startDialogue('tree_test_linear');
      dialogueSystem.advance();
      dialogueSystem.advance(); // Finished

      expect(dialogueOverlay.isVisible()).toBe(false);
    });
  });

  describe('HoloConsoleUI Component', () => {
    let holoConsole: HoloConsoleUI;
    let mockConsoleController: CentralServerConsoleController;

    beforeEach(() => {
      mockConsoleController = {
        selectProtocol: vi.fn().mockReturnValue({ success: true, choice: 'A', branch: 'quest_14_finale_ideal' }),
      } as unknown as CentralServerConsoleController;

      holoConsole = new HoloConsoleUI({
        consoleController: mockConsoleController,
      });
    });

    afterEach(() => {
      holoConsole.destroy();
    });

    it('opens and renders 3 protocol options (A, B, C)', () => {
      expect(holoConsole.isOpen()).toBe(false);
      holoConsole.open();
      expect(holoConsole.isOpen()).toBe(true);

      const container = holoConsole.getContainer();
      expect(container?.innerHTML).toContain('ЦЕНТРАЛЬНЫЙ СЕРВЕР: «КОД НАСЛЕДИЯ»');
      const optionCards = container?.querySelectorAll('.holo-option-card');
      expect(optionCards?.length).toBe(3);
    });

    it('triggers selectProtocol with Option A routing to Final A Ideal', () => {
      const onSelect = vi.fn();
      const consoleWithCb = new HoloConsoleUI({
        consoleController: mockConsoleController,
        onSelect,
      });
      consoleWithCb.open();

      const res = consoleWithCb.selectProtocol(0);
      expect(res?.choice).toBe('A');
      expect(res?.branch).toBe('quest_14_finale_ideal');
      expect(mockConsoleController.selectProtocol).toHaveBeenCalledWith(0);
      expect(onSelect).toHaveBeenCalledWith('A', 'quest_14_finale_ideal');
      expect(consoleWithCb.isOpen()).toBe(false);
      consoleWithCb.destroy();
    });

    it('triggers selectProtocol with Option B/C routing to Final B Pragmatic', () => {
      holoConsole.open();
      const resB = holoConsole.selectProtocol(1);
      expect(resB?.choice).toBe('B');
      expect(resB?.branch).toBe('quest_15_finale_pragmatic');

      holoConsole.open();
      const resC = holoConsole.selectProtocol(2);
      expect(resC?.choice).toBe('C');
      expect(resC?.branch).toBe('quest_15_finale_pragmatic');
    });

    it('rejects out of bounds protocol indices safely', () => {
      expect(holoConsole.selectProtocol(-1)).toBeNull();
      expect(holoConsole.selectProtocol(3)).toBeNull();
    });
  });
});

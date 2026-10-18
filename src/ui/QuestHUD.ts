/**
 * Project Sentinel - QuestHUD Overlay
 * HTML5 DOM overlay component listening to QuestSystem events and rendering
 * the active quest title, objectives list, and completion status into #quest-tracker.
 */

import { QuestSystem } from '../game/systems/QuestSystem';
import type { CampaignQuestRecord, CampaignQuestObjective } from '../types/campaign';

export interface QuestHUDConfig {
  containerId?: string;
  language?: 'ru' | 'en';
}

export class QuestHUD {
  private questSystem: QuestSystem;
  private container: HTMLElement | null = null;
  private language: 'ru' | 'en' = 'ru';
  private unsubscribeFns: Array<() => void> = [];

  constructor(questSystem: QuestSystem, config?: QuestHUDConfig) {
    this.questSystem = questSystem;
    this.language = config?.language ?? 'ru';

    if (typeof document !== 'undefined') {
      const containerId = config?.containerId ?? 'quest-tracker';
      let el = document.getElementById(containerId);
      if (!el) {
        // Try fallback to existing hud-quest or create inside ui-container
        const parent = document.getElementById('ui-container') || document.body;
        el = document.createElement('div');
        el.id = containerId;
        el.className = 'hud-panel quest-hud';
        parent.appendChild(el);
      }
      this.container = el;
    }

    this.bindEvents();
    this.render();
  }

  private bindEvents(): void {
    this.unsubscribeFns.push(this.questSystem.on('questStarted', () => this.render()));
    this.unsubscribeFns.push(this.questSystem.on('objectiveCompleted', () => this.render()));
    this.unsubscribeFns.push(this.questSystem.on('questCompleted', () => this.render()));
    this.unsubscribeFns.push(this.questSystem.on('questAvailable', () => this.render()));
    this.unsubscribeFns.push(this.questSystem.on('branchSelected', () => this.render()));
  }

  public setLanguage(lang: 'ru' | 'en'): void {
    if (this.language !== lang) {
      this.language = lang;
      this.render();
    }
  }

  public getContainer(): HTMLElement | null {
    return this.container;
  }

  public render(): void {
    if (!this.container) return;

    const activeQuest = this.questSystem.getActiveQuest() as (CampaignQuestRecord & { title?: string; description?: string }) | null;
    const isRu = this.language === 'ru';

    if (!activeQuest) {
      this.container.innerHTML = `
        <div class="quest-header">
          <span class="quest-badge empty">SYS</span>
          <h2 class="quest-title">${isRu ? 'Нет активных заданий' : 'No Active Mission'}</h2>
        </div>
        <p class="quest-status">${isRu ? 'Ожидание директивы...' : 'Awaiting mission directives...'}</p>
      `;
      return;
    }

    const questState = this.questSystem.getQuestState(activeQuest.id);
    const completedSet = new Set(questState?.completedObjectives ?? []);
    const title = isRu
      ? (activeQuest.titleRu || activeQuest.title || '')
      : (activeQuest.titleEn || activeQuest.title || activeQuest.titleRu || '');
    const description = isRu
      ? (activeQuest.descriptionRu || activeQuest.descriptionEn || activeQuest.description || '')
      : (activeQuest.descriptionEn || activeQuest.description || activeQuest.descriptionRu || '');
    const act = activeQuest.act ? `ACT ${activeQuest.act}` : 'CAMPAIGN';

    const objectivesHtml = (activeQuest.objectives ?? [])
      .map((obj: CampaignQuestObjective, index: number) => {
        const isDone = completedSet.has(obj.id);
        const objDesc = isRu
          ? (obj.descriptionRu || obj.description || '')
          : (obj.descriptionEn || obj.description || obj.descriptionRu || '');
        const statusClass = isDone ? 'objective-done' : 'objective-pending';
        const checkIcon = isDone ? '✓' : '○';

        return `
          <li class="quest-objective-item ${statusClass}" data-objective-id="${obj.id}">
            <span class="objective-bullet">${checkIcon}</span>
            <span class="objective-text">${index + 1}. ${objDesc}</span>
          </li>
        `;
      })
      .join('');

    this.container.innerHTML = `
      <div class="quest-header">
        <span class="quest-badge act-badge">${act}</span>
        <h2 class="quest-title">${title}</h2>
      </div>
      <p class="quest-desc">${description}</p>
      <ul class="quest-objectives-list">
        ${objectivesHtml}
      </ul>
    `;
  }

  public destroy(): void {
    for (const unsub of this.unsubscribeFns) {
      unsub();
    }
    this.unsubscribeFns = [];
    if (this.container && this.container.parentNode) {
      this.container.innerHTML = '';
    }
    this.container = null;
  }
}

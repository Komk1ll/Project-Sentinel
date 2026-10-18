/**
 * Project Sentinel - HoloConsoleUI
 * Modal overlay for the Central Server Terminal (Quest 13 Recovery Protocol Selection).
 * Presents interactive vector options:
 *   - Choice A: Full Reflash (Полная перепрошивка) -> Final A Ideal
 *   - Choice B: Emergency Reset (Аварийный сброс) -> Final B Pragmatic
 *   - Choice C: Autonomous Quarantine (Автономный карантин) -> Final B Pragmatic
 */

import { CentralServerConsoleController } from '../game/systems/ServerRecoveryProtocolSystem';
import type { EndingChoice, CampaignEndingBranch } from '../types/campaign';

export interface HoloConsoleUIConfig {
  containerId?: string;
  consoleController?: CentralServerConsoleController;
  onSelect?: (choice: EndingChoice, branch: CampaignEndingBranch) => void;
  language?: 'ru' | 'en';
}

export class HoloConsoleUI {
  private container: HTMLElement | null = null;
  private consoleController?: CentralServerConsoleController;
  private onSelectCallback?: (choice: EndingChoice, branch: CampaignEndingBranch) => void;
  private language: 'ru' | 'en' = 'ru';
  private opened: boolean = false;
  private selectedChoice: EndingChoice | null = null;

  constructor(config?: HoloConsoleUIConfig) {
    this.consoleController = config?.consoleController;
    this.onSelectCallback = config?.onSelect;
    this.language = config?.language ?? 'ru';

    if (typeof document !== 'undefined') {
      const containerId = config?.containerId ?? 'holo-console';
      let el = document.getElementById(containerId);
      if (!el) {
        const parent = document.getElementById('ui-container') || document.body;
        el = document.createElement('div');
        el.id = containerId;
        el.className = 'modal-overlay holo-console-modal';
        parent.appendChild(el);
      }
      this.container = el;
      this.container.style.display = 'none';
      this.attachClickHandler();
    }
  }

  private attachClickHandler(): void {
    if (!this.container) return;

    this.container.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest<HTMLElement>('.holo-option-btn');
      if (btn) {
        const idxStr = btn.dataset.optionIndex;
        if (idxStr !== undefined) {
          const index = parseInt(idxStr, 10);
          if (!isNaN(index)) {
            this.selectProtocol(index);
          }
        }
      }
    });
  }

  public open(): void {
    this.opened = true;
    if (this.container) {
      this.container.style.display = 'flex';
      this.render();
    }
  }

  public close(): void {
    this.opened = false;
    if (this.container) {
      this.container.style.display = 'none';
      this.container.innerHTML = '';
    }
  }

  public isOpen(): boolean {
    return this.opened;
  }

  public getSelectedChoice(): EndingChoice | null {
    return this.selectedChoice;
  }

  public setLanguage(lang: 'ru' | 'en'): void {
    this.language = lang;
    if (this.opened) {
      this.render();
    }
  }

  public selectProtocol(index: number): { success: boolean; choice: EndingChoice; branch: CampaignEndingBranch } | null {
    if (index < 0 || index > 2) {
      return null;
    }

    const choice: EndingChoice = index === 0 ? 'A' : index === 1 ? 'B' : 'C';
    const branch: CampaignEndingBranch = choice === 'A' ? 'quest_14_finale_ideal' : 'quest_15_finale_pragmatic';

    this.selectedChoice = choice;

    if (this.consoleController) {
      this.consoleController.selectProtocol(index);
    }

    this.onSelectCallback?.(choice, branch);
    this.close();

    return { success: true, choice, branch };
  }

  public getContainer(): HTMLElement | null {
    return this.container;
  }

  public render(): void {
    if (!this.container || !this.opened) return;

    const isRu = this.language === 'ru';

    const headerTitle = isRu
      ? 'ЦЕНТРАЛЬНЫЙ СЕРВЕР: «КОД НАСЛЕДИЯ»'
      : 'CENTRAL SERVER: "CODE OF LEGACY"';
    const subtitle = isRu
      ? 'Выберите финальный вектор восстановления сети кампуса:'
      : 'Select final campus recovery deployment vector:';

    const options = [
      {
        index: 0,
        code: 'A',
        title: isRu ? 'Полная перепрошивка (А)' : 'Full Reflash (A)',
        desc: isRu
          ? 'Восстановление сети кампуса и сохранение всех исторических архивов. Роботы возвращаются в штатный дружелюбный режим.'
          : 'Restore campus network and preserve all historical archives. Robots return to standard docile mode.',
        outcome: isRu ? 'ФИНАЛ А: Идеальный (Праздник во дворе)' : 'FINAL A: Ideal (Campus Celebration)',
        cssClass: 'option-a',
      },
      {
        index: 1,
        code: 'B',
        title: isRu ? 'Аварийный сброс (Б)' : 'Emergency Reset (B)',
        desc: isRu
          ? 'Полное обесточивание и безопасная аппаратная консервация всех роботов. Исключает любые риски повторного заражения.'
          : 'Complete depowering and hardware preservation of all robots. Eliminates all secondary infection risks.',
        outcome: isRu ? 'ФИНАЛ Б: Прагматичный (Волонтёрская уборка)' : 'FINAL B: Pragmatic (Volunteer Cleanup)',
        cssClass: 'option-b',
      },
      {
        index: 2,
        code: 'C',
        title: isRu ? 'Автономный карантин (В)' : 'Autonomous Quarantine (C)',
        desc: isRu
          ? 'Модульная изоляция повреждённых блоков с разборкой на запасные части для студенческих лабораторий.'
          : 'Modular isolation of compromised units with hardware disassembly for student laboratory rebuilds.',
        outcome: isRu ? 'ФИНАЛ Б: Прагматичный (Волонтёрская уборка)' : 'FINAL B: Pragmatic (Volunteer Cleanup)',
        cssClass: 'option-c',
      },
    ];

    const cardsHtml = options
      .map(
        (opt) => `
        <div class="holo-option-card ${opt.cssClass}">
          <div class="holo-card-header">
            <span class="holo-code-badge">${opt.code}</span>
            <h3 class="holo-card-title">${opt.title}</h3>
          </div>
          <p class="holo-card-desc">${opt.desc}</p>
          <div class="holo-card-outcome">${opt.outcome}</div>
          <button class="holo-option-btn" data-option-index="${opt.index}">
            ${isRu ? 'Активировать протокол' : 'Activate Protocol'}
          </button>
        </div>
      `
      )
      .join('');

    this.container.innerHTML = `
      <div class="holo-console-dialog">
        <div class="holo-console-header">
          <div class="holo-terminal-icon">⚡</div>
          <div class="holo-title-group">
            <h2 class="holo-console-title">${headerTitle}</h2>
            <p class="holo-console-subtitle">${subtitle}</p>
          </div>
        </div>
        <div class="holo-options-grid">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  public destroy(): void {
    this.close();
    if (this.container && this.container.parentNode) {
      this.container.innerHTML = '';
    }
    this.container = null;
  }
}

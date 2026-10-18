/**
 * Project Sentinel - DialogueOverlay
 * HTML5 DOM overlay component listening to DialogueSystem events and rendering
 * the speaker persona, avatar, dialogue text, and interactive choices into #dialogue-box.
 */

import { DialogueSystem } from '../game/systems/DialogueSystem';
import type { DialogueStateSnapshot, LocalizedOption } from '../types/campaign';

export interface DialogueOverlayConfig {
  containerId?: string;
  onAdvance?: () => void;
  onOptionSelected?: (index: number) => void;
}

export class DialogueOverlay {
  private dialogueSystem: DialogueSystem;
  private container: HTMLElement | null = null;
  private unsubscribeStateChange: (() => void) | null = null;
  private currentSnapshot: DialogueStateSnapshot | null = null;

  constructor(dialogueSystem: DialogueSystem, config?: DialogueOverlayConfig) {
    this.dialogueSystem = dialogueSystem;

    if (typeof document !== 'undefined') {
      const containerId = config?.containerId ?? 'dialogue-box';
      let el = document.getElementById(containerId);
      if (!el) {
        const parent = document.getElementById('ui-container') || document.body;
        el = document.createElement('div');
        el.id = containerId;
        el.className = 'hud-panel dialogue-box';
        parent.appendChild(el);
      }
      this.container = el;
      this.container.style.display = 'none';
      this.attachClickHandler();
    }

    this.unsubscribeStateChange = this.dialogueSystem.onStateChange((snapshot) => {
      this.render(snapshot);
    });
  }

  private attachClickHandler(): void {
    if (!this.container) return;

    this.container.addEventListener('click', (e: MouseEvent | unknown) => {
      const ev = e as { target?: unknown };
      const target = (ev?.target ?? this.container) as HTMLElement;

      const optionBtn = typeof target?.closest === 'function'
        ? target.closest<HTMLElement>('.dialogue-option-btn')
        : null;

      if (optionBtn) {
        const idxStr = optionBtn.dataset?.index ?? (typeof (optionBtn as unknown as { getAttribute: (k: string) => string }).getAttribute === 'function' ? (optionBtn as unknown as { getAttribute: (k: string) => string }).getAttribute('data-index') : undefined);
        if (idxStr !== undefined) {
          const index = parseInt(idxStr, 10);
          if (!isNaN(index)) {
            this.selectOption(index);
          }
        }
        return;
      }

      // Handle advance button or background click when not branching
      if (this.currentSnapshot?.active && !this.currentSnapshot.isBranching) {
        this.advance();
      }
    });
  }

  public advance(): void {
    if (this.currentSnapshot?.active && !this.currentSnapshot.isBranching) {
      this.dialogueSystem.advance();
    }
  }

  public selectOption(index: number): void {
    if (this.currentSnapshot?.active && this.currentSnapshot.isBranching) {
      this.dialogueSystem.selectOption(index);
    }
  }

  public getContainer(): HTMLElement | null {
    return this.container;
  }

  public isVisible(): boolean {
    return this.container ? this.container.style.display !== 'none' : false;
  }

  public render(snapshot: DialogueStateSnapshot): void {
    this.currentSnapshot = snapshot;
    if (!this.container) return;

    if (!snapshot.active) {
      this.container.style.display = 'none';
      this.container.innerHTML = '';
      return;
    }

    this.container.style.display = 'block';

    const isRu = snapshot.language === 'ru';
    const speakerId = snapshot.speaker ?? 'system';
    const speakerName = snapshot.speakerName || (isRu ? 'Система' : 'System');
    const speakerTitle = snapshot.speakerTitle ? `<span class="speaker-title">${snapshot.speakerTitle}</span>` : '';
    const isRadio = snapshot.isRadio;
    const radioBadge = isRadio ? `<span class="badge badge-radio">📻 RADIO</span>` : '';

    const optionsHtml = snapshot.isBranching && snapshot.options.length > 0
      ? `
        <div class="dialogue-options">
          ${snapshot.options
            .map(
              (opt: LocalizedOption) => `
            <button class="dialogue-option-btn" data-index="${opt.index}">
              <span class="option-idx">${opt.index + 1}</span>
              <span class="option-label">${opt.label}</span>
            </button>
          `
            )
            .join('')}
        </div>
      `
      : `
        <div class="dialogue-footer">
          <button class="dialogue-advance-btn">${isRu ? 'Далее ▶' : 'Continue ▶'}</button>
        </div>
      `;

    this.container.innerHTML = `
      <div class="dialogue-inner speaker-theme-${speakerId}">
        <div class="dialogue-header">
          <div class="speaker-avatar avatar-${speakerId}"></div>
          <div class="speaker-meta">
            <div class="speaker-name-row">
              <span class="speaker-name">${speakerName}</span>
              ${radioBadge}
            </div>
            ${speakerTitle}
          </div>
        </div>
        <div class="dialogue-body">
          <p class="dialogue-text">${snapshot.text}</p>
        </div>
        ${optionsHtml}
      </div>
    `;
  }

  public destroy(): void {
    if (this.unsubscribeStateChange) {
      this.unsubscribeStateChange();
      this.unsubscribeStateChange = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
      this.container.style.display = 'none';
    }
    this.container = null;
    this.currentSnapshot = null;
  }
}

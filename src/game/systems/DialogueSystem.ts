/**
 * Project Sentinel - DialogueEngine Subsystem
 * Implements multi-speaker narrative playback, bilingual localization (RU/EN),
 * branching option menus (Quest 13 protocol selection), radio queuing for Curator,
 * auto-advance timers, and event trigger callbacks.
 */

import type {
  DialogueDatabase,
  DialogueEventListener,
  DialogueLanguage,
  DialogueNode,
  DialogueStateListener,
  DialogueStateSnapshot,
  DialogueTree,
  IDialogueEngine,
  LocalizedOption,
  SpeakerMetadata,
} from '@/types/campaign';
import defaultDialogueJson from '@/content/quests/dialogues.json';

export class DialogueSystem implements IDialogueEngine {
  private database: DialogueDatabase = { speakers: {}, trees: {} };
  private language: DialogueLanguage = 'ru';

  private activeTree: DialogueTree | null = null;
  private currentNode: DialogueNode | null = null;
  private onCompleteCallback: (() => void) | null = null;

  // Radio transmission FIFO queue
  private radioQueue: Array<{
    treeId: string;
    onComplete?: () => void;
    priority: number;
  }> = [];

  // Queue boundary protection: prevents rapid advance calls from bleeding through
  // and auto-skipping freshly queued transmissions before consumer renders them
  private queueTransitionTimestamp: number = 0;
  private queueCooldownMs: number = 250;

  // Auto-advance timer reference
  private autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;

  // Subscribed listeners
  private eventListeners: Set<DialogueEventListener> = new Set();
  private stateListeners: Set<DialogueStateListener> = new Set();

  constructor(
    initialData?: DialogueDatabase,
    initialLanguage: DialogueLanguage = 'ru',
    options?: { queueCooldownMs?: number }
  ) {
    this.database = initialData ?? (defaultDialogueJson as unknown as DialogueDatabase);
    this.language = initialLanguage;
    if (options?.queueCooldownMs !== undefined) {
      this.queueCooldownMs = options.queueCooldownMs;
    }
  }

  public setQueueCooldown(ms: number): void {
    this.queueCooldownMs = ms;
  }

  public setLanguage(lang: DialogueLanguage): void {
    if (this.language !== lang) {
      this.language = lang;
      this.notifyStateChange();
    }
  }

  public getLanguage(): DialogueLanguage {
    return this.language;
  }

  public loadDatabase(data: DialogueDatabase): void {
    this.database = data;
  }

  public registerSpeaker(metadata: SpeakerMetadata): void {
    (this.database.speakers as Record<string, SpeakerMetadata>)[metadata.id] = metadata;
  }

  public registerTree(tree: DialogueTree): void {
    (this.database.trees as Record<string, DialogueTree>)[tree.id] = tree;
  }

  public isActive(): boolean {
    return this.activeTree !== null && this.currentNode !== null;
  }

  public isRadioActive(): boolean {
    return this.isActive() && (this.activeTree?.isRadio === true || this.currentNode?.isRadio === true);
  }

  public isBranching(): boolean {
    return this.currentNode !== null && Array.isArray(this.currentNode.options) && this.currentNode.options.length > 0;
  }

  public getCurrentNode(): DialogueNode | null {
    return this.currentNode;
  }

  public getCurrentSpeaker(): SpeakerMetadata | null {
    if (!this.currentNode) return null;
    const speakerId = this.currentNode.speaker;
    const meta = this.database.speakers[speakerId];
    if (meta) return meta;

    return {
      id: speakerId,
      nameRu: speakerId,
      nameEn: speakerId,
      titleRu: '',
      titleEn: '',
      avatar: `avatar_${speakerId}`,
      theme: 'standard',
    };
  }

  public getQueuedRadioCount(): number {
    return this.radioQueue.length;
  }

  /**
   * Starts a dialogue tree. If a dialogue is currently active:
   * - If the requested tree is marked as radio, it gets enqueued.
   * - If an interactive dialogue is active, regular dialogues will return false (rejected).
   */
  public startDialogue(treeId: string, onComplete?: () => void): boolean {
    const tree = this.database.trees[treeId];
    if (!tree) {
      console.warn(`[DialogueSystem] Tree not found: ${treeId}`);
      return false;
    }

    // If dialogue currently playing
    if (this.isActive()) {
      if (tree.isRadio) {
        return this.enqueueRadio(treeId, onComplete);
      }
      // Cannot interrupt an active interactive dialogue unless stopped
      return false;
    }

    this.activeTree = tree;
    this.onCompleteCallback = onComplete ?? null;

    const initialNode = tree.nodes[tree.initialNodeId];
    if (!initialNode) {
      console.error(`[DialogueSystem] Initial node '${tree.initialNodeId}' not found in tree '${treeId}'`);
      this.stopDialogue();
      this.processNextInQueue();
      return false;
    }

    this.setNode(initialNode);
    this.emitEvent('DIALOGUE_STARTED', { treeId, questId: tree.questId });
    return true;
  }

  /**
   * Enqueues a radio transmission into the queue sorted by priority (FIFO for equal priority).
   */
  public enqueueRadio(treeId: string, onComplete?: () => void): boolean {
    const tree = this.database.trees[treeId];
    if (!tree) return false;

    const priority = tree.priority ?? 0;

    // Insert maintaining descending priority
    let inserted = false;
    for (let i = 0; i < this.radioQueue.length; i++) {
      const item = this.radioQueue[i];
      if (item && priority > item.priority) {
        this.radioQueue.splice(i, 0, { treeId, onComplete, priority });
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.radioQueue.push({ treeId, onComplete, priority });
    }

    this.emitEvent('RADIO_ENQUEUED', { treeId, queueLength: this.radioQueue.length });

    // If no dialogue is playing right now, immediately start the queued radio
    if (!this.isActive()) {
      this.processNextInQueue();
    }

    return true;
  }

  /**
   * Advances the dialogue. Returns the new node or null if the dialogue finished.
   */
  public advance(): DialogueNode | null {
    if (!this.isActive() || !this.currentNode) {
      return null;
    }

    // If current node has options, player must choose an option instead of blindly advancing
    if (this.isBranching()) {
      return this.currentNode;
    }

    // Queue boundary protection: if this dialogue was started from the radio queue within
    // the cooldown window (e.g. rapid advance click burst from preceding dialogue), absorb
    // the input and keep the current node active until the consumer has had time to render it.
    if (this.queueTransitionTimestamp > 0) {
      const elapsed = Date.now() - this.queueTransitionTimestamp;
      if (elapsed < this.queueCooldownMs) {
        return this.currentNode;
      }
      this.queueTransitionTimestamp = 0;
    }

    this.clearAutoAdvanceTimer();

    const nextNodeId = this.currentNode.next;
    if (!nextNodeId) {
      // End of this dialogue tree
      this.finishCurrentDialogue();
      return null;
    }

    const nextNode = this.activeTree?.nodes[nextNodeId];
    if (!nextNode) {
      console.warn(`[DialogueSystem] Next node '${nextNodeId}' missing in tree '${this.activeTree?.id}'`);
      this.finishCurrentDialogue();
      return null;
    }

    this.setNode(nextNode);
    return this.currentNode;
  }

  /**
   * Selects an option by index when at a branching choice node.
   */
  public selectOption(optionIndex: number): DialogueNode | null {
    if (!this.isActive() || !this.currentNode || !this.isBranching()) {
      return null;
    }

    const options = this.currentNode.options;
    if (
      !options ||
      typeof optionIndex !== 'number' ||
      !Number.isInteger(optionIndex) ||
      optionIndex < 0 ||
      optionIndex >= options.length
    ) {
      console.warn(`[DialogueSystem] Invalid option index ${optionIndex}`);
      return null;
    }

    const selected = options[optionIndex];
    if (!selected) {
      return null;
    }

    // Emit option selected events
    this.emitEvent('DIALOGUE_OPTION_SELECTED', {
      nodeId: this.currentNode.id,
      optionId: selected.id,
      actionFlag: selected.actionFlag,
      endingChoice: selected.endingChoice,
    });

    if (selected.onSelectEvent) {
      this.emitEvent(selected.onSelectEvent, { endingChoice: selected.endingChoice });
    }

    if (selected.onSelect) {
      try {
        selected.onSelect();
      } catch (err) {
        console.error(`[DialogueSystem] Error in option onSelect callback:`, err);
      }
    }

    // Transition to the target node
    const nextNode = this.activeTree?.nodes[selected.nextNodeId];
    if (!nextNode) {
      console.error(`[DialogueSystem] Option target node '${selected.nextNodeId}' missing`);
      this.finishCurrentDialogue();
      return null;
    }

    this.setNode(nextNode);
    return this.currentNode;
  }

  public stopDialogue(): void {
    this.clearAutoAdvanceTimer();
    this.activeTree = null;
    this.currentNode = null;
    this.onCompleteCallback = null;
    this.queueTransitionTimestamp = 0;
    this.notifyStateChange();
  }

  private setNode(node: DialogueNode): void {
    this.clearAutoAdvanceTimer();
    this.currentNode = node;

    // Trigger audio cue if specified
    if (node.audioCue) {
      this.emitEvent('PLAY_SFX', { sfx: node.audioCue });
    }

    // Trigger embedded node events
    if (node.events && node.events.length > 0) {
      for (const ev of node.events) {
        this.emitEvent(ev.event, ev.payload);
      }
    }

    // Setup auto-advance if node specifies mode === 'auto_advance'
    if (node.mode === 'auto_advance') {
      const delay = node.autoAdvanceDelayMs ?? 3500;
      this.autoAdvanceTimer = setTimeout(() => {
        this.advance();
      }, delay);
    }

    this.notifyStateChange();
  }

  private finishCurrentDialogue(): void {
    const completedTreeId = this.activeTree?.id ?? '';
    const completionFlag = this.activeTree?.onCompleteFlag;
    const completionEvent = this.activeTree?.onCompleteEvent;
    const callback = this.onCompleteCallback;

    this.stopDialogue();

    if (completionFlag) {
      this.emitEvent('SET_WORLD_FLAG', { flag: completionFlag, value: true });
    }
    if (completionEvent) {
      this.emitEvent(completionEvent, { treeId: completedTreeId });
    }

    this.emitEvent('DIALOGUE_COMPLETED', { treeId: completedTreeId });

    if (callback) {
      try {
        callback();
      } catch (err) {
        console.error(`[DialogueSystem] Error in onComplete callback for tree '${completedTreeId}':`, err);
      }
    }

    // Process queued radio transmissions
    this.processNextInQueue();
  }

  private processNextInQueue(): void {
    if (this.isActive() || this.radioQueue.length === 0) {
      return;
    }

    const next = this.radioQueue.shift();
    if (next) {
      this.queueTransitionTimestamp = Date.now();
      this.startDialogue(next.treeId, next.onComplete);
    }
  }

  private clearAutoAdvanceTimer(): void {
    if (this.autoAdvanceTimer !== null) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }

  public getStateSnapshot(): DialogueStateSnapshot {
    const active = this.isActive();
    const speakerMeta = this.getCurrentSpeaker();
    const isRu = this.language === 'ru';

    const options: LocalizedOption[] = (this.currentNode?.options ?? []).map((opt, index) => ({
      index,
      id: opt.id,
      label: isRu ? opt.labelRu : opt.labelEn,
      nextNodeId: opt.nextNodeId,
    }));

    return {
      active,
      treeId: this.activeTree?.id ?? null,
      currentNodeId: this.currentNode?.id ?? null,
      speaker: this.currentNode?.speaker ?? null,
      speakerName: speakerMeta ? (isRu ? speakerMeta.nameRu : speakerMeta.nameEn) : '',
      speakerTitle: speakerMeta ? (isRu ? speakerMeta.titleRu : speakerMeta.titleEn) : '',
      text: this.currentNode ? (isRu ? this.currentNode.textRu : this.currentNode.textEn) : '',
      language: this.language,
      isRadio: this.isRadioActive(),
      isBranching: this.isBranching(),
      options,
      queuedRadioCount: this.radioQueue.length,
    };
  }

  public onEvent(listener: DialogueEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  public onStateChange(listener: DialogueStateListener): () => void {
    this.stateListeners.add(listener);
    // Send immediate snapshot upon registration
    listener(this.getStateSnapshot());
    return () => this.stateListeners.delete(listener);
  }

  private emitEvent(event: string, payload?: unknown): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event, payload);
      } catch (err) {
        console.error(`[DialogueSystem] Listener error on event '${event}':`, err);
      }
    }
  }

  private notifyStateChange(): void {
    const snapshot = this.getStateSnapshot();
    for (const listener of this.stateListeners) {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('[DialogueSystem] State change listener error:', err);
      }
    }
  }
}

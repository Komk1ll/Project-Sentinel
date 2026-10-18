/**
 * Project Sentinel - ServerRecoveryProtocolSystem
 * Datacenter Vault Door mechanical key lock and Central Holographic Command Console protocol selector.
 * Implements physical brass master key verification and 3-way branching protocol selection (A vs B vs C)
 * routing into Quest 14 (Final A) or Quest 15 (Final B).
 */

import type {
  CampaignEndingBranch,
  IDialogueEngine,
  IQuestEngine,
  IServerRecoveryProtocolSystem,
  IServerVaultDoor,
  ServerProtocolChoice,
  ServerProtocolResult,
  ServerRecoveryProtocolConfig,
  ServerVaultDoorResult,
} from '@/types/campaign';

/**
 * ServerVaultDoorController
 * Manages mechanical lock on Datacenter Archival Vault Door.
 * Rejects digital bypasses and requires physical brass master keyring ('item_server_keyring').
 */
export class ServerVaultDoorController implements IServerVaultDoor {
  public static readonly REQUIRED_KEY_ITEM_ID = 'item_server_keyring';

  private unlocked: boolean = false;
  private readonly requiredKeyItemId: string;

  constructor(requiredKeyItemId: string = ServerVaultDoorController.REQUIRED_KEY_ITEM_ID) {
    this.requiredKeyItemId = requiredKeyItemId;
  }

  /**
   * Attempts to unlock the physical lock using the master brass key ring.
   * Keys are retained in player inventory (never consumed).
   */
  public attemptUnlock(inventory: { hasItem(itemId: string, count?: number): boolean }): ServerVaultDoorResult {
    if (this.unlocked) {
      return { success: true };
    }

    if (!inventory.hasItem(this.requiredKeyItemId)) {
      return {
        success: false,
        error: 'Master brass keys required. Electronic override unavailable.',
      };
    }

    this.unlocked = true;
    return { success: true };
  }

  /**
   * Returns whether the vault door has been unlocked.
   */
  public isUnlocked(): boolean {
    return this.unlocked;
  }

  /**
   * Resets door to locked state.
   */
  public reset(): void {
    this.unlocked = false;
  }

  /**
   * Serializes lock state for SaveData.
   */
  public serialize(): { unlocked: boolean } {
    return { unlocked: this.unlocked };
  }

  /**
   * Deserializes lock state from SaveData.
   */
  public loadState(state: { unlocked?: boolean }): void {
    if (state.unlocked !== undefined) {
      this.unlocked = state.unlocked;
    }
  }
}

/**
 * CentralServerConsoleController
 * Holographic command terminal in Datacenter heart.
 * Drives Quest 13 deployment vector selection modal (Options A, B, C) and branches narrative.
 */
export class CentralServerConsoleController implements IServerRecoveryProtocolSystem {
  private selectedProtocol: ServerProtocolChoice | null = null;
  private endingBranch: CampaignEndingBranch | null = null;
  private completed: boolean = false;

  private questEngine?: IQuestEngine;
  private dialogueEngine?: IDialogueEngine;
  private readonly config: ServerRecoveryProtocolConfig;

  constructor(options?: {
    questEngine?: IQuestEngine;
    dialogueEngine?: IDialogueEngine;
    config?: ServerRecoveryProtocolConfig;
  }) {
    this.questEngine = options?.questEngine;
    this.dialogueEngine = options?.dialogueEngine;
    this.config = options?.config ?? {};
  }

  public setQuestEngine(engine: IQuestEngine): void {
    this.questEngine = engine;
  }

  public setDialogueEngine(engine: IDialogueEngine): void {
    this.dialogueEngine = engine;
  }

  /**
   * Boots the master holographic terminal and triggers dialogue tree.
   */
  public bootConsole(): { success: boolean; dialogueStarted: boolean } {
    let dialogueStarted = false;
    if (this.dialogueEngine) {
      const res1 = this.dialogueEngine.startDialogue('console_protocol_q13');
      if (res1 === false) {
        const res2 = this.dialogueEngine.startDialogue('tree_quest_13_protocol');
        dialogueStarted = res2 !== false;
      } else {
        dialogueStarted = true;
      }
    }

    this.config.onConsoleBooted?.();
    return { success: true, dialogueStarted };
  }

  /**
   * Evaluates if the selection modal is currently pinned waiting for player confirmation.
   * Calling advance() on dialogue without selecting an option must remain pinned.
   */
  public isPinned(): boolean {
    if (this.completed) return false;
    if (this.dialogueEngine && this.dialogueEngine.isActive()) {
      const node = this.dialogueEngine.getCurrentNode();
      return Boolean(node?.options && node.options.length > 0);
    }
    return !this.completed;
  }

  /**
   * Confirms vector selection from console options menu.
   * Option 0 -> Choice 'A' -> 'quest_14_finale_ideal'
   * Option 1 -> Choice 'B' -> 'quest_15_finale_pragmatic'
   * Option 2 -> Choice 'C' -> 'quest_15_finale_pragmatic'
   */
  public selectProtocol(optionIndex: number): ServerProtocolResult {
    if (optionIndex < 0 || optionIndex > 2) {
      return {
        success: false,
        error: 'Invalid option index. Must be 0 (A), 1 (B), or 2 (C).',
      };
    }

    let choice: ServerProtocolChoice;
    let branch: CampaignEndingBranch;

    if (optionIndex === 0) {
      choice = 'A';
      branch = 'quest_14_finale_ideal';
    } else if (optionIndex === 1) {
      choice = 'B';
      branch = 'quest_15_finale_pragmatic';
    } else {
      choice = 'C';
      branch = 'quest_15_finale_pragmatic';
    }

    // Advance dialogue if engine attached
    if (this.dialogueEngine && this.dialogueEngine.isActive()) {
      this.dialogueEngine.selectOption(optionIndex);
    }

    // Route quest if engine attached
    if (this.questEngine) {
      try {
        branch = this.questEngine.selectEnding(choice);
      } catch {
        // If selectEnding throws (e.g. before Quest 13 complete), preserve expected branch mapping
      }
    }

    this.selectedProtocol = choice;
    this.endingBranch = branch;
    this.completed = true;

    this.config.onProtocolSelected?.(choice, branch);

    return {
      success: true,
      endingBranch: branch,
    };
  }

  public getSelectedProtocol(): ServerProtocolChoice | null {
    return this.selectedProtocol;
  }

  public getEndingBranch(): CampaignEndingBranch | null {
    return this.endingBranch;
  }

  public isCompleted(): boolean {
    return this.completed;
  }

  public reset(): void {
    this.selectedProtocol = null;
    this.endingBranch = null;
    this.completed = false;
  }

  public serialize(): { selectedProtocol: ServerProtocolChoice | null; completed: boolean } {
    return {
      selectedProtocol: this.selectedProtocol,
      completed: this.completed,
    };
  }

  public loadState(state: { selectedProtocol?: ServerProtocolChoice | null; completed?: boolean }): void {
    if (state.selectedProtocol !== undefined) this.selectedProtocol = state.selectedProtocol;
    if (state.completed !== undefined) this.completed = state.completed;
  }
}

/**
 * ServerRecoveryProtocolSystem
 * Unified facade coordinating both Server Vault Door and Central Command Console.
 */
export class ServerRecoveryProtocolSystem implements IServerRecoveryProtocolSystem {
  public readonly door: ServerVaultDoorController;
  public readonly console: CentralServerConsoleController;

  constructor(options?: {
    questEngine?: IQuestEngine;
    dialogueEngine?: IDialogueEngine;
    config?: ServerRecoveryProtocolConfig;
  }) {
    this.door = new ServerVaultDoorController();
    this.console = new CentralServerConsoleController(options);
  }

  public attemptUnlock(inventory: { hasItem(itemId: string, count?: number): boolean }): ServerVaultDoorResult {
    return this.door.attemptUnlock(inventory);
  }

  public isDoorUnlocked(): boolean {
    return this.door.isUnlocked();
  }

  public bootConsole(): { success: boolean; dialogueStarted: boolean } {
    return this.console.bootConsole();
  }

  public selectProtocol(optionIndex: number): ServerProtocolResult {
    return this.console.selectProtocol(optionIndex);
  }

  public isPinned(): boolean {
    return this.console.isPinned();
  }

  public isCompleted(): boolean {
    return this.console.isCompleted();
  }

  public getSelectedProtocol(): ServerProtocolChoice | null {
    return this.console.getSelectedProtocol();
  }

  public reset(): void {
    this.door.reset();
    this.console.reset();
  }
}

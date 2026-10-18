/**
 * Project Sentinel - SwitchboardPuzzleSystem Subsystem
 * Implements ISwitchboardPuzzle contract for Laboratory Wing corridor electrical restoration.
 * Enforces strict 3-step sequence:
 *   1) isolateLine() -> 2) insertFuse() -> 3) rebootGrid()
 * Handles residual voltage warnings, circuit breaker trips, inventory validation,
 * dynamic lighting transition callback, and Professor liberation.
 */

import type {
  ISwitchboardPuzzle,
  SwitchboardPuzzleConfig,
  SwitchboardRebootResult,
  SwitchboardState,
  SwitchboardStepResult,
} from '@/types/campaign';

export class SwitchboardPuzzleSystem implements ISwitchboardPuzzle {
  private lineIsolated: boolean = false;
  private fuseInserted: boolean = false;
  private gridRebooted: boolean = false;

  private readonly inventoryChecker: (itemId: string) => boolean;
  private readonly inventoryConsumer?: (itemId: string, count: number) => boolean;
  private readonly requireTapeForIsolation: boolean;
  private readonly requiredFuseItemId: string;
  private readonly requiredTapeItemId: string;
  private readonly config: SwitchboardPuzzleConfig;

  public getRequiredFuseItemId(): string {
    return this.requiredFuseItemId;
  }

  public getRequiredTapeItemId(): string {
    return this.requiredTapeItemId;
  }

  constructor(config: SwitchboardPuzzleConfig = {}) {
    this.config = config;
    this.inventoryChecker = config.inventoryChecker ?? (() => true);
    this.inventoryConsumer = config.inventoryConsumer;
    this.requireTapeForIsolation = config.requireTapeForIsolation ?? false;
    this.requiredFuseItemId = config.requiredFuseItemId ?? 'item_module_battery';
    this.requiredTapeItemId = config.requiredTapeItemId ?? 'item_insulating_tape';

    if (config.initialState) {
      this.lineIsolated = config.initialState.lineIsolated ?? false;
      this.fuseInserted = config.initialState.fuseInserted ?? false;
      this.gridRebooted = config.initialState.gridRebooted ?? false;
    }
  }

  /**
   * Step 1: Isolates the damaged electrical line (Phase B).
   * Safe and idempotent.
   */
  public isolateLine(tapeItemId?: string): SwitchboardStepResult {
    // If tape verification is explicitly required
    if (this.requireTapeForIsolation) {
      const requiredItem = tapeItemId ?? this.requiredTapeItemId;
      if (!this.inventoryChecker(requiredItem)) {
        return {
          success: false,
          message: 'Required component missing: insulating tape needed to isolate line.',
        };
      }
      this.inventoryConsumer?.(requiredItem, 1);
    }

    this.lineIsolated = true;
    this.config.onLineIsolated?.();
    return {
      success: true,
      message: 'Line Phase B successfully isolated.',
    };
  }

  /**
   * Step 2: Inserts a replacement fuse cartridge into the switchboard.
   * Requires line to be isolated first; requires component in inventory.
   */
  public insertFuse(fuseItemId: string): SwitchboardStepResult {
    // Safety check 1: Line must be isolated first to prevent electrical arc / residual voltage
    if (!this.lineIsolated) {
      this.config.onResidualVoltageWarning?.();
      return {
        success: false,
        message: 'Danger! Line under residual voltage — isolate circuit first!',
      };
    }

    // Safety check 2: Verify component in player inventory
    if (!this.inventoryChecker(fuseItemId)) {
      return {
        success: false,
        message: 'Required component missing from inventory.',
      };
    }

    this.fuseInserted = true;
    this.inventoryConsumer?.(fuseItemId, 1);
    this.config.onFuseInserted?.(fuseItemId);

    return {
      success: true,
      message: 'Replacement fuse cartridge inserted.',
    };
  }

  /**
   * Step 3: Throws master circuit breaker to reboot electrical grid.
   * Requires both line isolation and fuse replacement.
   * Triggers power restoration callback upon success.
   */
  public rebootGrid(): SwitchboardRebootResult {
    // If already complete, return success idempotently
    if (this.lineIsolated && this.fuseInserted && this.gridRebooted) {
      return {
        success: true,
        powerRestored: true,
        message: 'Grid rebooted! Wing power fully restored.',
      };
    }

    // Interlock check: Trip breaker if line not isolated or fuse not installed
    if (!this.lineIsolated || !this.fuseInserted) {
      this.gridRebooted = false;
      const message = 'Circuit breaker tripped! Ensure line is isolated and fuse is installed.';
      this.config.onCircuitBreakerTripped?.(message);
      return {
        success: false,
        powerRestored: false,
        message,
      };
    }

    this.gridRebooted = true;
    this.config.onPowerRestored?.();

    return {
      success: true,
      powerRestored: true,
      message: 'Grid rebooted! Wing power fully restored.',
    };
  }

  /**
   * Returns snapshot of all circuit phases and completion status.
   */
  public getState(): SwitchboardState {
    return {
      lineIsolated: this.lineIsolated,
      fuseInserted: this.fuseInserted,
      gridRebooted: this.gridRebooted,
      isComplete: this.lineIsolated && this.fuseInserted && this.gridRebooted,
    };
  }

  /**
   * Resets switchboard to initial unpowered state.
   */
  public reset(): void {
    this.lineIsolated = false;
    this.fuseInserted = false;
    this.gridRebooted = false;
  }

  /**
   * Serializes switchboard state.
   */
  public serialize(): SwitchboardState {
    return this.getState();
  }

  /**
   * Deserializes switchboard state.
   */
  public loadState(state: Partial<SwitchboardState>): void {
    if (state.lineIsolated !== undefined) this.lineIsolated = state.lineIsolated;
    if (state.fuseInserted !== undefined) this.fuseInserted = state.fuseInserted;
    if (state.gridRebooted !== undefined) this.gridRebooted = state.gridRebooted;
  }
}

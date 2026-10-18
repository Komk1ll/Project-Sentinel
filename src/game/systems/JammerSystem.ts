/**
 * Project Sentinel - JammerSystem
 * Rogue signal jammer transmitter mast and electromagnetic barrier disruption subsystem.
 * Implements IJammerSystem contract.
 * Disables rogue antenna mast unlocking the Grand Lobby entrance double doors.
 */

import type { Vector2D } from '@/types';
import type {
  IJammerSystem,
  JammerApproachResult,
  JammerPulseResult,
  JammerState,
  JammerSystemConfig,
} from '@/types/campaign';

export class JammerSystem implements IJammerSystem {
  public static readonly DEFAULT_INTERFERENCE_RADIUS = 6.0;
  public static readonly DEFAULT_REPULSION_RADIUS = 3.0;
  public static readonly DEFAULT_MIN_CHARGE_MS = 1000;
  public static readonly REQUIRED_TOOL_ID = 'item_impulse_debugger';

  private disabled: boolean = false;
  private mastPosition: Vector2D = { x: 12.0, y: 15.0 };
  private interferenceRadius: number = JammerSystem.DEFAULT_INTERFERENCE_RADIUS;
  private repulsionRadius: number = JammerSystem.DEFAULT_REPULSION_RADIUS;
  private minChargeDurationMs: number = JammerSystem.DEFAULT_MIN_CHARGE_MS;
  private requiredToolId: string = JammerSystem.REQUIRED_TOOL_ID;
  private readonly config: JammerSystemConfig;

  constructor(config: JammerSystemConfig = {}) {
    this.config = config;
    if (config.mastPosition) this.mastPosition = { ...config.mastPosition };
    if (config.interferenceRadius !== undefined) this.interferenceRadius = config.interferenceRadius;
    if (config.repulsionRadius !== undefined) this.repulsionRadius = config.repulsionRadius;
    if (config.minChargeDurationMs !== undefined) this.minChargeDurationMs = config.minChargeDurationMs;
    if (config.requiredToolId) this.requiredToolId = config.requiredToolId;
  }

  /**
   * Evaluates proximity effects as player approaches the jammer transmitter mast.
   * If disabled: path is clear and safe at all distances.
   * If distance <= 3.0m: physical electromagnetic repulsion pushes player back.
   * If 3.0m < distance <= 6.0m: HUD static distortion and warning.
   * If distance > 6.0m: safe baseline.
   */
  public approach(distance: number): JammerApproachResult {
    if (this.disabled) {
      return {
        status: 'safe',
        message: 'Antenna disabled. Path clear.',
      };
    }

    if (distance <= this.repulsionRadius) {
      this.config.onRepulsionTriggered?.(distance);
      return {
        status: 'barrier_repulsion',
        message: 'Electromagnetic repulsion pushes you back.',
      };
    }

    if (distance <= this.interferenceRadius) {
      this.config.onDistortionTriggered?.(distance);
      return {
        status: 'hud_distortion',
        message: 'Warning: Strong electromagnetic interference.',
      };
    }

    return { status: 'safe' };
  }

  /**
   * Computes Euclidean distance from given player coordinates to antenna mast.
   */
  public calculateDistance(playerPos: Vector2D): number {
    return Math.hypot(this.mastPosition.x - playerPos.x, this.mastPosition.y - playerPos.y);
  }

  /**
   * Discharges high-power EMP pulse to disrupt and permanently disable the rogue transmitter.
   * Requires equipped Impulse Debugger and >= 1000ms charge time.
   */
  public disableWithPulse(equippedToolId: string, chargeTimeMs: number): JammerPulseResult {
    // If already disabled, return success idempotently
    if (this.disabled) {
      return {
        success: true,
        doorsUnlocked: true,
        error: 'Jammer is already disabled',
      };
    }

    // Tool validation
    if (equippedToolId !== this.requiredToolId) {
      return {
        success: false,
        doorsUnlocked: false,
        error: 'Impulse Debugger required',
      };
    }

    // Charge duration validation
    if (chargeTimeMs < this.minChargeDurationMs) {
      return {
        success: false,
        doorsUnlocked: false,
        error: 'Insufficient charge time',
      };
    }

    this.disabled = true;
    this.config.onDisrupted?.();

    return {
      success: true,
      doorsUnlocked: true,
    };
  }

  /**
   * Returns whether the jammer antenna is disabled.
   */
  public isDisabled(): boolean {
    return this.disabled;
  }

  /**
   * Returns snapshot of jammer state.
   */
  public getState(): JammerState {
    return {
      disabled: this.disabled,
      mastPosition: { ...this.mastPosition },
      interferenceRadius: this.interferenceRadius,
      repulsionRadius: this.repulsionRadius,
      minChargeDurationMs: this.minChargeDurationMs,
    };
  }

  /**
   * Resets jammer to active transmitter state.
   */
  public reset(): void {
    this.disabled = false;
  }

  /**
   * Serializes jammer state for SaveData.
   */
  public serialize(): { disabled: boolean } {
    return { disabled: this.disabled };
  }

  /**
   * Deserializes jammer state from SaveData.
   */
  public loadState(state: { disabled?: boolean }): void {
    if (state.disabled !== undefined) {
      this.disabled = state.disabled;
    }
  }
}

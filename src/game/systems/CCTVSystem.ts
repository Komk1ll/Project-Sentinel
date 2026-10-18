/**
 * Project Sentinel - CCTVSystem
 * Surveillance footage playback and scrubbing terminal subsystem.
 * Implements ICCTVSystem contract.
 * Discovers Robo-Dog theft of server vault master keys and path to Winter Garden.
 */

import type {
  CCTVPlaybackResult,
  CCTVState,
  CCTVSystemConfig,
  ICCTVSystem,
} from '@/types/campaign';

export class CCTVSystem implements ICCTVSystem {
  private powered: boolean = false;
  private completed: boolean = false;
  private lastScrubbedMinutes: number = 0;
  private discoveredFootageId: string | null = null;
  private clueTargetZone: string | null = null;

  private readonly minRewindMinutes: number;
  private readonly requiredFootageId: string;
  private readonly defaultClueTargetZone: string;
  private readonly config: CCTVSystemConfig;

  constructor(config: CCTVSystemConfig = {}) {
    this.config = config;
    this.powered = config.initialPowered ?? false;
    this.minRewindMinutes = config.minRewindMinutes ?? 10;
    this.requiredFootageId = config.requiredFootageId ?? 'cctv_archive_dog_heist';
    this.defaultClueTargetZone = config.clueTargetZone ?? 'zone_06_winter_garden';
  }

  /**
   * Connects or disconnects power source (wing power or backup battery).
   * Toggling power off resets terminal readiness.
   */
  public powerTerminal(batteryConnected: boolean): boolean {
    this.powered = batteryConnected;
    this.config.onPowerChanged?.(this.powered);
    return this.powered;
  }

  /**
   * Scrubs video timeline backward by specified minute offset.
   * Requires power. Must rewind at least 10 minutes to locate incident footage.
   */
  public rewind(minutes: number): CCTVPlaybackResult {
    // Power interlock
    if (!this.powered) {
      return {
        success: false,
        error: 'Terminal unpowered. Wing power or backup battery required.',
      };
    }

    // Boundary check: negative or zero or NaN
    if (minutes <= 0 || !Number.isFinite(minutes)) {
      return {
        success: false,
        error: 'Invalid timeline offset. Specify positive minutes to scrub.',
      };
    }

    // Threshold check: incident occurred ~15m ago, threshold 10m
    if (minutes < this.minRewindMinutes) {
      return {
        success: false,
        error: 'Incident occurred 15 minutes ago. Rewind further.',
      };
    }

    this.completed = true;
    this.lastScrubbedMinutes = minutes;
    this.discoveredFootageId = this.requiredFootageId;
    this.clueTargetZone = this.defaultClueTargetZone;

    const result: CCTVPlaybackResult = {
      success: true,
      footageId: this.discoveredFootageId,
      clueLocation: this.clueTargetZone,
    };

    this.config.onFootageDiscovered?.(result);
    return result;
  }

  /**
   * Returns whether the terminal is currently powered on.
   */
  public isPowered(): boolean {
    return this.powered;
  }

  /**
   * Returns whether the evidence footage has been discovered.
   */
  public isComplete(): boolean {
    return this.completed;
  }

  /**
   * Returns full state snapshot.
   */
  public getState(): CCTVState {
    return {
      powered: this.powered,
      completed: this.completed,
      lastScrubbedMinutes: this.lastScrubbedMinutes,
      discoveredFootageId: this.discoveredFootageId,
      clueTargetZone: this.clueTargetZone,
    };
  }

  /**
   * Resets terminal to unpowered and incomplete state.
   */
  public reset(): void {
    this.powered = false;
    this.completed = false;
    this.lastScrubbedMinutes = 0;
    this.discoveredFootageId = null;
    this.clueTargetZone = null;
  }

  /**
   * Serializes terminal state for SaveData.
   */
  public serialize(): CCTVState {
    return this.getState();
  }

  /**
   * Deserializes terminal state from SaveData.
   */
  public loadState(state: Partial<CCTVState>): void {
    if (state.powered !== undefined) this.powered = state.powered;
    if (state.completed !== undefined) this.completed = state.completed;
    if (state.lastScrubbedMinutes !== undefined) this.lastScrubbedMinutes = state.lastScrubbedMinutes;
    if (state.discoveredFootageId !== undefined) this.discoveredFootageId = state.discoveredFootageId;
    if (state.clueTargetZone !== undefined) this.clueTargetZone = state.clueTargetZone;
  }
}

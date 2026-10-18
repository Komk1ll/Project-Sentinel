/**
 * Project Sentinel - KeypadPuzzleSystem Subsystem
 * Implements IKeypadPuzzle contract for Dean's office basement electronic security door.
 * Validates Cybernetics Faculty founding year passcode ('1984').
 * Handles 4-digit buffer clamping, non-numeric rejection, auto-reset on error, and permanent unlocked state.
 */

import type { IKeypadPuzzle, KeypadInputResult, KeypadPuzzleConfig } from '@/types/campaign';

export class KeypadPuzzleSystem implements IKeypadPuzzle {
  private buffer: string = '';
  private unlocked: boolean = false;
  private readonly targetCode: string;
  private readonly maxDigits: number;
  private readonly config: KeypadPuzzleConfig;

  constructor(config: KeypadPuzzleConfig = {}) {
    this.config = config;
    this.targetCode = config.targetCode ?? '1984';
    this.maxDigits = config.maxDigits ?? 4;
    this.unlocked = config.initialUnlocked ?? false;
  }

  /**
   * Accepts a single numeric digit (0-9) into the input buffer.
   */
  public inputDigit(digit: number): KeypadInputResult {
    // If already unlocked, retain unlocked state and return buffer with success
    if (this.unlocked) {
      return { buffer: this.buffer, success: true };
    }

    // Reject non-integers, negative numbers, or digits > 9
    if (!Number.isInteger(digit) || digit < 0 || digit > 9) {
      this.config.onError?.(digit.toString());
      return { buffer: this.buffer, error: true };
    }

    // Clamp buffer length to maxDigits
    if (this.buffer.length >= this.maxDigits) {
      this.config.onError?.(this.buffer);
      return { buffer: this.buffer, error: true };
    }

    this.buffer += digit.toString();
    this.config.onDigitInput?.(digit, this.buffer);

    // Check completion once buffer reaches maxDigits
    if (this.buffer.length === this.maxDigits) {
      if (this.buffer === this.targetCode) {
        this.unlocked = true;
        this.config.onUnlock?.(this.buffer);
        return { buffer: this.buffer, success: true };
      } else {
        const failedCode = this.buffer;
        this.buffer = ''; // Auto-reset buffer on error
        this.config.onError?.(failedCode);
        return { buffer: failedCode, error: true };
      }
    }

    return { buffer: this.buffer };
  }

  /**
   * Clears the input buffer.
   * If the lock is already solved, the unlocked state remains permanent.
   */
  public clear(): void {
    if (!this.unlocked) {
      this.buffer = '';
    }
    this.config.onClear?.();
  }

  /**
   * Returns whether the door lock is currently unlocked.
   */
  public isUnlocked(): boolean {
    return this.unlocked;
  }

  /**
   * Returns the current input buffer string.
   */
  public getBuffer(): string {
    return this.buffer;
  }

  /**
   * Resets puzzle to locked state (for test isolation / debug).
   */
  public reset(): void {
    this.buffer = '';
    this.unlocked = false;
  }

  /**
   * Serializes state for SaveData.
   */
  public serialize(): { buffer: string; unlocked: boolean } {
    return {
      buffer: this.buffer,
      unlocked: this.unlocked,
    };
  }

  /**
   * Deserializes state from SaveData.
   */
  public loadState(state: { buffer?: string; unlocked?: boolean }): void {
    if (state.unlocked !== undefined) this.unlocked = state.unlocked;
    if (state.buffer !== undefined) this.buffer = state.buffer;
  }
}

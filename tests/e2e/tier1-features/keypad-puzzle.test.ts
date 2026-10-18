/**
 * Tier 1: Feature Coverage — Feature 14: Keypad Passcode Puzzle
 * Authoritative source: Документ.pdf p. 1–2, panel 2, PROJECT.md § Feature Inventory #14
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 1: Keypad Passcode Puzzle (Feature 14)', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('unlocks electronic door lock upon entering valid founding year code 1984', () => {
    expect(driver.keypad.isUnlocked()).toBe(false);

    expect(driver.keypad.inputDigit(1).buffer).toBe('1');
    expect(driver.keypad.inputDigit(9).buffer).toBe('19');
    expect(driver.keypad.inputDigit(8).buffer).toBe('198');

    const result = driver.keypad.inputDigit(4);
    expect(result.buffer).toBe('1984');
    expect(result.success).toBe(true);
    expect(driver.keypad.isUnlocked()).toBe(true);
  });

  it('rejects incorrect 4-digit passcode, triggers error status, and resets input buffer', () => {
    driver.keypad.inputDigit(1);
    driver.keypad.inputDigit(2);
    driver.keypad.inputDigit(3);
    const result = driver.keypad.inputDigit(4); // Code 1234 is incorrect

    expect(result.error).toBe(true);
    expect(result.buffer).toBe('1234');
    expect(driver.keypad.isUnlocked()).toBe(false);

    // After failure, buffer is automatically cleared
    const nextInput = driver.keypad.inputDigit(1);
    expect(nextInput.buffer).toBe('1');
  });

  it('clamps buffer at maximum 4 digits and rejects extra digit inputs', () => {
    driver.keypad.inputDigit(1);
    driver.keypad.inputDigit(9);
    driver.keypad.inputDigit(8);
    // Unlocked code 1984
    driver.keypad.inputDigit(4);

    // Attempting a 5th digit
    const overflow = driver.keypad.inputDigit(5);
    expect(overflow.success).toBe(true); // Remains unlocked
    expect(driver.keypad.isUnlocked()).toBe(true);
  });

  it('clears input buffer upon calling clear()', () => {
    driver.keypad.inputDigit(1);
    driver.keypad.inputDigit(9);
    driver.keypad.clear();

    const next = driver.keypad.inputDigit(5);
    expect(next.buffer).toBe('5');
  });

  it('maintains permanent unlocked state once code is solved', () => {
    driver.keypad.inputDigit(1);
    driver.keypad.inputDigit(9);
    driver.keypad.inputDigit(8);
    driver.keypad.inputDigit(4);

    expect(driver.keypad.isUnlocked()).toBe(true);

    // Calling clear or inputting more digits does not re-lock
    driver.keypad.clear();
    expect(driver.keypad.isUnlocked()).toBe(true);
  });
});

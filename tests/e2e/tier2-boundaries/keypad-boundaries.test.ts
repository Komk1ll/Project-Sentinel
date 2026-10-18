/**
 * Tier 2: Boundary & Corner Cases — Keypad Passcode Boundaries
 * Authoritative source: spec_miner_survey_1/handoff.md § Edge Cases #5, #6, #7, Документ.pdf p. 1–2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 2: Keypad Passcode Boundary & Corner Cases', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('Edge Case 1: handles incorrect passcode inputs, returning error and auto-resetting buffer', () => {
    // Input 4 incorrect digits: 9999
    driver.keypad.inputDigit(9);
    driver.keypad.inputDigit(9);
    driver.keypad.inputDigit(9);
    const result = driver.keypad.inputDigit(9);

    expect(result.error).toBe(true);
    expect(driver.keypad.isUnlocked()).toBe(false);

    // Buffer should now be cleared ready for new input
    const nextDigit = driver.keypad.inputDigit(1);
    expect(nextDigit.buffer).toBe('1');
  });

  it('Edge Case 2: unlocks successfully if player inputs code 1984 directly without reading hint monitor', () => {
    // Player enters code without checking lab monitor text first
    driver.keypad.inputDigit(1);
    driver.keypad.inputDigit(9);
    driver.keypad.inputDigit(8);
    const unlock = driver.keypad.inputDigit(4);

    expect(unlock.success).toBe(true);
    expect(driver.keypad.isUnlocked()).toBe(true);
  });

  it('Edge Case 3: rejects negative numbers or non-integer numbers with error flag', () => {
    const neg = driver.keypad.inputDigit(-1);
    expect(neg.error).toBe(true);
    expect(neg.buffer).toBe('');

    const floatNum = driver.keypad.inputDigit(1.5);
    expect(floatNum.error).toBe(true);
    expect(floatNum.buffer).toBe('');
  });

  it('Edge Case 4: clamps digit input buffer strictly at 4 digits', () => {
    driver.keypad.inputDigit(5);
    driver.keypad.inputDigit(5);
    driver.keypad.inputDigit(5);
    // Buffer has 3 digits
    const fourth = driver.keypad.inputDigit(1);
    expect(fourth.error).toBe(true); // 5551 is wrong, auto-cleared

    // Enter 1984
    driver.keypad.inputDigit(1);
    driver.keypad.inputDigit(9);
    driver.keypad.inputDigit(8);
    driver.keypad.inputDigit(4);
    expect(driver.keypad.isUnlocked()).toBe(true);

    // Any extra input after unlock does not mutate unlocked state
    const extra = driver.keypad.inputDigit(7);
    expect(extra.success).toBe(true);
  });

  it('Edge Case 5: handles repeated clear() calls on empty buffer gracefully', () => {
    driver.keypad.clear();
    driver.keypad.clear();
    driver.keypad.clear();

    const result = driver.keypad.inputDigit(1);
    expect(result.buffer).toBe('1');
  });
});

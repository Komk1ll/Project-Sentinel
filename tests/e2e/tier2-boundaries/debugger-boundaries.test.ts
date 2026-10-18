/**
 * Tier 2: Boundary & Corner Cases — Impulse Debugger Boundaries
 * Authoritative source: spec_miner_survey_1/handoff.md § Edge Cases #1, #2, Документ.pdf p. 2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 2: Impulse Debugger Boundary & Corner Cases', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('Edge Case 1: handles pulse fired when no robot is in range or line of sight', () => {
    // Attempting aim at target beyond 4.5m range
    driver.debugger.registerTarget('out_of_range_bot', 'robot', false);
    const aimed = driver.debugger.aimAt('out_of_range_bot');
    expect(aimed).toBe(false);

    // Pulse fired into open air
    const result = driver.debugger.firePulse();
    expect(result.hit).toBe(false);
    expect(result.error).toBe('Pulse dissipated into open space');
  });

  it('Edge Case 2: enforces friendly fire protection against Professor NPC', () => {
    driver.debugger.registerTarget('professor_npc', 'npc', true);
    const aimed = driver.debugger.aimAt('professor_npc');
    expect(aimed).toBe(true);

    const result = driver.debugger.firePulse();
    expect(result.hit).toBe(false);
    expect(result.error).toBe('Target is not an infected device');
  });

  it('Edge Case 3: handles rapid sequential firings without system crashes or corruption', () => {
    // First shot into open space
    const shot1 = driver.debugger.firePulse();
    expect(shot1.hit).toBe(false);

    // Second shot aimed at bot
    driver.debugger.aimAt('blocker_bot_01');
    const shot2 = driver.debugger.firePulse();
    expect(shot2.hit).toBe(true);

    // Third shot immediately after without aiming
    const shot3 = driver.debugger.firePulse();
    expect(shot3.hit).toBe(false);
  });

  it('Edge Case 4: prevents firing at already deactivated and disassembled robots', () => {
    driver.debugger.aimAt('blocker_bot_01');
    const firstShot = driver.debugger.firePulse();
    expect(firstShot.hit).toBe(true);

    // Aim again at same bot
    driver.debugger.aimAt('blocker_bot_01');
    const secondShot = driver.debugger.firePulse();
    expect(secondShot.hit).toBe(false);
    expect(secondShot.error).toBe('Target is already deactivated');
  });

  it('Edge Case 5: non-lethal pulse emits electromagnetic shockwave without causing entity destruction', () => {
    driver.debugger.aimAt('robo_dog_01');
    const result = driver.debugger.firePulse();
    expect(result.hit).toBe(true);
    // Preserves modular hardware rather than destroying
    expect(result.disassembledModules).toBeDefined();
    expect(result.disassembledModules?.length).toBeGreaterThan(0);
  });
});

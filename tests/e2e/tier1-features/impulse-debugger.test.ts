/**
 * Tier 1: Feature Coverage — Feature 12: Non-Lethal Impulse Debugger
 * Authoritative source: Документ.pdf p. 2, PROJECT.md § Feature Inventory #12
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 1: Non-Lethal Impulse Debugger (Feature 12)', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('successfully aims at target robot within range', () => {
    const aimed = driver.debugger.aimAt('blocker_bot_01');
    expect(aimed).toBe(true);
  });

  it('fails to aim at target entity that does not exist or is out of range', () => {
    const aimedMissing = driver.debugger.aimAt('ghost_bot_99');
    expect(aimedMissing).toBe(false);
  });

  it('discharges calibrated pulse at Courier Blocker Bot, achieving non-lethal deactivation', () => {
    driver.debugger.aimAt('blocker_bot_01');
    const result = driver.debugger.firePulse();

    expect(result.hit).toBe(true);
    expect(result.targetId).toBe('blocker_bot_01');
    expect(result.disassembledModules).toBeDefined();
    expect(result.disassembledModules?.length).toBe(4);
  });

  it('dissipates pulse into empty space when fired without an aimed target', () => {
    const result = driver.debugger.firePulse();
    expect(result.hit).toBe(false);
    expect(result.error).toContain('dissipated into open space');
  });

  it('enforces non-lethal safety protocol: prevents firing at friendly NPC Professor', () => {
    driver.debugger.aimAt('professor_npc');
    const result = driver.debugger.firePulse();

    expect(result.hit).toBe(false);
    expect(result.error).toBe('Target is not an infected device');
  });

  it('prevents firing at an already deactivated robot', () => {
    driver.debugger.aimAt('blocker_bot_01');
    const firstShot = driver.debugger.firePulse();
    expect(firstShot.hit).toBe(true);

    // Aim at same bot again
    driver.debugger.aimAt('blocker_bot_01');
    const secondShot = driver.debugger.firePulse();
    expect(secondShot.hit).toBe(false);
    expect(secondShot.error).toBe('Target is already deactivated');
  });
});

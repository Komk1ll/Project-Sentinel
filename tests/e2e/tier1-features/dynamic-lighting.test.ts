/**
 * Tier 1: Feature Coverage — Feature 20: Dynamic Lighting Transitions
 * Authoritative source: Документ.pdf panels 4, 8, PROJECT.md § Feature Inventory #20
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 1: Dynamic Lighting Transitions (Feature 20)', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('initializes with twilight lighting at campus exterior perimeter', () => {
    expect(driver.diorama.getLightingState()).toBe('twilight');
  });

  it('transitions to dark emergency lighting upon entering laboratory corridor (Act I)', async () => {
    await driver.diorama.loadZone('zone_04_lab_corridor');
    expect(driver.diorama.getLightingState()).toBe('dark_emergency');
  });

  it('triggers lighting transition from dark emergency to warm restored upon switchboard reboot', async () => {
    await driver.diorama.loadZone('zone_04_lab_corridor');
    expect(driver.diorama.getLightingState()).toBe('dark_emergency');

    // Perform 3-step switchboard repair
    driver.addItem('item_module_battery', 1);
    driver.switchboard.isolateLine();
    driver.switchboard.insertFuse('item_module_battery');
    const result = driver.switchboard.rebootGrid();

    expect(result.powerRestored).toBe(true);
    driver.diorama.setLightingState('warm_restored');

    expect(driver.diorama.getLightingState()).toBe('warm_restored');
  });

  it('transitions to festive sunny day lighting during Final A epilogue celebration', async () => {
    await driver.diorama.loadZone('zone_10_finale_celebration');
    expect(driver.diorama.getLightingState()).toBe('sunny_day');
  });

  it('transitions to tranquil dusk twilight during Final B volunteer cleanup', async () => {
    await driver.diorama.loadZone('zone_11_finale_cleanup');
    expect(driver.diorama.getLightingState()).toBe('twilight');
  });
});

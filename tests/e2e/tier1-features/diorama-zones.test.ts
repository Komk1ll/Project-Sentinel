/**
 * Tier 1: Feature Coverage — Feature 19: Diorama Zones (Acts I–IV)
 * Authoritative source: Документ.pdf p. 9, PROJECT.md § Feature Inventory #19
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver, DioramaZoneId } from '../harness';

describe('Tier 1: Diorama Zones (Acts I–IV) (Feature 19)', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('initializes in starting zone_01_gate (Perimeter Gate)', () => {
    expect(driver.diorama.getActiveZone()).toBe('zone_01_gate');
  });

  it('supports loading and transitioning across all 11 campaign diorama zones', async () => {
    const allZones: DioramaZoneId[] = [
      'zone_01_gate',
      'zone_02_deans_basement',
      'zone_03_courtyard_alley',
      'zone_04_lab_corridor',
      'zone_05_security_room',
      'zone_06_winter_garden',
      'zone_07_cable_tunnel',
      'zone_08_grand_lobby',
      'zone_09_datacenter',
      'zone_10_finale_celebration',
      'zone_11_finale_cleanup',
    ];

    for (const zone of allZones) {
      await driver.diorama.loadZone(zone);
      expect(driver.diorama.getActiveZone()).toBe(zone);
    }
  });

  it('sets emergency dark lighting automatically when entering zone_04_lab_corridor', async () => {
    await driver.diorama.loadZone('zone_04_lab_corridor');
    expect(driver.diorama.getLightingState()).toBe('dark_emergency');
  });

  it('sets sunny day lighting automatically when transitioning to zone_10_finale_celebration', async () => {
    await driver.diorama.loadZone('zone_10_finale_celebration');
    expect(driver.diorama.getLightingState()).toBe('sunny_day');
  });

  it('sets serene twilight lighting automatically when transitioning to zone_11_finale_cleanup', async () => {
    await driver.diorama.loadZone('zone_11_finale_cleanup');
    expect(driver.diorama.getLightingState()).toBe('twilight');
  });
});

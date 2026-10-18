/**
 * Tier 1: Feature Coverage — Feature 3: Dialogue System & Speaker Roles
 * Authoritative source: Документ.pdf p. 1–8, PROJECT.md § Feature Inventory #3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 1: Dialogue System & Speaker Roles (Feature 3)', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('starts dialogue tree and exposes active node with speaker metadata', () => {
    expect(driver.dialogue.isActive()).toBe(false);

    driver.dialogue.startDialogue('curator_radio_q1');
    expect(driver.dialogue.isActive()).toBe(true);

    const node = driver.dialogue.getCurrentNode();
    expect(node).not.toBeNull();
    expect(node?.id).toBe('node_1');
    expect(node?.speaker).toBe('curator');
    expect(node?.textRu).toContain('Алексей, главный вход под жёсткой сетевой блокировкой');
  });

  it('supports all canonical speaker identity roles (curator, alexey, professor, console, system)', () => {
    driver.dialogue.startDialogue('curator_radio_q1');
    expect(driver.dialogue.getCurrentNode()?.speaker).toBe('curator');

    driver.dialogue.advance();
    expect(driver.dialogue.getCurrentNode()?.speaker).toBe('alexey');

    driver.dialogue.startDialogue('professor_q4');
    expect(driver.dialogue.getCurrentNode()?.speaker).toBe('professor');

    driver.dialogue.startDialogue('console_protocol_q13');
    expect(driver.dialogue.getCurrentNode()?.speaker).toBe('console');

    driver.dialogue.selectOption(0);
    expect(driver.dialogue.getCurrentNode()?.speaker).toBe('system');
  });

  it('provides bilingual text fidelity in Russian and English', () => {
    driver.dialogue.startDialogue('curator_radio_q1');
    const node1 = driver.dialogue.getCurrentNode();
    expect(node1?.textRu).toBe('Алексей, главный вход под жёсткой сетевой блокировкой. Системы охраны сошли с ума.');
    expect(node1?.textEn).toBe('Alexey, the main entrance is under hard network lockdown. The security systems have gone mad.');

    const node2 = driver.dialogue.advance();
    expect(node2?.textRu).toBe('Понял, ухожу с линии обзора патрульных дронов, ищу обход.');
    expect(node2?.textEn).toBe('Understood, breaking line of sight with patrol drones, searching for a bypass.');
  });

  it('advances linear dialogue nodes sequentially and deactivates at termination', () => {
    driver.dialogue.startDialogue('professor_q4');
    expect(driver.dialogue.isActive()).toBe(true);

    const step1 = driver.dialogue.advance();
    expect(step1?.speaker).toBe('alexey');
    expect(step1?.textRu).toContain('Держитесь, профессор');

    const step2 = driver.dialogue.advance();
    expect(step2).toBeNull();
    expect(driver.dialogue.isActive()).toBe(false);
  });

  it('branches dialogue and executes callbacks upon option selection', () => {
    driver.dialogue.startDialogue('console_protocol_q13');
    const node = driver.dialogue.getCurrentNode();
    expect(node?.options).toBeDefined();
    expect(node?.options?.length).toBe(3);

    // Option 0: Full Reflash -> node_ending_a
    const nextA = driver.dialogue.selectOption(0);
    expect(nextA?.id).toBe('node_ending_a');
    expect(nextA?.textRu).toContain('Протокол А запущен');

    // Test Option 1 branching in fresh dialogue
    driver.dialogue.startDialogue('console_protocol_q13');
    const nextB = driver.dialogue.selectOption(1);
    expect(nextB?.id).toBe('node_ending_b');
    expect(nextB?.textRu).toContain('Протокол Б запущен');
  });

  it('invokes onComplete callback when dialogue finishes', () => {
    let completed = false;
    driver.dialogue.startDialogue('curator_radio_q1', () => {
      completed = true;
    });

    expect(completed).toBe(false);
    driver.dialogue.advance(); // node_2
    expect(completed).toBe(false);
    driver.dialogue.advance(); // termination
    expect(completed).toBe(true);
    expect(driver.dialogue.isActive()).toBe(false);
  });
});

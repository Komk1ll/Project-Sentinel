/**
 * Tier 1: Feature Coverage — Feature 18: Central Server Recovery Protocol
 * Authoritative source: Документ.pdf p. 7–8, panel 13, PROJECT.md § Feature Inventory #18
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 1: Central Server Recovery Protocol (Feature 18)', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('engages console terminal in Quest 13 and presents recovery deployment menu', () => {
    driver.dialogue.startDialogue('console_protocol_q13');
    const node = driver.dialogue.getCurrentNode();

    expect(node).not.toBeNull();
    expect(node?.speaker).toBe('console');
    expect(node?.textRu).toContain('Выберите финальный вектор развёртывания сети кампуса');
    expect(node?.options?.length).toBe(3);
  });

  it('selects Option A: Full Reflash (Полная перепрошивка) targeting system restoration', () => {
    driver.dialogue.startDialogue('console_protocol_q13');
    const nextNode = driver.dialogue.selectOption(0);

    expect(nextNode?.id).toBe('node_ending_a');
    expect(nextNode?.textRu).toContain('Протокол А запущен. Режим восстановления активен');
  });

  it('selects Option B: Emergency Reset (Аварийный сброс) targeting hardware shutdown', () => {
    driver.dialogue.startDialogue('console_protocol_q13');
    const nextNode = driver.dialogue.selectOption(1);

    expect(nextNode?.id).toBe('node_ending_b');
    expect(nextNode?.textRu).toContain('Протокол Б запущен. Аварийный карантин активен');
  });

  it('selects Option C: Autonomous Quarantine (Автономный карантин) targeting hardware shutdown', () => {
    driver.dialogue.startDialogue('console_protocol_q13');
    const nextNode = driver.dialogue.selectOption(2);

    expect(nextNode?.id).toBe('node_ending_b');
    expect(nextNode?.textRu).toContain('Протокол Б запущен');
  });

  it('prevents terminal advance until an explicit protocol option is chosen', () => {
    driver.dialogue.startDialogue('console_protocol_q13');
    const initialNode = driver.dialogue.getCurrentNode();

    // Calling advance without selectOption must remain on the options node
    const advanced = driver.dialogue.advance();
    expect(advanced?.id).toBe(initialNode?.id);
    expect(driver.dialogue.isActive()).toBe(true);
  });
});

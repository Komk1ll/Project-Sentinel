// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from '@game/core/GameEngine';
import { mountTownHud } from '@ui/town-hud';
import { AID_KIT, FIRST_AID_TEXT } from '@content/first-aid';
import { approachMaster } from '../fixtures/first-aid-route';

// Exercise the real engine input and HUD; this test does not claim WebGL rendering.
vi.mock('@game/render/ThreeRenderer', () => ({
  ThreeRenderer: class {
    render(): void {}
    destroy(): void {}
  },
}));

let engine: GameEngine;
let host: HTMLDivElement;
const pressE = (repeat = false): void => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', repeat }));
};

describe('First aid engine and HUD integration', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.append(host);
    engine = new GameEngine({ gameContainerId: 'unused', threeContainerId: 'unused' });
    engine.registerCleanup(mountTownHud(host, engine.firstAid, engine.cameraZoom));
    engine.init();
  });

  afterEach(() => {
    engine.destroy();
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows the first goal without claiming a kit or successful conversation', () => {
    expect(host.querySelector('.town-objective')?.textContent).toBe(FIRST_AID_TEXT.meetObjective);
    expect(host.querySelector('.town-inventory')?.textContent).toBe(FIRST_AID_TEXT.emptyInventory);
    expect(host.querySelector<HTMLElement>('.town-dialogue')?.hidden).toBe(true);
    expect(host.querySelector<HTMLButtonElement>('.town-interaction')?.disabled).toBe(true);
  });

  it('routes E to pickup and updates the visible objective, inventory and dialogue', () => {
    approachMaster(engine.firstAid);
    pressE();
    expect(engine.firstAid.snapshot.inventory).toEqual([AID_KIT]);
    expect(host.querySelector('.town-objective')?.textContent).toBe(FIRST_AID_TEXT.deliverObjective);
    expect(host.querySelector('.town-inventory')?.textContent).toBe(FIRST_AID_TEXT.carrying);
    expect(host.querySelector('.town-dialogue')?.textContent).toBe(FIRST_AID_TEXT.received);
    expect(host.querySelector<HTMLElement>('.town-dialogue')?.hidden).toBe(false);
  });

  it('uses the same action for clicks and keyboard without issuing a second kit', () => {
    approachMaster(engine.firstAid);
    const button = host.querySelector<HTMLButtonElement>('.town-interaction')!;
    expect(button.disabled).toBe(false);
    button.click();
    pressE();
    button.click();
    expect(engine.firstAid.snapshot.inventory).toEqual([AID_KIT]);
    expect(host.querySelector('.town-dialogue')?.textContent).toBe(FIRST_AID_TEXT.reminder);
  });

  it('ignores held E until a fresh keydown and ignores E in text fields', () => {
    approachMaster(engine.firstAid);
    pressE(true);
    expect(engine.firstAid.snapshot.inventory).toEqual([]);
    const input = document.createElement('input');
    host.append(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
    expect(engine.firstAid.snapshot.inventory).toEqual([]);
    pressE();
    expect(engine.firstAid.snapshot.inventory).toEqual([AID_KIT]);
  });

  it('does not issue a kit from a stale action after the player leaves the room', () => {
    approachMaster(engine.firstAid);
    const button = host.querySelector<HTMLButtonElement>('.town-interaction')!;
    engine.world.move(-1, 0, .05);
    // Move back down the clear central aisle to the exit.
    for (let step = 0; step < 7; step += 1) engine.world.move(0, 1, .05);
    pressE();
    expect(engine.world.interior).toBeNull();
    button.click();
    expect(engine.firstAid.snapshot.inventory).toEqual([]);
  });

  it('removes UI and keyboard handling on engine cleanup', () => {
    approachMaster(engine.firstAid);
    engine.destroy();
    pressE();
    expect(host.querySelector('.town-hud')).toBeNull();
    expect(engine.firstAid.snapshot.inventory).toEqual([]);
  });
});

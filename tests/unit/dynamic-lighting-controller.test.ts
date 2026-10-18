/**
 * Unit Test Suite: DynamicLightingController
 * Validates environmental lighting states, color palettes, retro stepped quantization,
 * continuous lerping, and Three.js light binding.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  DynamicLightingController,
  LIGHTING_PALETTES,
  lerpColor,
  lerpScalar,
} from '../../src/game/render/DynamicLightingController';

describe('DynamicLightingController Unit Tests', () => {
  describe('1. Color Palettes and Visual Parameters', () => {
    it('defines authoritative color palettes matching Документ.pdf Page 9', () => {
      // dark_emergency: Dim ambient #1a0f0f (0.2), red/amber directional #ff3b30 (0.5)
      const dark = LIGHTING_PALETTES.dark_emergency;
      expect(dark.ambientHex).toBe('#1a0f0f');
      expect(dark.ambientColor).toBe(0x1a0f0f);
      expect(dark.ambientIntensity).toBe(0.2);
      expect(dark.directionalHex).toBe('#ff3b30');
      expect(dark.directionalColor).toBe(0xff3b30);
      expect(dark.directionalIntensity).toBe(0.5);

      // warm_restored: Warm golden ambient #fff5ea (0.8), bright directional #ffeedd (1.3)
      const warm = LIGHTING_PALETTES.warm_restored;
      expect(warm.ambientHex).toBe('#fff5ea');
      expect(warm.ambientColor).toBe(0xfff5ea);
      expect(warm.ambientIntensity).toBe(0.8);
      expect(warm.directionalHex).toBe('#ffeedd');
      expect(warm.directionalColor).toBe(0xffeedd);
      expect(warm.directionalIntensity).toBe(1.3);

      // twilight: Cool dusk ambient #1e293b (0.5), evening blue directional #60a5fa (0.8)
      const twil = LIGHTING_PALETTES.twilight;
      expect(twil.ambientHex).toBe('#1e293b');
      expect(twil.ambientColor).toBe(0x1e293b);
      expect(twil.ambientIntensity).toBe(0.5);
      expect(twil.directionalHex).toBe('#60a5fa');
      expect(twil.directionalColor).toBe(0x60a5fa);
      expect(twil.directionalIntensity).toBe(0.8);

      // sunny_day: Bright clean ambient #ffffff (0.9), golden sun directional #fffbeb (1.4)
      const sun = LIGHTING_PALETTES.sunny_day;
      expect(sun.ambientHex).toBe('#ffffff');
      expect(sun.ambientColor).toBe(0xffffff);
      expect(sun.ambientIntensity).toBe(0.9);
      expect(sun.directionalHex).toBe('#fffbeb');
      expect(sun.directionalColor).toBe(0xfffbeb);
      expect(sun.directionalIntensity).toBe(1.4);
    });
  });

  describe('2. Initialization and State Querying', () => {
    it('initializes with default twilight state', () => {
      const controller = new DynamicLightingController();
      expect(controller.getState()).toBe('twilight');
      expect(controller.getTargetState()).toBe('twilight');
      expect(controller.isTransitioning()).toBe(false);
      expect(controller.getProgress()).toBe(1.0);
    });

    it('initializes with specified custom initial state', () => {
      const controller = new DynamicLightingController({ initialState: 'dark_emergency' });
      expect(controller.getState()).toBe('dark_emergency');
      expect(controller.getCurrentPalette().ambientHex).toBe('#1a0f0f');
      expect(controller.getCurrentPalette().ambientIntensity).toBe(0.2);
    });
  });

  describe('3. Instant State Switching', () => {
    it('performs instant state transition via setState()', () => {
      const controller = new DynamicLightingController({ initialState: 'dark_emergency' });
      const listener = vi.fn();
      controller.onStateChange(listener);

      controller.setState('warm_restored');

      expect(controller.getState()).toBe('warm_restored');
      expect(controller.isTransitioning()).toBe(false);
      expect(controller.getCurrentPalette().ambientHex).toBe('#fff5ea');
      expect(controller.getCurrentPalette().ambientIntensity).toBe(0.8);
      expect(listener).toHaveBeenCalledWith('warm_restored', expect.anything());
    });

    it('handles instant transition mode in transitionTo()', () => {
      const controller = new DynamicLightingController({ initialState: 'twilight' });
      const onComplete = vi.fn();

      controller.transitionTo('sunny_day', { mode: 'instant', onComplete });

      expect(controller.getState()).toBe('sunny_day');
      expect(controller.isTransitioning()).toBe(false);
      expect(onComplete).toHaveBeenCalledWith('sunny_day');
    });
  });

  describe('4. Stepped Retro Pixel-Art Transitions', () => {
    it('executes stepped quantization with discrete steps and intermediate progress', () => {
      const controller = new DynamicLightingController({ initialState: 'dark_emergency' });
      const stepSpy = vi.fn();
      const completeSpy = vi.fn();

      controller.transitionTo('warm_restored', {
        duration: 1.2,
        mode: 'stepped',
        steps: 6,
        onStep: stepSpy,
        onComplete: completeSpy,
      });

      expect(controller.isTransitioning()).toBe(true);
      expect(controller.getTargetState()).toBe('warm_restored');
      expect(controller.getProgress()).toBeCloseTo(0, 2);

      // Step 1: Advance 0.2s (t = 0.2/1.2 = 0.166 -> stepIndex = 1)
      controller.update(0.2);
      expect(stepSpy).toHaveBeenCalledWith(1, 6, expect.anything());

      // Step 3: Advance 0.4s more (t = 0.6/1.2 = 0.5 -> stepIndex = 3)
      controller.update(0.4);
      expect(stepSpy).toHaveBeenCalledWith(3, 6, expect.anything());
      const midPalette = controller.getCurrentPalette();
      expect(midPalette.ambientIntensity).toBeCloseTo(0.5, 2);

      // Step 6 / Complete: Advance remaining 0.6s
      controller.update(0.6);
      expect(controller.isTransitioning()).toBe(false);
      expect(controller.getState()).toBe('warm_restored');
      expect(completeSpy).toHaveBeenCalledWith('warm_restored');
      expect(controller.getCurrentPalette().ambientIntensity).toBe(0.8);
      expect(controller.getCurrentPalette().directionalIntensity).toBe(1.3);
    });
  });

  describe('5. Continuous Lerp Transitions', () => {
    it('smoothly interpolates palette properties across frames', () => {
      const controller = new DynamicLightingController({ initialState: 'dark_emergency' });
      controller.transitionTo('sunny_day', { duration: 1.0, mode: 'continuous' });

      expect(controller.isTransitioning()).toBe(true);

      // Halfway
      controller.update(0.5);
      const half = controller.getCurrentPalette();
      // dark_emergency ambient (0.2) to sunny_day (0.9) midway = 0.55
      expect(half.ambientIntensity).toBeCloseTo(0.55, 2);

      // Finish
      controller.update(0.5);
      expect(controller.isTransitioning()).toBe(false);
      expect(controller.getState()).toBe('sunny_day');
      expect(controller.getCurrentPalette().ambientIntensity).toBe(0.9);
    });
  });

  describe('6. Three.js Light Binding and Updates', () => {
    it('updates attached ambient and directional lights correctly', () => {
      const mockAmbient = {
        color: { setHex: vi.fn(), getHex: () => 0 },
        intensity: 0,
      };
      const mockDir = {
        color: { setHex: vi.fn(), getHex: () => 0 },
        intensity: 0,
        position: { set: vi.fn() },
      };

      const controller = new DynamicLightingController({
        initialState: 'dark_emergency',
        ambientLight: mockAmbient,
        directionalLight: mockDir,
      });

      expect(mockAmbient.color.setHex).toHaveBeenCalledWith(0x1a0f0f);
      expect(mockAmbient.intensity).toBe(0.2);
      expect(mockDir.color.setHex).toHaveBeenCalledWith(0xff3b30);
      expect(mockDir.intensity).toBe(0.5);

      controller.setState('sunny_day');
      expect(mockAmbient.color.setHex).toHaveBeenCalledWith(0xffffff);
      expect(mockAmbient.intensity).toBe(0.9);
      expect(mockDir.color.setHex).toHaveBeenCalledWith(0xfffbeb);
      expect(mockDir.intensity).toBe(1.4);
    });

    it('supports attaching and detaching lights dynamically', () => {
      const controller = new DynamicLightingController({ initialState: 'twilight' });

      const mockAmbient = {
        color: { setHex: vi.fn() },
        intensity: 0,
      };
      const mockDir = {
        color: { setHex: vi.fn() },
        intensity: 0,
        position: { set: vi.fn() },
      };

      controller.attachLights(mockAmbient, mockDir);
      expect(mockAmbient.color.setHex).toHaveBeenCalledWith(0x1e293b);

      controller.detachLights();
      controller.setState('sunny_day');
      // After detach, lights are no longer called
      expect(mockAmbient.intensity).toBe(0.5); // was not updated to 0.9
    });
  });

  describe('7. Pure RGB Math Utilities', () => {
    it('correctly interpolates colors in 24-bit linear RGB space', () => {
      const mid = lerpColor(0x000000, 0xffffff, 0.5);
      expect(mid).toBe(0x808080);

      const redGreen = lerpColor(0xff0000, 0x00ff00, 0.5);
      expect((redGreen >> 16) & 0xff).toBe(128);
      expect((redGreen >> 8) & 0xff).toBe(128);
      expect(redGreen & 0xff).toBe(0);
    });

    it('correctly clamps t to [0, 1] in lerpScalar and lerpColor', () => {
      expect(lerpScalar(10, 20, -1)).toBe(10);
      expect(lerpScalar(10, 20, 2)).toBe(20);
      expect(lerpColor(0x000000, 0xffffff, -0.5)).toBe(0x000000);
      expect(lerpColor(0x000000, 0xffffff, 1.5)).toBe(0xffffff);
    });
  });

  describe('8. Event Subscriptions and Unsubscribe', () => {
    it('allows unregistering state change and complete listeners', () => {
      const controller = new DynamicLightingController();
      const stateSpy = vi.fn();
      const completeSpy = vi.fn();

      const unsubState = controller.onStateChange(stateSpy);
      const unsubComplete = controller.onTransitionComplete(completeSpy);

      controller.setState('warm_restored');
      expect(stateSpy).toHaveBeenCalledTimes(1);

      unsubState();
      controller.setState('twilight');
      expect(stateSpy).toHaveBeenCalledTimes(1);

      unsubComplete();
    });
  });
});

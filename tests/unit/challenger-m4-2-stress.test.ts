/**
 * Challenger 2 Empirical Stress Test Suite
 * Milestone 4: Diorama Zones & Dynamic Lighting
 *
 * Adversarial empirical testing of DynamicLightingController & Diorama Synchronization:
 * 1. Mid-transition state interruption (switching, cancelling, reversing, rapid chaining)
 * 2. Stepped quantization boundaries (step 0 vs step K, float tolerance, degenerate steps, instant mode)
 * 3. Delta overflow in update() (zero delta, massive overflow, Infinity, float accumulation, negative deltas)
 * 4. attachLights/detachLights transitions (mid-flight attach/detach, duck-typed lights, accent lights)
 * 5. Synchronization with Switchboard grid reboot (interlocks, power restoration, zone transitions, save/load)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  DynamicLightingController,
} from '../../src/game/render/DynamicLightingController';
import { DioramaManager } from '../../src/game/systems/DioramaManager';
import { SwitchboardPuzzleSystem } from '../../src/game/systems/SwitchboardPuzzleSystem';

describe('Challenger 2 Empirical Stress Suite: DynamicLightingController (Milestone 4)', () => {
  describe('1. Mid-Transition State Interruption', () => {
    it('seamlessly redirects an active transition to a new target without snapping to initial state', () => {
      const controller = new DynamicLightingController({ initialState: 'dark_emergency' });

      // Start transition towards warm_restored (duration 1.0s)
      controller.transitionTo('warm_restored', { duration: 1.0, mode: 'continuous' });
      expect(controller.isTransitioning()).toBe(true);

      // Advance 50%
      controller.update(0.5);
      const midPalette = controller.getCurrentPalette();
      // dark_emergency ambient (0.2) -> warm_restored ambient (0.8) => midpoint = 0.5
      expect(midPalette.ambientIntensity).toBeCloseTo(0.5, 2);

      // Interrupt mid-transition to twilight (ambient = 0.5)
      const onCompleteNew = vi.fn();
      controller.transitionTo('twilight', { duration: 0.5, mode: 'continuous', onComplete: onCompleteNew });

      expect(controller.isTransitioning()).toBe(true);
      expect(controller.getTargetState()).toBe('twilight');

      // The new transition starts from midPalette, NOT from dark_emergency
      controller.update(0.25);
      expect(controller.isTransitioning()).toBe(true);

      // Complete the new transition
      controller.update(0.25);
      expect(controller.isTransitioning()).toBe(false);
      expect(controller.getState()).toBe('twilight');
      expect(controller.getCurrentPalette().ambientIntensity).toBeCloseTo(0.5, 2);
      expect(onCompleteNew).toHaveBeenCalledWith('twilight');
    });

    it('instantly cancels an active transition when setState() is called', () => {
      const controller = new DynamicLightingController({ initialState: 'dark_emergency' });
      const onCompleteOld = vi.fn();

      controller.transitionTo('warm_restored', { duration: 2.0, onComplete: onCompleteOld });
      controller.update(0.5);
      expect(controller.isTransitioning()).toBe(true);

      // Hard interrupt via setState
      controller.setState('sunny_day');

      expect(controller.isTransitioning()).toBe(false);
      expect(controller.getState()).toBe('sunny_day');
      expect(controller.getTargetState()).toBe('sunny_day');
      expect(controller.getCurrentPalette().ambientIntensity).toBe(0.9);
      expect(controller.getProgress()).toBe(1.0);

      // Subsequent updates should not trigger old callbacks or mutate state
      controller.update(1.5);
      expect(onCompleteOld).not.toHaveBeenCalled();
      expect(controller.getState()).toBe('sunny_day');
    });

    it('correctly handles reversing back to the original state mid-transition', () => {
      const controller = new DynamicLightingController({ initialState: 'dark_emergency' });
      controller.transitionTo('sunny_day', { duration: 1.0, mode: 'continuous' });

      // Advance to 60%
      controller.update(0.6);
      const currentInt = controller.getCurrentPalette().ambientIntensity;
      expect(currentInt).toBeGreaterThan(0.2);

      // Reverse back to dark_emergency
      const reverseComplete = vi.fn();
      controller.transitionTo('dark_emergency', { duration: 0.5, mode: 'continuous', onComplete: reverseComplete });

      expect(controller.isTransitioning()).toBe(true);
      expect(controller.getTargetState()).toBe('dark_emergency');

      // Advance 0.5s to finish reverse
      controller.update(0.5);
      expect(controller.isTransitioning()).toBe(false);
      expect(controller.getState()).toBe('dark_emergency');
      expect(controller.getCurrentPalette().ambientIntensity).toBeCloseTo(0.2, 2);
      expect(reverseComplete).toHaveBeenCalledWith('dark_emergency');
    });

    it('calling transitionTo with same target state while transitioning smoothly continues', () => {
      const controller = new DynamicLightingController({ initialState: 'twilight' });
      controller.transitionTo('warm_restored', { duration: 1.0, mode: 'continuous' });
      controller.update(0.3);

      // Re-issue transition to the same target
      controller.transitionTo('warm_restored', { duration: 0.7, mode: 'continuous' });
      expect(controller.getTargetState()).toBe('warm_restored');
      expect(controller.isTransitioning()).toBe(true);

      controller.update(0.7);
      expect(controller.isTransitioning()).toBe(false);
      expect(controller.getState()).toBe('warm_restored');
    });

    it('survives rapid consecutive transition interrupts without NaN or corrupted state', () => {
      const controller = new DynamicLightingController({ initialState: 'twilight' });

      const states: ('dark_emergency' | 'warm_restored' | 'twilight' | 'sunny_day')[] = [
        'dark_emergency',
        'warm_restored',
        'sunny_day',
        'twilight',
        'dark_emergency',
      ];

      for (const target of states) {
        controller.transitionTo(target, { duration: 0.1, mode: 'stepped', steps: 4 });
        controller.update(0.02); // 20% in, then interrupt immediately
      }

      // Finish the final transition
      controller.update(0.2);

      expect(controller.isTransitioning()).toBe(false);
      expect(controller.getState()).toBe('dark_emergency');
      expect(Number.isNaN(controller.getCurrentPalette().ambientIntensity)).toBe(false);
      expect(Number.isNaN(controller.getCurrentPalette().directionalIntensity)).toBe(false);
      expect(controller.getCurrentPalette().ambientHex).toBe('#1a0f0f');
    });
  });

  describe('2. Stepped Quantization Boundaries (Step 0 vs Step K)', () => {
    it('reports step 0 on initial update and step K on final completion', () => {
      const controller = new DynamicLightingController({ initialState: 'dark_emergency' });
      const stepEvents: { step: number; total: number; intensity: number }[] = [];
      const onComplete = vi.fn();

      const TOTAL_STEPS = 5;
      controller.transitionTo('warm_restored', {
        duration: 1.0,
        mode: 'stepped',
        steps: TOTAL_STEPS,
        onStep: (step, total, palette) => {
          stepEvents.push({ step, total, intensity: palette.ambientIntensity });
        },
        onComplete,
      });

      // Frame 1: Small delta (0.001s)
      controller.update(0.001);
      expect(stepEvents.length).toBe(1);
      expect(stepEvents[0]!.step).toBe(0);
      expect(stepEvents[0]!.total).toBe(TOTAL_STEPS);
      // At step 0, palette should equal fromPalette (dark_emergency ambient 0.2)
      expect(stepEvents[0]!.intensity).toBeCloseTo(0.2, 2);

      // Advance through remaining steps in 0.2s increments (1.0 / 5 = 0.2)
      controller.update(0.2); // rawT = 0.201 -> step 1
      controller.update(0.2); // rawT = 0.401 -> step 2
      controller.update(0.2); // rawT = 0.601 -> step 3
      controller.update(0.2); // rawT = 0.801 -> step 4
      controller.update(0.2); // rawT >= 1.0 -> step 5 (step K) & complete

      expect(controller.isTransitioning()).toBe(false);
      expect(onComplete).toHaveBeenCalledWith('warm_restored');

      // Verify all steps 0..5 were reported monotonically
      const stepIndices = stepEvents.map((e) => e.step);
      expect(stepIndices).toEqual([0, 1, 2, 3, 4, 5]);

      // Final step 5 intensity must match warm_restored ambient (0.8)
      expect(stepEvents[5]!.intensity).toBeCloseTo(0.8, 2);
    });

    it('safely clamps degenerate step counts (0, 1, negative) to at least 2 steps', () => {
      const controller = new DynamicLightingController({ initialState: 'twilight' });

      // Pass steps: 0 -> should clamp to 2
      const stepEvents: number[] = [];
      controller.transitionTo('sunny_day', {
        duration: 1.0,
        mode: 'stepped',
        steps: 0,
        onStep: (step) => stepEvents.push(step),
      });

      controller.update(0.01); // step 0
      controller.update(0.5);  // step 1
      controller.update(0.6);  // step 2 & complete

      expect(controller.isTransitioning()).toBe(false);
      expect(stepEvents).toContain(0);
      expect(stepEvents).toContain(2);
      expect(controller.getState()).toBe('sunny_day');
    });

    it('handles negative step count gracefully', () => {
      const controller = new DynamicLightingController({ initialState: 'twilight' });
      const stepEvents: number[] = [];
      controller.transitionTo('warm_restored', {
        duration: 0.5,
        mode: 'stepped',
        steps: -5,
        onStep: (step) => stepEvents.push(step),
      });

      controller.update(0.6);
      expect(controller.isTransitioning()).toBe(false);
      expect(controller.getState()).toBe('warm_restored');
      expect(stepEvents[stepEvents.length - 1]).toBe(2);
    });

    it('handles instant transition mode with immediate completion callback', () => {
      const controller = new DynamicLightingController({ initialState: 'twilight' });
      const onComplete = vi.fn();
      controller.transitionTo('sunny_day', { mode: 'instant', onComplete });

      expect(controller.isTransitioning()).toBe(false);
      expect(controller.getState()).toBe('sunny_day');
      expect(onComplete).toHaveBeenCalledWith('sunny_day');
    });
  });

  describe('3. Delta Overflow in update()', () => {
    it('safely handles zero delta without premature completion', () => {
      const controller = new DynamicLightingController({ initialState: 'twilight' });
      controller.transitionTo('sunny_day', { duration: 1.0, mode: 'continuous' });

      controller.update(0);
      expect(controller.isTransitioning()).toBe(true);
      expect(controller.getProgress()).toBe(0);
      expect(controller.getState()).toBe('twilight');
    });

    it('safely handles massive single delta (> 1000x duration) completing cleanly', () => {
      const controller = new DynamicLightingController({ initialState: 'dark_emergency' });
      const completeSpy = vi.fn();
      controller.transitionTo('warm_restored', {
        duration: 1.0,
        mode: 'stepped',
        steps: 6,
        onComplete: completeSpy,
      });

      controller.update(5000); // 5000 seconds in one frame

      expect(controller.isTransitioning()).toBe(false);
      expect(controller.getState()).toBe('warm_restored');
      expect(controller.getProgress()).toBe(1.0);
      expect(completeSpy).toHaveBeenCalledTimes(1);
      expect(controller.getCurrentPalette().ambientIntensity).toBe(0.8);
    });

    it('safely handles Infinity delta without producing NaN', () => {
      const controller = new DynamicLightingController({ initialState: 'twilight' });
      controller.transitionTo('sunny_day', { duration: 1.0, mode: 'continuous' });

      controller.update(Infinity);

      expect(controller.isTransitioning()).toBe(false);
      expect(controller.getState()).toBe('sunny_day');
      expect(Number.isNaN(controller.getCurrentPalette().ambientIntensity)).toBe(false);
      expect(controller.getCurrentPalette().ambientIntensity).toBe(0.9);
    });

    it('remains inactive and safe when update() is called repeatedly post-completion', () => {
      const controller = new DynamicLightingController({ initialState: 'twilight' });
      const completeSpy = vi.fn();
      controller.transitionTo('sunny_day', { duration: 0.5, onComplete: completeSpy });

      controller.update(0.6); // Completes
      expect(completeSpy).toHaveBeenCalledTimes(1);

      // Call update 100 times after completion
      for (let i = 0; i < 100; i++) {
        controller.update(0.1);
      }

      expect(completeSpy).toHaveBeenCalledTimes(1);
      expect(controller.isTransitioning()).toBe(false);
      expect(controller.getState()).toBe('sunny_day');
    });

    it('maintains precision under high-frequency tiny delta accumulation across frames', () => {
      const controller = new DynamicLightingController({ initialState: 'dark_emergency' });
      controller.transitionTo('warm_restored', { duration: 1.0, mode: 'continuous' });

      // 10,000 frames of 0.0001s = 0.9999999999999062s in float arithmetic
      const dt = 0.0001;
      for (let i = 0; i < 10000; i++) {
        controller.update(dt);
      }
      expect(controller.getProgress()).toBeCloseTo(1.0, 5);

      // Next tick (frame 10,001) cleanly completes transition
      controller.update(dt);
      expect(controller.isTransitioning()).toBe(false);
      expect(controller.getState()).toBe('warm_restored');
      expect(controller.getCurrentPalette().ambientIntensity).toBe(0.8);
    });

    it('handles negative deltas gracefully without crashing or underflowing colors', () => {
      const controller = new DynamicLightingController({ initialState: 'dark_emergency' });
      controller.transitionTo('warm_restored', { duration: 1.0, mode: 'continuous' });

      controller.update(0.5);
      expect(controller.getProgress()).toBe(0.5);

      // Step backwards
      controller.update(-0.2);
      expect(controller.getProgress()).toBeCloseTo(0.3, 2);

      // Step negative beyond zero
      controller.update(-1.0);
      // Empirical observation: getProgress() does Math.min(1.0, t) without Math.max(0, t),
      // so negative elapsed time yields negative progress, but lerpColor/lerpScalar safely clamp to [0, 1]
      expect(controller.getProgress()).toBeLessThanOrEqual(0);
      expect(controller.getCurrentPalette().ambientIntensity).toBe(0.2);
    });
  });

  describe('4. attachLights/detachLights Transitions', () => {
    it('applies intermediate palette immediately when lights are attached mid-transition', () => {
      const controller = new DynamicLightingController({ initialState: 'dark_emergency' });
      controller.transitionTo('warm_restored', { duration: 1.0, mode: 'continuous' });

      // Advance 50% without attached lights
      controller.update(0.5);

      // Attach lights at 50% mark
      const mockAmbient = { color: { setHex: vi.fn() }, intensity: 0 };
      const mockDir = { color: { setHex: vi.fn() }, intensity: 0, position: { set: vi.fn() } };

      controller.attachLights(mockAmbient, mockDir);

      // Attached lights must immediately receive the 50% midpoint values
      expect(mockAmbient.intensity).toBeCloseTo(0.5, 2);
      expect(mockDir.intensity).toBeCloseTo((0.5 + 1.3) / 2, 2);

      // Finish transition
      controller.update(0.5);
      expect(mockAmbient.intensity).toBeCloseTo(0.8, 2);
      expect(mockDir.intensity).toBeCloseTo(1.3, 2);
    });

    it('stops mutating lights after detachLights() mid-transition', () => {
      const mockAmbient = { color: { setHex: vi.fn() }, intensity: 0 };
      const mockDir = { color: { setHex: vi.fn() }, intensity: 0, position: { set: vi.fn() } };

      const controller = new DynamicLightingController({
        initialState: 'dark_emergency',
        ambientLight: mockAmbient,
        directionalLight: mockDir,
      });

      controller.transitionTo('sunny_day', { duration: 1.0, mode: 'continuous' });
      controller.update(0.5);

      const ambientAtMid = mockAmbient.intensity;
      expect(ambientAtMid).toBeCloseTo((0.2 + 0.9) / 2, 2);

      // Detach lights
      controller.detachLights();

      // Finish transition
      controller.update(0.5);

      // Lights should remain at the mid value because they were detached
      expect(mockAmbient.intensity).toBe(ambientAtMid);
      expect(controller.getState()).toBe('sunny_day');
    });

    it('tolerates duck-typed, missing, or malformed light objects without crashing', () => {
      const controller = new DynamicLightingController({ initialState: 'twilight' });

      // Partially valid lights (missing setHex or position.set)
      const incompleteAmbient = { intensity: 0 }; // no color object
      const incompleteDir = { color: {}, intensity: 0 }; // no setHex or position
      const nullAccent = null;

      expect(() => {
        controller.attachLights(incompleteAmbient, incompleteDir, nullAccent);
        controller.transitionTo('warm_restored', { duration: 0.2 });
        controller.update(0.1);
        controller.update(0.2);
      }).not.toThrow();

      expect(incompleteAmbient.intensity).toBeCloseTo(0.8, 2);
      expect(incompleteDir.intensity).toBeCloseTo(1.3, 2);
    });

    it('updates accent lights via attachLights with correct colors and intensities', () => {
      const mockAmbient = { color: { setHex: vi.fn() }, intensity: 0 };
      const mockDir = { color: { setHex: vi.fn() }, intensity: 0, position: { set: vi.fn() } };
      const mockAccent = { color: { setHex: vi.fn() }, intensity: 0 };

      const controller = new DynamicLightingController({ initialState: 'dark_emergency' });
      controller.attachLights(mockAmbient, mockDir, mockAccent);

      // In dark_emergency, accentColor is 0xff2200, accentIntensity is 1.0
      expect(mockAccent.color.setHex).toHaveBeenCalledWith(0xff2200);
      expect(mockAccent.intensity).toBe(1.0);

      // Transition to warm_restored where accentColor is 0x38bdf8, accentIntensity is 0.4
      controller.setState('warm_restored');
      expect(mockAccent.color.setHex).toHaveBeenCalledWith(0x38bdf8);
      expect(mockAccent.intensity).toBe(0.4);
    });

    it('documents constructor accentLight edge case when ambient and directional are absent', () => {
      const mockAccent = { color: { setHex: vi.fn() }, intensity: 0 };
      // Passing only accentLight without ambientLight/directionalLight
      const controller = new DynamicLightingController({
        initialState: 'dark_emergency',
        accentLight: mockAccent,
      });

      // Line 157 checks (config.ambientLight || config.directionalLight), so attachLights is skipped.
      // Calling attachLights explicitly works as expected:
      expect(mockAccent.color.setHex).not.toHaveBeenCalled();
      controller.attachLights(undefined, undefined, mockAccent);
      expect(mockAccent.color.setHex).toHaveBeenCalledWith(0xff2200);
    });
  });

  describe('5. Synchronization with Switchboard Grid Reboot', () => {
    it('enforces interlock: rebootGrid() fails and lighting stays dark_emergency if sequence is invalid', async () => {
      const diorama = new DioramaManager();
      await diorama.loadZone('zone_04_lab_corridor');
      expect(diorama.getLightingState()).toBe('dark_emergency');

      const switchboard = new SwitchboardPuzzleSystem({
        onPowerRestored: () => {
          diorama.notifyPowerRestored();
        },
      });

      // Try rebooting grid immediately without line isolation or fuse
      const prematureReboot = switchboard.rebootGrid();
      expect(prematureReboot.success).toBe(false);
      expect(prematureReboot.powerRestored).toBe(false);
      expect(diorama.isPowerGridRestored()).toBe(false);
      expect(diorama.getLightingState()).toBe('dark_emergency');

      // Try with line isolation only
      switchboard.isolateLine();
      const partialReboot = switchboard.rebootGrid();
      expect(partialReboot.success).toBe(false);
      expect(diorama.getLightingState()).toBe('dark_emergency');
    });

    it('triggers warm_restored transition upon valid 3-step switchboard completion and retains state across zone loads', async () => {
      const diorama = new DioramaManager();
      await diorama.loadZone('zone_04_lab_corridor');
      expect(diorama.getLightingState()).toBe('dark_emergency');

      const switchboard = new SwitchboardPuzzleSystem({
        onPowerRestored: () => {
          diorama.notifyPowerRestored();
        },
      });

      // 1. Isolate line
      const step1 = switchboard.isolateLine();
      expect(step1.success).toBe(true);

      // 2. Insert fuse
      const step2 = switchboard.insertFuse('item_module_battery');
      expect(step2.success).toBe(true);

      // 3. Reboot grid
      const step3 = switchboard.rebootGrid();
      expect(step3.success).toBe(true);
      expect(step3.powerRestored).toBe(true);

      // Verify lighting immediately restored to warm_restored in corridor
      expect(diorama.isPowerGridRestored()).toBe(true);
      expect(diorama.getLightingState()).toBe('warm_restored');

      // Navigate to another zone (courtyard alley -> default twilight)
      await diorama.loadZone('zone_03_courtyard_alley');
      expect(diorama.getActiveZone()).toBe('zone_03_courtyard_alley');
      expect(diorama.getLightingState()).toBe('twilight');

      // Navigate back to corridor -> MUST stay warm_restored because power is restored!
      await diorama.loadZone('zone_04_lab_corridor');
      expect(diorama.getActiveZone()).toBe('zone_04_lab_corridor');
      expect(diorama.getLightingState()).toBe('warm_restored');
    });

    it('persists and restores switchboard power and lighting state via serialize / loadState', async () => {
      const diorama = new DioramaManager();
      await diorama.loadZone('zone_04_lab_corridor');
      diorama.notifyPowerRestored();
      expect(diorama.getLightingState()).toBe('warm_restored');

      const saved = diorama.saveState();
      expect(saved.lightingState).toBe('warm_restored');
      expect(saved.currentZoneId).toBe('zone_04_lab_corridor');

      // New diorama manager instance (fresh bootstrap)
      const freshDiorama = new DioramaManager();
      expect(freshDiorama.isPowerGridRestored()).toBe(false);

      freshDiorama.loadState(saved);
      expect(freshDiorama.getActiveZone()).toBe('zone_04_lab_corridor');
      expect(freshDiorama.getLightingState()).toBe('warm_restored');
      expect(freshDiorama.isPowerGridRestored()).toBe(true);
    });

    it('synchronizes animated stepped lighting transition upon power restoration', async () => {
      const diorama = new DioramaManager();
      await diorama.loadZone('zone_04_lab_corridor');
      const controller = diorama.getLightingController();
      expect(controller.getState()).toBe('dark_emergency');

      const switchboard = new SwitchboardPuzzleSystem({
        onPowerRestored: () => {
          // Trigger a stepped animated transition instead of instant
          controller.transitionTo('warm_restored', {
            duration: 1.0,
            mode: 'stepped',
            steps: 4,
          });
        },
      });

      switchboard.isolateLine();
      switchboard.insertFuse('item_module_battery');
      switchboard.rebootGrid();

      expect(controller.isTransitioning()).toBe(true);
      expect(controller.getTargetState()).toBe('warm_restored');

      // Advance 2 steps (50%)
      controller.update(0.5);
      expect(controller.getCurrentPalette().ambientIntensity).toBeCloseTo(0.5, 2);

      // Finish transition
      controller.update(0.5);
      expect(controller.isTransitioning()).toBe(false);
      expect(controller.getState()).toBe('warm_restored');
      expect(controller.getCurrentPalette().ambientIntensity).toBe(0.8);
    });
  });
});

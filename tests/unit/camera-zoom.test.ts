import { describe, expect, it, vi } from 'vitest';
import { CameraZoom } from '@game/systems/camera-zoom';
import { OrthographicCamera, Vector3 } from 'three';

function settle(zoom: CameraZoom): void {
  for (let frame = 0; frame < 160; frame++) zoom.step(0.1);
}

describe('Camera zoom', () => {
  it('keeps a player at room corners in view when magnified', () => {
    const zoom = new CameraZoom();
    expect(zoom.followWeight).toBe(1);
    zoom.setInterior(true);
    expect(zoom.followWeight).toBe(0);
    zoom.adjust(-100);
    settle(zoom);
    for (const x of [-4.5, 4.5]) for (const z of [-3.5, 3.5]) {
      const center = new Vector3(x, 0, z).multiplyScalar(zoom.followWeight);
      const camera = new OrthographicCamera(-zoom.span, zoom.span, zoom.span, -zoom.span, .1, 250);
      camera.position.copy(center).add(new Vector3(28, 24, 28));
      camera.lookAt(center);
      camera.updateMatrixWorld();
      for (const height of [0, 1.95]) {
        const screen = new Vector3(x, height, z).project(camera);
        expect(Math.abs(screen.x)).toBeLessThan(1);
        expect(Math.abs(screen.y)).toBeLessThan(1);
      }
    }
  });
  it('starts at a useful outdoor view and reports magnification', () => {
    const zoom = new CameraZoom();
    expect(zoom.span).toBe(14);
    expect(zoom.percent).toBe(100);
    zoom.adjust(Math.log(0.5));
    settle(zoom);
    expect(zoom.span).toBeCloseTo(7);
    expect(zoom.percent).toBe(200);
  });

  it('approaches the requested span smoothly and monotonically', () => {
    const zoom = new CameraZoom();
    zoom.adjust(Math.log(2));
    expect(zoom.span).toBe(14);
    zoom.step(1 / 60);
    const first = zoom.span;
    expect(first).toBeGreaterThan(14);
    expect(first).toBeLessThan(28);
    zoom.step(1 / 60);
    expect(zoom.span).toBeGreaterThan(first);
    expect(zoom.span).toBeLessThan(28);
    settle(zoom);
    expect(zoom.span).toBeCloseTo(28);
  });

  it('bounds outdoor and indoor zoom even for extreme finite input', () => {
    const zoom = new CameraZoom();
    zoom.adjust(1e100);
    settle(zoom);
    expect(zoom.span).toBeCloseTo(30);
    zoom.adjust(-1e100);
    settle(zoom);
    expect(zoom.span).toBeCloseTo(5);
    zoom.setInterior(true);
    expect(zoom.span).toBe(6.5);
    zoom.adjust(1e100);
    settle(zoom);
    expect(zoom.span).toBeCloseTo(11);
    zoom.adjust(-1e100);
    settle(zoom);
    expect(zoom.span).toBeCloseTo(3.5);
  });

  it('preserves independent current and target spans across room transitions', () => {
    const zoom = new CameraZoom();
    zoom.adjust(Math.log(2));
    zoom.step(1 / 60);
    const outdoor = zoom.span;
    zoom.setInterior(true);
    expect(zoom.span).toBe(6.5);
    zoom.adjust(Math.log(0.75));
    zoom.step(1 / 60);
    const indoor = zoom.span;
    zoom.setInterior(false);
    expect(zoom.span).toBe(outdoor);
    settle(zoom);
    expect(zoom.span).toBeCloseTo(28);
    zoom.setInterior(true);
    expect(zoom.span).toBe(indoor);
    settle(zoom);
    expect(zoom.span).toBeCloseTo(6.5 * 0.75);
  });

  it('ignores invalid input and prevents large frame gaps from snapping zoom', () => {
    const zoom = new CameraZoom();
    for (const amount of [NaN, Infinity, -Infinity]) zoom.adjust(amount);
    zoom.adjust(Math.log(2));
    for (const time of [NaN, Infinity, -Infinity, -1, 0]) zoom.step(time);
    expect(zoom.span).toBe(14);
    zoom.step(100);
    expect(zoom.span).toBeCloseTo(14 + 14 * (1 - Math.exp(-1.2)));
  });

  it('resets only the active mode toward its default', () => {
    const zoom = new CameraZoom();
    zoom.adjust(Math.log(2));
    settle(zoom);
    zoom.setInterior(true);
    zoom.adjust(Math.log(1.5));
    settle(zoom);
    zoom.reset();
    settle(zoom);
    expect(zoom.span).toBeCloseTo(6.5);
    zoom.setInterior(false);
    expect(zoom.span).toBeCloseTo(28);
    zoom.reset();
    settle(zoom);
    expect(zoom.span).toBeCloseTo(14);
  });

  it('publishes the current view immediately and stops after unsubscribe', () => {
    const zoom = new CameraZoom();
    const listener = vi.fn();
    const unsubscribe = zoom.subscribe(listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(zoom);
    zoom.step(0.1);
    zoom.setInterior(false);
    expect(listener).toHaveBeenCalledTimes(1);
    zoom.adjust(-0.2);
    zoom.step(0.1);
    expect(listener).toHaveBeenCalledTimes(2);
    zoom.setInterior(true);
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    zoom.adjust(0.2);
    zoom.step(0.1);
    zoom.setInterior(false);
    expect(listener).toHaveBeenCalledTimes(3);
  });
});

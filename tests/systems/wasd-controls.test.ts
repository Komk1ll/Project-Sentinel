import { describe, it, expect } from 'vitest';
import {
  gridToIso,
  screenToGridDelta,
  getIsometricDirectionFromScreen,
} from '../../src/utils/isometric';

describe('WASD and Arrow Controls System Integration', () => {
  const playerSpeed = 0.08;

  function simulateMovementStep(
    currentPos: { x: number; y: number },
    keys: { W?: boolean; A?: boolean; S?: boolean; D?: boolean; left?: boolean; right?: boolean; up?: boolean; down?: boolean }
  ) {
    let screenX = 0;
    let screenY = 0;

    if (keys.left || keys.A) screenX -= 1;
    if (keys.right || keys.D) screenX += 1;
    if (keys.up || keys.W) screenY -= 1;
    if (keys.down || keys.S) screenY += 1;

    const movingNow = screenX !== 0 || screenY !== 0;

    if (!movingNow) {
      return {
        newPos: { ...currentPos },
        screenDelta: { x: 0, y: 0 },
        facing: 'S' as const,
        isMoving: false,
      };
    }

    const gridDelta = screenToGridDelta(screenX, screenY, playerSpeed);
    const newPos = {
      x: Math.max(0, Math.min(11, currentPos.x + gridDelta.x)),
      y: Math.max(0, Math.min(11, currentPos.y + gridDelta.y)),
    };

    const beforeScreen = gridToIso(currentPos.x, currentPos.y);
    const afterScreen = gridToIso(newPos.x, newPos.y);

    const screenDelta = {
      x: afterScreen.x - beforeScreen.x,
      y: afterScreen.y - beforeScreen.y,
    };

    const facing = getIsometricDirectionFromScreen(screenX, screenY);

    return {
      newPos,
      screenDelta,
      facing,
      isMoving: true,
    };
  }

  it('moves purely UP on screen and faces North when pressing W', () => {
    const start = { x: 5, y: 5 };
    const step = simulateMovementStep(start, { W: true });

    expect(step.isMoving).toBe(true);
    expect(step.facing).toBe('N');
    expect(step.screenDelta.x).toBeCloseTo(0);
    expect(step.screenDelta.y).toBeLessThan(0); // Moves Up on screen
  });

  it('moves purely DOWN on screen and faces South when pressing S', () => {
    const start = { x: 5, y: 5 };
    const step = simulateMovementStep(start, { S: true });

    expect(step.isMoving).toBe(true);
    expect(step.facing).toBe('S');
    expect(step.screenDelta.x).toBeCloseTo(0);
    expect(step.screenDelta.y).toBeGreaterThan(0); // Moves Down on screen
  });

  it('moves purely LEFT on screen and faces West when pressing A', () => {
    const start = { x: 5, y: 5 };
    const step = simulateMovementStep(start, { A: true });

    expect(step.isMoving).toBe(true);
    expect(step.facing).toBe('W');
    expect(step.screenDelta.x).toBeLessThan(0); // Moves Left on screen
    expect(step.screenDelta.y).toBeCloseTo(0);
  });

  it('moves purely RIGHT on screen and faces East when pressing D', () => {
    const start = { x: 5, y: 5 };
    const step = simulateMovementStep(start, { D: true });

    expect(step.isMoving).toBe(true);
    expect(step.facing).toBe('E');
    expect(step.screenDelta.x).toBeGreaterThan(0); // Moves Right on screen
    expect(step.screenDelta.y).toBeCloseTo(0);
  });

  it('moves diagonally Up-Right and faces NE when pressing W + D', () => {
    const start = { x: 5, y: 5 };
    const step = simulateMovementStep(start, { W: true, D: true });

    expect(step.isMoving).toBe(true);
    expect(step.facing).toBe('NE');
    expect(step.screenDelta.x).toBeGreaterThan(0);
    expect(step.screenDelta.y).toBeLessThan(0);
  });

  it('moves diagonally Up-Left and faces NW when pressing W + A', () => {
    const start = { x: 5, y: 5 };
    const step = simulateMovementStep(start, { W: true, A: true });

    expect(step.isMoving).toBe(true);
    expect(step.facing).toBe('NW');
    expect(step.screenDelta.x).toBeLessThan(0);
    expect(step.screenDelta.y).toBeLessThan(0);
  });

  it('moves diagonally Down-Right and faces SE when pressing S + D', () => {
    const start = { x: 5, y: 5 };
    const step = simulateMovementStep(start, { S: true, D: true });

    expect(step.isMoving).toBe(true);
    expect(step.facing).toBe('SE');
    expect(step.screenDelta.x).toBeGreaterThan(0);
    expect(step.screenDelta.y).toBeGreaterThan(0);
  });

  it('moves diagonally Down-Left and faces SW when pressing S + A', () => {
    const start = { x: 5, y: 5 };
    const step = simulateMovementStep(start, { S: true, A: true });

    expect(step.isMoving).toBe(true);
    expect(step.facing).toBe('SW');
    expect(step.screenDelta.x).toBeLessThan(0);
    expect(step.screenDelta.y).toBeGreaterThan(0);
  });

  it('cancels out opposing key presses (W+S or A+D) into stationary state', () => {
    const start = { x: 5, y: 5 };

    const opposingVertical = simulateMovementStep(start, { W: true, S: true });
    expect(opposingVertical.isMoving).toBe(false);
    expect(opposingVertical.newPos.x).toBe(start.x);
    expect(opposingVertical.newPos.y).toBe(start.y);

    const opposingHorizontal = simulateMovementStep(start, { A: true, D: true });
    expect(opposingHorizontal.isMoving).toBe(false);
    expect(opposingHorizontal.newPos.x).toBe(start.x);
    expect(opposingHorizontal.newPos.y).toBe(start.y);
  });

  it('supports arrow keys identically to WASD', () => {
    const start = { x: 5, y: 5 };
    const stepArrowUp = simulateMovementStep(start, { up: true });
    const stepW = simulateMovementStep(start, { W: true });

    expect(stepArrowUp.newPos.x).toBeCloseTo(stepW.newPos.x);
    expect(stepArrowUp.newPos.y).toBeCloseTo(stepW.newPos.y);
    expect(stepArrowUp.facing).toBe(stepW.facing);
  });

  it('clamps movement within the district grid boundaries (0 to 11)', () => {
    const nearMin = { x: 0.02, y: 0.02 };
    // Moving Up decreases grid coordinates
    const clampedMin = simulateMovementStep(nearMin, { W: true });
    expect(clampedMin.newPos.x).toBeGreaterThanOrEqual(0);
    expect(clampedMin.newPos.y).toBeGreaterThanOrEqual(0);

    const nearMax = { x: 10.98, y: 10.98 };
    // Moving Down increases grid coordinates
    const clampedMax = simulateMovementStep(nearMax, { S: true });
    expect(clampedMax.newPos.x).toBeLessThanOrEqual(11);
    expect(clampedMax.newPos.y).toBeLessThanOrEqual(11);
  });
});

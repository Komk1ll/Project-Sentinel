import { describe, it, expect } from 'vitest';
import {
  gridToIso,
  isoToGrid,
  calculateIsometricDepth,
  getIsometricDirectionFromDelta,
  screenToGridDelta,
  getIsometricDirectionFromScreen,
} from '../../src/utils/isometric';

describe('Isometric Utility Math', () => {
  it('converts grid (0, 0) to screen origin (0, 0)', () => {
    const screen = gridToIso(0, 0);
    expect(screen.x).toBe(0);
    expect(screen.y).toBe(0);
  });

  it('correctly maps 1 grid step along X and Y axes', () => {
    const stepX = gridToIso(1, 0);
    expect(stepX.x).toBe(64); // TILE_WIDTH / 2
    expect(stepX.y).toBe(32); // TILE_HEIGHT / 2

    const stepY = gridToIso(0, 1);
    expect(stepY.x).toBe(-64);
    expect(stepY.y).toBe(32);
  });

  it('reverses screen coordinates back to grid via isoToGrid', () => {
    const grid = isoToGrid(64, 32);
    expect(grid.x).toBe(1);
    expect(grid.y).toBe(0);
  });

  it('calculates monotonic isometric depth', () => {
    const depthA = calculateIsometricDepth(0, 0);
    const depthB = calculateIsometricDepth(1, 0);
    const depthC = calculateIsometricDepth(1, 1);

    expect(depthB).toBeGreaterThan(depthA);
    expect(depthC).toBeGreaterThan(depthB);
  });

  it('determines 8-way isometric direction from delta vectors', () => {
    expect(getIsometricDirectionFromDelta(1, 0)).toBe('SE');
    expect(getIsometricDirectionFromDelta(-1, 0)).toBe('NW');
    expect(getIsometricDirectionFromDelta(0, 1)).toBe('SW');
    expect(getIsometricDirectionFromDelta(0, -1)).toBe('NE');
    expect(getIsometricDirectionFromDelta(1, 1)).toBe('S');
    expect(getIsometricDirectionFromDelta(-1, -1)).toBe('N');
    expect(getIsometricDirectionFromDelta(1, -1)).toBe('E');
    expect(getIsometricDirectionFromDelta(-1, 1)).toBe('W');
  });

  it('resists floating-point epsilon jitter in getIsometricDirectionFromDelta', () => {
    // Very small floating point component should not divert pure NE/NW/SE/SW
    expect(getIsometricDirectionFromDelta(1e-12, -1)).toBe('NE');
    expect(getIsometricDirectionFromDelta(-1e-12, -1)).toBe('NE');
    expect(getIsometricDirectionFromDelta(-1, 1e-12)).toBe('NW');
    expect(getIsometricDirectionFromDelta(1, 1e-12)).toBe('SE');
    expect(getIsometricDirectionFromDelta(1e-12, 1)).toBe('SW');
  });

  it('resolves 8-directional compass headings directly from screen input', () => {
    // 4 cardinal screen directions
    expect(getIsometricDirectionFromScreen(0, -1)).toBe('N'); // W / Up
    expect(getIsometricDirectionFromScreen(0, 1)).toBe('S');  // S / Down
    expect(getIsometricDirectionFromScreen(-1, 0)).toBe('W'); // A / Left
    expect(getIsometricDirectionFromScreen(1, 0)).toBe('E');  // D / Right

    // 4 diagonal screen directions
    expect(getIsometricDirectionFromScreen(1, -1)).toBe('NE'); // W+D / Up-Right
    expect(getIsometricDirectionFromScreen(-1, -1)).toBe('NW'); // W+A / Up-Left
    expect(getIsometricDirectionFromScreen(1, 1)).toBe('SE');   // S+D / Down-Right
    expect(getIsometricDirectionFromScreen(-1, 1)).toBe('SW');  // S+A / Down-Left

    // Neutral / idle
    expect(getIsometricDirectionFromScreen(0, 0)).toBe('S');
  });

  it('converts screen WASD input into true screen-relative movement on the canvas', () => {
    const speed = 1.0;

    // 1. W key (Up): character should move purely UP on screen
    const upGrid = screenToGridDelta(0, -1, speed);
    const upScreen = gridToIso(upGrid.x, upGrid.y);
    expect(upScreen.x).toBeCloseTo(0);
    expect(upScreen.y).toBeLessThan(0); // Up in screen coordinates

    // 2. S key (Down): character should move purely DOWN on screen
    const downGrid = screenToGridDelta(0, 1, speed);
    const downScreen = gridToIso(downGrid.x, downGrid.y);
    expect(downScreen.x).toBeCloseTo(0);
    expect(downScreen.y).toBeGreaterThan(0); // Down in screen coordinates

    // 3. A key (Left): character should move purely LEFT on screen
    const leftGrid = screenToGridDelta(-1, 0, speed);
    const leftScreen = gridToIso(leftGrid.x, leftGrid.y);
    expect(leftScreen.x).toBeLessThan(0); // Left in screen coordinates
    expect(leftScreen.y).toBeCloseTo(0);

    // 4. D key (Right): character should move purely RIGHT on screen
    const rightGrid = screenToGridDelta(1, 0, speed);
    const rightScreen = gridToIso(rightGrid.x, rightGrid.y);
    expect(rightScreen.x).toBeGreaterThan(0); // Right in screen coordinates
    expect(rightScreen.y).toBeCloseTo(0);

    // 5. W+D keys (Up-Right): character moves Up-Right
    const upRightGrid = screenToGridDelta(1, -1, speed);
    const upRightScreen = gridToIso(upRightGrid.x, upRightGrid.y);
    expect(upRightScreen.x).toBeGreaterThan(0);
    expect(upRightScreen.y).toBeLessThan(0);

    // 6. W+A keys (Up-Left): character moves Up-Left
    const upLeftGrid = screenToGridDelta(-1, -1, speed);
    const upLeftScreen = gridToIso(upLeftGrid.x, upLeftGrid.y);
    expect(upLeftScreen.x).toBeLessThan(0);
    expect(upLeftScreen.y).toBeLessThan(0);

    // 7. S+D keys (Down-Right): character moves Down-Right
    const downRightGrid = screenToGridDelta(1, 1, speed);
    const downRightScreen = gridToIso(downRightGrid.x, downRightGrid.y);
    expect(downRightScreen.x).toBeGreaterThan(0);
    expect(downRightScreen.y).toBeGreaterThan(0);

    // 8. S+A keys (Down-Left): character moves Down-Left
    const downLeftGrid = screenToGridDelta(-1, 1, speed);
    const downLeftScreen = gridToIso(downLeftGrid.x, downLeftGrid.y);
    expect(downLeftScreen.x).toBeLessThan(0);
    expect(downLeftScreen.y).toBeGreaterThan(0);
  });

  it('normalizes diagonal speed so diagonal movement does not increase velocity', () => {
    const speed = 0.08;

    const orthoGrid = screenToGridDelta(1, 0, speed);
    const orthoMag = Math.hypot(orthoGrid.x, orthoGrid.y);

    const diagGrid = screenToGridDelta(1, -1, speed);
    const diagMag = Math.hypot(diagGrid.x, diagGrid.y);

    // Diagonal movement speed must not exceed orthogonal speed
    expect(diagMag).toBeCloseTo(orthoMag, 5);
    expect(diagMag).toBeCloseTo(speed, 5);
  });

  it('returns zero vector when no input is active', () => {
    const zero = screenToGridDelta(0, 0, 0.08);
    expect(zero.x).toBe(0);
    expect(zero.y).toBe(0);
  });
});

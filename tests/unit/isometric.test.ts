import { describe, it, expect } from 'vitest';
import {
  gridToIso,
  isoToGrid,
  calculateIsometricDepth,
  getIsometricDirectionFromDelta,
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
});

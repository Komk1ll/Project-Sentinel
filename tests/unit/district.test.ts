import { describe, expect, it } from 'vitest';
import { clampDistrictPosition, DISTRICT_SIZE } from '@game/systems/district';

describe('District movement bounds', () => {
  it('expands the district to 32 tiles per side', () => {
    expect(DISTRICT_SIZE).toBe(32);
  });

  it('allows traversal beyond the previous district boundary', () => {
    expect(clampDistrictPosition({ x: 24, y: 20 })).toEqual({ x: 24, y: 20 });
  });

  it.each([
    [{ x: -1, y: 15 }, { x: 0, y: 15 }],
    [{ x: 15, y: -1 }, { x: 15, y: 0 }],
    [{ x: 33, y: 15 }, { x: 31, y: 15 }],
    [{ x: 15, y: 33 }, { x: 15, y: 31 }],
    [{ x: -10, y: 100 }, { x: 0, y: 31 }],
  ])('keeps an out-of-bounds position %o within the map', (position, expected) => {
    expect(clampDistrictPosition(position)).toEqual(expected);
  });

  it('preserves fractional positions for smooth movement', () => {
    expect(clampDistrictPosition({ x: 12.25, y: 30.875 })).toEqual({
      x: 12.25,
      y: 30.875,
    });
  });

  it('allows positions on all district corners', () => {
    for (const x of [0, 31]) {
      for (const y of [0, 31]) {
        expect(clampDistrictPosition({ x, y })).toEqual({ x, y });
      }
    }
  });
});

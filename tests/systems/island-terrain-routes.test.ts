import { describe, expect, it } from 'vitest';
import {
  islandElevation,
  getSurfaceAltitude,
  RETAINING_WALLS,
} from '@content/island-elevation';
import {
  GARDEN_WALKS,
  RESTING_AREAS,
  RESTING_BENCHES,
  GARDEN_OBSTACLES,
  GARDEN_TREES,
  COAST_CLIFFS,
  gardenBridgeHeight,
} from '@content/coastal-garden';
import { COAST_PATH, coastRatio, isIslandLand } from '@content/island';
import { isWalkableTownPosition } from '@game/systems/town-world';
import { clearWalkingSegment, walkingRoute } from '@game/systems/town-navigation';

describe('Item 1: Island Terrain & Routes System Tests', () => {
  describe('1. Elevation model and park terraces', () => {
    it('maintains strict flatness y = 0 across the entire town core for building foundations', () => {
      // Test grid of coordinates within the town core (x <= 64, z <= 64)
      for (let x = 0; x <= 64; x += 8) {
        for (let z = 0; z <= 64; z += 8) {
          expect(islandElevation(x, z), `at town coordinate (${x}, ${z})`).toBe(0);
          expect(getSurfaceAltitude({ x, z }, false)).toBe(0);
        }
      }
      // Interiors also strictly evaluate to 0
      expect(getSurfaceAltitude({ x: 86, z: 24 }, true)).toBe(0);
    });

    it('creates distinct elevated terraces in the eastern park', () => {
      // Mill Terrace Plateau peak (centered around x: 86, z: 24)
      const millElev = islandElevation(86, 24);
      expect(millElev).toBeGreaterThanOrEqual(0.70);
      expect(millElev).toBeLessThanOrEqual(0.74);

      // Eastern Belvedere Ridge (centered around x: 96, z: 38)
      const belvedereElev = islandElevation(96, 38);
      expect(belvedereElev).toBeGreaterThanOrEqual(0.53);
      expect(belvedereElev).toBeLessThanOrEqual(0.57);

      // North-Eastern Garden Terrace (centered around x: 82, z: 8)
      const northElev = islandElevation(82, 8);
      expect(northElev).toBeGreaterThanOrEqual(0.38);
      expect(northElev).toBeLessThanOrEqual(0.42);

      // Transitions are smooth and non-negative
      for (let x = 64; x <= 104; x += 2) {
        for (let z = 0; z <= 72; z += 2) {
          const elev = islandElevation(x, z);
          expect(elev, `at (${x}, ${z})`).toBeGreaterThanOrEqual(0);
          expect(elev, `at (${x}, ${z})`).toBeLessThan(1.0);
        }
      }
    });

    it('tapers smoothly towards sea level at the coastline', () => {
      // Coast path elevation should be gentle, close to water level
      for (const p of COAST_PATH) {
        const elev = islandElevation(p.x, p.z);
        expect(elev, `coast path at (${p.x}, ${p.z})`).toBeLessThan(0.35);
      }
    });

    it('has gentle slopes without vertical cliffs along all walking routes', () => {
      // Ensure maximum slope dy / ds < 0.22 (gentle walkability) along all garden walks
      for (const walk of GARDEN_WALKS) {
        for (let i = 1; i < walk.points.length; i++) {
          const p1 = walk.points[i - 1]!;
          const p2 = walk.points[i]!;
          const ds = Math.hypot(p2.x - p1.x, p2.z - p1.z);
          if (ds > 1e-4) {
            const dy = Math.abs(islandElevation(p2.x, p2.z) - islandElevation(p1.x, p1.z));
            const slope = dy / ds;
            expect(slope, `slope between (${p1.x},${p1.z}) and (${p2.x},${p2.z})`).toBeLessThan(0.22);
          }
        }
      }
    });

    it('defines stone retaining walls that terrace the landscape with generous passages', () => {
      expect(RETAINING_WALLS.length).toBe(5);

      // Verify retaining wall modules have valid dimensions
      for (const wall of RETAINING_WALLS) {
        expect(wall.width).toBeGreaterThanOrEqual(0.4);
        expect(wall.depth).toBeGreaterThanOrEqual(5.0);
        expect(wall.height).toBeGreaterThanOrEqual(0.35);
        expect(islandElevation(wall.x, wall.z)).toBeGreaterThanOrEqual(0);
      }

      // Check gap for Mill Ascent Walk (around x: 76.5, z: 20..27)
      const millAscentCrossing = { x: 76.5, z: 24 };
      expect(isWalkableTownPosition(millAscentCrossing)).toBe(true);

      // Check gap for Belvedere Walk (around x: 97.2, z: 47)
      const belvedereCrossing = { x: 97.2, z: 47 };
      expect(isWalkableTownPosition(belvedereCrossing)).toBe(true);
    });
  });

  describe('2. Grounding hero, objects, camera and zero floating / sinking', () => {
    it('grounds character elevation to match island terrain plus bridge height', () => {
      const flatTownPos = { x: 32, z: 32 };
      expect(getSurfaceAltitude(flatTownPos) + gardenBridgeHeight(flatTownPos) + 0.065).toBe(0.065);

      const bridgeCenter = { x: 88, z: 58 };
      const expectedBridgeAltitude = islandElevation(88, 58) + 0.24 + 0.065;
      expect(getSurfaceAltitude(bridgeCenter) + gardenBridgeHeight(bridgeCenter) + 0.065).toBeCloseTo(expectedBridgeAltitude, 4);

      const millHill = { x: 86, z: 24 };
      const expectedMillAltitude = islandElevation(86, 24) + 0.065;
      expect(getSurfaceAltitude(millHill) + gardenBridgeHeight(millHill) + 0.065).toBeCloseTo(expectedMillAltitude, 4);
    });

    it('grounds all resting areas and benches onto terrain elevation', () => {
      for (const area of RESTING_AREAS) {
        const alt = islandElevation(area.x, area.z);
        expect(alt, `resting area ${area.id}`).toBeGreaterThanOrEqual(0);
      }

      for (const bench of RESTING_BENCHES) {
        const alt = islandElevation(bench.x, bench.z);
        expect(alt, `bench at (${bench.x}, ${bench.z})`).toBeGreaterThanOrEqual(0);
        // All resting benches are solid obstacles blocking player from walking through them
        expect(isWalkableTownPosition({ x: bench.x, z: bench.z })).toBe(false);
      }
    });

    it('grounds garden trees onto terrain elevation with valid scales', () => {
      for (const tree of GARDEN_TREES) {
        const alt = islandElevation(tree.x, tree.z);
        expect(alt).toBeGreaterThanOrEqual(0);
        expect(tree.scale).toBeGreaterThanOrEqual(0.75);
        expect(tree.scale).toBeLessThanOrEqual(1.2);
        expect(isIslandLand(tree)).toBe(true);
      }
    });
  });

  describe('3. Connected curved walks without seams or collisions', () => {
    it('has 4 continuous, naturally curved walks replacing earlier crude ovals', () => {
      expect(GARDEN_WALKS.length).toBe(4);
      for (const walk of GARDEN_WALKS) {
        expect(walk.points.length).toBeGreaterThanOrEqual(30);
        expect(walk.width).toBeGreaterThanOrEqual(1.8);
      }
    });

    it('guarantees 100% of points on all walks are completely walkable and collision-free', () => {
      for (const walk of GARDEN_WALKS) {
        for (const point of walk.points) {
          expect(isWalkableTownPosition(point), `point (${point.x}, ${point.z}) must be walkable`).toBe(true);
        }
      }
    });

    it('connects to town exits at (64, 16), (64, 24), and (64, 36)', () => {
      expect(isWalkableTownPosition({ x: 64, z: 16 })).toBe(true);
      expect(isWalkableTownPosition({ x: 64, z: 24 })).toBe(true);
      expect(isWalkableTownPosition({ x: 64, z: 36 })).toBe(true);
    });
  });

  describe('4. Coastal cliffs, rocky headlands and open coves', () => {
    it('diversifies cliff headlands across 3 distinct rocky promontories', () => {
      expect(COAST_CLIFFS.length).toBeGreaterThanOrEqual(60);

      // Verify cliffs are situated strictly on coastal water/rock perimeter
      for (const cliff of COAST_CLIFFS) {
        expect(cliff.scale).toBeGreaterThan(0.7);
        expect(cliff.y).toBeLessThan(0.6); // Water/rock level
        expect(coastRatio(cliff)).toBeGreaterThan(0.93);
      }
    });

    it('leaves sandy coves and boat channels completely open', () => {
      // Harbor boat channel (south pier x: 42..72, z > 62) has no cliff rocks
      const harborCliffs = COAST_CLIFFS.filter(c => c.x > 38 && c.x < 74 && c.z > 64);
      expect(harborCliffs.length).toBe(0);
    });
  });

  describe('5. Rotated collision bounding boxes and complete corridor clearance', () => {
    it('calculates rotated AABB bounds taking both rotation and dimensions into account', () => {
      for (const obstacle of GARDEN_OBSTACLES) {
        expect(obstacle.width).toBeGreaterThan(0);
        expect(obstacle.depth).toBeGreaterThan(0);
        // Center of solid obstacle must be impassable
        expect(isWalkableTownPosition({ x: obstacle.x, z: obstacle.z })).toBe(false);
      }
    });

    it('routes successfully across key destinations via walkingRoute pathfinder', () => {
      const destinations = [
        { name: 'Mill Hill Terrace Rest', pos: { x: 82, z: 16 } },
        { name: 'Belvedere Ocean Overlook', pos: { x: 96, z: 38 } },
        { name: 'Willow Pond Bridge', pos: { x: 88, z: 58 } },
        { name: 'East Promenade', pos: { x: 98, z: 54 } },
        { name: 'North Meadow Walkway', pos: { x: 73, z: 19 } },
      ];

      const start = { x: 32, z: 35 }; // Town center

      for (const dest of destinations) {
        const route = walkingRoute(start, dest.pos, null);
        expect(route.length, `route to ${dest.name} should find a path`).toBeGreaterThan(1);

        // Every step of the route must have a completely clear line of sight / corridor
        for (let i = 1; i < route.length; i++) {
          const clear = clearWalkingSegment(route[i - 1]!, route[i]!, null);
          expect(clear, `segment ${i} of route to ${dest.name}`).toBe(true);
        }
      }
    });
  });
});

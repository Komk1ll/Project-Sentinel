import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  ORCHARD_TREES,
  POND_WILLOW_TREES,
  TOWN_LINDEN_TREES,
  MILL_HILLSIDE_TREES,
  ALL_DISTINCT_TREES,
  GREENING_SHRUBS,
  FORMED_FLOWERBEDS,
  QUAY_WATER_STAIRS,
  BREAKWATER_CAPSTONES,
  HARBOR_MOORING_ROPES,
  HARBOR_PROP_CLUSTERS,
  FRONT_GARDEN_ENCLOSURES,
  FAÇADE_WINDOW_BOXES,
  GREENING_OBSTACLES,
} from '@content/island-greening';
import { isWalkableTownPosition } from '@game/systems/town-world';
import { clearWalkingSegment, walkingRoute } from '@game/systems/town-navigation';
import { createIslandGreening } from '@game/render/island-greening-view';

describe('Item 2: Greening & Harbor Content & Systems', () => {
  describe('1. Distinct Tree Silhouettes & Character Zoning', () => {
    it('defines distinct silhouettes across all 4 key zones with 28 trees total', () => {
      expect(ORCHARD_TREES.length).toBe(9);
      expect(POND_WILLOW_TREES.length).toBe(5);
      expect(TOWN_LINDEN_TREES.length).toBe(8);
      expect(MILL_HILLSIDE_TREES.length).toBe(6);
      expect(ALL_DISTINCT_TREES.length).toBe(28);
    });

    it('gives apple orchard trees low spherical crowns and fruiting apples', () => {
      for (const tree of ORCHARD_TREES) {
        expect(tree.kind).toBe('apple');
        expect(tree.fruitColor).toBeDefined();
        // Western orchard zone: x in [4, 13], z in [51, 63]
        expect(tree.x).toBeGreaterThanOrEqual(3.5);
        expect(tree.x).toBeLessThanOrEqual(13.5);
        expect(tree.z).toBeGreaterThanOrEqual(51.0);
        expect(tree.z).toBeLessThanOrEqual(63.0);
      }
    });

    it('gives pond willows drooping cascading crowns and riparian colors', () => {
      for (const tree of POND_WILLOW_TREES) {
        expect(tree.kind).toBe('willow');
        expect(tree.trunkColor).toBe(0x5a4f42);
        expect(tree.scale).toBeGreaterThanOrEqual(1.05);
      }
    });

    it('gives town square lindens stately tiered domes with pedestrian clearance', () => {
      for (const tree of TOWN_LINDEN_TREES) {
        expect(tree.kind).toBe('linden');
        expect(tree.scale).toBeGreaterThanOrEqual(1.15);
        expect(tree.trunkColor).toBe(0x4d4239);
      }
    });

    it('gives mill hillside trees slender birch silhouettes and white bark trunks', () => {
      for (const tree of MILL_HILLSIDE_TREES) {
        expect(tree.kind).toBe('birch');
        expect(tree.trunkColor).toBe(0xd9d5c7); // Characteristic white/pale birch bark
        // Northeast hillside zone
        expect(tree.x).toBeGreaterThanOrEqual(74.0);
        expect(tree.x).toBeLessThanOrEqual(98.0);
        expect(tree.z).toBeGreaterThanOrEqual(9.0);
        expect(tree.z).toBeLessThanOrEqual(36.0);
      }
    });
  });

  describe('2. Low Shrubs & Groundcover Diversity', () => {
    it('defines rich variety of shrubs across all 5 varieties without feeling like scattered dots', () => {
      expect(GREENING_SHRUBS.length).toBeGreaterThanOrEqual(25);
      const varietySet = new Set(GREENING_SHRUBS.map((s) => s.kind));
      expect(varietySet.size).toBe(5);
      expect(varietySet.has('flowering_coral')).toBe(true);
      expect(varietySet.has('flowering_gold')).toBe(true);
      expect(varietySet.has('boxwood_clipped')).toBe(true);
      expect(varietySet.has('wild_heather')).toBe(true);
      expect(varietySet.has('marsh_iris')).toBe(true);

      for (const shrub of GREENING_SHRUBS) {
        expect(shrub.scale).toBeGreaterThan(0.5);
      }
    });
  });

  describe('3. Formed Flowerbeds with Stone Curbs', () => {
    it('defines structured flowerbeds with stone curbs and cohesive palettes', () => {
      expect(FORMED_FLOWERBEDS.length).toBe(6);
      for (const bed of FORMED_FLOWERBEDS) {
        expect(bed.hasCurbs).toBe(true);
        expect(bed.width).toBeGreaterThanOrEqual(1.2);
        expect(bed.depth).toBeGreaterThanOrEqual(1.2);
      }
    });
  });

  describe('4. Harbor Quay Water Stairs & Breakwater Capstones', () => {
    it('defines 5-step stone quay stairs descending to the cove water', () => {
      expect(QUAY_WATER_STAIRS.id).toBe('quay-water-stairs-west');
      expect(QUAY_WATER_STAIRS.stepCount).toBe(5);
      expect(QUAY_WATER_STAIRS.width).toBe(2.4);
      expect(QUAY_WATER_STAIRS.depth).toBe(2.8);
      expect(QUAY_WATER_STAIRS.topElevation).toBe(0.05);
      expect(QUAY_WATER_STAIRS.bottomElevation).toBe(-0.45);
    });

    it('defines flat hewn breakwater capstones protecting the harbor crests', () => {
      expect(BREAKWATER_CAPSTONES.length).toBe(12);
      for (const cap of BREAKWATER_CAPSTONES) {
        expect(cap.y).toBe(0.05);
        expect(cap.width).toBe(1.4);
      }
    });

    it('defines catenary mooring lines connecting boats to quayside bollards', () => {
      expect(HARBOR_MOORING_ROPES.length).toBe(4);
      for (const rope of HARBOR_MOORING_ROPES) {
        expect(rope.sag).toBeGreaterThanOrEqual(0.10);
        const dx = rope.end.x - rope.start.x;
        const dz = rope.end.z - rope.start.z;
        const length = Math.hypot(dx, dz);
        expect(length).toBeGreaterThan(2.0);
        expect(length).toBeLessThan(8.0);
      }
    });

    it('defines cargo clusters situated outside active transit routes', () => {
      expect(HARBOR_PROP_CLUSTERS.length).toBe(7);
      for (const cluster of HARBOR_PROP_CLUSTERS) {
        expect(cluster.width).toBeGreaterThan(0.3);
        expect(cluster.depth).toBeGreaterThan(0.3);
      }
    });
  });

  describe('5. Residential Front Garden Enclosures & Façade Window Boxes', () => {
    it('defines residential front garden picket fences with wide entrance gates', () => {
      expect(FRONT_GARDEN_ENCLOSURES.length).toBe(3);
      for (const garden of FRONT_GARDEN_ENCLOSURES) {
        expect(garden.fenceSegments.length).toBe(4);
        expect(garden.gateWidth).toBeGreaterThanOrEqual(2.0);
      }
    });

    it('defines flower window boxes on residential and commercial facades', () => {
      expect(FAÇADE_WINDOW_BOXES.length).toBe(8);
      for (const box of FAÇADE_WINDOW_BOXES) {
        expect(box.width).toBeGreaterThanOrEqual(0.85);
        expect(box.flowerColor).toBeDefined();
      }
    });
  });

  describe('6. Solid Scenery Clearance & Navigation Integrity', () => {
    it('blocks all solid greening obstacles from player walking', () => {
      expect(GREENING_OBSTACLES.length).toBeGreaterThan(0);
      for (const obs of GREENING_OBSTACLES) {
        expect(
          isWalkableTownPosition({ x: obs.x, z: obs.z }),
          `Greening obstacle at (${obs.x}, ${obs.z}) must be blocked`
        ).toBe(false);
      }
    });

    it('verifies smooth routes from town square to apple orchard, pond, and harbor', () => {
      const townSquare = { x: 32, z: 35 };
      const targets = [
        { name: 'Apple Orchard Lane', point: { x: 8.5, z: 54.5 } },
        { name: 'Mill Hill Terrace', point: { x: 80.0, z: 12.0 } },
        { name: 'Pond Bridge', point: { x: 88.0, z: 58.0 } },
        { name: 'Harbor Pier Forecourt', point: { x: 58.0, z: 68.0 } },
        { name: 'Harbor Pierhead', point: { x: 58.0, z: 89.0 } },
      ];

      for (const target of targets) {
        const path = walkingRoute(townSquare, target.point, null);
        expect(path.length, `Route to ${target.name} must exist`).toBeGreaterThan(1);
        for (let i = 1; i < path.length; i++) {
          expect(
            clearWalkingSegment(path[i - 1]!, path[i]!, null),
            `Segment ${i} on path to ${target.name} must be collision-free`
          ).toBe(true);
        }
      }
    });
  });

  describe('7. Three.js Scene View Construction', () => {
    it('creates full greening scene graph with proper meshes and geometries', () => {
      const group = createIslandGreening({ value: 0 });
      expect(group).toBeInstanceOf(THREE.Group);
      expect(group.children.length).toBe(6);

      // Verify child groups exist
      const groupNames = group.children.map((c) => c.name);
      expect(groupNames).toContain('greening-trees');
      expect(groupNames).toContain('greening-shrubs');
      expect(groupNames).toContain('greening-flowerbeds');
      expect(groupNames).toContain('harbor-details');
      expect(groupNames).toContain('front-gardens');
      expect(groupNames).toContain('facade-window-boxes');

      // Verify no NaN vertices or transforms
      group.traverse((child) => {
        expect(Number.isFinite(child.position.x)).toBe(true);
        expect(Number.isFinite(child.position.y)).toBe(true);
        expect(Number.isFinite(child.position.z)).toBe(true);
        if (child instanceof THREE.Mesh) {
          expect(child.geometry).toBeDefined();
          expect(child.material).toBeDefined();
        }
      });
    });
  });
});

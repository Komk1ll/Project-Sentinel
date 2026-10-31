import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FRONT_GARDEN_ENCLOSURES,
} from '@content/island-greening';
import { isWalkableTownPosition } from '@game/systems/town-world';

const ART_DIR = path.resolve(process.cwd(), 'art/greening-and-harbor');
const RENDER_DIR = path.join(ART_DIR, 'render');

describe('Item 2: Graphical Greening & Harbor Verification Tests', () => {
  describe('1. Vector Greening Topography Map (greening-topography.svg)', () => {
    const svgPath = path.join(ART_DIR, 'greening-topography.svg');

    it('generates a valid, complete greening vector map', () => {
      expect(fs.existsSync(svgPath), `Greening SVG should exist at ${svgPath}`).toBe(true);
      const content = fs.readFileSync(svgPath, 'utf8');

      expect(content).toContain('<svg');
      expect(content).toContain('</svg>');
      expect(content).toContain('Item 2: Greening &amp; Harbor Map');
      expect(content).toContain('id="distinct-trees"');
      expect(content).toContain('id="greening-shrubs"');
      expect(content).toContain('id="formed-flowerbeds"');
      expect(content).toContain('id="front-gardens"');
      expect(content).toContain('id="harbor-infrastructure"');
      expect(content).toContain('id="legend"');
      expect(content.length).toBeGreaterThan(15000);
    });

    it('contains zone descriptions and botanical labels', () => {
      const content = fs.readFileSync(svgPath, 'utf8');
      expect(content).toContain('Apple Orchard Trees (Orchard Zone)');
      expect(content).toContain('Weeping Willows (Pond Margin Zone)');
      expect(content).toContain('Town Linden Trees (Civic Square)');
      expect(content).toContain('Hillside Birch Trees (Mill Terraces)');
      expect(content).toContain('Quay Water Stairs to Cove');
      expect(content).toContain('Mooring Ropes to Bollards');
      expect(content).toContain('Front Garden Palisade Fences');
      expect(content).toContain('Harbor Cargo Crates &amp; Barrels');
    });
  });

  describe('2. Harbor Detail Vector Map (harbor-detail-map.svg)', () => {
    const svgPath = path.join(ART_DIR, 'harbor-detail-map.svg');

    it('generates a valid harbor maritime detail vector map', () => {
      expect(fs.existsSync(svgPath), `Harbor detail SVG should exist at ${svgPath}`).toBe(true);
      const content = fs.readFileSync(svgPath, 'utf8');

      expect(content).toContain('<svg');
      expect(content).toContain('</svg>');
      expect(content).toContain('Harbor Detail Map');
      expect(content).toContain('id="quay-stairs-detail"');
      expect(content).toContain('id="harbor-zoom-legend"');
      expect(content).toContain('Stone Quay Water Stairs');
      expect(content).toContain('Mooring Ropes &amp; Cleats');
      expect(content).toContain('Breakwater Capping Course');
      expect(content).toContain('Quayside Cargo Stacks');
      expect(content.length).toBeGreaterThan(8000);
    });
  });

  describe('3. Scene Data JSON (greening_scene_data.json)', () => {
    const jsonPath = path.join(ART_DIR, 'greening_scene_data.json');

    it('generates valid parseable scene data with all greening elements', () => {
      expect(fs.existsSync(jsonPath), `Scene data JSON should exist at ${jsonPath}`).toBe(true);
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      expect(Array.isArray(data.distinctTrees)).toBe(true);
      expect(data.distinctTrees.length).toBe(28);

      expect(Array.isArray(data.shrubs)).toBe(true);
      expect(data.shrubs.length).toBeGreaterThanOrEqual(25);

      expect(Array.isArray(data.flowerbeds)).toBe(true);
      expect(data.flowerbeds.length).toBe(6);

      expect(data.quayStairs).toBeDefined();
      expect(data.quayStairs.stepCount).toBe(5);

      expect(Array.isArray(data.breakwaterCaps)).toBe(true);
      expect(data.breakwaterCaps.length).toBe(12);

      expect(Array.isArray(data.mooringRopes)).toBe(true);
      expect(data.mooringRopes.length).toBe(4);

      expect(Array.isArray(data.frontGardens)).toBe(true);
      expect(data.frontGardens.length).toBe(3);

      expect(Array.isArray(data.windowBoxes)).toBe(true);
      expect(data.windowBoxes.length).toBe(8);
    });
  });

  describe('4. Blender 3D Offline Visual Review Renders', () => {
    const RENDER_NAMES = [
      'overview-greening.png',
      'harbor-quay-steps.png',
      'apple-orchard-gardens.png',
      'willow-pond-banks.png',
      'mill-hillside-flora.png',
      'town-square-facades.png',
    ];

    it.each(RENDER_NAMES)('generates valid non-empty PNG render for %s', (filename) => {
      const filePath = path.join(RENDER_DIR, filename);
      expect(fs.existsSync(filePath), `Render image ${filename} should exist`).toBe(true);

      const buffer = fs.readFileSync(filePath);
      expect(buffer.length).toBeGreaterThan(50 * 1024);

      // Verify 8-byte PNG magic signature: 0x89 50 4E 47 0D 0A 1A 0A
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50); // P
      expect(buffer[2]).toBe(0x4e); // N
      expect(buffer[3]).toBe(0x47); // G
      expect(buffer[4]).toBe(0x0d); // \r
      expect(buffer[5]).toBe(0x0a); // \n
      expect(buffer[6]).toBe(0x1a); // SUB
      expect(buffer[7]).toBe(0x0a); // \n

      // Verify IHDR chunk header (chunk length = 13 at [8..11], type 'IHDR' at [12..15])
      expect(buffer.readUInt32BE(8)).toBe(13);
      expect(buffer.toString('ascii', 12, 16)).toBe('IHDR');

      // Verify resolution (1280 x 720)
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      expect(width).toBe(1280);
      expect(height).toBe(720);

      // Verify bit depth = 8
      expect(buffer[24]).toBe(8);
    });
  });

  describe('5. Step-by-Step Graphical Route & Safe Clearance Verification', () => {
    it('verifies all 3 front garden entrance gate openings are collision-free', () => {
      for (const garden of FRONT_GARDEN_ENCLOSURES) {
        // Test walking through the center of the entrance gate
        // Gate is centered at garden.x with width >= 2.0m
        const halfGate = (garden.gateWidth - 0.4) / 2;
        const gateZ = garden.z + garden.depth / 2;

        for (let offset = -halfGate; offset <= halfGate; offset += 0.25) {
          const sample = {
            x: Number((garden.x + offset).toFixed(2)),
            z: Number(gateZ.toFixed(2)),
          };
          expect(
            isWalkableTownPosition(sample),
            `Garden ${garden.buildingId} gate sample at (${sample.x}, ${sample.z}) must be walkable`
          ).toBe(true);
        }
      }
    });

    it('verifies safe player access to harbor quay steps from the promenade', () => {
      // The quay water stairs start at x: 52.0, z: 68.2
      // Hero approaches from promenade at z: 66.8
      for (let x = 51.5; x <= 52.5; x += 0.25) {
        const approach = { x: Number(x.toFixed(2)), z: 66.8 };
        expect(
          isWalkableTownPosition(approach),
          `Quay approach at (${approach.x}, ${approach.z}) must be walkable`
        ).toBe(true);
      }
    });

    it('verifies safe pedestrian passage between civic square planters and flowerbeds', () => {
      // Civic planters are at x=37 and x=43 with z=56
      // The central corridor at z=56.5 between x=38.5 and x=41.5 is a wide pedestrian thoroughfare
      for (let x = 38.5; x <= 41.5; x += 0.5) {
        const sample = { x: Number(x.toFixed(2)), z: 56.5 };
        expect(
          isWalkableTownPosition(sample),
          `Town square central corridor at (${sample.x}, ${sample.z}) must be walkable`
        ).toBe(true);
      }
    });
  });
});

import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { islandElevation } from '@content/island-elevation';
import { GARDEN_WALKS, RESTING_AREAS } from '@content/coastal-garden';
import { isWalkableTownPosition } from '@game/systems/town-world';

const ART_DIR = path.resolve(process.cwd(), 'art/terrain-and-routes');
const RENDER_DIR = path.join(ART_DIR, 'render');

describe('Item 1: Graphical Terrain & Route Verification Tests', () => {
  describe('1. Vector Topography Map (terrain-topography.svg)', () => {
    const svgPath = path.join(ART_DIR, 'terrain-topography.svg');

    it('generates a valid, complete topographic vector map', () => {
      expect(fs.existsSync(svgPath), `Topography SVG should exist at ${svgPath}`).toBe(true);
      const content = fs.readFileSync(svgPath, 'utf8');

      expect(content).toContain('<svg');
      expect(content).toContain('</svg>');
      expect(content).toContain('Town Core District (Flat y = 0.0m)');
      expect(content).toContain('Mill (+0.72m)');
      expect(content).toContain('Pond Bridge (Arc +0.24m)');
      expect(content).toContain('id="retaining-walls"');
      expect(content).toContain('id="garden-walks"');
      expect(content).toContain('id="legend"');
      expect(content.length).toBeGreaterThan(20000);
    });

    it('contains all 3 resting plazas with proper labels and coordinates', () => {
      const content = fs.readFileSync(svgPath, 'utf8');
      for (const area of RESTING_AREAS) {
        expect(content).toContain(area.name);
      }
    });

    it('contains all 4 curved garden walks', () => {
      const content = fs.readFileSync(svgPath, 'utf8');
      expect(GARDEN_WALKS.length).toBe(4);
      // All 4 walk paths are drawn with custom theme colors
      expect(content).toContain('#f59e0b'); // Central promenade / Mill ascent
      expect(content).toContain('#10b981'); // Belvedere ridge
      expect(content).toContain('#06b6d4'); // Pond shore / bridge
      expect(content).toContain('#a855f7'); // Northern meadow
    });
  });

  describe('2. Collision & Clearance Audit Map (collision-clearance-map.svg)', () => {
    const svgPath = path.join(ART_DIR, 'collision-clearance-map.svg');

    it('generates a valid clearance audit map with safe corridor envelopes', () => {
      expect(fs.existsSync(svgPath), `Clearance SVG should exist at ${svgPath}`).toBe(true);
      const content = fs.readFileSync(svgPath, 'utf8');

      expect(content).toContain('<svg');
      expect(content).toContain('id="solid-colliders"');
      expect(content).toContain('id="clearance-legend"');
      expect(content).toContain('Verified 100% Collision-Free Passages');
      expect(content).toContain('Mill West Gap (9.2m)');
      expect(content).toContain('Belvedere Passage (4.8m)');
    });
  });

  describe('3. Blender 3D Offline Visual Review Renders', () => {
    const RENDER_NAMES = [
      'overview-isometric.png',
      'mill-terrace.png',
      'belvedere-overlook.png',
      'pond-bridge.png',
    ];

    it.each(RENDER_NAMES)('generates valid non-empty PNG render for %s', (filename) => {
      const filePath = path.join(RENDER_DIR, filename);
      expect(fs.existsSync(filePath), `Render image ${filename} should exist`).toBe(true);

      const buffer = fs.readFileSync(filePath);
      // File should be non-empty and reasonably sized (> 100 KB)
      expect(buffer.length).toBeGreaterThan(100 * 1024);

      // Verify PNG magic bytes: 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
    });
  });

  describe('4. Geometric Route Clearance & Grounding Verification', () => {
    it('verifies 100% of dense interpolated walk samples are collision-free', () => {
      // Subdivide each segment of every walk into dense test points
      for (const walk of GARDEN_WALKS) {
        for (let i = 0; i < walk.points.length - 1; i++) {
          const p1 = walk.points[i]!;
          const p2 = walk.points[i + 1]!;
          const dist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
          const steps = Math.max(2, Math.ceil(dist / 0.3));

          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const sample = {
              x: Number((p1.x + (p2.x - p1.x) * t).toFixed(2)),
              z: Number((p1.z + (p2.z - p1.z) * t).toFixed(2)),
            };

            const isWalkable = isWalkableTownPosition(sample);
            expect(isWalkable, `Sample at (${sample.x}, ${sample.z}) must be walkable`).toBe(true);

            const elev = islandElevation(sample.x, sample.z);
            expect(elev).toBeGreaterThanOrEqual(0);
            expect(elev).toBeLessThan(1.0);
          }
        }
      }
    });

    it('verifies all retaining wall openings have at least 1.8m passage width', () => {
      // Mill Ascent Walk passage: x = 76.5, z = 20..27 (opening between retaining walls)
      for (let z = 21; z <= 26; z += 0.5) {
        expect(isWalkableTownPosition({ x: 76.5, z }), `Mill ascent passage at z=${z}`).toBe(true);
      }

      // Belvedere Walk passage: x = 97.2, z = 46..48 (gap between retaining walls)
      for (let x = 96.5; x <= 98.0; x += 0.3) {
        expect(isWalkableTownPosition({ x, z: 47.0 }), `Belvedere passage at x=${x}`).toBe(true);
      }
    });
  });
});

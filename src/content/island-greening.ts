import type { TownObstacle } from '@content/town-props';

/** Reference hero height in metres used as the ergonomic benchmark. */
export const HERO_SCALE_HEIGHT = 1.70;

/* ==========================================================================
 * 1. TREE SILHOUETTES & ECOLOGICAL PLANTING ZONES
 * ========================================================================== */

export type TreeSilhouetteKind = 'apple' | 'willow' | 'linden' | 'birch';

export interface DistinctTree {
  readonly id: string;
  readonly kind: TreeSilhouetteKind;
  readonly x: number;
  readonly z: number;
  readonly scale: number;
  readonly rotation: number;
  readonly crownColor: number;
  readonly trunkColor: number;
  readonly fruitColor?: number;
}

/**
 * 1. Apple Orchard (x: 2..14, z: 50..64):
 * Compact, spreading fruit-laden trees with warm golden-amber fruit.
 * Organically staggered to avoid rigid machine-like rows.
 */
export const ORCHARD_TREES: readonly DistinctTree[] = [
  { id: 'orchard-1', kind: 'apple', x: 4.2, z: 53.0, scale: 0.95, rotation: 0.4, crownColor: 0x739154, trunkColor: 0x6e523b, fruitColor: 0xc87538 },
  { id: 'orchard-2', kind: 'apple', x: 8.5, z: 52.2, scale: 1.05, rotation: 1.8, crownColor: 0x8aa35f, trunkColor: 0x6e523b, fruitColor: 0xd9823f },
  { id: 'orchard-3', kind: 'apple', x: 12.0, z: 53.8, scale: 0.90, rotation: 3.1, crownColor: 0x739154, trunkColor: 0x6e523b, fruitColor: 0xc87538 },
  { id: 'orchard-4', kind: 'apple', x: 5.0, z: 57.5, scale: 1.00, rotation: 4.5, crownColor: 0x8aa35f, trunkColor: 0x6e523b, fruitColor: 0xd9823f },
  { id: 'orchard-5', kind: 'apple', x: 9.2, z: 57.0, scale: 1.10, rotation: 0.9, crownColor: 0x7b9856, trunkColor: 0x6e523b, fruitColor: 0xc87538 },
  { id: 'orchard-6', kind: 'apple', x: 12.5, z: 58.2, scale: 0.92, rotation: 2.3, crownColor: 0x8aa35f, trunkColor: 0x6e523b, fruitColor: 0xd9823f },
  { id: 'orchard-7', kind: 'apple', x: 4.0, z: 61.5, scale: 0.95, rotation: 5.2, crownColor: 0x739154, trunkColor: 0x6e523b, fruitColor: 0xc87538 },
  { id: 'orchard-8', kind: 'apple', x: 8.0, z: 61.8, scale: 1.05, rotation: 3.7, crownColor: 0x8aa35f, trunkColor: 0x6e523b, fruitColor: 0xd9823f },
  { id: 'orchard-9', kind: 'apple', x: 11.8, z: 62.0, scale: 0.88, rotation: 1.1, crownColor: 0x7b9856, trunkColor: 0x6e523b, fruitColor: 0xc87538 },
];

/**
 * 2. Willow Pond Margins (x: 76..100, z: 46..66):
 * Graceful weeping willows with cascading pendulous foliage over the water.
 */
export const POND_WILLOW_TREES: readonly DistinctTree[] = [
  { id: 'willow-1', kind: 'willow', x: 78.5, z: 51.5, scale: 1.15, rotation: 0.6, crownColor: 0x839b67, trunkColor: 0x5a4f42 },
  { id: 'willow-2', kind: 'willow', x: 82.0, z: 64.5, scale: 1.20, rotation: 2.1, crownColor: 0x8ea870, trunkColor: 0x5a4f42 },
  { id: 'willow-3', kind: 'willow', x: 93.0, z: 62.0, scale: 1.10, rotation: 4.2, crownColor: 0x839b67, trunkColor: 0x5a4f42 },
  { id: 'willow-4', kind: 'willow', x: 94.0, z: 49.5, scale: 1.15, rotation: 1.4, crownColor: 0x8ea870, trunkColor: 0x5a4f42 },
  { id: 'willow-5', kind: 'willow', x: 75.0, z: 5.5, scale: 1.05, rotation: 3.5, crownColor: 0x839b67, trunkColor: 0x5a4f42 },
];

/**
 * 3. Town Civic Core & Square (x: 16..48, z: 16..64):
 * Stately shade lindens with layered domed tiers flanking civic walkways.
 */
export const TOWN_LINDEN_TREES: readonly DistinctTree[] = [
  { id: 'linden-1', kind: 'linden', x: 37.0, z: 52.0, scale: 1.25, rotation: 0.3, crownColor: 0x5f7d4b, trunkColor: 0x4d4239 },
  { id: 'linden-2', kind: 'linden', x: 44.0, z: 52.0, scale: 1.20, rotation: 1.9, crownColor: 0x698852, trunkColor: 0x4d4239 },
  { id: 'linden-3', kind: 'linden', x: 37.0, z: 60.5, scale: 1.15, rotation: 3.4, crownColor: 0x5f7d4b, trunkColor: 0x4d4239 },
  { id: 'linden-4', kind: 'linden', x: 44.0, z: 60.5, scale: 1.22, rotation: 5.0, crownColor: 0x698852, trunkColor: 0x4d4239 },
  { id: 'linden-5', kind: 'linden', x: 20.0, z: 20.0, scale: 1.30, rotation: 0.8, crownColor: 0x5f7d4b, trunkColor: 0x4d4239 },
  { id: 'linden-6', kind: 'linden', x: 28.0, z: 20.0, scale: 1.28, rotation: 2.4, crownColor: 0x698852, trunkColor: 0x4d4239 },
  { id: 'linden-7', kind: 'linden', x: 20.0, z: 28.0, scale: 1.26, rotation: 4.1, crownColor: 0x5f7d4b, trunkColor: 0x4d4239 },
  { id: 'linden-8', kind: 'linden', x: 28.0, z: 28.0, scale: 1.32, rotation: 1.2, crownColor: 0x698852, trunkColor: 0x4d4239 },
];

/**
 * 4. Mill Hillside Terraces (x: 74..98, z: 12..32):
 * Slender airy birch trees with white bark and golden-green autumn crowns.
 */
export const MILL_HILLSIDE_TREES: readonly DistinctTree[] = [
  { id: 'birch-1', kind: 'birch', x: 77.5, z: 14.0, scale: 1.05, rotation: 0.5, crownColor: 0x98a85e, trunkColor: 0xd9d5c7 },
  { id: 'birch-2', kind: 'birch', x: 80.5, z: 10.0, scale: 1.15, rotation: 2.2, crownColor: 0xa9b768, trunkColor: 0xd9d5c7 },
  { id: 'birch-3', kind: 'birch', x: 92.5, z: 14.5, scale: 1.10, rotation: 3.8, crownColor: 0x98a85e, trunkColor: 0xd9d5c7 },
  { id: 'birch-4', kind: 'birch', x: 96.5, z: 17.5, scale: 1.15, rotation: 1.1, crownColor: 0xa9b768, trunkColor: 0xd9d5c7 },
  { id: 'birch-5', kind: 'birch', x: 91.0, z: 34.5, scale: 1.05, rotation: 4.6, crownColor: 0x98a85e, trunkColor: 0xd9d5c7 },
  { id: 'birch-6', kind: 'birch', x: 74.5, z: 28.5, scale: 1.00, rotation: 2.7, crownColor: 0xa9b768, trunkColor: 0xd9d5c7 },
];

export const ALL_DISTINCT_TREES: readonly DistinctTree[] = [
  ...ORCHARD_TREES,
  ...POND_WILLOW_TREES,
  ...TOWN_LINDEN_TREES,
  ...MILL_HILLSIDE_TREES,
];

/* ==========================================================================
 * 2. LOW BUSHES, SHAPED FLOWERBEDS & GROUNDCOVER PATTERNS
 * ========================================================================== */

export type ShrubKind = 'flowering_coral' | 'flowering_gold' | 'boxwood_clipped' | 'wild_heather' | 'marsh_iris';

export interface DistinctShrub {
  readonly x: number;
  readonly z: number;
  readonly kind: ShrubKind;
  readonly scale: number;
  readonly rotation: number;
}

export const GREENING_SHRUBS: readonly DistinctShrub[] = [
  // Orchard understory bushes & borders
  { x: 3.2, z: 51.5, kind: 'flowering_coral', scale: 0.9, rotation: 0.2 },
  { x: 6.8, z: 51.5, kind: 'flowering_gold', scale: 0.85, rotation: 1.4 },
  { x: 10.5, z: 51.8, kind: 'flowering_coral', scale: 0.95, rotation: 2.8 },
  { x: 13.2, z: 56.0, kind: 'flowering_gold', scale: 0.88, rotation: 4.1 },
  { x: 13.2, z: 60.5, kind: 'flowering_coral', scale: 0.92, rotation: 0.7 },

  // Mill Hillside terrace flora (heather & golden shrubs flanking paths)
  { x: 76.8, z: 18.5, kind: 'wild_heather', scale: 0.95, rotation: 0.8 },
  { x: 80.2, z: 14.5, kind: 'wild_heather', scale: 1.05, rotation: 2.1 },
  { x: 84.5, z: 13.5, kind: 'flowering_gold', scale: 0.90, rotation: 3.5 },
  { x: 91.0, z: 13.8, kind: 'wild_heather', scale: 1.10, rotation: 1.3 },
  { x: 94.2, z: 16.5, kind: 'flowering_gold', scale: 0.85, rotation: 4.9 },
  { x: 93.8, z: 28.5, kind: 'wild_heather', scale: 1.00, rotation: 2.4 },
  { x: 88.5, z: 32.5, kind: 'wild_heather', scale: 0.92, rotation: 0.5 },
  { x: 82.5, z: 32.5, kind: 'flowering_gold', scale: 0.95, rotation: 3.2 },

  // Pond riparian borders (marsh iris & water plants)
  { x: 81.2, z: 53.5, kind: 'marsh_iris', scale: 1.10, rotation: 0.4 },
  { x: 83.5, z: 53.0, kind: 'marsh_iris', scale: 0.95, rotation: 1.7 },
  { x: 92.5, z: 53.0, kind: 'marsh_iris', scale: 1.05, rotation: 3.1 },
  { x: 94.8, z: 54.5, kind: 'marsh_iris', scale: 0.90, rotation: 4.5 },
  { x: 95.0, z: 62.0, kind: 'marsh_iris', scale: 1.15, rotation: 2.0 },
  { x: 83.0, z: 63.5, kind: 'marsh_iris', scale: 1.00, rotation: 0.9 },
  { x: 79.5, z: 61.5, kind: 'marsh_iris', scale: 1.05, rotation: 3.7 },

  // Town Square & civic gardens (clipped boxwood & formal beds)
  { x: 38.5, z: 54.5, kind: 'boxwood_clipped', scale: 1.0, rotation: 0.0 },
  { x: 42.5, z: 54.5, kind: 'boxwood_clipped', scale: 1.0, rotation: 0.0 },
  { x: 38.5, z: 58.5, kind: 'boxwood_clipped', scale: 1.0, rotation: 0.0 },
  { x: 42.5, z: 58.5, kind: 'boxwood_clipped', scale: 1.0, rotation: 0.0 },
  { x: 22.0, z: 22.0, kind: 'boxwood_clipped', scale: 0.9, rotation: 0.0 },
  { x: 26.0, z: 22.0, kind: 'boxwood_clipped', scale: 0.9, rotation: 0.0 },
  { x: 22.0, z: 26.0, kind: 'boxwood_clipped', scale: 0.9, rotation: 0.0 },
  { x: 26.0, z: 26.0, kind: 'boxwood_clipped', scale: 0.9, rotation: 0.0 },
];

export interface FormedFlowerbed {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
  readonly rotation: number;
  readonly primaryColor: number;
  readonly secondaryColor: number;
  readonly hasCurbs: boolean;
}

export const FORMED_FLOWERBEDS: readonly FormedFlowerbed[] = [
  // Civic Town Square flowerbeds
  { id: 'bed-sq-1', name: 'Square North Bed', x: 40.5, z: 53.5, width: 3.8, depth: 1.2, rotation: 0, primaryColor: 0xe5a347, secondaryColor: 0xc86472, hasCurbs: true },
  { id: 'bed-sq-2', name: 'Square South Bed', x: 40.5, z: 59.5, width: 3.8, depth: 1.2, rotation: 0, primaryColor: 0xc86472, secondaryColor: 0xe5a347, hasCurbs: true },
  // Park central garden beds
  { id: 'bed-park-1', name: 'Park West Border', x: 19.5, z: 24.0, width: 1.2, depth: 4.8, rotation: 0, primaryColor: 0x9b7ec2, secondaryColor: 0xe8b859, hasCurbs: true },
  { id: 'bed-park-2', name: 'Park East Border', x: 28.5, z: 24.0, width: 1.2, depth: 4.8, rotation: 0, primaryColor: 0xe8b859, secondaryColor: 0x9b7ec2, hasCurbs: true },
  // Mill terrace floral band
  { id: 'bed-mill-1', name: 'Mill Hill Heather Terrace', x: 86.0, z: 15.5, width: 6.5, depth: 1.6, rotation: 0.1, primaryColor: 0x956b9c, secondaryColor: 0xd9b362, hasCurbs: true },
  // Belvedere overlook floral perimeter
  { id: 'bed-belv-1', name: 'Belvedere Floral Curve', x: 96.0, z: 35.0, width: 4.2, depth: 1.3, rotation: -0.2, primaryColor: 0xca6f7d, secondaryColor: 0xecd078, hasCurbs: true },
];

/* ==========================================================================
 * 3. HARBOR ENHANCEMENTS: BREAKWATER CAPS, WATER STAIRS & MOORING ROPES
 * ========================================================================== */

export interface WaterStairs {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
  readonly rotation: number;
  readonly topElevation: number;
  readonly bottomElevation: number;
  readonly stepCount: number;
}

/**
 * Broad stone quay steps descending from the seaside promenade down to the sandy cove / water.
 * Located at x: 52.0, z: 68.2 (west of the pier forecourt), providing natural, safe access.
 */
export const QUAY_WATER_STAIRS: WaterStairs = {
  id: 'quay-water-stairs-west',
  x: 52.0,
  z: 68.2,
  width: 2.4,
  depth: 2.8,
  rotation: -0.15,
  topElevation: 0.05,
  bottomElevation: -0.45,
  stepCount: 5,
};

export interface BreakwaterCapSegment {
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
  readonly rotation: number;
  readonly y: number;
}

/** Flat hewn masonry capstones placed along the top crest of the breakwaters. */
export const BREAKWATER_CAPSTONES: readonly BreakwaterCapSegment[] = [
  // West breakwater arm capstones
  { x: 46.0, z: 76.0, width: 1.4, depth: 3.5, rotation: 0, y: 0.05 },
  { x: 46.0, z: 80.0, width: 1.4, depth: 3.5, rotation: 0, y: 0.05 },
  { x: 46.0, z: 84.0, width: 1.4, depth: 3.5, rotation: 0, y: 0.05 },
  { x: 46.0, z: 87.5, width: 1.4, depth: 3.0, rotation: 0, y: 0.05 },
  { x: 47.5, z: 90.8, width: 1.4, depth: 3.2, rotation: -0.55, y: 0.05 },
  { x: 50.5, z: 93.5, width: 1.4, depth: 3.0, rotation: -1.25, y: 0.05 },
  // East breakwater arm capstones
  { x: 71.0, z: 76.0, width: 1.4, depth: 3.5, rotation: 0, y: 0.05 },
  { x: 71.0, z: 80.0, width: 1.4, depth: 3.5, rotation: 0, y: 0.05 },
  { x: 71.0, z: 84.0, width: 1.4, depth: 3.5, rotation: 0, y: 0.05 },
  { x: 71.0, z: 87.5, width: 1.4, depth: 3.0, rotation: 0, y: 0.05 },
  { x: 69.5, z: 90.8, width: 1.4, depth: 3.2, rotation: 0.55, y: 0.05 },
  { x: 66.5, z: 93.5, width: 1.4, depth: 3.0, rotation: 1.25, y: 0.05 },
];

export interface MooringRope {
  readonly id: string;
  readonly start: { x: number; y: number; z: number };
  readonly end: { x: number; y: number; z: number };
  readonly sag: number;
}

/** Catenary mooring ropes tying boats to dock bollards. */
export const HARBOR_MOORING_ROPES: readonly MooringRope[] = [
  // Boat 0 (x: 62.2, z: 82) tied to Pier East Bollards
  { id: 'rope-b0-bow', start: { x: 62.0, y: 0.15, z: 83.8 }, end: { x: 59.66, y: 0.22, z: 83.5 }, sag: 0.12 },
  { id: 'rope-b0-stern', start: { x: 62.4, y: 0.15, z: 80.2 }, end: { x: 59.66, y: 0.22, z: 80.5 }, sag: 0.10 },
  // Boat 1 (x: 53.6, z: 83) tied to Pier West Bollards
  { id: 'rope-b1-bow', start: { x: 53.8, y: 0.15, z: 84.8 }, end: { x: 56.34, y: 0.22, z: 84.5 }, sag: 0.12 },
  { id: 'rope-b1-stern', start: { x: 53.4, y: 0.15, z: 81.2 }, end: { x: 56.34, y: 0.22, z: 81.5 }, sag: 0.10 },
];

export interface HarborPropCluster {
  readonly id: string;
  readonly kind: 'crate_stack' | 'barrel_group' | 'rope_coil' | 'lifebuoy_stand' | 'bollard';
  readonly x: number;
  readonly z: number;
  readonly rotation: number;
  readonly width: number;
  readonly depth: number;
}

/** Deliberate groups of maritime cargo props situated strictly outside circulation. */
export const HARBOR_PROP_CLUSTERS: readonly HarborPropCluster[] = [
  // Cargo crate stack on shore forecourt east of pier entrance
  { id: 'harbor-crates-forecourt', kind: 'crate_stack', x: 61.5, z: 66.8, rotation: 0.2, width: 1.1, depth: 1.1 },
  // Fish barrels on shore forecourt west of pier entrance
  { id: 'harbor-barrels-forecourt', kind: 'barrel_group', x: 54.5, z: 66.8, rotation: -0.4, width: 0.9, depth: 0.9 },
  // Coiled rope piles near pier outer bollard edges
  { id: 'harbor-rope-coil-1', kind: 'rope_coil', x: 64.5, z: 90.2, rotation: 0.8, width: 0.5, depth: 0.5 },
  { id: 'harbor-rope-coil-2', kind: 'rope_coil', x: 51.5, z: 90.2, rotation: 1.4, width: 0.5, depth: 0.5 },
  // Lifebuoy station near pier shore approach (clear of z=70 coast path)
  { id: 'harbor-lifebuoy-pier', kind: 'lifebuoy_stand', x: 55.4, z: 67.8, rotation: 0, width: 0.35, depth: 0.35 },
  // Lighthouse service goods cluster (south-east of lighthouse base)
  { id: 'harbor-crates-lighthouse', kind: 'crate_stack', x: 68.6, z: 66.8, rotation: -0.6, width: 1.0, depth: 1.0 },
  { id: 'harbor-barrels-lighthouse', kind: 'barrel_group', x: 68.8, z: 64.6, rotation: 0.3, width: 0.85, depth: 0.85 },
];

/* ==========================================================================
 * 4. UNIFIED FACADES, FRONT GARDEN PALISADES & WINDOW BOXES
 * ========================================================================== */

export interface FrontGardenEnclosure {
  readonly buildingId: string;
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
  readonly fenceSegments: readonly { x: number; z: number; width: number; depth: number; rotation: number }[];
  readonly gateWidth: number;
}

/**
 * Picket palisade front gardens for residential houses (home-1, home-3, home-7).
 * Each has an open entrance gate corridor (>= 1.8m wide) perfectly aligned
 * with the front door, ensuring 100% unimpeded player access.
 */
export const FRONT_GARDEN_ENCLOSURES: readonly FrontGardenEnclosure[] = [
  // home-1 (x: 6, z: 7, width: 5, depth: 8, entrance at x: 6, z: 12)
  {
    buildingId: 'home-1',
    x: 6.0,
    z: 12.2,
    width: 6.0,
    depth: 2.2,
    gateWidth: 2.0,
    fenceSegments: [
      // Left front picket
      { x: 4.0, z: 13.2, width: 1.8, depth: 0.08, rotation: 0 },
      // Right front picket
      { x: 8.0, z: 13.2, width: 1.8, depth: 0.08, rotation: 0 },
      // Left side picket
      { x: 3.1, z: 12.2, width: 0.08, depth: 2.0, rotation: 0 },
      // Right side picket
      { x: 8.9, z: 12.2, width: 0.08, depth: 2.0, rotation: 0 },
    ],
  },
  // home-3 (x: 56, z: 8, width: 9, depth: 8, entrance at x: 56, z: 13)
  {
    buildingId: 'home-3',
    x: 56.0,
    z: 13.2,
    width: 8.4,
    depth: 2.2,
    gateWidth: 2.2,
    fenceSegments: [
      { x: 52.8, z: 14.2, width: 3.0, depth: 0.08, rotation: 0 },
      { x: 59.2, z: 14.2, width: 3.0, depth: 0.08, rotation: 0 },
      { x: 51.3, z: 13.2, width: 0.08, depth: 2.0, rotation: 0 },
      { x: 60.7, z: 13.2, width: 0.08, depth: 2.0, rotation: 0 },
    ],
  },
  // home-7 (x: 56, z: 40, width: 9, depth: 8, entrance at x: 56, z: 45)
  {
    buildingId: 'home-7',
    x: 56.0,
    z: 45.2,
    width: 8.4,
    depth: 2.2,
    gateWidth: 2.2,
    fenceSegments: [
      { x: 52.8, z: 46.2, width: 3.0, depth: 0.08, rotation: 0 },
      { x: 59.2, z: 46.2, width: 3.0, depth: 0.08, rotation: 0 },
      { x: 51.3, z: 45.2, width: 0.08, depth: 2.0, rotation: 0 },
      { x: 60.7, z: 45.2, width: 0.08, depth: 2.0, rotation: 0 },
    ],
  },
];

export interface WindowBox {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly width: number;
  readonly rotation: number;
  readonly flowerColor: number;
}

/** Flower boxes mounted under residential and shop windows. */
export const FAÇADE_WINDOW_BOXES: readonly WindowBox[] = [
  // home-1 ground floor & upper floor window boxes
  { x: 4.4, y: 1.0, z: 11.1, width: 0.85, rotation: 0, flowerColor: 0xe87a82 },
  { x: 7.6, y: 1.0, z: 11.1, width: 0.85, rotation: 0, flowerColor: 0xf0c265 },
  // Cafe "Листва" facade boxes
  { x: 37.5, y: 1.0, z: 27.6, width: 0.95, rotation: 0, flowerColor: 0xe87a82 },
  { x: 42.5, y: 1.0, z: 27.6, width: 0.95, rotation: 0, flowerColor: 0xf0c265 },
  // Bakery "Тёплый хлеб" facade boxes
  { x: 21.5, y: 1.0, z: 59.6, width: 0.95, rotation: 0, flowerColor: 0xf0c265 },
  { x: 26.5, y: 1.0, z: 59.6, width: 0.95, rotation: 0, flowerColor: 0xe87a82 },
  // home-7 facade boxes
  { x: 53.5, y: 1.0, z: 44.1, width: 0.9, rotation: 0, flowerColor: 0xf0c265 },
  { x: 58.5, y: 1.0, z: 44.1, width: 0.9, rotation: 0, flowerColor: 0xe87a82 },
];

/* ==========================================================================
 * 5. ROTATED COLLIDERS & SAFETY CLEARANCES
 * ========================================================================== */

/** All solid greening & harbor obstacles taking complete dimensions into account. */
export const GREENING_OBSTACLES: readonly TownObstacle[] = [
  // All new distinct tree trunks (blocking player collision)
  ...ALL_DISTINCT_TREES.map(tree => ({
    x: tree.x,
    z: tree.z,
    width: Number((0.44 * tree.scale).toFixed(2)),
    depth: Number((0.44 * tree.scale).toFixed(2)),
  })),
  // Harbor prop clusters (cargo crates, barrel stacks, lifebuoy stands)
  ...HARBOR_PROP_CLUSTERS.filter(p => p.kind !== 'rope_coil').map(p => ({
    x: p.x,
    z: p.z,
    width: p.width,
    depth: p.depth,
  })),
  // Front garden fence segments
  ...FRONT_GARDEN_ENCLOSURES.flatMap(enclosure =>
    enclosure.fenceSegments.map(seg => ({
      x: seg.x,
      z: seg.z,
      width: seg.width,
      depth: seg.depth,
    }))
  ),
];

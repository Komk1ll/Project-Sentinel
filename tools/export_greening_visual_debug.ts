import * as fs from 'node:fs';
import * as path from 'node:path';
import { islandElevation, RETAINING_WALLS } from '../src/content/island-elevation';
import {
  GARDEN_WALKS,
  RESTING_AREAS,
  RESTING_BENCHES,
  GARDEN_TREES,
  COAST_CLIFFS,
  GARDEN_BRIDGE,
  ORCHARD_FENCES,
  SEAWALLS,
} from '../src/content/coastal-garden';
import {
  COAST_PATH,
  ISLAND_CENTER,
  coastRadius,
  shorelineRadius,
  MILL,
} from '../src/content/island';
import { TOWN_BUILDINGS, ROAD_CENTERS, TOWN_OPEN_SPACES } from '../src/content/town';
import {
  LIGHTHOUSE,
  PIER_DECKS,
  HARBOR_PATHS,
  BREAKWATERS,
  BREAKWATER_ROCKS,
  HARBOR_BOATS,
} from '../src/content/harbor';
import {
  ALL_DISTINCT_TREES,
  ORCHARD_TREES,
  POND_WILLOW_TREES,
  TOWN_LINDEN_TREES,
  MILL_HILLSIDE_TREES,
  GREENING_SHRUBS,
  FORMED_FLOWERBEDS,
  QUAY_WATER_STAIRS,
  BREAKWATER_CAPSTONES,
  HARBOR_MOORING_ROPES,
  HARBOR_PROP_CLUSTERS,
  FRONT_GARDEN_ENCLOSURES,
  FAÇADE_WINDOW_BOXES,
  GREENING_OBSTACLES,
} from '../src/content/island-greening';
import { ISLAND_PONDS } from '../src/content/town-life';

const OUTPUT_DIR = path.resolve(process.cwd(), 'art/greening-and-harbor');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const MIN_C = -15;
const MAX_C = 115;
const SCALE = 10; // 10 pixels per meter
const WIDTH = (MAX_C - MIN_C) * SCALE; // 1300 px
const HEIGHT = (MAX_C - MIN_C) * SCALE; // 1300 px

function tx(x: number): number {
  return Number(((x - MIN_C) * SCALE).toFixed(1));
}
function tz(z: number): number {
  return Number(((z - MIN_C) * SCALE).toFixed(1));
}

// 1. GENERATE COMPLETE GREENING TOPOGRAPHY SVG
function generateGreeningTopographySVG(): string {
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">`);
  parts.push(`<defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.35"/>
    </filter>
    <linearGradient id="oceanGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="beachGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e2d4a7"/>
      <stop offset="100%" stop-color="#d4c38d"/>
    </linearGradient>
  </defs>`);

  // Background (Deep Ocean)
  parts.push(`<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#oceanGrad)"/>`);

  // Outer Shoreline
  const shoreSteps = 120;
  let shorePath = '';
  for (let i = 0; i <= shoreSteps; i++) {
    const a = (i / shoreSteps) * Math.PI * 2;
    const r = shorelineRadius(a);
    const sx = tx(ISLAND_CENTER.x + Math.cos(a) * r);
    const sz = tz(ISLAND_CENTER.z + Math.sin(a) * r);
    shorePath += (i === 0 ? `M ${sx} ${sz}` : ` L ${sx} ${sz}`);
  }
  shorePath += ' Z';
  parts.push(`<path d="${shorePath}" fill="url(#beachGrad)" filter="url(#shadow)"/>`);

  // Coastline & Land Mass
  let landPath = '';
  for (let i = 0; i <= shoreSteps; i++) {
    const a = (i / shoreSteps) * Math.PI * 2;
    const r = coastRadius(a);
    const lx = tx(ISLAND_CENTER.x + Math.cos(a) * r);
    const lz = tz(ISLAND_CENTER.z + Math.sin(a) * r);
    landPath += (i === 0 ? `M ${lx} ${lz}` : ` L ${lx} ${lz}`);
  }
  landPath += ' Z';
  parts.push(`<path d="${landPath}" fill="#5d7e48"/>`);

  // Ponds
  for (const pond of ISLAND_PONDS) {
    parts.push(`<ellipse cx="${tx(pond.x)}" cy="${tz(pond.z)}" rx="${pond.width * SCALE * 0.5}" ry="${pond.depth * SCALE * 0.5}" fill="#38bdf8" stroke="#0284c7" stroke-width="2"/>`);
  }

  // Garden Footbridge
  parts.push(`<rect x="${tx(GARDEN_BRIDGE.x - GARDEN_BRIDGE.width / 2)}" y="${tz(GARDEN_BRIDGE.z - GARDEN_BRIDGE.depth / 2)}" width="${GARDEN_BRIDGE.width * SCALE}" height="${GARDEN_BRIDGE.depth * SCALE}" fill="#927558" stroke="#5a3d28" stroke-width="2" rx="3"/>`);

  // Roads and Pavements
  for (const road of ROAD_CENTERS) {
    parts.push(`<rect x="${tx(road - 2)}" y="${tz(0)}" width="${4 * SCALE}" height="${64 * SCALE}" fill="#64748b" opacity="0.7"/>`);
    parts.push(`<rect x="${tx(0)}" y="${tz(road - 2)}" width="${64 * SCALE}" height="${4 * SCALE}" fill="#64748b" opacity="0.7"/>`);
  }

  // Garden Walks (Splines)
  parts.push(`<g id="garden-walks">`);
  const walkColors = ['#f59e0b', '#10b981', '#06b6d4', '#a855f7'];
  GARDEN_WALKS.forEach((walk, idx) => {
    let d = '';
    walk.points.forEach((pt, i) => {
      d += (i === 0 ? `M ${tx(pt.x)} ${tz(pt.z)}` : ` L ${tx(pt.x)} ${tz(pt.z)}`);
    });
    if (walk.closed) d += ' Z';
    parts.push(`<path d="${d}" fill="none" stroke="${walkColors[idx]}" stroke-width="${walk.width * SCALE}" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>`);
  });
  parts.push(`</g>`);

  // Resting Plazas
  for (const rest of RESTING_AREAS) {
    parts.push(`<circle cx="${tx(rest.x)}" cy="${tz(rest.z)}" r="${rest.radius * SCALE}" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/>`);
  }

  // Town Buildings
  for (const b of TOWN_BUILDINGS) {
    parts.push(`<rect x="${tx(b.x - b.width / 2)}" y="${tz(b.z - b.depth / 2)}" width="${b.width * SCALE}" height="${b.depth * SCALE}" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>`);
    parts.push(`<text x="${tx(b.x)}" y="${tz(b.z)}" fill="#1e293b" font-size="10" font-family="sans-serif" text-anchor="middle">${b.name}</text>`);
  }

  // Front Gardens
  parts.push(`<g id="front-gardens">`);
  FRONT_GARDEN_ENCLOSURES.forEach(garden => {
    garden.fenceSegments.forEach(seg => {
      parts.push(`<rect x="${tx(seg.x - seg.width / 2)}" y="${tz(seg.z - seg.depth / 2)}" width="${seg.width * SCALE}" height="${seg.depth * SCALE}" fill="#fde047" stroke="#ca8a04" stroke-width="1.5"/>`);
    });
  });
  parts.push(`</g>`);

  // Formed Flowerbeds
  parts.push(`<g id="formed-flowerbeds">`);
  FORMED_FLOWERBEDS.forEach(bed => {
    const hexPrim = '#' + bed.primaryColor.toString(16).padStart(6, '0');
    parts.push(`<rect x="${tx(bed.x - bed.width / 2)}" y="${tz(bed.z - bed.depth / 2)}" width="${bed.width * SCALE}" height="${bed.depth * SCALE}" fill="${hexPrim}" stroke="#ffffff" stroke-width="1.5" rx="2"/>`);
  });
  parts.push(`</g>`);

  // Distinct Trees (Color coded by silhouette)
  parts.push(`<g id="distinct-trees">`);
  ALL_DISTINCT_TREES.forEach(tree => {
    const iconColors: Record<string, string> = {
      apple: '#ef4444', // Red apple icon
      willow: '#10b981', // Emerald weeping willow
      linden: '#047857', // Deep green shade linden
      birch: '#eab308', // Golden autumn birch
    };
    const c = iconColors[tree.kind] ?? '#22c55e';
    const r = (tree.scale * 1.4) * SCALE;
    parts.push(`<circle cx="${tx(tree.x)}" cy="${tz(tree.z)}" r="${r}" fill="${c}" opacity="0.8" stroke="#ffffff" stroke-width="1.5"/>`);
    parts.push(`<circle cx="${tx(tree.x)}" cy="${tz(tree.z)}" r="${0.3 * SCALE}" fill="#451a03"/>`);
  });
  parts.push(`</g>`);

  // Low Bushes & Groundcover
  parts.push(`<g id="greening-shrubs">`);
  GREENING_SHRUBS.forEach(shrub => {
    const shrubColors: Record<string, string> = {
      flowering_coral: '#f43f5e',
      flowering_gold: '#f59e0b',
      boxwood_clipped: '#15803d',
      wild_heather: '#a855f7',
      marsh_iris: '#38bdf8',
    };
    const sc = shrubColors[shrub.kind] ?? '#84cc16';
    parts.push(`<circle cx="${tx(shrub.x)}" cy="${tz(shrub.z)}" r="${shrub.scale * 0.7 * SCALE}" fill="${sc}" opacity="0.75"/>`);
  });
  parts.push(`</g>`);

  // Harbor: Pier & Breakwaters
  parts.push(`<g id="harbor-infrastructure">`);
  // Lighthouse
  parts.push(`<circle cx="${tx(LIGHTHOUSE.x)}" cy="${tz(LIGHTHOUSE.z)}" r="${LIGHTHOUSE.width * SCALE * 0.5}" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>`);
  // Pier Decks
  for (const d of PIER_DECKS) {
    parts.push(`<rect x="${tx(d.x - d.width / 2)}" y="${tz(d.z - d.depth / 2)}" width="${d.width * SCALE}" height="${d.depth * SCALE}" fill="#b45309" stroke="#78350f" stroke-width="2"/>`);
  }
  // Breakwater rocks & capstones
  for (const cap of BREAKWATER_CAPSTONES) {
    parts.push(`<rect x="${tx(cap.x - cap.width / 2)}" y="${tz(cap.y - cap.depth / 2)}" width="${cap.width * SCALE}" height="${cap.depth * SCALE}" fill="#94a3b8" stroke="#475569" stroke-width="1"/>`);
  }
  // Quay Water Stairs
  parts.push(`<rect x="${tx(QUAY_WATER_STAIRS.x - QUAY_WATER_STAIRS.width / 2)}" y="${tz(QUAY_WATER_STAIRS.z - QUAY_WATER_STAIRS.depth / 2)}" width="${QUAY_WATER_STAIRS.width * SCALE}" height="${QUAY_WATER_STAIRS.depth * SCALE}" fill="#64748b" stroke="#38bdf8" stroke-width="2"/>`);
  parts.push(`<text x="${tx(QUAY_WATER_STAIRS.x)}" y="${tz(QUAY_WATER_STAIRS.z - 1.8)}" fill="#38bdf8" font-size="10" font-family="sans-serif" font-weight="bold" text-anchor="middle">Quay Stairs</text>`);
  // Mooring Ropes
  HARBOR_MOORING_ROPES.forEach(rope => {
    parts.push(`<line x1="${tx(rope.start.x)}" y1="${tz(rope.start.z)}" x2="${tx(rope.end.x)}" y2="${tz(rope.end.z)}" stroke="#fbbf24" stroke-width="2.5" stroke-dasharray="3,2"/>`);
  });
  // Boats
  HARBOR_BOATS.forEach((boat, i) => {
    parts.push(`<ellipse cx="${tx(boat.x)}" cy="${tz(boat.z)}" rx="${1.0 * SCALE}" ry="${2.2 * SCALE}" fill="#0284c7" stroke="#ffffff" stroke-width="1.5"/>`);
  });
  // Harbor Cargo Stacks
  HARBOR_PROP_CLUSTERS.forEach(prop => {
    parts.push(`<rect x="${tx(prop.x - prop.width / 2)}" y="${tz(prop.z - prop.depth / 2)}" width="${prop.width * SCALE}" height="${prop.depth * SCALE}" fill="#d97706" stroke="#92400e" stroke-width="1"/>`);
  });
  parts.push(`</g>`);

  // Legend
  parts.push(`<g id="legend" transform="translate(20, 20)">
    <rect width="260" height="230" fill="#0f172a" opacity="0.9" rx="8" stroke="#334155" stroke-width="1.5"/>
    <text x="15" y="24" fill="#f8fafc" font-size="13" font-family="sans-serif" font-weight="bold">Item 2: Greening &amp; Harbor Map</text>
    <circle cx="25" cy="48" r="7" fill="#ef4444"/>
    <text x="42" y="52" fill="#cbd5e1" font-size="11" font-family="sans-serif">Apple Orchard Trees (Orchard Zone)</text>
    <circle cx="25" cy="72" r="7" fill="#10b981"/>
    <text x="42" y="76" fill="#cbd5e1" font-size="11" font-family="sans-serif">Weeping Willows (Pond Margin Zone)</text>
    <circle cx="25" cy="96" r="7" fill="#047857"/>
    <text x="42" y="100" fill="#cbd5e1" font-size="11" font-family="sans-serif">Town Linden Trees (Civic Square)</text>
    <circle cx="25" cy="120" r="7" fill="#eab308"/>
    <text x="42" y="124" fill="#cbd5e1" font-size="11" font-family="sans-serif">Hillside Birch Trees (Mill Terraces)</text>
    <rect x="18" y="138" width="14" height="10" fill="#64748b" stroke="#38bdf8"/>
    <text x="42" y="147" fill="#cbd5e1" font-size="11" font-family="sans-serif">Quay Water Stairs to Cove</text>
    <line x1="18" y1="168" x2="32" y2="168" stroke="#fbbf24" stroke-width="3"/>
    <text x="42" y="172" fill="#cbd5e1" font-size="11" font-family="sans-serif">Mooring Ropes to Bollards</text>
    <rect x="18" y="186" width="14" height="10" fill="#fde047" stroke="#ca8a04"/>
    <text x="42" y="195" fill="#cbd5e1" font-size="11" font-family="sans-serif">Front Garden Palisade Fences</text>
    <rect x="18" y="208" width="14" height="10" fill="#d97706"/>
    <text x="42" y="217" fill="#cbd5e1" font-size="11" font-family="sans-serif">Harbor Cargo Crates &amp; Barrels</text>
  </g>`);

  parts.push(`</svg>`);
  return parts.join('\n');
}

// 2. GENERATE DETAILED HARBOR ZOOM SVG
function generateHarborDetailSVG(): string {
  const parts: string[] = [];
  const H_MIN_X = 40;
  const H_MAX_X = 76;
  const H_MIN_Z = 62;
  const H_MAX_Z = 98;
  const H_SCALE = 25; // 25 pixels per meter (large zoom!)
  const H_WIDTH = (H_MAX_X - H_MIN_X) * H_SCALE; // 900 px
  const H_HEIGHT = (H_MAX_Z - H_MIN_Z) * H_SCALE; // 900 px

  function hx(x: number): number { return (x - H_MIN_X) * H_SCALE; }
  function hz(z: number): number { return (z - H_MIN_Z) * H_SCALE; }

  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${H_WIDTH} ${H_HEIGHT}" width="${H_WIDTH}" height="${H_HEIGHT}">`);
  // Water background
  parts.push(`<rect width="${H_WIDTH}" height="${H_HEIGHT}" fill="#0f2b38"/>`);

  // Beach sand cove
  parts.push(`<path d="M 0 0 L ${hx(56)} 0 C ${hx(54)} ${hz(68)}, ${hx(50)} ${hz(74)}, ${hx(44)} ${hz(78)} L 0 ${hz(78)} Z" fill="#d8c89b"/>`);

  // Quay promenade edge
  parts.push(`<path d="M ${hx(48)} 0 L ${hx(58)} 0 L ${hx(68)} 0 L ${hx(76)} 0 L ${hx(76)} ${hz(67)} L ${hx(64)} ${hz(68)} L ${hx(54)} ${hz(68)} L ${hx(48)} ${hz(67)} Z" fill="#8c8d82" stroke="#4a4c44" stroke-width="3"/>`);

  // Breakwaters
  BREAKWATERS.forEach((arm, armIdx) => {
    let d = '';
    arm.forEach((pt, i) => {
      d += (i === 0 ? `M ${hx(pt.x)} ${hz(pt.z)}` : ` L ${hx(pt.x)} ${hz(pt.z)}`);
    });
    parts.push(`<path d="${d}" fill="none" stroke="#545b5e" stroke-width="${4.0 * H_SCALE}" stroke-linecap="round" stroke-linejoin="round"/>`);
  });

  // Breakwater flat capstones
  BREAKWATER_CAPSTONES.forEach(cap => {
    parts.push(`<rect x="${hx(cap.x - cap.width / 2)}" y="${hz(cap.z - cap.depth / 2)}" width="${cap.width * H_SCALE}" height="${cap.depth * H_SCALE}" fill="#cbd5e1" stroke="#475569" stroke-width="1.5" rx="2"/>`);
  });

  // Wooden Pier Decks & Pilings
  PIER_DECKS.forEach(deck => {
    parts.push(`<rect x="${hx(deck.x - deck.width / 2)}" y="${hz(deck.z - deck.depth / 2)}" width="${deck.width * H_SCALE}" height="${deck.depth * H_SCALE}" fill="#92623b" stroke="#5c3818" stroke-width="2"/>`);
    // Deck plank lines
    const isMainSpine = deck.depth > deck.width;
    if (isMainSpine) {
      for (let z = deck.z - deck.depth / 2; z <= deck.z + deck.depth / 2; z += 0.8) {
        parts.push(`<line x1="${hx(deck.x - deck.width / 2)}" y1="${hz(z)}" x2="${hx(deck.x + deck.width / 2)}" y2="${hz(z)}" stroke="#5c3818" stroke-width="1" opacity="0.6"/>`);
      }
    }
  });

  // Lighthouse at (66, 65)
  parts.push(`<circle cx="${hx(LIGHTHOUSE.x)}" cy="${hz(LIGHTHOUSE.z)}" r="${LIGHTHOUSE.width * 0.5 * H_SCALE}" fill="#dc2626" stroke="#ffffff" stroke-width="4"/>`);
  parts.push(`<circle cx="${hx(LIGHTHOUSE.x)}" cy="${hz(LIGHTHOUSE.z)}" r="${1.2 * H_SCALE}" fill="#ffffff"/>`);

  // Quay Water Stairs at (52.0, 68.2)
  const st = QUAY_WATER_STAIRS;
  parts.push(`<g id="quay-stairs-detail">
    <rect x="${hx(st.x - st.width / 2)}" y="${hz(st.z - st.depth / 2)}" width="${st.width * H_SCALE}" height="${st.depth * H_SCALE}" fill="#94a3b8" stroke="#0284c7" stroke-width="2.5" rx="3"/>`);
  for (let i = 0; i < st.stepCount; i++) {
    const stepZ = st.z - st.depth / 2 + (i + 1) * (st.depth / st.stepCount);
    parts.push(`<line x1="${hx(st.x - st.width / 2)}" y1="${hz(stepZ)}" x2="${hx(st.x + st.width / 2)}" y2="${hz(stepZ)}" stroke="#334155" stroke-width="2"/>`);
  }
  // Iron safety handrails
  parts.push(`<line x1="${hx(st.x - st.width / 2 + 0.1)}" y1="${hz(st.z - st.depth / 2)}" x2="${hx(st.x - st.width / 2 + 0.1)}" y2="${hz(st.z + st.depth / 2)}" stroke="#0f172a" stroke-width="3"/>`);
  parts.push(`<line x1="${hx(st.x + st.width / 2 - 0.1)}" y1="${hz(st.z - st.depth / 2)}" x2="${hx(st.x + st.width / 2 - 0.1)}" y2="${hz(st.z + st.depth / 2)}" stroke="#0f172a" stroke-width="3"/>`);
  parts.push(`</g>`);

  // Moored Boats
  HARBOR_BOATS.forEach((boat, i) => {
    parts.push(`<g transform="translate(${hx(boat.x)}, ${hz(boat.z)}) rotate(${boat.rotation * (180 / Math.PI)})">
      <ellipse cx="0" cy="0" rx="${0.9 * H_SCALE}" ry="${2.2 * H_SCALE}" fill="#38bdf8" stroke="#0284c7" stroke-width="2"/>
      <rect x="${-0.6 * H_SCALE}" y="${-1.2 * H_SCALE}" width="${1.2 * H_SCALE}" height="${1.8 * H_SCALE}" fill="#e0f2fe" rx="3"/>
    </g>`);
  });

  // Mooring Ropes
  HARBOR_MOORING_ROPES.forEach(rope => {
    parts.push(`<line x1="${hx(rope.start.x)}" y1="${hz(rope.start.z)}" x2="${hx(rope.end.x)}" y2="${hz(rope.end.z)}" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>`);
  });

  // Cargo crate stacks and barrels
  HARBOR_PROP_CLUSTERS.forEach(prop => {
    if (prop.kind === 'crate_stack') {
      parts.push(`<rect x="${hx(prop.x - prop.width / 2)}" y="${hz(prop.z - prop.depth / 2)}" width="${prop.width * H_SCALE}" height="${prop.depth * H_SCALE}" fill="#d97706" stroke="#78350f" stroke-width="1.5" rx="2"/>`);
    } else if (prop.kind === 'barrel_group') {
      parts.push(`<circle cx="${hx(prop.x)}" cy="${hz(prop.z)}" r="${0.45 * H_SCALE}" fill="#92400e" stroke="#451a03" stroke-width="1.5"/>`);
    } else if (prop.kind === 'lifebuoy_stand') {
      parts.push(`<circle cx="${hx(prop.x)}" cy="${hz(prop.z)}" r="${0.35 * H_SCALE}" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>`);
    }
  });

  // Zoom Legend
  parts.push(`<g id="harbor-zoom-legend" transform="translate(20, 20)">
    <rect width="250" height="150" fill="#0f172a" opacity="0.9" rx="6" stroke="#334155" stroke-width="1.5"/>
    <text x="15" y="24" fill="#f8fafc" font-size="13" font-family="sans-serif" font-weight="bold">Harbor Detail Map</text>
    <rect x="18" y="38" width="14" height="10" fill="#94a3b8" stroke="#0284c7"/>
    <text x="42" y="47" fill="#cbd5e1" font-size="11" font-family="sans-serif">Stone Quay Water Stairs</text>
    <line x1="18" y1="68" x2="32" y2="68" stroke="#f59e0b" stroke-width="3"/>
    <text x="42" y="72" fill="#cbd5e1" font-size="11" font-family="sans-serif">Mooring Ropes &amp; Cleats</text>
    <rect x="18" y="86" width="14" height="10" fill="#cbd5e1" stroke="#475569"/>
    <text x="42" y="95" fill="#cbd5e1" font-size="11" font-family="sans-serif">Breakwater Capping Course</text>
    <rect x="18" y="110" width="14" height="10" fill="#d97706" stroke="#78350f"/>
    <text x="42" y="119" fill="#cbd5e1" font-size="11" font-family="sans-serif">Quayside Cargo Stacks</text>
  </g>`);

  parts.push(`</svg>`);
  return parts.join('\n');
}

// 3. GENERATE COMPLETE 3D SCENE DATA JSON FOR BLENDER REVIEW
function generateGreeningSceneData(): object {
  // Grid elevation
  const grid: { x: number; z: number; y: number }[][] = [];
  for (let z = -10; z <= 110; z += 2.0) {
    const row: { x: number; z: number; y: number }[] = [];
    for (let x = -10; x <= 110; x += 2.0) {
      row.push({ x, z, y: islandElevation(x, z) });
    }
    grid.push(row);
  }

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      item: 'Issue #2, Item 2: Greening & Harbor',
      elevationModel: 'islandElevation(x, z)',
    },
    elevationGrid: grid,
    distinctTrees: ALL_DISTINCT_TREES.map(t => ({
      ...t,
      y: islandElevation(t.x, t.z),
    })),
    shrubs: GREENING_SHRUBS.map(s => ({
      ...s,
      y: islandElevation(s.x, s.z),
    })),
    flowerbeds: FORMED_FLOWERBEDS.map(f => ({
      ...f,
      y: islandElevation(f.x, f.z),
    })),
    quayStairs: QUAY_WATER_STAIRS,
    breakwaterCaps: BREAKWATER_CAPSTONES,
    mooringRopes: HARBOR_MOORING_ROPES,
    harborProps: HARBOR_PROP_CLUSTERS.map(p => ({
      ...p,
      y: islandElevation(p.x, p.z),
    })),
    frontGardens: FRONT_GARDEN_ENCLOSURES,
    windowBoxes: FAÇADE_WINDOW_BOXES,
    walks: GARDEN_WALKS.map(w => ({
      points: w.points.map(p => ({ x: p.x, z: p.z, y: islandElevation(p.x, p.z) })),
      width: w.width,
      closed: w.closed,
    })),
    restingPlazas: RESTING_AREAS.map(r => ({
      ...r,
      y: islandElevation(r.x, r.z),
    })),
    retainingWalls: RETAINING_WALLS.map(w => ({
      ...w,
      y: islandElevation(w.x, w.z),
    })),
    buildings: TOWN_BUILDINGS,
    ponds: ISLAND_PONDS,
    bridge: GARDEN_BRIDGE,
    boats: HARBOR_BOATS,
    lighthouse: LIGHTHOUSE,
    pierDecks: PIER_DECKS,
  };
}

// EXECUTE EXPORT
const topoSvgPath = path.join(OUTPUT_DIR, 'greening-topography.svg');
fs.writeFileSync(topoSvgPath, generateGreeningTopographySVG(), 'utf8');

const harborSvgPath = path.join(OUTPUT_DIR, 'harbor-detail-map.svg');
fs.writeFileSync(harborSvgPath, generateHarborDetailSVG(), 'utf8');

const jsonPath = path.join(OUTPUT_DIR, 'greening_scene_data.json');
fs.writeFileSync(jsonPath, JSON.stringify(generateGreeningSceneData(), null, 2), 'utf8');

console.log('Successfully generated visual debug artifacts for Greening & Harbor:');
console.log(`  - ${topoSvgPath}`);
console.log(`  - ${harborSvgPath}`);
console.log(`  - ${jsonPath}`);

# Island Greening & Harbor Infrastructure Architecture

## Overview
This document specifies the architectural model, ecological zoning, botanical variety, harbor civil infrastructure, residential front garden enclosures, and visual debugging tooling implemented for **Issue #2, Item 2 ("Озеленение и гавань")**.

All systems adhere strictly to the project's decoupled architecture, strict TypeScript typing, atomic git workflows, and comprehensive automated unit and graphical testing standards.

---

## 1. Botanical Character Zoning & Tree Silhouettes

Previously, vegetation across the island suffered from repetitive identical geometric trees and evenly scattered floral dots. The greening architecture replaces this with **four ecologically and aesthetically distinct planting zones**, each featuring specialized crown silhouettes, trunk structures, and seasonal color palettes.

```
+--------------------------------------------------------------------------------+
|                               NORTHERN MEADOW & HILL                           |
|                             Birches (white bark, slender)                      |
|                                                                                |
|   WEST: APPLE ORCHARD               CENTRAL: CIVIC SQUARE      EAST: POND      |
|   - Low spherical crowns            - Tiered stately lindens   - Weeping       |
|   - Organic fruit spacing           - Pedestrian clearance       willows       |
|   - Gnarled trunks + apples         - Stone-curbed flowerbeds  - Water irises  |
|                                                                                |
|                               SOUTHERN HARBOR COVE                             |
|              Quay Stairs, Breakwater Capstones, Mooring Lines, Cargo           |
+--------------------------------------------------------------------------------+
```

### 1.1 Apple Orchard (Western District, $x \in [4, 13], z \in [51, 63]$)
- **Silhouette**: Spreading, compact spherical crowns (`spherical-low`, $R = 1.3..1.65\text{m}$) mounted on low, gnarled trunks ($H = 1.6..1.9\text{m}$).
- **Fruiting**: Warm golden-amber and ripe red apple clusters scattered along lower branches.
- **Placement**: Staggered organic grid with randomized rotational offsets and scale variation ($0.88..1.10\times$), completely eliminating mechanical orchard rows.

### 1.2 Willow Pond Margins (Riparian Zone, $x \in [75, 96], z \in [45, 66]$)
- **Silhouette**: Graceful weeping willows (`drooping-cascading`) with tall dark trunks ($H = 2.8..3.5\text{m}$) and pendulous foliage skirts overhanging the water edge.
- **Palette**: Silvery riparian green (`0x839b67`, `0x8ea870`) harmonizing with water reflections.
- **Understory**: Riparian blue and purple marsh irises (`marsh_iris`) along the shorelines.

### 1.3 Town Civic Core & Square ($x \in [20, 45], z \in [20, 61]$)
- **Silhouette**: Stately shade lindens (`tiered-stately`) with tiered, layered domes.
- **Clearance**: High trunk branching ($H \ge 3.0\text{m}$) providing clear sightlines and ample headroom for pedestrian circulation.
- **Surroundings**: Formed geometric flowerbeds and clipped boxwood topiary hedges framing paved plazas.

### 1.4 Mill Hillside Terraces (Northeast Slopes, $x \in [74, 98], z \in [9, 36]$)
- **Silhouette**: Airy, slender birches (`slender-conical`) with characteristic white/cream papery bark (`0xd9d5c7`) and golden-green foliage.
- **Groundcover**: Wild purple heather bands (`wild_heather`) stabilizing hillside terrace slopes.

---

## 2. Low Shrubs, Shaped Flowerbeds & Groundcover Patterns

### 2.1 Botanical Shrub Diversity
Rather than unstructured scattered colored discs, shrubs are grouped into 5 distinct varieties with deliberate scales and orientations:
1. `flowering_coral`: Warm pink-red blossoms framing residential entrances and garden borders.
2. `flowering_gold`: Cheerful golden blooms along sunny terrace edges.
3. `boxwood_clipped`: Formal manicured spheres accentuating civic plazas and promenade transitions.
4. `wild_heather`: Rustic violet carpet vegetation along the mill hillside retaining walls.
5. `marsh_iris`: Tall riparian reed-like clusters hugging pond banks.

### 2.2 Formed Flowerbeds with Stone Curbs
Six structured flowerbeds (`FORMED_FLOWERBEDS`) anchor civic and park areas:
- **Curb Structure**: Raised stone lip ($0.15\text{m}$ height, $0.14\text{m}$ rim thickness, limestone tone `0xd5cec2`).
- **Inner Planting Bed**: Sunken fertile soil inset with multi-colored seasonal florals.
- **Clearance Guarantees**: Positioned strictly outside pedestrian circulation axes, maintaining $\ge 3.5\text{m}$ clear passage widths through town square walkways.

---

## 3. Harbor Infrastructure & Civil Details

The harbor area has been upgraded from a basic wooden jetty to an authentic maritime haven:

### 3.1 Stone Quay Water Stairs (`QUAY_WATER_STAIRS`)
- **Location**: $x: 52.0, z: 68.2$, west of the pier approach.
- **Geometry**: 5 solid hewn granite steps descending smoothly from the seaside promenade ($+0.05\text{m}$) down to the sandy cove water ($-0.45\text{m}$).
- **Safety Rails**: Dark wrought iron balustrades ($0.9\text{m}$ height) flanking both sides.
- **Navigation**: Hero can safely walk right to the quayside edge from the promenade.

### 3.2 Flat Hewn Breakwater Capstones (`BREAKWATER_CAPSTONES`)
- 12 protective coping modules along the western ($x: 46..51$) and eastern ($x: 66..71$) breakwater crests.
- Flat top surface ($y = +0.05\text{m}$) with bevelled corners, giving the harbor walls a finished, permanent civil engineering quality.

### 3.3 Catenary Mooring Ropes (`HARBOR_MOORING_ROPES`)
- Realistic catenary sag ($\Delta y \ge 0.10\text{m}$) linking moored fishing boats to quayside dock bollards.
- Positioned over water, adding authentic maritime detail without obstructing walking corridors.

### 3.4 Quayside Cargo Clusters (`HARBOR_PROP_CLUSTERS`)
- Stacks of wooden crates, banded fish barrels, coiled mooring hawsers, and emergency lifebuoy posts.
- Situational placement on shore forecourts and pierhead extremities, preserving full clearance across the active pier transit corridor ($x \in [51.6, 64.4], z = 88.5$).

---

## 4. Residential Front Gardens & Façade Uniformity

### 4.1 Ergonomic Human Scale
All architectural elements use the player character ($1.70\text{m}$ height, $0.30\text{m}$ collision radius) as the ergonomic reference benchmark (`HERO_SCALE_HEIGHT`).

### 4.2 Front Garden Palisade Enclosures (`FRONT_GARDEN_ENCLOSURES`)
- Added to residential buildings `home-1`, `home-3`, and `home-7`.
- **Fence Design**: Low wooden pickets ($0.85\text{m}$ height, warm cedar stain `0xcab695`).
- **Entrance Corridors**: Dedicated front gates with $\ge 2.0\text{m}$ clear passage width perfectly aligned with front doors, ensuring completely unimpeded player access.

### 4.3 Façade Window Boxes (`FAÇADE_WINDOW_BOXES`)
- Mounted under windows of residential houses and shops (Bakery *«Тёплый хлеб»*, Cafe *«Листва»*).
- Timber planter boxes ($0.85..0.95\text{m}$ width, $0.18\text{m}$ height) with flowering petunias and geraniums.

---

## 5. Collision Integration & Safe Navigation

All new solid props (tree trunks, fence segments, cargo crates, barrel groups) are compiled into `GREENING_OBSTACLES` in `src/content/island-greening.ts` and integrated into `TOWN_COLLIDERS` in `src/game/systems/town-world.ts`.

### Strict Clearance Guarantees:
1. **Coastal Path**: Straight-line loops along $x = 100$ (east) and $z = 70$ (south beach) are 100% collision-free.
2. **Pier T-Junction**: Pierhead corridor across $x \in [51.6, 64.4]$ at $z = 88.5$ has zero obstacle encroachment.
3. **Garden Walks**: Dense interpolation checks confirm 100% collision-free passage along all garden paths.
4. **Front Gates**: Unobstructed passage for hero traversing through all residential garden gates.

---

## 6. Offline Visual Debugging & Headless 3D Review Tooling

Following the visual debugging mandate of Issue #2:

1. **`tools/export_greening_visual_debug.ts`**:
   - Generates high-resolution vector SVG maps:
     - `art/greening-and-harbor/greening-topography.svg` (island-wide botanical zoning map).
     - `art/greening-and-harbor/harbor-detail-map.svg` (harbor infrastructure zoom map).
   - Exports 3D scene data: `art/greening-and-harbor/greening_scene_data.json`.

2. **`tools/render_greening_review.py`**:
   - Headless Blender Cycles CPU rendering script producing 6 high-resolution ($1280 \times 720$) review images in `art/greening-and-harbor/render/`:
     1. `overview-greening.png`: Global island isometric perspective showing all 4 flora zones.
     2. `harbor-quay-steps.png`: Quayside stairs, breakwater capstones, mooring lines, cargo.
     3. `apple-orchard-gardens.png`: Low spherical apple trees with fruit in the western orchard.
     4. `willow-pond-banks.png`: Weeping willows cascading over the southern pond stream.
     5. `mill-hillside-flora.png`: Slender white birches and heather beds on the mill terraces.
     6. `town-square-facades.png`: Town square lindens, stone-curbed flowerbeds, and window boxes.

---

## 7. Automated Testing & Verification

The subsystem is validated by two dedicated test suites:
- **`tests/systems/island-greening.test.ts`** (16 tests):
  - Validates tree silhouettes, zoning dimensions, fruit presence, shrub variety distribution.
  - Checks quay stairs geometry, breakwater capstones, mooring rope catenary sags.
  - Verifies front garden gate widths, window boxes, and obstacle collision blocking.
  - Confirms multi-segment pathfinding routes from town square to all major destinations.
  - Verifies Three.js scene graph construction and geometry integrity.
- **`tests/systems/graphical-greening-harbor.test.ts`** (13 tests):
  - Validates vector SVG layer IDs, legends, and botanical annotations.
  - Validates JSON scene structure and counts.
  - Inspects PNG binary headers, magic bytes, and $1280 \times 720$ resolution across all 6 Blender review renders.
  - Validates dense pedestrian clearance samples through front gates, quay stairs approach, and civic square corridors.

Total project tests: **534 tests passed, 0 failed across 26 test files**.

# Island Terrain Elevation & Connected Routes Architecture

## Overview
This document specifies the architectural model for the island 3D terrain elevation, altitude grounding pipeline, connected curved spline routes, retaining wall structures, and visual debugging tooling implemented for **Issue #2, Item 1**.

---

## 1. Mathematical Elevation Model (`islandElevation`)

The terrain height is evaluated by a continuous, differentiable analytical function defined in `src/content/island-elevation.ts`:

$$y = \text{islandElevation}(x, z)$$

### Key Zonal Rules:
1. **Town Core District ($x \le 64, z \le 64$ & $x \le 60$)**:
   - Strictly flat: $y = 0.0\text{m}$.
   - Guarantees building foundations, entrance doorways, and interior transitions have no foundation gaps or door steps.
2. **Eastern Park Terraces**:
   - **Mill Terrace Plateau** (centered at $x: 86, z: 24$, radii $14\text{m} \times 11\text{m}$):
     - Smooth peak plateau at $y \approx 0.72\text{m}$.
   - **Eastern Belvedere Ridge** (centered at $x: 96, z: 38$, radii $10\text{m} \times 14\text{m}$):
     - Scenic ocean overlook at $y \approx 0.55\text{m}$.
   - **North-Eastern Orchard Terrace** (centered at $x: 82, z: 8$, radii $12\text{m} \times 9\text{m}$):
     - Gentle upper meadow terrace at $y \approx 0.40\text{m}$.
3. **Shoreline Attenuation**:
   - For points approaching the coast ($\text{landFraction} > 0.88$), elevation tapers smoothly to $0.0\text{m}$ at the beach edge, preventing abrupt drop-offs at the ocean perimeter.
4. **Slope Bounds**:
   - Maximum slope $\frac{\Delta y}{\Delta s} < 0.22$ across all walking corridors, ensuring natural and comfortable movement.

---

## 2. Altitude Grounding Pipeline

All visible entities in the game must be grounded to prevent floating or sunken models:

| Entity Type | Altitude Calculation | Notes |
| :--- | :--- | :--- |
| **Hero / Character** | $\text{islandElevation}(x, z) + \text{gardenBridgeHeight}(x, z) + 0.065$ | Tracks terrain + parabolic bridge arc |
| **Camera Tracking** | `target.y` continuously follows hero altitude | Eliminates camera jumps or stutter |
| **Walk Ribbons** | Each vertex evaluates $\text{islandElevation}(v_x, v_z) + 0.02$ | Conforms directly to terrain surface |
| **Resting Plazas** | $\text{islandElevation}(\text{plaza.x}, \text{plaza.z}) + 0.025$ | Paved circular disks flush with soil |
| **Resting Benches** | $\text{islandElevation}(\text{bench.x}, \text{bench.z}) + 0.03$ | Placed on plaza pavement |
| **Retaining Walls** | $\text{islandElevation}(\text{wall.x}, \text{wall.z})$ | Grounded stone terrace step modules |
| **Garden Trees** | $\text{islandElevation}(\text{tree.x}, \text{tree.z})$ | Trunks rooted firmly in ground |
| **Town Stops & Boards** | $\text{islandElevation}(\text{stop.x}, \text{stop.z})$ | Info boards and watering cans |

---

## 3. Connected Curved Routes & Splines

Earlier crude geometric ellipses and harsh rectangular joins are replaced by continuous Catmull-Rom splines (`GARDEN_WALKS`) in `src/content/coastal-garden.ts`:

1. **Central Promenade & Mill Ascent Walk**:
   - Connects town at $(64, 24)$ through the western retaining wall opening $(76.5, 24)$ up to the Mill plateau $(86, 24)$ and eastern slopes $(91.5, 26)$.
2. **Belvedere Overlook Ridge Walk**:
   - Sweeps from the Mill east side $(91.5, 30.5)$ through the Belvedere ocean overlook plaza $(96, 38)$, descends smoothly through the southern retaining wall gap $(97.2, 47)$, and approaches the bridge eastern entrance $(96, 58)$.
3. **Pond Shore & Bridge Walk**:
   - Loops from southern town exit $(64, 36)$ past the willow pond resting plaza $(80, 50)$, ramps onto the arched pond bridge deck $(79.5..96.5, 58)$, and joins the promenade.
4. **Northern Meadow Walk**:
   - Connects north town exit $(64, 16)$ through the meadow terrace opening $(76.5, 21.5)$ to the Mill Hill Terrace Rest $(82, 16)$ and circles the northern mill slopes.

### Spline Boundary Tangent Formula
To prevent open Catmull-Rom splines from overshooting past waypoints, open paths use clamped end tangents rather than cyclical index wrapping:
- $p_0 = 2p_1 - p_2$ for the first segment
- $p_3 = 2p_2 - p_1$ for the last segment

---

## 4. Rotated Collider Bounding Boxes (AABB)

Obstacles rotated at arbitrary angles $\theta$ have world-space axis-aligned bounding boxes evaluated as:

$$\text{aabbWidth} = |\cos(\theta)| \cdot w + |\sin(\theta)| \cdot d$$
$$\text{aabbDepth} = |\sin(\theta)| \cdot w + |\cos(\theta)| \cdot d$$

Collision detection in `isWalkableTownPosition(p)` tests:

$$|p.x - \text{item}.x| < \frac{\text{aabbWidth}}{2} + r_{\text{player}} - \epsilon$$
$$|p.z - \text{item}.z| < \frac{\text{aabbDepth}}{2} + r_{\text{player}} - \epsilon$$

Where $r_{\text{player}} = 0.3\text{m}$. All retaining walls, resting benches, trees, and fences have been configured with minimum passage widths $\ge 1.8\text{m}$ (exceeding $4.5\text{m}$ at major terrace openings).

---

## 5. Coastal Cliffs & Open Coves

Coastal rocks are structured across 3 distinct headlands:
- **Headland 1**: North-East Promontory
- **Headland 2**: East & South-East Ocean Cliffs (multi-tiered elevations with staggered scales)
- **Headland 3**: South-West Rocks

All cliff rocks reside strictly on the water/rock perimeter ($\text{coastRatio} \ge 0.94$). Sandy coves, beaches, and the southern harbor channel remain completely open and navigable.

---

## 6. Visual Debugging & Verification Tooling

To ensure developers and automated agents can visually inspect the actual game world:

1. **`tools/export_terrain_visual_debug.ts`**:
   - Generates `art/terrain-and-routes/terrain-topography.svg`: multi-layer vector map with elevation contour bands, walking ribbons, retaining walls, plazas, and coastlines.
   - Generates `art/terrain-and-routes/collision-clearance-map.svg`: visual collision map with green corridor envelopes and red obstacle bounds.
   - Exports `art/terrain-and-routes/island_scene_data.json`: 3D terrain and scene geometry.
2. **`tools/render_terrain_review.py`**:
   - Headless Blender renderer (`blender --background --python tools/render_terrain_review.py`) generating multi-angle screenshots in `art/terrain-and-routes/render/`:
     - `overview-isometric.png`: Whole island isometric overview
     - `mill-terrace.png`: Mill hill terrace and western retaining wall
     - `belvedere-overlook.png`: Belvedere overlook and sea cliffs
     - `pond-bridge.png`: Willow pond depression and arched bridge
3. **Automated Test Suites**:
   - `tests/systems/island-terrain-routes.test.ts`: Functional and system tests for elevation, grounding, paths, and routes.
   - `tests/systems/graphical-terrain-routes.test.ts`: Automated visual and dense geometric clearance verification.

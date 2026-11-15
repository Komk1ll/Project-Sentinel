# Hero and open district integration

Historical milestone: the spherical world now follows [Living planet](../decisions/living-planet.md). Actor assets, quest coordinates and legacy save migration from this milestone remain active.

The user requested softer character geometry, integration of the prepared graphics,
and a less building-dominated map with a clearer minimap. This milestone uses the
previously selected ordinary workflow with checks. No new development-mode prompt
is needed.

## Asset and scale contract

The new hero, master and medic retain 1.70 m height, identity roots, metre units,
the existing four articulation nodes and aid-kit socket. Rounded cross sections,
tapered limbs, shaped shoulders and a continuous hair cap replace rectangular
anatomy. Each character stays below 6,000 triangles and six materials. Exported
GLBs are reimported and rendered on the configured OptiX workstation.

The v4 workshop replaces the v3 workshop without changing its 9 x 8 m collision
footprint or entrance. Existing clinic, house, tree, bench, aid-kit and two room
assets remain integrated. Asset URLs are versioned by folder to avoid stale
browser caches. The review street scene is not imported as a second map.

## District layout

Remove eight repetitive residential lots, leaving eleven buildings, including all
public destinations and three homes. Lower the remaining tall residential skyline.
Create a west garden, east grove, south square and orchard, alongside the existing
park. Their paths, surfaces, trees and benches use shared content definitions for
the renderer, minimap and collision. Keep the workshop, clinic and spawn positions.
Decorative canopy overhangs do not block ground movement; trunks and benches do.

Older valid saves inside a removed home should restore the mission stage and move
the player to a safe outdoor position. Old positions covered by a newly placed prop
must also be relocated without losing quest state. Validate against the previous
layout before migrating; do not turn arbitrary corrupt saves into accepted saves.
The save envelope remains schemaVersion 1; migration is applied when decoding.

## Minimap and HUD

Use a north-up map with two explicit modes: nearby route framing and whole district.
Show park/square surfaces and primary building names, a directional player marker,
a distinct goal shape, and a collision-aware route. Nearby framing includes both
player and destination; the whole district provides geographic context. Indoors
retains the actual room bounds. Map zoom is separate from camera zoom.
Keep the current objective visible when details are collapsed. The compact HUD
must leave the center of the scene open, with an expandable map on small screens.

## Verification boundary

Check exported geometry and runtime loading, articulation and held-kit visibility,
all retained entrances and connected paths, removed-home save migration, new prop
collision, minimap modes, mission pickup/delivery/reload, TypeScript and production
build. Offline Blender and canvas previews do not prove browser GPU pixels or FPS.
The current workflow does not use browser automation or screenshot capture.


## Completed verification

The current loader requests `polish-v4/hero.glb`, `master.glb`, `medic.glb` and
`workshop.glb`, plus the existing eight supporting GLBs. All twelve served files
match their local production-build copies by SHA-256. Their total is 3,273,372 bytes;
this is requested model data, not the total application or deployment archive.

The hero measures 0.696 x 1.70 x 0.4805 m, 4,562 triangles and 190,140 bytes. The
master and medic also measure 1.70 m tall. Three.js independently validates bounds,
normal direction, non-degenerate triangles, root transforms and working articulation
with `node tools/verify-web-assets.mjs art/rounded-actors-v4 --actors`. The unchanged
workshop study has its own verifier. Source scenes and ten actor previews are in
`art/rounded-actors-v4/`; only the GLBs are served.

All 197 tests in 16 files pass, including every retained doorway, shared prop
collision, old-home recovery, route framing, HUD map controls, animated leg geometry,
parcel transfer and save restoration. TypeScript and the Vite production build pass.
`art/open-district-v4/integration-verification.json` records local HTTP checks.
The PNG map previews execute the actual minimap function on an offline canvas;
they do not establish full browser layout, GPU appearance or frame rate.

The three retained homes now have two existing room variants. This deliberate
reduction follows the smaller housing inventory; removed homes are retained only
as legacy validation data. No narrative public destination was removed.

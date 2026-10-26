# Landscape follow-up before 14 November 2026

Updated 26 October 2026. Reference: art/coastal-garden/design-reference.png.
Current implementation and verified offline views: art/coastal-garden/render/.

## Current state

The game has the connected lighthouse/pier harbor, two breakwaters, grouped coastal
rocks, seawalls, an orchard with original fruit trees, flower and reed modules,
curved park paths and a walkable pond bridge. Character scale, first-aid progression
and historical saves are covered by automated checks. Sixteen model requests total
4,901,960 bytes. The exported scene contains 517 mesh objects and 211,778 triangles
including instances. The illustration remains a design reference; its terrain,
planting density and lighting are not yet fully reproduced in gameplay.

## Priority 1: terrain and circulation, 26-30 October

- Add modest eastern park slopes, retaining edges and shore height variation.
  Couple terrain height, actors, scenery, collision and camera; avoid floating
  objects or steps that only look traversable. Keep mission approaches accessible.
- Replace obvious oval garden circuits and rectangular path joins with naturally
  connected curved walks and small resting areas. Eliminate coplanar seams.
- Refine cliff clusters: vary silhouettes, materials and transitions between rock,
  sand and grass. Keep sandy coves open and maintain the harbor channel.
- Check placement using complete rotated model bounds, not just nominal centers.
  Verify flowers, reeds, rocks, fences and trees against the entire walking width.

## Priority 2: planting and harbor composition, 30 October-3 November

- Give the orchard, mill garden, pond banks and town square distinct planting.
  Add a few reusable tree silhouettes and low groundcover; avoid repetitive rows
  of identical crowns and isolated uniformly sized flower clusters.
- Add shaped planting borders, modest curb detail, transitions around paths and
  layered pond margins. Use shared material palettes and a small atlas if needed.
- Refine seawall corners and breakwater caps; add quay steps, mooring ropes,
  storage crates or fishing details in deliberate groups outside circulation.
- Improve nearby facades and small front gardens to match the same art style.
  Retain readable doors, signs and the correct relationship to character height.

## Priority 3: water, light and life, 3-6 November

- Improve shallow-water gradients, shoreline foam and contact around rocks and
  harbor structures using inexpensive shader masks; avoid planar reflections.
- Tune the actual browser's golden-hour colors, shadows and glowing windows.
  Compare gameplay views against the reference; offline Blender lighting differs.
- Extend bounded environmental motion: reeds, flowers, water, mooring ropes and
  a small number of birds. Keep existing limb clips, foliage wind and boat motion.
- Add short ambient interactions and purposeful resident stops in the new areas,
  without turning decorative visits into extra requirements of the first mission.

## Priority 4: web and navigation QA, 7-10 November

- Measure actual browser frame time/FPS, memory, draw calls and cold loading on
  a typical laptop and phone. Automated tests and native shader compilation are
  not performance evidence. Target 60 FPS on the laptop and stable 30 FPS on a
  midrange phone, then tune based on measurements.
- Adjust shadow distance/resolution and rendering scale by quality level; consider
  distant actor simplification and repeated prop batching before adding geometry.
- Verify minimap labels, paths, bridge, objectives and route guidance at all zooms.
- Walk every shore/park route and mission entrance. Verify collisions, visibility
  behind buildings, bridge heights, room transitions and old save restoration.
- Run the Herd HTTP hash/rebuild check when Herd is running; keep its on-request
  build and avoid persistent development servers or watchers.

## Freeze and delivery, 11-14 November

Use 11-13 November for defects, final device checks and build packaging. Freeze
new landscape features on 11 November. Keep 14 November for the agreed delivery
and demonstration. Do not spend the final days adding new districts or replacing
all assets again.

Pashkova owns art direction, planting palettes, texture/atlas preparation and
ambient text. Filipov and Komlev divide terrain/collision/save work and rendering,
map/performance work. Agree exact assignments within the team before starting.

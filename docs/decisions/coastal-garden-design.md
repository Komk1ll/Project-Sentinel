# Coastal garden design from the approved illustration

Use art/coastal-garden/design-reference.png as the composition and landscape target:
coastal town on the west, landscaped ponds and mill on the east, fruit orchard,
small coves and rocks, connected promenade and lighthouse/pier harbor. Preserve
metre-scale actors and current mission buildings. Keep the flat walking surface;
relief belongs to outer coastal rocks and non-walkable shore edges.

Create an original editable Blender kit with layered coastal rocks, stone seawall,
wood garden fence, fruit tree, flower cluster and reeds. Share meshes/materials,
instance repeated objects, use no external textures and no additional real lights.
Aim for <=5.5 MB model downloads, <=260k triangles including all instances and
<=600 outdoor mesh objects. Reduce the ocean grid before adding garden geometry;
fragment normals keep small water ripples. Retain wind, character animation,
beacon and boats. Keep the harbor channel and all building approaches clear.

Use shared curved garden path and coastline functions in rendering and minimap.
Remove trees intersecting new walks. Freeze complete historical v1-v4 collisions
before changing the garden; write v5 saves and validate historical positions
before any relocation. Preserve the first-aid stage, rooms and return positions.

The Windows Blender endpoint failed its initial SSH check. Prepare the same
portable generator and use the installed local Blender for asset export if the
workstation remains unavailable. Record the actual execution device; do not claim
remote output without a successful bridge receipt. Herd continues to build on
request; no development server, watcher or automation is needed.

## Completed implementation and checks

The Windows workstation became available after the user enabled it. Asset job
341e3d256787499c831157a822c250d2 created seven original Blender modules and exported
a 150,076-byte GLB on the RTX 4070 Ti Super. Sources and verified transfer receipts
are retained. Final scene review job faad305a47b748e19dc6341a7fdaf0a5 completed on
24 October; results were collected and inspected on 26 October. Its overview and
park images reflect the final grouped cliffs, bridge and warmer lighting.

Actual requested models total 4,901,960 bytes across 16 files. The exported scene
has 517 mesh objects and 211,778 triangles. The ocean grid was reduced from 160 to
96 segments per side while retaining analytic fragment normals. Repeated scenery
uses instancing and no extra texture downloads or dynamic lights. Eight production
shader variants passed native OpenGL compilation/linking; this is not a WebGL FPS
measurement. On 26 October all 470 tests and the production build passed.

Current writes use coastal-island-v5. Complete v1-v4 footprints are frozen before
new path/tree changes. The pond bridge overrides water collision only within its
inset deck and retains solid rail bounds; the hero follows its deck height. The
minimap uses the same paths and bridge. Existing mission stages and rooms remain
supported. Remaining reference-art differences and the 14 November schedule are
recorded in docs/guides/landscape-next-steps.md.

Herd was stopped during the 26 October HTTP check (no listener on port 80).
The production output was rebuilt through the existing PHP entry without starting
a service. HTTP delivery and browser FPS remain unverified for this revision.

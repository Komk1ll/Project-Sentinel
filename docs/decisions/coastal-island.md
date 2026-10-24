# Coastal island and material lighting

On 23 October 2026 the user replaced the globe with an island and requested more
realistic shading. This supersedes the spherical runtime. Keep the ordinary mode
with checks; do not change the existing aid mission or its inventory semantics.

The island is a flat, metre-scale town platform with an irregular sloping sandy
coast, surrounding animated water and a continuous coastal footpath. Town buildings
and entrances retain their coordinates; the former reverse-hemisphere activities
move into the east garden. Camera up remains world Y, and there is no wrapping,
latitude speed adjustment or pole behavior. Coast geometry, movement boundary and
minimap share the same outline. Old valid planet saves relocate safely while
preserving mission completion; invalid saves must not become valid by relocation.

Use standard physically based materials with world-space micro-detail, roughness
variation and restrained contact shading; add a custom animated water shader with
wave normals, reflected sky colour, sun highlights and shoreline foam. Keep facade
cutaway composable with material shaders. Reuse instanced scenery, avoid additional
large textures and postprocessing render targets. Fixed sunlight must not rotate
with the camera. Keep the 1.70 m rounded hero and existing twelve GLB downloads.

Validate movement and all doors, coast containment, the coastal loop, relocated
patrols, old-save recovery, map framing, first-aid completion/reload and resource
cleanup. Inspect offline exported geometry in Blender on the configured Windows
workstation. Offline Blender does not execute the browser water or material shaders;
report browser GPU/FPS validation separately and preserve the no-browser-automation
constraint from the current workflow.

## Verification on 23 October 2026

- Strict TypeScript and production build passed. Full suite: 210 tests in 17 files;
  the four minimap integration tests passed again after the final label adjustment.
- Existing doors, furnished rooms, first-aid pickup/delivery/reload, previous globe
  save recovery, the coastal walking loop and resident routes are covered.
- Water, terrain, instanced-prop and building shaders were assembled with Three's
  production preprocessor and compiled/linked with macOS native OpenGL. Only GLSL
  version 300 es was adapted to 410 core; this is not a WebGL pixel/FPS check.
- Runtime geometry export: 388 meshes, 136,777 triangles including water, 2,585,144
  bytes for the offline GLB. Three views were rendered with the existing remote
  RTX 4070 Ti SUPER / OptiX setup and inspected. Download hashes were verified.
- The island map labels only mission buildings and main landmarks to avoid overlap;
  district mode retains the more detailed building labels. Small map and island
  map previews were inspected using the production drawing commands offline.
- Final local production preview: HTML, JS, CSS and all twelve GLBs match dist by
  content/hash. The JS is 678.28 kB (183.63 kB gzip); GLBs total 3,273,372 bytes.
- Evidence and rendering sources are in `art/coastal-island/`. Earlier globe
  artifacts remain intact. No browser automation, browser FPS measurement, GitHub
  publication or main-branch merge was performed.

Manual visual acceptance: open the local game, approach the shore, check animated
water and facade detail on the target browser, walk the coastal loop, switch map
and camera views, then deliver the aid kit and reload. This remains the boundary
for browser appearance and performance, separate from the passing simulation tests.

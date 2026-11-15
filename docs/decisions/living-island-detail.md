# Living island detail pass

The 23 October 2026 follow-up requests more detailed buildings, trees and animation
through the installed Blender Remote plugin. Preserve the coastal island, original
lots, door heights, 1.70 m hero, navigation and mission/save behavior.

Add a single batched architectural detail kit with a named, origin-centered group
for each town lot. Keep the existing building shells and authored workshop; window
sills, mullions, roof vents, chimneys, gutters and entrance awnings add depth without
new texture downloads. Details above the doorway must leave 2.2 m clearance.
Three tree species replace the old tree asset; each species has two materials and
shared instanced geometry. Trunks remain within the existing collision footprint.

Animate foliage in the vertex shader using one shared time uniform and a spatial
phase. Use identical displacement in the shadow depth pass and expand culling
bounds. Keep material grain and facade cutaway hooks composable. Add small resident
idle gestures and a handful of birds with shared geometry. Clamp animation delta;
never mutate simulation coordinates or scale actors for idle animation.

Budgets for this pass: <= 4,000,000 bytes for all requested GLBs, <= 220,000 outdoor
triangles including instanced copies and ocean, <= 450 outdoor mesh batches before
shadow passes. No extra lights, postprocessing targets, external textures or per-tree
CPU animation. These are asset/scene budgets, not a browser frame-rate guarantee.

Generate and render through Blender Remote on the configured Windows OptiX host.
Keep editable sources and hash-verified collected assets in art/living-island-detail.
Check real GLTF loading, material/geometry budgets, scale, animated shadows, resource
cleanup, mission/save regressions and production build. Inspect offline renders and
compile production shaders natively; do not use browser automation. Browser appearance
and FPS remain a manual acceptance step.

## Shipped implementation and verification

- Eleven lot-specific detail groups use three or four material batches each.
  Architecture GLB: 568,832 bytes. Entry prism clearance is checked against every
  exported triangle bound, including the narrower window sills at home-1.
- Oak/birch/pine: 648/732/416 triangles, two materials per species, 70,936 bytes
  for the combined tree library. Birch markings use vertex colours. Unused UVs
  are omitted. Authored foliage heights range from 4.55 to 4.83 m.
- All thirteen requested GLBs total 3,876,432 bytes (up 603,060 bytes). This
  supersedes the twelve-request contract in the earlier coastal-island decision.
  Old unused asset files remain preserved but are not requested by the loader.
- Actual exported outdoor scene including ocean and instanced copies: 446 mesh
  batches, 158,001 triangles (previously 388 / 136,777). This is an offline scene
  count, not a measured visible draw-call count including shadow passes.
- One time uniform drives sea and foliage; the foliage depth material uses the
  same displacement, and culling bounds include wind movement. Four coastal birds
  use shared wing geometry and animate flight/flapping. Idle resident arms move
  gently without modifying the simulation position, body scale or quest state.
- Production shader cache keys preserve the wind hook through facade cutaway and
  material grain. Custom shadow materials are included in resource disposal.
- 212 tests in 18 files pass, including actual shipped GLB decoding with a stub
  GPU, mission delivery/reload, routes, animation uniform updates and cleanup.
  TypeScript and production build pass; JS 680.91 kB / 184.57 kB gzip.
- Seven production shader variants compile and link in native OpenGL, including
  instanced vertex-colour bark, animated foliage and its depth pass. This is
  syntax/link validation, not browser pixel or frame-rate validation.
- Blender Remote generated the final asset pack in job
  `cee8236b02904b7196e50785fc3e3305`, then rendered the exported runtime scene in
  job `2168f1229970484e86867f0ea54916bb`. Both report RTX 4070 Ti SUPER OptiX GPU
  rendering. Hash-verified downloads, editable Blender scenes, all four inspected
  review views and receipts are retained in `art/living-island-detail/`.
- The local preview at http://127.0.0.1:4173/ serves HTML, JS, CSS and all thirteen
  models matching the production files byte-for-byte. No GitHub publication was
  performed. Browser appearance, wind motion and FPS remain manual checks.

## Reproduction

Run the plugin bridge with `submit --script tools/build_island_details.py`, passing
absolute paths for the script and each `--input`: `tools/build_web_asset_pack.py`
and `art/living-island-detail/lots.json`. Collect into a fresh folder; copy its two
GLBs into `public/assets/models/island-detail`. The lot JSON is a snapshot of the
current `TOWN_BUILDINGS` array and must be regenerated if dimensions change.

Run `node tools/export-island-preview.mjs art/living-island-detail`, then
`node tools/verify-island-detail.mjs`. For new offline review renders, submit
`tools/render_island_review.py` with the helper, exported `island-review.glb` and
`views.json` as inputs through Blender Remote. Offline export excludes canvas sign
textures and substitutes PBR water; it does not evaluate the custom WebGL shaders.

Shader verification: `node tools/export-island-shaders.mjs
art/living-island-detail/shaders`, followed by `swift -suppress-warnings
tools/check-island-shaders.swift art/living-island-detail/shaders/programs.json`.
Run `npm test` and `npm run build` for integration and distribution checks.

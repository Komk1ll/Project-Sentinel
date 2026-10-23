# Cozy Zarechensk visuals

## Direction and scope

The approved direction is a detailed stylized 3D town with soft light and Blender
models. The active town now uses one coherent asset set: all 19 exterior buildings,
19 furnished interiors, the player, workshop master, clinic medic and seated resident.
Pitched roofs, cornices, windows, flower boxes, shop signs, trees, benches, lamps and
cars replace the former runtime scenery. A cream, sage, teal and warm wood palette
extends into the mission panel, map, controls, dialogue and loading indicator.

The narrative and collision layout remain owned by TypeScript content. This visual
pass covers the currently playable town; it does not implement later campaign episodes.

## Assets and provenance

- `public/assets/models/cozy/`: 24 self-contained GLB files and a size manifest.
- `art/source/`: editable town, four characters, workshop and clinic `.blend` files,
  plus the exact exported content layout. Other interiors regenerate from the script.
- `art/previews/`: offline Blender renders for art review, not gameplay screenshots.
- `tools/build_cozy_assets.py`: original procedural modeling source, authored with
  AI assistance using Blender 5.2.1. No downloaded marketplace models or bitmap textures.
- Cyrillic signs are converted to meshes using the locally installed DejaVu Sans.
  No font binary is bundled. Supply a suitably licensed Cyrillic font for regeneration;
  changing the font can change sign spacing. Other shape and material design is original.

All material colors are converted from sRGB palette values to linear PBR values.
Blender coordinates map game `(x, height, z)` to `(x, -z, height)` and export as glTF
Y-up. The same town layout determines building footprints, entrances and furniture.
Road surfaces have non-overlapping intersections; pavement, grass and lane markings
occupy distinct heights to avoid coplanar flickering.

## Regeneration

From the repository root, after `npm install`:

```sh
node tools/export-art-layout.mjs
CYBERSHIELD_FONT=/absolute/path/to/DejaVuSans.ttf blender -b -t 6 \
  -P tools/build_cozy_assets.py -- "$PWD"
node tools/verify-cozy-assets.mjs
npm run build
```

On macOS the Blender executable can be
`/Applications/Blender.app/Contents/MacOS/Blender`. Blender is an authoring dependency
only; neither players nor the TypeScript build need it. Exports overwrite generated
models and sources, so preserve manual Blender edits before regenerating. Pass `--previews-only` after the repository path to rerender the saved Blender sources
without regenerating geometry. Static
scenery batches meshes by material; characters retain named limb pivots and parcels.

## Runtime ownership

`loadCozyAssets()` uses Three.js GLTFLoader and Vite's relative base URL. All files
load locally without a CDN or texture requests. The game remains usable with temporary
procedural scenery during loading. A failed asset set releases successful partial loads,
keeps the fallback and displays a reload message. The shipped set is approximately
32 MiB; compressed delivery, lazy interior loading and device-specific performance
budgets remain future optimizations, not verified release claims.

`ThreeRenderer.loadVisuals()` swaps the complete set, caches interiors, reapplies
character cutaway materials and preserves the current world and mission state. It
handles entry into a room before loading finishes. Destroyed renderers release late
loads; teardown releases both visible geometry and detached cached rooms. Legs and
arms animate through the named pivots. Master/medic parcel visibility and the waiting
resident derive from the mission stage, including after save restoration.

## Verification and limits

- `node tools/verify-cozy-assets.mjs` decodes every shipped GLB with the real Three.js
  loader and checks manifest sizes, finite bounds, coordinate scale and limb/parcel names.
- `tests/systems/cozy-scene.test.ts` uses the real asset decoder and production scene,
  replacing file transport and the unavailable GPU backend only. It exercises late model
  loading, pickup/delivery, resident visibility, room reuse and disposal.
- Mission, engine/HUD and save tests cover completion and reload independently of art.
- Offline Blender previews are visually reviewed. These do not establish browser pixel
  appearance, UI fit, GPU compatibility or frame rate. Those need a manual playtest.

Manual visual checks: inspect spawn, enter Mayak, collect the kit, enter the clinic,
deliver, leave/re-enter and reload. Check character visibility behind buildings, signs,
zoom, panel scrolling on a short window, shadows and any geometry intersection. Record
browser, viewport and device when reviewing performance.

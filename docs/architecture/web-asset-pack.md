# Web MVP asset pack

The v3 production record below is retained as history. The current integration uses
rounded v4 actors and the polished workshop; see [open district](open-district.md).

The approved simplified art direction uses original, procedural Blender models with
flat PBR materials and no textures. Assets are authored and rendered on the user's
Windows workstation with Cycles/OptiX, then returned for independent GLB checks.
The original cozy source assets remain intact. The runtime integration below uses
this pack for the active exterior and main characters.

## Contract

GLB uses metres, Y up, +Z forward, base Y=0 and an identity root. Blender uses
X/-Z/Y mapping. Characters are 1.70 m tall, door panels are 2.20 m tall and each
building floor is 3.20 m. These are geometry dimensions, not camera tricks.

| Asset | Dimensions / limits | Triangle cap | Material cap |
| --- | --- | ---: | ---: |
| hero | Height 1.70 m, width <=0.70 m | 2500 | 5 |
| master | Height 1.70 m, width <=0.70 m | 2500 | 5 |
| medic | Height 1.70 m, width <=0.70 m | 2500 | 5 |
| workshop | Walls 9 x 3.20 x 8 m; total height <=4.70 m | 3000 | 5 |
| clinic | Walls 10 x 9.60 x 8 m; total height <=11 m | 5000 | 5 |
| house-base | Walls 9 x 6.40 x 8 m; total height <=7.80 m | 2500 | 4 |
| tree | Height 4.50 m, crown diameter 2.80 m | 400 | 2 |
| bench | 1.60 x 0.85 x 0.55 m; seat top 0.45 m | 300 | 2 |
| aid-kit | 0.30 x 0.22 x 0.16 m, including handle | 200 | 2 |

Characters expose `left-leg`, `right-leg`, `left-arm`, `right-arm` shoulder/hip
pivots; anatomical left is +X. `aid-kit-socket` sits at (0, 0.85, 0.30).
Meshes are combined by parent and material, preserving limb pivots. Door and wall
meshes retain their names for independent dimensional checks after GLB import.

## Production and verification

`tools/build_web_asset_pack.py` creates the nine assets, editable Blender scenes,
front/side/isometric PNGs and a shared-scale scene. It requires an OptiX GPU and
fails instead of silently switching to CPU rendering. Exported GLBs are reimported
before measurement and rendering. The script writes a machine-readable manifest.
`tools/verify-web-assets.mjs` independently checks the GLB using Three.js and raw
glTF metadata, including bounds, triangle budgets, textures and animation pivots.

Authoring outputs live under `art/web-mvp-v3/`. The verified nine GLBs are copied
to `public/assets/models/web-mvp/` for Vite; source scenes and previews are not served. Cameras, lights and preview floors are excluded from
each GLB. The generated comparison scene is an offline render, not a gameplay
screenshot or browser performance test.

To reproduce on an already configured Windows SSH host:

```sh
python3 tools/render-web-assets-remote.py --connection /private/connection.json --output /new/output/directory
node tools/verify-web-assets.mjs /new/output/directory
```

The runner requires a new output directory, creates a unique remote run folder,
uses strict SSH host-key verification and compares the downloaded ZIP's SHA-256
with Windows. Connection settings and SSH keys stay outside the repository. The
runner does not install software or change Windows security settings. It leaves
remote source files available for further Blender work.

An optional `--generator /path/to/generator.py` selects a separate art study. The
runner also uploads `build_web_asset_pack.py` as its shared modelling helper and
records both source hashes. The default nine-asset build remains unchanged. See
[visual polish preparation](visual-polish-v4.md) for the next review milestone.

## Integration boundary

These separate buildings cannot directly replace the old combined `town.glb`.
Integration must place them at matching map footprints, adapt the separate aid kit
to the actor socket, preserve door/interior transitions and test camera occlusion.
The minimap is a separate UI change. A 9 x 8 m house must not be stretched onto
incompatible lots without a deliberate map update. No game save schema changes
are needed for producing this art pack.

## Runtime integration (2026-10-23)

The active loader now requests the nine web GLBs, the existing seated resident and
only the workshop/clinic interior GLBs. Other interiors use their existing procedural
layout. The old combined town and nineteen-room eager load are no longer used.
Existing files remain available for art editing and regression checks.

The workshop and clinic retain their exact collision footprints. The matching 9 x 8 m
lot at home-7 becomes a two-storey house so house-base can be used at unit scale;
its footprint, door, interior ID and saved positions stay unchanged. Other exterior
buildings are simple geometry authored to the original lot sizes with 3.20 m floors
and 2.20 m doors. Trees and benches clone the exported GLBs; parked vehicles and
the park monument remain visible at their collision locations.

The hero, master and medic keep unit scale. An independent aid-kit instance attaches
to each socket; mission state controls which one is visible, including after reload.
The walking datum is Y=0, with grass 2 cm below the streets to avoid coplanar
flicker. Existing interiors retain their floor height. The legacy seated resident
is scaled to 70% to fit the clinic sofa and the new adult character proportions. The camera starts closer and uses the same direction as the cutaway shader.
A north-up map labels the two mission buildings and shows a collision-aware walking
route to the current door, actor or exit. Navigation only guides; it never moves the
player or changes mission state. Room and street maps use separate metric transforms.


## Integration verification

The production scene test decodes the exact twelve requested GLBs and exercises
pickup, carried parcel visibility, delivery and cached room reuse with the real
scene graph and a stub WebGL backend. Navigation tests walk the generated routes
through TownWorld, including actor collision and furniture avoidance. HUD tests
cover map destinations and collapsing the mission panel. Save tests retain schema
version 1 and cover reload. The nine public GLBs match the authoring files by SHA-256.

At the v3 integration milestone, initial requested GLBs totaled 2,803,724 bytes; unused legacy files are still
present in public assets and therefore in the build output. This is a request-size
reduction, not the total deployment archive size. Browser pixels, device frame rate
and manual visual acceptance are not established by these tests.

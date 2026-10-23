# Web MVP asset pack

The approved simplified art direction uses original, procedural Blender models with
flat PBR materials and no textures. Assets are authored and rendered on the user's
Windows workstation with Cycles/OptiX, then returned for independent GLB checks.
The existing cozy models and runtime remain intact while this pack is reviewed.

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

Outputs live under `art/web-mvp-v3/`; they are review/source artifacts, not files
automatically served by Vite. Cameras, lights and preview floors are excluded from
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

## Integration boundary

These separate buildings cannot directly replace the old combined `town.glb`.
Integration must place them at matching map footprints, adapt the separate aid kit
to the actor socket, preserve door/interior transitions and test camera occlusion.
The minimap is a separate UI change. A 9 x 8 m house must not be stretched onto
incompatible lots without a deliberate map update. No game save schema changes
are needed for producing this art pack.

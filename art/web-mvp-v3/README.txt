CyberShield web MVP asset pack v3

Created on 2026-10-23 on the configured Windows workstation.
Blender 5.2.3 LTS; Cycles OptiX on NVIDIA GeForce RTX 4070 Ti SUPER.

models/: Nine GLB files, metres, Y up, +Z forward, identity root.
source/: Nine editable Blender scenes and the shared-scale comparison scene.
previews/: Front, side and isometric views of each reimported GLB, plus two scale views.
manifest.json: Blender measurements, budgets, hashes and source door dimensions.
verification.json: Independent Three.js import, geometry and articulation validation.
render-evidence.json and transfer-receipt.json: GPU and transfer evidence.

Total GLB size: 705508 bytes; total triangles: 8852.

| aid-kit | 188 | 16,608 |
| bench | 168 | 14,184 |
| clinic | 2024 | 150,156 |
| hero | 1312 | 106,700 |
| house-base | 1324 | 99,860 |
| master | 1376 | 111,756 |
| medic | 1500 | 120,792 |
| tree | 348 | 36,708 |
| workshop | 612 | 48,744 |

No textures, external buffers, cameras or lights in the individual GLBs.
The .blend scenes contain studio lighting and cameras for editing and preview.
Building signs are intentionally blank; add localized signage in the game.
The comparison is an offline render, not a game screenshot. Runtime integration,
minimap, collisions, camera occlusion and browser performance remain separate tasks.

See docs/architecture/web-asset-pack.md and tools/build_web_asset_pack.py
for the complete production contract and reproducible source.

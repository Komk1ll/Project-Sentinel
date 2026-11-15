# Visual polish preparation, 23 October 2026

This document records the preparation milestone. The workshop has since been
integrated in [the open district update](open-district.md). Status statements below
describe the original study, not the newer running build.

## Goal and status

Raise the craft of the approved cozy, stylized, isometric web game while retaining
metre-scale characters, readable navigation and the first aid-delivery quest.
The deadline is 14 November 2026. This is a preparation milestone: the workshop
prototype, source scene, renders and team brief are review artifacts. They are
not installed in the running game. Runtime integration needs its own checks.

## Diagnosis from source assets

The v3 pack corrected scale and download size, but its rigid rectangular character
silhouettes, uniform facade rhythm, flat dark windows and undifferentiated roofs
still read as placeholders. Most runtime lots use generic boxes; only matching
lots use authored models. The reference illustration also relies on paving,
layered vegetation, visible entrances and deliberate color contrast, which the
current scene does not reproduce. This diagnosis comes from GLB preview renders
and source inspection, not a new browser screenshot.

## Direction

Use a warm small-town civic neighborhood: plaster and brick bases, muted petrol
roofs, deeper blue window recesses, oak accents, warm ochre on the hero and green
vegetation. Give the workshop a pitched roof and crafted facade; retain the
clinic's three-storey civic silhouette. Recesses, roof edges and one or two
distinctive features should carry the image at gameplay distance. Do not model
brick-by-brick walls, individual leaves or invisible interior furnishings.

Characters need tapered limbs, a shorter visible neck, a shaped hair silhouette,
clear jacket/collar/backpack separation and readable poses. Keep 1.70 m height,
2.20 m doors, 3.20 m floors, current collision footprints and existing actor pivots.
The workshop root stays at ground center; its door stays at local (0, 0, 4).
The study may use a chimney above the old 4.70 m total roof-height ceiling, but
it must declare its measured envelope. Do not stretch assets to fit lots.

## Production budgets (targets, not measured device performance)

| Item | Target maximum |
| --- | --- |
| Main character | 6,000 triangles, 6 materials; preserve articulation |
| Workshop / clinic | 12,000 / 18,000 triangles; 8 materials each |
| Background house | 4,000 triangles; 4 materials |
| Tree / bench / kit | 1,200 / 600 / 500 triangles |
| First visible district | 150,000 visible triangles, 150 draw calls |
| Initial requested art | 8 MB transferred, measured from actual requests |
| Shared texture atlas, if needed | 1024 square, up to 2048 for a justified hero atlas |

These replace v3 limits only for new review assets. The existing runtime contract
continues until integration. Prototype flat materials remain valid; a texture pass
must improve broad surfaces, not add random noise. Merge by material and instance
repeated props. Export no preview lights, cameras, floors or labels baked as meshes.
Avoid mandatory real-time reflections, SSAO and bloom. Use a single shadowed sun,
hemisphere fill and optional cheap contact shading; compare with the same camera.
The proposed performance gates are 60 fps on the team's reference laptop and 30 fps
on a selected integrated-GPU laptop at 1280 x 720. Select and record actual devices
before claiming either result. The production RTX is not a web acceptance device.

## Delivery order and ownership

Assignments below are proposed work allocation, not promises of individual capacity.
Pashkova owns narrative labels, palette, textures and visual consistency. Filippov
owns asset loading, materials, lighting and optimization. Komlev owns placement,
collision correspondence, camera, minimap and HUD integration. Both developers
review quest progression and persistence after each integrated art batch.

| Dates (2026) | Deliverable | Acceptance |
| --- | --- | --- |
| 23-24 Oct | Workshop study, art brief, camera and color baseline | Source, GLB, measured size, equal-scale review |
| 25-27 Oct | Workshop-to-clinic slice, hero, two NPCs | Quest readable from start through reload; same-view comparison |
| 28-30 Oct | House kit, 3 tree variants, street and two room passes | Consistent scale, no blocked paths or hidden doors |
| 31 Oct-2 Nov | Compact HUD, map hierarchy, contextual dialogue | Readable at 1366x768 and 390x844; icon+text redundancy |
| 3-5 Nov | Lighting, lightweight atmosphere, sound/feedback, profiling | Recorded size/draw calls/fps; content freeze 5 Nov |
| 6-10 Nov | Gameplay/device/accessibility regression testing | Pickup, delivery, reload, fresh/old save, keyboard/touch |
| 11-13 Nov | Release candidate and presentation evidence | Reproducible build, backup, demonstration rehearsal |
| 14 Nov | Delivery buffer | No planned new art production |

If the slice misses 27 October, cut decorative props, extra house variants and
ambient effects first. Protect mission readability, actor proportions, entrance
recognition, saves, minimap and testing time. Other agreed gameplay milestones
still need capacity; this schedule does not replace the overall campaign plan.

## UI and acceptance checklist

- One compact mission card: objective, destination and progress; details on demand.
- One persistent player mark, one active destination mark, street network and clear
  building names. Indicate north and floor/room context; do not depend on color alone.
- Keep route, world marker and task text derived from the same quest state.
- Keep dialogue away from the player and interactive controls; shorten prose for
  the smaller layout and retain a readable body size (target 16 CSS px or above).
- Paving detail must not compete with the route. Decorative foliage must neither
  conceal entrances nor introduce unrepresented collision blockers.
- Verify camera obstruction, indoor/outdoor transition, held-kit socket and pose,
  reload after pickup and after delivery, keyboard focus and touch safe areas.
- Review browser output manually with the user. Current workflow does not authorize
  browser automation or screenshot capture. Offline Cycles imagery is art evidence
  only; it cannot establish browser lighting, readability or frame rate.

## Reproduction

`tools/build_visual_polish_study.py` imports the existing pack's modelling helpers.
The remote runner accepts `--generator tools/build_visual_polish_study.py`, uploads
the selected generator and its shared helper, and writes a new isolated output.
Strict SSH host verification and archive SHA-256 comparison remain mandatory.
The study exports the workshop, reimports it before measuring/rendering, and keeps
street dressing in the review scene, outside the building GLB. Its report describes
the measured envelope, material count, primitive count and triangle count.

## Verified review artifact

The final workshop GLB in `art/visual-polish-v4/` measures 288,472 bytes and 3,749
triangles, with 8 materials and 11 glTF mesh primitives. Its walls are 9 x 3.2 x 8 m,
the door is 2.2 m tall, and the total envelope is approximately 9.65 x 5.12 x 8.91 m
including roof, chimney and canopy. The panel is recessed behind the unchanged
entrance plane Z=4. A future integration must account for the canopy envelope.

`workshop-authoring.blend` retains separate details; `workshop.blend` contains the
reimported GLB with studio lighting; `workshop-street.blend` contains the review
composition. The hero, trees and bench in the composition use v3 geometry; this
study does not establish new character quality. Dressing positions are illustrative,
not validated navigation/collision data. The three PNGs are offline Cycles renders.

The independent verifier `node tools/verify-visual-polish-study.mjs` passed GLB
structure, SHA-256, material/triangle limits, metric bounds, normals, triangle
validity and absence of preview cameras/lights. The archived transfer was hash
verified against Windows and the log records path tracing on the RTX 4070 Ti SUPER
through OptiX. The original nine-asset pack validation and all 175 gameplay tests
also passed. No runtime assets were changed and no browser performance claim follows.

The Russian team packet is kept outside the code repository under the parent
workspace's `deliverables/visual-polish-v4/`: a six-page PDF, nine standalone prompt
files and a ZIP with sources, GLB, previews, reports and reproduction tools.

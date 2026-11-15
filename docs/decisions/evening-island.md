# Evening streets and authored animation

On 24 October 2026 the user requested detailed cars, shrubs, flower beds, street
furnishings, Blender-authored animations, evening light and illuminated windows.
Keep the current island, 1.70 m actors, accessible mission entrances and saves.
Retain Herd's synchronous build-on-request setup; do not create a background server.

Use an original Blender street kit: compact cars with shaped bodywork, real wheels,
glass and lights; low-poly shrubs and flower beds; bins and warm street lanterns.
Instance repeated static pieces. Park cars within the existing road-side spaces;
update current collision dimensions while keeping legacy save validation unchanged.
Add nonblocking plants only where their bounds clear routes, doors and existing
obstacles. Keep new solid furnishings in existing obstacle footprints or explicitly
register their collision bounds.

Use warm emissive window panes placed inside the existing window frames. Keep a
mixture of lit and dark windows; do not make whole facades or doors glow. Evening
uses a low warm key light, cool ambient fill and matching sea/haze colours. Pool
lights are inexpensive unlit meshes, not dozens of shadow-casting point lights.
Indoor rooms remain readable. No bloom/reflection targets or downloaded textures.

Author Idle, Walk and Greet transform animations in Blender, export GLB clips and
play them with AnimationMixer. Retain parcel-carrying arm overrides and procedural
fallbacks if a clip is unavailable. Blend motion changes, clamp delta and release
mixers. Geometry and animation sources must remain editable in .blend files.

Target <= 4.6 MB for requested GLBs, <= 210,000 outdoor triangles and <= 500 outdoor
meshes including instanced copies in triangle counts. Measure the final result;
these budgets do not prove browser FPS. Check Blender exports and animation poses,
scene/mission/collision/save behavior, native shaders, and Herd HTTP hashes. Keep
no-browser-automation constraints and distinguish Blender review from browser proof.

## Save compatibility

New writes use layout `coastal-island-v2` in the existing storage namespace.
A `coastal-island-v1` save is first validated against the frozen former coastal
colliders. Only then may an outdoor position be moved to nearby free ground when
a new shrub, bed or larger car blocks it. Room, return-point distance and mission
stage remain validated. Current-layout blocked positions, former pond/building
positions, malformed data and unknown layouts are rejected. Older globe and
rectangular-layout migrations remain supported. No quest or inventory reset.

## Final measurements and verification

- 14 requested GLBs: 4,519,260 bytes, up 642,828 bytes from the previous set.
- Exterior scene: 442 mesh objects and 203,089 triangles, including repeated
  instances and the ocean. This is a geometry count, not a draw-call/FPS claim.
- Two car prototypes occupy five existing parking places; 25 shrubs, 13 beds
  (11 new, two replacements), 32 lanterns and six bins use shared geometry.
- One warm key with shadows, one fill and hemisphere ambient; no new point lights
  or postprocessing targets. Window panes use two warm emissive intensities.
- Hero remains 1.70 m; cars fit their new 1.58 x 3.42 m collision footprints.
- Blender exports have Idle, Walk and Greet quaternion tracks only on limb pivots.
  Three AnimationMixer samples were rendered as a three-pose contact sheet.
- 290 tests in 19 files, strict TypeScript and synchronous production build passed.
  Seven production shader variants compiled and linked through native OpenGL;
  this is not browser WebGL or FPS verification.
- Production JS: 699.54 kB / 189.79 kB gzip. No external texture downloads added.

Asset job `c821216560d3437eab78880677de9868` ran on the configured remote RTX 4070
Ti SUPER with Blender 5.2.3 LTS / OptiX. Editable sources, exported models and hash
receipts are in `art/evening-island/assets/`. Actual runtime scene exports, decoded
asset checks, shader evidence and offline scene/pose renders are kept alongside.
The Blender review omits canvas sign textures, approximates water and lighting,
and reconstructs additive spill decals; it does not evaluate custom WebGL shaders.

Herd was stopped at final verification. The same PHP entry point successfully
built `dist` from the current checkout without a persistent process. Its site link
is unchanged; model hashes match the build. HTTP, browser pixels and FPS remain
unverified for this revision. See the local evidence in `art/evening-island/herd/`.

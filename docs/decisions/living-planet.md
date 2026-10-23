# Living spherical world

The user explicitly selected a real walkable sphere on 23 October 2026. This
supersedes the flat district renderer. Ordinary development with checks continues.

## Coordinates and compatibility

Use a sphere of radius 128/pi metres (256 m equator). Existing town coordinates
remain the authoring chart: x is longitude distance, z is southward latitude
distance with the equator at z=32. The chart covers x=[0,256), z=[-32,96].
Outdoor movement wraps longitude and crosses poles, with metric speed corrected
for latitude. Indoor rooms remain flat and retain mission and save semantics.
Buildings and actors stand on radial local frames at unit scale. Streets conform
to the surface; foundations cover the gap beneath rigid buildings.

The old district occupies one quarter of longitude. A continuous equatorial
promenade connects it to a landscaped reverse hemisphere. The globe overview and
local navigation distinguish the planet from the original neighbourhood. Existing
quest coordinates, entry transitions and saves remain valid. Navigation samples
the same collision query as movement, including the longitude seam.

## Life and interaction

Deterministic walking residents, pauses, local dialogue, notice boards and watering
flower beds provide ambient activity. They do not block paths or alter the aid-kit
quest. Quest interactions and doors have priority over ambient interactions on E.
Watering and conversations are transient; mission and position remain autosaved.
Use the existing rounded actor assets and shared geometry; do not add large textures.
Animate limbs, butterflies, fountain jets and windmill sails, with a bounded delta.

## Validation boundary

Verify full longitude loops, pole traversal, radial frames, movement speed,
collision/door consistency, navigation from the reverse hemisphere, ambient
interaction priority, quest completion/reload, geometry disposal, typecheck and
production build. Offline previews are not browser GPU or FPS proof. Preserve the
user's prior no-browser-automation constraint. Keep changes local for review.

## Manual acceptance route

1. Open the local preview. Use the globe camera button (◎), then Home to return.
2. Follow the mission route to Mayak, receive the kit, deliver it to the clinic,
   reload and confirm completion and the supplied clinic remain visible.
3. Walk to the central equatorial road (z=32) and follow it through the reverse
   hemisphere until the city returns. Check camera, feet and shadows at the seam.
4. Try walking across a pole. Controls should continue through it without a wall
   or getting stuck at its exact point. Check the north-up atlas separately.
5. Talk to a walker; read the community board; water the garden flower bed. The
   latter should change its flowers temporarily without advancing the main quest.
6. Check the mill, butterflies and fountain animate; enter a room and confirm the
   outdoor globe disappears. Try a narrow viewport and expand/collapse the map.

Do not treat CPU scene tests, local HTTP responses or Blender images as completion
of this manual browser acceptance. The agreed delivery deadline remains 14 November
2026; this change establishes the playable spherical environment for further work.

## Completed local verification

- 211 tests pass in 17 files; TypeScript and production build pass.
- The production HTML, JS, CSS and twelve requested GLBs match the files served at
  the local preview by SHA-256. See `art/living-planet/integration-verification.json`.
- The exported outdoor review scene contains 149,703 triangles including instanced
  geometry and 377 mesh objects. The review GLB is 2,214,272 bytes and is not shipped
  as an additional game download. It contains the generated planet and actors.
- Three geometry-review views were rendered on RTX 4070 Ti SUPER using OptiX,
  downloaded with archive hash verification, and visually inspected. An earlier
  overlap between meadow patches and the promenade was corrected by separating
  surface heights and matching actor foot altitude. Canvas signage is omitted from
  the offline export; browser cutaway shaders and HUD are not shown in those renders.
- Four minimap PNGs execute the production canvas drawing code offline. They cover
  nearby, district, narrow and whole-planet views. They do not verify browser layout.

All work remains on the local feature branch; no remote publication or merge is
part of this milestone. Manual browser acceptance and device FPS remain outstanding.

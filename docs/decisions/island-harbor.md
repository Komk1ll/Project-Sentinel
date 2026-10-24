# Island harbor and occluded actor visibility

The user requested a readable hidden hero without the circular stippled cutout,
a lighthouse, a pier and more coherent island landscape design. Preserve the
current web scale, evening lighting, missions, saves and no-background Herd setup.

## Visibility decision

Use a depth-tested actor silhouette rather than discarding foreground scenery.
Larian staff describe outlines and per-object see-through as distinct engine
features (https://forums.larian.com/ubbthreads.php?Number=612447&ubb=showflat).
A developer implementation of the alternative fades obstructing actors and restores
their materials (https://alfredbaudisch.com/unreal-engine/unreal-engine-actors-transparent-block-camera-occlusion-see-through/).
For this project, retain all building surfaces and shadows and draw a restrained
solid silhouette only on hero fragments behind opaque scene depth. Draw opaque
scenery first, silhouette with GreaterDepth and no depth writes second, and normal
hero last. This avoids self-occlusion feedback and requires no full-screen target,
ray tracing, dither mask or permanent outline on a visible hero. Limb children
share geometry and inherit authored animation. Preserve foliage wind and grain.

## Island design

Add an original Blender lighthouse and a wood-and-stone harbor kit. Use connected
walks, dune planting, coastal stones, benches, small boats, bollards and harbor
lighting to define destinations rather than a uniform ring of empty grass.
Keep the continuous promenade unobstructed. Make the pier walkable with clear
edges; update land/navigation validation and map extents using shared data.
Retain old saves by validating the previous coastal layout before relocating a
position newly covered by a landmark. Landmark visits are ambient interactions,
not extra quest requirements. Add a slow rotating lighthouse beacon and gently
bobbing moored boats without expensive shadow lights.

Target at most 5.2 MB requested GLBs and 240,000 outdoor triangles. Instance repeated
coastal scenery. Save editable Blender sources and verify actual exported assets,
collision/routes/saves, depth-pass behavior, native shaders and offline views.
Blender previews do not establish WebGL pixels or FPS. Build through the existing
Herd PHP entry; do not launch persistent services. Keep GitHub updates separate
until the changed scene is verified.

## Runtime contracts and results

The lighthouse is at (0, 63), clear of the southwest promenade. Its information
board is at (0, 66.5); the city workshop named Mayak remains the mission destination.
The pier starts at (58, 68). Two deck rectangles form a T; collision tests use their
union with player-radius clearance, so the junction has no invisible seam. Boats
are decorative and moored outside the walkable deck. The navigation grid and map
include the complete pier. New trees and lamp posts have solid collision bounds;
low coastal plants and rocks stay along the outer beach. The beacon is one additive
volume, and boats use bounded transform motion, with no new real shadow lights.
Lantern spill decals sit above the promenade to prevent coplanar depth artifacts.

New writes use layout `coastal-island-v3`. Layouts v1 and v2 are validated against
their respective frozen obstacle sets before relocation around new coastal objects.
Pier positions are only valid in v3; older sea positions are still rejected. Mission
stage, rooms, return positions and the existing storage namespace are retained.

The silhouette shares the hero buffers, including the carried parcel. It inherits
limb transforms and does not participate in raycasts or shadows. Opaque scenery is
rendered at order 0, hidden fragments at order 10 with GreaterDepth/no depth writes,
and ordinary hero meshes at order 20. The silhouette material is deliberately in
the opaque queue: using the transparent queue would incorrectly test against the
hero's own depth. Ground rings and scene lighting remain independent.

Measured: 15 GLBs, 4,751,884 bytes (232,624 bytes added). The exported outdoor scene
contains 495 mesh objects and 222,127 triangles including instances and silhouette
proxy geometry. The Blender view omits the depth-tested proxy and canvas signage;
water, additive effects and lighting are approximations, not WebGL pixel evidence.
Editable sources, hash receipts, actual runtime exports, map previews and checks
are in `art/island-harbor/`. Eight production shader variants pass native OpenGL
compilation/linking. A separate offscreen GPU pixel test confirms visible, partly
occluded and fully occluded depth-pass cases; browser FPS remains unmeasured.

Herd's on-request build and 18 HTTP file hashes were checked against the production
output. No persistent Vite/preview process or login agent was started. Source and
visual changes remain on a feature branch; this task does not bypass the pending
GitHub review required for the earlier main update.

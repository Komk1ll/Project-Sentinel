# Playable coastal island

The active Three.js runtime follows [Coastal island](../decisions/coastal-island.md).
The spherical prototype is historical. The retained Phaser scenes are not used by
this prototype.

## Coordinates, scale and movement

The original eleven buildings and entrances retain their x/z positions within the
64 x 64 m town. The island extends into an eastern garden with a mill and two ponds.
`content/island.ts` defines the irregular coast around (46,32), its minimap bounds,
sea level and a rounded coastal walking loop. All live models use world Y as up.
The hero is 1.70 m and doors are 2.20 m; imported models retain unit scale.

`TownWorld` owns movement and doors, independently of the renderer. Speed is 5 m/s,
normalized with a 50 ms frame cap. Interior bounds remain x=+-4.5, z=+-3.5. Outdoors,
coastRatio <= .94 is walkable; the beach slopes down outside the central platform.
There is no longitude wrapping, pole transition or latitude speed correction.
Buildings, cars, trees, benches, planters and the mill have rectangular colliders
expanded by a 0.3 m player radius. Ponds use expanded ellipses. Small flowers, lamps,
boards and ambient pedestrians are nonblocking decoration. E enters within 2.4 m
of an entrance; interior spawn is (0,2), exit is near (0,3).

`town-navigation.ts` uses cached collision grids: 1 m outdoors, 0.5 m indoors.
The extended island grid has bounded adjacency. Sampled line-of-sight checks
simplify routes without crossing buildings, ponds or the sea. Map guidance does
not automatically move the player. Nearby mode frames the complete mission route,
District keeps the original town view, Island includes the beach and coastal loop.
North stays at the top; map scale is in metres, independent of camera zoom.

## Life and interaction

`content/town-life.ts` is shared by simulation, renderer and map. Six residents
follow deterministic routes, pause and talk. The eastern garden retains the former
reverse-hemisphere activities. E at the flower bed gives watering feedback for
30 seconds. Boards describe the community, books, pond and coastal walk; messages
expire after 12 seconds. Ambient activity does not modify or persist quest progress.
Doors and indoor quest actors have priority over ambient interaction.

`TownLifeView` animates rounded resident limbs, mill sails, fountain droplets and
butterflies. `island-landscape.ts` instances meadow vegetation and pond stones;
trees and benches reuse the existing GLBs. The twelve initial downloads remain
3,273,372 bytes. Offline review GLBs are not runtime downloads.

## Materials, camera and lifecycle

The ground is a flat central platform with coloured coast bands sloping into the
sea. The ocean uses one analytic ShaderMaterial: moving waves, detailed normals,
sky-colour reflection, a sun highlight, shallow-water tint, shore foam and haze.
It does not use scene-reflection render targets. Standard materials receive
world-space colour grain, roughness variation and derivative-based micro-bump.
The grain hook composes with the facade visibility cutaway. Canvas signs retain
their original materials. Sun direction is fixed in world space; camera-dependent
shadow coverage preserves detail near the hero and covers the overview.

The camera stays Y-up. Outdoor half-span is 5–85 m; the overview button targets
65 m and smoothly centers the island. Portrait framing widens at overview zoom.
Indoor half-span remains 3.5–11 m. Indoor/outdoor zoom states are separate; Home
resets the active view. Outdoor scenery and the sea hide together inside buildings.
Teardown disposes the ocean, cached rooms, scene geometry/materials and listeners.

## Persistence and evidence

The existing schemaVersion 1 storage namespace is retained. Newly written saves
include `layout: coastal-island-v1` and must pass current island validation.
Unmarked saves are checked against current geometry, then the frozen former globe
validator, then the original dense town layout. Valid off-island positions relocate
to safe ground; quest stage and kit state remain intact. Invalid old saves cannot
be accepted merely by replacing their position. Unknown layout tags are rejected.

Tests cover all original doors and furnished rooms, the entire coastal loop,
shore containment, flat speed, residents, mission completion/reload, old progress
migration, map controls and real GLB scene/resource integration with a stub GPU.
The exported scene can be reviewed on the configured Windows OptiX workstation.
Blender uses a PBR water approximation and does not execute custom WebGL shaders.
`export-island-shaders.mjs` assembles production shader variants through Three's
preprocessor; `check-island-shaders.swift` can compile/link them through native macOS
OpenGL after adapting the GLSL version. Neither check proves browser pixels or FPS.

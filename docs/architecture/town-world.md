# Playable spherical town

The current runtime is the living mini-planet specified in
[Living planet](../decisions/living-planet.md). Earlier flat-town descriptions are
historical. The active renderer is Three.js; retained Phaser scenes are not used
by this prototype.

## Content and coordinates

`content/town.ts` defines eleven buildings and the original 64 x 64 town chart.
The planet extends that chart to longitude x=[0,256) and latitude z=[-32,96].
Its equator is z=32 and radius is 128/pi metres. `planet.ts` provides radial tangent
frames, wrapped longitude, metric distances and pole traversal. Outdoor movement
uses latitude-corrected speed; the immediate pole caps use geodesic steps and
transport the camera/control bearing to avoid the coordinate singularity.

Models retain unit scale: actors are 1.70 m tall and doors are 2.20 m tall. Rigid
buildings sit in radial frames with foundation skirts. Ground, road and garden
meshes are tessellated and curved. The circular promenade extends the existing
central street around the entire planet.

## Simulation and navigation

`TownWorld` owns movement, doors and position. It uses Three.js math utilities but
has no DOM or GPU dependency. Speed is 5 m/s, normalized with a 50 ms frame cap.
Interior bounds remain x=+-4.5, z=+-3.5; exterior longitude wraps without a wall.
Outdoor colliders are tested in each rigid object's tangent frame with 0.3 m
clearance. Trees, benches, planters, cars, buildings and the mill block movement.
Ponds use expanded ellipse boundaries matching their curved surface footprints.
Small flowers, lamps, boards and ambient pedestrians are nonblocking decoration.

Every original public entrance remains connected. E enters a nearby door within
2.4 chart units; indoor spawn is (0,2), exit is near (0,3). Indoor quest actors and
doors take precedence over ambient interaction. A spherical exterior and a flat
room are mutually exclusive presentation groups.

`town-navigation.ts` uses cached collision grids: 1 m within town, 2 m for global
routes, 0.5 m indoors. Global adjacency wraps the longitude seam. Safe sampled
segments simplify routes; this is guidance, not automatic movement. The planet
atlas splits route lines at the seam, while the nearby view unwraps longitudes
around the player. Global grid search is not claimed to be a geodesic shortest path.

## Residents and activity

`content/planet-life.ts` is shared by simulation, renderer and map. `TownLife`
advances six deterministic patrols with walking/idle phases and proximity dialogue.
E near the garden bed triggers watering feedback for 30 seconds. Boards describe
community activity, the book exchange, pond and circular walk. Messages expire
after 12 seconds. These ambient interactions do not modify inventory or mission
progress, and are not saved. Resident positions are ambient, not persistent state.

`PlanetLifeView` reuses the rounded hero geometry with separate clothing materials.
It animates articulated limbs, mill sails, fountain droplets and butterfly wings.
`planet-landscape.ts` batches flower/grass/stone placements with instancing. Tree
and bench assets are also instanced; no additional model download is required.

## Camera, HUD and lifecycle

The radial camera follows the local east/up/south frame, with pole bearing carried
into controls. Zoom retains separate indoor/outdoor state. Outdoor half-span is
5–75 m, indoor is 3.5–11 m; the globe button targets 56 m and portrait framing widens
to keep the sphere visible. Home resets the current view. A directional sunlight
follows the view so the reverse hemisphere remains readable. Facade cutaway uses
the actual view direction and surface normal.

Map modes are nearby, original district and full-planet surface atlas. Camera zoom
is independent. The current mission objective remains outside collapsible details;
ambient dialogue has its own temporary panel. Disposal covers cached interiors,
cloned actor materials and shared scene geometry. HUD subscriptions and input
listeners are removed on teardown.

## Persistence and verification

The existing schemaVersion 1 save envelope is retained. New planet positions are
validated against the expanded world; old saves covered by changed props are
validated against the legacy layout before relocation. First aid pickup, delivery
and completed-clinic state retain their original contracts.

Tests cover complete circumnavigation, pole crossing including exact-pole motion,
radial model/camera alignment, route seams, patrol connectivity, watering and door
priority, quest completion, save restoration and disposal. Offline scene exports
are rendered on the configured Windows OptiX workstation. Browser GPU rendering,
layout and FPS have not been verified by automation; offline renders do not prove
them. The manual acceptance checklist is in the living-planet decision document.

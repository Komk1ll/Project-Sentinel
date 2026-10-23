# Zarechensk Town Prototype

## Scope and layout

The playable district is a fictional autumn neighborhood called Zarechensk. Its restrained colors, warm windows, planted courtyards and isometric view follow the supplied town reference. All geometry is procedural rather than a copy of the reference image.

`src/content/town.ts` is the authoritative layout. It defines a 64 x 64 meter district, three crossing streets on each axis, a garden at (24, 24), the initial player position, and 19 named buildings. Lots include apartments, a cafe, library, clinic, workshop, grocery, bakery, post office and district administration. Building footprints, front entrances and minimap markers use these same records. Quest placement can be revised later by editing these data rather than scene code.

The current streets are broad enough for traversal between every lot. The front of every building faces positive Z. `buildingEntrance` derives an interaction point one meter in front of that facade. Every building is enterable. Interiors use a 10 x 8 meter cutaway floor plan, with connected rooms, broad doorways and furnishings defined by building kind. Homes have bedrooms, living spaces and kitchen areas; public buildings have purpose-specific rooms and furniture.

## Simulation

`TownWorld` is independent of Three.js, Phaser and the DOM. It owns player position and the current building, exposes proximity and exit availability, and publishes movement/transition updates through subscriptions.

- Speed is 5 meters per second. Input is normalized and frame duration is capped at 50 milliseconds.
- Movement slides along blocked axes. Exterior building rectangles and interior furniture rectangles include a 0.3 meter player clearance.
- Exterior player-center bounds are 0.5 to 63.5 meters. Interior player-center bounds are X -4.5 to 4.5 and Z -3.5 to 3.5.
- E enters the nearest door within 2.4 meters. Interior spawn is (0, 2). E returns to the saved exterior position when within 1.5 meters of the exit at (0, 3).
- A building transition changes the scene, location label, interaction hint and minimap together. There is no automatic quest or stat reward for visiting a room.
- Building walls, parked cars, the monument pedestal and interior furniture block movement. Cars and the monument use shared obstacle records in `town-props.ts`. Vegetation, benches, curbs and planters remain decorative.

## Rendering

`ThreeRenderer` presents the simulation through an orthographic camera facing from positive X and Z. It follows the player smoothly outdoors. Indoors, a wide view frames the floor plan and a close view follows the player so magnification cannot leave the character outside the frame. The camera uses a lower isometric angle and softer, neutral lighting. `CameraZoom` smooths changes with independent remembered settings for outdoors and indoors. Outdoor half-span is bounded to 5–30 meters; indoor half-span is 3.5–11 meters. Mouse wheel, +/− keys and on-screen buttons share the same zoom state. Home or the percentage button resets the active view.

`town-meshes.ts` constructs the outdoor district: weathered plaster facades, brick foundations, illuminated windows with curtains, balconies, doors, signs, air conditioners, parapets and roof service details, sidewalks, crossings, parked cars, autumn trees, benches, lamps and a planted garden. Small homes have pitched metal roofs and gutters. `surface-textures.ts` generates deterministic plaster, brick, cracked asphalt, paving and metal textures. Physical-size UV coordinates keep material scale consistent across buildings. Repeated meshes are batched with `InstancedMesh`. Foreground geometry uses a narrow dithered sight-line cutaway to keep the character visible behind buildings. A shared shadow-casting directional light and four non-shadowing park lights provide warm lighting. The renderer limits pixel ratio to 1.75 and uses a 2048-pixel shadow map.

`content/interiors.ts` supplies `getInteriorLayout(building)`: room areas, floor finishes, palette, partitions, furniture and collision rectangles. `interior-meshes.ts` renders these same records with cutaway walls, textured floors, rugs and detailed furniture. Active simulation and minimap use the same layout, so visible partitions, furniture and doorways match collisions. Room resources are disposed on transition. The character is a small animated human mesh with alternating limbs and a ground marker.

The active town uses Three.js for both exterior and interior geometry. `GameEngine` coordinates keyboard input, `TownWorld` and rendering. The older Phaser district and boot scene remain available as legacy 2D prototype code, but are not instantiated alongside the town. This avoids rendering the former tile grid and floating robot over the new district.

## UI and controls

`mountTownHud` subscribes to the world and draws a north-up minimap using actual footprints, doors, streets, park and player coordinates. Interiors show room and furniture bounds instead. The top-right card includes the city and current location. Bottom-center hints explain movement, zoom and contextual E actions. The available entry/exit action is also a clickable button. Zoom buttons beneath the minimap show current magnification and offer a reset. Non-interactive overlay areas pass pointer events through to the game; entry and zoom buttons receive pointer and keyboard input. Engine cleanup releases HUD subscriptions, DOM nodes and resize listeners.

WASD and arrow keys move relative to the screen. Physical key codes also support a Russian keyboard layout. Holding E does not repeatedly change rooms; a new press is required. Blur clears held movement keys. The upper-left mission panel shows the first aid objective, carried kit and master dialogue. It replaces the inactive zero-stat HUD. Keyboard and button actions now pass through `FirstAidMission`, which routes eligible NPC interactions and delegates doors to `TownWorld`. See [First aid pickup](first-aid-mission.md).

## Validation and limits

Vitest tests cover all 19 doorway round trips, exterior spawn-to-door routes, connected interior room routes and return exits, partition collision and doorways, furniture collision, frame caps, normalized movement, bounds, subscriptions, and smooth zoom limits, reset and mode retention. A construction smoke check validates procedural Three.js meshes without WebGL; browser appearance still requires visual review. TypeScript checks and a production build validate integration.

The district is a playable visual prototype. The first aid pickup adds one NPC, an interior actor collision footprint, a single quest item and a clinic delivery objective. Clinic handover, persistence of the current room and mission, consumables, collision for minor street decoration and touch controls are not part of this milestone. Navigation and mission progression currently live in memory.

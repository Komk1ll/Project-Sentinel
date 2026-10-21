# Technical Architecture Overview

## Hybrid Engine: Phaser 3 + Three.js + HTML5

The current playable district uses a Three.js isometric town renderer, a pure town simulation and HTML overlays. The earlier Phaser tile scene is retained as legacy prototype code and is not started alongside the town. See [Zarechensk town architecture](town-world.md) for the active runtime, controls, layout and collision contracts.

The original hybrid architecture is retained below as background:

```
+-----------------------------------------------------------+
|                      HTML5 UI Layer                       |
|           (DOM HUD, Dialogs, Accessibility, Focus)        |
+-----------------------------------------------------------+
|                   Three.js WebGL Layer                    |
|        (3D Mesh View, Lighting, High-Fidelity Models)     |
+-----------------------------------------------------------+
|                   Phaser 3 Game Canvas                    |
|    (2:1 Isometric Map, 2D Sprites, Physics, Input, Camera)|
+-----------------------------------------------------------+
|                     State & Content                       |
|       (TypeScript Strict GameState, Content Records)      |
+-----------------------------------------------------------+
```

### 1. Phaser 3 Engine
- **Role**: Scene lifecycle, isometric map rendering, input handling, camera control, sound playback.
- **Projection**: 2:1 isometric projection (128x64 px per 2x2 m world cell).
- **Coordinate Systems**:
  - Logical metric grid ($x, y$ in meters, cell size 2m, pathfinding grid 0.5m).
  - Isometric screen coordinates calculated via `gridToIso(x, y)`.

#### Legacy 2D District Extent and Movement
- The prototype district contains 32 x 32 tiles (1,024 tiles, 64 x 64 meters).
- `src/game/systems/district.ts` defines the shared size and clamps continuous player coordinates to `[0, 31]` on both grid axes. Rendering and movement use the same extent.
- The scene uses a fixed world origin for both initial placement and subsequent movement; the camera follows the player across the expanded area.
- Ground tiles render below the player so foreground ground cannot obscure the character.

### 2. Three.js WebGL / OpenGL Engine
- **Role**: Active town and interior rendering, animated character, orthographic follow camera, shadows and lighting. Geometry is defined by the shared town layout.
- **Camera Configuration**:
  - Isometric orthographic camera.
  - Azimuth: 45°
  - Elevation: 30° (or standard $\arctan(1/\sqrt{2}) \approx 35.26^{\circ}$ matching Blender scene standards).

### 3. State Management & Storage
- Single serializable `GameState` tree.
- Automated save mechanism to `localStorage` with failover backup key.
- Strict schema validation (`SaveData` v1).

### Player HUD
- `src/ui/player-hud.ts` mounts a compact, read-only HTML overlay in `#ui-container`; its styles live in `src/ui/player-hud.css`.
- The top-left card is 400 pixels wide (previously 582), with smaller typography and spacing. Narrow screens scale the card down. It shows no portrait or vertical navigation.
- Russian display text follows the supplied visual reference; implementation identifiers and documentation remain English.
- `GameEngine.playerProgress` owns a `PlayerProgress` instance from `src/game/systems/player-progress.ts`. Health, stamina, satiety, mood, level, and experience all start at zero on a new engine instance.
- `playerProgress.update(patch)` updates selected values and notifies the HUD subscription immediately. Future consumables can use, for example, `playerProgress.update({ health: playerProgress.snapshot.health + 25 })`; future reward systems can update level and experience through the same API.
- Stats and experience are bounded to 0–100, level is a nonnegative integer, and nonfinite input resets to zero. Level progression is explicit; no automatic leveling or consumable mechanics exist yet.
- The HUD renders numeric values, accessible progress values, and fill widths from the same immutable snapshot. `mountPlayerHud` returns a cleanup function that removes the subscription and overlay.
- This progress store is currently in-memory; save serialization is unchanged. The display allows pointer input to pass through to the game.

### 4. Build & Delivery
- **Bundler**: Vite with relative paths (`base: './'`).
- **Language**: TypeScript strict mode (no `any` allowed).
- **Testing**: Vitest for game logic, math, and data contracts.

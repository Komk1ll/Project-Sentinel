# Technical Architecture Overview

## Hybrid Engine: Phaser 3 + Three.js + HTML5

Project Sentinel utilizes a dual-engine architecture designed for high-performance isometric browser gameplay with 3D WebGL / OpenGL capabilities:

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

### 2. Three.js WebGL / OpenGL Engine
- **Role**: 3D model inspection, volumetric lighting, particle effects, and OpenGL/WebGL shaders.
- **Camera Configuration**:
  - Isometric orthographic camera.
  - Azimuth: 45°
  - Elevation: 30° (or standard $\arctan(1/\sqrt{2}) \approx 35.26^{\circ}$ matching Blender scene standards).

### 3. State Management & Storage
- Single serializable `GameState` tree.
- Automated save mechanism to `localStorage` with failover backup key.
- Strict schema validation (`SaveData` v1).

### 4. Build & Delivery
- **Bundler**: Vite with relative paths (`base: './'`).
- **Language**: TypeScript strict mode (no `any` allowed).
- **Testing**: Vitest for game logic, math, and data contracts.

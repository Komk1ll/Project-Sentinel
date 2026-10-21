# Project Sentinel

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![Phaser](https://img.shields.io/badge/Phaser-3.88+-orange.svg)](https://phaser.io/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL%2FOpenGL-black.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-Bundler-646CFF.svg)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-TDD-green.svg)](https://vitest.dev/)

**Project Sentinel** is an isometric browser-based narrative exploration game set in a post-incident small Russian town. Players uncover the causes behind municipal automation malfunctions, repair sentinel robotics, and restore essential public infrastructure through cooperation and mutual assistance.

---

## Playable Town Prototype

Explore Zarechensk, a procedural autumn district with 19 enterable buildings, a central garden, connected furnished interiors and a live minimap. Weathered masonry, cracked roads, varied roofing and muted autumn foliage add detail to the district. Use **WASD / arrow keys** to walk, **E** or the contextual on-screen button near a front door to enter or exit, and the **mouse wheel**, **+ / −** keys or minimap buttons to zoom outdoors and indoors. **Home** or the percentage button resets the current view. Walk toward the open front of an interior to reach its exit.

The compact character HUD starts health, stamina, satiety, mood, level and experience at zero. These values are ready for future game rewards and consumables. Quests are not implemented in this prototype.

The active town renders through Three.js; Phaser is retained for the earlier 2D scenes. Read [Town architecture](docs/architecture/town-world.md) for the layout, simulation and integration contracts.

## Technology Stack

- **Rendering & Engine**:
  - **Phaser 3**: 2:1 Isometric grid (128×64 px per 2×2 m world tile), scene orchestration, sprite animations, input handling, and audio.
  - **Three.js (3JS / WebGL / OpenGL)**: 3D model inspection, volumetric lighting, shaders, and visual overlays rendered with isometric orthographic projection (Azimuth 45°, Elevation 30° matching Blender asset specifications).
  - **HTML5 & Modern CSS**: Decoupled, accessible DOM-based HUD and modal UI layer with glassmorphism styling.
- **Language & Runtime**:
  - **TypeScript (Strict Mode)**: Zero `any`, strongly-typed `GameState`, `SaveData`, content schemas, and systems.
- **Tooling & Build**:
  - **Vite**: Rapid HMR development environment and optimized relative production builds (`base: './'`).
  - **Vitest**: Fast unit test suite supporting Test-Driven Development (TDD).

---

## Quick Start

### 1. Installation
```bash
npm install
```

### 2. Development Server
Run Vite with hot-module reloading:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Type Checking & Testing
```bash
# Strict TypeScript validation
npm run typecheck

# Run unit tests
npm test

# Run tests in watch mode (recommended for TDD)
npm run test:watch
```

### 4. Production Build
```bash
npm run build
npm run preview
```

---

## Repository Structure

```
.
├── docs/                      # Central documentation hub (All specs, ADRs, guides)
│   ├── architecture/          # Dual-engine architecture (Phaser + Three.js)
│   ├── decisions/             # Architecture Decision Records
│   ├── guides/                # Developer onboarding and workflow guides
│   └── specs/                 # Game design docs, technical specs, and asset catalog
├── public/                    # Static runtime assets
│   └── assets/                # Atlases, maps, audio, models, textures
├── src/                       # Source code
│   ├── content/               # Quests, items, recipes, dialog definitions
│   ├── game/                  # Core game logic, scenes, render bridge, systems
│   ├── types/                 # Strict TypeScript schemas and contracts
│   ├── ui/                    # HTML5 overlay components and HUD
│   ├── utils/                 # Isometric coordinate math, storage, pathfinding
│   └── main.ts                # Application bootstrap
├── tests/                     # Vitest test suites (unit & systems)
├── AGENTS.md                  # Development guidelines, branch policy, code style
├── index.html                 # HTML5 container with multi-layer canvas mounts
├── package.json               # Dependencies and scripts
├── tsconfig.json              # Strict TypeScript configuration
└── vite.config.ts             # Vite configuration with path aliases
```

---

## Agent & Contribution Guidelines

For full rules, see [AGENTS.md](file:///Users/kirill/Documents/Projects/Project-Sentinel/AGENTS.md).

- **Branch Policy**: Never commit or push directly to `main`. Create feature branches (`feature/<name>`, `fix/<name>`).
- **Human Merge Only**: Merging into `main` requires manual human review and approval.
- **Documentation**: All architectural decisions and technical changes must be documented in `/docs`.
- **Language**: All code, comments, documentation, and commit messages must be strictly in English.
- **Commits**: Keep commits simple, focused, and atomic.
- **TDD**: Test-driven development is recommended, especially when working with Agent Teams.

---

## Remote Repository

- **Origin**: `git@github.com:Komk1ll/Project-Sentinel.git`

# Project Sentinel

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![Phaser](https://img.shields.io/badge/Phaser-3.88+-orange.svg)](https://phaser.io/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL%2FOpenGL-black.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-Bundler-646CFF.svg)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-TDD-green.svg)](https://vitest.dev/)

**Project Sentinel** is an isometric browser-based narrative exploration game set in a post-incident small Russian town. Players uncover the causes behind municipal automation malfunctions, repair sentinel robotics, and restore essential public infrastructure through cooperation and mutual assistance.

---

## Playable Town Prototype

Explore Zarechensk, a cozy stylized district with 19 enterable buildings, a central garden, connected furnished interiors and a live minimap. Original Blender models add pitched roofs, framed windows, shop signs, planted streets, furnished rooms and expressive characters. Soft daylight and a cream-and-teal interface unify the presentation. Use **WASD / arrow keys** to walk, **E** or the contextual on-screen button near a front door to enter or exit, and the **mouse wheel**, **+ / −** keys or minimap buttons to zoom outdoors and indoors. **Home** or the percentage button resets the current view. Walk toward the open front of an interior to reach its exit.

The complete first aid episode is playable: follow the golden minimap target to the Mayak workshop, enter and approach the master. Press **E** or click the contextual action to receive one aid kit. The mission panel shows the item and changes the objective to deliver it to the clinic, which becomes the map target. Repeated interaction gives a reminder without duplicating the kit. Approach the medic in the clinic and interact to hand over the kit and complete the first mission. Progress, inventory, room and position are saved automatically and restored after reload. The completed clinic state persists; repeated conversations do not issue or consume another item. The mission panel replaces the inactive zero-stat HUD.

See [First aid episode](docs/architecture/first-aid-mission.md) for state contracts, verification and the manual acceptance route.

See [Web asset pack](docs/architecture/web-asset-pack.md) for the active lightweight models, metric scale, remote Blender production and validation. The map labels Mayak and the clinic and guides the player around collisions. The initial GLB requests total 2,803,724 bytes (nine new models plus two existing interiors and the seated resident).

The active town renders through Three.js; Phaser is retained for the earlier 2D scenes. Read [Town architecture](docs/architecture/town-world.md) for the layout, simulation and integration contracts.

## Technology Stack

- **Rendering & Engine**:
  - **Phaser 3**: 2:1 Isometric grid (128×64 px per 2×2 m world tile), scene orchestration, sprite animations, input handling, and audio.
  - **Three.js (3JS / WebGL / OpenGL)**: 3D model inspection, volumetric lighting, shaders, and visual overlays rendered with isometric orthographic projection (45° azimuth with a raised camera for readable town and room views).
  - **HTML5 & Modern CSS**: Decoupled, accessible DOM-based HUD and modal UI layer with warm paper surfaces and teal accents.
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

For full rules, see [AGENTS.md](AGENTS.md).

- **Branch Policy**: Never commit or push directly to `main`. Create feature branches (`feature/<name>`, `fix/<name>`).
- **Human Merge Only**: Merging into `main` requires manual human review and approval.
- **Documentation**: All architectural decisions and technical changes must be documented in `/docs`.
- **Language**: All code, comments, documentation, and commit messages must be strictly in English.
- **Commits**: Keep commits simple, focused, and atomic.
- **TDD**: Test-driven development is recommended, especially when working with Agent Teams.

---

## Remote Repository

- **Origin**: `git@github.com:Komk1ll/Project-Sentinel.git`

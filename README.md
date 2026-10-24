# Project Sentinel

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![Phaser](https://img.shields.io/badge/Phaser-3.88+-orange.svg)](https://phaser.io/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL%2FOpenGL-black.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-Bundler-646CFF.svg)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-TDD-green.svg)](https://vitest.dev/)

**CyberShield / Project Sentinel** is a browser-based narrative exploration game about helping a small community. The current prototype places Zarechensk on a walkable coastal island with preserved indoor missions.

---

## Local Herd launch

Open [cybershield.test](http://cybershield.test/) with Herd running. Refresh after
changes: the site rebuilds on request when source files change, then serves the
production game. No background Node server or login agent is required.
See [Herd setup and verification](docs/guides/herd-local.md).

## Playable Town Prototype

Explore a flat island with 11 enterable buildings, an eastern garden, two ponds,
a windmill and a closed coastal walk. Six rounded residents walk, pause and talk;
a flower bed can be watered. Animated limbs, fountain droplets, butterflies and
mill sails add motion. The 1.70 m hero retains metre scale. Water has animated
waves, shore foam and highlights; surfaces have procedural grain and micro-bump.

Use **WASD / arrows** to walk and **E** or the action button for doors, people and
notice boards. Quest actions take priority. The map offers **Nearby**, **District**
and **Island** modes, with a visible coastline and no connected edges.
The **◎ camera button** frames the island; mouse wheel and **+ / −** control zoom,
and **Home / percentage button** returns to the normal view.

Read [Coastal island](docs/decisions/coastal-island.md) for the current design and
verification boundaries. Conversations and watering are temporary ambient activity;
quest progress and player position persist. Valid saves from the old globe are
relocated onto land without resetting their mission stage.

The complete first aid episode is playable: follow the golden minimap target to the Mayak workshop, enter and approach the master. Press **E** or click the contextual action to receive one aid kit. The mission panel shows the item and changes the objective to deliver it to the clinic, which becomes the map target. Repeated interaction gives a reminder without duplicating the kit. Approach the medic in the clinic and interact to hand over the kit and complete the first mission. Progress, inventory, room and position are saved automatically and restored after reload. The completed clinic state persists; repeated conversations do not issue or consume another item. The mission panel replaces the inactive zero-stat HUD.

See [First aid episode](docs/architecture/first-aid-mission.md) for state contracts, verification and the manual acceptance route.

See [Web asset pack](docs/architecture/web-asset-pack.md) for the active lightweight models, metric scale, remote Blender production and validation. The map labels Mayak and the clinic and guides the player around collisions. The initial GLB requests total 3,273,372 bytes (twelve existing GLBs; island scenery is generated locally).

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

# AGENTS.md - Agent Operating Guidelines & Standards

This document establishes the binding engineering, git, architectural, and workflow standards for all AI agents and contributors working on **Project Sentinel**.

---

## 1. Git Workflow & Branch Policy

### Strict Main Branch Protection
- **NEVER push directly to the `main` branch under any circumstances.**
- **All active development occurs strictly in dedicated feature/fix branches.**
- **Merging into `main` is performed EXCLUSIVELY via manual review and human approval.**
- Agents must NOT execute automated or forceful merges into `main`.

### Branch Naming Convention
Branches must be short, lowercase, and prefixed by purpose:
- `feature/<short-description>` (e.g., `feature/isometric-lighting`, `feature/inventory-ui`)
- `fix/<short-description>` (e.g., `fix/save-schema-version`, `fix/depth-sorting`)
- `refactor/<short-description>` (e.g., `refactor/three-bridge`)
- `test/<short-description>` (e.g., `test/pathfinding-a-star`)
- `docs/<short-description>` (e.g., `docs/architecture-update`)

### Commit Policy: Atomic & Simple
- **Atomicity**: Each commit must represent a single logical change. Do not bundle unrelated changes, formatting passes, or feature additions together.
- **Commit Messages**: Clear, simple, imperative, and descriptive without fluff:
  - Good: `feat: add 2:1 isometric tile conversion utility`
  - Good: `fix: correct z-depth calculation for overlapping props`
  - Good: `docs: document Three.js camera isometric angles`
  - Good: `test: add unit tests for StorageService fallback`
  - Avoid vague commits like `update files` or `wip`.

---

## 2. Base Directory Structure

The repository follows a clean, decoupled architecture:

```
Project-Sentinel/
├── docs/                      # Central documentation hub (Architectural Principle)
│   ├── architecture/          # System design, engine bridge, rendering pipelines
│   ├── decisions/             # Architecture Decision Records (ADRs)
│   ├── guides/                # Setup, onboarding, developer manuals
│   └── specs/                 # Technical requirements, game design documents, catalog
├── public/                    # Static assets served as-is by Vite
│   └── assets/
│       ├── atlases/           # Sprite atlases & texture packs
│       ├── audio/             # Sound effects, ambient tracks, voice clips
│       ├── maps/              # Tiled JSON isometric maps
│       ├── models/            # 3D models (GLTF/GLB) for Three.js
│       └── textures/          # Material textures, decals, normal maps
├── src/                       # Application source code
│   ├── content/               # Game data, item databases, quests, dialog trees
│   ├── game/                  # Core game logic and subsystems
│   │   ├── core/              # Game engine bootstrap, main loop, lifecycle
│   │   ├── entities/          # Player, sentinel robots, interactable objects
│   │   ├── render/            # Three.js WebGL/OpenGL bridge, lighting, shaders
│   │   ├── scenes/            # Phaser scenes (Boot, Preload, District, Interior)
│   │   └── systems/           # Subsystems (Movement, Inventory, Quest, Save, RobotAI)
│   ├── types/                 # Strict TypeScript schemas, content records, game state
│   ├── ui/                    # HTML5 / CSS overlay components (HUD, dialogs, menus)
│   ├── utils/                 # Math, isometric projection, storage, pathfinding
│   └── main.ts                # Application entry point
├── tests/                     # Unit, integration, and systems test suites
│   ├── fixtures/              # Mock game states and asset descriptors
│   ├── systems/               # System-level test cases
│   └── unit/                  # Unit tests (math, storage, schemas)
├── AGENTS.md                  # Agent operating instructions (this document)
├── index.html                 # Main HTML5 entry canvas and HUD mounts
├── package.json               # Dependencies and npm scripts
├── README.md                  # Project overview and quick start
├── tsconfig.json              # Strict TypeScript configuration
└── vite.config.ts             # Vite build & Vitest test configuration
```

---

## 3. Documentation Principle: `/docs` First

- **Primary Source of Truth**: All architecture decisions, specification changes, and design patterns **must be documented in `/docs`**.
- Whenever adding a new system or refactoring an existing subsystem, update the corresponding file in `/docs/architecture/` or write an ADR in `/docs/decisions/`.
- Never leave undocumented contracts or hidden side-effects.

---

## 4. Language Standard

- **Strict English Standard**: All source code, docstrings, code comments, commit messages, PR descriptions, and files in `/docs` must be written **strictly in English**.
- *(Exception: Original client specifications in `docs/specs/*.docx` preserve their historical source text).*

---

## 5. Code Style & Best Practices

### Simplicity, Clarity, Extensibility
1. **Strict TypeScript**:
   - `noImplicitAny: true`, `strict: true`.
   - Never use `any`. Use `unknown`, proper type narrowing, generics, or tagged unions.
   - All state mutations must adhere to defined type interfaces (`GameState`, `SaveData`, `AssetRecord`).
2. **Modular & Decoupled**:
   - Separate game simulation logic (state, math, rules) from presentation (Phaser rendering, Three.js 3D meshes, DOM UI).
   - Use events or subscriber callbacks rather than tight coupling across layers.
3. **Immutability Where Appropriate**:
   - Prefer `readonly` for records, asset descriptors, and static configuration data.
4. **Clean Functions**:
   - Functions should do one thing well.
   - Avoid deep nesting; prefer early returns and guard clauses.
5. **Path Aliases**:
   - Always utilize configured path aliases (`@/`, `@game/`, `@content/`, `@ui/`, `@types/`, `@utils/`) rather than fragile relative navigation like `../../../../`.

---

## 6. Testing & TDD via Agent Teams

### Policy
- **TDD (Test-Driven Development)**:
  - Game mechanics, state transitions, coordinate math, inventory logic, and save serialization should be backed by unit tests using Vitest.
  - Optional mode: When initiating a new development milestone or substantial feature, **ask the user if they want to operate in TDD mode via an Agent Team** (e.g. Test Engineer subagent writing test suites first, followed by Feature Developer subagent implementing code to pass tests).

### Running Tests
```bash
npm test         # Run test suites once
npm run test:watch # Run Vitest in interactive watch mode
npm run typecheck  # Validate TypeScript strictly across all files
```

---

## 7. Starting a New Task (Checklist for Agents)

1. Verify git branch (`git status`, ensure NOT on `main`).
2. If working on a new task, create a dedicated branch: `git checkout -b feature/<task-name>`.
3. Ask the user if TDD / Agent Team workflow is desired for this session.
4. Read relevant specifications in `docs/` before making architectural choices.
5. Write code with tests, adhering strictly to English comments and clean code style.
6. Commit atomically with clear, concise messages.
7. Prepare changes for human manual review — **never merge to `main` without human confirmation.**

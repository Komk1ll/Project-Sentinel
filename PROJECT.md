# Project Sentinel: CyberShield Narrative Campaign ("Киберщит: Код наследия")

## Architecture
The application follows a decoupled 5-tier architecture combining Phaser 3 (2D isometric simulation & input) and Three.js (3D isometric rendering with orthographic projection, pixel-art toon shading, and stepped keyframe animation):

```
┌─────────────────────────────────────────────────────────────┐
│                    DOM UI Overlay Layer                     │
│  (Dialogue boxes, Quest HUD, Keypad UI, Terminal consoles)  │
└──────────────────────────────▲──────────────────────────────┘
                               │ events / callbacks
┌──────────────────────────────▼──────────────────────────────┐
│                    Game Systems Layer                       │
│  - QuestEngine (15 quests, 4 acts, branching state machine) │
│  - DialogueEngine (Alexey, Curator, Professor, Console)     │
│  - PuzzleEngines (Keypad, Switchboard, CCTV, Jammer)        │
│  - InteractionEngine (Impulse Debugger, modular disassembly)│
│  - SaveSystem (SaveData v1 schema serialization)            │
└──────────────────────────────▲──────────────────────────────┘
                               │ coordinates / state
┌──────────────────────────────▼──────────────────────────────┐
│                   Scenes & Diorama Layer                    │
│  - DioramaSceneManager (10 distinct campaign zones)         │
│  - DynamicLightingController (darkness -> warm golden)      │
│  - EntityCoordinator (Hero, NPCs, Droids, Props)            │
└──────────────────────────────▲──────────────────────────────┘
                               │ transform / animations
┌──────────────────────────────▼──────────────────────────────┐
│                 Engine Bridge & Render Layer                │
│  - Phaser 3: 2:1 isometric grid, WASD screen delta input    │
│  - Three.js: Orthographic camera (azimuth 45°, elev 35.26°) │
│  - Stepped frame quantization (2–10 fps), Toon cel-shading  │
│  - GLBModelLoader with SkeletonUtils cloning & bone binding │
└─────────────────────────────────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | 15-Quest Campaign State Machine | Sequential progression across 4 Acts tracking active quest, completed flags, and inventory | M1 | `Документ.pdf` p. 1–8 |
| 2 | Epilogue Branching Engine | Branching in Quest 13 routing into Quest 14 (Final A) or Quest 15 (Final B) | M1 | `Документ.pdf` p. 7–8 |
| 3 | Dialogue System & Speaker Roles | Multi-speaker dialogues (Alexey, Curator, Professor, Console) with event triggers | M1 | `Документ.pdf` p. 1–8 |
| 4 | Campaign Save/Load Serialization | Full serialization of quest states, world flags, inventory, and diorama positions in SaveData v1 | M1 | `storage.ts` & Request |
| 5 | 3D Hero Model (Alexey) | Teal jacket, orange backpack; animations: idle (4 fps), walk (10 fps), interact (8 fps) | M2 | `Документ.pdf` & Request |
| 6 | 3D Professor Model | White lab coat, glasses; animations: idle (4 fps), talk (4 fps), walk (8 fps) | M2 | `Документ.pdf` & Request |
| 7 | 3D Patrol Droid Model | Sentry droid with yellow scanning cone; animations: scan (6 fps), move (8 fps), idle (2 fps) | M2 | `Документ.pdf` & Request |
| 8 | 3D Courier Blocker Bot Model | 4-wheel robot; animations: idle (2 fps), modular disassemble (8 fps) | M2 | `Документ.pdf` & Request |
| 9 | 3D Quadruped Robo-Dog Model | Mechanical hound holding brass keys; animations: idle (4 fps), run (10 fps), drop_keys (8 fps) | M2 | `Документ.pdf` & Request |
| 10 | 3D Flying Recon Drone Model | Surveillance quadcopter with spotlight; animations: hover (6 fps), patrol (8 fps) | M2 | `Документ.pdf` & Request |
| 11 | 3D Interactive Prop Models | GLB assets: Impulse Debugger, Security Terminal, Power Switchboard, Jammer Antenna, Server Rack, Holo Console | M2 | `Документ.pdf` & Request |
| 12 | Non-Lethal Impulse Debugger | Handheld EMP pulse deactivating infected robots into modular pickups | M3 | `Документ.pdf` p. 2 |
| 13 | Modular Robot Disassembly | Bot breaks cleanly into 4 collectible parts: wheels, casing, camera, battery | M3 | `Документ.pdf` p. 2 |
| 14 | Keypad Passcode Puzzle | Dean's office door digital keypad validating faculty founding year code (1984) | M3 | `Документ.pdf` p. 1–2 |
| 15 | 3-Step Switchboard Repair Puzzle | Sequence: 1) Isolate Line -> 2) Replace Fuse -> 3) Reboot Master Grid; triggers lighting change | M3 | `Документ.pdf` p. 4–5 |
| 16 | CCTV Playback Terminal | Console playback rewinding security video to discover robo-dog path to Winter Garden | M3 | `Документ.pdf` p. 3–4 |
| 17 | Rogue Signal Jammer Disruption | EMP pulse disabling rogue antenna mast and unlocking main campus glass doors | M3 | `Документ.pdf` p. 5–6 |
| 18 | Central Server Recovery Protocol | Terminal console choice (Option A vs Option B/C) routing to final resolution | M3 | `Документ.pdf` p. 7–8 |
| 19 | Diorama Zones (Acts I–IV) | 10 distinct environmental dioramas matching Page 9 thumbnails | M4 | `Документ.pdf` p. 9 |
| 20 | Dynamic Lighting Transitions | Scene lighting transitions (emergency dark/amber to warm golden upon switchboard repair) | M4 | `Документ.pdf` panels 4, 8 |
| 21 | Full Campaign Integration & Acceptance | End-to-end integration of all 15 quests, dioramas, mechanics, 100% test pass | M5 | ORIGINAL_REQUEST |
| 22 | Comprehensive Opaque-Box E2E Suite | 4-Tier test suite covering all features, boundaries, interactions, and scenarios | E2E | AGENTS.md & Spec |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Requirement-driven opaque-box test suite (Tiers 1–4, TEST_READY.md) | None | DONE |
| M1 | Core Content, Quest & Dialogue Engine | 15 quests, item database, QuestSystem, DialogueSystem, Save serialization | None | DONE |
| M2 | 3D Asset Pipeline & Model Generation | 13 GLB models into `public/assets/models/`, Three.js verification | None | DONE |
| M3 | Interactive Mechanics & Puzzles | Debugger disassembly, Keypad, Switchboard, CCTV, Jammer, Final Console | M1 | DONE |
| M4 | Isometric Diorama Environments & Atmosphere | 10 campaign dioramas, scene management, dynamic lighting transitions | M1, M2 | DONE |
| M5 | Full Campaign Integration & 100% E2E Pass | Complete story playthrough, E2E test suite 100% pass, adversarial hardening | M1, M2, M3, M4, E2E | DONE |

## Interface Contracts

### 1. Quest System Contract (`src/game/systems/QuestSystem.ts`)
```typescript
export interface QuestState {
  id: string;
  status: 'locked' | 'available' | 'active' | 'completed' | 'failed';
  currentObjectiveIndex: number;
  completedObjectives: string[];
}

export interface IQuestEngine {
  getActiveQuest(): QuestRecord | null;
  startQuest(questId: string): boolean;
  completeObjective(questId: string, objectiveId: string): boolean;
  completeQuest(questId: string): boolean;
  isQuestCompleted(questId: string): boolean;
  selectEnding(choice: 'A' | 'B' | 'C'): 'quest_14_finale_ideal' | 'quest_15_finale_pragmatic';
  getState(): Record<string, QuestState>;
  loadState(state: Record<string, QuestState>): void;
}
```

### 2. Dialogue System Contract (`src/game/systems/DialogueSystem.ts`)
```typescript
export type DialogueSpeaker = 'alexey' | 'curator' | 'professor' | 'console' | 'system';

export interface DialogueNode {
  id: string;
  speaker: DialogueSpeaker;
  textRu: string;
  textEn: string;
  next?: string;
  options?: Array<{
    labelRu: string;
    labelEn: string;
    nextNodeId: string;
    onSelect?: () => void;
  }>;
}

export interface IDialogueEngine {
  startDialogue(dialogueTreeId: string, onComplete?: () => void): void;
  advance(): DialogueNode | null;
  selectOption(optionIndex: number): DialogueNode | null;
  getCurrentNode(): DialogueNode | null;
  isActive(): boolean;
}
```

### 3. Puzzle & Interaction Contracts (`src/game/systems/PuzzleSystems.ts`)
```typescript
export interface IKeypadPuzzle {
  inputDigit(digit: number): { buffer: string; success?: boolean; error?: boolean };
  clear(): void;
  isUnlocked(): boolean;
}

export interface ISwitchboardPuzzle {
  isolateLine(): { success: boolean; message: string };
  insertFuse(fuseItemId: string): { success: boolean; message: string };
  rebootGrid(): { success: boolean; powerRestored: boolean; message: string };
  getState(): { lineIsolated: boolean; fuseInserted: boolean; gridRebooted: boolean; isComplete: boolean };
}

export interface IDebuggerSystem {
  aimAt(targetEntityId: string): boolean;
  firePulse(): { hit: boolean; targetId?: string; disassembledModules?: string[]; error?: string };
}
```

### 4. Diorama Environment Contract (`src/game/systems/DioramaManager.ts`)
```typescript
export type DioramaZoneId = 
  | 'zone_01_gate'
  | 'zone_02_deans_basement'
  | 'zone_03_courtyard_alley'
  | 'zone_04_lab_corridor'
  | 'zone_05_security_room'
  | 'zone_06_winter_garden'
  | 'zone_07_cable_tunnel'
  | 'zone_08_grand_lobby'
  | 'zone_09_datacenter'
  | 'zone_10_finale_celebration'
  | 'zone_11_finale_cleanup';

export interface IDioramaManager {
  loadZone(zoneId: DioramaZoneId): Promise<void>;
  getActiveZone(): DioramaZoneId;
  setLightingState(state: 'dark_emergency' | 'warm_restored' | 'twilight' | 'sunny_day'): void;
}
```

## Code Layout
```
src/
├── content/
│   ├── items/items.json             # All item definitions (tools, fuses, keys, robot modules)
│   └── quests/
│       ├── cybershield_quests.json  # Complete 15 quests data with objectives & dialogues
│       └── dialogues.json           # Detailed dialogue trees with speaker metadata
├── game/
│   ├── entities/
│   │   ├── AlexeyHero.ts            # Player entity controller
│   │   ├── ProfessorNPC.ts          # Mentor NPC controller
│   │   └── robots/                  # PatrolDroid, BlockerBot, RoboDog, ReconDrone
│   ├── scenes/
│   │   ├── BootScene.ts             # Asset loading & bootstrap
│   │   ├── DioramaScene.ts          # Unified diorama scene controller
│   │   └── DistrictScene.ts         # Free-roam campus scene
│   ├── systems/
│   │   ├── QuestSystem.ts           # 15-quest narrative state engine
│   │   ├── DialogueSystem.ts        # Dialogue playback & speaker coordinator
│   │   ├── ImpulseDebuggerSystem.ts # Tool targeting & modular disassembly
│   │   ├── KeypadPuzzleSystem.ts    # Code 1984 validation
│   │   ├── SwitchboardPuzzleSystem.ts # 3-step power restoration
│   │   ├── CCTVSystem.ts            # Surveillance footage playback
│   │   ├── JammerSystem.ts          # EMP jammer disruption
│   │   └── DioramaManager.ts        # Scene & lighting controller
│   └── render/                      # Existing Three.js rendering bridge
├── types/
│   ├── index.ts                     # Extended types (Quest, Items, SaveData v1)
│   └── campaign.ts                  # Campaign-specific interfaces
└── ui/
    ├── DialogueOverlay.ts           # HTML5 dialogue box UI
    ├── QuestHUD.ts                  # Active quest objective banner
    └── puzzles/                     # KeypadUI, SwitchboardUI, CCTVOverlay, HoloConsoleUI
```

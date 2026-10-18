# E2E Test Infrastructure Specification: Project Sentinel
## CyberShield Narrative Campaign ("Киберщит: Код наследия")

**Document Version**: 1.0.0  
**Target Milestone**: E2E Testing Track  
**Integrity Mode**: Development / Strict TypeCheck / CI Automated  
**Author**: Test Track Lead (`test_writer_e2e_1`)  
**Parent Agent**: `orchestrator_1` (`317f7cea-a2b8-4e6e-97b2-626341ae39e6`)  
**Reference Standards**: `AGENTS.md`, `PROJECT.md`, `Документ.pdf`, `spec_miner_survey_1/handoff.md`

---

## 1. Opaque-Box, Requirement-Driven Test Philosophy

The End-to-End (E2E) testing track for Project Sentinel operates strictly on an **opaque-box, requirement-driven philosophy**:

1. **Decoupling from Private Implementation Details**:
   - Tests interact exclusively through documented public interface contracts (`IQuestEngine`, `IDialogueEngine`, `IKeypadPuzzle`, `ISwitchboardPuzzle`, `IDebuggerSystem`, `IDioramaManager`, `StorageService`).
   - Tests never inspect private properties, internal variables, or unexported functions.
   - Refactoring internal algorithms or changing private data structures does not break the test suite as long as interface contracts and observable behaviors are preserved.

2. **Authoritative Expected Output Derivation**:
   - Every assertion in the test suite maps directly to an explicit requirement in `Документ.pdf` (Russian master scenario) and `PROJECT.md`.
   - Expected outputs (passcode `1984`, 4-part modular disassembly, 3-step switchboard restoration sequence, branching into Final A vs Final B) are derived from the canonical scenario, not guessed or tailored to arbitrary implementations.

3. **Progressive Testability & Headless Execution**:
   - The test harness is designed to execute seamlessly in Vitest under Node.js without requiring a physical WebGL canvas or browser window.
   - Visual and audio cues are verified through observable state indicators, event emissions, and asset descriptor checks.
   - The test harness provides an authoritative reference engine (`CampaignReferenceEngine`) and dynamic adapter (`CampaignDriver`) ensuring progressive testability across all milestones: tests are 100% executable and verifiable immediately, and automatically bridge to production modules as they are delivered in M1–M4.

4. **Adversarial & Boundary Verification**:
   - Beyond the happy path, tests subject systems to edge conditions: friendly fire against NPCs, out-of-sequence interactions, buffer clamping, inventory exhaustion, mid-dialogue interrupts, and schema migrations.

---

## 2. Feature Inventory Mapping to Test Tiers

The 22 features identified in `PROJECT.md` are systematically mapped across four test tiers:

| Feature # | Feature Name | Tier 1 (Coverage) | Tier 2 (Boundaries) | Tier 3 (Interactions) | Tier 4 (Scenarios) |
|:---:|---|:---:|:---:|:---:|:---:|
| **F01** | 15-Quest Campaign State Machine | `quest-state-machine.test.ts` | `quest-boundaries.test.ts` | `quest-inventory-drops.test.ts` | `playthrough-final-a / b.test.ts` |
| **F02** | Epilogue Branching Engine | `epilogue-branching.test.ts` | `console-boundaries.test.ts` | `dialogue-quest-triggers.test.ts` | `playthrough-final-a / b.test.ts` |
| **F03** | Dialogue System & Speaker Roles | `dialogue-system.test.ts` | `dialogue-boundaries.test.ts` | `dialogue-quest-triggers.test.ts` | `playthrough-final-a / b.test.ts` |
| **F04** | Campaign Save/Load Serialization | `save-serialization.test.ts` | `save-boundaries.test.ts` | `save-reload-scene-transitions.test.ts` | `playthrough-resilience.test.ts` |
| **F05** | 3D Hero Model (Alexey) | `3d-models-assets.test.ts` | Asset integrity validation | Scene spawn & orientation | Full campaign walkthrough |
| **F06** | 3D Professor Model | `3d-models-assets.test.ts` | Friendly fire immunity | Dialogue trigger & handshake | Final celebration & credits |
| **F07** | 3D Patrol Droid Model | `3d-models-assets.test.ts` | Scan cone detection radius | Stealth detour trigger | Act I stealth evasion |
| **F08** | 3D Courier Blocker Bot Model | `3d-models-assets.test.ts` | Obstruction collision box | Disassembly drop persistence | Act I passage unblocking |
| **F09** | 3D Quadruped Robo-Dog Model | `3d-models-assets.test.ts` | Fright / evasion AI | Key drop & collection | Act II Winter Garden hunt |
| **F10** | 3D Flying Recon Drone Model | `3d-models-assets.test.ts` | Airspace denial barrier | Underground detour trigger | Act III tunnel descent |
| **F11** | 3D Interactive Prop Models | `3d-models-assets.test.ts` | Prop interaction volumes | State synchronization | Full campaign puzzles |
| **F12** | Non-Lethal Impulse Debugger | `impulse-debugger.test.ts` | `debugger-boundaries.test.ts` | Tool acquisition & firing | Robot neutralizations |
| **F13** | Modular Robot Disassembly | `modular-disassembly.test.ts`| `disassembly-boundaries.test.ts`| Inventory crafting link | Module gathering |
| **F14** | Keypad Passcode Puzzle | `keypad-puzzle.test.ts` | `keypad-boundaries.test.ts` | Door unlock trigger | Act I Dean's office escape |
| **F15** | 3-Step Switchboard Repair Puzzle| `switchboard-puzzle.test.ts` | `switchboard-boundaries.test.ts`| Lighting & NPC unlock | Act II laboratory power |
| **F16** | CCTV Playback Terminal | `cctv-terminal.test.ts` | `cctv-boundaries.test.ts` | Unpowered state & quest map | Act II clue discovery |
| **F17** | Rogue Signal Jammer Disruption | `jammer-disruption.test.ts` | `jammer-boundaries.test.ts` | EMP pulse & door unlock | Act III lobby entry |
| **F18** | Central Server Recovery Protocol| `server-recovery-protocol.test.ts`| `console-boundaries.test.ts` | Key unlock & protocol select| Act IV terminal climax |
| **F19** | Diorama Zones (Acts I–IV) | `diorama-zones.test.ts` | Coordinate bounds clamping | Scene transition persistence| 10 campaign zone changes |
| **F20** | Dynamic Lighting Transitions | `dynamic-lighting.test.ts` | Abrupt transition clamping | Switchboard power callback | Dark -> warm transitions |
| **F21** | Full Campaign Integration | `campaign-integration.test.ts` | Zero blocking softlocks | Inter-system coherence | 100% campaign pass |
| **F22** | Comprehensive Opaque-Box Suite | Overall test infrastructure | Edge test harness | Cross-module test driver | End-to-end CI pass |

---

## 3. Test Architecture & Runner Format

```
tests/e2e/
├── harness/
│   ├── contracts.ts              # Strict TypeScript interface contracts & data models
│   ├── CampaignDriver.ts         # High-level opaque-box campaign test driver
│   ├── CampaignReferenceEngine.ts # Authoritative scenario oracle (Acts I–IV, Quests 1–15)
│   ├── ModelAssetValidator.ts   # 3D GLB model and asset integrity verifier
│   └── index.ts                  # Public harness API exports
├── tier1-features/               # Tier 1: Single-feature functional requirements
│   ├── quest-state-machine.test.ts
│   ├── epilogue-branching.test.ts
│   ├── dialogue-system.test.ts
│   ├── save-serialization.test.ts
│   ├── 3d-models-assets.test.ts
│   ├── impulse-debugger.test.ts
│   ├── modular-disassembly.test.ts
│   ├── keypad-puzzle.test.ts
│   ├── switchboard-puzzle.test.ts
│   ├── cctv-terminal.test.ts
│   ├── jammer-disruption.test.ts
│   ├── server-recovery-protocol.test.ts
│   ├── diorama-zones.test.ts
│   ├── dynamic-lighting.test.ts
│   └── campaign-integration.test.ts
├── tier2-boundaries/             # Tier 2: Boundary, corner, and failure modes
│   ├── debugger-boundaries.test.ts
│   ├── disassembly-boundaries.test.ts
│   ├── keypad-boundaries.test.ts
│   ├── switchboard-boundaries.test.ts
│   ├── cctv-boundaries.test.ts
│   ├── server-door-boundaries.test.ts
│   ├── jammer-boundaries.test.ts
│   └── console-boundaries.test.ts
├── tier3-interactions/           # Tier 3: Cross-feature & pairwise interactions
│   ├── quest-inventory-drops.test.ts
│   ├── save-reload-scene-transitions.test.ts
│   └── dialogue-quest-triggers.test.ts
└── tier4-scenarios/              # Tier 4: Full real-world playthrough scenarios
    ├── playthrough-final-a.test.ts
    ├── playthrough-final-b.test.ts
    └── playthrough-resilience.test.ts
```

### 3.1 Test Runner & Environment
- **Framework**: Vitest (`^2.1.5`)
- **Execution Command**:
  - Full suite: `npm test`
  - E2E suite only: `npx vitest run tests/e2e`
  - Single tier: `npx vitest run tests/e2e/tier4-scenarios`
- **TypeScript Checking**:
  - `npm run typecheck` (`tsc --noEmit`) validates all test files strictly under `strict: true`, `noImplicitAny: true`.
- **Isolation**: Each test case initializes a fresh instance of `CampaignDriver`, guaranteeing 100% independence, zero shared mutation, and deterministic order-independent execution.

---

## 4. Test Coverage Standards

Every test file adheres to the following quantitative and qualitative standards:
1. **Tier 1 (Feature Coverage)**: At least 5 distinct test cases per feature covering primary behavior, status transitions, inputs/outputs, and contract compliance.
2. **Tier 2 (Boundary & Corner Cases)**: At least 5 distinct test cases per feature covering edge cases cataloged in `spec_miner_survey_1/handoff.md`.
3. **Tier 3 (Interactions)**: Multi-system integration tests verifying state synchronization across systems.
4. **Tier 4 (Scenarios)**: Complete unmocked sequential simulations from Act I bootstrap to epilogue victory credits.

# Original User Request

## 2026-10-18T12:32:14Z

Recreate the complete 15-quest narrative campaign "CyberShield: Code of Legacy" (Киберщит: Код наследия) for Project Sentinel based on `Документ.pdf`. The implementation encompasses the full storyline across 4 acts, all locations in isometric diorama pixel-art style, non-lethal gadget mechanics (Impulse Debugger robot disassembly), interactive puzzles, and all required 3D GLB assets generated and exported via Blender MCP.

Working directory: /Users/kirill/Documents/Projects/Project-Sentinel
Git branch: feature/cybershield-campaign
Integrity mode: development

Reference material: `/Users/kirill/Documents/Projects/Project-Sentinel/Документ.pdf` (Acts I–IV, 15 quests, character descriptors, dialogues, environment visual references).

## Requirements

### R1. Complete 15-Quest Narrative Campaign Engine
Implement the complete narrative progression through all 15 quests and 4 acts:
- **Act I (Quests 1–4):** Perimeter & Infiltration (Gate energy barrier, Dean's office code lock, first blocker robot disassembly, dark laboratory corridor).
- **Act II (Quests 5–8):** Investigation & Key Search (Security terminal playback, robo-dog chase into winter garden greenhouse, key retrieval, lab power switchboard repair).
- **Act III (Quests 9–12):** Climax & Server Room (Subterranean cable collector, false access point jammer disable at main entrance, grand lobby entry, datacenter access).
- **Act IV (Quests 13–15):** Finales & Resolution (Recovery protocol selection in Quest 13 with branching endings: Final A — Ideal / Campus celebration; Final B — Pragmatic / Volunteer cleanup).
Support dialogue display with speaker identity (Alexey, Curator radio, Professor, System console) and persistent quest status tracking.

### R2. 3D GLB Asset & Animation Creation via Blender MCP
Generate, rig, animate, and export all required characters, robots, and key props into `/public/assets/models/` as `.glb` assets compatible with the Three.js pixel-art pipeline:
- **Characters:** Hero Alexey (teal jacket, orange backpack; idle, walk), Professor (lab coat; idle, talk).
- **Robots & Entities:** Patrol Droid (scanning cone; scan, move), Courier Blocker Bot (modular separation animation; idle, disassemble), Quadruped Robo-Dog (holding keys; idle, run, drop_keys), Flying Recon Drone (hover, patrol).
- **Interactive Props & Sets:** Impulse Debugger gadget, Security terminals, Power switchboard with fuse slot, Jammer antenna mast, Server racks and holographic console.

### R3. Isometric Diorama Environments & Atmosphere
Construct the isometric scenes and zones matching the visual direction in `Документ.pdf` (Page 9 thumbnails):
- Campus gate & exterior perimeter (evening twilight, blue forcefield barrier, street lamps).
- Dean's office basement (wood desks, document shelves, glowing computer terminal).
- Central courtyard & walkways (paving tiles, benches, decorative flowerbeds).
- Laboratory corridor (emergency amber-red lighting, electrical panel).
- Security room (dim monitors with cold blue glow).
- Glass greenhouse / Winter garden (tropical plants, sunset lighting).
- Underground cable collector tunnel (brick walls, conduit pipes, cyan glowing cables).
- Grand lobby & staircase (polished marble, entrance columns).
- Archival Datacenter / Main server room (rows of black server racks with amber/blue LEDs, holographic console).

### R4. Interaction Mechanics & Puzzles
- **Impulse Debugger:** Targeting and pulse emission that cleanly deactivates infected robots into collectible mechanical modules (wheels, casing, camera, battery) without violence or explosions.
- **Passcode Keypad:** Terminal input validating faculty founding year clue.
- **Power Switchboard Repair:** Three-step restoration sequence (line isolation, fuse replacement, master grid reboot) that triggers lighting transitions.
- **CCTV Playback:** Video terminal viewing revealing the robo-dog path.
- **Signal Jammer Disruption:** High-power electromagnetic pulse disabling the rogue transmitter.
- **Ending Branching:** Final console selection determining campaign outcome and corresponding epilogue scene.

### R5. Controlled Infrastructure & Tooling
Use the existing `blender-mcp` integration (`execute_code` with Python `bpy`) to procedurally model, color/texture, rig, and export models directly to `/public/assets/models/<asset_name>.glb`.

## Acceptance Criteria

### Narrative & Quest Progression
- [ ] All 15 quests can be played and completed in sequence with zero blocking errors.
- [ ] The terminal choice in Quest 13 reliably branches into Final A (Quest 14) or Final B (Quest 15).
- [ ] Campaign state (current act, active quest, completed flags, collected inventory items) serializes and deserializes accurately via `storage.ts`.

### 3D Models & Visual Presentation
- [ ] Every required entity (.glb) is present in `public/assets/models/` with valid geometries, materials, and animations.
- [ ] Models render in ThreeRenderer with correct isometric orientation (8-directional facing), stepped animation frame rates (4-10 fps), and pixel-art material shaders.
- [ ] Scene lighting dynamically responds to story events (e.g. darkness in Lab corridor switching to warm lighting upon switchboard repair; gate barrier deactivation).

### Mechanics & Systems
- [ ] Impulse debugger disassembles blocker bots and drops inventory items into player inventory.
- [ ] Security terminal puzzle correctly accepts and rejects passcode inputs based on quest clues.
- [ ] Switchboard puzzle requires necessary components (wires, fuses) and verifies repair sequence.

### Code Quality & Automated Tests
- [ ] Comprehensive unit and system tests cover the quest engine, puzzles, inventory interactions, and save/load state.
- [ ] `npm test` passes 100% of test suites with zero failures.
- [ ] `npm run typecheck` passes with zero TypeScript errors under strict mode.
- [ ] All code and documentation adhere to English naming and AGENTS.md standards.

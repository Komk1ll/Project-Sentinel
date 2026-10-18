/**
 * Campaign Reference Engine (Test Oracle)
 * Authoritative behavioral implementation directly derived from:
 * - Документ.pdf (15 quests, verbatim dialogues, 4-step disassembly, 3-step switchboard)
 * - PROJECT.md (Interface Contracts & Specifications)
 * - spec_miner_survey_1/handoff.md
 */

import type { QuestRecord } from '@/types';
import type {
  IQuestEngine,
  IDialogueEngine,
  IKeypadPuzzle,
  ISwitchboardPuzzle,
  IDebuggerSystem,
  ICCTVSystem,
  IJammerSystem,
  IDioramaManager,
  QuestState,
  DialogueNode,
  DioramaZoneId,
  LightingState,
  CyberShieldWorldFlags,
} from './contracts';

export const CYBERSHIELD_QUEST_DEFS: QuestRecord[] = [
  {
    id: 'quest_01_gate_barrier',
    title: 'Digital Barrier of the Main Gates',
    prerequisites: [],
    objectives: [
      { id: 'obj_01_radio_curator', description: 'Receive radio instructions from Curator', completed: false },
      { id: 'obj_02_evade_patrol', description: 'Evade Patrol Droid scanning cone', completed: false },
      { id: 'obj_03_reach_basement', description: 'Reach Dean office basement service entrance', completed: false },
    ],
    rewards: [],
    completionFlag: 'FLAG_GATE_BYPASSED',
  },
  {
    id: 'quest_02_deans_password',
    title: "Forgotten Password of the Dean's Office",
    prerequisites: ['quest_01_gate_barrier'],
    objectives: [
      { id: 'obj_01_read_monitor_hint', description: 'Read faculty founding year clue on lab monitor', completed: false },
      { id: 'obj_02_enter_keypad_code', description: 'Enter code 1984 on electronic door keypad', completed: false },
      { id: 'obj_03_acquire_debugger', description: 'Pick up Impulse Debugger from worktable', completed: false },
    ],
    rewards: [{ itemId: 'item_impulse_debugger', count: 1 }],
    completionFlag: 'FLAG_DEANS_DOOR_UNLOCKED',
  },
  {
    id: 'quest_03_blocker_disassembly',
    title: 'First Encounter: Blocker Disassembly',
    prerequisites: ['quest_02_deans_password'],
    objectives: [
      { id: 'obj_01_aim_debugger', description: 'Aim Impulse Debugger at Courier Blocker Bot', completed: false },
      { id: 'obj_02_disassemble_bot', description: 'Discharge non-lethal pulse to disassemble bot', completed: false },
      { id: 'obj_03_collect_modules', description: 'Gather disassembled robot modules into backpack', completed: false },
    ],
    rewards: [
      { itemId: 'item_module_wheels', count: 4 },
      { itemId: 'item_module_casing', count: 1 },
      { itemId: 'item_module_camera', count: 1 },
      { itemId: 'item_module_battery', count: 1 },
    ],
    completionFlag: 'FLAG_FIRST_BLOCKER_DISASSEMBLED',
  },
  {
    id: 'quest_04_lab_darkness',
    title: 'Darkness in the Laboratory Wing',
    prerequisites: ['quest_03_blocker_disassembly'],
    objectives: [
      { id: 'obj_01_enter_corridor', description: 'Navigate dark corridor under emergency lighting', completed: false },
      { id: 'obj_02_contact_professor', description: 'Speak with trapped Professor through classroom door', completed: false },
      { id: 'obj_03_inspect_switchboard', description: 'Inspect damaged electrical distribution panel', completed: false },
    ],
    rewards: [],
    completionFlag: 'FLAG_PROFESSOR_CONTACTED',
  },
  {
    id: 'quest_05_server_deadend',
    title: 'Dead End at the Server Room & Security Post',
    prerequisites: ['quest_04_lab_darkness'],
    objectives: [
      { id: 'obj_01_inspect_server_door', description: 'Attempt digital access to server vault door', completed: false },
      { id: 'obj_02_find_mechanical_lock', description: 'Discover requirement for physical master keys', completed: false },
      { id: 'obj_03_inspect_security_post', description: 'Inspect unpowered CCTV monitoring terminal', completed: false },
    ],
    rewards: [],
    completionFlag: 'FLAG_SERVER_DOOR_INSPECTED',
  },
  {
    id: 'quest_06_cctv_clue',
    title: 'Evidence from the Cameras: Robo-Dog Chase',
    prerequisites: ['quest_05_server_deadend'],
    objectives: [
      { id: 'obj_01_power_cctv', description: 'Connect backup battery to security terminal', completed: false },
      { id: 'obj_02_rewind_footage', description: 'Rewind camera footage to incident moment', completed: false },
      { id: 'obj_03_locate_dog_path', description: 'Trace Robo-Dog trajectory to Winter Garden greenhouse', completed: false },
    ],
    rewards: [],
    completionFlag: 'FLAG_CCTV_REVIEWED',
  },
  {
    id: 'quest_07_winter_garden_dog',
    title: 'Winter Garden & Robo-Dog Interception',
    prerequisites: ['quest_06_cctv_clue'],
    objectives: [
      { id: 'obj_01_enter_greenhouse', description: 'Track Robo-Dog through tropical greenhouse plants', completed: false },
      { id: 'obj_02_deactivate_dog', description: 'Discharge calibrated non-lethal pulse at Robo-Dog', completed: false },
      { id: 'obj_03_retrieve_keys', description: 'Pick up dropped brass server room key ring', completed: false },
    ],
    rewards: [
      { itemId: 'item_server_keyring', count: 1 },
      { itemId: 'item_dog_modules', count: 1 },
    ],
    completionFlag: 'FLAG_KEYS_RECOVERED',
  },
  {
    id: 'quest_08_lab_power_restore',
    title: 'Restoring Power to the Laboratory',
    prerequisites: ['quest_07_winter_garden_dog'],
    objectives: [
      { id: 'obj_01_isolate_phase', description: 'Isolate breached power line Phase B', completed: false },
      { id: 'obj_02_replace_fuse', description: 'Slot replacement fuse cartridge into switchboard', completed: false },
      { id: 'obj_03_reboot_master_grid', description: 'Throw master circuit breaker to restore wing power', completed: false },
    ],
    rewards: [],
    completionFlag: 'FLAG_POWER_RESTORED',
  },
  {
    id: 'quest_09_subway_tunnel',
    title: 'Service Tunnel Under the Courtyard',
    prerequisites: ['quest_08_lab_power_restore'],
    objectives: [
      { id: 'obj_01_evade_aerial_drones', description: 'Avoid open courtyard swarming with Recon Drones', completed: false },
      { id: 'obj_02_descend_manhole', description: 'Open maintenance hatch into subterranean cable collector', completed: false },
      { id: 'obj_03_traverse_tunnel', description: 'Traverse cable tunnel to main building exit ladder', completed: false },
    ],
    rewards: [],
    completionFlag: 'FLAG_TUNNEL_TRAVERSED',
  },
  {
    id: 'quest_10_rogue_access_point',
    title: 'Rogue Access Point at the Main Entrance',
    prerequisites: ['quest_09_subway_tunnel'],
    objectives: [
      { id: 'obj_01_surface_stairs', description: 'Climb out onto grand entrance staircase', completed: false },
      { id: 'obj_02_identify_jammer', description: 'Locate rogue tripod antenna mast beside van', completed: false },
      { id: 'obj_03_disable_jammer', description: 'Discharge amplified EMP pulse to disable rogue mast', completed: false },
    ],
    rewards: [],
    completionFlag: 'FLAG_JAMMER_DISABLED',
  },
  {
    id: 'quest_11_grand_doors_open',
    title: 'Opening of the Grand Entrance Doors',
    prerequisites: ['quest_10_rogue_access_point'],
    objectives: [
      { id: 'obj_01_doors_unlocked', description: 'Witness main lobby double glass doors unlock', completed: false },
      { id: 'obj_02_enter_marble_lobby', description: 'Cross entrance threshold into grand marble lobby', completed: false },
      { id: 'obj_03_descend_elevator', description: 'Call service elevator down to subterranean Datacenter', completed: false },
    ],
    rewards: [],
    completionFlag: 'FLAG_LOBBY_ENTERED',
  },
  {
    id: 'quest_12_datacenter_heart',
    title: "Heart of the 'Legacy Code' / Main Server Room",
    prerequisites: ['quest_11_grand_doors_open'],
    objectives: [
      { id: 'obj_01_reach_vault_door', description: 'Approach heavy hermetic server room vault door', completed: false },
      { id: 'obj_02_use_brass_keys', description: 'Insert and turn physical master brass key ring', completed: false },
      { id: 'obj_03_rendezvous_professor', description: 'Meet Professor at central holographic command plinth', completed: false },
    ],
    rewards: [],
    completionFlag: 'FLAG_DATACENTER_ACCESSED',
  },
  {
    id: 'quest_13_protocol_init',
    title: 'Initialization of the Recovery Protocol',
    prerequisites: ['quest_12_datacenter_heart'],
    objectives: [
      { id: 'obj_01_boot_holo_console', description: 'Boot master holographic command terminal', completed: false },
      { id: 'obj_02_stabilize_memory', description: 'Isolate campus virus segments with clean energy cell', completed: false },
      { id: 'obj_03_select_vector', description: 'Select deployment vector: Option A, B, or C', completed: false },
    ],
    rewards: [],
    completionFlag: 'FLAG_PROTOCOL_INITIALIZED',
  },
  {
    id: 'quest_14_final_a_celebration',
    title: 'Celebration in the Courtyard (Final A — Ideal)',
    prerequisites: ['quest_13_protocol_init'],
    objectives: [
      { id: 'obj_01_enter_sunlit_plaza', description: 'Enter celebratory sunlit courtyard with banner', completed: false },
      { id: 'obj_02_observe_docile_bots', description: 'Observe repaired bots peacefully assisting students', completed: false },
      { id: 'obj_03_handshake_professor', description: 'Shake hands with Professor beside fountain', completed: false },
    ],
    rewards: [],
    completionFlag: 'FLAG_CAMPAIGN_COMPLETE_ENDING_A',
  },
  {
    id: 'quest_15_final_b_cleanup',
    title: 'Cleanup and Restoration (Final B — Pragmatic)',
    prerequisites: ['quest_13_protocol_init'],
    objectives: [
      { id: 'obj_01_enter_twilight_plaza', description: 'Enter quiet twilight courtyard with volunteers', completed: false },
      { id: 'obj_02_load_parts_trolley', description: 'Help load modular robot parts onto service trolley', completed: false },
      { id: 'obj_03_curator_commendation', description: 'Receive concluding radio transmission from Curator', completed: false },
    ],
    rewards: [],
    completionFlag: 'FLAG_CAMPAIGN_COMPLETE_ENDING_B',
  },
];

export class ReferenceQuestEngine implements IQuestEngine {
  private quests: Map<string, QuestRecord> = new Map();
  private state: Record<string, QuestState> = {};
  private activeQuestId: string | null = null;
  public worldFlags: CyberShieldWorldFlags;

  constructor(worldFlags?: CyberShieldWorldFlags) {
    this.worldFlags = worldFlags || {
      FLAG_GATE_BYPASSED: false,
      FLAG_DEANS_DOOR_UNLOCKED: false,
      FLAG_FIRST_BLOCKER_DISASSEMBLED: false,
      FLAG_PROFESSOR_CONTACTED: false,
      FLAG_SERVER_DOOR_INSPECTED: false,
      FLAG_CCTV_REVIEWED: false,
      FLAG_KEYS_RECOVERED: false,
      FLAG_POWER_RESTORED: false,
      FLAG_TUNNEL_TRAVERSED: false,
      FLAG_JAMMER_DISABLED: false,
      FLAG_LOBBY_ENTERED: false,
      FLAG_DATACENTER_ACCESSED: false,
      FLAG_PROTOCOL_INITIALIZED: false,
    };

    for (const q of CYBERSHIELD_QUEST_DEFS) {
      this.quests.set(q.id, {
        ...q,
        objectives: q.objectives.map((o) => ({ ...o })),
      });
      this.state[q.id] = {
        id: q.id,
        status: q.prerequisites.length === 0 ? 'available' : 'locked',
        currentObjectiveIndex: 0,
        completedObjectives: [],
      };
    }

    // Auto-start Quest 1
    this.startQuest('quest_01_gate_barrier');
  }

  public getActiveQuest(): QuestRecord | null {
    if (!this.activeQuestId) return null;
    return this.quests.get(this.activeQuestId) || null;
  }

  public startQuest(questId: string): boolean {
    const record = this.quests.get(questId);
    const qState = this.state[questId];
    if (!record || !qState || qState.status === 'locked') return false;

    // Verify prerequisites
    for (const prereq of record.prerequisites) {
      const pState = this.state[prereq];
      if (!pState || pState.status !== 'completed') {
        return false;
      }
    }

    this.state[questId] = {
      id: questId,
      status: 'active',
      currentObjectiveIndex: 0,
      completedObjectives: [],
    };
    this.activeQuestId = questId;
    return true;
  }

  public forceCompleteQuest(questId: string): void {
    const qRecord = this.quests.get(questId);
    if (qRecord) {
      this.state[questId] = {
        id: questId,
        status: 'completed',
        currentObjectiveIndex: qRecord.objectives.length,
        completedObjectives: qRecord.objectives.map((o) => o.id),
      };
      this.worldFlags[qRecord.completionFlag] = true;
      for (const [id, rec] of this.quests.entries()) {
        const s = this.state[id];
        if (s && s.status === 'locked') {
          const allMet = rec.prerequisites.every((p) => this.state[p]?.status === 'completed');
          if (allMet) {
            if (id !== 'quest_14_final_a_celebration' && id !== 'quest_15_final_b_cleanup') {
              s.status = 'available';
            }
          }
        }
      }
      if (this.activeQuestId === questId) {
        this.activeQuestId = null;
      }
    }
  }

  public completeObjective(questId: string, objectiveId: string): boolean {
    const qState = this.state[questId];
    const qRecord = this.quests.get(questId);
    if (!qState || !qRecord || qState.status !== 'active') return false;

    const currentObj = qRecord.objectives[qState.currentObjectiveIndex];
    if (!currentObj || currentObj.id !== objectiveId) return false;

    qState.completedObjectives.push(objectiveId);
    qState.currentObjectiveIndex++;

    if (qState.currentObjectiveIndex >= qRecord.objectives.length) {
      this.completeQuest(questId);
    }
    return true;
  }

  public completeQuest(questId: string): boolean {
    const qState = this.state[questId];
    const qRecord = this.quests.get(questId);
    if (!qState || !qRecord || qState.status !== 'active') return false;

    qState.status = 'completed';
    this.worldFlags[qRecord.completionFlag] = true;

    // Check unlocks
    for (const [id, rec] of this.quests.entries()) {
      const s = this.state[id];
      if (s && s.status === 'locked') {
        const allMet = rec.prerequisites.every((p) => this.state[p]?.status === 'completed');
        if (allMet) {
          // If Quest 13 completed, do NOT unlock both Quest 14 & 15 automatically; branching handles it
          if (id !== 'quest_14_final_a_celebration' && id !== 'quest_15_final_b_cleanup') {
            s.status = 'available';
          }
        }
      }
    }

    if (this.activeQuestId === questId) {
      this.activeQuestId = null;
    }
    return true;
  }

  public isQuestCompleted(questId: string): boolean {
    return this.state[questId]?.status === 'completed';
  }

  public selectEnding(choice: 'A' | 'B' | 'C'): 'quest_14_finale_ideal' | 'quest_15_finale_pragmatic' {
    if (!this.isQuestCompleted('quest_13_protocol_init')) {
      throw new Error('Cannot select ending before Quest 13 is completed');
    }

    if (choice === 'A') {
      this.worldFlags.CAMPAIGN_ENDING = 'FINAL_A';
      const q14 = this.state['quest_14_final_a_celebration'];
      if (q14) q14.status = 'available';
      this.startQuest('quest_14_final_a_celebration');
      return 'quest_14_finale_ideal';
    } else if (choice === 'B' || choice === 'C') {
      this.worldFlags.CAMPAIGN_ENDING = 'FINAL_B';
      const q15 = this.state['quest_15_final_b_cleanup'];
      if (q15) q15.status = 'available';
      this.startQuest('quest_15_final_b_cleanup');
      return 'quest_15_finale_pragmatic';
    } else {
      throw new Error(`Invalid ending choice: ${choice}`);
    }
  }

  public getState(): Record<string, QuestState> {
    return JSON.parse(JSON.stringify(this.state));
  }

  public loadState(state: Record<string, QuestState>): void {
    this.state = JSON.parse(JSON.stringify(state));
    this.activeQuestId = null;
    for (const [id, s] of Object.entries(this.state)) {
      if (s.status === 'active') {
        this.activeQuestId = id;
      }
    }
    // Recompute available vs locked for pending quests
    for (const [id, rec] of this.quests.entries()) {
      const s = this.state[id];
      if (s && s.status !== 'completed' && s.status !== 'active') {
        const allMet = rec.prerequisites.every((p) => this.state[p]?.status === 'completed');
        s.status = allMet ? 'available' : 'locked';
      }
    }
  }
}

export class ReferenceKeypadPuzzle implements IKeypadPuzzle {
  private buffer: string = '';
  private unlocked: boolean = false;
  private readonly targetCode: string = '1984';

  public inputDigit(digit: number): { buffer: string; success?: boolean; error?: boolean } {
    if (this.unlocked) {
      return { buffer: this.buffer, success: true };
    }
    if (digit < 0 || digit > 9 || !Number.isInteger(digit)) {
      return { buffer: this.buffer, error: true };
    }
    if (this.buffer.length >= 4) {
      return { buffer: this.buffer, error: true };
    }

    this.buffer += digit.toString();

    if (this.buffer.length === 4) {
      if (this.buffer === this.targetCode) {
        this.unlocked = true;
        return { buffer: this.buffer, success: true };
      } else {
        const wrongBuffer = this.buffer;
        this.buffer = ''; // Auto-reset buffer on error
        return { buffer: wrongBuffer, error: true };
      }
    }

    return { buffer: this.buffer };
  }

  public clear(): void {
    this.buffer = '';
  }

  public isUnlocked(): boolean {
    return this.unlocked;
  }
}

export class ReferenceSwitchboardPuzzle implements ISwitchboardPuzzle {
  private lineIsolated: boolean = false;
  private fuseInserted: boolean = false;
  private gridRebooted: boolean = false;
  private inventoryChecker: (itemId: string) => boolean;

  constructor(inventoryChecker?: (itemId: string) => boolean) {
    this.inventoryChecker = inventoryChecker || (() => true);
  }

  public isolateLine(): { success: boolean; message: string } {
    this.lineIsolated = true;
    return { success: true, message: 'Line Phase B successfully isolated.' };
  }

  public insertFuse(fuseItemId: string): { success: boolean; message: string } {
    if (!this.lineIsolated) {
      return {
        success: false,
        message: 'Danger! Line under residual voltage — isolate circuit first!',
      };
    }
    if (!this.inventoryChecker(fuseItemId)) {
      return {
        success: false,
        message: 'Required component missing from inventory.',
      };
    }
    this.fuseInserted = true;
    return { success: true, message: 'Replacement fuse cartridge inserted.' };
  }

  public rebootGrid(): { success: boolean; powerRestored: boolean; message: string } {
    if (!this.lineIsolated || !this.fuseInserted) {
      this.gridRebooted = false;
      return {
        success: false,
        powerRestored: false,
        message: 'Circuit breaker tripped! Ensure line is isolated and fuse is installed.',
      };
    }
    this.gridRebooted = true;
    return {
      success: true,
      powerRestored: true,
      message: 'Grid rebooted! Wing power fully restored.',
    };
  }

  public getState() {
    return {
      lineIsolated: this.lineIsolated,
      fuseInserted: this.fuseInserted,
      gridRebooted: this.gridRebooted,
      isComplete: this.lineIsolated && this.fuseInserted && this.gridRebooted,
    };
  }
}

export class ReferenceDebuggerSystem implements IDebuggerSystem {
  private aimedTargetId: string | null = null;
  private targets: Map<string, { type: 'robot' | 'npc' | 'prop'; inRange: boolean; deactivated?: boolean }> = new Map();

  constructor() {
    this.targets.set('blocker_bot_01', { type: 'robot', inRange: true });
    this.targets.set('robo_dog_01', { type: 'robot', inRange: true });
    this.targets.set('professor_npc', { type: 'npc', inRange: true });
    this.targets.set('jammer_antenna_01', { type: 'prop', inRange: true });
  }

  public registerTarget(id: string, type: 'robot' | 'npc' | 'prop', inRange: boolean = true) {
    this.targets.set(id, { type, inRange });
  }

  public aimAt(targetEntityId: string): boolean {
    const target = this.targets.get(targetEntityId);
    if (!target || !target.inRange) {
      this.aimedTargetId = null;
      return false;
    }
    this.aimedTargetId = targetEntityId;
    return true;
  }

  public firePulse(): { hit: boolean; targetId?: string; disassembledModules?: string[]; error?: string } {
    if (!this.aimedTargetId) {
      return { hit: false, error: 'Pulse dissipated into open space' };
    }

    const target = this.targets.get(this.aimedTargetId);
    if (!target) {
      return { hit: false, error: 'Target not found' };
    }

    if (target.type === 'npc') {
      return { hit: false, error: 'Target is not an infected device' };
    }

    if (target.deactivated) {
      return { hit: false, error: 'Target is already deactivated' };
    }

    target.deactivated = true;
    const targetId = this.aimedTargetId;
    this.aimedTargetId = null;

    if (targetId === 'blocker_bot_01') {
      return {
        hit: true,
        targetId,
        disassembledModules: [
          'item_module_wheels',
          'item_module_casing',
          'item_module_camera',
          'item_module_battery',
        ],
      };
    } else if (targetId === 'robo_dog_01') {
      return {
        hit: true,
        targetId,
        disassembledModules: ['item_server_keyring', 'item_dog_modules'],
      };
    }

    return { hit: true, targetId, disassembledModules: ['item_generic_module'] };
  }
}

export class ReferenceCCTVSystem implements ICCTVSystem {
  private powered: boolean = false;
  private completed: boolean = false;

  public powerTerminal(batteryConnected: boolean): boolean {
    this.powered = batteryConnected;
    return this.powered;
  }

  public rewind(minutes: number): { success: boolean; footageId?: string; clueLocation?: string; error?: string } {
    if (!this.powered) {
      return {
        success: false,
        error: 'Terminal unpowered. Wing power or backup battery required.',
      };
    }
    if (minutes < 10) {
      return { success: false, error: 'Incident occurred 15 minutes ago. Rewind further.' };
    }
    this.completed = true;
    return {
      success: true,
      footageId: 'cctv_archive_dog_heist',
      clueLocation: 'zone_06_winter_garden',
    };
  }

  public isPowered(): boolean {
    return this.powered;
  }

  public isComplete(): boolean {
    return this.completed;
  }
}

export class ReferenceJammerSystem implements IJammerSystem {
  private disabled: boolean = false;

  public approach(distance: number): { status: 'safe' | 'hud_distortion' | 'barrier_repulsion'; message?: string } {
    if (this.disabled) {
      return { status: 'safe', message: 'Antenna disabled. Path clear.' };
    }
    if (distance <= 3) {
      return { status: 'barrier_repulsion', message: 'Electromagnetic repulsion pushes you back.' };
    }
    if (distance <= 6) {
      return { status: 'hud_distortion', message: 'Warning: Strong electromagnetic interference.' };
    }
    return { status: 'safe' };
  }

  public disableWithPulse(equippedToolId: string, chargeTimeMs: number): { success: boolean; doorsUnlocked: boolean; error?: string } {
    if (this.disabled) {
      return { success: true, doorsUnlocked: true, error: 'Jammer is already disabled' };
    }
    if (equippedToolId !== 'item_impulse_debugger') {
      return { success: false, doorsUnlocked: false, error: 'Impulse Debugger required' };
    }
    if (chargeTimeMs < 1000) {
      return { success: false, doorsUnlocked: false, error: 'Insufficient charge time' };
    }

    this.disabled = true;
    return { success: true, doorsUnlocked: true };
  }

  public isDisabled(): boolean {
    return this.disabled;
  }
}

export class ReferenceDialogueEngine implements IDialogueEngine {
  private activeNode: DialogueNode | null = null;
  private onCompleteCallback?: () => void;
  private dialogues: Map<string, DialogueNode[]> = new Map();

  constructor() {
    this.dialogues.set('curator_radio_q1', [
      {
        id: 'node_1',
        speaker: 'curator',
        textRu: 'Алексей, главный вход под жёсткой сетевой блокировкой. Системы охраны сошли с ума.',
        textEn: 'Alexey, the main entrance is under hard network lockdown. The security systems have gone mad.',
        next: 'node_2',
      },
      {
        id: 'node_2',
        speaker: 'alexey',
        textRu: 'Понял, ухожу с линии обзора патрульных дронов, ищу обход.',
        textEn: 'Understood, breaking line of sight with patrol drones, searching for a bypass.',
      },
    ]);

    this.dialogues.set('professor_q4', [
      {
        id: 'node_prof_1',
        speaker: 'professor',
        textRu: 'Слава богу, кто-то живой! Почини главный щиток в коридоре.',
        textEn: 'Thank God, someone alive! Repair the main switchboard in the corridor.',
        next: 'node_prof_2',
      },
      {
        id: 'node_prof_2',
        speaker: 'alexey',
        textRu: 'Держитесь, профессор, я как раз собрал нужные детали для починки цепи.',
        textEn: 'Hold on, Professor, I just collected the necessary parts to fix the circuit.',
      },
    ]);

    this.dialogues.set('console_protocol_q13', [
      {
        id: 'node_console_select',
        speaker: 'console',
        textRu: 'Инициализация завершена. Выберите финальный вектор развёртывания сети кампуса.',
        textEn: 'Initialization complete. Select the final deployment vector for the campus network.',
        options: [
          { labelRu: 'Полная перепрошивка (А)', labelEn: 'Full Reflash (A)', nextNodeId: 'node_ending_a' },
          { labelRu: 'Аварийный сброс (Б)', labelEn: 'Emergency Reset (B)', nextNodeId: 'node_ending_b' },
          { labelRu: 'Автономный карантин (В)', labelEn: 'Autonomous Quarantine (C)', nextNodeId: 'node_ending_b' },
        ],
      },
      {
        id: 'node_ending_a',
        speaker: 'system',
        textRu: 'Протокол А запущен. Режим восстановления активен.',
        textEn: 'Protocol A engaged. Reflash active.',
      },
      {
        id: 'node_ending_b',
        speaker: 'system',
        textRu: 'Протокол Б запущен. Аварийный карантин активен.',
        textEn: 'Protocol B engaged. Emergency quarantine active.',
      },
    ]);
  }

  public registerDialogueTree(id: string, nodes: DialogueNode[]) {
    this.dialogues.set(id, nodes);
  }

  public startDialogue(dialogueTreeId: string, onComplete?: () => void): void {
    const nodes = this.dialogues.get(dialogueTreeId);
    if (!nodes || nodes.length === 0) {
      throw new Error(`Dialogue tree ${dialogueTreeId} not found`);
    }
    this.activeNode = nodes[0] ?? null;
    this.onCompleteCallback = onComplete;
  }

  public advance(): DialogueNode | null {
    if (!this.activeNode) return null;
    if (this.activeNode.options && this.activeNode.options.length > 0) {
      return this.activeNode; // Cannot advance while options pending
    }
    if (!this.activeNode.next) {
      this.activeNode = null;
      if (this.onCompleteCallback) this.onCompleteCallback();
      return null;
    }
    const currentId = this.activeNode.next;
    // Search across registered dialogues
    for (const nodes of this.dialogues.values()) {
      const match = nodes.find((n) => n.id === currentId);
      if (match) {
        this.activeNode = match;
        return this.activeNode;
      }
    }
    this.activeNode = null;
    if (this.onCompleteCallback) this.onCompleteCallback();
    return null;
  }

  public selectOption(optionIndex: number): DialogueNode | null {
    if (!this.activeNode || !this.activeNode.options) return null;
    const option = this.activeNode.options[optionIndex];
    if (!option) return null;

    if (option.onSelect) option.onSelect();

    for (const nodes of this.dialogues.values()) {
      const match = nodes.find((n) => n.id === option.nextNodeId);
      if (match) {
        this.activeNode = match;
        return this.activeNode;
      }
    }
    this.activeNode = null;
    if (this.onCompleteCallback) this.onCompleteCallback();
    return null;
  }

  public getCurrentNode(): DialogueNode | null {
    return this.activeNode;
  }

  public isActive(): boolean {
    return this.activeNode !== null;
  }
}

export class ReferenceDioramaManager implements IDioramaManager {
  private activeZone: DioramaZoneId = 'zone_01_gate';
  private lightingState: LightingState = 'twilight';

  public async loadZone(zoneId: DioramaZoneId): Promise<void> {
    this.activeZone = zoneId;
    if (zoneId === 'zone_04_lab_corridor') {
      this.lightingState = 'dark_emergency';
    } else if (zoneId === 'zone_10_finale_celebration') {
      this.lightingState = 'sunny_day';
    } else if (zoneId === 'zone_11_finale_cleanup') {
      this.lightingState = 'twilight';
    }
  }

  public getActiveZone(): DioramaZoneId {
    return this.activeZone;
  }

  public setLightingState(state: LightingState): void {
    this.lightingState = state;
  }

  public getLightingState(): LightingState {
    return this.lightingState;
  }
}

import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { DioramaScene } from '../scenes/DioramaScene';
import { DistrictScene } from '../scenes/DistrictScene';
import { ThreeRenderer } from '../render/ThreeRenderer';
import { QuestSystem } from '../systems/QuestSystem';
import { DialogueSystem } from '../systems/DialogueSystem';
import { DioramaManager } from '../systems/DioramaManager';
import { QuestHUD } from '../../ui/QuestHUD';
import { DialogueOverlay } from '../../ui/DialogueOverlay';
import { HoloConsoleUI } from '../../ui/HoloConsoleUI';
import type { DioramaZoneId, ZoneDescriptor } from '../../types/campaign';

export interface GameEngineConfig {
  gameContainerId: string;
  threeContainerId: string;
}

export class GameEngine {
  public phaserGame!: Phaser.Game;
  public threeRenderer!: ThreeRenderer;
  public questSystem!: QuestSystem;
  public dialogueSystem!: DialogueSystem;
  public dioramaManager!: DioramaManager;
  public questHUD?: QuestHUD;
  public dialogueOverlay?: DialogueOverlay;
  public holoConsoleUI?: HoloConsoleUI;
  private animationFrameId: number | null = null;

  constructor(private config: GameEngineConfig) {}

  public init(): void {
    // 1. Initialize Three.js (WebGL / OpenGL 3D renderer)
    this.threeRenderer = new ThreeRenderer({
      containerId: this.config.threeContainerId,
    });

    // 2. Initialize Core Campaign Subsystems
    this.questSystem = new QuestSystem();
    this.dialogueSystem = new DialogueSystem();
    this.dioramaManager = new DioramaManager({
      threeRenderer: this.threeRenderer,
      initialZone: 'zone_01_gate',
    });

    // 3. Initialize Campaign UI Overlays
    if (typeof document !== 'undefined') {
      this.questHUD = new QuestHUD(this.questSystem, {
        containerId: 'quest-tracker',
        language: 'ru',
      });
      this.dialogueOverlay = new DialogueOverlay(this.dialogueSystem, {
        containerId: 'dialogue-box',
      });
      this.holoConsoleUI = new HoloConsoleUI({
        containerId: 'holo-console',
        language: 'ru',
      });
    }

    // 4. Initialize Phaser 3 (HTML5 Canvas input & event bridge)
    const phaserConfig: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: this.config.gameContainerId,
      width: window.innerWidth,
      height: window.innerHeight,
      transparent: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [BootScene, DioramaScene, DistrictScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: true,
      },
    };

    this.phaserGame = new Phaser.Game(phaserConfig);
    this.phaserGame.registry.set('threeRenderer', this.threeRenderer);
    this.phaserGame.registry.set('dioramaManager', this.dioramaManager);
    this.phaserGame.registry.set('questSystem', this.questSystem);
    this.phaserGame.registry.set('dialogueSystem', this.dialogueSystem);

    // 5. Connect Campaign Narrative Events & Zone Progression
    this.bindCampaignEvents();

    // 6. Start render loop for 3D overlay
    this.startLoop();

    // 7. Auto-activate Quest 1 and opening Curator radio transmission
    this.startCampaign();
  }

  private startCampaign(): void {
    try {
      this.questSystem.startQuest('quest_01_gate_barrier');
      // Trigger opening emergency radio transmission from Curator
      setTimeout(() => {
        try {
          this.dialogueSystem.startDialogue('tree_quest_01_radio');
        } catch {
          // ignore in headless test
        }
      }, 500);
    } catch (err) {
      console.warn('[GameEngine] startCampaign error:', err);
    }
  }

  private bindCampaignEvents(): void {
    // When dialogue finishes, advance associated quest objectives
    this.dialogueSystem.onStateChange((snapshot) => {
      if (!snapshot.active && snapshot.treeId === 'tree_quest_01_radio') {
        try {
          this.questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
        } catch {
          // ignore
        }
      }
    });

    // When zone changes in DioramaManager, advance quests and trigger dialogues
    this.dioramaManager.onZoneChange((zoneId: DioramaZoneId, _desc: ZoneDescriptor) => {
      if (zoneId === 'zone_02_deans_basement') {
        try {
          this.questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_reach_basement');
          this.questSystem.completeQuest('quest_01_gate_barrier');
          this.questSystem.startQuest('quest_02_deans_password');
          this.dialogueSystem.startDialogue('tree_quest_02_terminal');
        } catch {
          // ignore
        }
      } else if (zoneId === 'zone_03_courtyard_alley') {
        try {
          this.questSystem.startQuest('quest_03_first_clash');
          this.dialogueSystem.startDialogue('tree_quest_03_clash');
        } catch {
          // ignore
        }
      } else if (zoneId === 'zone_04_lab_corridor') {
        try {
          this.questSystem.startQuest('quest_04_dark_laboratory');
          this.dialogueSystem.startDialogue('tree_quest_04_dark_lab');
        } catch {
          // ignore
        }
      }
    });
  }

  private startLoop(): void {
    const loop = (): void => {
      this.threeRenderer.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.phaserGame) {
      this.phaserGame.destroy(true);
    }
    if (this.threeRenderer) {
      this.threeRenderer.destroy();
    }
  }
}

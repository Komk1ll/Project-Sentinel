/**
 * Project Sentinel - DioramaManager
 * Core environmental diorama scene and dynamic lighting coordinator.
 * Implements IDioramaManager contract.
 *
 * Fully supports headless Node/Vitest testing and live ThreeRenderer rendering.
 */

import type {
  DioramaSaveState,
  DioramaZoneId,
  IDioramaManager,
  LightingState,
  ZoneDescriptor,
} from '@/types/campaign';
import type { IsometricDirection } from '../../types/models';
import { DynamicLightingController } from '../render/DynamicLightingController';
import type { ThreeRenderer } from '../render/ThreeRenderer';
import type { PixelArtModelInstance } from '../render/PixelArtModelInstance';

export const DIORAMA_ZONE_CATALOG: Record<DioramaZoneId, ZoneDescriptor> = {
  zone_01_gate: {
    id: 'zone_01_gate',
    act: 1,
    panelNumber: 1,
    titleRu: 'Цифровой барьер главных ворот',
    titleEn: 'Perimeter Gate & Forcefield Barrier',
    width: 20,
    height: 20,
    dimensions: { width: 20, height: 20 },
    defaultLighting: 'twilight',
    playerSpawn: { x: 2, y: 3, elevation: 0, facing: 'S', position: { x: 2, y: 3 } },
    walkabilityBounds: { minX: 0, maxX: 19, minY: 0, maxY: 19 },
    blockedTiles: [
      { x: 10, y: 5 }, { x: 10, y: 6 }, { x: 10, y: 7 },
      { x: 10, y: 8 }, { x: 10, y: 9 },
    ],
    entities: [
      {
        id: 'robot_patrol_droid_01',
        modelUrl: './assets/models/patrol_droid.glb',
        type: 'robot',
        position: { x: 10, y: 8 },
        facing: 'W',
        defaultAnimation: 'scan',
        fps: 6,
        stepped: true,
        interactive: true,
        blockedTiles: [{ x: 10, y: 8 }],
      },
      {
        id: 'prop_jammer_antenna_01',
        modelUrl: './assets/models/prop_jammer_antenna.glb',
        type: 'prop',
        position: { x: 10, y: 6 },
        facing: 'S',
        blockedTiles: [{ x: 10, y: 6 }],
      },
    ],
    portals: [
      {
        id: 'portal_to_deans',
        targetZoneId: 'zone_02_deans_basement',
        triggerBounds: { minX: 18, maxX: 19, minY: 2, maxY: 4 },
        targetSpawn: { x: 2, y: 2 },
      },
    ],
    tileTextureKey: 'iso_tile_default',
  },

  zone_02_deans_basement: {
    id: 'zone_02_deans_basement',
    act: 1,
    panelNumber: 2,
    titleRu: 'Забытый пароль Деканата',
    titleEn: "Cybernetics Dean's Office Basement",
    width: 14,
    height: 14,
    dimensions: { width: 14, height: 14 },
    defaultLighting: 'twilight',
    playerSpawn: { x: 2, y: 2, elevation: 0, facing: 'SE', position: { x: 2, y: 2 } },
    walkabilityBounds: { minX: 0, maxX: 13, minY: 0, maxY: 13 },
    blockedTiles: [
      { x: 6, y: 6 }, { x: 4, y: 3 }, { x: 12, y: 7 },
    ],
    entities: [
      {
        id: 'prop_terminal_duty',
        modelUrl: './assets/models/prop_terminal_security.glb',
        type: 'prop',
        position: { x: 6, y: 6 },
        facing: 'S',
        interactive: true,
        interactionId: 'terminal_duty_founding_hint',
        blockedTiles: [{ x: 6, y: 6 }],
      },
      {
        id: 'prop_impulse_debugger',
        modelUrl: './assets/models/prop_impulse_debugger.glb',
        type: 'prop',
        position: { x: 4, y: 3 },
        facing: 'SE',
        interactive: true,
        interactionId: 'pickup_impulse_debugger',
        blockedTiles: [{ x: 4, y: 3 }],
      },
      {
        id: 'prop_keypad_door',
        modelUrl: './assets/models/prop_terminal_security.glb',
        type: 'interactive',
        position: { x: 12, y: 7 },
        facing: 'W',
        interactive: true,
        interactionId: 'keypad_deans_office',
        blockedTiles: [{ x: 12, y: 7 }],
      },
    ],
    portals: [
      {
        id: 'portal_to_courtyard',
        targetZoneId: 'zone_03_courtyard_alley',
        triggerBounds: { minX: 12, maxX: 13, minY: 6, maxY: 8 },
        targetSpawn: { x: 3, y: 8 },
        requiredFlag: 'FLAG_DEANS_DOOR_UNLOCKED',
      },
    ],
    tileTextureKey: 'iso_tile_default',
  },

  zone_03_courtyard_alley: {
    id: 'zone_03_courtyard_alley',
    act: 1,
    panelNumber: 3,
    titleRu: 'Первая стычка: Разлёт блокировщика',
    titleEn: 'Courtyard Pedestrian Alley',
    width: 16,
    height: 16,
    dimensions: { width: 16, height: 16 },
    defaultLighting: 'twilight',
    playerSpawn: { x: 3, y: 8, elevation: 0, facing: 'E', position: { x: 3, y: 8 } },
    walkabilityBounds: { minX: 0, maxX: 15, minY: 0, maxY: 15 },
    blockedTiles: [
      { x: 8, y: 8 },
    ],
    entities: [
      {
        id: 'robot_blocker_bot_01',
        modelUrl: './assets/models/blocker_bot.glb',
        type: 'robot',
        position: { x: 8, y: 8 },
        facing: 'W',
        defaultAnimation: 'idle',
        fps: 2,
        stepped: true,
        interactive: true,
        interactionId: 'blocker_bot_disassembly',
        blockedTiles: [{ x: 8, y: 8 }],
      },
    ],
    portals: [
      {
        id: 'portal_to_lab',
        targetZoneId: 'zone_04_lab_corridor',
        triggerBounds: { minX: 14, maxX: 15, minY: 7, maxY: 9 },
        targetSpawn: { x: 2, y: 5 },
      },
    ],
    tileTextureKey: 'iso_tile_default',
  },

  zone_04_lab_corridor: {
    id: 'zone_04_lab_corridor',
    act: 2,
    panelNumber: 4,
    titleRu: 'Тьма в Лабораторном корпусе',
    titleEn: 'Laboratory Wing Corridor',
    width: 24,
    height: 10,
    dimensions: { width: 24, height: 10 },
    defaultLighting: 'dark_emergency',
    playerSpawn: { x: 2, y: 5, elevation: 0, facing: 'E', position: { x: 2, y: 5 } },
    walkabilityBounds: { minX: 0, maxX: 23, minY: 0, maxY: 9 },
    blockedTiles: [
      { x: 10, y: 2 }, { x: 18, y: 3 },
    ],
    entities: [
      {
        id: 'character_professor',
        modelUrl: './assets/models/character_professor.glb',
        type: 'npc',
        position: { x: 18, y: 3 },
        facing: 'S',
        defaultAnimation: 'idle',
        fps: 4,
        stepped: true,
        interactive: true,
        interactionId: 'professor_dialogue',
        blockedTiles: [{ x: 18, y: 3 }],
      },
      {
        id: 'prop_switchboard',
        modelUrl: './assets/models/prop_power_switchboard.glb',
        type: 'interactive',
        position: { x: 10, y: 2 },
        facing: 'S',
        interactive: true,
        interactionId: 'switchboard_repair',
        blockedTiles: [{ x: 10, y: 2 }],
      },
    ],
    portals: [
      {
        id: 'portal_to_security',
        targetZoneId: 'zone_05_security_room',
        triggerBounds: { minX: 22, maxX: 23, minY: 4, maxY: 6 },
        targetSpawn: { x: 2, y: 7 },
      },
    ],
    tileTextureKey: 'iso_tile_default',
  },

  zone_05_security_room: {
    id: 'zone_05_security_room',
    act: 2,
    panelNumber: 5,
    titleRu: 'Тупик у серверной и пост охраны',
    titleEn: 'Campus Security Post & CCTV',
    width: 16,
    height: 14,
    dimensions: { width: 16, height: 14 },
    defaultLighting: 'twilight',
    playerSpawn: { x: 2, y: 7, elevation: 0, facing: 'E', position: { x: 2, y: 7 } },
    walkabilityBounds: { minX: 0, maxX: 15, minY: 0, maxY: 13 },
    blockedTiles: [
      { x: 6, y: 5 }, { x: 14, y: 7 },
    ],
    entities: [
      {
        id: 'prop_terminal_security',
        modelUrl: './assets/models/prop_terminal_security.glb',
        type: 'interactive',
        position: { x: 6, y: 5 },
        facing: 'S',
        interactive: true,
        interactionId: 'cctv_playback',
        blockedTiles: [{ x: 6, y: 5 }],
      },
      {
        id: 'prop_server_vault_door',
        modelUrl: './assets/models/prop_terminal_security.glb',
        type: 'prop',
        position: { x: 14, y: 7 },
        facing: 'W',
        interactive: true,
        interactionId: 'vault_door_inspection',
        blockedTiles: [{ x: 14, y: 7 }],
      },
    ],
    portals: [
      {
        id: 'portal_to_winter_garden',
        targetZoneId: 'zone_06_winter_garden',
        triggerBounds: { minX: 7, maxX: 9, minY: 12, maxY: 13 },
        targetSpawn: { x: 3, y: 3 },
      },
    ],
    tileTextureKey: 'iso_tile_default',
  },

  zone_06_winter_garden: {
    id: 'zone_06_winter_garden',
    act: 2,
    panelNumber: 7,
    titleRu: 'Зимний сад и перехват робота-пса',
    titleEn: 'Winter Garden Greenhouse',
    width: 18,
    height: 18,
    dimensions: { width: 18, height: 18 },
    defaultLighting: 'twilight',
    playerSpawn: { x: 3, y: 3, elevation: 0, facing: 'SE', position: { x: 3, y: 3 } },
    walkabilityBounds: { minX: 0, maxX: 17, minY: 0, maxY: 17 },
    blockedTiles: [
      { x: 14, y: 14 },
    ],
    entities: [
      {
        id: 'robot_robo_dog_01',
        modelUrl: './assets/models/robo_dog.glb',
        type: 'robot',
        position: { x: 14, y: 14 },
        facing: 'NW',
        defaultAnimation: 'idle',
        fps: 4,
        stepped: true,
        interactive: true,
        interactionId: 'robo_dog_capture',
        blockedTiles: [{ x: 14, y: 14 }],
      },
    ],
    portals: [
      {
        id: 'portal_to_cable_tunnel',
        targetZoneId: 'zone_07_cable_tunnel',
        triggerBounds: { minX: 16, maxX: 17, minY: 14, maxY: 16 },
        targetSpawn: { x: 3, y: 4 },
      },
    ],
    tileTextureKey: 'iso_tile_default',
  },

  zone_07_cable_tunnel: {
    id: 'zone_07_cable_tunnel',
    act: 3,
    panelNumber: 9,
    titleRu: 'Сервисный тоннель под двором',
    titleEn: 'Subterranean Cable Collector',
    width: 24,
    height: 8,
    dimensions: { width: 24, height: 8 },
    defaultLighting: 'twilight',
    playerSpawn: { x: 3, y: 4, elevation: 0, facing: 'E', position: { x: 3, y: 4 } },
    walkabilityBounds: { minX: 0, maxX: 23, minY: 0, maxY: 7 },
    blockedTiles: [
      { x: 20, y: 4 },
    ],
    entities: [
      {
        id: 'robot_recon_drone_01',
        modelUrl: './assets/models/recon_drone.glb',
        type: 'robot',
        position: { x: 20, y: 4 },
        facing: 'W',
        defaultAnimation: 'hover',
        fps: 6,
        stepped: true,
        interactive: false,
        blockedTiles: [{ x: 20, y: 4 }],
      },
    ],
    portals: [
      {
        id: 'portal_to_grand_lobby',
        targetZoneId: 'zone_08_grand_lobby',
        triggerBounds: { minX: 22, maxX: 23, minY: 3, maxY: 5 },
        targetSpawn: { x: 3, y: 4 },
      },
    ],
    tileTextureKey: 'iso_tile_default',
  },

  zone_08_grand_lobby: {
    id: 'zone_08_grand_lobby',
    act: 3,
    panelNumber: 10,
    titleRu: 'Парадный вестибюль и вход',
    titleEn: 'Main Academic Building Grand Lobby',
    width: 22,
    height: 20,
    dimensions: { width: 22, height: 20 },
    defaultLighting: 'warm_restored',
    playerSpawn: { x: 3, y: 4, elevation: 0, facing: 'SE', position: { x: 3, y: 4 } },
    walkabilityBounds: { minX: 0, maxX: 21, minY: 0, maxY: 19 },
    blockedTiles: [
      { x: 6, y: 5 }, { x: 11, y: 12 },
    ],
    entities: [
      {
        id: 'prop_jammer_antenna',
        modelUrl: './assets/models/prop_jammer_antenna.glb',
        type: 'interactive',
        position: { x: 6, y: 5 },
        facing: 'S',
        interactive: true,
        interactionId: 'jammer_disruption',
        blockedTiles: [{ x: 6, y: 5 }],
      },
      {
        id: 'character_professor_lobby',
        modelUrl: './assets/models/character_professor.glb',
        type: 'npc',
        position: { x: 11, y: 12 },
        facing: 'N',
        defaultAnimation: 'idle',
        fps: 4,
        stepped: true,
        interactive: true,
        blockedTiles: [{ x: 11, y: 12 }],
      },
    ],
    portals: [
      {
        id: 'portal_to_datacenter',
        targetZoneId: 'zone_09_datacenter',
        triggerBounds: { minX: 10, maxX: 12, minY: 18, maxY: 19 },
        targetSpawn: { x: 10, y: 3 },
      },
    ],
    tileTextureKey: 'iso_tile_default',
  },

  zone_09_datacenter: {
    id: 'zone_09_datacenter',
    act: 4,
    panelNumber: 12,
    titleRu: 'Главная серверная (Архив)',
    titleEn: 'Archival Datacenter & Server Vault',
    width: 20,
    height: 20,
    dimensions: { width: 20, height: 20 },
    defaultLighting: 'twilight',
    playerSpawn: { x: 10, y: 3, elevation: 0, facing: 'S', position: { x: 10, y: 3 } },
    walkabilityBounds: { minX: 0, maxX: 19, minY: 0, maxY: 19 },
    blockedTiles: [
      { x: 6, y: 8 }, { x: 14, y: 8 }, { x: 10, y: 10 }, { x: 11, y: 10 },
    ],
    entities: [
      {
        id: 'prop_server_rack_01',
        modelUrl: './assets/models/prop_server_rack.glb',
        type: 'prop',
        position: { x: 6, y: 8 },
        facing: 'E',
        blockedTiles: [{ x: 6, y: 8 }],
      },
      {
        id: 'prop_server_rack_02',
        modelUrl: './assets/models/prop_server_rack.glb',
        type: 'prop',
        position: { x: 14, y: 8 },
        facing: 'W',
        blockedTiles: [{ x: 14, y: 8 }],
      },
      {
        id: 'prop_holo_console',
        modelUrl: './assets/models/prop_holo_console.glb',
        type: 'interactive',
        position: { x: 10, y: 10 },
        facing: 'S',
        interactive: true,
        interactionId: 'server_recovery_protocol',
        blockedTiles: [{ x: 10, y: 10 }],
      },
      {
        id: 'character_professor_datacenter',
        modelUrl: './assets/models/character_professor.glb',
        type: 'npc',
        position: { x: 11, y: 10 },
        facing: 'W',
        defaultAnimation: 'talk',
        fps: 4,
        stepped: true,
        blockedTiles: [{ x: 11, y: 10 }],
      },
    ],
    tileTextureKey: 'iso_tile_default',
  },

  zone_10_finale_celebration: {
    id: 'zone_10_finale_celebration',
    act: 4,
    panelNumber: 14,
    titleRu: 'Праздник во дворе (Финал А)',
    titleEn: 'Campus Celebration — Code Protected',
    width: 22,
    height: 22,
    dimensions: { width: 22, height: 22 },
    defaultLighting: 'sunny_day',
    playerSpawn: { x: 11, y: 4, elevation: 0, facing: 'S', position: { x: 11, y: 4 } },
    walkabilityBounds: { minX: 0, maxX: 21, minY: 0, maxY: 21 },
    blockedTiles: [
      { x: 12, y: 11 }, { x: 8, y: 11 }, { x: 10, y: 13 },
    ],
    entities: [
      {
        id: 'character_professor_celebration',
        modelUrl: './assets/models/character_professor.glb',
        type: 'npc',
        position: { x: 12, y: 11 },
        facing: 'W',
        defaultAnimation: 'idle',
        fps: 4,
        stepped: true,
        blockedTiles: [{ x: 12, y: 11 }],
      },
      {
        id: 'robot_patrol_droid_celebration',
        modelUrl: './assets/models/patrol_droid.glb',
        type: 'robot',
        position: { x: 8, y: 11 },
        facing: 'E',
        defaultAnimation: 'scan',
        fps: 6,
        stepped: true,
        blockedTiles: [{ x: 8, y: 11 }],
      },
      {
        id: 'robot_robo_dog_celebration',
        modelUrl: './assets/models/robo_dog.glb',
        type: 'robot',
        position: { x: 10, y: 13 },
        facing: 'N',
        defaultAnimation: 'idle',
        fps: 4,
        stepped: true,
        blockedTiles: [{ x: 10, y: 13 }],
      },
    ],
    tileTextureKey: 'iso_tile_default',
  },

  zone_11_finale_cleanup: {
    id: 'zone_11_finale_cleanup',
    act: 4,
    panelNumber: 15,
    titleRu: 'Уборка и восстановление (Финал Б)',
    titleEn: 'Volunteer Cleanup — Pragmatic Restoration',
    width: 22,
    height: 22,
    dimensions: { width: 22, height: 22 },
    defaultLighting: 'twilight',
    playerSpawn: { x: 11, y: 4, elevation: 0, facing: 'S', position: { x: 11, y: 4 } },
    walkabilityBounds: { minX: 0, maxX: 21, minY: 0, maxY: 21 },
    blockedTiles: [
      { x: 11, y: 10 }, { x: 14, y: 12 },
    ],
    entities: [
      {
        id: 'character_professor_cleanup',
        modelUrl: './assets/models/character_professor.glb',
        type: 'npc',
        position: { x: 11, y: 10 },
        facing: 'S',
        defaultAnimation: 'idle',
        fps: 4,
        stepped: true,
        blockedTiles: [{ x: 11, y: 10 }],
      },
      {
        id: 'robot_sentinel_cleanup',
        modelUrl: './assets/models/sentinel_robot.glb',
        type: 'robot',
        position: { x: 14, y: 12 },
        facing: 'W',
        defaultAnimation: 'idle',
        fps: 2,
        stepped: true,
        blockedTiles: [{ x: 14, y: 12 }],
      },
    ],
    tileTextureKey: 'iso_tile_default',
  },
};

export interface DioramaManagerConfig {
  readonly initialZone?: DioramaZoneId;
  readonly initialLighting?: LightingState;
  readonly threeRenderer?: ThreeRenderer;
  readonly onZoneChange?: (zoneId: DioramaZoneId, descriptor: ZoneDescriptor) => void;
  readonly onLightingChange?: (state: LightingState) => void;
}

export class DioramaManager implements IDioramaManager {
  private activeZoneId: DioramaZoneId = 'zone_01_gate';
  private lightingController: DynamicLightingController;
  private threeRenderer?: ThreeRenderer;
  private spawnedModels: Map<string, PixelArtModelInstance> = new Map();
  private dynamicBlockedTiles: Set<string> = new Set();
  private interactedPropIds: Set<string> = new Set();
  private isPowerRestored: boolean = false;
  private clearedEntityIds: Set<string> = new Set();

  private onZoneChangeCallbacks: Set<(zoneId: DioramaZoneId, descriptor: ZoneDescriptor) => void> = new Set();
  private onLightingChangeCallbacks: Set<(state: LightingState) => void> = new Set();

  constructor(config?: DioramaManagerConfig) {
    if (config?.initialZone) {
      this.activeZoneId = config.initialZone;
    }

    const initLighting = config?.initialLighting ?? 'twilight';
    this.lightingController = new DynamicLightingController({
      initialState: initLighting,
      defaultTransitionMode: 'stepped',
      defaultDuration: 1.0,
      onStateChanged: (state) => {
        this.notifyLightingChanged(state);
      },
    });

    if (config?.threeRenderer) {
      this.setThreeRenderer(config.threeRenderer);
    }

    if (config?.onZoneChange) {
      this.onZoneChangeCallbacks.add(config.onZoneChange);
    }
    if (config?.onLightingChange) {
      this.onLightingChangeCallbacks.add(config.onLightingChange);
    }

    this.applyZoneDefaults(this.activeZoneId);
  }

  public setThreeRenderer(renderer: ThreeRenderer): void {
    this.threeRenderer = renderer;
    this.lightingController.attachLights(renderer.ambientLight, renderer.directionalLight);
  }

  public getThreeRenderer(): ThreeRenderer | undefined {
    return this.threeRenderer;
  }

  public getLightingController(): DynamicLightingController {
    return this.lightingController;
  }

  public getActiveZone(): DioramaZoneId {
    return this.activeZoneId;
  }

  public getActiveZoneDescriptor(): ZoneDescriptor {
    const desc = DIORAMA_ZONE_CATALOG[this.activeZoneId];
    if (!desc) {
      throw new Error(`[DioramaManager] Descriptor for zone ${this.activeZoneId} not found in catalog`);
    }
    return desc;
  }

  public getZoneDescriptor(zoneId: DioramaZoneId): ZoneDescriptor {
    const desc = DIORAMA_ZONE_CATALOG[zoneId];
    if (!desc) {
      throw new Error(`[DioramaManager] Unknown zoneId: ${zoneId}`);
    }
    return desc;
  }

  public getAllZoneDescriptors(): Record<DioramaZoneId, ZoneDescriptor> {
    return DIORAMA_ZONE_CATALOG;
  }

  public getLightingState(): LightingState {
    return this.lightingController.getState();
  }

  public setLightingState(state: LightingState): void {
    this.lightingController.setState(state);
  }

  public async loadZone(zoneId: DioramaZoneId): Promise<void> {
    const descriptor = DIORAMA_ZONE_CATALOG[zoneId];
    if (!descriptor) {
      throw new Error(`[DioramaManager] Unknown zoneId: ${zoneId}`);
    }

    this.activeZoneId = zoneId;

    // Apply automatic lighting rules:
    // - zone_04_lab_corridor -> 'warm_restored' if power restored, otherwise 'dark_emergency'
    // - zone_10_finale_celebration -> 'sunny_day'
    // - zone_11_finale_cleanup -> 'twilight'
    // - other zones -> zone defaultLighting (usually 'twilight' or 'warm_restored')
    if (zoneId === 'zone_04_lab_corridor') {
      const targetLighting: LightingState = this.isPowerRestored ? 'warm_restored' : 'dark_emergency';
      this.lightingController.setState(targetLighting);
    } else if (zoneId === 'zone_10_finale_celebration') {
      this.lightingController.setState('sunny_day');
    } else if (zoneId === 'zone_11_finale_cleanup') {
      this.lightingController.setState('twilight');
    } else {
      this.lightingController.setState(descriptor.defaultLighting);
    }

    // Rebuild walkability mask
    this.rebuildWalkability(descriptor);

    // Sync live 3D models if ThreeRenderer is attached
    if (this.threeRenderer) {
      await this.syncThreeScene(descriptor);
    }

    // Notify listeners
    this.notifyZoneChanged(zoneId, descriptor);
  }

  public isWalkable(gridX: number, gridY: number): boolean {
    if (!Number.isFinite(gridX) || !Number.isFinite(gridY)) {
      return false;
    }

    const desc = this.getActiveZoneDescriptor();

    // Check boundary
    if (gridX < 0 || gridX >= desc.width || gridY < 0 || gridY >= desc.height) {
      return false;
    }

    if (desc.walkabilityBounds) {
      const bounds = desc.walkabilityBounds;
      if (gridX < bounds.minX || gridX >= bounds.maxX + 1 || gridY < bounds.minY || gridY >= bounds.maxY + 1) {
        return false;
      }
    }

    const key = `${Math.floor(gridX)},${Math.floor(gridY)}`;
    return !this.dynamicBlockedTiles.has(key);
  }

  public clearEntityObstacle(entityId: string): void {
    if (!entityId || typeof entityId !== 'string') return;
    this.clearedEntityIds.add(entityId);

    const desc = this.getActiveZoneDescriptor();
    const entity = desc.entities.find((e) => e.id === entityId);
    if (!entity || !entity.blockedTiles) return;

    for (const tile of entity.blockedTiles) {
      this.dynamicBlockedTiles.delete(`${tile.x},${tile.y}`);
    }
  }

  public isEntityObstacleCleared(entityId: string): boolean {
    return this.clearedEntityIds.has(entityId);
  }

  public getClearedEntityIds(): readonly string[] {
    return Array.from(this.clearedEntityIds);
  }

  public markPropInteracted(propId: string): void {
    this.interactedPropIds.add(propId);
  }

  public isPropInteracted(propId: string): boolean {
    return this.interactedPropIds.has(propId);
  }

  public notifyPowerRestored(): void {
    this.isPowerRestored = true;
    if (this.activeZoneId === 'zone_04_lab_corridor') {
      this.setLightingState('warm_restored');
    }
  }

  public isPowerGridRestored(): boolean {
    return this.isPowerRestored;
  }

  public onZoneChange(callback: (zoneId: DioramaZoneId, descriptor: ZoneDescriptor) => void): () => void {
    this.onZoneChangeCallbacks.add(callback);
    return () => this.onZoneChangeCallbacks.delete(callback);
  }

  public onLightingChange(callback: (state: LightingState) => void): () => void {
    this.onLightingChangeCallbacks.add(callback);
    return () => this.onLightingChangeCallbacks.delete(callback);
  }

  public saveState(): DioramaSaveState {
    return {
      currentZoneId: this.activeZoneId,
      lightingState: this.getLightingState(),
      interactedPropIds: Array.from(this.interactedPropIds),
      playerCoordinates: { ...this.getActiveZoneDescriptor().playerSpawn },
      isPowerRestored: this.isPowerRestored,
      clearedEntityIds: Array.from(this.clearedEntityIds),
    };
  }

  public serialize(): DioramaSaveState {
    return this.saveState();
  }

  public loadState(state: Partial<DioramaSaveState>): void {
    if (state.currentZoneId && DIORAMA_ZONE_CATALOG[state.currentZoneId as DioramaZoneId]) {
      this.activeZoneId = state.currentZoneId as DioramaZoneId;
    }
    if (state.clearedEntityIds) {
      this.clearedEntityIds = new Set(state.clearedEntityIds.filter(Boolean));
    }
    this.applyZoneDefaults(this.activeZoneId);

    if (typeof state.isPowerRestored === 'boolean') {
      this.isPowerRestored = state.isPowerRestored;
    }
    if (state.lightingState) {
      this.setLightingState(state.lightingState as LightingState);
      if (state.lightingState === 'warm_restored' && this.activeZoneId === 'zone_04_lab_corridor') {
        this.isPowerRestored = true;
      }
    }
    if (state.interactedPropIds) {
      this.interactedPropIds = new Set(state.interactedPropIds.filter(Boolean));
    }
  }

  public reset(): void {
    this.activeZoneId = 'zone_01_gate';
    this.isPowerRestored = false;
    this.interactedPropIds.clear();
    this.clearedEntityIds.clear();
    this.dynamicBlockedTiles.clear();
    this.lightingController.setState('twilight');
    this.applyZoneDefaults(this.activeZoneId);
  }

  private applyZoneDefaults(zoneId: DioramaZoneId): void {
    const desc = DIORAMA_ZONE_CATALOG[zoneId];
    if (desc) {
      this.rebuildWalkability(desc);
    }
  }

  private rebuildWalkability(desc: ZoneDescriptor): void {
    this.dynamicBlockedTiles.clear();
    if (desc.blockedTiles) {
      for (const tile of desc.blockedTiles) {
        this.dynamicBlockedTiles.add(`${tile.x},${tile.y}`);
      }
    }
    for (const entity of desc.entities) {
      if (this.clearedEntityIds.has(entity.id)) {
        continue;
      }
      if (entity.blockedTiles) {
        for (const tile of entity.blockedTiles) {
          this.dynamicBlockedTiles.add(`${tile.x},${tile.y}`);
        }
      }
    }
    for (const entity of desc.entities) {
      if (this.clearedEntityIds.has(entity.id) && entity.blockedTiles) {
        for (const tile of entity.blockedTiles) {
          this.dynamicBlockedTiles.delete(`${tile.x},${tile.y}`);
        }
      }
    }
  }

  private async syncThreeScene(desc: ZoneDescriptor): Promise<void> {
    if (!this.threeRenderer) return;

    for (const [, model] of this.spawnedModels) {
      this.threeRenderer.removeModel(model);
    }
    this.spawnedModels.clear();

    for (const entity of desc.entities) {
      try {
        const instance = await this.threeRenderer.spawnModel(entity.modelUrl, {
          position: entity.position,
          elevation: entity.elevation ?? 0,
          facing: (entity.facing as IsometricDirection) ?? 'S',
          defaultAnimation: entity.defaultAnimation ?? 'idle',
          fps: entity.fps ?? 4,
          stepped: entity.stepped ?? true,
          scale: entity.scale ?? 1.0,
        });
        this.spawnedModels.set(entity.id, instance);
      } catch (err) {
        // Tolerant fallback in test runners or headless mode
        console.warn(`[DioramaManager] Could not spawn model for ${entity.id}:`, err);
      }
    }
  }

  private notifyZoneChanged(zoneId: DioramaZoneId, descriptor: ZoneDescriptor): void {
    for (const cb of this.onZoneChangeCallbacks) {
      cb(zoneId, descriptor);
    }
  }

  private notifyLightingChanged(state: LightingState): void {
    for (const cb of this.onLightingChangeCallbacks) {
      cb(state);
    }
  }
}

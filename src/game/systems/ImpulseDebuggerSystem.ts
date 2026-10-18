/**
 * Project Sentinel - ImpulseDebuggerSystem
 * Non-lethal EMP pulse tool and modular robot disassembly subsystem.
 * Implements IDebuggerSystem contract.
 */

import type { Vector2D } from '@/types';
import type {
  DioramaZoneId,
  GroundItemDrop,
  IDebuggerSystem,
  ImpulseDebuggerSystemConfig,
  PulseResult,
  TargetEntity,
  TargetEntityType,
} from '@/types/campaign';

export class ImpulseDebuggerSystem implements IDebuggerSystem {
  public static readonly DEFAULT_EFFECTIVE_RANGE = 4.5;

  private targets: Map<string, TargetEntity> = new Map();
  private aimedTargetId: string | null = null;
  private effectiveRange: number = ImpulseDebuggerSystem.DEFAULT_EFFECTIVE_RANGE;
  private playerPosition: Vector2D = { x: 0, y: 0 };
  private activeZone: DioramaZoneId = 'zone_01_gate';
  private losChecker?: (from: Vector2D, to: Vector2D) => boolean;

  // Event callbacks for decoupling visual & audio FX
  private onPulseFiredCallbacks: Set<(result: PulseResult) => void> = new Set();
  private onFriendlyFireCallbacks: Set<(targetId: string) => void> = new Set();
  private onRobotDisassembledCallbacks: Set<(targetId: string, modules: string[]) => void> = new Set();

  constructor(config?: ImpulseDebuggerSystemConfig) {
    if (config?.effectiveRange !== undefined) this.effectiveRange = config.effectiveRange;
    if (config?.playerPosition) this.playerPosition = { ...config.playerPosition };
    if (config?.activeZone) this.activeZone = config.activeZone;
    if (config?.losChecker) this.losChecker = config.losChecker;

    this.registerDefaultCampaignTargets();
  }

  /**
   * Registers default targets for campaign scenarios.
   */
  private registerDefaultCampaignTargets(): void {
    this.registerTarget('blocker_bot_01', 'robot', true, {
      disassembledModules: [
        'item_module_wheels',
        'item_module_casing',
        'item_module_camera',
        'item_module_battery',
      ],
    });
    this.registerTarget('robo_dog_01', 'robot', true, {
      disassembledModules: ['item_server_keyring', 'item_dog_modules'],
    });
    this.registerTarget('professor_npc', 'npc', true);
    this.registerTarget('jammer_antenna_01', 'prop', true);
  }

  /**
   * Registers or updates a target entity in the registry.
   */
  public registerTarget(
    id: string,
    type: TargetEntityType,
    inRange?: boolean,
    options?: Partial<TargetEntity>
  ): void {
    const existing = this.targets.get(id);
    const resolvedInRange = inRange !== undefined
      ? inRange
      : (options?.inRange !== undefined ? options.inRange : (options?.position ? undefined : true));

    this.targets.set(id, {
      ...existing,
      ...options,
      id,
      type,
      inRange: resolvedInRange,
      deactivated: options?.deactivated ?? existing?.deactivated ?? false,
    });
  }

  /**
   * Unregisters a target entity.
   */
  public unregisterTarget(id: string): boolean {
    if (this.aimedTargetId === id) this.aimedTargetId = null;
    return this.targets.delete(id);
  }

  /**
   * Retrieves a target entity by ID.
   */
  public getTarget(id: string): TargetEntity | null {
    return this.targets.get(id) ?? null;
  }

  /**
   * Returns the currently aimed target ID, or null if none.
   */
  public getAimedTargetId(): string | null {
    return this.aimedTargetId;
  }

  /**
   * Updates current player coordinates for range and LOS math.
   */
  public setPlayerPosition(pos: Vector2D): void {
    this.playerPosition = { ...pos };
  }

  /**
   * Updates active diorama zone.
   */
  public setActiveZone(zone: DioramaZoneId): void {
    this.activeZone = zone;
  }

  /**
   * Returns the active diorama zone.
   */
  public getActiveZone(): DioramaZoneId {
    return this.activeZone;
  }

  /**
   * Overrides effective firing range.
   */
  public setEffectiveRange(range: number): void {
    this.effectiveRange = range;
  }

  /**
   * Sets line-of-sight validator.
   */
  public setLineOfSightChecker(checker: (from: Vector2D, to: Vector2D) => boolean): void {
    this.losChecker = checker;
  }

  /**
   * Evaluates if a target is within effective firing range.
   */
  public isTargetInRange(target: TargetEntity): boolean {
    if (target.inRange !== undefined) {
      return target.inRange;
    }
    if (target.position) {
      const distance = Math.hypot(
        target.position.x - this.playerPosition.x,
        target.position.y - this.playerPosition.y
      );
      return distance <= this.effectiveRange;
    }
    return true;
  }

  /**
   * Evaluates if there is clear line of sight to the target.
   */
  public hasLineOfSight(target: TargetEntity): boolean {
    if (target.hasLineOfSight !== undefined) {
      return target.hasLineOfSight;
    }
    if (this.losChecker && target.position) {
      return this.losChecker(this.playerPosition, target.position);
    }
    return true;
  }

  /**
   * Aims the debugger at a target entity.
   * Returns false if target doesn't exist, is out of range, or lacks line of sight.
   */
  public aimAt(targetEntityId: string): boolean {
    const target = this.targets.get(targetEntityId);
    if (!target) {
      this.aimedTargetId = null;
      return false;
    }

    if (!this.isTargetInRange(target) || !this.hasLineOfSight(target)) {
      this.aimedTargetId = null;
      return false;
    }

    this.aimedTargetId = targetEntityId;
    return true;
  }

  /**
   * Discharges the calibrated EMP pulse.
   * Clears aim lock immediately on every discharge attempt.
   */
  public firePulse(): PulseResult {
    // 1. Discharge into open air if no target aimed
    if (!this.aimedTargetId) {
      const result: PulseResult = {
        hit: false,
        error: 'Pulse dissipated into open space',
      };
      this.notifyPulseFired(result);
      return result;
    }

    const targetId = this.aimedTargetId;
    // Aim lock clears on every firing attempt
    this.aimedTargetId = null;

    const target = this.targets.get(targetId);
    if (!target) {
      const result: PulseResult = { hit: false, error: 'Target not found' };
      this.notifyPulseFired(result);
      return result;
    }

    // 2. Friendly Fire Interlock: NPCs cannot be targeted with infected device pulses
    if (target.type === 'npc') {
      const result: PulseResult = {
        hit: false,
        error: 'Target is not an infected device',
      };
      for (const cb of this.onFriendlyFireCallbacks) cb(targetId);
      this.notifyPulseFired(result);
      return result;
    }

    // 3. Already deactivated check
    if (target.deactivated) {
      const result: PulseResult = {
        hit: false,
        error: 'Target is already deactivated',
      };
      this.notifyPulseFired(result);
      return result;
    }

    // 4. Successful Non-Lethal Deactivation & Modular Dissociation
    target.deactivated = true;

    let modules: string[];
    if (target.disassembledModules && target.disassembledModules.length > 0) {
      modules = [...target.disassembledModules];
    } else if (targetId === 'blocker_bot_01') {
      modules = [
        'item_module_wheels',
        'item_module_casing',
        'item_module_camera',
        'item_module_battery',
      ];
    } else if (targetId === 'robo_dog_01') {
      modules = ['item_server_keyring', 'item_dog_modules'];
    } else {
      modules = ['item_generic_module'];
    }

    const result: PulseResult = {
      hit: true,
      targetId,
      disassembledModules: modules,
    };

    for (const cb of this.onRobotDisassembledCallbacks) cb(targetId, modules);
    this.notifyPulseFired(result);
    return result;
  }

  // --- Event Listener Registration ---
  public onPulseFired(callback: (result: PulseResult) => void): () => void {
    this.onPulseFiredCallbacks.add(callback);
    return () => this.onPulseFiredCallbacks.delete(callback);
  }

  public onFriendlyFireBlocked(callback: (targetId: string) => void): () => void {
    this.onFriendlyFireCallbacks.add(callback);
    return () => this.onFriendlyFireCallbacks.delete(callback);
  }

  public onRobotDisassembled(callback: (targetId: string, modules: string[]) => void): () => void {
    this.onRobotDisassembledCallbacks.add(callback);
    return () => this.onRobotDisassembledCallbacks.delete(callback);
  }

  private notifyPulseFired(result: PulseResult): void {
    for (const cb of this.onPulseFiredCallbacks) cb(result);
  }

  public reset(): void {
    this.targets.clear();
    this.aimedTargetId = null;
    this.registerDefaultCampaignTargets();
  }
}

/**
 * GroundDropManager
 * Manages spatial ground drop persistence, multi-zone persistence, and inventory capacity constraints.
 */
export class GroundDropManager {
  private drops: GroundItemDrop[] = [];

  constructor(initialDrops: readonly GroundItemDrop[] = []) {
    this.drops = [...initialDrops];
  }

  /**
   * Spawns a new item drop at the given world coordinates and diorama zone.
   */
  public spawnDrop(itemId: string, position: Vector2D, zone: DioramaZoneId): GroundItemDrop {
    const drop: GroundItemDrop = {
      id: `drop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      itemId,
      position: { ...position },
      zone,
    };
    this.drops.push(drop);
    return drop;
  }

  /**
   * Returns all active ground drops across all zones.
   */
  public getDrops(): readonly GroundItemDrop[] {
    return this.drops;
  }

  /**
   * Returns all drops located within a specific diorama zone.
   */
  public getDropsByZone(zone: DioramaZoneId): GroundItemDrop[] {
    return this.drops.filter((d) => d.zone === zone);
  }

  /**
   * Attempts to collect a ground drop into inventory.
   * If inventory accepts the item, the ground drop is removed.
   */
  public collectDrop(
    dropId: string,
    addToInventory: (itemId: string, count: number) => boolean
  ): boolean {
    const index = this.drops.findIndex((d) => d.id === dropId);
    if (index === -1) return false;
    const drop = this.drops[index];
    if (!drop) return false;

    const accepted = addToInventory(drop.itemId, 1);
    if (accepted) {
      this.drops.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Serializes active drops for campaign save state.
   */
  public serialize(): GroundItemDrop[] {
    return JSON.parse(JSON.stringify(this.drops));
  }

  /**
   * Restores drops from saved campaign state.
   */
  public deserialize(drops: readonly GroundItemDrop[]): void {
    this.drops = JSON.parse(JSON.stringify(drops || []));
  }

  /**
   * Clears all drops.
   */
  public clear(): void {
    this.drops = [];
  }
}

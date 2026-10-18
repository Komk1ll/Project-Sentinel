/**
 * Project Sentinel - PuzzleSystems
 * Unified barrel export module for all Milestone 3 interactive puzzle and gadget mechanics subsystems:
 * - ImpulseDebuggerSystem & GroundDropManager (Feature 12 & 13)
 * - KeypadPuzzleSystem (Feature 14)
 * - SwitchboardPuzzleSystem (Feature 15)
 * - CCTVSystem (Feature 16)
 * - JammerSystem (Feature 17)
 * - ServerRecoveryProtocolSystem, ServerVaultDoorController & CentralServerConsoleController (Feature 18)
 */

export * from './ImpulseDebuggerSystem';
export * from './KeypadPuzzleSystem';
export * from './SwitchboardPuzzleSystem';
export * from './CCTVSystem';
export * from './JammerSystem';
export * from './ServerRecoveryProtocolSystem';

// Re-export type contracts
export type {
  TargetEntityType,
  TargetEntity,
  PulseResult,
  IDebuggerSystem,
  GroundItemDrop,
  ImpulseDebuggerSystemConfig,
  KeypadInputResult,
  IKeypadPuzzle,
  KeypadPuzzleConfig,
  SwitchboardState,
  SwitchboardStepResult,
  SwitchboardRebootResult,
  ISwitchboardPuzzle,
  SwitchboardPuzzleConfig,
  CCTVPlaybackResult,
  CCTVState,
  ICCTVSystem,
  CCTVSystemConfig,
  JammerApproachStatus,
  JammerApproachResult,
  JammerPulseResult,
  JammerState,
  IJammerSystem,
  JammerSystemConfig,
  ServerVaultDoorResult,
  IServerVaultDoor,
  ServerProtocolChoice,
  ServerProtocolResult,
  IServerRecoveryProtocolSystem,
  ServerRecoveryProtocolConfig,
} from '@/types/campaign';

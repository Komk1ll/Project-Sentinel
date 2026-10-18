/**
 * 3D Model & Prop Asset Validator
 * Validates GLB binary assets, animation descriptors, and Three.js compatibility.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface ModelDescriptor {
  id: string;
  filename: string;
  expectedClips: string[];
  steppedFps: number;
  category: 'character' | 'robot' | 'prop';
}

export const CAMPAIGN_MODEL_CATALOG: Record<string, ModelDescriptor> = {
  hero_alexey: {
    id: 'hero_alexey',
    filename: 'character_hero.glb',
    expectedClips: ['idle', 'walk'],
    steppedFps: 4,
    category: 'character',
  },
  professor_npc: {
    id: 'professor_npc',
    filename: 'professor_npc.glb',
    expectedClips: ['idle', 'talk'],
    steppedFps: 4,
    category: 'character',
  },
  patrol_droid: {
    id: 'patrol_droid',
    filename: 'patrol_droid.glb',
    expectedClips: ['scan', 'move'],
    steppedFps: 6,
    category: 'robot',
  },
  courier_blocker_bot: {
    id: 'courier_blocker_bot',
    filename: 'blocker_bot.glb',
    expectedClips: ['idle', 'disassemble'],
    steppedFps: 8,
    category: 'robot',
  },
  quadruped_robo_dog: {
    id: 'quadruped_robo_dog',
    filename: 'robo_dog.glb',
    expectedClips: ['run', 'drop_keys'],
    steppedFps: 10,
    category: 'robot',
  },
  flying_recon_drone: {
    id: 'flying_recon_drone',
    filename: 'recon_drone.glb',
    expectedClips: ['hover', 'patrol'],
    steppedFps: 6,
    category: 'robot',
  },
  prop_impulse_debugger: {
    id: 'prop_impulse_debugger',
    filename: 'prop_debugger.glb',
    expectedClips: [],
    steppedFps: 0,
    category: 'prop',
  },
  prop_security_terminal: {
    id: 'prop_security_terminal',
    filename: 'prop_terminal.glb',
    expectedClips: [],
    steppedFps: 0,
    category: 'prop',
  },
  prop_power_switchboard: {
    id: 'prop_power_switchboard',
    filename: 'prop_switchboard.glb',
    expectedClips: [],
    steppedFps: 0,
    category: 'prop',
  },
  prop_jammer_antenna: {
    id: 'prop_jammer_antenna',
    filename: 'prop_jammer.glb',
    expectedClips: [],
    steppedFps: 0,
    category: 'prop',
  },
  prop_server_rack: {
    id: 'prop_server_rack',
    filename: 'prop_server_rack.glb',
    expectedClips: [],
    steppedFps: 0,
    category: 'prop',
  },
  prop_holo_console: {
    id: 'prop_holo_console',
    filename: 'prop_holo_console.glb',
    expectedClips: [],
    steppedFps: 0,
    category: 'prop',
  },
};

export class ModelAssetValidator {
  private modelsDir: string;

  constructor(modelsDir?: string) {
    this.modelsDir =
      modelsDir ||
      path.resolve('public/assets/models');
  }

  public checkGlbHeader(arrayBuffer: ArrayBuffer): { valid: boolean; version?: number; length?: number } {
    if (arrayBuffer.byteLength < 12) {
      return { valid: false };
    }
    const view = new DataView(arrayBuffer);
    const magic = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );
    if (magic !== 'glTF') {
      return { valid: false };
    }
    const version = view.getUint32(4, true);
    const length = view.getUint32(8, true);
    return { valid: true, version, length };
  }

  public modelFileExists(filename: string): boolean {
    const fullPath = path.join(this.modelsDir, filename);
    return fs.existsSync(fullPath);
  }

  public inspectModelFile(filename: string): {
    exists: boolean;
    sizeBytes: number;
    validGlb: boolean;
    version?: number;
  } {
    const fullPath = path.join(this.modelsDir, filename);
    if (!fs.existsSync(fullPath)) {
      return { exists: false, sizeBytes: 0, validGlb: false };
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );
    const header = this.checkGlbHeader(arrayBuffer);

    return {
      exists: true,
      sizeBytes: fileBuffer.byteLength,
      validGlb: header.valid,
      version: header.version,
    };
  }
}

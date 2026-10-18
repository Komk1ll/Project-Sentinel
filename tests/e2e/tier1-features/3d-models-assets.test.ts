/**
 * Tier 1: Feature Coverage — Features 5–11: 3D Models & Interactive Props
 * Authoritative source: PROJECT.md § Feature Inventory #5–11, spec_miner_survey_1/handoff.md § Section 2
 */

import { describe, it, expect } from 'vitest';
import { ModelAssetValidator, CAMPAIGN_MODEL_CATALOG } from '../harness';

describe('Tier 1: 3D Models & Interactive Props (Features 5–11)', () => {
  const validator = new ModelAssetValidator();

  it('validates 3D Hero Model Alexey (Feature 5) catalog descriptor and asset', () => {
    const desc = CAMPAIGN_MODEL_CATALOG['hero_alexey'];
    expect(desc).toBeDefined();
    expect(desc?.category).toBe('character');
    expect(desc?.expectedClips).toContain('idle');
    expect(desc?.expectedClips).toContain('walk');
    expect(desc?.steppedFps).toBe(4);

    // Verify existing asset in public/assets/models/
    const asset = validator.inspectModelFile(desc!.filename);
    expect(asset.exists).toBe(true);
    expect(asset.validGlb).toBe(true);
    expect(asset.sizeBytes).toBeGreaterThan(1000);
  });

  it('validates 3D Professor Model (Feature 6) catalog descriptor and animations', () => {
    const desc = CAMPAIGN_MODEL_CATALOG['professor_npc'];
    expect(desc).toBeDefined();
    expect(desc?.category).toBe('character');
    expect(desc?.expectedClips).toContain('idle');
    expect(desc?.expectedClips).toContain('talk');
    expect(desc?.steppedFps).toBe(4);
    expect(desc?.filename).toBe('professor_npc.glb');
  });

  it('validates 3D Patrol Droid Model (Feature 7) catalog descriptor and animation parameters', () => {
    const desc = CAMPAIGN_MODEL_CATALOG['patrol_droid'];
    expect(desc).toBeDefined();
    expect(desc?.category).toBe('robot');
    expect(desc?.expectedClips).toContain('scan');
    expect(desc?.expectedClips).toContain('move');
    expect(desc?.steppedFps).toBe(6);
  });

  it('validates 3D Courier Blocker Bot Model (Feature 8) modular disassembly descriptor', () => {
    const desc = CAMPAIGN_MODEL_CATALOG['courier_blocker_bot'];
    expect(desc).toBeDefined();
    expect(desc?.category).toBe('robot');
    expect(desc?.expectedClips).toContain('idle');
    expect(desc?.expectedClips).toContain('disassemble');
    expect(desc?.steppedFps).toBe(8);
  });

  it('validates 3D Quadruped Robo-Dog Model (Feature 9) canine animations descriptor', () => {
    const desc = CAMPAIGN_MODEL_CATALOG['quadruped_robo_dog'];
    expect(desc).toBeDefined();
    expect(desc?.category).toBe('robot');
    expect(desc?.expectedClips).toContain('run');
    expect(desc?.expectedClips).toContain('drop_keys');
    expect(desc?.steppedFps).toBe(10);
  });

  it('validates 3D Flying Recon Drone Model (Feature 10) aerial surveillance descriptor', () => {
    const desc = CAMPAIGN_MODEL_CATALOG['flying_recon_drone'];
    expect(desc).toBeDefined();
    expect(desc?.category).toBe('robot');
    expect(desc?.expectedClips).toContain('hover');
    expect(desc?.expectedClips).toContain('patrol');
    expect(desc?.steppedFps).toBe(6);
  });

  it('validates 3D Interactive Prop Models catalog (Feature 11) for all 6 campaign props', () => {
    const expectedProps = [
      'prop_impulse_debugger',
      'prop_security_terminal',
      'prop_power_switchboard',
      'prop_jammer_antenna',
      'prop_server_rack',
      'prop_holo_console',
    ];

    for (const propId of expectedProps) {
      const desc = CAMPAIGN_MODEL_CATALOG[propId];
      expect(desc).toBeDefined();
      expect(desc?.category).toBe('prop');
      expect(desc?.filename.endsWith('.glb')).toBe(true);
    }
  });
});

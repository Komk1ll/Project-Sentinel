import { describe, expect, it } from 'vitest';
import { PlayerProgress } from '@game/systems/player-progress';
import { renderPlayerHud } from '@ui/player-hud';

describe('Player HUD rendering', () => {
  it('shows all four statistics and level at zero', () => {
    const markup = renderPlayerHud(new PlayerProgress().snapshot);

    // Four statistics and the experience bar each expose their current value.
    expect(markup.match(/aria-valuenow=["']0["']/g)).toHaveLength(5);
    expect(markup.match(/0\s*\/\s*100/g)).toHaveLength(4);
    expect(markup).toMatch(/Ур\.\s*0/);
    expect(markup).toMatch(/--experience-value\s*:\s*0%/);
  });

  it('omits portrait and navigation controls', () => {
    const markup = renderPlayerHud(new PlayerProgress().snapshot);

    expect(markup).not.toMatch(/<(?:nav|img)\b/i);
    expect(markup).not.toContain('character-portrait');
    expect(markup).not.toContain('menu-button');
  });

  it('renders updated player statistics, level, and experience', () => {
    const progress = new PlayerProgress();
    progress.update({ health: 25, experience: 40, level: 2 });
    const markup = renderPlayerHud(progress.snapshot);

    expect(markup).toMatch(/aria-valuenow=["']25["']/);
    expect(markup).toMatch(/25\s*\/\s*100/);
    expect(markup).toMatch(/Ур\.\s*2/);
    expect(markup).toMatch(/--stat-value\s*:\s*25%/);
    expect(markup).toMatch(/--experience-value\s*:\s*40%/);
    expect(markup).toMatch(/aria-valuenow=["']40["']/);
  });
});

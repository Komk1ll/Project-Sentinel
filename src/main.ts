import { GameEngine } from '@game/core/GameEngine';
import { mountPlayerHud } from '@ui/player-hud';
import { mountTownHud } from '@ui/town-hud';

window.addEventListener('DOMContentLoaded', () => {
  const engine = new GameEngine({
    gameContainerId: 'game-container',
    threeContainerId: 'three-container',
  });

  const uiContainer = document.getElementById('ui-container');
  if (uiContainer) {
    engine.registerCleanup(mountPlayerHud(uiContainer, engine.playerProgress));
    engine.registerCleanup(mountTownHud(uiContainer, engine.world, engine.cameraZoom));
  }

  engine.init();

  // Expose to window for debugging if in development
  if (import.meta.env.DEV) {
    (window as unknown as { __SENTINEL_ENGINE__: GameEngine }).__SENTINEL_ENGINE__ = engine;
  }
});

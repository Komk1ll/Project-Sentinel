import { GameEngine } from './game/core/GameEngine';

window.addEventListener('DOMContentLoaded', () => {
  const engine = new GameEngine({
    gameContainerId: 'game-container',
    threeContainerId: 'three-container',
  });

  engine.init();

  // Expose to window for debugging if in development
  if (import.meta.env.DEV) {
    (window as unknown as { __SENTINEL_ENGINE__: GameEngine }).__SENTINEL_ENGINE__ = engine;
  }
});

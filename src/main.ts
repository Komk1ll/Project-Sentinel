import { GameEngine } from '@game/core/GameEngine';
import { mountTownHud } from '@ui/town-hud';

window.addEventListener('DOMContentLoaded', () => {
  const engine = new GameEngine({
    gameContainerId: 'game-container',
    threeContainerId: 'three-container',
  });

  const uiContainer = document.getElementById('ui-container');
  if (uiContainer) {
    engine.registerCleanup(mountTownHud(uiContainer, engine.firstAid, engine.cameraZoom, engine.session));
  }

  engine.init();
  const loading = document.getElementById('asset-status');
  void engine.visualsReady.then(() => loading?.remove()).catch(() => {
    if (loading) {
      loading.textContent = 'Не удалось загрузить оформление города. Обновите страницу, чтобы попробовать снова.';
      loading.classList.add('asset-error');
    }
  });

  // Expose to window for debugging if in development
  if (import.meta.env.DEV) {
    (window as unknown as { __SENTINEL_ENGINE__: GameEngine }).__SENTINEL_ENGINE__ = engine;
  }
});

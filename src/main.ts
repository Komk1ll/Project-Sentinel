import type { TownTheme } from '@content/evening-light';
import { GameEngine } from '@game/core/GameEngine';
import { mountTownHud } from '@ui/town-hud';

window.addEventListener('DOMContentLoaded', () => {
  const engine = new GameEngine({
    gameContainerId: 'game-container',
    threeContainerId: 'three-container',
  });

  const themeKey = 'cybershield.theme';
  let theme: TownTheme = 'morning';
  try { if (localStorage.getItem(themeKey) === 'night') theme = 'night'; } catch { /* Settings are optional. */ }
  const uiContainer = document.getElementById('ui-container');
  if (uiContainer) {
    engine.registerCleanup(mountTownHud(uiContainer, engine.firstAid, engine.cameraZoom, engine.session, {
      theme,
      apply(next) {
        engine.threeRenderer?.setTheme(next);
        try { localStorage.setItem(themeKey, next); } catch { /* Keep the current setting in memory. */ }
      },
    }));
  }

  const loading = document.getElementById('asset-status');
  try { engine.init(); engine.threeRenderer.setTheme(theme); }
  catch {
    if (loading) {
      loading.textContent = 'Не удалось запустить 3D. Проверьте, что в браузере включено аппаратное ускорение, и обновите страницу.';
      loading.classList.add('asset-error');
    }
    return;
  }
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

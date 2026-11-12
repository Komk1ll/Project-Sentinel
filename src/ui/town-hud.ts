import type { TownTheme } from '@content/evening-light';
import type { TownPosition } from '@game/systems/town-world';
import type { RouteRequest } from './town-route.worker';
import '@ui/town-hud.css';
import type { CameraZoom } from '@game/systems/camera-zoom';
import { FIRST_AID_TEXT, MASTER } from '@content/first-aid';
import type { TownSession } from '@game/systems/town-session';
import type { FirstAidMission } from '@game/systems/first-aid-mission';

import { drawMinimap, type MinimapMode } from '@ui/town-minimap';
import { storyNavigationGoal } from '@game/systems/town-navigation';

import { interiorFloorName } from '@content/interiors';

/** Keeps location, interaction hints and the map subscribed to the simulation. */
export function mountTownHud(container: HTMLElement, mission: FirstAidMission, zoom: CameraZoom, session: TownSession, themeControl?: { theme: TownTheme; apply(theme: TownTheme): void }): () => void {
  const world = mission.world;
  let theme = themeControl?.theme ?? 'morning';
  const hud = document.createElement('aside');
  hud.className = 'town-hud';
  hud.lang = 'ru';
  hud.setAttribute('aria-label', 'Задание, карта и управление');
  hud.innerHTML = `
    <header class="town-brand">
      <span class="town-brand-symbol" aria-hidden="true">К</span>
      <div><strong>КИБЕРЩИТ</strong><span>Память Зареченска</span></div>
      <div class="town-chapter">ЭПИЗОД 01 <i></i> СНАЧАЛА ЛЮДИ</div>
    </header>
    <section class="town-mission-panel" aria-labelledby="town-mission-title">
      <button type="button" class="town-menu-toggle">Меню · журнал</button>
      ${themeControl ? '<button type="button" class="town-menu-toggle town-theme-toggle"></button>' : ''}
      <button type="button" class="town-mission-toggle" aria-expanded="true" aria-controls="town-mission-body">Свернуть задание</button>
      <div class="town-eyebrow">ВАШЕ ДОБРОЕ ДЕЛО</div>
      <h2 id="town-mission-title">${FIRST_AID_TEXT.title}</h2>
      <p class="town-objective" role="status"></p>
      <div id="town-mission-body"><ol class="town-mission-steps" aria-label="Этапы задания"><li>Мастер</li><li>Доставка</li><li>Помощь</li></ol>
      <p class="town-mission-hint"></p>
      <p class="town-inventory"></p>
      <p class="town-dialogue" role="status" hidden></p>
      <p class="town-session-note" role="status"></p>
      <button type="button" class="town-new-game">Новая игра</button></div>
    </section>
    <section class="town-map-panel" aria-label="Миникарта">
      <div class="town-map-heading"><div class="town-map-title">КАРТА</div><button type="button" class="town-map-expand" aria-expanded="false" aria-label="Развернуть карту">Развернуть</button></div>
      <div class="town-map-modes" role="group" aria-label="Режим карты"><button type="button" data-map-mode="nearby" aria-pressed="true">Рядом</button><button type="button" data-map-mode="district" aria-pressed="false">Район</button><button type="button" data-map-mode="island" aria-pressed="false">Остров</button></div>
      <div class="town-map-location"></div>
      <div class="town-map-frame"><canvas class="town-map" role="img" aria-label="Карта квартала с положением игрока и входами в здания"></canvas><span class="town-map-north" aria-hidden="true">↑ С</span></div>
      <div class="town-map-places"><span>Маяк · мастерская</span><span>Поликлиника · помощь</span></div>
      <div class="town-map-goal" role="status"></div>
      <div class="town-map-legend"><span><i class="town-door-dot"></i> Маршрут</span><span><i class="town-player-dot"></i> Вы</span><span><i class="town-goal-dot"></i> Цель</span></div>
      <div class="town-zoom-controls" role="group" aria-label="Масштаб вида">
        <span class="town-camera-label">Камера</span><button type="button" data-zoom="island" aria-label="Показать весь остров" title="Обзор острова">◎</button>
        <button type="button" data-zoom="out" aria-label="Отдалить" title="Отдалить (−)">−</button>
        <button type="button" data-zoom="reset" class="town-zoom-percent" aria-label="Сбросить масштаб" title="Сбросить масштаб (Home)">100%</button>
        <button type="button" data-zoom="in" aria-label="Приблизить" title="Приблизить (+)">+</button>
      </div>
    </section>
    <div class="town-story-backdrop" hidden></div>
    <section class="town-story-panel" role="dialog" aria-modal="true" aria-labelledby="town-story-title" hidden>
      <h2 id="town-story-title"></h2><p class="town-story-text"></p>
      <div class="town-story-choices"></div>
      <button type="button" class="town-story-close">Закрыть</button>
    </section>
    <p class="town-life-message" role="status" hidden></p>
    <div class="town-controls">
      <button type="button" class="town-interaction town-action-button" aria-live="polite"><kbd>E</kbd><span class="town-interaction-label"></span></button>
      <button type="button" class="town-stair-down town-action-button" hidden><kbd>Q</kbd> Спуститься на этаж</button>
      <div class="town-control-line"><span><kbd>WASD</kbd><span class="town-arrow-keys"> / ↑←↓→</span> движение</span><span class="town-zoom-hint">Колесо / + − · масштаб</span></div>
    </div>`;
  let lastDialogue: string | null = null;
  let mapMode: MinimapMode = 'nearby';
  const storyBackdrop = hud.querySelector<HTMLElement>('.town-story-backdrop')!;
  const themeButton = hud.querySelector<HTMLButtonElement>('.town-theme-toggle');
  const refreshTheme = (): void => {
    hud.dataset.theme = theme;
    if (themeButton) {
      themeButton.textContent = theme === 'morning' ? '☀ Утро' : '☾ Ночь';
      themeButton.setAttribute('aria-pressed', String(theme === 'night'));
      themeButton.title = theme === 'morning' ? 'Переключить на ночь' : 'Переключить на утро';
    }
  };
  refreshTheme();
  const storyPanel = hud.querySelector<HTMLElement>('.town-story-panel')!;
  const storyTitle = hud.querySelector<HTMLElement>('#town-story-title')!;
  const storyText = hud.querySelector<HTMLElement>('.town-story-text')!;
  const storyChoices = hud.querySelector<HTMLElement>('.town-story-choices')!;
  const chapter = hud.querySelector<HTMLElement>('.town-chapter')!;
  const missionTitle = hud.querySelector<HTMLElement>('#town-mission-title')!;
  let renderedPanel = mission.storyPanel;
  let soundContext: AudioContext | undefined;
  let lastSoundState = '';
  const enableSound = (): void => {
    if (!mission.soundEnabled || !('AudioContext' in window)) return;
    try {
      soundContext ??= new AudioContext();
      if (soundContext.state === 'suspended') void soundContext.resume().catch(() => {});
    } catch { /* Silent mode on browsers without usable audio. */ }
  };
  const playStorySound = (success: boolean): void => {
    const context = soundContext;
    if (!mission.soundEnabled || context?.state !== 'running') return;
    const now = context.currentTime;
    const tone = context.createOscillator();
    const volume = context.createGain();
    tone.type = success ? 'sine' : 'triangle';
    tone.frequency.setValueAtTime(success ? 460 : 230, now);
    tone.frequency.exponentialRampToValueAtTime(success ? 740 : 180, now + .14);
    volume.gain.setValueAtTime(.06, now);
    volume.gain.exponentialRampToValueAtTime(.001, now + .24);
    tone.connect(volume).connect(context.destination);
    tone.start(now);
    tone.stop(now + .25);
  };
  const lifeMessage=hud.querySelector<HTMLElement>('.town-life-message')!;
  const mapPanel = hud.querySelector<HTMLElement>('.town-map-panel')!;
  const expandMap = hud.querySelector<HTMLButtonElement>('.town-map-expand')!;
  const canvas = hud.querySelector<HTMLCanvasElement>('.town-map');
  const mapGoal = hud.querySelector<HTMLElement>('.town-map-goal')!;
  const missionBody = hud.querySelector<HTMLElement>('#town-mission-body')!;
  const missionToggle = hud.querySelector<HTMLButtonElement>('.town-mission-toggle')!;
  missionBody.hidden = true; missionToggle.setAttribute('aria-expanded', 'false'); missionToggle.textContent = 'Подробнее';
  const location = hud.querySelector<HTMLElement>('.town-map-location');
  const action = hud.querySelector<HTMLButtonElement>('.town-interaction');
  const stairDown = hud.querySelector<HTMLButtonElement>('.town-stair-down')!;
  const actionLabel = hud.querySelector<HTMLElement>('.town-interaction-label');
  const saveNote = hud.querySelector<HTMLElement>('.town-session-note');
  const newGame = hud.querySelector<HTMLButtonElement>('.town-new-game');
  const objective = hud.querySelector<HTMLElement>('.town-objective');
  const hint = hud.querySelector<HTMLElement>('.town-mission-hint');
  const inventory = hud.querySelector<HTMLElement>('.town-inventory');
  const dialogue = hud.querySelector<HTMLElement>('.town-dialogue');
  if (!canvas || !location || !action || !actionLabel || !objective || !hint || !inventory || !dialogue || !saveNote || !newGame) throw new Error('Town HUD markup is incomplete');
  container.append(hud);
  const routeWorker = typeof Worker === 'undefined' ? null
    : new Worker(new URL('./town-route.worker.ts', import.meta.url), { type: 'module' });
  let pendingRoute: RouteRequest | null = null;
  let lastRoute: RouteRequest | null = null;
  let route: readonly TownPosition[] = [];
  let lastMapDraw = -Infinity;
  let mapTimer: number | undefined;
  const sameDestination = (request: RouteRequest | null, goal: TownPosition): boolean =>
    request !== null && request.interior === world.interior &&
    request.goal.x === goal.x && request.goal.z === goal.z &&
    (world.interior !== null || request.cars?.every((car, index) => car === world.carPoses[index]) === true);
  const renderMap = (force = false): void => {
    const now = performance.now();
    const delay = 1000 / 15 - (now - lastMapDraw);
    if (!force && delay > 0) {
      mapTimer ??= window.setTimeout(() => renderMap(true), delay);
      return;
    }
    window.clearTimeout(mapTimer);
    mapTimer = undefined;
    lastMapDraw = now;
    const goal = world.activeBoat !== null || world.activeCar !== null
      ? null : storyNavigationGoal(world, mission.storyTarget, mission.snapshot.targetBuildingId);
    if (routeWorker && goal && !pendingRoute &&
        (!sameDestination(lastRoute, goal.position) || !lastRoute ||
          Math.hypot(world.position.x - lastRoute.start.x, world.position.z - lastRoute.start.z) >= .75)) {
      pendingRoute = { start: { ...world.position }, goal: goal.position, interior: world.interior,
        ...(world.interior ? {} : { cars: [...world.carPoses] }) };
      routeWorker.postMessage(pendingRoute);
    }
    drawMinimap(canvas, world, mission, mapMode,
      routeWorker ? (goal && sameDestination(lastRoute, goal.position) ? route : []) : undefined);
  };
  if (routeWorker) {
    routeWorker.onmessage = (event: MessageEvent<TownPosition[]>): void => {
      lastRoute = pendingRoute;
      pendingRoute = null;
      route = event.data;
      renderMap(true);
    };
  }
  const setText = (element: HTMLElement, text: string): void => {
    if (element.textContent !== text) element.textContent = text;
  };
  const render = (): void => {
    const snapshot = mission.snapshot;
    const panel = mission.storyPanel;
    const progress = mission.campaignProgress;
    const soundState = JSON.stringify([snapshot.stage, progress.repair, progress.fragments, progress.archived, progress.ending, mission.storyEpisode]);
    if (lastSoundState && lastSoundState !== soundState) playStorySound(true);
    if (panel?.target === 'robot' && panel !== renderedPanel && panel.text.startsWith('Этот шаг')) playStorySound(false);
    lastSoundState = soundState;
    storyPanel.hidden = !panel;
    storyBackdrop.hidden = !panel;
    if (panel && panel !== renderedPanel) {
      setText(storyTitle, panel.title);
      setText(storyText, panel.text);
      const outcomes = (panel.outcomes ?? []).map(result => {
        const card = document.createElement('p');
        card.className = 'town-story-outcome';
        card.textContent = result;
        return card;
      });
      storyChoices.replaceChildren(...outcomes, ...panel.actions.map(action => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.storyAction = action.id;
        button.textContent = action.label;
        button.disabled = action.disabled ?? false;
        return button;
      }));
      if (!renderedPanel) storyPanel.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    }
    renderedPanel = panel;
    setText(chapter, 'ЭПИЗОД 0' + (mission.storyEpisode + 1));
    setText(missionTitle, mission.storyTitle);
    setText(lifeMessage,mission.life.message);lifeMessage.hidden=!mission.life.message;
    const target = mission.interaction;
    if (snapshot.dialogue && snapshot.dialogue !== lastDialogue) {
      missionBody.hidden = false; missionToggle.setAttribute('aria-expanded','true'); missionToggle.textContent='Свернуть';
    }
    lastDialogue = snapshot.dialogue;
    setText(location, world.interior && world.interior.floors > 1
      ? world.interior.name + ' · ' + (world.interiorFloor + 1) + '/' + world.interior.floors + ' · ' + interiorFloorName(world.interior, world.interiorFloor)
      : world.interior?.name ?? (mapMode==='island'?'Остров · север сверху':mapMode === 'nearby' ? 'Рядом с вами · север сверху' : 'Район · север сверху'));
    setText(mapGoal, world.activeBoat !== null ? 'Причал · место швартовки' : storyNavigationGoal(world, mission.storyTarget, snapshot.targetBuildingId)?.label ?? 'Помощь доставлена');
    action.disabled = target === null;
    action.classList.toggle('town-interaction-available', target !== null);
    let idleHint = world.activeCar !== null ? 'W/S · вперёд/назад. A/D · руль. E · выйти' : world.activeBoat !== null ? 'WASD · плыть. Вернитесь к своему месту у причала' : 'E · двери, жители и места помощи';
    if (world.interior) idleHint = world.interior.id === MASTER.buildingId
      ? 'Подойдите к мастеру или к выходу' : world.interior.floors > 1 ? 'У лестницы E · сменить этаж, Q · вниз' : 'Выход у открытой стены';
    stairDown.hidden = target?.kind !== 'stairs' || world.interiorFloor === 0 || world.stairAction !== 'up';
    setText(actionLabel, target?.label ?? idleHint);
    canvas.setAttribute('aria-label', `Миникарта. Цель: ${snapshot.objective}`);
    setText(objective, mission.storyTarget?.label ?? (mission.campaignProgress.ending ? 'История завершена' : snapshot.objective));
    setText(hint, mission.campaignProgress.ending ? 'Итоги можно снова посмотреть у стенда в парке.' : mission.storyTarget ? 'Следуй к цели на мини-карте. E · взаимодействие.' : snapshot.hint);
    setText(inventory, snapshot.stage === 'completed' ? 'Набор передан · поликлиника обеспечена' : snapshot.inventory.length ? FIRST_AID_TEXT.carrying : FIRST_AID_TEXT.emptyInventory);
    hud.classList.toggle('mission-completed', snapshot.clinicSupplied);
    hud.dataset.stage = snapshot.stage;
    setText(dialogue, snapshot.dialogue ?? '');
    dialogue.hidden = snapshot.dialogue === null;
    renderMap();
  };
  const unsubscribe = mission.subscribe(render);
  const unsubscribeLife=mission.life.subscribe(render);
  const unsubscribeSession = session.subscribe(message => setText(saveNote, message));
  const zoomPercent = hud.querySelector<HTMLElement>('.town-zoom-percent');
  const unsubscribeZoom = zoom.subscribe(state => {
    if (zoomPercent) zoomPercent.textContent = `${state.percent}%`;
  });
  const click = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button');
    if (!button) return;
    if (button.dataset.storyAction) mission.chooseStory(button.dataset.storyAction);
    else if (button === themeButton && themeControl) {
      theme = theme === 'morning' ? 'night' : 'morning';
      themeControl.apply(theme);
      refreshTheme();
    }
    else if (button.classList.contains('town-menu-toggle')) mission.toggleMenu();
    else if (button.classList.contains('town-story-close')) mission.closeStory();
    else if (button.dataset.mapMode) {
      mapMode = button.dataset.mapMode === 'island'?'island':button.dataset.mapMode === 'district' ? 'district' : 'nearby';
      hud.querySelectorAll<HTMLButtonElement>('[data-map-mode]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.mapMode===mapMode)));
      render();
      renderMap(true);
    } else if (button === expandMap) {
      const expanded = mapPanel.classList.toggle('town-map-expanded');
      expandMap.setAttribute('aria-expanded',String(expanded));
      expandMap.setAttribute('aria-label',expanded?'Свернуть карту':'Развернуть карту');
      expandMap.textContent = expanded ? 'Свернуть' : 'Развернуть';
      render();
      renderMap(true);
    } else if (button === missionToggle) {
      missionBody.hidden = !missionBody.hidden;
      missionToggle.setAttribute('aria-expanded', String(!missionBody.hidden));
      missionToggle.textContent = missionBody.hidden ? 'Подробнее' : 'Свернуть';
    } else if (button === newGame) {
      if (window.confirm('Начать заново? Текущий прогресс будет заменён новой игрой.')) session.newGame();
    } else if (button === action) mission.interact();
    else if (button === stairDown) world.changeFloor(-1);
    else if (button.dataset.zoom === 'island') zoom.showIsland();
    else if (button.dataset.zoom === 'reset') zoom.reset();
    else if (button.dataset.zoom) zoom.adjust(button.dataset.zoom === 'in' ? -.2 : .2);
  };
  hud.addEventListener('click', click);
  window.addEventListener('pointerdown', enableSound);
  window.addEventListener('keydown', enableSound, true);
  const resize = (): void => renderMap(true);
  window.addEventListener('resize', resize);
  return () => {
    window.clearTimeout(mapTimer);
    routeWorker?.terminate();
    unsubscribe();
    unsubscribeLife();
    unsubscribeZoom();
    unsubscribeSession();
    hud.removeEventListener('click', click);
    window.removeEventListener('pointerdown', enableSound);
    window.removeEventListener('keydown', enableSound, true);
    if (soundContext) void soundContext.close().catch(() => {});
    window.removeEventListener('resize', resize);
    hud.remove();
  };
}

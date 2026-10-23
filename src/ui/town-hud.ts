import '@ui/town-hud.css';
import type { CameraZoom } from '@game/systems/camera-zoom';
import { FIRST_AID_TEXT, MASTER } from '@content/first-aid';
import type { TownSession } from '@game/systems/town-session';
import type { FirstAidMission } from '@game/systems/first-aid-mission';

import { drawMinimap, type MinimapMode } from '@ui/town-minimap';
import { navigationGoal } from '@game/systems/town-navigation';

/** Keeps location, interaction hints and the map subscribed to the simulation. */
export function mountTownHud(container: HTMLElement, mission: FirstAidMission, zoom: CameraZoom, session: TownSession): () => void {
  const world = mission.world;
  const hud = document.createElement('aside');
  hud.className = 'town-hud';
  hud.lang = 'ru';
  hud.setAttribute('aria-label', 'Задание, карта и управление');
  hud.innerHTML = `
    <header class="town-brand">
      <span class="town-brand-symbol" aria-hidden="true">К</span>
      <div><strong>КИБЕРЩИТ</strong><span>Истории Зареченска</span></div>
      <div class="town-chapter">ЭПИЗОД 01 <i></i> СНАЧАЛА ЛЮДИ</div>
    </header>
    <section class="town-mission-panel" aria-labelledby="town-mission-title">
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
      <div class="town-map-modes" role="group" aria-label="Режим карты"><button type="button" data-map-mode="nearby" aria-pressed="true">Рядом</button><button type="button" data-map-mode="district" aria-pressed="false">Весь район</button></div>
      <div class="town-map-location"></div>
      <div class="town-map-frame"><canvas class="town-map" role="img" aria-label="Карта квартала с положением игрока и входами в здания"></canvas><span class="town-map-north" aria-hidden="true">↑ С</span></div>
      <div class="town-map-places"><span>Маяк · мастерская</span><span>Поликлиника · помощь</span></div>
      <div class="town-map-goal" role="status"></div>
      <div class="town-map-legend"><span><i class="town-door-dot"></i> Маршрут</span><span><i class="town-player-dot"></i> Вы</span><span><i class="town-goal-dot"></i> Цель</span></div>
      <div class="town-zoom-controls" role="group" aria-label="Масштаб вида">
        <span class="town-camera-label">Камера</span>
        <button type="button" data-zoom="out" aria-label="Отдалить" title="Отдалить (−)">−</button>
        <button type="button" data-zoom="reset" class="town-zoom-percent" aria-label="Сбросить масштаб" title="Сбросить масштаб (Home)">100%</button>
        <button type="button" data-zoom="in" aria-label="Приблизить" title="Приблизить (+)">+</button>
      </div>
    </section>
    <div class="town-controls">
      <button type="button" class="town-interaction town-action-button" aria-live="polite"><kbd>E</kbd><span class="town-interaction-label"></span></button>
      <div class="town-control-line"><span><kbd>WASD</kbd><span class="town-arrow-keys"> / ↑←↓→</span> движение</span><span class="town-zoom-hint">Колесо / + − · масштаб</span></div>
    </div>`;
  let lastDialogue: string | null = null;
  let mapMode: MinimapMode = 'nearby';
  const mapPanel = hud.querySelector<HTMLElement>('.town-map-panel')!;
  const expandMap = hud.querySelector<HTMLButtonElement>('.town-map-expand')!;
  const canvas = hud.querySelector<HTMLCanvasElement>('.town-map');
  const mapGoal = hud.querySelector<HTMLElement>('.town-map-goal')!;
  const missionBody = hud.querySelector<HTMLElement>('#town-mission-body')!;
  const missionToggle = hud.querySelector<HTMLButtonElement>('.town-mission-toggle')!;
  missionBody.hidden = true; missionToggle.setAttribute('aria-expanded', 'false'); missionToggle.textContent = 'Подробнее';
  const location = hud.querySelector<HTMLElement>('.town-map-location');
  const action = hud.querySelector<HTMLButtonElement>('.town-interaction');
  const actionLabel = hud.querySelector<HTMLElement>('.town-interaction-label');
  const saveNote = hud.querySelector<HTMLElement>('.town-session-note');
  const newGame = hud.querySelector<HTMLButtonElement>('.town-new-game');
  const objective = hud.querySelector<HTMLElement>('.town-objective');
  const hint = hud.querySelector<HTMLElement>('.town-mission-hint');
  const inventory = hud.querySelector<HTMLElement>('.town-inventory');
  const dialogue = hud.querySelector<HTMLElement>('.town-dialogue');
  if (!canvas || !location || !action || !actionLabel || !objective || !hint || !inventory || !dialogue || !saveNote || !newGame) throw new Error('Town HUD markup is incomplete');
  container.append(hud);
  const setText = (element: HTMLElement, text: string): void => {
    if (element.textContent !== text) element.textContent = text;
  };
  const render = (): void => {
    const snapshot = mission.snapshot;
    const target = mission.interaction;
    if (snapshot.dialogue && snapshot.dialogue !== lastDialogue) {
      missionBody.hidden = false; missionToggle.setAttribute('aria-expanded','true'); missionToggle.textContent='Свернуть';
    }
    lastDialogue = snapshot.dialogue;
    setText(location, world.interior?.name ?? (mapMode === 'nearby' ? 'Рядом с вами · север сверху' : 'Весь район · север сверху'));
    setText(mapGoal, navigationGoal(world, snapshot.targetBuildingId)?.label ?? 'Помощь доставлена');
    action.disabled = target === null;
    action.classList.toggle('town-interaction-available', target !== null);
    let idleHint = 'Подойдите к двери · E или кнопка для входа';
    if (world.interior) idleHint = world.interior.id === MASTER.buildingId
      ? 'Подойдите к мастеру или к выходу' : 'Выход у открытой стены';
    setText(actionLabel, target?.label ?? idleHint);
    canvas.setAttribute('aria-label', `Миникарта. Цель: ${snapshot.objective}`);
    setText(objective, snapshot.objective);
    setText(hint, snapshot.hint);
    setText(inventory, snapshot.stage === 'completed' ? 'Набор передан · поликлиника обеспечена' : snapshot.inventory.length ? FIRST_AID_TEXT.carrying : FIRST_AID_TEXT.emptyInventory);
    hud.classList.toggle('mission-completed', snapshot.clinicSupplied);
    hud.dataset.stage = snapshot.stage;
    setText(dialogue, snapshot.dialogue ?? '');
    dialogue.hidden = snapshot.dialogue === null;
    drawMinimap(canvas, world, mission, mapMode);
  };
  const unsubscribe = mission.subscribe(render);
  const unsubscribeSession = session.subscribe(message => setText(saveNote, message));
  const zoomPercent = hud.querySelector<HTMLElement>('.town-zoom-percent');
  const unsubscribeZoom = zoom.subscribe(state => {
    if (zoomPercent) zoomPercent.textContent = `${state.percent}%`;
  });
  const click = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button');
    if (!button) return;
    if (button.dataset.mapMode) {
      mapMode = button.dataset.mapMode === 'district' ? 'district' : 'nearby';
      hud.querySelectorAll<HTMLButtonElement>('[data-map-mode]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.mapMode===mapMode)));
      render();
    } else if (button === expandMap) {
      const expanded = mapPanel.classList.toggle('town-map-expanded');
      expandMap.setAttribute('aria-expanded',String(expanded));
      expandMap.setAttribute('aria-label',expanded?'Свернуть карту':'Развернуть карту');
      expandMap.textContent = expanded ? 'Свернуть' : 'Развернуть';
      render();
    } else if (button === missionToggle) {
      missionBody.hidden = !missionBody.hidden;
      missionToggle.setAttribute('aria-expanded', String(!missionBody.hidden));
      missionToggle.textContent = missionBody.hidden ? 'Подробнее' : 'Свернуть';
    } else if (button === newGame) {
      if (window.confirm('Начать заново? Текущий прогресс будет заменён новой игрой.')) session.newGame();
    } else if (button === action) mission.interact();
    else if (button.dataset.zoom === 'reset') zoom.reset();
    else if (button.dataset.zoom) zoom.adjust(button.dataset.zoom === 'in' ? -.2 : .2);
  };
  hud.addEventListener('click', click);
  const resize = (): void => drawMinimap(canvas, world, mission, mapMode);
  window.addEventListener('resize', resize);
  return () => {
    unsubscribe();
    unsubscribeZoom();
    unsubscribeSession();
    hud.removeEventListener('click', click);
    window.removeEventListener('resize', resize);
    hud.remove();
  };
}

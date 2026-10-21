import '@ui/town-hud.css';
import { buildingEntrance, PARK, ROAD_CENTERS, TOWN_BUILDINGS, TOWN_SIZE } from '@content/town';
import type { TownWorld } from '@game/systems/town-world';
import type { CameraZoom } from '@game/systems/camera-zoom';
import { getInteriorLayout } from '@content/interiors';

const MAP_SIZE = 180;
const MAP_PADDING = 9;

/** Uses the same world coordinates as collisions, doors and the rendered town. */
function drawMinimap(canvas: HTMLCanvasElement, world: TownWorld): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const resolution = Math.round(MAP_SIZE * ratio);
  if (canvas.width !== resolution || canvas.height !== resolution) {
    canvas.width = resolution;
    canvas.height = resolution;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
  context.fillStyle = '#172e2e';
  context.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
  let playerX: number;
  let playerY: number;
  if (world.interior) {
    const scale = 16;
    context.fillStyle = '#304746';
    context.fillRect(18, 34, 144, 112);
    context.strokeStyle = '#78958a';
    context.lineWidth = 3;
    context.strokeRect(18, 34, 144, 112);
    context.fillStyle = '#819087';
    for (const obstacle of getInteriorLayout(world.interior).obstacles) {
      context.fillRect(90 + (obstacle.x - obstacle.width / 2) * scale, 90 + (obstacle.z - obstacle.depth / 2) * scale, obstacle.width * scale, obstacle.depth * scale);
    }
    context.fillStyle = '#edc076';
    context.fillRect(80, 143, 20, 6);
    playerX = 90 + world.position.x * scale;
    playerY = 90 + world.position.z * scale;
  } else {
    const scale = (MAP_SIZE - MAP_PADDING * 2) / TOWN_SIZE;
    const point = (value: number): number => MAP_PADDING + value * scale;
    context.fillStyle = '#41514c';
    for (const road of ROAD_CENTERS) {
      context.fillRect(point(road - 2.5), MAP_PADDING, 5 * scale, TOWN_SIZE * scale);
      context.fillRect(MAP_PADDING, point(road - 2.5), TOWN_SIZE * scale, 5 * scale);
    }
    context.fillStyle = '#3d6651';
    context.fillRect(point(PARK.x - PARK.width / 2), point(PARK.z - PARK.depth / 2), PARK.width * scale, PARK.depth * scale);
    context.strokeStyle = '#6e91715c';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(point(18), point(24));
    context.lineTo(point(30), point(24));
    context.moveTo(point(24), point(18));
    context.lineTo(point(24), point(30));
    context.stroke();
    for (const building of TOWN_BUILDINGS) {
      const x = point(building.x - building.width / 2);
      const y = point(building.z - building.depth / 2);
      context.fillStyle = building.kind === 'home' ? '#8a9a8e' : '#b3ad91';
      context.fillRect(x, y, building.width * scale, building.depth * scale);
      context.strokeStyle = '#0a1c2066';
      context.strokeRect(x, y, building.width * scale, building.depth * scale);
      const entrance = buildingEntrance(building);
      context.fillStyle = '#edc076';
      context.beginPath();
      context.arc(point(entrance.x), point(entrance.z), 1.5, 0, Math.PI * 2);
      context.fill();
      if (world.nearbyBuilding?.id === building.id) {
        context.strokeStyle = '#f4d6a1';
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(point(entrance.x), point(entrance.z), 4, 0, Math.PI * 2);
        context.stroke();
      }
    }
    playerX = point(world.position.x);
    playerY = point(world.position.z);
  }
  context.fillStyle = '#5ae0e8';
  context.shadowColor = '#5ae0e8';
  context.shadowBlur = 9;
  context.beginPath();
  context.arc(playerX, playerY, 3.6, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
  context.lineWidth = 1.5;
  context.strokeStyle = '#ecffff';
  context.stroke();
}

/** Keeps location, interaction hints and the map subscribed to the simulation. */
export function mountTownHud(container: HTMLElement, world: TownWorld, zoom: CameraZoom): () => void {
  const hud = document.createElement('aside');
  hud.className = 'town-hud';
  hud.lang = 'ru';
  hud.setAttribute('aria-label', 'Карта и управление');
  hud.innerHTML = `
    <section class="town-map-panel" aria-label="Миникарта">
      <div class="town-map-title">ЗАРЕЧЕНСК</div>
      <div class="town-map-location"></div>
      <div class="town-map-frame"><canvas class="town-map" role="img" aria-label="Карта квартала с положением игрока и входами в здания"></canvas><span class="town-map-north" aria-hidden="true">С</span></div>
      <div class="town-map-legend"><span><i class="town-door-dot"></i> Вход</span><span><i class="town-player-dot"></i> Вы</span><span class="town-map-count">${TOWN_BUILDINGS.length} зданий</span></div>
      <div class="town-zoom-controls" role="group" aria-label="Масштаб вида">
        <button type="button" data-zoom="out" aria-label="Отдалить" title="Отдалить (−)">−</button>
        <button type="button" data-zoom="reset" class="town-zoom-percent" aria-label="Сбросить масштаб" title="Сбросить масштаб (Home)">100%</button>
        <button type="button" data-zoom="in" aria-label="Приблизить" title="Приблизить (+)">+</button>
      </div>
    </section>
    <div class="town-controls">
      <button type="button" class="town-interaction town-action-button" aria-live="polite"><kbd>E</kbd><span class="town-interaction-label"></span></button>
      <div class="town-control-line"><span><kbd>WASD</kbd><span class="town-arrow-keys"> / ↑←↓→</span> движение</span><span class="town-zoom-hint">Колесо / + − · масштаб</span></div>
    </div>`;
  const canvas = hud.querySelector<HTMLCanvasElement>('.town-map');
  const location = hud.querySelector<HTMLElement>('.town-map-location');
  const action = hud.querySelector<HTMLButtonElement>('.town-interaction');
  const actionLabel = hud.querySelector<HTMLElement>('.town-interaction-label');
  if (!canvas || !location || !action || !actionLabel) throw new Error('Town HUD markup is incomplete');
  container.append(hud);
  const render = (state: TownWorld): void => {
    location.textContent = state.interior?.name ?? 'Садовый квартал';
    const available = state.interior ? state.canExit : state.nearbyBuilding !== null;
    action.disabled = !available;
    action.classList.toggle('town-interaction-available', available);
    if (state.interior) {
      actionLabel.textContent = state.canExit ? 'Выйти на улицу' : 'Выход у открытой стены';
    } else {
      actionLabel.textContent = state.nearbyBuilding ? `Войти · ${state.nearbyBuilding.name}` : 'Подойдите к двери · E или кнопка для входа';
    }
    drawMinimap(canvas, state);
  };
  const unsubscribe = world.subscribe(render);
  const zoomPercent = hud.querySelector<HTMLElement>('.town-zoom-percent');
  const unsubscribeZoom = zoom.subscribe(state => {
    if (zoomPercent) zoomPercent.textContent = `${state.percent}%`;
  });
  const click = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button');
    if (!button) return;
    if (button === action) world.interact();
    else if (button.dataset.zoom === 'reset') zoom.reset();
    else if (button.dataset.zoom) zoom.adjust(button.dataset.zoom === 'in' ? -.2 : .2);
  };
  hud.addEventListener('click', click);
  const resize = (): void => drawMinimap(canvas, world);
  window.addEventListener('resize', resize);
  return () => {
    unsubscribe();
    unsubscribeZoom();
    hud.removeEventListener('click', click);
    window.removeEventListener('resize', resize);
    hud.remove();
  };
}

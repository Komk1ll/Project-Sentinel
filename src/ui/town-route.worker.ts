import type { TownBuilding } from '@content/town';
import type { TownPosition } from '@game/systems/town-world';
import { walkingRoute } from '@game/systems/town-navigation';

export interface RouteRequest {
  readonly start: TownPosition;
  readonly goal: TownPosition;
  readonly interior: TownBuilding | null;
}

self.addEventListener('message', (event: MessageEvent<RouteRequest>) => {
  const { start, goal, interior } = event.data;
  self.postMessage(walkingRoute(start, goal, interior));
});

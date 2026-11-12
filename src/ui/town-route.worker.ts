import type { TownBuilding } from '@content/town';
import type { CarPose, TownPosition } from '@game/systems/town-world';
import { walkingRoute } from '@game/systems/town-navigation';

export interface RouteRequest {
  readonly start: TownPosition;
  readonly goal: TownPosition;
  readonly interior: TownBuilding | null;
  readonly cars?: readonly CarPose[];
}

self.addEventListener('message', (event: MessageEvent<RouteRequest>) => {
  const { start, goal, interior, cars } = event.data;
  self.postMessage(walkingRoute(start, goal, interior, cars));
});

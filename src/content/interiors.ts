import type { TownBuilding } from '@content/town';
import type { TownObstacle } from '@content/town-props';

export type FloorFinish = 'wood' | 'tile' | 'concrete';
export type FurnitureKind = 'bed' | 'sofa' | 'table' | 'kitchen' | 'fridge' | 'wardrobe'
  | 'shelf' | 'desk' | 'counter' | 'exam-bed' | 'workbench' | 'crate' | 'display';

export interface InteriorFurniture extends TownObstacle {
  readonly id: string;
  readonly kind: FurnitureKind;
  readonly height: number;
}

export interface InteriorPartition extends TownObstacle {
  readonly height: number;
}

export interface InteriorRoom extends TownObstacle {
  readonly name: string;
  readonly center: { readonly x: number; readonly z: number };
  readonly finish: FloorFinish;
}

export interface InteriorLayout {
  readonly palette: { readonly floor: number; readonly wall: number; readonly wood: number; readonly fabric: number };
  readonly floorFinish: FloorFinish;
  readonly rooms: readonly InteriorRoom[];
  readonly furniture: readonly InteriorFurniture[];
  readonly partitions: readonly InteriorPartition[];
  readonly obstacles: readonly TownObstacle[];
}

// The broad doorway at z=.2 joins the left room to the central circulation path.
const PARTITIONS: readonly InteriorPartition[] = [
  { x: -1, z: -2.4, width: .14, depth: 3.2, height: 2.8 },
  { x: -1, z: 2.6, width: .14, depth: 2.8, height: .65 },
];
const cache = new Map<string, InteriorLayout>();

export function getInteriorLayout(building: TownBuilding): InteriorLayout {
  const existing = cache.get(building.id);
  if (existing) return existing;
  const variant = [...building.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 3;
  const furniture: InteriorFurniture[] = [];
  const add = (kind: FurnitureKind, x: number, z: number, width: number, depth: number, height: number): void => {
    furniture.push({ id: `${kind}-${furniture.length}`, kind, x, z, width, depth, height });
  };
  let names: readonly [string, string, string];
  let floorFinish: FloorFinish = 'tile';
  const palette = {
    floor: [0x87715a, 0x8c806b, 0x756450][variant] ?? 0x87715a,
    wall: [0xbbb8a6, 0xaeb7aa, 0xc0b4a1][variant] ?? 0xbbb8a6,
    wood: [0x66513c, 0x756349, 0x594a3e][variant] ?? 0x66513c,
    fabric: [0x61736a, 0x7a6357, 0x626b79][variant] ?? 0x61736a,
  };

  switch (building.kind) {
    case 'home':
      names = ['Bedroom', 'Living room', 'Kitchen'];
      floorFinish = 'wood';
      add('bed', -3.6, -2 + variant * .1, 1.8, 2.7, .65);
      add('wardrobe', -4, 2.7, 1.4, .75, 2.1);
      add('desk', -2.3, -2.6, .65, .75, .8);
      add('sofa', 3.8, 1.7, 1.1, 2.3, .9);
      add('table', 2.2, 1.7, .85, 1.15, .42);
      add('kitchen', 1.9, -3.45, 4.8, .7, .9);
      add('fridge', 4.25, -2.75, .85, .9, 1.85);
      add('table', 2.7 + variant * .15, -1.45, 1.2, 1, .78);
      break;
    case 'cafe':
      names = ['Kitchen', 'Dining room', 'Coffee bar'];
      add('kitchen', -3.3, -3.4, 2.7, .8, .9);
      add('workbench', -3.7, -1.8, 1.8, 1.1, .9);
      add('fridge', -4.1, 2.65, .9, .9, 1.85);
      add('counter', 2, -3.35, 4.8, .85, 1);
      add('table', 3.35, -1.25, 1.65, 1.65, .8);
      add('table', 3.35, 1.8, 1.65, 1.65, .8);
      add('display', 4.45, 3.2, .6, .7, 1.1);
      break;
    case 'clinic':
      names = ['Treatment room', 'Waiting room', 'Reception'];
      palette.wall = 0xb3c3bc;
      add('exam-bed', -3.6, -2, 1.6, 2.5, .9);
      add('wardrobe', -4.1, 2.65, 1.1, .75, 1.9);
      add('counter', 2, -3.4, 4.5, .8, 1.05);
      add('desk', 3.1, -1.35, 1.7, .9, .85);
      add('sofa', 3.85, 1.8, 1.05, 2.4, .82);
      add('display', -2.25, -3.45, .65, .65, 1.65);
      break;
    case 'workshop':
      names = ['Repair bay', 'Workshop', 'Parts store'];
      floorFinish = 'concrete';
      add('workbench', -3.5, -2.4, 2.2, 1.4, .95);
      add('shelf', -4.2, 2.5, .7, 1.5, 2);
      add('crate', -2.3, -3.4, .8, .8, .9);
      add('shelf', 2, -3.4, 4.4, .75, 2.15);
      add('workbench', 3.4, -1.15, 1.8, 1.2, .95);
      add('crate', 3.85, 2.5, 1.1, 1.1, 1.1);
      break;
    case 'library':
      names = ['Archive', 'Reading room', 'Book collection'];
      floorFinish = 'wood';
      add('shelf', -3.35, -3.4, 2.7, .65, 2.2);
      add('shelf', -4.4, -.8, .65, 2.5, 2.2);
      add('crate', -4, 2.7, 1, .9, .65);
      add('shelf', 2, -3.4, 4.5, .7, 2.2);
      add('shelf', 4.4, -1, .65, 2.5, 2.2);
      add('desk', 2.8, 1.7, 1.8, 1.2, .8);
      add('display', 3.9, 3.1, .7, .7, 1.2);
      break;
    case 'townhall':
      names = ['Records office', 'Public reception', 'Office'];
      floorFinish = 'wood';
      add('desk', -3.4, -2.1, 2, 1.15, .8);
      add('wardrobe', -4.1, 2.65, 1.1, .7, 2.2);
      add('shelf', -3.25, -3.45, 2.6, .65, 2.1);
      add('wardrobe', 2, -3.4, 4.1, .7, 2.1);
      add('desk', 3, -1.3, 2, 1.2, .8);
      add('sofa', 3.85, 2, 1.05, 2.15, .9);
      break;
    case 'shop':
      names = ['Stockroom', 'Shop floor', 'Checkout'];
      add('shelf', -3.4, -3.4, 2.7, .75, 2.1);
      add('crate', -3.7, -1.6, 1.8, 1.2, 1.1);
      add('crate', -4, 2.7, 1.1, 1.1, 1.15);
      add('counter', 2, -3.4, 4.5, .8, .95);
      add('shelf', 3, -1.1, 1.1, 2.3, 1.6);
      add('display', 3.65, 2.2, 1.5, 1.4, 1.2);
      break;
  }

  const rooms: readonly InteriorRoom[] = [
    { name: names[0], x: -3, z: 0, width: 4, depth: 8, center: { x: -2.75, z: .75 }, finish: building.kind === 'home' ? 'wood' : floorFinish },
    { name: names[1], x: 2, z: 1.4, width: 6, depth: 5.2, center: { x: 1.25, z: 2.5 }, finish: floorFinish },
    { name: names[2], x: 2, z: -2.6, width: 6, depth: 2.8, center: { x: 1, z: -1.25 }, finish: building.kind === 'home' || building.kind === 'cafe' ? 'tile' : floorFinish },
  ];
  const layout: InteriorLayout = { palette, floorFinish, rooms, furniture, partitions: PARTITIONS, obstacles: [...furniture, ...PARTITIONS] };
  cache.set(building.id, layout);
  return layout;
}

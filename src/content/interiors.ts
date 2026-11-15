import { MASTER, MEDIC } from '@content/first-aid';
import type { TownBuilding } from '@content/town';
import type { TownObstacle } from '@content/town-props';

export type FloorFinish = 'wood' | 'tile' | 'concrete';
export type FurnitureKind = 'bed' | 'sofa' | 'table' | 'kitchen' | 'fridge' | 'wardrobe'
  | 'shelf' | 'desk' | 'counter' | 'exam-bed' | 'workbench' | 'crate' | 'display' | 'piano' | 'oven';

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

export const STAIR_LANDING = { x: .05, z: .35 } as const;

type FloorPlan = {
  readonly name: string;
  readonly rooms: readonly [string, string, string];
  readonly accent: number;
  readonly furniture: readonly [FurnitureKind, number, number, number, number, number][];
};

const UPPER_FLOORS: Readonly<Record<string, readonly FloorPlan[]>> = {
  'home-1': [{ name: 'Семейная спальня', rooms: ['Спальня', 'Детская', 'Учебный уголок'], accent: 0x9b6c55,
    furniture: [['bed',-3.6,-2,1.65,2.5,.65],['wardrobe',-3.9,2.8,1.55,.7,2],
      ['bed',3.9,1.85,1.25,2.25,.57],['shelf',4,-3.43,1.45,.65,1.8],['desk',2,-2.95,1.6,.85,.78]] }],
  'home-3': [{ name: 'Ателье и библиотека', rooms: ['Библиотека', 'Мастерская', 'Швейный уголок'], accent: 0x557d72,
    furniture: [['shelf',-3.3,-3.4,2.7,.72,2.15],['sofa',-4.1,-.9,.95,2.0,.9],
      ['workbench',3.6,1.5,1.65,1.25,.9],['desk',2.3,-3.25,2.3,.9,.8],['crate',4.1,-1.7,1,.75,.55]] }],
  'home-7': [{ name: 'Гостевая и музыкальная', rooms: ['Гостевая', 'Музыкальная', 'Кабинет'], accent: 0x66769b,
    furniture: [['bed',-3.55,-2.1,1.7,2.4,.68],['shelf',-4,2.9,1.55,.64,1.7],
      ['piano',4.03,1.55,1,2.35,1.05],['desk',2.8,-3.25,2.4,.9,.82],['sofa',4.03,-1.25,.93,1.7,.85]] }],
  cafe: [{ name: 'Чайный зал', rooms: ['Лаунж', 'Чайный зал', 'Буфет'], accent: 0x9f6e4c,
    furniture: [['sofa',-4.05,-1.6,.95,2.6,.9],['table',-2.9,-2.1,.85,1.2,.47],
      ['table',3.4,1.6,1.65,1.65,.8],['counter',2.4,-3.35,3.8,.8,.95],['display',4.3,-1.4,.6,.8,1.15]] }],
  clinic: [
    { name: 'Кабинеты осмотра', rooms: ['Смотровая', 'Ожидание', 'Кабинет врача'], accent: 0x65938d,
      furniture: [['exam-bed',-3.55,-2.1,1.55,2.5,.9],['wardrobe',-4,2.8,1.45,.7,1.9],
        ['sofa',3.85,1.7,1,2.3,.83],['desk',2.6,-3.1,2.1,.9,.85],['display',4.25,-1.45,.7,.85,1.35]] },
    { name: 'Восстановление', rooms: ['Палата', 'Зал восстановления', 'Склад'], accent: 0x6a7e9c,
      furniture: [['exam-bed',-3.6,-2.1,1.55,2.45,.82],['table',-3.95,2.7,1.1,.65,.68],
        ['exam-bed',3.75,1.4,1.6,2.55,.82],['shelf',2.35,-3.35,3.1,.72,2.1],['crate',4.15,-1.85,1,.9,.65]] }],
  library: [{ name: 'Тихий читальный зал', rooms: ['Архив', 'Читальный зал', 'Редкие книги'], accent: 0x737b4f,
    furniture: [['shelf',-3.35,-3.42,2.75,.7,2.2],['shelf',-4.28,-1.2,.7,2.1,2.2],
      ['table',3.0,1.5,1.9,1.75,.78],['shelf',2.3,-3.43,3.45,.7,2.2],['display',4.3,-1.55,.7,.85,1.32]] }],
  townhall: [
    { name: 'Зал совещаний', rooms: ['Переговорная', 'Зал совещаний', 'Канцелярия'], accent: 0x805d52,
      furniture: [['desk',-3.55,-2.7,2.2,1,.82],['sofa',-4.1,2.2,.85,1.6,.85],
        ['table',3.05,1.45,2.6,2.2,.82],['wardrobe',2.6,-3.45,3.3,.7,2.12]] },
    { name: 'Городской архив', rooms: ['Документы', 'Рабочий зал', 'Картотека'], accent: 0x85734e,
      furniture: [['shelf',-3.38,-3.42,2.8,.7,2.2],['shelf',-4.27,-1.1,.7,2.1,2.2],
        ['desk',3.2,1.7,2.1,1.15,.82],['wardrobe',2.5,-3.42,3.55,.7,2.2],['crate',4.17,-1.6,1.05,.85,.7]] }],
  bakery: [{ name: 'Пекарский цех', rooms: ['Тесто', 'Упаковка', 'Печи'], accent: 0xa4774d,
    furniture: [['workbench',-3.55,-2.45,2.2,1.25,.92],['shelf',-4.25,2.6,.7,1.55,1.8],
      ['workbench',3.65,1.6,1.75,1.2,.92],['oven',2.3,-3.25,3.25,.9,1.2],['crate',4.2,-1.5,.95,.9,.7]] }],
  post: [{ name: 'Сортировка посылок', rooms: ['Хранение', 'Сортировка', 'Отправления'], accent: 0x5c7991,
    furniture: [['shelf',-3.45,-3.4,2.65,.72,2.2],['crate',-3.65,-1.7,1.65,1.15,1.02],
      ['workbench',3.3,1.65,2.25,1.35,.9],['shelf',2.4,-3.4,3.6,.72,2.2],['crate',4.15,-1.65,1.2,1.1,.94]] }],
};

const GROUND_FLOOR_NAMES: Readonly<Record<string, string>> = {
  'home-1': 'Семейная квартира', 'home-3': 'Квартира мастера', 'home-7': 'Квартира музыканта',
  cafe: 'Кофейня', clinic: 'Регистратура', library: 'Абонемент',
  townhall: 'Приёмная', bakery: 'Пекарня', post: 'Почтовое отделение',
};

export function interiorFloorName(building: TownBuilding, floor: number): string {
  return UPPER_FLOORS[building.id]?.[floor - 1]?.name ?? GROUND_FLOOR_NAMES[building.id] ?? 'Первый этаж';
}

export const HOME_LAMP = { x: 2.2, z: 1.7 } as const;

export interface InteriorLayout {
  readonly palette: { readonly floor: number; readonly wall: number; readonly wood: number; readonly fabric: number };
  readonly floorFinish: FloorFinish;
  readonly rooms: readonly InteriorRoom[];
  readonly furniture: readonly InteriorFurniture[];
  readonly partitions: readonly InteriorPartition[];
  readonly actors: readonly TownObstacle[];
  readonly obstacles: readonly TownObstacle[];
}

// The broad doorway at z=.2 joins the left room to the central circulation path.
const PARTITIONS: readonly InteriorPartition[] = [
  { x: -1, z: -2.4, width: .14, depth: 3.2, height: 2.8 },
  { x: -1, z: 2.6, width: .14, depth: 2.8, height: .65 },
];
const cache = new Map<string, InteriorLayout>();

export function getInteriorLayout(building: TownBuilding, floor = 0): InteriorLayout {
  const key = building.id + ':' + floor;
  const existing = cache.get(key);
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

  const upper = UPPER_FLOORS[building.id]?.[floor - 1];
  if (upper) {
    names = upper.rooms;
    floorFinish = building.kind === 'clinic' ? 'tile' : 'wood';
    palette.fabric = upper.accent;
    for (const item of upper.furniture) add(...item);
  } else switch (building.kind) {
    case 'lighthouse':
      names = ['Кладовая', 'Зал смотрителя', 'Радиорубка'];
      floorFinish = 'wood';
      palette.wall = 0xc3c8b9;
      palette.fabric = 0x43746e;
      add('shelf', -3.2, -3.4, 2.8, .7, 2.1);
      add('crate', -3.8, -1.6, 1.3, 1.1, .75);
      add('desk', 2.5, -3.1, 2.7, .95, .82);
      add('display', 4.2, -1.4, .85, .8, 1.6);
      add('sofa', 3.85, 1.7, 1.05, 2.1, .85);
      break;
    case 'home':
      names = ['Спальня', 'Гостиная', 'Кухня'];
      floorFinish = 'wood';
      add('bed', -3.6, -2 + variant * .1, 1.8, 2.7, .65);
      if (building.id === 'home-3') add('workbench', -3.78, 2.65, 1.75, .85, .89);
      else add('wardrobe', -4, 2.7, 1.4, .75, 2.1);
      if (building.id === 'home-3') add('shelf', -2.3, -2.6, .65, .75, 1.6);
      else add('desk', -2.3, -2.6, .65, .75, .8);
      add('sofa', 3.8, 1.7, 1.1, building.id === 'home-7' ? 1.85 : 2.3, .9);
      add('table', 2.2, 1.7, .85, 1.15, .42);
      add('kitchen', 1.9, -3.45, 4.8, .7, .9);
      add('fridge', 4.25, -2.75, .85, .9, 1.85);
      if (building.id === 'home-7') add('piano', 3.8, -1.4, 1, 1.45, 1.02);
      else add('table', 2.7 + variant * .15, -1.45, 1.2, 1, .78);
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
  const actors: readonly TownObstacle[] = (floor === 0 ? [MASTER, MEDIC] : []).filter(actor => actor.buildingId === building.id);
  const layout: InteriorLayout = { palette, floorFinish, rooms, furniture, partitions: PARTITIONS, actors, obstacles: [...furniture, ...PARTITIONS, ...actors] };
  cache.set(key, layout);
  return layout;
}

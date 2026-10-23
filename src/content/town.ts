export type BuildingKind = 'home' | 'shop' | 'cafe' | 'clinic' | 'workshop' | 'library' | 'townhall';

export interface TownBuilding {
  readonly id: string;
  readonly name: string;
  readonly kind: BuildingKind;
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
  readonly floors: number;
  readonly color: number;
  readonly roof: number;
}

export const TOWN_SIZE = 64;
export const ROAD_CENTERS = [16, 32, 48] as const;
export const PARK = { x: 24, z: 24, width: 12, depth: 12 } as const;
export const TOWN_SPAWN = { x: 32, z: 35 } as const;

// Editable lots keep the town layout independent from rendering and future quests.
export const TOWN_BUILDINGS: readonly TownBuilding[] = [
  { id: 'station', name: 'Мастерская «Маяк»', kind: 'workshop', x: 24, z: 40, width: 9, depth: 8, floors: 1, color: 0x9c8063, roof: 0x474f4e },
  { id: 'cafe', name: 'Кафе «Листва»', kind: 'cafe', x: 40, z: 24, width: 9, depth: 7, floors: 2, color: 0xb3916d, roof: 0x52554d },
  { id: 'clinic', name: 'Городская поликлиника', kind: 'clinic', x: 40, z: 40, width: 10, depth: 8, floors: 3, color: 0xa5aaa0, roof: 0x555b5a },
  { id: 'library', name: 'Библиотека', kind: 'library', x: 24, z: 8, width: 10, depth: 8, floors: 2, color: 0xb3a18b, roof: 0x51595b },
  { id: 'townhall', name: 'Районная администрация', kind: 'townhall', x: 40, z: 8, width: 10, depth: 8, floors: 3, color: 0xa69b89, roof: 0x4a5356 },
  { id: 'grocery', name: 'Продукты у дома', kind: 'shop', x: 8, z: 24, width: 9, depth: 7, floors: 1, color: 0x929c87, roof: 0x46534d },
  { id: 'home-1', name: 'Садовая, 1', kind: 'home', x: 6, z: 7, width: 5, depth: 8, floors: 3, color: 0xb7a38b, roof: 0x55514b },
  { id: 'home-2', name: 'Садовая, 3', kind: 'home', x: 11.5, z: 7, width: 4, depth: 8, floors: 2, color: 0x8f9b99, roof: 0x4c5753 },
  { id: 'home-3', name: 'Садовая, 7', kind: 'home', x: 56, z: 8, width: 9, depth: 8, floors: 4, color: 0xaca18e, roof: 0x535957 },
  { id: 'home-4', name: 'Лесная, 2', kind: 'home', x: 54, z: 24, width: 5, depth: 8, floors: 2, color: 0xa1866d, roof: 0x5b5147 },
  { id: 'home-5', name: 'Лесная, 4', kind: 'home', x: 60, z: 24, width: 4, depth: 7, floors: 2, color: 0xb0a99a, roof: 0x4a5559 },
  { id: 'home-6', name: 'Набережная, 5', kind: 'home', x: 8, z: 40, width: 9, depth: 9, floors: 4, color: 0xaaa293, roof: 0x51575a },
  { id: 'home-7', name: 'Набережная, 9', kind: 'home', x: 56, z: 40, width: 9, depth: 8, floors: 2, color: 0xaca080, roof: 0x515955 },
  { id: 'home-8', name: 'Тихий переулок, 1', kind: 'home', x: 6, z: 56, width: 5, depth: 7, floors: 2, color: 0x969d8d, roof: 0x4c5652 },
  { id: 'home-9', name: 'Тихий переулок, 3', kind: 'home', x: 12, z: 56, width: 4, depth: 7, floors: 1, color: 0xb09a82, roof: 0x59544a },
  { id: 'bakery', name: 'Пекарня «Тёплый хлеб»', kind: 'shop', x: 24, z: 56, width: 9, depth: 7, floors: 2, color: 0xb49a78, roof: 0x63534b },
  { id: 'home-10', name: 'Тихий переулок, 8', kind: 'home', x: 38, z: 56, width: 5, depth: 8, floors: 3, color: 0x9fa8a1, roof: 0x4b565b },
  { id: 'home-11', name: 'Тихий переулок, 10', kind: 'home', x: 44, z: 56, width: 4, depth: 8, floors: 2, color: 0xb4a38e, roof: 0x535753 },
  { id: 'post', name: 'Почтовое отделение', kind: 'shop', x: 55, z: 56, width: 8, depth: 7, floors: 2, color: 0x919d9c, roof: 0x515a60 },
];

export function buildingEntrance(building: TownBuilding): { x: number; z: number } {
  return { x: building.x, z: building.z + building.depth / 2 + 1 };
}

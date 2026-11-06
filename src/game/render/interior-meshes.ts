import * as THREE from 'three';
import type { TownBuilding } from '@content/town';
import { getInteriorLayout, HOME_LAMP, STAIR_LANDING, type FloorFinish, type InteriorFurniture } from '@content/interiors';

/** Roofless furnished rooms share every obstacle footprint with TownWorld. */
export function createInteriorMeshes(building: TownBuilding, floor = 0): THREE.Group {
  const room = new THREE.Group();
  room.name = `Interior: ${building.id} · ${floor + 1}`;
  const layout = getInteriorLayout(building, floor);
  const palette = layout.palette;
  const materials = new Map<number, THREE.MeshStandardMaterial>();
  const surface = (color: number): THREE.MeshStandardMaterial => {
    let value = materials.get(color);
    if (!value) {
      value = new THREE.MeshStandardMaterial({ color, roughness: .88 });
      materials.set(color, value);
    }
    return value;
  };
  const wood = surface(palette.wood);
  const wall = surface(palette.wall);
  const trim = surface(0xd5d0bd);
  const metal = surface(0x818c87);
  const dark = surface(0x303a39);
  const cloth = surface(palette.fabric);
  const linen = surface(0xd2cfbd);
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = h > .1;
    mesh.receiveShadow = true;
    room.add(mesh);
  };
  const floorSurface = (finish: FloorFinish, width: number, depth: number): THREE.MeshStandardMaterial => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = finish === 'wood' ? `#${new THREE.Color(palette.floor).getHexString()}` : finish === 'tile' ? '#9ea59b' : '#71766f';
      ctx.fillRect(0, 0, 256, 256);
      const tileWidth = finish === 'wood' ? 128 : 64;
      const tileHeight = finish === 'wood' ? 32 : 64;
      for (let y = 0; y < 256; y += tileHeight) for (let x = -128; x < 256; x += tileWidth) {
        const offset = finish === 'wood' && y % 64 ? 64 : 0;
        ctx.strokeStyle = 'rgba(30,34,27,.35)';
        ctx.strokeRect(x + offset, y, tileWidth, tileHeight);
        ctx.fillStyle = 'rgba(240,221,182,.08)';
        ctx.fillRect(x + offset + 2, y + 2, tileWidth - 4, 2);
        if (finish === 'wood') for (let grain = 0; grain < 5; grain += 1) {
          ctx.fillStyle = 'rgba(42,29,18,.07)';
          ctx.fillRect(x + offset + 8, y + 5 + grain * 5, 85 + grain * 3, 1);
        }
      }
      for (let index = 0; index < 1100; index += 1) {
        ctx.fillStyle = index % 2 ? 'rgba(20,25,18,.04)' : 'rgba(255,255,235,.04)';
        ctx.fillRect((index * 73 + 17) % 256, (index * 37 + Math.floor(index / 256) * 19) % 256, 2, 1);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(width / 2, depth / 2);
    return new THREE.MeshStandardMaterial({ map: texture, roughness: .95 });
  };
  box(10, .18, 8, 0, -.1, 0, dark);
  for (const zone of layout.rooms) box(zone.width, .035, zone.depth, zone.x, .002, zone.z, floorSurface(zone.finish, zone.width, zone.depth));
  // The +x,+z camera sees low front walls and full rear walls without a roof.
  box(10, 3, .18, 0, 1.5, -4, wall);
  box(.18, 3, 8, -5, 1.5, 0, wall);
  box(.18, .42, 8, 5, .21, 0, wall);
  for (const side of [-1, 1]) {
    box(4, .42, .18, side * 3, .21, 4, wall);
    box(.12, .14, 7.8, side * 4.86, .1, 0, wood);
    box(3.9, .14, .12, side * 3, .1, 3.86, wood);
  }
  box(9.8, .14, .12, 0, .1, -3.86, wood);
  box(10, .08, .22, 0, 3.03, -4, trim);
  box(.22, .08, 8, -5, 3.03, 0, trim);
  for (const partition of layout.partitions) {
    box(partition.width, partition.height, partition.depth, partition.x, partition.height / 2, partition.z, wall);
    box(.18, .13, partition.depth, partition.x, .1, partition.z, wood);
    box(.2, .06, partition.depth, partition.x, partition.height + .03, partition.z, trim);
  }
  for (const z of [-.8, 1.2]) box(.21, 2.8, .1, -1, 1.4, z, wood);
  box(.21, .16, 2.1, -1, 2.72, .2, wood);
  box(.28, .028, 2, -1, .03, .2, wood);
  box(1.6, .025, .75, 0, .035, 3.35, surface(0x494d45));

  const legs = (item: InteriorFurniture, height: number): void => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(.08, height, .08,
      item.x + sx * (item.width / 2 - .12), height / 2, item.z + sz * (item.depth / 2 - .12), dark);
  };
  const papers = (x: number, y: number, z: number): void => {
    box(.38, .025, .3, x, y, z, linen);
    for (let line = 0; line < 4; line += 1) box(.23, .004, .008, x, y + .016, z - .09 + line * .05, metal);
  };
  for (const item of layout.furniture) {
    const { x, z, width: w, depth: d, height: h } = item;
    switch (item.kind) {
      case 'bed':
      case 'exam-bed':
        legs(item, .28);
        box(w, .2, d, x, .35, z, item.kind === 'exam-bed' ? metal : wood);
        box(w - .08, .2, d - .08, x, .55, z, linen);
        box(w - .06, .08, d * .62, x, .69, z + d * .15, item.kind === 'exam-bed' ? surface(0x9fbab3) : cloth);
        box(w * .72, .14, .5, x, .73, z - d * .32, linen);
        box(w, .85, .08, x, .65, z - d / 2 + .04, wood);
        for (let fold = 0; fold < 3; fold += 1) box(w - .12, .01, .014, x, .735, z + d * .3 + fold * .07, metal);
        break;
      case 'sofa':
        box(w, .22, d, x, .24, z, wood);
        box(w * .78, .25, d * .88, x - w * .06, .47, z, cloth);
        box(w * .2, .72, d, x + w * .4, .53, z, cloth);
        for (const side of [-1, 1]) box(w, .5, .16, x, .48, z + side * (d / 2 - .08), cloth);
        for (let seat = 0; seat < 3; seat += 1) box(w * .68, .055, d * .25, x - w * .08, .63, z - d * .28 + seat * d * .28, cloth);
        break;
      case 'table':
      case 'desk':
      case 'workbench': {
        const seating = item.kind === 'table' && w > 1.5 && d > 1.5;
        const tabletopW = seating ? w * .7 : w;
        const tabletopD = seating ? d * .52 : d;
        legs({ ...item, width: tabletopW, depth: tabletopD }, h - .06);
        box(tabletopW, .09, tabletopD, x, h, z, item.kind === 'workbench' ? metal : wood);
        if (seating) for (const side of [-1, 1]) {
          box(.48, .08, .38, x, .42, z + side * d * .36, cloth);
          box(.48, .5, .07, x, .62, z + side * d * .46, wood);
          box(.35, .38, .28, x, .2, z + side * d * .36, wood);
        }
        if (item.kind === 'desk') {
          box(.16, .27, .14, x + w * .22, h + .18, z - d * .12, dark);
          box(.55, .38, .075, x + w * .22, h + .42, z - d * .15, dark);
          box(.47, .29, .018, x + w * .22, h + .42, z - d * .15 + .047, surface(0x718d87));
          box(.45, .025, .16, x + w * .22, h + .07, z + d * .22, dark);
          papers(x - w * .25, h + .07, z);
        } else if (item.kind === 'workbench') {
          box(.5, .28, .35, x - w * .2, h + .19, z, dark);
          box(.07, .08, .55, x + w * .25, h + .1, z, metal);
          box(.16, .25, .16, x + w * .1, h + .18, z - d * .23, surface(0x9b8050));
        } else {
          papers(x - w * .14, h + .07, z);
          box(.12, .13, .12, x + w * .2, h + .12, z, linen);
        }
        break;
      }
      case 'shelf': {
        const sideFacing = w < d;
        const span = sideFacing ? d : w;
        for (const side of [-1, 1]) box(sideFacing ? w : .08, h, sideFacing ? .08 : d,
          x + (sideFacing ? 0 : side * (w / 2 - .04)), h / 2, z + (sideFacing ? side * (d / 2 - .04) : 0), wood);
        for (let level = 0; level < 5; level += 1) {
          const y = .12 + level * (h - .2) / 4;
          box(w, .065, d, x, y, z, wood);
          if (level === 4) continue;
          const count = Math.max(2, Math.floor(span / .22));
          for (let index = 0; index < count; index += 1) {
            const along = -span / 2 + .17 + index * (span - .3) / count;
            const bookHeight = .22 + (index % 3) * .035;
            box(sideFacing ? w * .72 : .14, bookHeight, sideFacing ? .14 : d * .72,
              x + (sideFacing ? .02 : along), y + bookHeight / 2 + .05, z + (sideFacing ? along : .02),
              surface([0x6c735c, 0x7e5647, 0x597171, 0xa1936c][(index + level) % 4] ?? 0x597171));
          }
        }
        break;
      }
      case 'kitchen':
      case 'counter': {
        box(w, h - .12, d, x, (h - .12) / 2, z, wood);
        box(w, .1, d, x, h, z, item.kind === 'kitchen' ? surface(0xc1c0ad) : dark);
        const panels = Math.max(2, Math.floor(w / .7));
        for (let panel = 0; panel < panels; panel += 1) {
          const px = x - w / 2 + (panel + .5) * w / panels;
          box(w / panels - .04, h - .25, .025, px, h * .47, z + d / 2 - .015, surface(palette.wood + 0x101010));
          box(.15, .035, .045, px, h * .7, z + d / 2 - .005, metal);
        }
        if (item.kind === 'kitchen') {
          box(.65, .018, d * .66, x - w * .23, h + .06, z, metal);
          box(.49, .025, d * .47, x - w * .23, h + .072, z, dark);
          box(.035, .3, .035, x - w * .23, h + .2, z - d * .29, metal);
          box(.09, .03, .15, x - w * .23, h + .34, z - d * .2, metal);
          box(.75, .035, d * .76, x + w * .26, h + .075, z, dark);
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(.16, .018, .13, x + w * .26 + sx * .18, h + .105, z + sz * d * .19, metal);
        } else {
          box(.38, .26, .3, x + w * .3, h + .18, z, dark);
          papers(x - w * .12, h + .07, z);
        }
        break;
      }
      case 'fridge':
        box(w, h, d, x, h / 2, z, surface(0xc3c9bd));
        box(w - .06, h * .27, .035, x, h * .84, z + d / 2 - .0175, linen);
        box(w - .06, h * .66, .035, x, h * .35, z + d / 2 - .0175, linen);
        box(.035, .32, .045, x - w * .3, h * .55, z + d / 2 - .005, metal);
        break;
      case 'wardrobe':
        box(w, h, d, x, h / 2, z, wood);
        for (const side of [-1, 1]) {
          box(w / 2 - .055, h - .14, .025, x + side * w / 4, h / 2, z + d / 2 - .015, surface(palette.wood + 0x111111));
          box(.035, .22, .045, x + side * .08, h * .49, z + d / 2 - .005, metal);
        }
        break;
      case 'crate':
        box(w, h, d, x, h / 2, z, wood);
        for (const side of [-1, 1]) for (const y of [h * .25, h * .75]) box(w, .07, .035, x, y, z + side * (d / 2 - .0175), metal);
        box(w * .4, .22, .01, x, h * .55, z + d / 2 - .005, linen);
        break;
      case 'piano':
        box(w, h, d, x, h / 2, z, dark);
        box(.25, .12, d * .91, x - w / 2 + .06, h * .66, z, wood);
        for (let i = 0; i < 16; i++) {
          const keyZ = z + (i - 7.5) * d / 18;
          box(.23, .025, d / 21, x - w / 2 + .035, h * .74, keyZ, linen);
          if (i % 3 !== 1) box(.12, .04, d / 35, x - w / 2 + .08, h * .76, keyZ + d / 40, dark);
        }
        break;
      case 'oven':
        box(w, h, d, x, h / 2, z, metal);
        for (const side of [-1, 1]) {
          box(w * .42, h * .62, .045, x + side * w * .24, h * .43, z + d / 2, dark);
          box(w * .32, h * .3, .035, x + side * w * .24, h * .47, z + d / 2 + .03, surface(0x9e7254));
          box(w * .24, .045, .06, x + side * w * .24, h * .73, z + d / 2 + .05, trim);
        }
        break;
      case 'display':
        box(w, h * .75, d, x, h * .375, z, wood);
        box(w, .06, d, x, h * .78, z, metal);
        for (let index = 0; index < 3; index += 1) box(w * .19, h * .2, d * .55,
          x - w * .29 + index * w * .29, h * .9, z, surface([0x8d6d4f, 0x788169, 0xa29267][index] ?? 0x788169));
        break;
    }
  }

  // Wall fixtures remain behind the playable inset, avoiding hidden obstacles.
  const glass = new THREE.MeshStandardMaterial({ color: 0x9caeaa, emissive: 0x53685d, emissiveIntensity: .16, roughness: .35 });
  for (const z of [-1.1, 1.9]) {
    box(.045, 1.25, 1.45, -4.88, 1.98, z, dark);
    box(.05, 1.1, 1.3, -4.84, 1.98, z, glass);
    box(.06, .055, 1.32, -4.84, 1.98, z, trim);
    box(.06, 1.12, .05, -4.84, 1.98, z, trim);
    box(.12, .07, 1.55, -4.86, 1.34, z, trim);
    for (let fin = 0; fin < 8; fin += 1) box(.12, .53, .095, -4.88, .67, z - .6 + fin * .17, trim);
    box(.1, .04, 1.45, -4.83, .4, z, metal);
  }
  box(1, .8, .045, 2.7, 2.02, -3.87, wood);
  box(.83, .63, .05, 2.7, 2.02, -3.84, cloth);
  box(.45, .08, .012, 2.7, 1.88, -3.81, metal);
  box(.75, .04, .012, 2.7, 2.12, -3.81, linen);
  if (building.kind === 'home' && floor === 0) {
    const rug = surface(0xa97660);
    box(2.35, .014, 2.85, 2.25, .03, 1.63, rug);
    box(2.19, .012, 2.68, 2.25, .039, 1.63, cloth);
    for (const side of [-1, 1]) {
      box(.062, .01, 2.47, 2.25 + side * .96, .048, 1.63, trim);
      box(2.05, .01, .055, 2.25, .048, 1.63 + side * 1.23, trim);
      box(.29, .23, .37, 3.61, .69, 1.7 + side * .61, side > 0 ? rug : linen);
    }

    for (const z of [-1.1, 1.9]) for (const side of [-1, 1]) {
      box(.09, 1.36, .31, -4.76, 2.01, z + side * .61, cloth);
      box(.11, .055, .32, -4.74, 1.78, z + side * .61, trim);
    }
    for (const [x, z] of [[-.15, -3.7], [3.65, -3.7]]) {
      box(.26, .25, .26, x!, 1.16, z!, surface(0xa46246));
      for (let leaf = 0; leaf < 4; leaf++)
        box(.1, .28, .11, x! + Math.sin(leaf * 2.4) * .12, 1.38 + leaf * .045, z! + Math.cos(leaf * 2.4) * .08, surface(0x688454));
    }

    box(.24, .045, .22, HOME_LAMP.x + .17, .49, HOME_LAMP.z - .31, dark);
    box(.04, .23, .04, HOME_LAMP.x + .17, .60, HOME_LAMP.z - .31, dark);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.115, .19, .19, 10),
      new THREE.MeshStandardMaterial({ color: 0xe8c795, emissive: 0xfac577, emissiveIntensity: 0 }));
    shade.name = 'home-lamp-shade';
    shade.position.set(HOME_LAMP.x + .17, .78, HOME_LAMP.z - .31);
    room.add(shade);
    const lamp = new THREE.PointLight(0xffcc80, 5, 4, 2);
    lamp.name = 'home-lamp';
    lamp.position.set(HOME_LAMP.x + .17, .73, HOME_LAMP.z - .31);
    lamp.visible = false;
    room.add(lamp);
  }
  if (building.kind === 'lighthouse') {
    box(.72, .25, .35, 2.9, 1, -3.14, dark);
    for (let index = 0; index < 4; index++)
      box(.1, .065, .025, 2.66 + index * .15, 1.03, -2.95, surface(index === 0 ? 0xc78b51 : 0x73948d));
    box(.035, .38, .035, 3.15, 1.21, -3.21, metal);
    box(1.65, 1.05, .05, .85, 2.03, -3.86, wood);
    box(1.47, .89, .035, .85, 2.03, -3.82, surface(0x789a9d));
    box(.71, .53, .025, 1.01, 2.03, -3.79, surface(0xa8b68a));
  }
  const light = new THREE.PointLight(0xffd4a3, 16, 13, 2);
  light.position.set(1, 2.8, .5);
  room.add(light);
  if (floor > 0) {
    box(1.8, .018, 1.6, 1.54, .036, 2.6, cloth);
    box(1.65, .015, 1.45, 1.54, .046, 2.6, surface(0x9a8a75));
    box(1.15, .01, .95, 1.54, .054, 2.6, cloth);
  }
  if (floor === 0) {
    const exit = new THREE.Mesh(new THREE.RingGeometry(.3, .43, 32), new THREE.MeshBasicMaterial({ color: 0x80b7a4, transparent: true, opacity: .6, depthWrite: false }));
    exit.rotation.x = -Math.PI / 2;
    exit.position.set(0, .055, 3);
    room.add(exit);
  }
  return room;
}

/** Compact stair flight and landing shared by generated and authored rooms. */
export function createInteriorStairs(): THREE.Group {
  const stairs = new THREE.Group();
  stairs.name = 'interior-stairs';
  const wood = new THREE.MeshStandardMaterial({ color: 0x806046, roughness: .85 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xc7a579, roughness: .85 });
  for (let i = 0; i < 5; i++) {
    const height = .14 + i * .15;
    const step = new THREE.Mesh(new THREE.BoxGeometry(.82, height, .235), i % 2 ? wood : trim);
    step.position.set(-.43, height / 2, -.31 - i * .23);
    step.castShadow = step.receiveShadow = true;
    stairs.add(step);
  }
  const landing = new THREE.Mesh(new THREE.RingGeometry(.27, .39, 28),
    new THREE.MeshBasicMaterial({ color: 0xe1b881, side: THREE.DoubleSide }));
  landing.rotation.x = -Math.PI / 2;
  landing.position.set(STAIR_LANDING.x, .065, STAIR_LANDING.z);
  stairs.add(landing);
  return stairs;
}

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROAD_CENTERS, TOWN_BUILDINGS, TOWN_SIZE, type TownBuilding } from '@content/town';
import { TOWN_CARS } from '@content/town-props';

/** Metre-scale scenery. Never stretch imported buildings to fit unrelated lots. */
export function createWebTown(assets?: ReadonlyMap<string, THREE.Group>): THREE.Group {
  const town = new THREE.Group();
  town.name = 'web-town';
  const materials = new Map<number, THREE.MeshStandardMaterial>();
  const mat = (color: number): THREE.MeshStandardMaterial => {
    let material = materials.get(color);
    if (!material) { material = new THREE.MeshStandardMaterial({ color, roughness: .8 }); materials.set(color, material); }
    return material;
  };
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function box(parent: THREE.Group, name: string, color: number, x: number, y: number, z: number, w: number, h: number, d: number): THREE.Mesh {
    const mesh = new THREE.Mesh(cube, mat(color));
    mesh.name = name; mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    mesh.castShadow = h > .25; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function batch(group: THREE.Group): void {
    const groups = new Map<THREE.Material, THREE.Mesh[]>();
    group.children.forEach(child => {
      if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) return;
      const list = groups.get(child.material) ?? []; list.push(child); groups.set(child.material, list);
    });
    for (const [material, meshes] of groups) {
      const parts = meshes.map(mesh => { mesh.updateMatrix(); return mesh.geometry.clone().applyMatrix4(mesh.matrix); });
      const geometry = mergeGeometries(parts);
      parts.forEach(part => part.dispose());
      if (!geometry) throw new Error('Town material batching failed');
      const merged = new THREE.Mesh(geometry, material);
      merged.name = 'batch'; merged.castShadow = meshes.some(mesh => mesh.castShadow); merged.receiveShadow = true;
      meshes.forEach(mesh => group.remove(mesh)); group.add(merged);
    }
  }
  const ground = new THREE.Group(); ground.name = 'street-surfaces'; town.add(ground);
  box(ground, 'ground', 0x8ba474, 32, -.14, 32, TOWN_SIZE, .24, TOWN_SIZE);
  // Split horizontal strips at vertical roads: no coplanar intersection flicker.
  const segments = (half: number): [number, number][] => {
    const result: [number, number][] = []; let start = 0;
    for (const road of ROAD_CENTERS) { result.push([start, road-half]); start = road+half; }
    result.push([start, 64]); return result;
  };
  for (const road of ROAD_CENTERS) {
    box(ground, 'pavement', 0xd8d1b9, road, -.035, 32, 6.6, .06, 64);
    for (const [a, b] of segments(3.3)) box(ground, 'pavement', 0xd8d1b9, (a+b)/2, -.035, road, b-a, .06, 6.6);
    box(ground, 'road', 0x687978, road, -.006, 32, 4.1, .012, 64);
    for (const [a, b] of segments(2.05)) box(ground, 'road', 0x687978, (a+b)/2, -.006, road, b-a, .012, 4.1);
    for (let k = 2; k < 64; k += 3) if (!ROAD_CENTERS.some(c => Math.abs(c-k) < 4)) {
      box(ground, 'lane', 0xeee4cd, road, .003, k, .07, .004, .8);
      box(ground, 'lane', 0xeee4cd, k, .003, road, .8, .004, .07);
    }
    for (const cross of ROAD_CENTERS) for (let i = 0; i < 5; i++) {
      box(ground, 'crosswalk', 0xeee4cd, road-1.6+i*.8, .003, cross+3.7, .4, .004, 1.2);
      box(ground, 'crosswalk', 0xeee4cd, cross+3.7, .003, road-1.6+i*.8, 1.2, .004, .4);
    }
  }
  box(ground, 'park-path', 0xd8d1b9, 24, .003, 24, 1.9, .006, 12);
  box(ground, 'park-path', 0xd8d1b9, 24, .004, 24, 12, .008, 1.9);
  batch(ground);

  function genericBuilding(b: TownBuilding): THREE.Group {
    const group = new THREE.Group();
    const h = b.floors*3.2, w = b.width, d = b.depth;
    const wall = [0xd8bc8b, 0xd4d7bd, 0xb8ccc5][TOWN_BUILDINGS.indexOf(b)%3] ?? 0xd8bc8b;
    box(group, 'walls', wall, 0, h/2, 0, w, h, d);
    box(group, 'roof', 0x347d78, 0, h+.10, 0, w+.3, .20, d+.3);
    const columns = Math.max(2, Math.floor((w-1)/1.65));
    for (let floor = 0; floor < b.floors; floor++) {
      for (let col = 0; col < columns; col++) {
        const x = (col+.5)*w/columns-w/2;
        if (floor === 0 && Math.abs(x) < 1.25) continue;
        box(group, 'frame', 0xeee4cd, x, floor*3.2+1.7, d/2+.025, 1.1, 1.45, .07);
        box(group, 'window', 0x3e4c4c, x, floor*3.2+1.7, d/2+.065, .88, 1.2, .025);
      }
      for (const side of [-1, 1]) for (let z = -d/2+1.4; z < d/2-.8; z += 2.1) {
        box(group, 'frame', 0xeee4cd, side*(w/2+.025), floor*3.2+1.7, z, .07, 1.45, 1.1);
        box(group, 'window', 0x3e4c4c, side*(w/2+.065), floor*3.2+1.7, z, .025, 1.2, .88);
      }
    }
    box(group, 'door', 0x347d78, 0, 1.1, d/2+.012, 1.2, 2.2, .024);
    for (const side of [-1, 1]) box(group, 'jamb', 0xeee4cd, side*.68, 1.15, d/2+.04, .16, 2.3, .08);
    box(group, 'lintel', 0xeee4cd, 0, 2.3, d/2+.04, 1.52, .20, .08);
    batch(group); return group;
  }
  function sign(group: THREE.Group, b: TownBuilding): void {
    const label = b.id === 'station' ? 'МАЯК' : b.id === 'clinic' ? 'ПОЛИКЛИНИКА' : b.name;
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 80;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#347d78'; context.fillRect(0, 0, 512, 80);
      context.fillStyle = '#fff4d8'; context.font = 'bold 44px Arial';
      context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(label, 256, 42, 486);
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const width = b.id === 'station' ? 2.65 : b.id === 'clinic' ? 2.26 : Math.min(3.6, b.width-.4);
    const height = b.id === 'clinic' ? .25 : .35;
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    plane.name = 'building-sign'; plane.position.set(0, b.id === 'clinic' ? 2.99 : 2.82, b.depth/2+.14); group.add(plane);
  }
  for (const building of TOWN_BUILDINGS) {
    const name = building.id === 'station' ? 'workshop' : building.id === 'clinic' ? 'clinic'
      : building.width === 9 && building.depth === 8 && building.floors === 2 ? 'house-base' : null;
    const group = name && assets?.has(name) ? assets.get(name)!.clone(true) : genericBuilding(building);
    group.name = `building-${building.id}`; group.position.set(building.x, 0, building.z);
    group.userData.footprint = { width: building.width, depth: building.depth };
    sign(group, building); town.add(group);
  }
  const trees = [[20,20], [28,20], [20,28], [28,28], [19,36], [29,36], [35,36], [46,36], [3,19], [61,44], [19,60], [29,60]];
  const benches = [[21,26,0], [27,22,Math.PI], [29,26,-Math.PI/2], [35,45,0]];
  for (const [name, locations] of [['tree', trees], ['bench', benches]] as const) {
    const prototype = assets?.get(name);
    if (prototype) for (const [x, z, angle] of locations) {
      const item = prototype.clone(true); item.position.set(x ?? 0, 0, z ?? 0); item.rotation.y = angle ?? 0; town.add(item);
    }
  }
  const props = new THREE.Group(); props.name = 'collision-props'; town.add(props);
  box(props, 'monument', 0xd8bc8b, 24, .45, 24, 1.8, .9, 1.8);
  box(props, 'monument-top', 0x347d78, 24, 1.3, 24, .7, .8, .7);
  for (const car of TOWN_CARS) {
    const group = new THREE.Group(); group.position.set(car.x, 0, car.z); group.rotation.y = car.rotation;
    box(group, 'car', car.color, 0, .5, 0, 1.3, .55, 2.7);
    box(group, 'car-roof', 0x3e4c4c, 0, .98, -.1, 1.1, .42, 1.35);
    for (const x of [-.52,.52]) for (const z of [-.8,.8]) box(group, 'wheel', 0x3e4c4c, x, .20, z, .25, .4, .45);
    batch(group); props.add(group);
  }
  batch(props);
  // All boxes have been baked into batches; this template is no longer referenced.
  cube.dispose();
  return town;
}

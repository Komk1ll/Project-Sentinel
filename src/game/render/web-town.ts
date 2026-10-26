import { GARDEN_TREES } from '@content/coastal-garden';
import { createCoastalGarden } from '@game/render/coastal-garden-view';
import { COASTAL_TREES } from '@content/harbor';
import { createHarbor } from '@game/render/harbor-view';
import { createStreetDressing } from '@game/render/street-dressing';
import { animateFoliage } from '@game/render/foliage-wind';
import { createIslandLandscape } from '@game/render/island-landscape';
import * as THREE from 'three';
import { COAST_PATH } from '@content/island';
import { createIslandTerrain } from '@game/render/island-terrain';
import { placeOnGround, surfaceStrip, pathRibbon } from '@game/render/world-surface';
import { WILD_TREES, WILD_BENCHES } from '@content/town-life';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROAD_CENTERS, TOWN_BUILDINGS, TOWN_OPEN_SPACES, type TownBuilding } from '@content/town';
import { TOWN_CARS, TOWN_TREES, TOWN_BENCHES, TOWN_PLANTERS } from '@content/town-props';

/** Metre-scale scenery. Never stretch imported buildings to fit unrelated lots. */
export function createWebTown(assets?: ReadonlyMap<string, THREE.Group>, time = {value:0}): THREE.Group {
  const town = new THREE.Group();
  town.name = 'web-town';
  town.add(createIslandLandscape());
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
      meshes.forEach(mesh => { group.remove(mesh); if (mesh.geometry !== cube) mesh.geometry.dispose(); }); group.add(merged);
    }
  }
  const ground = new THREE.Group(); ground.name = 'street-surfaces'; town.add(ground);
  town.add(createIslandTerrain());
  ground.add(pathRibbon(COAST_PATH,2.6,0xd8c9ac));
  for(const road of ROAD_CENTERS){
    ground.add(surfaceStrip(road,-3,2.6,6,0xd8c9ac,.045),surfaceStrip(road,67,2.6,6,0xd8c9ac,.045));
    ground.add(surfaceStrip(-4,road,8,2.6,0xd8c9ac,.045),surfaceStrip(82,road,36,2.6,0xd8c9ac,.045));
  }
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
  for (const space of TOWN_OPEN_SPACES) {
    box(ground, `space-${space.id}`, space.kind === 'square' ? 0xd8c9ac : 0x88a478,
      space.x, -.019, space.z, space.width, .014, space.depth);
    if (space.kind !== 'square') {
      box(ground, 'garden-path', 0xd8c9ac, space.x, .001, space.z, 2.4, .008, space.depth);
      box(ground, 'garden-path', 0xd8c9ac, space.x, .003, space.z, space.width, .012, 2.4);
    } else {
      for (let x=-5;x<=5;x+=2) box(ground, 'square-inlay', 0xb8aa92, space.x+x, .002, space.z, .04, .006, space.depth);
      for (let z=-5;z<=5;z+=2) box(ground, 'square-inlay', 0xb8aa92, space.x, .003, space.z+z, space.width, .008, .04);
    }
  }
  // Connect every entrance to the nearest south street with a clear pavement spur.
  for (const building of TOWN_BUILDINGS) {
    const front=building.z+building.depth/2;
    const south=ROAD_CENTERS.find(road=>road>front) ?? 64;
    const length=south-2.05-front;
    if(length>0) box(ground,'entrance-path',0xd8d1b9,building.x,.001,front+length/2,2.4,.006,length);
  }
  for(const mesh of [...ground.children]) {
    if(!(mesh instanceof THREE.Mesh)||mesh.geometry!==cube)continue;
    const strip=surfaceStrip(mesh.position.x,mesh.position.z,mesh.scale.x,mesh.scale.z,
      (mesh.material as THREE.MeshStandardMaterial).color.getHex(),mesh.position.y+mesh.scale.y/2+.035);
    (strip.material as THREE.Material).dispose();strip.material=mesh.material;
    strip.name=mesh.name;ground.remove(mesh);ground.add(strip);
  }
  batch(ground);

  function genericBuilding(b: TownBuilding): THREE.Group {
    const group = new THREE.Group();
    const h = b.floors*3.2, w = b.width, d = b.depth;
    const wall = [0xd8bc8b, 0xd4d7bd, 0xb8ccc5][TOWN_BUILDINGS.indexOf(b)%3] ?? 0xd8bc8b;
    box(group, 'walls', wall, 0, h/2, 0, w, h, d);
    box(group, 'roof', b.kind === 'home' ? 0x61756a : 0x347d78, 0, h+.10, 0, w+.3, .20, d+.3);
    box(group, 'plinth', 0x927961, 0, .18, 0, w+.05, .36, d+.05);
    box(group, 'cornice', 0xeee4cd, 0, h-.12, 0, w+.15, .18, d+.15);
    if (b.kind === 'home' || b.kind === 'cafe') {
      const roof = new THREE.ConeGeometry(1, 1.1, 4);
      roof.rotateY(Math.PI/4); roof.scale((w+.5)/Math.SQRT2,1,(d+.5)/Math.SQRT2);
      const mesh=new THREE.Mesh(roof,mat(b.kind==='home'?0x61756a:0x956f54));
      mesh.position.y=h+.7; mesh.castShadow=true; mesh.receiveShadow=true; group.add(mesh);
    }
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
    const height = b.id === 'clinic' ? .25 : b.id === 'station' ? .29 : .35;
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    plane.name = 'building-sign'; plane.position.set(0, b.id === 'clinic' ? 2.99 : b.id === 'station' ? 2.84 : 2.82, b.depth/2+(b.id === 'station' ? .21 : .14)); group.add(plane);
  }
  for (const building of TOWN_BUILDINGS) {
    const name = building.id === 'station' ? 'workshop' : building.id === 'clinic' ? 'clinic'
      : building.width === 9 && building.depth === 8 && building.floors === 2 ? 'house-base' : null;
    const group = name && assets?.has(name) ? assets.get(name)!.clone(true) : genericBuilding(building);
    group.name = `building-${building.id}`; group.position.set(building.x, 0, building.z);
    group.userData.footprint = { width: building.width, depth: building.depth };
    const details = assets?.get('architecture-details')?.getObjectByName(`detail-${building.id}`);
    if (details) group.add(details.clone(true));
    sign(group, building);
    const foundation=new THREE.Mesh(new THREE.BoxGeometry(building.width,.9,building.depth),mat(0x8e927c));
    foundation.position.y=-.45;foundation.receiveShadow=true;group.add(foundation);
    placeOnGround(group,building.x,building.z);town.add(group);
  }
  function instances(
    name: string,
    locations: readonly { x: number; z: number; rotation: number; scale?: number }[],
    prototype: THREE.Object3D | undefined = assets?.get(name),
  ): void {
    if (!prototype || !locations.length) return;
    prototype.updateWorldMatrix(true,true);
    const placement=new THREE.Object3D(), matrix=new THREE.Matrix4();
    prototype.traverse(object=>{
      if (!(object instanceof THREE.Mesh)) return;
      // Bake prototype offsets once so wind height is measured from ground level.
      const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
      const mesh=new THREE.InstancedMesh(geometry,object.material,locations.length);
      mesh.name=`${name}-instances`; mesh.castShadow=true; mesh.receiveShadow=true;
      locations.forEach((location,index)=>{
        placeOnGround(placement,location.x,location.z,location.rotation);
        placement.scale.setScalar(location.scale ?? 1); placement.updateMatrix();
        matrix.copy(placement.matrix); mesh.setMatrixAt(index,matrix);
      });
      mesh.computeBoundingSphere();
      if (!Array.isArray(mesh.material) && mesh.material.name.endsWith('_foliage')) animateFoliage(mesh,time);
      town.add(mesh);
    });
  }
  const gardenKit=assets?.get('coastal-garden-kit');
  if(gardenKit)town.add(createCoastalGarden(gardenKit,time));
  const trees=[...TOWN_TREES.filter(t=>!gardenKit||!(t.x<=12&&t.z>=52)),...WILD_TREES,...COASTAL_TREES,...GARDEN_TREES];
  const treePack=assets?.get('tree');
  if (treePack?.getObjectByName('tree-oak')) {
    ['oak','birch','pine'].forEach((species,index)=>instances(`tree-${species}`,
      trees.filter((_,i)=>i%3===index),treePack.getObjectByName(`tree-${species}`)));
  } else instances('tree',trees);
  instances('bench',[...TOWN_BENCHES,...WILD_BENCHES]);
  const props = new THREE.Group(); props.name = 'collision-props'; town.add(props);

  const streetKit=assets?.get('street-kit');
  if(streetKit)town.add(createStreetDressing(streetKit,time));
  const harborKit=assets?.get('harbor-kit');
  if(harborKit)town.add(createHarbor(harborKit,time));
  for (const car of streetKit?[]:TOWN_CARS) {
    const group = new THREE.Group(); group.position.set(car.x, 0, car.z); group.rotation.y = car.rotation;
    box(group, 'car', car.color, 0, .5, 0, 1.3, .55, 2.7);
    box(group, 'car-roof', 0x3e4c4c, 0, .98, -.1, 1.1, .42, 1.35);
    for (const x of [-.52,.52]) for (const z of [-.8,.8]) box(group, 'wheel', 0x3e4c4c, x, .20, z, .25, .4, .45);
    batch(group); props.add(group);
  }
  for (const planter of streetKit?[]:TOWN_PLANTERS) {
    box(props,'planter',0x927961,planter.x,.25,planter.z,planter.width,.5,planter.depth);
    box(props,'planting',0x64825d,planter.x,.64,planter.z,planter.width-.15,.32,planter.depth-.15);
  }
  // Keep props rigid at their original metric dimensions.
  for(const child of props.children) {
    const {x,y,z}=child.position;const yaw=child.rotation.y;
    placeOnGround(child,x,z,yaw,y);
  }
  // Standalone prop boxes still reference the template; retain owned copies.
  props.traverse(object=>{if(object instanceof THREE.Mesh && object.geometry===cube)object.geometry=cube.clone();});
  // All boxes have been baked into batches; this template is no longer referenced.
  cube.dispose();
  return town;
}

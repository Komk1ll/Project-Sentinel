import * as THREE from 'three';
import { PARK, ROAD_CENTERS, TOWN_BUILDINGS, TOWN_SIZE, type TownBuilding } from '@content/town';
import { createSurfaceBox, createSurfaceTextures, type SurfaceKind } from '@game/render/surface-textures';
import { TOWN_CARS } from '@content/town-props';

type Shape = 'box' | 'sphere' | 'cylinder';
interface Batch {
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.Material;
  readonly matrices: THREE.Matrix4[];
  readonly shadow: boolean;
}

/** Build the editable district as a small set of instanced decorative meshes. */
export function createTownMeshes(): THREE.Group {
  const town = new THREE.Group();
  town.name = 'Autumn town — Zarechensk';
  const shapes: Record<Shape, THREE.BufferGeometry> = {
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.IcosahedronGeometry(1, 1),
    cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  };
  const surfaces = createSurfaceTextures();
  const surfaceGeometry = new Map<string, THREE.BoxGeometry>();
  const batches = new Map<string, Batch>();
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const transform = new THREE.Object3D();
  let seed = 117;
  const random = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const material = (color: number, glow = false, surface?: SurfaceKind): THREE.MeshStandardMaterial => {
    const key = `${color}-${glow}-${surface ?? "plain"}`;
    let result = materials.get(key);
    if (!result) {
      result = new THREE.MeshStandardMaterial({ color, roughness: 0.86, emissive: glow ? color : 0, emissiveIntensity: glow ? 0.36 : 0, map: surface ? surfaces[surface] : null, bumpMap: surface ? surfaces[surface] : null, bumpScale: surface === 'brick' ? 0.025 : 0.014 });
      materials.set(key, result);
    }
    return result;
  };
  const add = (shape: Shape, color: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, rotation = 0, shadow = false, glow = false, surface?: SurfaceKind): void => {
    const geometryKey = `${sx}-${sy}-${sz}`;
    const key = `${shape}-${color}-${shadow}-${glow}-${surface ?? "plain"}-${surface ? geometryKey : "unit"}`;
    let batch = batches.get(key);
    if (!batch) {
      let geometry = shapes[shape];
      if (surface && shape === 'box') {
        let physicalBox = surfaceGeometry.get(geometryKey);
        if (!physicalBox) { physicalBox = createSurfaceBox(sx, sy, sz); surfaceGeometry.set(geometryKey, physicalBox); }
        geometry = physicalBox;
      }
      batch = { geometry, material: material(color, glow, surface), matrices: [], shadow };
      batches.set(key, batch);
    }
    transform.position.set(x, y, z);
    transform.scale.set(surface ? 1 : sx, surface ? 1 : sy, surface ? 1 : sz);
    transform.rotation.set(0, rotation, 0);
    transform.updateMatrix();
    batch.matrices.push(transform.matrix.clone());
  };
  const box = (color: number, x: number, y: number, z: number, w: number, h: number, d: number, shadow = false, surface?: SurfaceKind): void => add('box', color, x, y, z, w, h, d, 0, shadow, false, surface);
  const paved = (x: number, z: number, w: number, d: number, color = 0x92938a): void => box(color, x, 0.035, z, w, 0.07, d, false, 'paving');

  const groundCanvas = document.createElement('canvas');
  groundCanvas.width = groundCanvas.height = 256;
  const context = groundCanvas.getContext('2d');
  if (context) {
    context.fillStyle = '#66705b';
    context.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3800; i++) {
      context.fillStyle = ['#73765d', '#565e4e', '#818268', '#8d855c'][i % 4] ?? '#73765d';
      context.fillRect(random() * 256, random() * 256, random() * 3 + 1, 1);
    }
  }
  const grassTexture = new THREE.CanvasTexture(groundCanvas);
  grassTexture.colorSpace = THREE.SRGBColorSpace;
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(12, 12);
  const ground = new THREE.Mesh(new THREE.BoxGeometry(TOWN_SIZE, 0.35, TOWN_SIZE), new THREE.MeshStandardMaterial({ map: grassTexture, roughness: 1 }));
  ground.position.set(32, -0.2, 32);
  ground.receiveShadow = true;
  town.add(ground);

  // Continuous pavements, kerbs and understated lane markings keep streets legible.
  for (const road of ROAD_CENTERS) {
    paved(road, 32, 6.6, 64, 0xb0aca0);
    paved(32, road, 64, 6.6, 0xb0aca0);
    box(0x444c4d, road, 0.09, 32, 4, 0.08, 64, false, 'asphalt');
    box(0x444c4d, 32, 0.09, road, 64, 0.08, 4, false, 'asphalt');
    for (let along = 1; along < 64; along += 2) {
      if (!ROAD_CENTERS.some(other => Math.abs(other - along) < 3.6)) {
        box(0xc9c2a7, road, 0.137, along, 0.065, 0.012, 0.85);
        box(0xc9c2a7, along, 0.137, road, 0.85, 0.012, 0.065);
      }
    }
    for (const side of [-1, 1]) {
      box(0xc6c2b5, road + side * 2.04, 0.14, 32, 0.13, 0.16, 64);
      box(0xc6c2b5, 32, 0.14, road + side * 2.04, 64, 0.16, 0.13);
    }
    for (const cross of ROAD_CENTERS) {
      for (let stripe = -1.5; stripe <= 1.5; stripe += 0.6) {
        box(0xd6d1b9, road + stripe, 0.15, cross + 3.6, 0.3, 0.015, 1.35);
        box(0xd6d1b9, cross + 3.6, 0.15, road + stripe, 1.35, 0.015, 0.3);
      }
    }
  }

  const sign = (text: string, x: number, y: number, z: number, width: number, color = '#24403b'): void => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 112;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 768, 112);
      ctx.strokeStyle = '#bca782';
      ctx.lineWidth = 5;
      ctx.strokeRect(5, 5, 758, 102);
      ctx.fillStyle = '#eee1c0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 42px Arial, sans-serif';
      ctx.fillText(text, 384, 59, 716);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.66), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7, emissiveMap: texture, emissive: 0xffffff, emissiveIntensity: 0.2 }));
    mesh.position.set(x, y, z);
    town.add(mesh);
  };
  const window = (x: number, y: number, z: number, rotation: number, lit: boolean, width = 0.72): void => {
    add('box', 0xd4cebb, x, y, z, width + 0.18, 1.18, 0.12, rotation);
    add('box', lit ? 0xf7bf6d : 0x344748, x + Math.sin(rotation) * 0.08, y, z + Math.cos(rotation) * 0.08, width, 0.97, 0.035, rotation, false, lit);
    for (const side of [-1, 1]) {
      const tangent = side * width * .33;
      add('box', lit ? 0xc5b28a : 0x687976, x + Math.cos(rotation) * tangent + Math.sin(rotation) * .102, y + .04, z - Math.sin(rotation) * tangent + Math.cos(rotation) * .102, width * .21, .86, .018, rotation);
    }
    add('box', 0xa9a99b, x + Math.sin(rotation) * 0.11, y, z + Math.cos(rotation) * 0.11, 0.04, 1.02, 0.04, rotation);
    add('box', 0xd0c5ac, x + Math.sin(rotation) * 0.13, y - 0.59, z + Math.cos(rotation) * 0.13, width + 0.29, 0.09, 0.27, rotation);
  };
  const building = (b: TownBuilding): void => {
    const h = b.floors * 2.4;
    const front = b.z + b.depth / 2;
    const side = b.x + b.width / 2;
    paved(b.x, b.z, b.width + 0.6, b.depth + 0.6, 0x8f9288);
    box(b.color, b.x, h / 2 + 0.18, b.z, b.width, h, b.depth, true, 'plaster');
    box(0x686e68, b.x, 0.34, b.z, b.width + 0.06, 0.48, b.depth + 0.06, false, 'brick');
    for (let floor = 1; floor <= b.floors; floor++) {
      box(0xc5bcaa, b.x, floor * 2.4 + 0.12, b.z, b.width + 0.15, 0.12, b.depth + 0.15);
    }
    const pitched = b.kind === 'home' && b.width <= 5 && b.floors <= 2;
    box(b.roof, b.x, h + 0.26, b.z, b.width + 0.4, 0.23, b.depth + 0.4, false, 'metal');
    if (pitched) {
      const halfWidth = b.width / 2 + .25;
      const halfDepth = b.depth / 2 + .22;
      const rise = 1.45;
      const positions: number[] = [];
      const uvs: number[] = [];
      const triangle = (a: readonly number[], c: readonly number[], d: readonly number[], uv: readonly number[]): void => {
        positions.push(...a, ...c, ...d); uvs.push(...uv);
      };
      const l = [-halfWidth, 0, -halfDepth], r = [halfWidth, 0, -halfDepth];
      const lf = [-halfWidth, 0, halfDepth], rf = [halfWidth, 0, halfDepth];
      const ridgeBack = [0, rise, -halfDepth], ridgeFront = [0, rise, halfDepth];
      const slope = Math.hypot(halfWidth, rise) / 2, length = halfDepth;
      triangle(l, lf, ridgeBack, [0, 0, 0, length, slope, 0]);
      triangle(lf, ridgeFront, ridgeBack, [0, length, slope, length, slope, 0]);
      triangle(r, ridgeBack, rf, [0, 0, slope, 0, 0, length]);
      triangle(rf, ridgeBack, ridgeFront, [0, length, slope, 0, slope, length]);
      triangle(lf, rf, ridgeFront, [0, 0, halfWidth, 0, halfWidth / 2, rise / 2]);
      triangle(l, ridgeBack, r, [0, 0, halfWidth / 2, rise / 2, halfWidth, 0]);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.computeVertexNormals();
      const roof = new THREE.Mesh(geometry, material(b.roof, false, 'metal'));
      roof.position.set(b.x, h + .4, b.z); roof.castShadow = true; roof.receiveShadow = true;
      town.add(roof);
      for (const side of [-1, 1]) box(0x555e58, b.x + side * halfWidth, h + .36, b.z, .12, .13, b.depth + .6);
    } else {
      for (const direction of [-1, 1]) {
        box(0x9a9b90, b.x, h + 0.5, b.z + direction * b.depth / 2, b.width + 0.15, 0.4, 0.16);
        box(0x9a9b90, b.x + direction * b.width / 2, h + 0.5, b.z, 0.16, 0.4, b.depth + 0.15);
      }
      box(0x787f77, b.x - b.width * 0.22, h + 0.65, b.z - 0.6, 1.45, 0.65, 1.3);
    }
    for (let i = 0; i < 2; i++) {
      const chimneyHeight = h + (pitched ? 1.55 : .8);
      box(0x746d61, b.x + b.width * 0.25, chimneyHeight, b.z - 1.6 + i * 2.1, 0.42, 1.15, 0.5, false, 'brick');
      box(0x434c4b, b.x + b.width * 0.25, chimneyHeight + .6, b.z - 1.6 + i * 2.1, 0.63, 0.12, 0.67);
    }
    const columns = Math.max(2, Math.floor(b.width / 1.65));
    for (let floor = 0; floor < b.floors; floor++) {
      for (let col = 0; col < columns; col++) {
        const x = b.x - b.width / 2 + (col + 0.5) * b.width / columns;
        if (floor > 0 || Math.abs(x - b.x) > 0.9) {
          window(x, floor * 2.4 + 1.45, front + 0.06, 0, random() > 0.28);
          if (b.kind === 'home' && floor > 0 && col % 2 === 0) {
            box(0x777e76, x, floor * 2.4 + 0.82, front + 0.38, 1.25, 0.12, 0.75);
            box(0x90988f, x, floor * 2.4 + 1.13, front + 0.73, 1.22, 0.55, 0.07);
            for (const edge of [-1, 1]) box(0x676e66, x + edge * 0.57, floor * 2.4 + 1.13, front + 0.4, 0.06, 0.55, 0.65);
          }
        }
      }
      const sideCount = Math.floor(b.depth / 1.8);
      for (let col = 0; col < sideCount; col++) {
        const z = b.z - b.depth / 2 + (col + 0.5) * b.depth / sideCount;
        window(side + 0.06, floor * 2.4 + 1.45, z, Math.PI / 2, random() > 0.4);
      }
    }
    // The entrance exactly matches the interaction location in town data.
    box(0xddd0b6, b.x, 1.03, front + 0.1, 1.15, 1.95, 0.2);
    box(0x263d39, b.x, 0.97, front + 0.22, 0.88, 1.8, 0.09);
    box(0xa1b2a4, b.x, 1.35, front + 0.275, 0.55, 0.62, 0.025);
    box(0xd8b66b, b.x + 0.29, 0.9, front + 0.29, 0.045, 0.23, 0.06);
    box(b.kind === 'cafe' ? 0x8e5841 : 0x435e57, b.x, 2.22, front + 0.4, 1.8, 0.15, 0.85);
    paved(b.x, front + 0.6, 1.7, 1.15, 0xb2ac98);
    if (b.kind !== 'home') sign(b.name, b.x, Math.min(h - 0.4, 2.9), front + 0.2, Math.min(b.width - 0.7, 7.7));
    else sign(b.name, b.x, 2.05, front + 0.22, Math.min(b.width - 0.6, 3));
    if (b.floors > 1) {
      box(0xa5a598, side + .16, 2.75, b.z - 1, .3, .45, .75);
      for (let vent = 0; vent < 4; vent++) box(0x626e68, side + .318, 2.6 + vent * .09, b.z - 1, .018, .025, .61);
    }
    // Drain pipes frame facades and add a human scale to the blocks.
    for (const edge of [-1, 1]) box(0x555e58, b.x + edge * (b.width / 2 - 0.16), h / 2, front + 0.14, 0.09, h, 0.1);
  };
  TOWN_BUILDINGS.forEach(building);

  const tree = (x: number, z: number, size = 1): void => {
    add('cylinder', 0x64503c, x, 1.2 * size, z, 0.22 * size, 2.4 * size, 0.22 * size, 0, true);
    const colors = [0x827342, 0x99864d, 0x787248, 0x94764d, 0x9b8c54];
    for (let branch = 0; branch < 5; branch++) {
      const angle = branch * 2.4;
      add('cylinder', 0x64503c, x + Math.sin(angle) * .28 * size, 2.05 * size, z + Math.cos(angle) * .28 * size, .08 * size, 1.15 * size, .08 * size, 0, true);
      const branchMatrix = batches.get(`cylinder-${0x64503c}-true-false-plain-unit`)?.matrices.at(-1);
      if (branchMatrix) {
        transform.rotation.set(Math.sin(angle) * .55, 0, -Math.cos(angle) * .55);
        transform.updateMatrix(); branchMatrix.copy(transform.matrix);
      }
    }
    for (let crown = 0; crown < 18; crown++) {
      const angle = crown * 2.399;
      const radius = .22 + random() * .82;
      const height = 2.35 + random() * 1.25;
      const spread = .38 + random() * .28;
      add('sphere', colors[crown % colors.length] ?? 0x827342, x + Math.sin(angle) * radius * size, height * size, z + Math.cos(angle) * radius * size, spread * size, (.4 + random() * .42) * size, spread * size, angle, true);
    }
    for (let leaf = 0; leaf < 9; leaf++) {
      add('box', 0x9e7d3f, x + (random() - 0.5) * 3, 0.1, z + (random() - 0.5) * 3, 0.12, 0.018, 0.09, random() * Math.PI);
    }
  };
  const bench = (x: number, z: number, rotation = 0): void => {
    const local = (dx: number, y: number, dz: number, w: number, h: number, d: number, color: number): void => add('box', color, x + dx * Math.cos(rotation) + dz * Math.sin(rotation), y, z - dx * Math.sin(rotation) + dz * Math.cos(rotation), w, h, d, rotation);
    for (const leg of [-0.55, 0.55]) {
      local(leg, 0.28, 0, 0.09, 0.48, 0.47, 0x35443e);
      local(leg, 0.65, -0.19, 0.07, 0.77, 0.07, 0x35443e);
    }
    for (let slat = 0; slat < 3; slat++) {
      local(0, 0.52, -0.17 + slat * 0.16, 1.6, 0.065, 0.12, 0x98754c);
      local(0, 0.74 + slat * 0.13, -0.24, 1.6, 0.09, 0.07, 0x98754c);
    }
  };
  const lamp = (x: number, z: number, light: boolean): void => {
    add('cylinder', 0x35483f, x, 0.2, z, 0.4, 0.4, 0.4);
    add('cylinder', 0x35483f, x, 1.6, z, 0.085, 3, 0.085);
    add('box', 0xffcd76, x, 3.22, z, 0.27, 0.42, 0.27, 0, false, true);
    box(0x35483f, x, 3.48, z, 0.47, 0.11, 0.47);
    box(0x35483f, x, 2.99, z, 0.37, 0.1, 0.37);
    if (light) {
      const point = new THREE.PointLight(0xffc57b, 3.5, 7, 2);
      point.position.set(x, 3.1, z);
      town.add(point);
    }
  };

  // Central garden: intersecting paths, a civic monument and planted borders.
  paved(PARK.x, PARK.z, 12, 12, 0x818873);
  paved(24, 24, 2.1, 12, 0xb8b2a0);
  paved(24, 24, 12, 2.1, 0xb8b2a0);
  add('cylinder', 0x9b9b89, 24, 0.18, 24, 3.6, 0.35, 3.6);
  box(0xa3a18c, 24, 0.62, 24, 1.2, 0.8, 1.2);
  box(0x777d71, 24, 1.4, 24, 0.7, 0.9, 0.65);
  add('sphere', 0x546b62, 24, 2.15, 24, 0.42, 0.52, 0.35);
  add('sphere', 0x546b62, 24, 2.76, 24, 0.22, 0.27, 0.22);
  for (const x of [20, 28]) for (const z of [20, 28]) {
    box(0x7c8270, x, 0.17, z, 2.3, 0.3, 2.3);
    box(0x544b35, x, 0.34, z, 2.05, 0.06, 2.05);
    tree(x, z, 1.1);
    for (let i = 0; i < 6; i++) add('sphere', i % 2 ? 0xba8c43 : 0x898c4d, x + (random() - 0.5) * 1.8, 0.45, z + (random() - 0.5) * 1.8, 0.18, 0.13, 0.18);
  }
  bench(21.5, 25.9);
  bench(26.5, 22.1, Math.PI);
  bench(27.7, 25.9, -Math.PI / 2);
  for (const [x, z] of [[19, 23], [29, 25], [23, 29], [25, 19]]) if (x !== undefined && z !== undefined) lamp(x, z, true);

  const free = (x: number, z: number): boolean => !TOWN_BUILDINGS.some(b => Math.abs(x - b.x) < b.width / 2 + 1.1 && Math.abs(z - b.z) < b.depth / 2 + 1.5) && !(Math.abs(x - 24) < 7 && Math.abs(z - 24) < 7);
  for (const road of ROAD_CENTERS) {
    for (let along = 5; along < 63; along += 8) {
      for (const side of [-1, 1]) {
        const x = road + side * 2.8;
        if (ROAD_CENTERS.every(r => Math.abs(r - along) > 4) && free(x, along)) {
          tree(x, along, 0.73 + random() * 0.2);
          box(0x787e6a, x, 0.15, along, 1, 0.22, 1);
        }
      }
      if (ROAD_CENTERS.every(r => Math.abs(r - along) > 5)) lamp(along, road + 2.6, false);
    }
  }
  for (const [x, z] of [[2, 19], [2, 29], [61, 3], [61, 44], [20, 62], [29, 62], [52, 62], [3, 48], [40, 29], [44, 28]]) {
    if (x !== undefined && z !== undefined && free(x, z)) tree(x, z, 0.9 + random() * 0.25);
  }

  // Parked cars leave the road center and all crossing approaches clear.
  const car = (x: number, z: number, color: number, rotation: number): void => {
    const part = (dx: number, y: number, dz: number, w: number, h: number, d: number, shade: number): void => add('box', shade, x + dx * Math.cos(rotation) + dz * Math.sin(rotation), y, z - dx * Math.sin(rotation) + dz * Math.cos(rotation), w, h, d, rotation);
    part(0, 0.47, 0, 1.18, 0.48, 2.45, color);
    part(0, 0.86, -0.12, 1.02, 0.48, 1.3, 0x344c50);
    part(0, 1.12, -0.12, 1.08, 0.08, 1.15, color);
    part(0, 0.48, 1.25, 1.08, 0.14, 0.08, 0xb5b5a7);
    for (const dx of [-0.57, 0.57]) for (const dz of [-0.77, 0.77]) part(dx, 0.29, dz, 0.18, 0.36, 0.39, 0x242e2d);
    for (const dx of [-0.38, 0.38]) part(dx, 0.52, 1.3, 0.19, 0.14, 0.035, 0xe4d0a0);
  };
  TOWN_CARS.forEach(parked => car(parked.x, parked.z, parked.color, parked.rotation));
  for (const [x, z] of [[24, 45], [40, 28.2], [55, 60.2]]) {
    if (x !== undefined && z !== undefined) {
      bench(x + 2, z);
      add('cylinder', 0x405a4c, x + 3.2, 0.4, z, 0.4, 0.75, 0.4);
    }
  }
  for (const batch of batches.values()) {
    const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
    batch.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.castShadow = batch.shadow;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    town.add(mesh);
  }
  return town;
}

import { GARDEN_WALKS, RESTING_AREAS, RESTING_BENCHES, onGardenWalk, onGardenBridge, PARK_CREEK, creekBend, creekBank, MILL_FIELD, PARK_FLOWER_BEDS } from '@content/coastal-garden';
import { islandElevation } from '@content/island-elevation';
import * as THREE from 'three';
import { ROAD_CENTERS, TOWN_OPEN_SPACES } from '@content/town';
import { ISLAND_PONDS } from '@content/town-life';
import { placeOnGround, surfaceDisk, surfaceStrip, pathRibbon } from '@game/render/world-surface';

/** Small shared meshes create recognisable gardens and resting areas around the island. */
export function createIslandLandscape(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'island-landscape';

  for (const pond of ISLAND_PONDS.slice(1)) {
    group.add(pondDisk(pond.x, pond.z, pond.width + 1.5, pond.depth + 1.5, 0xd6c6a0, 0.055));
    group.add(pondDisk(pond.x, pond.z, pond.width, pond.depth, 0x4d969f, 0.07));
    group.add(pondDisk(pond.x + 0.7, pond.z - 0.3, pond.width * 0.7, pond.depth * 0.72, 0x72b1ad, 0.075));
  }

  const { x, z, width, depth } = PARK_CREEK;
  for (const [margin, color, lift] of [[0.6, 0xbab08c, 0.045], [0, 0x508f89, 0.08], [-0.6, 0x377d83, 0.09]] as const) {
    const layer = surfaceDisk(x, z, width + 2 * margin, depth + 2 * margin, color);
    const vertices = layer.geometry.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      const pz = vertices.getZ(i);
      const px = vertices.getX(i) + creekBend(pz - z);
      vertices.setXYZ(i, px, islandElevation(px, pz) + lift, pz);
    }
    layer.geometry.computeVertexNormals();
    layer.name = 'park-creek';
    group.add(layer);
  }

  const leafGeometry = new THREE.CircleGeometry(0.27, 9, 0, Math.PI * 1.76).rotateX(-Math.PI / 2);
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x75974d });
  const blossomGeometry = new THREE.IcosahedronGeometry(0.11, 0);
  const blossomMaterial = new THREE.MeshStandardMaterial({ color: 0xf2a8be });
  for (const [index, angle] of [0.66, 0.74, 0.88, 3.86, 4.0, 4.14].entries()) {
    const p = creekBank(angle, -1.05);
    const y = islandElevation(p.x, p.z) + 0.12;
    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
    placeOnGround(leaf, p.x, p.z, index * 2.4, y);
    group.add(leaf);
    if (index % 2 === 0) {
      const blossom = new THREE.Mesh(blossomGeometry, blossomMaterial);
      placeOnGround(blossom, p.x, p.z, index, y + 0.07);
      group.add(blossom);
    }
  }

  // Soft planting islands give the orchard and western shore a distinct garden edge.
  for (const [x, z, w, d] of [[1, 55, 4, 10], [10, 65, 11, 3], [31, 66, 8, 3], [73, 60, 4, 9]])
    group.add(pondDisk(x!, z!, w!, d!, 0x789563, 0.04));

  // Naturally curved walks adhering seamlessly to 3D terrain elevation
  for (const walk of GARDEN_WALKS)
    group.add(pathRibbon(walk.points, walk.width, 0xd8c9ac, 0.065, walk.closed));

  // Paved resting plazas overlooking scenic views
  for (const rest of RESTING_AREAS) {
    group.add(surfaceDisk(rest.x, rest.z, rest.radius * 2, rest.radius * 2, 0xd4c6a8, 0.085));
    group.add(surfaceDisk(rest.x, rest.z, rest.radius * 2 + 0.8, rest.radius * 2 + 0.8, 0xb7aa90, 0.035));
  }

  // Wooden benches at resting viewpoints
  const benchGeo = new THREE.BoxGeometry(1.6, 0.45, 0.55);
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x84674f, roughness: 0.85 });
  for (const b of RESTING_BENCHES) {
    const bench = new THREE.Mesh(benchGeo, benchMat);
    bench.name = 'resting-bench';
    bench.castShadow = true;
    bench.receiveShadow = true;
    placeOnGround(bench, b.x, b.z, b.rotation, islandElevation(b.x, b.z) + 0.225);
    group.add(bench);
  }

  for (const bed of PARK_FLOWER_BEDS)
    group.add(pondDisk(bed.x, bed.z, bed.width, bed.depth, 0x7e925e, 0.038));

  const field = MILL_FIELD;
  const cropGeo = new THREE.ConeGeometry(0.12, 0.46, 4);
  const plantsPerRow = 15;
  const crop = new THREE.InstancedMesh(cropGeo,
    new THREE.MeshStandardMaterial({ color: 0xc3a85d, roughness: 0.9 }), field.rows * plantsPerRow);
  crop.name = 'mill-field-crops';
  const stalk = new THREE.Object3D();
  for (let row = 0; row < field.rows; row++) {
    const rowZ = field.firstRowZ + row * field.rowSpacing;
    group.add(surfaceStrip(field.x, rowZ, field.width, 0.84, row % 2 ? 0xb7a16a : 0xab925d, 0.06));
    for (let i = 0; i < plantsPerRow; i++) {
      const index = row * plantsPerRow + i;
      const x = field.x + ((i + 0.5) / plantsPerRow - 0.5) * field.width;
      const z = rowZ + Math.sin(index * 2.4) * 0.15;
      const scale = 0.7 + (index % 4) * 0.11;
      placeOnGround(stalk, x, z, index, islandElevation(x, z) + 0.05 + 0.23 * scale);
      stalk.scale.setScalar(scale);
      stalk.updateMatrix();
      crop.setMatrixAt(index, stalk.matrix);
    }
  }
  crop.computeBoundingSphere();
  group.add(crop);

  const grassGeo = new THREE.ConeGeometry(0.08, 0.35, 4);
  const flowerGeo = new THREE.IcosahedronGeometry(0.09, 0);
  const stoneGeo = new THREE.IcosahedronGeometry(0.3, 0);

  const locations = Array.from({ length: 420 }, (_, i) => {
    const patch = i % 6;
    const x = [73, 86, 94, 1, 10, 73][patch]! + Math.sin(i * 2.4) * [4, 4, 4, 1.2, 4, 1.2][patch]!;
    const z = [9, 9, 9, 55, 65, 60][patch]! + Math.cos(i * 3.1) * [5, 5, 5, 4, 1, 3.5][patch]!;
    return { x, z };
  }).filter(p => !onGardenWalk(p, 0.5)
    && !ROAD_CENTERS.some(road => (p.x >= 0 && p.x <= 64 && Math.abs(p.z - road) < 3.6) || (p.z >= 0 && p.z <= 64 && Math.abs(p.x - road) < 3.6))
    && !TOWN_OPEN_SPACES.some(space => Math.abs(p.x - space.x) < 1.5 && Math.abs(p.z - space.z) < space.depth / 2 || Math.abs(p.z - space.z) < 1.5 && Math.abs(p.x - space.x) < space.width / 2)
    && !ISLAND_PONDS.some(pond => Math.abs(p.x - pond.x) < pond.width / 2 + 1 && Math.abs(p.z - pond.z) < pond.depth / 2 + 1)
    && !(Math.abs(p.x - field.x) < field.width / 2 + 0.4
      && p.z > field.firstRowZ - 0.6 && p.z < field.firstRowZ + (field.rows - 1) * field.rowSpacing + 0.6)
    && Math.abs(p.z - 16) > 2);

  const grass = new THREE.InstancedMesh(grassGeo, new THREE.MeshStandardMaterial({ color: 0x6e8e56 }), locations.length);
  const flowers = new THREE.InstancedMesh(flowerGeo, new THREE.MeshStandardMaterial({ color: 0xf1cd85 }), locations.length);
  grass.name = 'meadow-grass';
  flowers.name = 'meadow-flowers';
  const placement = new THREE.Object3D();

  locations.forEach((p, i) => {
    const ey = islandElevation(p.x, p.z);
    placeOnGround(placement, p.x, p.z, i, ey + 0.15);
    placement.updateMatrix();
    grass.setMatrixAt(i, placement.matrix);

    placeOnGround(placement, p.x, p.z, i, ey + 0.36);
    placement.updateMatrix();
    flowers.setMatrixAt(i, placement.matrix);
    flowers.setColorAt(i, new THREE.Color([0xf1cd85, 0xc9979b, 0xe5dfbf][i % 3]!));
  });

  grass.computeBoundingSphere();
  flowers.computeBoundingSphere();
  group.add(grass, flowers);

  const shoreStones = Array.from({ length: 24 }, (_, i) => {
    const a = Math.floor(i / 2) * Math.PI / 6;
    if (i % 2 === 0) return creekBank(a, 0.52);
    const pond = ISLAND_PONDS[1];
    return { x: pond.x + Math.cos(a) * (pond.width / 2 + 1), z: pond.z + Math.sin(a) * (pond.depth / 2 + 1) };
  }).filter(p => !onGardenBridge(p, -0.5) && !onGardenWalk(p, 0.5));

  const stones = new THREE.InstancedMesh(stoneGeo, new THREE.MeshStandardMaterial({ color: 0xb1b39d }), shoreStones.length);
  shoreStones.forEach((p, i) => {
    const ey = islandElevation(p.x, p.z);
    placeOnGround(placement, p.x, p.z, i, ey + 0.15);
    placement.updateMatrix();
    stones.setMatrixAt(i, placement.matrix);
  });
  stones.computeBoundingSphere();
  group.add(stones);

  return group;
}

function pondDisk(x: number, z: number, width: number, depth: number, color: number, y: number): THREE.Mesh {
  const mesh = surfaceDisk(x, z, width, depth, color, y);
  const positions = mesh.geometry.getAttribute('position');
  for (let i = 1; i < positions.count; i++) {
    const dx = positions.getX(i) - x, dz = positions.getZ(i) - z, a = Math.atan2(dz / (depth / 2), dx / (width / 2));
    const r = 0.94 + 0.04 * Math.sin(a * 3) + 0.02 * Math.cos(a * 5);
    const px = x + dx * r, pz = z + dz * r;
    positions.setXYZ(i, px, islandElevation(px, pz) + y, pz);
  }
  positions.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingSphere();
  return mesh;
}

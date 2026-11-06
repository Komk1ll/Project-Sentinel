import * as THREE from 'three';
import { COAST_CLIFFS, GARDEN_BRIDGE, ORCHARD_FENCES, SEAWALLS, onGardenWalk, segmentDistance, creekBank, onParkCreek, PARK_FLOWER_BEDS } from '@content/coastal-garden';
import { RETAINING_WALLS, islandElevation } from '@content/island-elevation';
import { ROAD_CENTERS } from '@content/town';
import { COAST_PATH } from '@content/island';
import { ISLAND_PONDS } from '@content/town-life';
import { TOWN_TREES } from '@content/town-props';
import { animateFoliage } from '@game/render/foliage-wind';
import { placeOnGround } from '@game/render/world-surface';

type Placement = { readonly x: number; readonly z: number; readonly rotation?: number; readonly scale?: number; readonly y?: number };

/** Every repeated landscape module is drawn once per material, with shared buffers. */
export function createCoastalGarden(kit: THREE.Group, time: { value: number }): THREE.Group {
  const group = new THREE.Group();
  group.name = 'coastal-garden';
  const placement = new THREE.Object3D();

  const instances = (name: string, points: readonly Placement[], wind = false): void => {
    const prototype = kit.getObjectByName(name);
    if (!prototype || !points.length) return;
    prototype.updateWorldMatrix(true, true);
    prototype.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const mesh = new THREE.InstancedMesh(object.geometry.clone().applyMatrix4(object.matrixWorld), object.material, points.length);
      mesh.name = `garden-${name}`;
      mesh.castShadow = !['flower-cluster', 'reed-cluster'].includes(name);
      mesh.receiveShadow = true;
      points.forEach((p, i) => {
        const groundY = islandElevation(p.x, p.z);
        placeOnGround(placement, p.x, p.z, p.rotation ?? 0, (p.y ?? 0) + groundY);
        placement.scale.setScalar(p.scale ?? 1);
        placement.updateMatrix();
        mesh.setMatrixAt(i, placement.matrix);
      });
      mesh.computeBoundingSphere();
      if (wind && !Array.isArray(mesh.material) && ['foliage', 'foliage_light', 'petal', 'pink', 'reed'].includes(mesh.material.name))
        animateFoliage(mesh, time, new THREE.Vector3(name === 'apple-tree' ? 1.8 : 0, name === 'apple-tree' ? 3.8 : 0.7, 0.65));
      group.add(mesh);
    });
  };

  instances('cliff-module', COAST_CLIFFS);

  const retainingWallModules = RETAINING_WALLS.flatMap(w => {
    const count = Math.max(1, Math.ceil(w.depth / 2.1));
    const dx = -Math.sin(w.rotation), dz = Math.cos(w.rotation);
    return Array.from({ length: count }, (_, j) => {
      const t = (j + 0.5) / count - 0.5;
      const px = w.x + dx * t * w.depth;
      const pz = w.z + dz * t * w.depth;
      return { x: px, z: pz, rotation: w.rotation, y: 0.02 };
    });
  });

  instances('seawall', [...SEAWALLS, ...retainingWallModules]);
  instances('garden-fence', ORCHARD_FENCES);
  instances('apple-tree', TOWN_TREES.filter(t => t.x <= 12 && t.z >= 52), true);

  const flowers = Array.from({ length: 182 }, (_, i) => {
    const patch = i % 7, cx = [1, 10, 74, 95, 73, 81, 94][patch]!, cz = [55, 65, 8, 42, 61, 62, 62][patch]!;
    return { x: cx + Math.sin(i * 2.399) * [1.5, 4.5, 3, 2.2, 1.8, 2.2, 2][patch]!, z: cz + Math.cos(i * 2.399) * [4, 1.2, 3.5, 3, 3, 2.5, 2][patch]!, rotation: i * 1.7, scale: 0.8 + (i % 4) * 0.13 };
  }).filter(p => !onGardenWalk(p, 0.7)
    && COAST_PATH.every((q, i) => segmentDistance(p, q, COAST_PATH[(i + 1) % COAST_PATH.length]!) > 1.9)
    && !ROAD_CENTERS.some(c => (p.z >= 0 && p.z <= 64 && Math.abs(p.x - c) < 3.8) || (p.x >= 0 && p.x <= 64 && Math.abs(p.z - c) < 3.8))
    && !onParkCreek(p, 0.8)
    && !ISLAND_PONDS.some(pond => Math.hypot((p.x - pond.x) / (pond.width / 2 + 1), (p.z - pond.z) / (pond.depth / 2 + 1)) < 1));

  const plantedBeds = PARK_FLOWER_BEDS.flatMap((bed, index) => Array.from({ length: index === 0 ? 22 : 10 }, (_, i) => {
    const angle = i * 2.399;
    const radius = index === 0 ? 0.79 + (i % 3) * 0.06 : 0.24 + Math.sqrt(i / 10) * 0.6;
    return {
      x: bed.x + Math.cos(angle) * bed.width / 2 * radius,
      z: bed.z + Math.sin(angle) * bed.depth / 2 * radius,
      rotation: angle,
      scale: 0.73 + (i % 4) * 0.12,
    };
  })).filter(p => !onGardenWalk(p, 0.5));
  instances('flower-cluster', [...flowers, ...plantedBeds], true);

  instances('reed-cluster', ISLAND_PONDS.slice(1).flatMap(pond => Array.from({length: 15}, (_, i) => {
    const a = (i / 15) * Math.PI * 2;
    return { x: pond.x + Math.cos(a) * (pond.width / 2 + 0.25), z: pond.z + Math.sin(a) * (pond.depth / 2 + 0.25), rotation: a, scale: 0.75 + (i % 3) * 0.15 };
  })).concat(Array.from({ length: 30 }, (_, i) => {
    const angle = i * Math.PI / 15;
    return { ...creekBank(angle, 0.38 + 0.22 * Math.sin(i * 2.4)), rotation: angle, scale: 0.7 + (i % 4) * 0.14 };
  })).filter(p => Math.abs(p.z - GARDEN_BRIDGE.z) > 1.9 && !onGardenWalk(p, 0.4)), true);

  const bridge = kit.getObjectByName('garden-bridge')?.clone(true);
  if (bridge) {
    bridge.name = 'pond-garden-bridge';
    placeOnGround(bridge, GARDEN_BRIDGE.x, GARDEN_BRIDGE.z, 0, islandElevation(GARDEN_BRIDGE.x, GARDEN_BRIDGE.z));
    group.add(bridge);
  }
  return group;
}

import * as THREE from 'three';
import { islandElevation } from '@content/island-elevation';

export function placeOnGround(object: THREE.Object3D, x: number, z: number, yaw = 0, altitude = 0): void {
  object.position.set(x, altitude, z);
  object.rotation.set(0, yaw, 0);
}

export function surfaceStrip(x: number, z: number, width: number, depth: number, color: number, altitude = 0.03): THREE.Mesh {
  const segX = Math.max(1, Math.floor(width / 2));
  const segZ = Math.max(1, Math.floor(depth / 2));
  const geometry = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const px = x + pos.getX(i);
    const pz = z + pos.getZ(i);
    const py = islandElevation(px, pz) + altitude;
    pos.setXYZ(i, px, py, pz);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));
  mesh.receiveShadow = true;
  return mesh;
}

export function surfaceDisk(x: number, z: number, width: number, depth: number, color: number, altitude = 0.035): THREE.Mesh {
  const segments = 64;
  const rings = Math.max(2, Math.ceil(Math.max(width, depth) / 2));
  const vertices = [x, islandElevation(x, z) + altitude, z];
  const indices: number[] = [];
  for (let ring = 1; ring <= rings; ring++) {
    for (let i = 0; i < segments; i++) {
      const angle = i / segments * Math.PI * 2;
      const px = x + Math.cos(angle) * width * ring / (2 * rings);
      const pz = z + Math.sin(angle) * depth * ring / (2 * rings);
      vertices.push(px, islandElevation(px, pz) + altitude, pz);
      const outer = 1 + (ring - 1) * segments;
      const next = (i + 1) % segments;
      if (ring === 1) indices.push(0, outer + next, outer + i);
      else {
        const inner = outer - segments;
        indices.push(inner + i, inner + next, outer + i, inner + next, outer + next, outer + i);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  mesh.receiveShadow = true;
  return mesh;
}

export function pathRibbon(points: readonly { x: number; z: number }[], width: number, color: number, altitude = 0.045, closed = true): THREE.Mesh {
  const vertices: number[] = [], indices: number[] = [];
  points.forEach((point, i) => {
    const before = points[i - 1] ?? (closed ? points[points.length - 1]! : point);
    const after = points[i + 1] ?? (closed ? points[0]! : point);
    const dx = after.x - before.x, dz = after.z - before.z, len = Math.hypot(dx, dz) || 1;
    const subdivisions = 4;
    const row = subdivisions + 1;
    for (let column = 0; column <= subdivisions; column++) {
      const offset = width * (.5 - column / subdivisions);
      const x = point.x - dz / len * offset;
      const z = point.z + dx / len * offset;
      vertices.push(x, islandElevation(x, z) + altitude, z);
      if (column === subdivisions || (!closed && i === points.length - 1)) continue;
      const a = i * row + column;
      const b = ((i + 1) % points.length) * row + column;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide }));
  mesh.receiveShadow = true;
  return mesh;
}

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
  const geometry = new THREE.CircleGeometry(1, 64);
  geometry.rotateX(-Math.PI / 2);
  geometry.scale(width / 2, 1, depth / 2);
  const pos = geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const px = x + pos.getX(i);
    const pz = z + pos.getZ(i);
    const py = islandElevation(px, pz) + altitude;
    pos.setXYZ(i, px, py, pz);
  }
  pos.needsUpdate = true;
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
    const lx = point.x - dz / len * width / 2;
    const lz = point.z + dx / len * width / 2;
    const rx = point.x + dz / len * width / 2;
    const rz = point.z - dx / len * width / 2;
    const ly = islandElevation(lx, lz) + altitude;
    const ry = islandElevation(rx, rz) + altitude;
    vertices.push(lx, ly, lz, rx, ry, rz);
    if (closed || i < points.length - 1) {
      const a = i * 2, b = ((i + 1) % points.length) * 2;
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

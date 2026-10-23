import * as THREE from 'three';
import { MASTER, MEDIC } from '@content/first-aid';

/** A modest procedural workshop character, using the existing town's scale. */
export function createMasterMesh(actor: { readonly id: string; readonly x: number; readonly z: number } = MASTER): { group: THREE.Group; kit: THREE.Object3D } {
  const group = new THREE.Group();
  group.name = actor.id;
  group.position.set(actor.x, .02, actor.z);
  const cloth = new THREE.MeshStandardMaterial({ color: actor.id === MEDIC.id ? 0xe8eee1 : 0x758a72, roughness: .95 });
  const apron = new THREE.MeshStandardMaterial({ color: actor.id === MEDIC.id ? 0x72a3a0 : 0x986c41, roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc5a084, roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x343936, roughness: 1 });
  const hair = new THREE.MeshStandardMaterial({ color: 0xaaa69b, roughness: 1 });
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): void => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  add(new THREE.BoxGeometry(.48, .65, .3), cloth, 0, 1.1, 0);
  add(new THREE.BoxGeometry(.38, .58, .04), apron, 0, 1.03, .17);
  add(new THREE.SphereGeometry(.2, 12, 10), skin, 0, 1.65, 0);
  add(new THREE.SphereGeometry(.205, 12, 8, 0, Math.PI * 2, 0, Math.PI * .45), hair, 0, 1.7, 0);
  for (const side of [-1, 1]) {
    add(new THREE.BoxGeometry(.17, .65, .2), dark, side * .13, .4, 0);
    add(new THREE.BoxGeometry(.2, .13, .32), dark, side * .13, .08, .06);
    add(new THREE.CapsuleGeometry(.09, .35, 3, 8), cloth, side * .32, 1.07, .03);
    add(new THREE.SphereGeometry(.085, 8, 6), skin, side * .32, .8, .1);
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(.4, .48, 32), new THREE.MeshBasicMaterial({ color: 0xffcf78, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = .03;
  group.add(ring);
  const kit = new THREE.Group();
  kit.name = 'aid-kit-parcel';
  const parcel = new THREE.Mesh(new THREE.BoxGeometry(.38, .25, .22), new THREE.MeshStandardMaterial({ color: 0xd9c8a6, roughness: 1 }));
  parcel.castShadow = true;
  kit.add(parcel);
  kit.position.set(0, .89, .3);
  group.add(kit);
  return { group, kit };
}

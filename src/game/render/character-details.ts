import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const detailMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 });
type Role = 'hero' | 'master' | 'medic' | 'resident' | 'seated' | 'story';

/** Bake facial and clothing accents into one mesh per character. */
export function addCharacterDetails(actor: THREE.Group, role: Role, variant = 0): void {
  const parts: THREE.BufferGeometry[] = [];
  const add = (part: THREE.BufferGeometry, color: number, x: number, y: number, z: number, angle = 0): void => {
    part.rotateZ(angle).translate(x, y, z);
    const tint = new THREE.Color(color);
    const colors = new Float32Array(part.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length; i += 3) tint.toArray(colors, i);
    part.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    parts.push(part);
  };
  const strip = (color: number, x: number, y: number, z: number, w: number, h: number, angle = 0): void =>
    add(new THREE.BoxGeometry(w, h, .009), color, x, y, z, angle);
  const dot = (color: number, x: number, y: number, z: number, w: number, h: number, d: number): void =>
    add(new THREE.SphereGeometry(1, 8, 5).scale(w, h, d), color, x, y, z);

  if (role === 'story') {
    for (const side of [-1, 1]) {
      strip(0x493832, side * .052, 1.49, .146, .031, .013);
      strip(0x3b4c49, side * .11, .99, .151, .062, .014, side * .1);
    }
    dot(0xb68064, 0, 1.454, .153, .021, .028, .019);
    strip(0x8a5448, 0, 1.413, .147, .046, .011);
    strip(0xc8aa80, .104, 1.147, .15, .06, .035);
  } else if (role === 'seated') {
    for (const side of [-1, 1]) {
      strip(0x7e8d79, side * .14, 1.24, .175, .11, .019);
      strip(0x34444a, side * .12, 1.22, .178, .08, .009);
    }
    strip(0xd6c8a2, 0, 1.09, .181, .019, .32);
  } else {
    const hair = role === 'master' ? 0x77706a : [0x352a27, 0x604433, 0x3d302d][variant % 3]!;
    const glasses = role === 'master' || (role === 'resident' && variant % 3 === 1);
    for (const side of [-1, 1]) {
      strip(hair, side * .048, 1.594, .116, .036, .009, side * -.12);
      dot(0xc58a69, side * .077, 1.538, .097, .018, .009, .008);
      if (glasses) {
        const frame = new THREE.TorusGeometry(.031, .004, 4, 10).scale(1, .75, 1);
        add(frame, 0x4b443d, side * .047, 1.568, .134);
      }
    }
    strip(0x965d52, 0, 1.505, .123, .045, .009);
    if (glasses) strip(0x4b443d, 0, 1.571, .139, .039, .007);
    if (role === 'hero' || role === 'resident') {
      for (const side of [-1, 1]) {
        strip(0x233f40, side * .105, 1.03, .133, .065, .014, side * .1);
        strip(0x9caaa1, side * .145, 1.17, .144, .035, .026);
      }
      strip(0x855e31, 0, 1.10, -.294, .169, .018);
      strip(0xbac0ae, .075, 1.086, -.30, .016, .031);
      if (role === 'resident') {
        dot(hair, variant % 2 ? -.045 : .043, 1.655, .057, .082, .036, .078);
        strip(variant % 2 ? 0xaf8065 : 0x91a895, .092, 1.277, .126, .062, .025);
      }
    } else if (role === 'master') {
      strip(0xd1ab65, 0, .969, .17, .151, .013);
      for (const x of [-.062, .062]) dot(0x6b5339, x, 1.317, .154, .012, .012, .008);
    } else {
      strip(0xe3dfca, -.09, 1.241, .124, .066, .056);
      strip(0xac534e, -.09, 1.241, .13, .039, .01);
      strip(0xac534e, -.09, 1.241, .13, .01, .039);
      strip(0x5a7c74, .112, 1.157, .155, .014, .072);
    }
  }

  const geometry = mergeGeometries(parts);
  parts.forEach(part => part.dispose());
  if (!geometry) throw new Error('Character accents could not be merged');
  const mesh = new THREE.Mesh(geometry, detailMaterial);
  mesh.name = 'character-details';
  mesh.receiveShadow = true;
  actor.add(mesh);
}

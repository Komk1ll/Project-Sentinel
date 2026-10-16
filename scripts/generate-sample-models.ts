import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// Polyfill FileReader for Node.js
if (typeof (globalThis as unknown as { FileReader: unknown }).FileReader === 'undefined') {
  (globalThis as unknown as { FileReader: unknown }).FileReader = class NodeFileReader {
    public result: ArrayBuffer | null = null;
    public onloadend: (() => void) | null = null;

    public async readAsArrayBuffer(blob: Blob): Promise<void> {
      this.result = await blob.arrayBuffer();
      if (this.onloadend) this.onloadend();
    }
  };
}

function exportSceneToGLB(scene: THREE.Scene, animations: THREE.AnimationClip[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (gltf) => {
        const buffer = Buffer.from(gltf as ArrayBuffer);
        resolve(buffer);
      },
      (error) => {
        reject(error);
      },
      { binary: true, animations }
    );
  });
}

/**
 * Creates the municipal Sentinel Robot model (Code R)
 * matching Project Sentinel specifications.
 */
function createSentinelRobotScene(): { scene: THREE.Scene; animations: THREE.AnimationClip[] } {
  const scene = new THREE.Scene();
  scene.name = 'SentinelRobot';

  // 1. Bones Hierarchy
  const rootBone = new THREE.Bone();
  rootBone.name = 'root';

  const wheelBaseBone = new THREE.Bone();
  wheelBaseBone.name = 'wheel_base';
  wheelBaseBone.position.set(0, 0.2, 0);
  rootBone.add(wheelBaseBone);

  const torsoBone = new THREE.Bone();
  torsoBone.name = 'torso';
  torsoBone.position.set(0, 0.45, 0);
  wheelBaseBone.add(torsoBone);

  const neckBone = new THREE.Bone();
  neckBone.name = 'neck';
  neckBone.position.set(0, 0.45, 0);
  torsoBone.add(neckBone);

  const headBone = new THREE.Bone();
  headBone.name = 'head';
  headBone.position.set(0, 0.15, 0);
  neckBone.add(headBone);

  const scannerArmBone = new THREE.Bone();
  scannerArmBone.name = 'scanner_arm';
  scannerArmBone.position.set(0.42, 0.05, 0.05);
  torsoBone.add(scannerArmBone);

  const sensorEyeBone = new THREE.Bone();
  sensorEyeBone.name = 'sensor_eye';
  sensorEyeBone.position.set(0, 0.05, 0.25);
  headBone.add(sensorEyeBone);

  const bones = [
    rootBone,
    wheelBaseBone,
    torsoBone,
    neckBone,
    headBone,
    scannerArmBone,
    sensorEyeBone,
  ];
  const skeleton = new THREE.Skeleton(bones);

  // 2. Geometry: Segmented robot mesh
  const geometry = new THREE.CylinderGeometry(0.45, 0.5, 1.4, 12, 10);
  const positionAttr = geometry.attributes.position;
  if (!positionAttr) throw new Error('Missing position attribute');

  const skinIndices: number[] = [];
  const skinWeights: number[] = [];

  for (let i = 0; i < positionAttr.count; i++) {
    const y = positionAttr.getY(i) + 0.7; // Shift from [-0.7, 0.7] to [0, 1.4]
    const x = positionAttr.getX(i);

    if (y < 0.35) {
      // Wheelbase
      skinIndices.push(1, 0, 0, 0);
      skinWeights.push(1, 0, 0, 0);
    } else if (y < 0.95) {
      if (x > 0.3) {
        // Scanner arm influence
        skinIndices.push(5, 2, 0, 0);
        skinWeights.push(0.7, 0.3, 0, 0);
      } else {
        // Torso
        skinIndices.push(2, 1, 0, 0);
        skinWeights.push(0.85, 0.15, 0, 0);
      }
    } else {
      // Head / Sensor
      skinIndices.push(4, 3, 0, 0);
      skinWeights.push(0.9, 0.1, 0, 0);
    }
  }

  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

  // 3. Material
  const material = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    metalness: 0.6,
    roughness: 0.35,
    name: 'SentinelArmor',
  });

  const skinnedMesh = new THREE.SkinnedMesh(geometry, material);
  skinnedMesh.name = 'SentinelMesh';
  skinnedMesh.add(rootBone);
  skinnedMesh.bind(skeleton);
  scene.add(skinnedMesh);

  // Add decorative visual eye element attached to sensorEyeBone
  const eyeGeom = new THREE.SphereGeometry(0.12, 8, 8);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });
  const eyeMesh = new THREE.Mesh(eyeGeom, eyeMat);
  eyeMesh.name = 'OpticalSensor';
  sensorEyeBone.add(eyeMesh);

  // Add decorative scanner tool tip on scanner_arm
  const toolGeom = new THREE.BoxGeometry(0.12, 0.12, 0.3);
  const toolMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.8,
    roughness: 0.2,
  });
  const toolMesh = new THREE.Mesh(toolGeom, toolMat);
  toolMesh.position.z = 0.2;
  scannerArmBone.add(toolMesh);

  // 4. Animation Clips (Section 12 of spec)
  // Animation: idle (2 fps, 1.0s)
  const idleChassisPos = new THREE.VectorKeyframeTrack(
    'torso.position',
    [0, 0.5, 1.0],
    [0, 0.45, 0, 0, 0.47, 0, 0, 0.45, 0]
  );
  const idleHeadRot = new THREE.QuaternionKeyframeTrack(
    'head.quaternion',
    [0, 0.5, 1.0],
    [0, 0, 0, 1, 0, 0.08, 0, 0.997, 0, 0, 0, 1]
  );
  const idleClip = new THREE.AnimationClip('idle', 1.0, [idleChassisPos, idleHeadRot]);

  // Animation: move (8 fps, 0.5s)
  const moveChassisPos = new THREE.VectorKeyframeTrack(
    'wheel_base.position',
    [0, 0.125, 0.25, 0.375, 0.5],
    [0, 0.2, 0, 0, 0.24, 0, 0, 0.2, 0, 0, 0.24, 0, 0, 0.2, 0]
  );
  const moveTorsoRot = new THREE.QuaternionKeyframeTrack(
    'torso.quaternion',
    [0, 0.25, 0.5],
    [0.05, 0, 0, 0.998, 0.08, 0, 0, 0.996, 0.05, 0, 0, 0.998]
  );
  const moveClip = new THREE.AnimationClip('move', 0.5, [moveChassisPos, moveTorsoRot]);

  // Animation: scan (6 fps, 1.5s)
  const scanHeadRot = new THREE.QuaternionKeyframeTrack(
    'head.quaternion',
    [0, 0.375, 0.75, 1.125, 1.5],
    [
      0, 0, 0, 1,
      0, 0.38, 0, 0.92,
      0, 0, 0, 1,
      0, -0.38, 0, 0.92,
      0, 0, 0, 1,
    ]
  );
  const scanArmPos = new THREE.VectorKeyframeTrack(
    'scanner_arm.position',
    [0, 0.5, 1.0, 1.5],
    [0.42, 0.05, 0.05, 0.5, 0.2, 0.2, 0.5, 0.2, 0.2, 0.42, 0.05, 0.05]
  );
  const scanClip = new THREE.AnimationClip('scan', 1.5, [scanHeadRot, scanArmPos]);

  // Animation: shutdown (8 fps, 1.0s)
  const shutdownHeadRot = new THREE.QuaternionKeyframeTrack(
    'head.quaternion',
    [0, 0.5, 1.0],
    [0, 0, 0, 1, 0.2, 0, 0, 0.98, 0.35, 0, 0, 0.94]
  );
  const shutdownTorsoPos = new THREE.VectorKeyframeTrack(
    'torso.position',
    [0, 1.0],
    [0, 0.45, 0, 0, 0.3, 0]
  );
  const shutdownClip = new THREE.AnimationClip('shutdown', 1.0, [shutdownHeadRot, shutdownTorsoPos]);

  return { scene, animations: [idleClip, moveClip, scanClip, shutdownClip] };
}

/**
 * Creates the protagonist Hero character model (Code H)
 * matching Project Sentinel specifications (1.75m height, 69px in 2:1 isometric).
 */
function createHeroCharacterScene(): { scene: THREE.Scene; animations: THREE.AnimationClip[] } {
  const scene = new THREE.Scene();
  scene.name = 'CharacterHero';

  // 1. Bones Hierarchy
  const rootBone = new THREE.Bone();
  rootBone.name = 'root';

  const pelvisBone = new THREE.Bone();
  pelvisBone.name = 'pelvis';
  pelvisBone.position.set(0, 0.9, 0);
  rootBone.add(pelvisBone);

  const spineBone = new THREE.Bone();
  spineBone.name = 'spine';
  spineBone.position.set(0, 0.25, 0);
  pelvisBone.add(spineBone);

  const chestBone = new THREE.Bone();
  chestBone.name = 'chest';
  chestBone.position.set(0, 0.25, 0);
  spineBone.add(chestBone);

  const neckBone = new THREE.Bone();
  neckBone.name = 'neck';
  neckBone.position.set(0, 0.15, 0);
  chestBone.add(neckBone);

  const headBone = new THREE.Bone();
  headBone.name = 'head';
  headBone.position.set(0, 0.15, 0);
  neckBone.add(headBone);

  // Arms
  const armLBone = new THREE.Bone();
  armLBone.name = 'upper_arm_L';
  armLBone.position.set(-0.25, 0.1, 0);
  chestBone.add(armLBone);

  const handLBone = new THREE.Bone();
  handLBone.name = 'hand_L';
  handLBone.position.set(-0.05, -0.35, 0);
  armLBone.add(handLBone);

  const armRBone = new THREE.Bone();
  armRBone.name = 'upper_arm_R';
  armRBone.position.set(0.25, 0.1, 0);
  chestBone.add(armRBone);

  const handRBone = new THREE.Bone();
  handRBone.name = 'hand_R';
  handRBone.position.set(0.05, -0.35, 0);
  armRBone.add(handRBone);

  // Legs
  const legLBone = new THREE.Bone();
  legLBone.name = 'thigh_L';
  legLBone.position.set(-0.14, -0.1, 0);
  pelvisBone.add(legLBone);

  const footLBone = new THREE.Bone();
  footLBone.name = 'foot_L';
  footLBone.position.set(0, -0.7, 0);
  legLBone.add(footLBone);

  const legRBone = new THREE.Bone();
  legRBone.name = 'thigh_R';
  legRBone.position.set(0.14, -0.1, 0);
  pelvisBone.add(legRBone);

  const footRBone = new THREE.Bone();
  footRBone.name = 'foot_R';
  footRBone.position.set(0, -0.7, 0);
  legRBone.add(footRBone);

  const bones = [
    rootBone,
    pelvisBone,
    spineBone,
    chestBone,
    neckBone,
    headBone,
    armLBone,
    handLBone,
    armRBone,
    handRBone,
    legLBone,
    footLBone,
    legRBone,
    footRBone,
  ];
  const skeleton = new THREE.Skeleton(bones);

  // 2. Geometry: 1.75m Humanoid mesh
  const geometry = new THREE.CylinderGeometry(0.25, 0.2, 1.75, 10, 12);
  const positionAttr = geometry.attributes.position;
  if (!positionAttr) throw new Error('Missing position attribute');

  const skinIndices: number[] = [];
  const skinWeights: number[] = [];

  for (let i = 0; i < positionAttr.count; i++) {
    const y = positionAttr.getY(i) + 0.875; // [0, 1.75]
    const x = positionAttr.getX(i);

    if (y < 0.85) {
      // Legs / Feet
      if (x < 0) {
        skinIndices.push(10, 11, 0, 0);
        skinWeights.push(0.7, 0.3, 0, 0);
      } else {
        skinIndices.push(12, 13, 0, 0);
        skinWeights.push(0.7, 0.3, 0, 0);
      }
    } else if (y < 1.45) {
      // Torso / Arms
      if (x < -0.2) {
        skinIndices.push(6, 7, 0, 0);
        skinWeights.push(0.7, 0.3, 0, 0);
      } else if (x > 0.2) {
        skinIndices.push(8, 9, 0, 0);
        skinWeights.push(0.7, 0.3, 0, 0);
      } else {
        skinIndices.push(2, 3, 0, 0);
        skinWeights.push(0.6, 0.4, 0, 0);
      }
    } else {
      // Head / Neck
      skinIndices.push(5, 4, 0, 0);
      skinWeights.push(0.85, 0.15, 0, 0);
    }
  }

  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

  const material = new THREE.MeshStandardMaterial({
    color: 0xea580c, // Municipal orange work jacket
    metalness: 0.1,
    roughness: 0.8,
    name: 'HeroUniform',
  });

  const skinnedMesh = new THREE.SkinnedMesh(geometry, material);
  skinnedMesh.name = 'HeroMesh';
  skinnedMesh.add(rootBone);
  skinnedMesh.bind(skeleton);
  scene.add(skinnedMesh);

  // Visual head element
  const headMeshGeom = new THREE.SphereGeometry(0.18, 10, 10);
  const headMeshMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    roughness: 0.7,
  });
  const headMesh = new THREE.Mesh(headMeshGeom, headMeshMat);
  headBone.add(headMesh);

  // 3. Animation Clips (Section 12 of spec)
  // Animation: idle (4 fps, 1.0s)
  const idleSpinePos = new THREE.VectorKeyframeTrack(
    'spine.position',
    [0, 0.5, 1.0],
    [0, 0.25, 0, 0, 0.27, 0, 0, 0.25, 0]
  );
  const idleArmL = new THREE.QuaternionKeyframeTrack(
    'upper_arm_L.quaternion',
    [0, 0.5, 1.0],
    [0, 0, 0, 1, 0, 0, 0.05, 0.998, 0, 0, 0, 1]
  );
  const idleArmR = new THREE.QuaternionKeyframeTrack(
    'upper_arm_R.quaternion',
    [0, 0.5, 1.0],
    [0, 0, 0, 1, 0, 0, -0.05, 0.998, 0, 0, 0, 1]
  );
  const idleClip = new THREE.AnimationClip('idle', 1.0, [idleSpinePos, idleArmL, idleArmR]);

  // Animation: walk (10 fps, 0.8s)
  const walkLegL = new THREE.QuaternionKeyframeTrack(
    'thigh_L.quaternion',
    [0, 0.2, 0.4, 0.6, 0.8],
    [
      0, 0, 0, 1,
      0.25, 0, 0, 0.968,
      0, 0, 0, 1,
      -0.25, 0, 0, 0.968,
      0, 0, 0, 1,
    ]
  );
  const walkLegR = new THREE.QuaternionKeyframeTrack(
    'thigh_R.quaternion',
    [0, 0.2, 0.4, 0.6, 0.8],
    [
      0, 0, 0, 1,
      -0.25, 0, 0, 0.968,
      0, 0, 0, 1,
      0.25, 0, 0, 0.968,
      0, 0, 0, 1,
    ]
  );
  const walkArmL = new THREE.QuaternionKeyframeTrack(
    'upper_arm_L.quaternion',
    [0, 0.2, 0.4, 0.6, 0.8],
    [
      0, 0, 0, 1,
      -0.2, 0, 0, 0.979,
      0, 0, 0, 1,
      0.2, 0, 0, 0.979,
      0, 0, 0, 1,
    ]
  );
  const walkArmR = new THREE.QuaternionKeyframeTrack(
    'upper_arm_R.quaternion',
    [0, 0.2, 0.4, 0.6, 0.8],
    [
      0, 0, 0, 1,
      0.2, 0, 0, 0.979,
      0, 0, 0, 1,
      -0.2, 0, 0, 0.979,
      0, 0, 0, 1,
    ]
  );
  const walkClip = new THREE.AnimationClip('walk', 0.8, [walkLegL, walkLegR, walkArmL, walkArmR]);

  // Animation: interact (8 fps, 0.6s)
  const interactArmR = new THREE.QuaternionKeyframeTrack(
    'upper_arm_R.quaternion',
    [0, 0.3, 0.6],
    [0, 0, 0, 1, -0.45, 0, 0, 0.893, 0, 0, 0, 1]
  );
  const interactClip = new THREE.AnimationClip('interact', 0.6, [interactArmR]);

  return { scene, animations: [idleClip, walkClip, interactClip] };
}

async function main(): Promise<void> {
  const modelsDir = path.resolve('public/assets/models');
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  console.log('Generating Sentinel Robot GLB...');
  const { scene: robotScene, animations: robotAnimations } = createSentinelRobotScene();
  const robotBuffer = await exportSceneToGLB(robotScene, robotAnimations);
  const robotPath = path.join(modelsDir, 'sentinel_robot.glb');
  fs.writeFileSync(robotPath, robotBuffer);
  console.log(`Saved ${robotPath} (${robotBuffer.byteLength} bytes)`);

  console.log('Generating Character Hero GLB...');
  const { scene: heroScene, animations: heroAnimations } = createHeroCharacterScene();
  const heroBuffer = await exportSceneToGLB(heroScene, heroAnimations);
  const heroPath = path.join(modelsDir, 'character_hero.glb');
  fs.writeFileSync(heroPath, heroBuffer);
  console.log(`Saved ${heroPath} (${heroBuffer.byteLength} bytes)`);

  console.log('Model generation complete.');
}

main().catch((err) => {
  console.error('Model generation failed:', err);
  process.exit(1);
});

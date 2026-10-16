import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ModelSkeleton } from '../../src/game/render/ModelSkeleton';

describe('ModelSkeleton (Skeleton & Bone Controller)', () => {
  function createTestSkinnedModel() {
    const rootGroup = new THREE.Group();

    // Create a 3-bone hierarchy: root -> spine -> head
    const rootBone = new THREE.Bone();
    rootBone.name = 'root';

    const spineBone = new THREE.Bone();
    spineBone.name = 'spine';
    spineBone.position.y = 1.0;
    rootBone.add(spineBone);

    const headBone = new THREE.Bone();
    headBone.name = 'head';
    headBone.position.y = 0.8;
    spineBone.add(headBone);

    const handBone = new THREE.Bone();
    handBone.name = 'hand_R';
    handBone.position.x = 0.5;
    spineBone.add(handBone);

    const bones = [rootBone, spineBone, headBone, handBone];
    const skeleton = new THREE.Skeleton(bones);

    const geom = new THREE.CylinderGeometry(0.5, 0.5, 2, 8, 4);
    const position = geom.attributes.position;
    if (!position) throw new Error('Missing position attribute');

    const skinIndices: number[] = [];
    const skinWeights: number[] = [];
    for (let i = 0; i < position.count; i++) {
      skinIndices.push(0, 1, 0, 0);
      skinWeights.push(0.5, 0.5, 0, 0);
    }
    geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const skinnedMesh = new THREE.SkinnedMesh(geom, mat);
    skinnedMesh.add(rootBone);
    skinnedMesh.bind(skeleton);

    rootGroup.add(skinnedMesh);
    return { rootGroup, rootBone, spineBone, headBone, handBone, skinnedMesh };
  }

  it('detects bones and skinned meshes in the hierarchy', () => {
    const { rootGroup } = createTestSkinnedModel();
    const modelSkeleton = new ModelSkeleton(rootGroup);

    expect(modelSkeleton.hasSkeleton()).toBe(true);
    expect(modelSkeleton.getBones().length).toBe(4);
    expect(modelSkeleton.getBoneNames()).toEqual(
      expect.arrayContaining(['root', 'spine', 'head', 'hand_R'])
    );
    expect(modelSkeleton.getSkinnedMeshes().length).toBe(1);
  });

  it('finds bones by name', () => {
    const { rootGroup } = createTestSkinnedModel();
    const modelSkeleton = new ModelSkeleton(rootGroup);

    const head = modelSkeleton.findBone('head');
    expect(head).toBeDefined();
    expect(head?.name).toBe('head');

    const nonExistent = modelSkeleton.findBone('non_existent_bone');
    expect(nonExistent).toBeNull();
  });

  it('attaches and detaches props/objects to a bone with offsets', () => {
    const { rootGroup } = createTestSkinnedModel();
    const modelSkeleton = new ModelSkeleton(rootGroup);

    const tool = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffaa00 })
    );
    tool.name = 'WrenchTool';

    const attached = modelSkeleton.attachToBone('hand_R', tool, {
      offset: { x: 0.1, y: 0.2, z: 0.0 },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
    });

    expect(attached).toBe(true);
    expect(tool.parent?.name).toBe('hand_R');
    expect(tool.position.x).toBeCloseTo(0.1);
    expect(tool.position.y).toBeCloseTo(0.2);
    expect(tool.rotation.y).toBeCloseTo(Math.PI / 2);

    const attachedList = modelSkeleton.getAttachedObjects('hand_R');
    expect(attachedList).toContain(tool);

    // Now detach
    const detached = modelSkeleton.detachFromBone('hand_R', tool);
    expect(detached).toBe(true);
    expect(tool.parent).toBeNull();
    expect(modelSkeleton.getAttachedObjects('hand_R')).not.toContain(tool);
  });

  it('returns false when attempting to attach to a non-existent bone', () => {
    const { rootGroup } = createTestSkinnedModel();
    const modelSkeleton = new ModelSkeleton(rootGroup);
    const item = new THREE.Object3D();

    const result = modelSkeleton.attachToBone('ghost_bone', item);
    expect(result).toBe(false);
  });

  it('procedurally modifies bone rotation', () => {
    const { rootGroup, headBone } = createTestSkinnedModel();
    const modelSkeleton = new ModelSkeleton(rootGroup);

    const rotated = modelSkeleton.setBoneRotation('head', new THREE.Euler(0, 0.5, 0));
    expect(rotated).toBe(true);
    expect(headBone.rotation.y).toBeCloseTo(0.5);
  });

  it('creates a SkeletonHelper for visual debugging', () => {
    const { rootGroup } = createTestSkinnedModel();
    const modelSkeleton = new ModelSkeleton(rootGroup);

    const helper = modelSkeleton.createSkeletonHelper();
    expect(helper).toBeDefined();
    expect(helper).toBeInstanceOf(THREE.SkeletonHelper);
  });
});

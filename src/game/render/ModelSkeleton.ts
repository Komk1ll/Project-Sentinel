import * as THREE from 'three';
import { BoneAttachmentOptions } from '../../types/models';

/**
 * Controller for inspection, bone manipulation, and attachments
 * on SkinnedMesh skeletons in Three.js.
 */
export class ModelSkeleton {
  private bones: Map<string, THREE.Bone> = new Map();
  private skinnedMeshes: THREE.SkinnedMesh[] = [];
  private attachments: Map<string, Set<THREE.Object3D>> = new Map();
  private skeletonHelper: THREE.SkeletonHelper | null = null;

  constructor(public readonly root: THREE.Object3D) {
    this.scanHierarchy();
  }

  /**
   * Rescans the root hierarchy to discover all bones and SkinnedMeshes.
   */
  public scanHierarchy(): void {
    this.bones.clear();
    this.skinnedMeshes = [];

    this.root.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        this.skinnedMeshes.push(child as THREE.SkinnedMesh);
      }
      if ((child as THREE.Bone).isBone) {
        const bone = child as THREE.Bone;
        if (bone.name) {
          this.bones.set(bone.name, bone);
        }
      }
    });

    // Also check skeleton objects referenced by skinned meshes
    for (const mesh of this.skinnedMeshes) {
      if (mesh.skeleton && mesh.skeleton.bones) {
        for (const bone of mesh.skeleton.bones) {
          if (bone.name && !this.bones.has(bone.name)) {
            this.bones.set(bone.name, bone);
          }
        }
      }
    }
  }

  public hasSkeleton(): boolean {
    return this.bones.size > 0 || this.skinnedMeshes.length > 0;
  }

  public getBones(): readonly THREE.Bone[] {
    return Array.from(this.bones.values());
  }

  public getBoneNames(): readonly string[] {
    return Array.from(this.bones.keys());
  }

  public getSkinnedMeshes(): readonly THREE.SkinnedMesh[] {
    return this.skinnedMeshes;
  }

  public findBone(name: string): THREE.Bone | null {
    return this.bones.get(name) ?? null;
  }

  public hasBone(name: string): boolean {
    return this.bones.has(name);
  }

  /**
   * Attach a child 3D object to a designated bone.
   * The object will inherit the bone's transformation and animations.
   */
  public attachToBone(
    boneName: string,
    object: THREE.Object3D,
    options?: BoneAttachmentOptions
  ): boolean {
    const bone = this.findBone(boneName);
    if (!bone) {
      return false;
    }

    if (options?.offset) {
      object.position.set(options.offset.x, options.offset.y, options.offset.z);
    }
    if (options?.rotation) {
      object.rotation.set(options.rotation.x, options.rotation.y, options.rotation.z);
    }
    if (options?.scale) {
      object.scale.set(options.scale.x, options.scale.y, options.scale.z);
    }

    bone.add(object);

    let set = this.attachments.get(boneName);
    if (!set) {
      set = new Set();
      this.attachments.set(boneName, set);
    }
    set.add(object);

    return true;
  }

  /**
   * Detach an object previously attached to a bone.
   */
  public detachFromBone(boneName: string, object: THREE.Object3D): boolean {
    const bone = this.findBone(boneName);
    const set = this.attachments.get(boneName);

    if (bone && object.parent === bone) {
      bone.remove(object);
      if (set) {
        set.delete(object);
      }
      return true;
    }

    if (set && set.has(object)) {
      if (object.parent) {
        object.parent.remove(object);
      }
      set.delete(object);
      return true;
    }

    return false;
  }

  public getAttachedObjects(boneName: string): readonly THREE.Object3D[] {
    const set = this.attachments.get(boneName);
    return set ? Array.from(set) : [];
  }

  /**
   * Procedural rotation of a bone (e.g. head tracking, scanner tilt).
   */
  public setBoneRotation(
    boneName: string,
    rotation: THREE.Euler | { x: number; y: number; z: number }
  ): boolean {
    const bone = this.findBone(boneName);
    if (!bone) return false;

    if (rotation instanceof THREE.Euler) {
      bone.rotation.copy(rotation);
    } else {
      bone.rotation.set(rotation.x, rotation.y, rotation.z);
    }
    return true;
  }

  /**
   * Gets the world position of a bone.
   */
  public getBoneWorldPosition(boneName: string, target = new THREE.Vector3()): THREE.Vector3 | null {
    const bone = this.findBone(boneName);
    if (!bone) return null;
    return bone.getWorldPosition(target);
  }

  /**
   * Creates a SkeletonHelper for visual debugging in development mode.
   */
  public createSkeletonHelper(): THREE.SkeletonHelper | null {
    if (!this.hasSkeleton()) return null;
    if (!this.skeletonHelper) {
      this.skeletonHelper = new THREE.SkeletonHelper(this.root);
      this.skeletonHelper.name = `${this.root.name || 'Model'}_SkeletonHelper`;
    }
    return this.skeletonHelper;
  }

  public dispose(): void {
    if (this.skeletonHelper && this.skeletonHelper.parent) {
      this.skeletonHelper.parent.remove(this.skeletonHelper);
      this.skeletonHelper.dispose();
      this.skeletonHelper = null;
    }
    this.attachments.clear();
    this.bones.clear();
    this.skinnedMeshes = [];
  }
}

# ADR 0002: GLB Model Support with Pixel Art Rendering, Skeleton Hierarchy & Stepped Animations

- **Status**: Accepted
- **Date**: 2026-10-16
- **Deciders**: Engineering Team
- **Consulted**: Art & Animation Team, Technical Director

---

## Context

Project Sentinel uses a dual-engine architecture combining Phaser 3 (for 2:1 isometric world tiles, input, and physics) and Three.js (for WebGL / OpenGL 3D rendering and volumetric effects).

The art pipeline establishes that 3D assets are authored in Blender with strict constraints on triangle budgets, shared skeletons, and stepped frame rates (Section 10–12 of the technical specifications). However, loading and rendering standard 3D models directly in WebGL produces smooth, anti-aliased, 60fps-interpolated visuals that break the desired pixel-art aesthetic.

Furthermore, characters and municipal robots require complex skeletal animations (walking, scanning, idling, shutdowns) and modular attachments (tools, backpacks, sensor arrays) that must clone reliably across multiple entity instances without skeletal cross-talk.

---

## Decision

We implement a dedicated, decoupled **GLB Pixel Art Pipeline** in `src/game/render/` comprised of:

1. **Format Selection**: Standardize on **GLB (glTF 2.0 Binary)** for all 3D character, robot, prop, and building models. GLB bundles geometry, animations, skeleton skinning, textures, and materials in a single compact binary payload, minimizing HTTP requests and parse overhead.
2. **Skeleton & Skinning Lifecycle via `SkeletonUtils.clone`**:
   - Skinned meshes cloned via Three.js standard `clone()` share skeleton bone references by default, leading to broken animations when multiple instances exist.
   - We mandate `SkeletonUtils.clone()` for all model instantiations, guaranteeing isolated bone hierarchies and independent `AnimationMixer` targets.
3. **Bone Attachment & Manipulation**:
   - Implement `ModelSkeleton` wrapping the bone hierarchy, exposing simple `attachToBone()` and `detachFromBone()` APIs with offset and rotation controls.
   - Provide `SkeletonHelper` toggling for debugging and development.
4. **Stepped Pixel-Art Animation Controller**:
   - Implement `PixelArtAnimationController` with frame quantization.
   - Animations accumulate time and advance in discrete stepped intervals based on target FPS (e.g. 4 fps for hero idle, 10 fps for walk, 2 fps for robot idle, 8 fps for robot move).
   - This prevents unintended 60fps linear interpolation and recreates authentic hand-drawn pixel-art sprite cadence directly from 3D models.
5. **Pixel Art Rendering Pipeline**:
   - Texture processing: Force `THREE.NearestFilter` for minification and magnification, and disable mipmapping.
   - Material shading: Provide Toon/Cel shading options (`MeshToonMaterial`) and outline shaders.
   - Viewport downsampling: Provide an optional low-resolution `WebGLRenderTarget` pass with nearest-neighbor blit to simulate low-res retro displays.

---

## Consequences

### Positive
- Full support for `.glb` models with animations and skeletal hierarchies.
- Pixel-perfect retro visual consistency between 2D Phaser isometric tiles and Three.js 3D meshes.
- Stepped animations match the art specifications without needing tedious manual animation bake steps in Blender.
- Modular attachments allow equipping tools, carrying quest items, and mounting sensors on bones dynamically.
- Multiple instances of the same model (e.g. multiple robots or citizens) run independently without skeleton pollution.
- Fast, typed, and unit-tested in Vitest.

### Negative / Trade-offs
- `SkeletonUtils.clone` incurs slightly higher instantiation cost than shallow cloning due to bone graph traversal; mitigated by caching parsed GLTF buffers.
- Low-res render target downsampling introduces a second render pass when enabled.

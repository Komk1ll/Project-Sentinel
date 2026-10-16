# GLB Pixel Art 3D Pipeline: Models, Animations & Skeleton

## 1. Overview & Purpose

Project Sentinel combines a Phaser 3 2:1 isometric gameplay grid with a Three.js WebGL / OpenGL layer. To deliver high-fidelity 3D assets that retain a cohesive, authentic retro pixel-art aesthetic, the engine provides full support for the **GLB (glTF 2.0 Binary)** container format.

The GLB subsystem provides:
1. **GLB Model Loading & Asset Caching**: Asynchronous loading and caching of binary `.glb` models, using `SkeletonUtils.clone` to ensure independent bone hierarchies and skinned mesh bindings for every instantiated model.
2. **Pixel Art Visual Pipeline**:
   - Texture filtering enforcement (`THREE.NearestFilter` for `magFilter` and `minFilter`, disabling mipmaps).
   - Cel / Toon shading and pixel-quantized lighting.
   - Low-resolution render target downsampling (virtual pixel scale e.g. 2x–4x or fixed retro resolution), projecting onto the canvas via nearest-neighbor interpolation.
   - Pixel outline shading.
3. **Skeleton & Bone Hierarchy System**:
   - Discovery and extraction of `SkinnedMesh`, `Skeleton`, and `Bone` trees.
   - Dynamic attachment and detachment of items, tools, accessories, or VFX to bones (e.g., `hand_R`, `head`, `scanner_arm`).
   - Procedural bone transformations (head tracking, looking directions).
   - Retargeting and shared skeleton support (residents share a common skeleton as specified in ART-05/ART-06).
   - Development visual inspection via `SkeletonHelper`.
4. **Pixel Art Animation Controller**:
   - `THREE.AnimationMixer` management with clip cross-fading and playback controls.
   - **Stepped Frame Quantization**: Stepped keyframe playback at configured framerates (e.g., Hero idle 4 fps, Hero walk 10 fps, Robot idle 2 fps, Robot move 8 fps) conforming to section 12 of the technical specification. This eliminates unintended smooth 60 fps interpolation that would break the retro pixel-art illusion.
5. **Isometric Grid Synchronization**:
   - Transforming between 2:1 isometric metric grid coordinates and Three.js 3D world space.
   - 8-directional facing orientation matching isometric movement.

---

## 2. System Architecture

```
+---------------------------------------------------------------------------------+
|                                 Game Engine / Scene                             |
|                           (DistrictScene / GameEngine)                          |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|                             ThreeRenderer System                                |
|  +---------------------------------------------------------------------------+  |
|  | PixelArtPostProcessor (Low-res Offscreen RenderTarget, Nearest Sampling)  |  |
|  +---------------------------------------------------------------------------+  |
|  | Orthographic Isometric Camera (Azimuth 45°, Elevation 30° / 35.264°)       |  |
|  +---------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
+-------------------------------------+   +-------------------------------------+
|          GLBModelLoader             |   |       PixelArtModelInstance         |
| - GLTFLoader parsing                |   | - Root Object3D / Group             |
| - In-memory asset cache             |   | - Isometric position & direction    |
| - SkeletonUtils.clone instantiation |   | - Update loop & resource disposal   |
| - Pixel art texture filtering       |   +-------------------------------------+
| - Material toon/cel conversion      |                      |
+-------------------------------------+                      |
                                           +-----------------+-----------------+
                                           |                                   |
                                           v                                   v
                        +-------------------------------------+   +-------------------------------------+
                        |          ModelSkeleton              |   |    PixelArtAnimationController      |
                        | - SkinnedMesh & Skeleton extraction |   | - AnimationMixer & Clip registry    |
                        | - Bone lookup (by name)             |   | - Stepped frame quantization        |
                        | - Bone attachment/detachment        |   | - Target FPS (2, 4, 6, 8, 10 fps)   |
                        | - Procedural bone rotations         |   | - Cross-fading & loop modes         |
                        | - SkeletonHelper visualizer         |   | - Event callbacks (finish, loop)    |
                        +-------------------------------------+   +-------------------------------------+
```

---

## 3. Pixel Art Rendering Specifications

### 3.1 Texture Sampling & Filtering
All textures extracted from `.glb` models are configured with nearest-neighbor sampling:
```typescript
texture.magFilter = THREE.NearestFilter;
texture.minFilter = THREE.NearestFilter;
texture.generateMipmaps = false;
```
This guarantees sharp, pixel-perfect texels without blur, color bleeding, or bilinear filtering artifacts.

### 3.2 Stepped Animation Quantization (Frame Stepping)
In retro pixel art games, characters and robots animate at discrete frame rates (typically 4 to 12 frames per second). Traditional 3D animation systems smoothly interpolate bone rotations every frame (60–144 Hz), resulting in a fluid look that clashes with pixel art.

The `PixelArtAnimationController` introduces an accumulator-based quantizer:
- Target frame rate is specified per clip or controller (e.g. `10 fps` for walking, `4 fps` for hero idle, `2 fps` for robot idle).
- Accumulated time $\Delta t$ steps forward only when $\Delta t \ge 1 / \text{fps}$.
- The animation mixer evaluates the clip at exact step intervals:
  $$t_{\text{stepped}} = \lfloor t_{\text{accumulated}} \times \text{fps} \rfloor / \text{fps}$$

### 3.3 Low-Resolution Virtual Viewport
To render 3D geometry with true pixel rasterization:
- The scene is rendered to an off-screen `THREE.WebGLRenderTarget` with dimensions divided by `pixelScale` (e.g., 2, 3, or 4).
- The low-res buffer uses `THREE.NearestFilter` and is drawn as a full-screen quad to the canvas.
- When native pixel density is preferred, `pixelScale = 1` bypasses the downsampling pass.

---

## 4. Skeleton & Bone Hierarchy

### 4.1 Cloning Skinned Meshes
Using standard `object.clone()` in Three.js fails for skinned meshes because bone hierarchies and skin weights are shared by reference, causing animations on one instance to distort all other instances.

The `GLBModelLoader` utilizes `SkeletonUtils.clone(gltf.scene)`:
1. Clones geometry, materials, and unique bone objects.
2. Rebinds newly created `SkinnedMesh` instances to the newly duplicated `Skeleton`.
3. Creates unique `AnimationMixer` targets for each model instance.

### 4.2 Bone Attachments
Props, tools, and accessories (e.g. scanner beams, repair wrenches, backpacks) are attached to named bones:
```typescript
const attached = instance.skeleton.attachToBone('hand_R', wrenchMesh, {
  offset: new THREE.Vector3(0, 0.1, 0),
  rotation: new THREE.Euler(0, Math.PI / 2, 0),
});
```
The attached object automatically inherits the translation, rotation, and scale of the parent bone during all animation frames.

---

## 5. Standard Specifications for Project Sentinel Assets

Conforming to Section 10–12 of the Project Sentinel Technical Specification:

| Asset | Key Bones | Standard Animations & Target FPS |
| :--- | :--- | :--- |
| **Hero Character** (`character_hero.glb`) | `root`, `pelvis`, `spine`, `chest`, `neck`, `head`, `arm_L`, `hand_L`, `arm_R`, `hand_R`, `leg_L`, `leg_R` | `idle` (4 fps), `walk` (10 fps), `interact` (8 fps) |
| **Sentinel Robot** (`sentinel_robot.glb`) | `root`, `wheel_base`, `torso`, `neck`, `head`, `scanner_arm`, `sensor_eye` | `idle` (2 fps), `move` (8 fps), `scan` (6 fps), `shutdown` (8 fps) |
| **Residents / NPCs** | Common shared skeleton | `idle` (1 fps), `walk` (8 fps) |

---

## 6. Coordinate System Mapping

Project Sentinel uses a 2:1 isometric projection. The conversion from 2D isometric grid cells $(x, y)$ in meters to Three.js 3D coordinates $(X, Y, Z)$ is governed by:

$$\begin{aligned}
X &= (x - y) \times \cos(45^\circ) \times \text{cellScale} \\
Y &= \text{elevation} \\
Z &= (x + y) \times \sin(45^\circ) \times \text{cellScale}
\end{aligned}$$

With the isometric camera oriented at Azimuth 45° and Elevation 30° / 35.264°, moving along the $+x$ grid axis moves down-right on the 2D screen, and $+y$ moves down-left on the 2D screen, perfectly aligning with Phaser's 2:1 rhombus tiles (128x64 px).

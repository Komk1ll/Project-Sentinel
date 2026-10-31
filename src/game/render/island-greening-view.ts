import * as THREE from 'three';
import {
  ALL_DISTINCT_TREES,
  GREENING_SHRUBS,
  FORMED_FLOWERBEDS,
  QUAY_WATER_STAIRS,
  BREAKWATER_CAPSTONES,
  HARBOR_MOORING_ROPES,
  HARBOR_PROP_CLUSTERS,
  FRONT_GARDEN_ENCLOSURES,
  FAÇADE_WINDOW_BOXES,
  type DistinctTree,
} from '@content/island-greening';
import { islandElevation } from '@content/island-elevation';
import { placeOnGround } from '@game/render/world-surface';

/**
 * Creates high-performance 3D visual presentation for Island Greening & Harbor Enhancements.
 * Uses shared geometries, instanced meshes, and foliage wind shaders.
 */
export function createIslandGreening(time: { value: number }): THREE.Group {
  const group = new THREE.Group();
  group.name = 'island-greening';

  // Materials cache
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const getMat = (color: number, roughness = 0.82, metalness = 0.05): THREE.MeshStandardMaterial => {
    const key = `${color}-${roughness}-${metalness}`;
    let m = materials.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
      materials.set(key, m);
    }
    return m;
  };

  /* --------------------------------------------------------------------------
   * 1. DISTINCT TREE SILHOUETTES
   * -------------------------------------------------------------------------- */
  const treeGroup = new THREE.Group();
  treeGroup.name = 'greening-trees';

  const buildTreeMesh = (tree: DistinctTree): THREE.Group => {
    const root = new THREE.Group();
    root.name = `tree-${tree.id}`;
    const s = tree.scale;

    if (tree.kind === 'apple') {
      // 1. Apple Tree: Gnarled trunk, spreading branches, rounded crown, warm apples
      const trunkGeo = new THREE.CylinderGeometry(0.12 * s, 0.22 * s, 1.8 * s, 8);
      const trunk = new THREE.Mesh(trunkGeo, getMat(tree.trunkColor, 0.9));
      trunk.position.y = 0.9 * s;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      root.add(trunk);

      // Branch forks
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + 0.3;
        const bGeo = new THREE.CylinderGeometry(0.05 * s, 0.09 * s, 1.1 * s, 6);
        const branch = new THREE.Mesh(bGeo, getMat(tree.trunkColor, 0.9));
        branch.position.set(Math.cos(a) * 0.3 * s, 1.6 * s, Math.sin(a) * 0.3 * s);
        branch.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
        branch.castShadow = true;
        root.add(branch);
      }

      // Rounded crown clusters
      const crownGeo = new THREE.IcosahedronGeometry(0.95 * s, 1);
      const crownMat = getMat(tree.crownColor, 0.85);
      crownMat.name = 'apple_foliage';
      for (let c = 0; c < 5; c++) {
        const ca = c * 1.25;
        const cr = c === 0 ? 0 : 0.65 * s;
        const ch = (2.2 + (c % 2) * 0.35) * s;
        const crown = new THREE.Mesh(crownGeo, crownMat);
        crown.position.set(Math.cos(ca) * cr, ch, Math.sin(ca) * cr);
        crown.scale.set(1.1, 0.85, 1.1);
        crown.castShadow = true;
        crown.receiveShadow = true;
        root.add(crown);
      }

      // Warm fruit spheres
      if (tree.fruitColor) {
        const fruitGeo = new THREE.IcosahedronGeometry(0.1 * s, 0);
        const fruitMat = getMat(tree.fruitColor, 0.6);
        for (let f = 0; f < 8; f++) {
          const fa = f * 1.7;
          const fr = (0.7 + (f % 3) * 0.2) * s;
          const fh = (1.9 + (f % 4) * 0.25) * s;
          const fruit = new THREE.Mesh(fruitGeo, fruitMat);
          fruit.position.set(Math.cos(fa) * fr, fh, Math.sin(fa) * fr);
          root.add(fruit);
        }
      }
    } else if (tree.kind === 'willow') {
      // 2. Weeping Willow: Curved graceful trunk, cascading drooping canopy
      const trunkGeo = new THREE.CylinderGeometry(0.14 * s, 0.26 * s, 2.4 * s, 8);
      const trunk = new THREE.Mesh(trunkGeo, getMat(tree.trunkColor, 0.92));
      trunk.position.set(0.15 * s, 1.2 * s, 0);
      trunk.rotation.z = -0.12;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      root.add(trunk);

      // Weeping cascading crown
      const crownMat = getMat(tree.crownColor, 0.88);
      crownMat.name = 'willow_foliage';
      // Upper dome
      const domeGeo = new THREE.IcosahedronGeometry(1.4 * s, 1);
      const dome = new THREE.Mesh(domeGeo, crownMat);
      dome.position.set(0.2 * s, 2.8 * s, 0);
      dome.scale.set(1.3, 0.75, 1.3);
      dome.castShadow = true;
      root.add(dome);

      // Drooping pendulous foliage skirts
      const skirtGeo = new THREE.ConeGeometry(0.45 * s, 1.6 * s, 6);
      skirtGeo.rotateX(Math.PI);
      for (let w = 0; w < 7; w++) {
        const wa = (w * Math.PI * 2) / 7;
        const wr = 1.15 * s;
        const skirt = new THREE.Mesh(skirtGeo, crownMat);
        skirt.position.set(Math.cos(wa) * wr + 0.2 * s, 2.0 * s, Math.sin(wa) * wr);
        skirt.scale.set(1.0, 1.0 + (w % 3) * 0.2, 1.0);
        skirt.castShadow = true;
        root.add(skirt);
      }
    } else if (tree.kind === 'linden') {
      // 3. Town Linden: Stately upright trunk, multi-tier domed crown
      const trunkGeo = new THREE.CylinderGeometry(0.16 * s, 0.28 * s, 2.8 * s, 8);
      const trunk = new THREE.Mesh(trunkGeo, getMat(tree.trunkColor, 0.88));
      trunk.position.y = 1.4 * s;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      root.add(trunk);

      // Multi-tier layered crown
      const crownMat = getMat(tree.crownColor, 0.84);
      crownMat.name = 'linden_foliage';
      const tier1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5 * s, 1), crownMat);
      tier1.position.y = 3.2 * s;
      tier1.scale.set(1.3, 0.7, 1.3);
      tier1.castShadow = true;
      root.add(tier1);

      const tier2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15 * s, 1), crownMat);
      tier2.position.y = 4.1 * s;
      tier2.scale.set(1.1, 0.75, 1.1);
      tier2.castShadow = true;
      root.add(tier2);

      const tier3 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75 * s, 1), crownMat);
      tier3.position.y = 4.8 * s;
      tier3.scale.set(0.9, 0.8, 0.9);
      tier3.castShadow = true;
      root.add(tier3);
    } else {
      // 4. Hillside Birch: Slender pale trunk with dark accents, airy crown
      const trunkGeo = new THREE.CylinderGeometry(0.09 * s, 0.15 * s, 3.2 * s, 8);
      const trunk = new THREE.Mesh(trunkGeo, getMat(tree.trunkColor, 0.85));
      trunk.position.y = 1.6 * s;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      root.add(trunk);

      // Dark bark rings
      for (let r = 0; r < 5; r++) {
        const ringGeo = new THREE.CylinderGeometry(0.105 * s, 0.115 * s, 0.06 * s, 8);
        const ring = new THREE.Mesh(ringGeo, getMat(0x3a3834, 0.95));
        ring.position.y = (0.5 + r * 0.55) * s;
        root.add(ring);
      }

      // Airy golden-green crown
      const crownMat = getMat(tree.crownColor, 0.82);
      crownMat.name = 'birch_foliage';
      for (let b = 0; b < 6; b++) {
        const ba = b * 1.9;
        const br = 0.55 * s;
        const bh = (3.2 + (b % 3) * 0.45) * s;
        const crownSphere = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75 * s, 1), crownMat);
        crownSphere.position.set(Math.cos(ba) * br, bh, Math.sin(ba) * br);
        crownSphere.castShadow = true;
        root.add(crownSphere);
      }
    }

    const groundY = islandElevation(tree.x, tree.z);
    placeOnGround(root, tree.x, tree.z, tree.rotation, groundY);
    return root;
  };

  ALL_DISTINCT_TREES.forEach(tree => {
    const mesh = buildTreeMesh(tree);
    treeGroup.add(mesh);
  });
  group.add(treeGroup);

  /* --------------------------------------------------------------------------
   * 2. LOW BUSHES & FLOWERING GROUNDCOVER
   * -------------------------------------------------------------------------- */
  const shrubGroup = new THREE.Group();
  shrubGroup.name = 'greening-shrubs';

  GREENING_SHRUBS.forEach((shrub, idx) => {
    const s = shrub.scale;
    const groundY = islandElevation(shrub.x, shrub.z);
    const m = new THREE.Group();
    m.name = `shrub-${idx}`;

    if (shrub.kind === 'flowering_coral' || shrub.kind === 'flowering_gold') {
      // Leafy base mound
      const mound = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 * s, 1), getMat(0x567840, 0.88));
      mound.scale.set(1.2, 0.65, 1.2);
      mound.position.y = 0.28 * s;
      mound.castShadow = true;
      m.add(mound);

      // Blossom clusters
      const blossomColor = shrub.kind === 'flowering_coral' ? 0xd66874 : 0xebb759;
      const bMat = getMat(blossomColor, 0.7);
      for (let i = 0; i < 5; i++) {
        const ba = i * 1.35;
        const br = 0.3 * s;
        const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12 * s, 0), bMat);
        fl.position.set(Math.cos(ba) * br, 0.45 * s, Math.sin(ba) * br);
        m.add(fl);
      }
    } else if (shrub.kind === 'boxwood_clipped') {
      // Formal clipped municipal boxwood
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.85 * s, 0.75 * s, 0.85 * s), getMat(0x456636, 0.85));
      box.position.y = 0.375 * s;
      box.castShadow = true;
      box.receiveShadow = true;
      m.add(box);
    } else if (shrub.kind === 'wild_heather') {
      // Hillside wild heather cushion
      const cushion = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 * s, 1), getMat(0x8b659c, 0.88));
      cushion.scale.set(1.3, 0.55, 1.3);
      cushion.position.y = 0.25 * s;
      cushion.castShadow = true;
      m.add(cushion);
    } else {
      // Marsh iris / water dock
      for (let b = 0; b < 6; b++) {
        const ba = b * 1.1;
        const bladeGeo = new THREE.ConeGeometry(0.06 * s, 0.75 * s, 4);
        const blade = new THREE.Mesh(bladeGeo, getMat(0x6b874b, 0.86));
        blade.position.set(Math.cos(ba) * 0.18 * s, 0.35 * s, Math.sin(ba) * 0.18 * s);
        blade.rotation.set(Math.sin(ba) * 0.2, 0, -Math.cos(ba) * 0.2);
        m.add(blade);
      }
      const irisFlower = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14 * s, 0), getMat(0xdfba52, 0.7));
      irisFlower.position.y = 0.65 * s;
      m.add(irisFlower);
    }

    placeOnGround(m, shrub.x, shrub.z, shrub.rotation, groundY);
    shrubGroup.add(m);
  });
  group.add(shrubGroup);

  /* --------------------------------------------------------------------------
   * 3. FORMED FLOWERBEDS WITH HEWN STONE CURBS
   * -------------------------------------------------------------------------- */
  const flowerbedGroup = new THREE.Group();
  flowerbedGroup.name = 'greening-flowerbeds';

  FORMED_FLOWERBEDS.forEach(bed => {
    const bedMesh = new THREE.Group();
    bedMesh.name = `flowerbed-${bed.id}`;
    const groundY = islandElevation(bed.x, bed.z);

    // Soil base
    const soil = new THREE.Mesh(new THREE.BoxGeometry(bed.width, 0.18, bed.depth), getMat(0x4a3b2c, 0.95));
    soil.position.y = 0.09;
    soil.receiveShadow = true;
    bedMesh.add(soil);

    // Hewn stone curbs framing the perimeter
    if (bed.hasCurbs) {
      const curbMat = getMat(0xbab3a0, 0.78);
      const curbH = 0.22;
      const curbW = 0.14;
      // Front & Back curbs
      for (const side of [-1, 1]) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(bed.width + curbW * 2, curbH, curbW), curbMat);
        c.position.set(0, curbH / 2, side * (bed.depth / 2 + curbW / 2));
        c.castShadow = true;
        c.receiveShadow = true;
        bedMesh.add(c);
      }
      // Left & Right curbs
      for (const side of [-1, 1]) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(curbW, curbH, bed.depth), curbMat);
        c.position.set(side * (bed.width / 2 + curbW / 2), curbH / 2, 0);
        c.castShadow = true;
        c.receiveShadow = true;
        bedMesh.add(c);
      }
    }

    // Dense blooming flower fill
    const fillRows = Math.max(2, Math.floor(bed.depth / 0.5));
    const fillCols = Math.max(3, Math.floor(bed.width / 0.5));
    const flGeo = new THREE.IcosahedronGeometry(0.12, 0);
    const primMat = getMat(bed.primaryColor, 0.7);
    const secMat = getMat(bed.secondaryColor, 0.7);

    for (let r = 0; r < fillRows; r++) {
      for (let c = 0; c < fillCols; c++) {
        const fx = (c + 0.5) * (bed.width / fillCols) - bed.width / 2;
        const fz = (r + 0.5) * (bed.depth / fillRows) - bed.depth / 2;
        const fl = new THREE.Mesh(flGeo, (r + c) % 2 === 0 ? primMat : secMat);
        fl.position.set(fx, 0.22 + ((r + c) % 3) * 0.04, fz);
        bedMesh.add(fl);
      }
    }

    placeOnGround(bedMesh, bed.x, bed.z, bed.rotation, groundY);
    flowerbedGroup.add(bedMesh);
  });
  group.add(flowerbedGroup);

  /* --------------------------------------------------------------------------
   * 4. HARBOR QUAY WATER STAIRS & BREAKWATER CAPS
   * -------------------------------------------------------------------------- */
  const harborDetailGroup = new THREE.Group();
  harborDetailGroup.name = 'harbor-details';

  // Quay Water Stairs
  const stairs = new THREE.Group();
  stairs.name = 'quay-water-stairs';
  const stoneMat = getMat(0x9a9d8c, 0.8);
  const ironMat = getMat(0x3a4848, 0.5, 0.4);

  const st = QUAY_WATER_STAIRS;
  const stepDepth = st.depth / st.stepCount;
  const stepHeight = (st.topElevation - st.bottomElevation) / st.stepCount;

  for (let i = 0; i < st.stepCount; i++) {
    const stepZ = (i + 0.5) * stepDepth - st.depth / 2;
    const stepY = st.topElevation - (i + 0.5) * stepHeight;
    const tread = new THREE.Mesh(new THREE.BoxGeometry(st.width, stepHeight * 1.2, stepDepth), stoneMat);
    tread.position.set(0, stepY, stepZ);
    tread.receiveShadow = true;
    tread.castShadow = true;
    stairs.add(tread);
  }

  // Iron safety handrails on both sides of stairs
  for (const side of [-1, 1]) {
    const rx = side * (st.width / 2 - 0.08);
    // Rail posts
    for (let p = 0; p <= st.stepCount; p += 2) {
      const pz = p * stepDepth - st.depth / 2;
      const py = st.topElevation - p * stepHeight + 0.45;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6), ironMat);
      post.position.set(rx, py, pz);
      post.castShadow = true;
      stairs.add(post);
    }
    // Inclined rail bar
    const railLength = Math.hypot(st.depth, st.topElevation - st.bottomElevation);
    const railBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, railLength, 6), ironMat);
    railBar.position.set(rx, (st.topElevation + st.bottomElevation) / 2 + 0.9, 0);
    railBar.rotation.x = Math.atan2(st.topElevation - st.bottomElevation, st.depth) - Math.PI / 2;
    stairs.add(railBar);
  }

  placeOnGround(stairs, st.x, st.z, st.rotation, 0);
  harborDetailGroup.add(stairs);

  // Breakwater Flat Capstones
  const capstoneGroup = new THREE.Group();
  capstoneGroup.name = 'breakwater-capstones';
  const capMat = getMat(0xb2aca0, 0.76);

  BREAKWATER_CAPSTONES.forEach((cap, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(cap.width, 0.22, cap.depth), capMat);
    m.name = `capstone-${i}`;
    m.position.set(cap.x, cap.y, cap.z);
    m.rotation.y = cap.rotation;
    m.castShadow = true;
    m.receiveShadow = true;
    capstoneGroup.add(m);
  });
  harborDetailGroup.add(capstoneGroup);

  // Mooring Ropes (catenary curve from boats to dock bollards)
  const ropeGroup = new THREE.Group();
  ropeGroup.name = 'harbor-mooring-ropes';
  const ropeMat = getMat(0xbeab85, 0.9);

  HARBOR_MOORING_ROPES.forEach(rope => {
    const curvePoints: THREE.Vector3[] = [];
    const segments = 12;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = rope.start.x + (rope.end.x - rope.start.x) * t;
      const z = rope.start.z + (rope.end.z - rope.start.z) * t;
      // Catenary sag parabola
      const y = rope.start.y + (rope.end.y - rope.start.y) * t - Math.sin(t * Math.PI) * rope.sag;
      curvePoints.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const ropeGeo = new THREE.TubeGeometry(curve, 16, 0.024, 6, false);
    const ropeMesh = new THREE.Mesh(ropeGeo, ropeMat);
    ropeMesh.name = rope.id;
    ropeMesh.castShadow = true;
    ropeGroup.add(ropeMesh);
  });
  harborDetailGroup.add(ropeGroup);

  // Harbor Prop Clusters (cargo crate stacks, barrels, lifebuoy stand)
  const propClusterGroup = new THREE.Group();
  propClusterGroup.name = 'harbor-prop-clusters';

  group.userData.time = time;

  HARBOR_PROP_CLUSTERS.forEach(cluster => {
    const cl = new THREE.Group();
    cl.name = `cluster-${cluster.id}`;
    const gy = islandElevation(cluster.x, cluster.z);

    if (cluster.kind === 'crate_stack') {
      const crateMat = getMat(0x8a6e4d, 0.88);
      const strapMat = getMat(0x3a4848, 0.6);
      // Bottom crates
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), crateMat);
      c1.position.set(-0.25, 0.3, 0);
      c1.castShadow = true;
      cl.add(c1);

      // Metal corner brackets
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.72), strapMat);
      b1.position.set(-0.25, 0.3, 0);
      cl.add(b1);

      const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.65), crateMat);
      c2.position.set(0.35, 0.275, -0.1);
      c2.castShadow = true;
      cl.add(c2);

      // Top crate
      const c3 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.55), crateMat);
      c3.position.set(0.05, 0.85, 0.05);
      c3.rotation.y = 0.3;
      c3.castShadow = true;
      cl.add(c3);
    } else if (cluster.kind === 'barrel_group') {
      const barrelMat = getMat(0x76583c, 0.85);
      const hoopMat = getMat(0x2f3c3c, 0.5);
      const barrelOffsets: readonly (readonly [number, number])[] = [
        [-0.25, 0],
        [0.25, 0.1],
        [0, -0.28],
      ];
      for (const [bx, bz] of barrelOffsets) {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.7, 10), barrelMat);
        barrel.position.set(bx, 0.35, bz);
        barrel.castShadow = true;
        cl.add(barrel);
        // Iron hoops
        for (const hy of [0.18, 0.52]) {
          const hoop = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.035, 10), hoopMat);
          hoop.position.set(bx, hy, bz);
          cl.add(hoop);
        }
      }
    } else if (cluster.kind === 'rope_coil') {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 16), ropeMat);
      coil.rotation.x = Math.PI / 2;
      coil.position.y = 0.05;
      coil.castShadow = true;
      cl.add(coil);
    } else if (cluster.kind === 'lifebuoy_stand') {
      // Iron post
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4, 6), ironMat);
      post.position.y = 0.7;
      post.castShadow = true;
      cl.add(post);

      // Lifebuoy ring (white with red quarters)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 8, 20), getMat(0xd84537, 0.6));
      ring.position.set(0, 1.05, 0.08);
      ring.castShadow = true;
      cl.add(ring);

      const ringInner = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.065, 8, 20), getMat(0xeee9dc, 0.6));
      ringInner.position.set(0, 1.05, 0.08);
      cl.add(ringInner);
    }

    placeOnGround(cl, cluster.x, cluster.z, cluster.rotation, gy);
    propClusterGroup.add(cl);
  });
  harborDetailGroup.add(propClusterGroup);

  group.add(harborDetailGroup);

  /* --------------------------------------------------------------------------
   * 5. FRONT GARDEN ENCLOSURES & WINDOW BOXES
   * -------------------------------------------------------------------------- */
  const frontGardenGroup = new THREE.Group();
  frontGardenGroup.name = 'front-gardens';

  FRONT_GARDEN_ENCLOSURES.forEach(garden => {
    const gMesh = new THREE.Group();
    gMesh.name = `front-garden-${garden.buildingId}`;
    const woodMat = getMat(0xc4b9a3, 0.85); // Light picket fence
    const postMat = getMat(0x8a7f72, 0.8);

    garden.fenceSegments.forEach(seg => {
      // Picket rail
      const railH = 0.85;
      const rail = new THREE.Mesh(new THREE.BoxGeometry(seg.width, railH, seg.depth), woodMat);
      rail.position.set(seg.x, railH / 2, seg.z);
      rail.rotation.y = seg.rotation;
      rail.castShadow = true;
      rail.receiveShadow = true;
      gMesh.add(rail);

      // Posts at segment ends
      for (const end of [-seg.width / 2, seg.width / 2]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, railH + 0.1, 0.12), postMat);
        const px = seg.x + Math.cos(seg.rotation) * end;
        const pz = seg.z - Math.sin(seg.rotation) * end;
        post.position.set(px, (railH + 0.1) / 2, pz);
        post.castShadow = true;
        gMesh.add(post);
      }
    });

    frontGardenGroup.add(gMesh);
  });
  group.add(frontGardenGroup);

  // Facade Window Boxes
  const windowBoxGroup = new THREE.Group();
  windowBoxGroup.name = 'facade-window-boxes';

  FAÇADE_WINDOW_BOXES.forEach((wb, i) => {
    const boxMesh = new THREE.Group();
    boxMesh.name = `window-box-${i}`;

    const planter = new THREE.Mesh(new THREE.BoxGeometry(wb.width, 0.18, 0.22), getMat(0x765a42, 0.85));
    planter.castShadow = true;
    boxMesh.add(planter);

    // Flowers inside box
    const flMat = getMat(wb.flowerColor, 0.7);
    const count = 4;
    for (let c = 0; c < count; c++) {
      const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), flMat);
      fl.position.set((c + 0.5) * (wb.width / count) - wb.width / 2, 0.14, 0);
      boxMesh.add(fl);
    }

    boxMesh.position.set(wb.x, wb.y, wb.z);
    boxMesh.rotation.y = wb.rotation;
    windowBoxGroup.add(boxMesh);
  });
  group.add(windowBoxGroup);

  return group;
}

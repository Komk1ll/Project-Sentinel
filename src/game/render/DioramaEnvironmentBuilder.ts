/**
 * Project Sentinel - DioramaEnvironmentBuilder
 * Procedural 3D isometric diorama environment builder for Three.js.
 * Constructs rich, detailed low-poly / pixel-art scenes matching the visual style
 * and narrative atmosphere of "CyberShield: Code of Legacy" (Документ.pdf Page 9).
 */

import * as THREE from 'three';
import { gridTo3DWorld } from './PixelArtModelInstance';
import type { ZoneDescriptor } from '../../types/campaign';

export interface BuiltEnvironment {
  root: THREE.Group;
  lights: THREE.Light[];
  animatedElements: Array<{ update: (delta: number, time: number) => void }>;
  dispose: () => void;
}

export class DioramaEnvironmentBuilder {
  /**
   * Builds the complete 3D environment for a given zone descriptor.
   */
  public static buildEnvironment(descriptor: ZoneDescriptor): BuiltEnvironment {
    const root = new THREE.Group();
    root.name = `Env_${descriptor.id}`;
    const lights: THREE.Light[] = [];
    const animatedElements: Array<{ update: (delta: number, time: number) => void }> = [];
    const disposables: Array<{ dispose: () => void }> = [];

    // 1. Build Base Diorama Pedestal & Ground Tiles
    this.buildGroundSlab(root, descriptor, disposables);

    // 2. Build Zone-Specific Architectural Features and Props
    switch (descriptor.id) {
      case 'zone_01_gate':
        this.buildCampusGateScene(root, descriptor, lights, animatedElements, disposables);
        break;
      case 'zone_02_deans_basement':
        this.buildDeansBasementScene(root, descriptor, lights, animatedElements, disposables);
        break;
      case 'zone_03_courtyard_alley':
        this.buildCourtyardAlleyScene(root, descriptor, lights, animatedElements, disposables);
        break;
      case 'zone_04_lab_corridor':
        this.buildLabCorridorScene(root, descriptor, lights, animatedElements, disposables);
        break;
      case 'zone_05_security_room':
        this.buildSecurityRoomScene(root, descriptor, lights, animatedElements, disposables);
        break;
      case 'zone_06_winter_garden':
        this.buildWinterGardenScene(root, descriptor, lights, animatedElements, disposables);
        break;
      case 'zone_07_cable_tunnel':
        this.buildCableTunnelScene(root, descriptor, lights, animatedElements, disposables);
        break;
      case 'zone_08_grand_lobby':
        this.buildLobbyScene(root, descriptor, lights, animatedElements, disposables);
        break;
      case 'zone_09_datacenter':
        this.buildDatacenterScene(root, descriptor, lights, animatedElements, disposables);
        break;
      case 'zone_10_finale_celebration':
        this.buildVictoryCelebrationScene(root, descriptor, lights, animatedElements, disposables);
        break;
      case 'zone_11_finale_cleanup':
        this.buildRecoveryCleanupScene(root, descriptor, lights, animatedElements, disposables);
        break;
      default:
        this.buildGenericEnvironment(root, descriptor, disposables);
        break;
    }

    const dispose = (): void => {
      for (const item of disposables) {
        try {
          item.dispose();
        } catch {
          // ignore
        }
      }
    };

    return { root, lights, animatedElements, dispose };
  }

  // ===========================================================================
  // 1. GROUND SLAB & ISOMETRIC BASE
  // ===========================================================================
  private static buildGroundSlab(
    root: THREE.Group,
    descriptor: ZoneDescriptor,
    disposables: Array<{ dispose: () => void }>
  ): void {
    const { width, height } = descriptor;
    const tileGeo = new THREE.BoxGeometry(1.92, 0.4, 1.92);
    disposables.push(tileGeo);

    // Shared Palette Materials
    const matCobbleLight = new THREE.MeshLambertMaterial({ color: 0x3d4758 });
    const matCobbleDark = new THREE.MeshLambertMaterial({ color: 0x2e3544 });
    const matGrass = new THREE.MeshLambertMaterial({ color: 0x1e3a2b });
    const matGrassTrim = new THREE.MeshLambertMaterial({ color: 0x264837 });
    const matWoodParquet = new THREE.MeshLambertMaterial({ color: 0x543015 });
    const matWoodDark = new THREE.MeshLambertMaterial({ color: 0x3f220d });
    const matTechTile = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
    const matTechDark = new THREE.MeshLambertMaterial({ color: 0x111827 });
    const matMarble = new THREE.MeshLambertMaterial({ color: 0x28303d });

    disposables.push(
      matCobbleLight, matCobbleDark, matGrass, matGrassTrim,
      matWoodParquet, matWoodDark, matTechTile, matTechDark, matMarble
    );

    const isOutdoor = [
      'zone_01_gate',
      'zone_03_courtyard_alley',
      'zone_09_grand_entrance',
      'zone_12_victory_celebration',
      'zone_11_finale_cleanup',
      'zone_13_recovery_cleanup',
    ].includes(descriptor.id);

    const isWoodInterior = [
      'zone_02_deans_basement',
      'zone_05_security_room',
    ].includes(descriptor.id);

    const isTechInterior = [
      'zone_04_lab_corridor',
      'zone_07_computer_lab',
      'zone_08_cable_tunnel',
      'zone_11_datacenter',
    ].includes(descriptor.id);

    const isGreenhouse = descriptor.id === 'zone_06_winter_garden';

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let mat = matCobbleDark;

        if (isOutdoor) {
          // Central avenue vs side lawns
          const isAvenue = descriptor.id === 'zone_01_gate'
            ? x >= 7 && x <= 13
            : (x >= 4 && x <= width - 5);

          if (isAvenue) {
            mat = (x + y) % 2 === 0 ? matCobbleLight : matCobbleDark;
          } else {
            mat = (x + y) % 2 === 0 ? matGrass : matGrassTrim;
          }
        } else if (isWoodInterior) {
          mat = (x + y) % 2 === 0 ? matWoodParquet : matWoodDark;
        } else if (isTechInterior) {
          mat = (x + y) % 2 === 0 ? matTechTile : matTechDark;
        } else if (isGreenhouse) {
          mat = (x >= 4 && x <= width - 5)
            ? (x + y) % 2 === 0 ? matWoodParquet : matWoodDark
            : matGrass;
        } else {
          mat = (x + y) % 2 === 0 ? matMarble : matTechTile;
        }

        const tileMesh = new THREE.Mesh(tileGeo, mat);
        const worldPos = gridTo3DWorld(x, y, -0.2);
        tileMesh.position.copy(worldPos);
        tileMesh.rotation.y = Math.PI / 4;
        tileMesh.receiveShadow = true;
        root.add(tileMesh);
      }
    }
  }

  // ===========================================================================
  // 2. ZONE 01: CAMPUS GATE & FORCEFIELD BARRIER (Act I, Quest 1)
  // ===========================================================================
  private static buildCampusGateScene(
    root: THREE.Group,
    _descriptor: ZoneDescriptor,
    lights: THREE.Light[],
    animatedElements: Array<{ update: (delta: number, time: number) => void }>,
    disposables: Array<{ dispose: () => void }>
  ): void {
    // 1. Massive Stone Pillars for Main Gate at (6.5, 4) and (13.5, 4)
    const pillarGeo = new THREE.BoxGeometry(0.8, 3.5, 0.8);
    const pillarCapGeo = new THREE.BoxGeometry(1.1, 0.3, 1.1);
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    disposables.push(pillarGeo, pillarCapGeo, stoneMat);

    const pillarCoords = [
      { x: 6.5, y: 4 },
      { x: 13.5, y: 4 },
    ];

    for (const coord of pillarCoords) {
      const pos = gridTo3DWorld(coord.x, coord.y, 1.75);
      const pillar = new THREE.Mesh(pillarGeo, stoneMat);
      pillar.position.copy(pos);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      root.add(pillar);

      const cap = new THREE.Mesh(pillarCapGeo, stoneMat);
      cap.position.copy(pos);
      cap.position.y += 1.8;
      root.add(cap);

      // Lantern on top of pillar
      const lanternGeo = new THREE.BoxGeometry(0.4, 0.5, 0.4);
      const lanternMat = new THREE.MeshLambertMaterial({
        color: 0xfef08a,
        emissive: 0xfde047,
        emissiveIntensity: 0.8,
      });
      disposables.push(lanternGeo, lanternMat);

      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.copy(pos);
      lantern.position.y += 2.2;
      root.add(lantern);
    }

    // 2. Wrought-Iron Perimeter Fence on left and right of gate
    const fenceMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    disposables.push(fenceMat);

    for (let x = 0; x <= 6; x += 1.5) {
      this.createFenceSection(root, x, 4, fenceMat, disposables);
    }
    for (let x = 14; x <= 20; x += 1.5) {
      this.createFenceSection(root, x, 4, fenceMat, disposables);
    }

    // 3. GLOWING BLUE ENERGY FORCEFIELD BARRIER across gate (x from 7 to 13 at y=4)
    const gateStart = gridTo3DWorld(7, 4, 1.5);
    const gateEnd = gridTo3DWorld(13, 4, 1.5);
    const barrierCenter = new THREE.Vector3().addVectors(gateStart, gateEnd).multiplyScalar(0.5);
    const barrierWidth = gateStart.distanceTo(gateEnd);

    const barrierGeo = new THREE.PlaneGeometry(barrierWidth, 3.0);
    const barrierMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    disposables.push(barrierGeo, barrierMat);

    const barrierMesh = new THREE.Mesh(barrierGeo, barrierMat);
    barrierMesh.position.copy(barrierCenter);
    // Align plane angle to gate line
    const angle = Math.atan2(gateEnd.z - gateStart.z, gateEnd.x - gateStart.x);
    barrierMesh.rotation.y = -angle;
    root.add(barrierMesh);

    // Cyan Neon Light casting glow on pavement
    const forcefieldLight = new THREE.PointLight(0x00f5ff, 2.0, 10);
    forcefieldLight.position.copy(barrierCenter);
    forcefieldLight.position.y += 0.5;
    root.add(forcefieldLight);
    lights.push(forcefieldLight);

    // Barrier pulsating animation
    animatedElements.push({
      update: (_delta, time) => {
        barrierMat.opacity = 0.55 + Math.sin(time * 4) * 0.15;
        forcefieldLight.intensity = 1.8 + Math.sin(time * 6) * 0.4;
      },
    });

    // 4. Street Lamps along Central Avenue with warm point lights
    const lampCoords = [
      { x: 7, y: 7 },
      { x: 13, y: 7 },
      { x: 7, y: 13 },
      { x: 13, y: 13 },
    ];

    for (const lampCoord of lampCoords) {
      this.createStreetLamp(root, lampCoord.x, lampCoord.y, lights, disposables);
    }

    // 5. Decorative Hedges & Flowerbeds (Alexey's hiding place at x:2, y:3)
    this.createBushCluster(root, 2, 3, disposables);
    this.createBushCluster(root, 3, 2, disposables);
    this.createBushCluster(root, 4, 4, disposables);
    this.createBushCluster(root, 16, 3, disposables);
    this.createBushCluster(root, 17, 4, disposables);

    // 6. Patrol Droid Yellow Scanning Cone at (10, 8)
    const scanConeGeo = new THREE.ConeGeometry(2.5, 4.0, 16, 1, true);
    const scanConeMat = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposables.push(scanConeGeo, scanConeMat);

    const scanCone = new THREE.Mesh(scanConeGeo, scanConeMat);
    const droidPos = gridTo3DWorld(10, 8, 1.2);
    scanCone.position.copy(droidPos);
    scanCone.rotation.x = Math.PI / 2.6; // Point downwards toward ground
    scanCone.position.z += 1.8;
    scanCone.position.y -= 0.6;
    root.add(scanCone);

    const scanLight = new THREE.SpotLight(0xffd700, 3.0, 12, Math.PI / 6, 0.4);
    scanLight.position.copy(droidPos);
    scanLight.target.position.set(droidPos.x, 0, droidPos.z + 4);
    root.add(scanLight);
    root.add(scanLight.target);
    lights.push(scanLight);

    // Animate yellow scanning cone sweeping left and right
    animatedElements.push({
      update: (_delta, time) => {
        const sweep = Math.sin(time * 1.8) * 0.45;
        scanCone.rotation.y = sweep;
        scanLight.target.position.x = droidPos.x + Math.sin(sweep) * 4;
      },
    });

    // 7. Service Bypass Path to Dean's Basement marker at (18, 3)
    this.createPortalMarker(root, 18, 3, 'Вход в подвал', 0x38bdf8, animatedElements, disposables);
  }

  // ===========================================================================
  // 3. ZONE 02: DEAN'S BASEMENT (Act I, Quest 2)
  // ===========================================================================
  private static buildDeansBasementScene(
    root: THREE.Group,
    _descriptor: ZoneDescriptor,
    lights: THREE.Light[],
    animatedElements: Array<{ update: (delta: number, time: number) => void }>,
    disposables: Array<{ dispose: () => void }>
  ): void {
    // Bookshelves along north/west perimeter
    const shelfGeo = new THREE.BoxGeometry(2.5, 3.0, 0.6);
    const shelfMat = new THREE.MeshLambertMaterial({ color: 0x4a2810 });
    disposables.push(shelfGeo, shelfMat);

    for (let x = 2; x <= 10; x += 3) {
      const shelf = new THREE.Mesh(shelfGeo, shelfMat);
      const pos = gridTo3DWorld(x, 1, 1.5);
      shelf.position.copy(pos);
      shelf.rotation.y = Math.PI / 4;
      root.add(shelf);
    }

    // Wooden Office Desks
    this.createOfficeDesk(root, 6, 6, disposables);
    this.createOfficeDesk(root, 4, 3, disposables);

    // Glowing Duty Terminal at (6, 6)
    const termLight = new THREE.PointLight(0x22c55e, 1.8, 6);
    termLight.position.copy(gridTo3DWorld(6, 6, 1.2));
    root.add(termLight);
    lights.push(termLight);

    // Keypad Door at (12, 7)
    this.createSecurityDoor(root, 12, 7, animatedElements, disposables);
  }

  // ===========================================================================
  // 4. ZONE 03: COURTYARD ALLEY (Act I, Quest 3)
  // ===========================================================================
  private static buildCourtyardAlleyScene(
    root: THREE.Group,
    _descriptor: ZoneDescriptor,
    lights: THREE.Light[],
    _animatedElements: Array<{ update: (delta: number, time: number) => void }>,
    disposables: Array<{ dispose: () => void }>
  ): void {
    // Benches along alley
    this.createParkBench(root, 4, 6, disposables);
    this.createParkBench(root, 12, 6, disposables);

    // Trees
    this.createStylizedTree(root, 3, 3, disposables);
    this.createStylizedTree(root, 13, 3, disposables);

    // Lampposts
    this.createStreetLamp(root, 5, 8, lights, disposables);
    this.createStreetLamp(root, 11, 8, lights, disposables);
  }

  // ===========================================================================
  // 5. ZONE 04: LAB CORRIDOR (Act I/II, Quest 4 & 8)
  // ===========================================================================
  private static buildLabCorridorScene(
    root: THREE.Group,
    descriptor: ZoneDescriptor,
    lights: THREE.Light[],
    animatedElements: Array<{ update: (delta: number, time: number) => void }>,
    disposables: Array<{ dispose: () => void }>
  ): void {
    // Corridor Walls along length
    const wallGeo = new THREE.BoxGeometry(1.9, 3.2, 0.4);
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    disposables.push(wallGeo, wallMat);

    for (let x = 0; x < descriptor.width; x += 2) {
      const wall1 = new THREE.Mesh(wallGeo, wallMat);
      wall1.position.copy(gridTo3DWorld(x, 1, 1.6));
      wall1.rotation.y = Math.PI / 4;
      root.add(wall1);

      const wall2 = new THREE.Mesh(wallGeo, wallMat);
      wall2.position.copy(gridTo3DWorld(x, descriptor.height - 1, 1.6));
      wall2.rotation.y = Math.PI / 4;
      root.add(wall2);
    }

    // Emergency Red Beacon Light at (8, 5) and (16, 5)
    const alarmLight = new THREE.PointLight(0xef4444, 2.5, 12);
    alarmLight.position.copy(gridTo3DWorld(10, 5, 2.8));
    root.add(alarmLight);
    lights.push(alarmLight);

    animatedElements.push({
      update: (_delta, time) => {
        alarmLight.intensity = 1.0 + Math.abs(Math.sin(time * 5)) * 2.0;
      },
    });

    // Professor's locked door at (18, 3)
    this.createSecurityDoor(root, 18, 3, animatedElements, disposables);
  }

  // ===========================================================================
  // 6. ZONE 05: SECURITY ROOM (Act II, Quest 5)
  // ===========================================================================
  private static buildSecurityRoomScene(
    root: THREE.Group,
    _descriptor: ZoneDescriptor,
    lights: THREE.Light[],
    _animatedElements: Array<{ update: (delta: number, time: number) => void }>,
    disposables: Array<{ dispose: () => void }>
  ): void {
    // Security Monitoring Desk at (6, 5)
    this.createOfficeDesk(root, 6, 5, disposables);

    // Cold Blue CCTV Glow
    const cctvLight = new THREE.PointLight(0x38bdf8, 2.0, 8);
    cctvLight.position.copy(gridTo3DWorld(6, 5, 1.5));
    root.add(cctvLight);
    lights.push(cctvLight);
  }

  // ===========================================================================
  // 7. ZONE 06: WINTER GARDEN GREENHOUSE (Act II, Quest 7)
  // ===========================================================================
  private static buildWinterGardenScene(
    root: THREE.Group,
    _descriptor: ZoneDescriptor,
    lights: THREE.Light[],
    _animatedElements: Array<{ update: (delta: number, time: number) => void }>,
    disposables: Array<{ dispose: () => void }>
  ): void {
    // Tropical Palm Trees
    this.createPalmTree(root, 4, 4, disposables);
    this.createPalmTree(root, 14, 4, disposables);
    this.createPalmTree(root, 14, 14, disposables);

    // Warm Sunset Light filtering in
    const sunsetLight = new THREE.DirectionalLight(0xf97316, 1.2);
    sunsetLight.position.set(-20, 25, 20);
    root.add(sunsetLight);
    lights.push(sunsetLight);
  }


  // ===========================================================================
  // 9. ZONE 08: CABLE TUNNEL (Act III, Quest 9)
  // ===========================================================================
  private static buildCableTunnelScene(
    root: THREE.Group,
    descriptor: ZoneDescriptor,
    lights: THREE.Light[],
    _animatedElements: Array<{ update: (delta: number, time: number) => void }>,
    disposables: Array<{ dispose: () => void }>
  ): void {
    // Glowing Cyan Conduits along walls
    const cableGeo = new THREE.CylinderGeometry(0.08, 0.08, descriptor.width * 2, 8);
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    disposables.push(cableGeo, cableMat);

    const cable = new THREE.Mesh(cableGeo, cableMat);
    cable.position.copy(gridTo3DWorld(descriptor.width / 2, 2, 1.8));
    cable.rotation.z = Math.PI / 2;
    cable.rotation.y = Math.PI / 4;
    root.add(cable);

    const tunnelLight = new THREE.PointLight(0x06b6d4, 1.5, 10);
    tunnelLight.position.copy(gridTo3DWorld(10, 4, 1.5));
    root.add(tunnelLight);
    lights.push(tunnelLight);
  }


  // ===========================================================================
  // 11. ZONE 10: GRAND LOBBY (Act III, Quest 11)
  // ===========================================================================
  private static buildLobbyScene(
    root: THREE.Group,
    _descriptor: ZoneDescriptor,
    _lights: THREE.Light[],
    _animatedElements: Array<{ update: (delta: number, time: number) => void }>,
    disposables: Array<{ dispose: () => void }>
  ): void {
    this.createParkBench(root, 6, 6, disposables);
    this.createParkBench(root, 12, 6, disposables);
  }

  // ===========================================================================
  // 12. ZONE 11: DATACENTER VAULT (Act III, Quest 12 & Act IV, Quest 13)
  // ===========================================================================
  private static buildDatacenterScene(
    root: THREE.Group,
    _descriptor: ZoneDescriptor,
    lights: THREE.Light[],
    animatedElements: Array<{ update: (delta: number, time: number) => void }>,
    disposables: Array<{ dispose: () => void }>
  ): void {
    // Holographic Console Projection Ring at center (9, 9)
    const ringGeo = new THREE.RingGeometry(1.2, 1.4, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    disposables.push(ringGeo, ringMat);

    const ring = new THREE.Mesh(ringGeo, ringMat);
    const centerPos = gridTo3DWorld(9, 9, 1.2);
    ring.position.copy(centerPos);
    ring.rotation.x = Math.PI / 2;
    root.add(ring);

    const holoLight = new THREE.PointLight(0x38bdf8, 2.5, 10);
    holoLight.position.copy(centerPos);
    root.add(holoLight);
    lights.push(holoLight);

    animatedElements.push({
      update: (delta, _time) => {
        ring.rotation.z += delta * 1.2;
      },
    });
  }

  // ===========================================================================
  // 13. FINALES: CELEBRATION & CLEANUP
  // ===========================================================================
  private static buildVictoryCelebrationScene(
    root: THREE.Group,
    descriptor: ZoneDescriptor,
    lights: THREE.Light[],
    _animatedElements: Array<{ update: (delta: number, time: number) => void }>,
    disposables: Array<{ dispose: () => void }>
  ): void {
    this.buildCourtyardAlleyScene(root, descriptor, lights, [], disposables);

    // Bright morning celebratory sun
    const sun = new THREE.DirectionalLight(0xfef08a, 1.4);
    sun.position.set(20, 30, 10);
    root.add(sun);
    lights.push(sun);
  }

  private static buildRecoveryCleanupScene(
    root: THREE.Group,
    descriptor: ZoneDescriptor,
    lights: THREE.Light[],
    _animatedElements: Array<{ update: (delta: number, time: number) => void }>,
    disposables: Array<{ dispose: () => void }>
  ): void {
    this.buildCourtyardAlleyScene(root, descriptor, lights, [], disposables);
  }

  private static buildGenericEnvironment(
    _root: THREE.Group,
    _descriptor: ZoneDescriptor,
    _disposables: Array<{ dispose: () => void }>
  ): void {
    // Default placeholder props
  }

  // ===========================================================================
  // HELPER REUSABLE OBJECT BUILDERS
  // ===========================================================================
  private static createFenceSection(
    root: THREE.Group,
    x: number,
    y: number,
    mat: THREE.Material,
    disposables: Array<{ dispose: () => void }>
  ): void {
    const barGeo = new THREE.BoxGeometry(0.08, 1.8, 0.08);
    const railGeo = new THREE.BoxGeometry(1.4, 0.08, 0.08);
    disposables.push(barGeo, railGeo);

    const pos = gridTo3DWorld(x, y, 0.9);
    const rot = Math.PI / 4;

    const rail = new THREE.Mesh(railGeo, mat);
    rail.position.copy(pos);
    rail.position.y += 0.4;
    rail.rotation.y = rot;
    root.add(rail);

    const bar = new THREE.Mesh(barGeo, mat);
    bar.position.copy(pos);
    bar.rotation.y = rot;
    root.add(bar);
  }

  private static createStreetLamp(
    root: THREE.Group,
    x: number,
    y: number,
    lights: THREE.Light[],
    disposables: Array<{ dispose: () => void }>
  ): void {
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 3.2, 8);
    const lanternGeo = new THREE.BoxGeometry(0.35, 0.45, 0.35);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const lanternMat = new THREE.MeshLambertMaterial({
      color: 0xfef08a,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.9,
    });
    disposables.push(poleGeo, lanternGeo, poleMat, lanternMat);

    const pos = gridTo3DWorld(x, y, 1.6);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.copy(pos);
    root.add(pole);

    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.copy(pos);
    lantern.position.y += 1.6;
    root.add(lantern);

    const light = new THREE.PointLight(0xffdd80, 1.4, 7);
    light.position.copy(pos);
    light.position.y += 1.6;
    root.add(light);
    lights.push(light);
  }

  private static createBushCluster(
    root: THREE.Group,
    x: number,
    y: number,
    disposables: Array<{ dispose: () => void }>
  ): void {
    const bushGeo = new THREE.DodecahedronGeometry(0.65, 0);
    const bushMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
    disposables.push(bushGeo, bushMat);

    const pos = gridTo3DWorld(x, y, 0.4);
    const bush = new THREE.Mesh(bushGeo, bushMat);
    bush.position.copy(pos);
    bush.castShadow = true;
    root.add(bush);
  }

  private static createOfficeDesk(
    root: THREE.Group,
    x: number,
    y: number,
    disposables: Array<{ dispose: () => void }>
  ): void {
    const deskGeo = new THREE.BoxGeometry(1.6, 0.75, 0.9);
    const deskMat = new THREE.MeshLambertMaterial({ color: 0x5c3317 });
    disposables.push(deskGeo, deskMat);

    const pos = gridTo3DWorld(x, y, 0.4);
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.copy(pos);
    desk.rotation.y = Math.PI / 4;
    desk.castShadow = true;
    desk.receiveShadow = true;
    root.add(desk);
  }

  private static createParkBench(
    root: THREE.Group,
    x: number,
    y: number,
    disposables: Array<{ dispose: () => void }>
  ): void {
    const benchGeo = new THREE.BoxGeometry(1.4, 0.45, 0.5);
    const benchMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    disposables.push(benchGeo, benchMat);

    const pos = gridTo3DWorld(x, y, 0.25);
    const bench = new THREE.Mesh(benchGeo, benchMat);
    bench.position.copy(pos);
    bench.rotation.y = Math.PI / 4;
    root.add(bench);
  }

  private static createStylizedTree(
    root: THREE.Group,
    x: number,
    y: number,
    disposables: Array<{ dispose: () => void }>
  ): void {
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 2.2, 8);
    const leavesGeo = new THREE.DodecahedronGeometry(1.3, 0);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
    const leavesMat = new THREE.MeshLambertMaterial({ color: 0x166534 });
    disposables.push(trunkGeo, leavesGeo, trunkMat, leavesMat);

    const pos = gridTo3DWorld(x, y, 1.1);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.copy(pos);
    root.add(trunk);

    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.copy(pos);
    leaves.position.y += 1.6;
    root.add(leaves);
  }

  private static createPalmTree(
    root: THREE.Group,
    x: number,
    y: number,
    disposables: Array<{ dispose: () => void }>
  ): void {
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.22, 3.0, 8);
    const crownGeo = new THREE.ConeGeometry(1.6, 1.2, 7);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const crownMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
    disposables.push(trunkGeo, crownGeo, trunkMat, crownMat);

    const pos = gridTo3DWorld(x, y, 1.5);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.copy(pos);
    root.add(trunk);

    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.copy(pos);
    crown.position.y += 1.8;
    root.add(crown);
  }

  private static createSecurityDoor(
    root: THREE.Group,
    x: number,
    y: number,
    animatedElements: Array<{ update: (delta: number, time: number) => void }>,
    disposables: Array<{ dispose: () => void }>
  ): void {
    const frameGeo = new THREE.BoxGeometry(0.2, 2.6, 1.4);
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    disposables.push(frameGeo, frameMat);

    const pos = gridTo3DWorld(x, y, 1.3);
    const door = new THREE.Mesh(frameGeo, frameMat);
    door.position.copy(pos);
    door.rotation.y = Math.PI / 4;
    root.add(door);

    // Keypad LED
    const ledGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    disposables.push(ledGeo, ledMat);

    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.copy(pos);
    led.position.y += 0.2;
    root.add(led);

    animatedElements.push({
      update: (_delta, time) => {
        ledMat.color.setHex(Math.sin(time * 3) > 0 ? 0xef4444 : 0x7f1d1d);
      },
    });
  }

  private static createPortalMarker(
    root: THREE.Group,
    x: number,
    y: number,
    _label: string,
    colorHex: number,
    animatedElements: Array<{ update: (delta: number, time: number) => void }>,
    disposables: Array<{ dispose: () => void }>
  ): void {
    const ringGeo = new THREE.RingGeometry(0.5, 0.7, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    disposables.push(ringGeo, ringMat);

    const pos = gridTo3DWorld(x, y, 0.05);
    const marker = new THREE.Mesh(ringGeo, ringMat);
    marker.position.copy(pos);
    marker.rotation.x = Math.PI / 2;
    root.add(marker);

    animatedElements.push({
      update: (delta, time) => {
        marker.rotation.z += delta * 1.5;
        ringMat.opacity = 0.4 + Math.sin(time * 4) * 0.25;
      },
    });
  }
}

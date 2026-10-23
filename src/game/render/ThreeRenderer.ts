import * as THREE from 'three';
import { planetFrame, walkingAltitude } from '@game/systems/planet';
import { placeOnPlanet } from '@game/render/planet-surface';
import { PlanetLifeView } from '@game/render/planet-life';
import type { TownLife } from '@game/systems/town-life';
import { disposeObject, loadTownAssets } from '@game/render/town-assets';
import { createMasterMesh } from '@game/render/master-mesh';
import { MASTER, MEDIC } from '@content/first-aid';
import type { FirstAidMission } from '@game/systems/first-aid-mission';
import { createWebTown } from '@game/render/web-town';
import { createInteriorMeshes } from '@game/render/interior-meshes';
import type { TownWorld } from '@game/systems/town-world';
import { buildingEntrance, TOWN_BUILDINGS } from '@content/town';
import type { CameraZoom } from '@game/systems/camera-zoom';

export interface ThreeRendererOptions {
  readonly containerId: string;
  readonly world: TownWorld;
  readonly zoom: CameraZoom;
  readonly firstAid: FirstAidMission;
  readonly life?: TownLife;
}

/** Presentation of the town simulation; all collision and transitions live in TownWorld. */
export class ThreeRenderer {
  public readonly scene = new THREE.Scene();
  public readonly camera: THREE.OrthographicCamera;
  public readonly renderer: THREE.WebGLRenderer;
  private lifeView: PlanetLifeView;
  private readonly sun = new THREE.DirectionalLight(0xffe2b3,2.3);
  private readonly cameraFrame = new THREE.Quaternion();
  private readonly sightDirection = { value: new THREE.Vector3(28,34,28).normalize() };
  private readonly surfaceUp = { value: new THREE.Vector3(0,1,0) };
  private readonly container: HTMLElement;
  private outdoors: THREE.Group;
  private readonly assetLibrary = new THREE.Group();
  private heroKit: THREE.Object3D | null = null;
  private readonly interiorAssets = new Map<string, THREE.Group>();
  private readonly resident = new THREE.Group();
  private readonly limbRest = [0, 0, 0, 0];
  private readonly master = createMasterMesh();
  private readonly medic = createMasterMesh(MEDIC);
  private readonly character = new THREE.Group();
  private leftLeg: THREE.Object3D = new THREE.Group();
  private rightLeg: THREE.Object3D = new THREE.Group();
  private leftArm: THREE.Object3D = new THREE.Group();
  private rightArm: THREE.Object3D = new THREE.Group();
  private readonly target = new THREE.Vector3();
  private readonly cameraOffset = new THREE.Vector3(28, 34, 28);
  private readonly doorMarker: THREE.Mesh;
  private room: THREE.Group | null = null;
  private roomId: string | null = null;
  private walkTime = 0;
  private lastPosition = new THREE.Vector2();
  private isDestroyed = false;
  private readonly cutawayPosition = { value: new THREE.Vector3() };

  constructor(private readonly options: ThreeRendererOptions) {
    const container = document.getElementById(options.containerId);
    if (!container) throw new Error(`Missing render container: ${options.containerId}`);
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0xbdd9df);
    this.container.appendChild(this.renderer.domElement);
    this.camera = new THREE.OrthographicCamera(-20, 20, 14, -14, .1, 250);
    this.scene.fog = new THREE.Fog(0xbdd9df, 180, 290);
    this.scene.add(new THREE.HemisphereLight(0xe8f3ef, 0x8b9b76, 1.9));
    const sun = this.sun;
    sun.position.set(-25, 45, -5);
    sun.target.position.set(32, 0, 32);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 150 });
    sun.shadow.bias = -.0005;
    sun.shadow.normalBias = .025;
    sun.shadow.radius = 4;
    this.scene.add(sun, sun.target);
    const fill = new THREE.DirectionalLight(0xd0e7e2, .65);
    fill.position.set(40, 25, 60); this.scene.add(fill);
    this.outdoors = createWebTown();
    this.lifeView=new PlanetLifeView(options.life??options.firstAid.life);
    this.outdoors.add(this.lifeView.group);
    this.assetLibrary.visible = false;
    this.scene.add(this.assetLibrary);
    this.setupCharacterCutaway(this.outdoors);
    this.scene.add(this.outdoors);
    this.buildCharacter();
    this.scene.add(this.character);
    this.master.group.visible = false;
    this.scene.add(this.master.group);
    this.medic.group.visible = false;
    this.scene.add(this.medic.group);
    this.resident.name = 'clinic-resident';
    this.resident.position.set(3.8, .08, 1.8);
    this.resident.rotation.y = -Math.PI / 2;
    this.resident.visible = false;
    this.scene.add(this.resident);
    this.doorMarker = new THREE.Mesh(
      new THREE.RingGeometry(.34, .48, 40),
      new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: .8, depthWrite: false })
    );
    this.doorMarker.rotation.x = -Math.PI / 2;
    this.scene.add(this.doorMarker);
    const { x, z } = options.world.position;
    this.target.set(x, 0, z);
    this.lastPosition.set(x, z);
    this.cameraFrame.copy(planetFrame(options.world.interior?options.world.snapshot.outdoorReturn:options.world.position).rotation);
    this.resize();
    window.addEventListener('resize', this.resize);
    this.container.addEventListener('wheel', this.onWheel, { passive: false });
  }

  public async loadVisuals(): Promise<void> {
    const assets = await loadTownAssets();
    if (this.isDestroyed) { assets.forEach(disposeObject); return; }
    const take = (name: string): THREE.Group => {
      const asset = assets.get(name);
      if (!asset) throw new Error(`Missing bundled visual asset: ${name}`);
      return asset;
    };
    this.scene.remove(this.outdoors);
    this.disposeGroup(this.outdoors);
    this.assetLibrary.add(...assets.values());
    this.outdoors = createWebTown(assets);
    this.lifeView=new PlanetLifeView(this.options.life??this.options.firstAid.life,take('hero'));
    this.outdoors.add(this.lifeView.group);
    this.setupCharacterCutaway(this.outdoors);
    this.outdoors.visible = this.options.world.interior === null;
    this.scene.add(this.outdoors);
    this.disposeGroup(this.character);
    this.character.clear();
    const hero = take('hero');
    this.character.add(hero);
    const attachKit = (model: THREE.Group): THREE.Group => {
      const socket = model.getObjectByName('aid-kit-socket');
      if (!socket) throw new Error('Actor has no aid-kit socket');
      const kit = take('aid-kit').clone(true); kit.name = 'aid-kit-parcel';
      socket.add(kit); return kit;
    };
    this.heroKit = attachKit(hero);
    this.leftLeg = hero.getObjectByName('left-leg') ?? new THREE.Object3D();
    this.rightLeg = hero.getObjectByName('right-leg') ?? new THREE.Object3D();
    this.leftArm = hero.getObjectByName('left-arm') ?? new THREE.Object3D();
    this.rightArm = hero.getObjectByName('right-arm') ?? new THREE.Object3D();
    [this.leftLeg, this.rightLeg, this.leftArm, this.rightArm].forEach((limb, index) => { this.limbRest[index] = limb.rotation.x; });
    const marker = new THREE.Mesh(new THREE.RingGeometry(.33, .4, 32), new THREE.MeshBasicMaterial({ color: 0x2b9493, side: THREE.DoubleSide }));
    marker.rotation.x = -Math.PI / 2; marker.position.y = .03; this.character.add(marker);
    for (const [name, actor] of [['master', this.master], ['medic', this.medic]] as const) {
      this.disposeGroup(actor.group); actor.group.clear();
      const model = take(name); actor.group.add(model);
      actor.group.position.y = .08;
      actor.kit = attachKit(model);
    }
    const seatedResident = take('resident');
    seatedResident.scale.setScalar(.70);
    this.resident.add(seatedResident);
    for (const [name, model] of assets) if (name.startsWith('interior-')) {
      this.setupCharacterCutaway(model);
      this.interiorAssets.set(name.slice('interior-'.length), model);
    }
    if (this.room) { this.scene.remove(this.room); this.disposeGroup(this.room); }
    this.room = null; this.roomId = null;
  }

  /** Dither a narrow sight line through foreground facades so the player stays visible. */
  private setupCharacterCutaway(group: THREE.Object3D): void {
    const materials = new Set<THREE.MeshStandardMaterial>();
    group.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material instanceof THREE.MeshStandardMaterial) materials.add(material);
      }
    });
    materials.forEach(material => {
      material.onBeforeCompile = shader => {
        shader.uniforms.sentinelPlayer = this.cutawayPosition;
        shader.uniforms.sentinelSight = this.sightDirection;
        shader.uniforms.sentinelUp = this.surfaceUp;
        shader.vertexShader = 'varying vec3 sentinelWorldPosition;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
          #include <project_vertex>
          vec4 sentinelWorld = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            sentinelWorld = instanceMatrix * sentinelWorld;
          #endif
          sentinelWorldPosition = (modelMatrix * sentinelWorld).xyz;
        `);
        shader.fragmentShader = 'varying vec3 sentinelWorldPosition;\nuniform vec3 sentinelPlayer;\nuniform vec3 sentinelSight;\nuniform vec3 sentinelUp;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', `
          #include <clipping_planes_fragment>
          vec3 sentinelDelta = sentinelWorldPosition - sentinelPlayer;
          vec3 sentinelDirection = sentinelSight;
          float sentinelDepth = dot(sentinelDelta, sentinelDirection);
          float sentinelDistance = length(sentinelDelta - sentinelDirection * sentinelDepth);
          if (sentinelDepth > 1.1 && dot(sentinelDelta,sentinelUp) > 0.2 && sentinelDistance < 1.15) {
            if (mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 3.0) < 2.0) discard;
          }
        `);
      };
      material.customProgramCacheKey = () => 'sentinel-character-cutaway-sphere';
    });
  }

  private buildCharacter(): void {
    const coat = new THREE.MeshStandardMaterial({ color: 0x253d49, roughness: .9 });
    const trousers = new THREE.MeshStandardMaterial({ color: 0x242e34, roughness: 1 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xc19a79, roughness: 1 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x302e2a, roughness: 1 });
    const boots = new THREE.MeshStandardMaterial({ color: 0x282722, roughness: 1 });
    function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x: number, y: number, z: number): THREE.Mesh {
      const item = new THREE.Mesh(geometry, material);
      item.position.set(x, y, z); item.castShadow = true; parent.add(item); return item;
    }
    mesh(new THREE.CapsuleGeometry(.27, .48, 4, 10), coat, this.character, 0, 1.12, 0);
    mesh(new THREE.SphereGeometry(.205, 12, 10), skin, this.character, 0, 1.74, 0);
    const hood = mesh(new THREE.TorusGeometry(.2, .085, 8, 12), coat, this.character, 0, 1.48, .06);
    hood.rotation.x = Math.PI / 2;
    const headHair = mesh(new THREE.SphereGeometry(.21, 12, 8, 0, Math.PI * 2, 0, Math.PI * .55), hair, this.character, 0, 1.78, 0);
    headHair.rotation.x = -.1;
    mesh(new THREE.BoxGeometry(.25, .33, .16), new THREE.MeshStandardMaterial({ color: 0x52605b }), this.character, 0, 1.2, .28);
    for (const [side, limb] of [[-1, this.leftLeg], [1, this.rightLeg]] as const) {
      limb.position.set(side * .14, .77, 0);
      mesh(new THREE.CapsuleGeometry(.105, .48, 3, 8), trousers, limb, 0, -.31, 0);
      mesh(new THREE.BoxGeometry(.22, .14, .34), boots, limb, 0, -.68, -.06);
      this.character.add(limb);
    }
    for (const [side, limb] of [[-1, this.leftArm], [1, this.rightArm]] as const) {
      limb.position.set(side * .31, 1.4, 0);
      mesh(new THREE.CapsuleGeometry(.09, .38, 3, 8), coat, limb, side * .015, -.23, 0);
      mesh(new THREE.SphereGeometry(.085, 8, 6), skin, limb, side * .02, -.51, 0);
      this.character.add(limb);
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(.3, .35, 40), new THREE.MeshBasicMaterial({ color: 0x7accca, transparent: true, opacity: .6, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = .04; this.character.add(ring);
  }

  public render(deltaSeconds = 1 / 60): void {
    if (this.isDestroyed) return;
    const world = this.options.world;
    const nextRoomId = world.interior?.id ?? null;
    this.master.group.visible = nextRoomId === MASTER.buildingId;
    this.master.kit.visible = this.options.firstAid.snapshot.stage === 'meet-master';
    if (this.heroKit) this.heroKit.visible = this.options.firstAid.snapshot.stage === 'deliver-aid';
    this.medic.group.visible = nextRoomId === MEDIC.buildingId;
    this.medic.kit.visible = this.options.firstAid.snapshot.clinicSupplied;
    this.resident.visible = nextRoomId === MEDIC.buildingId && this.options.firstAid.snapshot.clinicSupplied;
    if (nextRoomId !== this.roomId) {
      if (this.room) {
        this.scene.remove(this.room);
        if (!this.interiorAssets.has(this.roomId ?? '')) this.disposeGroup(this.room);
      }
      this.room = world.interior ? this.interiorAssets.get(world.interior.id) ?? createInteriorMeshes(world.interior) : null;
      if (this.room) {
        this.setupCharacterCutaway(this.room);
        this.scene.add(this.room);
      }
      this.outdoors.visible = !world.interior;
      this.roomId = nextRoomId;
      this.target.set(world.position.x, 0, world.position.z);
      this.lastPosition.set(world.position.x, world.position.z);
    }
    const { x, z } = world.position;
    this.lifeView.update(deltaSeconds);
    const dx = x - this.lastPosition.x;
    const dz = z - this.lastPosition.y;
    const moving = Math.hypot(dx, dz) > .0001;
    if(world.interior){this.character.position.set(x,.08,z);this.character.rotation.set(0,world.heading,0);}
    else placeOnPlanet(this.character,x,z,world.heading,walkingAltitude(world.position));
    const localFrame=world.interior?new THREE.Quaternion():planetFrame(world.position).rotation;
    this.surfaceUp.value.set(0,1,0).applyQuaternion(localFrame);
    this.cutawayPosition.value.copy(this.character.position).addScaledVector(this.surfaceUp.value,1.05);
    this.walkTime += moving ? deltaSeconds * 10 : 0;
    const stride = moving ? Math.sin(this.walkTime) * .55 : 0;
    this.leftLeg.rotation.x = (this.limbRest[0] ?? 0) + stride; this.rightLeg.rotation.x = (this.limbRest[1] ?? 0) - stride;
    this.leftArm.rotation.x = (this.limbRest[2] ?? 0) - stride * .7; this.rightArm.rotation.x = (this.limbRest[3] ?? 0) + stride * .7;
    if (this.heroKit?.visible) {
      this.leftArm.rotation.x = -.75; this.rightArm.rotation.x = -.75;
      this.leftArm.rotation.z = -.28; this.rightArm.rotation.z = .28;
    } else { this.leftArm.rotation.z = 0; this.rightArm.rotation.z = 0; }
    const poseKitHolder = (actor: typeof this.master): void => {
      const left = actor.group.getObjectByName('left-arm');
      const right = actor.group.getObjectByName('right-arm');
      if (left && right) {
        left.rotation.x = right.rotation.x = actor.kit.visible ? -.75 : 0;
        left.rotation.z = actor.kit.visible ? -.28 : 0;
        right.rotation.z = actor.kit.visible ? .28 : 0;
      }
    };
    poseKitHolder(this.master); poseKitHolder(this.medic);
    this.lastPosition.set(x, z);
    let height = this.options.zoom.span;
    const aspect = (this.container.clientWidth||window.innerWidth) / Math.max(1,this.container.clientHeight||window.innerHeight);
    if(!world.interior && height>22)height*=1+(1/Math.min(1,aspect)-1)*Math.min(1,(height-22)/34);
    this.camera.left = -height * aspect; this.camera.right = height * aspect;
    this.camera.top = height; this.camera.bottom = -height;
    this.camera.updateProjectionMatrix();
    if(world.interior){
      this.camera.up.set(0,1,0);
      const center=new THREE.Vector3(x,0,z).multiplyScalar(this.options.zoom.followWeight);
      this.target.lerp(center,1-Math.exp(-deltaSeconds*7));
      this.camera.position.copy(this.target).add(this.cameraOffset);
    } else {
      const desired=localFrame.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),world.viewTurn));
      // The radial camera follows all hemispheres, including longitude seams.
      this.cameraFrame.slerp(desired,1-Math.exp(-deltaSeconds*12));
      const overview=Math.max(0,Math.min(1,(this.options.zoom.span-22)/34));
      this.target.copy(this.character.position).multiplyScalar(1-overview);
      this.camera.up.set(0,1,0).applyQuaternion(this.cameraFrame);
      const offset=this.cameraOffset.clone().multiplyScalar(1+overview).applyQuaternion(this.cameraFrame);
      this.camera.position.copy(this.target).add(offset);
    }
    this.camera.lookAt(this.target);
    this.sightDirection.value.copy(this.camera.position).sub(this.target).normalize();
    this.sun.target.position.copy(this.target);
    this.sun.position.copy(this.target).add(new THREE.Vector3(-25,55,10).applyQuaternion(world.interior?new THREE.Quaternion():this.cameraFrame));
    const nearby = TOWN_BUILDINGS.find(building => building.id === this.options.firstAid.snapshot.targetBuildingId) ?? world.nearbyBuilding;
    this.doorMarker.visible = Boolean(nearby) && !world.interior;
    if (nearby) {
      const entry = buildingEntrance(nearby);
      placeOnPlanet(this.doorMarker,entry.x,entry.z,0,.09);
      this.doorMarker.rotateX(-Math.PI/2);
    }
    this.renderer.render(this.scene, this.camera);
  }

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 200 : 1;
    const delta = THREE.MathUtils.clamp(event.deltaY * multiplier, -200, 200);
    this.options.zoom.adjust(delta * .0018);
  };

  private readonly resize = (): void => {
    this.renderer.setSize(this.container.clientWidth || window.innerWidth, this.container.clientHeight || window.innerHeight);
  };

  private disposeGroup(group: THREE.Object3D): void {
    disposeObject(group);
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    window.removeEventListener('resize', this.resize);
    this.container.removeEventListener('wheel', this.onWheel);
    for (const room of this.interiorAssets.values()) if (room !== this.room) this.scene.add(room);
    this.disposeGroup(this.scene);
    this.interiorAssets.clear();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

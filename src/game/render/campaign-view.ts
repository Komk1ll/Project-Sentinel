import * as THREE from 'three';
import { addCharacterDetails } from '@game/render/character-details';
import { STORY_FRAGMENTS, STORY_LIBRARY, STORY_NETWORK, STORY_PARK, STORY_ROBOT } from '@game/systems/campaign';
import type { FirstAidMission } from '@game/systems/first-aid-mission';
import { islandElevation } from '@content/island-elevation';

const ROBOT_ROUTE = [STORY_ROBOT, { x: 30.5, z: 48 }, { x: 38, z: 48 }, { x: 39, z: 45.8 }] as const;

export class CampaignView {
  readonly group = new THREE.Group();
  private readonly robot = new THREE.Group();
  private readonly signal = new THREE.MeshStandardMaterial({ color: 0xb65038, emissive: 0xba281b, emissiveIntensity: .38 });
  private readonly parcel = new THREE.Group();
  private readonly library = new THREE.Group();
  private readonly network = new THREE.Group();
  private readonly park = new THREE.Group();
  private readonly volunteers = new THREE.Group();
  private readonly marker = new THREE.Mesh(new THREE.RingGeometry(.28, .43, 26),
    new THREE.MeshBasicMaterial({ color: 0xf8c06f, side: THREE.DoubleSide }));
  private readonly archive: THREE.Group[] = [];
  private deliveryTime = 0;

  constructor() {
    const metal = new THREE.MeshStandardMaterial({ color: 0x4c7776, roughness: .65 });
    const pale = new THREE.MeshStandardMaterial({ color: 0xbfc5a9, roughness: .75 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x293d40, roughness: .8 });
    const wood = new THREE.MeshStandardMaterial({ color: 0xb8804a, roughness: .9 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0x92695e, roughness: .85 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xc58e69, roughness: .85 });
    const box = (group: THREE.Group, mat: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number): void => {
      const item = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      item.position.set(x, y, z);
      item.castShadow = h > .12;
      item.receiveShadow = true;
      group.add(item);
    };
    box(this.robot, metal, 0, .48, 0, 1, .59, .83);
    box(this.robot, pale, 0, .81, 0, .92, .12, .78);
    box(this.robot, dark, 0, .59, .43, .62, .24, .035);
    box(this.robot, this.signal, 0, .59, .46, .37, .1, .035);
    for (const side of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.235, .235, .16, 10), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * .53, .24, .05);
      this.robot.add(wheel);
    }
    box(this.parcel, wood, 0, .99, -.06, .58, .24, .4);
    box(this.parcel, pale, 0, 1.115, -.06, .11, .015, .4);
    this.robot.add(this.parcel);

    box(this.library, cloth, 0, .98, 0, .4, .61, .27);
    box(this.library, dark, -.12, .38, 0, .15, .65, .19);
    box(this.library, dark, .12, .38, 0, .15, .65, .19);
    box(this.library, skin, 0, 1.48, 0, .3, .31, .29);
    box(this.library, dark, 0, 1.65, -.035, .32, .09, .31);
    addCharacterDetails(this.library, 'story');
    this.library.position.set(STORY_LIBRARY.x + .42, 0, STORY_LIBRARY.z - .45);

    STORY_FRAGMENTS.forEach((point, index) => {
      const fragment = new THREE.Group();
      box(fragment, wood, 0, .16, 0, .42, .05, .36);
      box(fragment, index === 0 ? pale : metal, 0, .19, 0, .33, .02, .28);
      fragment.position.set(point.x, 0, point.z);
      this.archive.push(fragment);
    });
    box(this.network, dark, 0, .26, 0, .64, .48, .34);
    box(this.network, this.signal, 0, .5, .015, .52, .07, .29);
    this.network.position.set(STORY_NETWORK.x, 0, STORY_NETWORK.z);
    box(this.park, wood, 0, .48, 0, .7, .92, .12);
    box(this.park, pale, 0, .64, .08, .62, .4, .035);
    this.park.position.set(STORY_PARK.x, 0, STORY_PARK.z);
    this.volunteers.name = 'story-volunteers';
    for (const [index, x] of [27.7, 29].entries()) {
      const person = new THREE.Group();
      person.position.set(x, 0, STORY_PARK.z + 1.45);
      person.rotation.y = index ? -1.25 : .75;
      box(person, index ? metal : cloth, 0, .99, 0, .43, .57, .29);
      box(person, dark, -.12, .39, 0, .15, .65, .19);
      box(person, dark, .12, .39, 0, .15, .65, .19);
      box(person, skin, 0, 1.45, 0, .29, .3, .28);
      box(person, wood, 0, .85, .25, .42, .25, .29);
      box(person, pale, 0, .985, .25, .1, .02, .29);
      addCharacterDetails(person, 'story');
      this.volunteers.add(person);
    }
    this.group.add(this.volunteers);
    this.marker.rotation.x = -Math.PI / 2;
    this.group.add(this.robot, this.library, this.network, this.park, this.marker, ...this.archive);
    this.group.visible = false;
  }

  update(mission: FirstAidMission, delta: number, time: number): void {
    const world = mission.world;
    const p = mission.campaignProgress;
    this.group.visible = mission.snapshot.clinicSupplied;
    if (!this.group.visible) {
      this.deliveryTime = 0;
      return;
    }
    const room = world.interiorFloor === 0 ? world.interior?.id : undefined;
    this.robot.visible = !world.interior;
    this.volunteers.visible = p.ending === 'volunteers' && !world.interior;
    this.park.visible = p.archived && !world.interior;
    this.library.visible = p.repair === 3 && room === 'library';
    this.network.visible = p.archived && room === 'townhall';
    this.archive.forEach((fragment, i) => { fragment.visible = room === 'library' && p.archiveStarted && !(p.fragments & (1 << i)); });
    const target = mission.storyTarget;
    this.marker.visible = Boolean(target && world.interiorFloor === 0 && target.buildingId === (world.interior?.id ?? null));
    if (target && this.marker.visible) this.marker.position.set(target.point.x,
      (world.interior ? 0 : islandElevation(target.point.x, target.point.z)) + .075, target.point.z);
    const working = p.repair === 3;
    this.signal.color.setHex(working ? 0x5ab88b : 0xb65038);
    this.signal.emissive.setHex(working ? 0x50b68a : 0xba281b);
    this.signal.emissiveIntensity = working ? .55 : .28 + .25 * Math.sin(time * 6);
    const patrol = p.ending === 'network';
    const elapsed = this.deliveryTime + Math.min(.05, delta) * .67;
    this.deliveryTime = working ? patrol ? elapsed % 6 : Math.min(3, elapsed) : 0;
    const routeTime = this.deliveryTime <= 3 ? this.deliveryTime : 6 - this.deliveryTime;
    const index = Math.min(2, Math.floor(routeTime));
    const start = ROBOT_ROUTE[index]!;
    const end = ROBOT_ROUTE[index + 1]!;
    const t = routeTime - index;
    const x = start.x + (end.x - start.x) * t;
    const z = start.z + (end.z - start.z) * t;
    this.robot.position.set(x, islandElevation(x, z), z);
    this.robot.rotation.y = working ? Math.atan2(end.x - start.x, end.z - start.z) + (this.deliveryTime > 3 ? Math.PI : 0) : 0;
    this.parcel.visible = this.deliveryTime < 3;
  }
}

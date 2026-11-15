import { Matrix4, Quaternion, Vector3 } from 'three';
import type { TownPosition } from '@game/systems/town-world';

export const PLANET_CIRCUMFERENCE = 256;
export const PLANET_RADIUS = PLANET_CIRCUMFERENCE / (2 * Math.PI);
export const PLANET_NORTH = -32;
export const PLANET_SOUTH = 96;
export function wrapLongitude(x: number): number { return ((x % 256) + 256) % 256; }
export function longitudeDelta(a: number, b: number): number { return ((b-a+384)%256)-128; }
export function latitudeScale(z: number): number { return Math.max(.001, Math.cos((z-32)/PLANET_RADIUS)); }

/** Right-handed east/up/south tangent basis; all translations are metres. */
export function planetFrame(point: TownPosition): { position: Vector3; rotation: Quaternion; up: Vector3 } {
  const lon=(point.x-32)/PLANET_RADIUS, lat=(point.z-32)/PLANET_RADIUS;
  const up=new Vector3(Math.sin(lon)*Math.cos(lat),Math.cos(lon)*Math.cos(lat),Math.sin(lat));
  const east=new Vector3(Math.cos(lon),-Math.sin(lon),0);
  const south=new Vector3(-Math.sin(lon)*Math.sin(lat),-Math.cos(lon)*Math.sin(lat),Math.cos(lat));
  return {position:up.clone().multiplyScalar(PLANET_RADIUS),rotation:new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(east,up,south)),up};
}
export function surfacePoint(point: TownPosition, altitude=0): Vector3 {
  const frame=planetFrame(point); return frame.position.addScaledVector(frame.up,altitude);
}
export function planetDistance(a: TownPosition,b: TownPosition): number {
  return Math.acos(Math.max(-1,Math.min(1,planetFrame(a).up.dot(planetFrame(b).up))))*PLANET_RADIUS;
}

/** Reflect latitude through a pole instead of erecting an invisible boundary. */
export function normalizePlanetPosition(x: number,z: number): {position:TownPosition; crossedPole:boolean} {
  let crossedPole=false;
  while(z<PLANET_NORTH || z>PLANET_SOUTH) {
    z=z<PLANET_NORTH ? 2*PLANET_NORTH-z : 2*PLANET_SOUTH-z;
    x+=128;crossedPole=!crossedPole;
  }
  return {position:{x:wrapLongitude(x),z},crossedPole};
}

/** A geodesic step avoids the longitude singularity when walking across either pole. */
export function stepAtPole(point:TownPosition,dx:number,dz:number,metres:number,viewTurn:number):{position:TownPosition;viewTurn:number;heading:number} {
  const frame=planetFrame(point),angle=metres/PLANET_RADIUS;
  const direction=new Vector3(dx,0,dz).normalize().applyQuaternion(frame.rotation);
  const normal=frame.up.clone().multiplyScalar(Math.cos(angle)).addScaledVector(direction,Math.sin(angle)).normalize();
  const position={x:wrapLongitude(32+Math.atan2(normal.x,normal.y)*PLANET_RADIUS),z:32+Math.asin(Math.max(-1,Math.min(1,normal.z)))*PLANET_RADIUS};
  const next=planetFrame(position),transport=new Quaternion().setFromUnitVectors(frame.up,normal);
  const inverse=next.rotation.clone().invert();
  const cameraSouth=new Vector3(Math.sin(viewTurn),0,Math.cos(viewTurn)).applyQuaternion(frame.rotation).applyQuaternion(transport).applyQuaternion(inverse);
  const forward=direction.applyQuaternion(transport).applyQuaternion(inverse);
  return {position,viewTurn:Math.atan2(cameraSouth.x,cameraSouth.z),heading:Math.atan2(forward.x,forward.z)};
}

/** Match the deliberately separated curved surface layers beneath actor feet. */
export function walkingAltitude(point:TownPosition):number {
  if(point.x>64 && Math.abs(point.z-32)<1.8)return .17;
  if(point.z>=16&&point.z<=32&&[88,152,208].some(x=>Math.abs(point.x-x)<.8))return .18;
  return .065;
}

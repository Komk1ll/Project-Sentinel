import * as THREE from 'three';
import { planetFrame, surfacePoint } from '@game/systems/planet';

export function placeOnPlanet(object:THREE.Object3D,x:number,z:number,yaw=0,altitude=0):void {
  const frame=planetFrame({x,z});
  object.position.copy(frame.position).addScaledVector(frame.up,altitude);
  object.quaternion.copy(frame.rotation).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw));
}
/** Bake a subdivided chart mesh into the spherical surface, then recompute normals. */
export function curveGeometry(geometry:THREE.BufferGeometry):void {
  const positions=geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++){
    const point=surfacePoint({x:positions.getX(i),z:positions.getZ(i)},positions.getY(i));
    positions.setXYZ(i,point.x,point.y,point.z);
  }
  positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
}
export function surfaceStrip(x:number,z:number,width:number,depth:number,color:number,altitude=.03):THREE.Mesh {
  const geometry=new THREE.PlaneGeometry(width,depth,Math.max(1,Math.ceil(width)),Math.max(1,Math.ceil(depth)));
  geometry.rotateX(-Math.PI/2);geometry.translate(x,altitude,z);curveGeometry(geometry);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.95}));mesh.receiveShadow=true;return mesh;
}

/** Radially tessellated ellipse, used for curved meadows and water. */
export function surfaceDisk(x:number,z:number,width:number,depth:number,color:number,altitude=.035):THREE.Mesh {
  const points=[x,altitude,z],indices:number[]=[];const rings=8,segments=48;
  for(let ring=1;ring<=rings;ring++)for(let j=0;j<segments;j++){
    const angle=j/segments*Math.PI*2;points.push(x+Math.cos(angle)*width/2*ring/rings,altitude,z+Math.sin(angle)*depth/2*ring/rings);
  }
  for(let j=0;j<segments;j++)indices.push(0,1+(j+1)%segments,1+j);
  for(let ring=1;ring<rings;ring++)for(let j=0;j<segments;j++){
    const a=1+(ring-1)*segments+j,b=1+(ring-1)*segments+(j+1)%segments,c=a+segments,d=b+segments;
    indices.push(a,b,d,a,d,c);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setIndex(indices);curveGeometry(geometry);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.9}));mesh.receiveShadow=true;return mesh;
}

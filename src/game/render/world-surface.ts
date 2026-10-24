import * as THREE from 'three';

export function placeOnGround(object:THREE.Object3D,x:number,z:number,yaw=0,altitude=0):void {
  object.position.set(x,altitude,z);object.rotation.set(0,yaw,0);
}
export function surfaceStrip(x:number,z:number,width:number,depth:number,color:number,altitude=.03):THREE.Mesh {
  const geometry=new THREE.PlaneGeometry(width,depth);geometry.rotateX(-Math.PI/2);geometry.translate(x,altitude,z);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.95}));mesh.receiveShadow=true;return mesh;
}
export function surfaceDisk(x:number,z:number,width:number,depth:number,color:number,altitude=.035):THREE.Mesh {
  const geometry=new THREE.CircleGeometry(1,64);geometry.rotateX(-Math.PI/2);geometry.scale(width/2,1,depth/2);geometry.translate(x,altitude,z);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.9}));mesh.receiveShadow=true;return mesh;
}
export function pathRibbon(points:readonly {x:number;z:number}[],width:number,color:number,altitude=.045):THREE.Mesh {
  const vertices:number[]=[],indices:number[]=[];
  points.forEach((point,i)=>{
    const before=points[(i+points.length-1)%points.length]!,after=points[(i+1)%points.length]!;
    const dx=after.x-before.x,dz=after.z-before.z,len=Math.hypot(dx,dz);
    vertices.push(point.x-dz/len*width/2,altitude,point.z+dx/len*width/2,point.x+dz/len*width/2,altitude,point.z-dx/len*width/2);
    const a=i*2,b=((i+1)%points.length)*2;indices.push(a,b,a+1,b,b+1,a+1);
  });
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.9,side:THREE.DoubleSide}));mesh.receiveShadow=true;return mesh;
}

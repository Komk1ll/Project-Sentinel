import * as THREE from 'three';

/** Opaque queue order matters: scenery depth -> hidden silhouette -> normal hero.
 * The proxy never writes depth, so the actor cannot occlude itself. No scene holes.
 */
export function addHeroSilhouette(root:THREE.Object3D):void {
  const sources:THREE.Mesh[]=[];
  root.traverse(object=>{if(object instanceof THREE.Mesh&&!object.userData.heroSilhouette)sources.push(object);});
  const material=new THREE.MeshBasicMaterial({color:0x96c9bd,depthFunc:THREE.GreaterDepth,depthWrite:false,toneMapped:false,fog:false});
  for(const source of sources){
    if(source.children.some(child=>child.userData.heroSilhouette))continue;
    source.renderOrder=20;
    const proxy=new THREE.Mesh(source.geometry,material);
    proxy.name='occluded-hero-silhouette';proxy.userData.heroSilhouette=true;
    proxy.renderOrder=10;proxy.raycast=()=>{};
    source.add(proxy);
  }
}

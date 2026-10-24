import * as THREE from 'three';
import { ISLAND_CENTER,coastRadius,SEA_LEVEL } from '@content/island';

export function createIslandTerrain():THREE.Mesh {
  const vertices:number[]=[],colors:number[]=[],indices:number[]=[];
  const bands=[[0,0,0x91a874],[.8,0,0x8fa571],[.94,0,0x9eae7f],[1,-.4,0xd6c49b],[1.07,-1.2,0xb9b293],[1.16,-2.8,0x89988c]] as const;
  const segments=192;
  bands.forEach(([fraction,y,color])=>{
    for(let i=0;i<segments;i++){
      const angle=i/segments*Math.PI*2,r=coastRadius(angle)*fraction,c=new THREE.Color(color);
      vertices.push(ISLAND_CENTER.x+Math.cos(angle)*r,y,ISLAND_CENTER.z+Math.sin(angle)*r);colors.push(c.r,c.g,c.b);
    }
  });
  for(let ring=0;ring<bands.length-1;ring++)for(let i=0;i<segments;i++){
    const a=ring*segments+i,b=ring*segments+(i+1)%segments,c=a+segments,d=b+segments;
    if(ring===0)indices.push(a,d,c);else indices.push(a,b,d,a,d,c);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95}));mesh.name='island-terrain';mesh.receiveShadow=true;return mesh;
}

/** One analytic water surface: no reflection render targets or downloaded textures. */
export function createOcean(time:{value:number}):THREE.Mesh {
  const geometry=new THREE.PlaneGeometry(700,700,160,160);geometry.rotateX(-Math.PI/2);
  const material=new THREE.ShaderMaterial({
    uniforms:{uTime:time,uSea:{value:SEA_LEVEL}},
    vertexShader:`
      uniform float uTime; uniform float uSea;
      varying vec3 waterWorld; varying vec3 waveNormal;
      void main(){
        vec3 p=position; vec2 q=p.xz+vec2(46.,32.);
        float a=q.x*.72+q.y*.31+uTime*1.1;
        float b=q.x*-.36+q.y*.83-uTime*.85;
        p.y=uSea+sin(a)*.045+sin(b)*.025;
        waveNormal=normalize(vec3(-cos(a)*.0324+cos(b)*.009,1.,-cos(a)*.01395-cos(b)*.02075));
        waterWorld=(modelMatrix*vec4(p,1.)).xyz;
        gl_Position=projectionMatrix*viewMatrix*vec4(waterWorld,1.);
      }`,
    fragmentShader:`
      uniform float uTime; varying vec3 waterWorld; varying vec3 waveNormal;
      void main(){
        vec2 p=waterWorld.xz-vec2(46.,32.); float a=atan(p.y,p.x);
        float radius=pow(pow(abs(cos(a)/62.),4.)+pow(abs(sin(a)/46.),4.),-.25)*(1.+.025*sin(a*3.)+.018*sin(a*7.));
        float shore=length(p)/radius;
        float rippleA=waterWorld.x*.72+waterWorld.z*.31+uTime*1.1;
        float rippleB=waterWorld.x*-.36+waterWorld.z*.83-uTime*.85;
        vec3 detailNormal=vec3(-cos(rippleA)*.08+cos(rippleB)*.045,1.,-cos(rippleA)*.035-cos(rippleB)*.10);
        vec3 n=normalize(waveNormal+detailNormal-vec3(0.,1.,0.)),v=normalize(cameraPosition-waterWorld);
        float fresnel=.035+.965*pow(1.-max(dot(n,v),0.),5.);
        float shallow=1.-smoothstep(1.01,1.28,shore);
        vec3 base=mix(vec3(.025,.055,.12),vec3(.09,.20,.26),shallow);
        vec3 sky=mix(vec3(.29,.25,.38),vec3(.12,.19,.34),clamp(reflect(-v,n).y,0.,1.));
        vec3 colour=mix(base,sky,fresnel*.72);
        vec3 sun=normalize(vec3(-.45,.38,-.28));
        float sparkle=pow(max(dot(reflect(-sun,n),v),0.),150.);
        colour+=vec3(1.,.58,.28)*sparkle*.85;
        float foam=1.-smoothstep(.012,.045,abs(shore-1.025+sin(a*24.+uTime*1.4)*.009));
        foam*=.55+.25*sin(p.x*1.5+p.y*.8-uTime*2.);
        colour=mix(colour,vec3(.42,.51,.61),foam*.7);
        float haze=smoothstep(140.,310.,distance(cameraPosition,waterWorld));
        colour=mix(colour,vec3(.09,.11,.22),haze);
        gl_FragColor=vec4(colour,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  material.name='coastal-water-shader';
  const mesh=new THREE.Mesh(geometry,material);mesh.name='island-ocean';mesh.position.set(46,0,32);return mesh;
}

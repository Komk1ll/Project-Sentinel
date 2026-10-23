/** Render production canvas drawing commands offline; this is not a browser screenshot. */
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
const require=createRequire(import.meta.url);
const {createCanvas,GlobalFonts}=require(process.argv[2] || '@napi-rs/canvas');
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Arial.ttf','Arial');
const output=resolve(process.argv[3] || 'art/open-district-v4');await mkdir(output,{recursive:true});
globalThis.window={devicePixelRatio:2};
const server=await createServer({server:{middlewareMode:true}});
try {
  const {drawMinimap}=await server.ssrLoadModule('/src/ui/town-minimap.ts');
  const {TownWorld}=await server.ssrLoadModule('/src/game/systems/town-world.ts');
  const {FirstAidMission}=await server.ssrLoadModule('/src/game/systems/first-aid-mission.ts');
  const world=new TownWorld(),mission=new FirstAidMission(world);
  mission.restore('deliver-aid');
  world.restore({interiorId:null,position:{x:24,z:45},outdoorReturn:{x:24,z:45}});
  for(const [name,size,mode] of [['map-nearby',240,'nearby'],['map-district',520,'district'],['map-small',158,'nearby'],['map-planet',520,'planet']]){
    const canvas=createCanvas(size*2,size*2);canvas.clientWidth=size;
    drawMinimap(canvas,world,mission,mode);await writeFile(`${output}/${name}.png`,canvas.toBuffer('image/png'));
  }
  mission.destroy();
} finally {await server.close();}
console.log(`Offline production minimap previews: ${output}`);

import * as THREE from 'three';

export type SurfaceKind = 'plaster' | 'brick' | 'asphalt' | 'paving' | 'metal';

/** Every repeat represents two metres, keeping masonry and paving at human scale. */
export function createSurfaceTextures(): Record<SurfaceKind, THREE.CanvasTexture> {
  let seed = 23901;
  const random = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const make = (kind: SurfaceKind): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = kind === 'asphalt' ? '#85898a' : '#ddd9cf';
      ctx.fillRect(0, 0, 512, 512);
      if (kind === 'brick' || kind === 'paving') {
        const height = kind === 'brick' ? 32 : 128;
        const width = kind === 'brick' ? 64 : 128;
        ctx.fillStyle = kind === 'brick' ? '#a6a193' : '#a4a49c';
        ctx.fillRect(0, 0, 512, 512);
        for (let y = -height; y < 512; y += height) for (let x = -width; x < 512 + width; x += width) {
          const offset = (Math.round(y / height) % 2) * width / 2;
          const shade = Math.floor(171 + random() * 55);
          ctx.fillStyle = `rgb(${shade + 9},${shade + 4},${shade - 6})`;
          ctx.fillRect(x + offset + 2, y + 2, width - 4, height - 4);
          ctx.fillStyle = 'rgba(255,255,240,.18)';
          ctx.fillRect(x + offset + 3, y + 3, width - 6, 2);
        }
      }
      if (kind === 'metal') {
        ctx.fillStyle = '#c3c5c0';
        ctx.fillRect(0, 0, 512, 512);
        for (let x = 0; x < 512; x += 128) {
          ctx.fillStyle = '#737d7a'; ctx.fillRect(x, 0, 4, 512);
          ctx.fillStyle = '#e0dfd3'; ctx.fillRect(x + 4, 0, 3, 512);
        }
        for (let i = 0; i < 45; i++) {
          ctx.fillStyle = 'rgba(83,65,45,.10)';
          ctx.fillRect(random() * 512, random() * 512, 3 + random() * 8, 8 + random() * 75);
        }
      }
      if (kind === 'plaster') {
        for (let i = 0; i < 95; i++) {
          const x = random() * 512, y = random() * 512, radius = 4 + random() * 25;
          const stain = ctx.createRadialGradient(x, y, 0, x, y, radius);
          stain.addColorStop(0, 'rgba(67,63,48,.14)'); stain.addColorStop(1, 'rgba(67,63,48,0)');
          ctx.fillStyle = stain; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
        ctx.strokeStyle = 'rgba(80,77,66,.24)'; ctx.lineWidth = .7;
        for (let i = 0; i < 5; i++) {
          let x = random() * 512, y = random() * 512;
          ctx.beginPath(); ctx.moveTo(x, y);
          for (let step = 0; step < 7; step++) { x += (random() - .5) * 13; y += random() * 13; ctx.lineTo(x, y); }
          ctx.stroke();
        }
      }
      if (kind === 'asphalt') {
        ctx.fillStyle = 'rgba(38,45,43,.15)';
        ctx.fillRect(63, 89, 150, 190);
        ctx.fillRect(347, 310, 160, 105);
        ctx.strokeStyle = 'rgba(26,32,30,.55)'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          let x = random() * 512, y = random() * 512;
          ctx.beginPath(); ctx.moveTo(x, y);
          for (let step = 0; step < 12; step++) { x += (random() - .5) * 27; y += 6 + random() * 11; ctx.lineTo(x, y); }
          ctx.stroke();
        }
      }
      for (let i = 0; i < 15000; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(255,255,240,.10)' : 'rgba(40,44,35,.10)';
        ctx.fillRect(random() * 512, random() * 512, 1 + random() * 2, 1 + random() * 2);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    return texture;
  };
  return { plaster: make('plaster'), brick: make('brick'), asphalt: make('asphalt'), paving: make('paving'), metal: make('metal') };
}

/** BoxGeometry face UVs measured in metres, independent of a building's proportions. */
export function createSurfaceBox(width: number, height: number, depth: number): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const uv = geometry.getAttribute('uv');
  const spans = [[depth, height], [depth, height], [width, depth], [width, depth], [width, height], [width, height]];
  for (let face = 0; face < 6; face++) {
    const span = spans[face];
    if (!span) continue;
    const u = (span[0] ?? 1) / 2, v = (span[1] ?? 1) / 2;
    for (let vertex = 0; vertex < 4; vertex++) {
      const index = face * 4 + vertex;
      uv.setXY(index, uv.getX(index) * u, uv.getY(index) * v);
    }
  }
  return geometry;
}

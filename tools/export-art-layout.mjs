import { createServer } from 'vite';
import { writeFile } from 'node:fs/promises';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const town = await server.ssrLoadModule('/src/content/town.ts');
  const interiors = await server.ssrLoadModule('/src/content/interiors.ts');
  const props = await server.ssrLoadModule('/src/content/town-props.ts');
  await writeFile('art/source/town-layout.json', JSON.stringify({ buildings: town.TOWN_BUILDINGS, roads: town.ROAD_CENTERS, park: town.PARK, cars: props.TOWN_CARS, interiors: town.TOWN_BUILDINGS.map(building => ({ id: building.id, kind: building.kind, ...interiors.getInteriorLayout(building) })) }, null, 2));
} finally { await server.close(); }

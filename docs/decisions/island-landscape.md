# Coherent island landscape

Keep the current island, buildings, metre scale and evening atmosphere. Move
flowerbeds off complete pavement strips and garden cross paths. The southwest
orchard remains a quiet green area; the working harbor becomes one destination:
lighthouse on land east of the pier entrance, connected forecourt and two rocky
breakwaters framing an open shipping channel. Breakwaters are decorative sea
structures, not extra walkable land. Shared layout data drives scene and minimap.

Use the existing Blender rock and planting assets with instancing. Add no asset
requests, textures or dynamic lights. Preserve the 5.2 MB / 240k triangle budget.
Keep clear access to entrances, resident circuits, promenade, pond and pier.
Layout v4 validates v3 against frozen historical footprints before relocating any
newly blocked saved position; v1/v2 and mission stages remain supported. The pier
footprint itself does not change. Do not start background servers; refresh through
Herd's existing on-request build. Render the exported runtime scene on the existing
Blender workstation for composition checks; do not claim browser FPS from renders.

## Implemented layout and verification

The lighthouse is now at (66, 65), within 9 m of the pier entrance. Its information
board and connecting forecourt follow it. Breakwater arms start on the beach at
(46, 74) and (71, 74), curve inward and end at (52, 94) and (65, 94), leaving an
open channel. Inner shore rocks have collision; offshore arms remain inaccessible.
The pier deck and its railings are unchanged. Move five fixed beds, the watering
patch and misplaced hedges into green quadrants. Distribute the existing meadow
instances between the eastern garden, west shore, orchard edge and harbor garden.

All 412 tests pass, including pavement/garden clearances, landmark access, coastal
circuits, first-aid progression and historical save validation. TypeScript and
Herd production compilation pass. Herd rebuilt on changed content, reused an
unchanged build and served 18 files with exact production hashes. No watcher or
persistent development server was started.

The real scene measures 500 mesh objects / 225,343 triangles, up 3,216 triangles
from the harbor baseline. All 15 model downloads remain 4,751,884 bytes; no new
model or texture downloads. The existing original Blender assets are reused.
Final remote job ae634e36d5224ca1b9a46e59b009c500 rendered the exported runtime
scene with OptiX. Transfer hashes passed. Overview, harbor, orchard and island map
were visually inspected. Sources, editable Blender scene and evidence are in
art/island-landscape. Lighting and water in the offline render are approximations;
this is not a browser FPS or WebGL pixel validation. Changes remain local on
feature/island-landscape for review.

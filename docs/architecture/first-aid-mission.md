# First aid episode

## Scope

This increment implements meeting the Mayak workshop master, receiving one aid kit,
and delivering it to the clinic medic. Only an interaction near the medic consumes
the kit and completes the episode; entering the building alone does not. The completed
clinic state, stage, position and room survive a reload. Subsequent episodes remain separate.

## Content and state

`src/content/first-aid.ts` owns the master identity, building (`station`), local
interior position, collision footprint, interaction radius, item identity
(`aid-kit`) and Russian player-facing text. The master stands at (1.8, 0.25) in
interior X/Z meters, with an interaction radius of 1.4 meters. The shared interior
layout includes this actor in its obstacle list, without blocking the entry aisle.

`FirstAidMission` owns a three-state progression:

| State | Inventory | Objective target | Eligible master action |
| --- | --- | --- | --- |
| `meet-master` | Empty | `station` | Give the kit and explain the delivery |
| `deliver-aid` | One `aid-kit` | `clinic` | Repeat the delivery reminder |
| `completed` | Empty | None | Thank the player; never issue another kit |

The inventory snapshot is derived from the mission stage. A pickup changes the
stage and dialogue before notifying listeners; subscribers never receive the new
objective without its kit. Repeated actions and leaving/re-entering the building
cannot issue another kit. Snapshots do not expose mutable internal inventory.
This is a small mission-owned inventory, not the final general-purpose inventory
or economy. Persistence stores the stage and derives inventory and clinic state from it.

## Integration

- `GameEngine` creates the controller for its real `TownWorld`. Fresh E keydowns
  invoke `FirstAidMission.interact()`; held repeats and text-input targets do not.
- The HUD button calls the same action. Eligibility is checked at invocation,
  using current building and distance; no UI-cached target can grant a remote kit.
- Nearby master interaction takes priority. Otherwise the controller delegates
  entry/exit to `TownWorld.interact()`, preserving existing doorway behavior.
- The controller subscribes to world movement/room changes. The HUD updates the
  goal, item text, dialogue, contextual action and map from that state. Text nodes
  are changed only when their content changes, avoiding repeated live-region
  announcements on every movement update.
- `ThreeRenderer` loads Blender characters at the same content coordinates, with
  procedural models during loading. The master is visible only in the workshop;
  his parcel disappears after pickup. The clinic medic receives the parcel on
  completion, and a seated resident appears in the waiting room. Normal renderer
  disposal owns the models. See [Cozy visuals](cozy-visuals.md).
- The inactive zero-stat HUD is no longer mounted. The mission panel takes its
  place with a 16px main text size. Legacy progress code remains available.
- Engine teardown removes the HUD subscription, world subscription, input handlers
  and scene resources.

## Automated verification

Run `npm run typecheck`, `npm test`, and `npm run build` from the repository root.
Tests drive the production mission and collision model through public movement
and interaction methods, starting at the actual town spawn. Coverage includes:

- Walking to the workshop, approaching the master and receiving exactly one kit.
- Atomic objective/item notification and repeat/re-entry protection.
- Wrong room, excessive distance and no available target.
- The master collision footprint and the route out to the clinic.
- Kit retention and pending delivery after entering the clinic.
- Real engine keyboard handlers and real mounted HUD in jsdom: key/click parity,
  held keys, text fields, stale actions, objective/dialogue updates and cleanup.
- Production scene assembly and master/parcel visibility across transitions with
  a stub GPU backend; this does not validate WebGL pixels or frame rate.

jsdom is a development-only dependency. DOM/scene tests are not evidence of a
visual browser review. No browser automation or screenshots are used in this
increment; final layout, contrast and appearance still require a manual playtest.

## Manual acceptance route

1. Run `npm run dev`. At spawn, the mission panel should direct the player to the
   workshop and show no quest items. The outdoor map highlights the workshop.
2. Walk along the street to Mayak, south of the park. Approach its southern door
   and press E. The door remains independently usable.
3. Walk toward the master in the right half of the workshop. Outside his radius,
   no pickup is available. Inside it, E and the action button offer the same talk.
4. Trigger the action. Read the master's request; confirm exactly one aid kit in
   the panel and the delivery objective. Repeat using the other input method:
   only the reminder should change, not the item count.
5. Exit and follow the highlighted clinic across the street to the east. Enter,
   approach the medic and hand over the kit. Confirm the completed objective and empty inventory.
6. Reload: the completed task, clinic and position must be restored. Return to the
   master: no second kit is available. The New Game button requests confirmation before resetting.

## Persistence contract

`TownSession` restores before HUD mounting and subscribes to the real mission/world.
Stage and room changes save immediately; movement saves at most once per 500ms.
Page hide, hidden visibility and teardown flush the latest position. The UI reports
saving, restoration, backup recovery and storage failure. Denied access or quota
failure leaves the game playable in memory without claiming a successful save.

`TownSaveStore` uses `cybershield.town.v1` and `.backup`, independently of the old
2D save. Schema 1 includes a build-family id, timestamp, mission stage and world
position/interior/outdoor-return point. Validation rejects unknown rooms/stages,
nonfinite coordinates, bounds/collisions and invalid return points. Primary and
backup are validated independently; corrupt primary data never replaces valid backup.

Completion is one stage transition: the kit disappears and `clinicSupplied` becomes
true together. No separate mutable item/reward counter can drift from that state.
The new-game action resets only this session, preserving unrelated local storage.

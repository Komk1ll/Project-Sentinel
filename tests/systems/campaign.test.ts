import { expect, it } from 'vitest';
import { STORY_ROBOT, STORY_LIBRARY, STORY_FRAGMENTS, STORY_NETWORK, STORY_PARK } from '@game/systems/campaign';
import { buildingEntrance, TOWN_BUILDINGS } from '@content/town';
import { FirstAidMission } from '@game/systems/first-aid-mission';
import { TownWorld, type TownPosition } from '@game/systems/town-world';
import { storyNavigationGoal, walkingRoute } from '@game/systems/town-navigation';
import { parseTownSave } from '@game/systems/town-save';

it.each(['network', 'volunteers'])('plays the five episodes to the %s ending and restores it', ending => {
  const world = new TownWorld();
  const mission = new FirstAidMission(world);
  const visit = (point: TownPosition, id: string | null = null) => {
    const building = TOWN_BUILDINGS.find(item => item.id === id);
    expect(world.restore({ interiorId: id, position: point, outdoorReturn: building ? buildingEntrance(building) : point })).toBe(true);
    expect(mission.interact()).toBe(true);
  };
  visit({ x: .85, z: .25 }, 'station');
  expect(mission.snapshot.stage).toBe('deliver-aid');
  visit({ x: .85, z: .25 }, 'clinic');
  expect(mission.snapshot.clinicSupplied).toBe(true);
  visit(STORY_ROBOT);
  expect(mission.chooseStory('repair-wrong')).toBe(true);
  expect(mission.campaignProgress.repair).toBe(0);
  for (let step = 0; step < 3; step++) expect(mission.chooseStory('repair-right')).toBe(true);
  expect(mission.storyEpisode).toBe(2);
  visit(STORY_LIBRARY, 'library');
  expect(mission.chooseStory('archive-start')).toBe(true);
  STORY_FRAGMENTS.forEach(fragment => visit(fragment, 'library'));
  visit(STORY_LIBRARY, 'library');
  expect(mission.chooseStory('archive-save')).toBe(true);
  if (ending === 'network') {
    visit(STORY_NETWORK, 'townhall');
    expect(mission.chooseStory('network-check')).toBe(true);
    expect(mission.storyPanel?.text).toContain('пока не готова');
    for (let edge = 0; edge < 4; edge++) expect(mission.chooseStory('edge-' + edge)).toBe(true);
    expect(mission.chooseStory('network-check')).toBe(true);
    expect(mission.storyEpisode).toBe(4);
  }
  visit(STORY_PARK);
  if (ending === 'volunteers') expect(mission.chooseStory('finish-network')).toBe(false);
  expect(mission.chooseStory('finish-' + ending)).toBe(true);
  const save = parseTownSave(JSON.stringify({schemaVersion:1, layout:'coastal-island-v5',buildId:'cybershield-first-aid',
    savedAt:1, world:world.snapshot, stage:mission.snapshot.stage, campaign:mission.campaignProgress}));
  expect(save?.campaign?.ending).toBe(ending);
  mission.restore(save!.stage, save!.campaign);
  expect(mission.storyTarget).toBeNull();
  mission.destroy();
});

it('routes to the outdoor robot and indoor library objectives', () => {
  const world = new TownWorld({x:32,z:35});
  const mission = new FirstAidMission(world);
  mission.restore('completed');
  const robot = storyNavigationGoal(world, mission.storyTarget, null);
  expect(robot?.position).toEqual(STORY_ROBOT);
  expect(walkingRoute(world.position, robot!.position, null).length).toBeGreaterThan(1);
  const library = TOWN_BUILDINGS.find(building => building.id === 'library')!;
  world.restore({interiorId:library.id, position:{x:0,z:2}, outdoorReturn:buildingEntrance(library)});
  mission.restore('completed', { ...mission.campaignProgress, repair: 3 });
  const inside = storyNavigationGoal(world, mission.storyTarget, null);
  expect(inside?.position).toEqual(STORY_LIBRARY);
  expect(walkingRoute(world.position, inside!.position, library).length).toBeGreaterThan(1);
  mission.destroy();
});

// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { mountTownHud } from '@ui/town-hud';
import { TownWorld } from '@game/systems/town-world';
import { FirstAidMission } from '@game/systems/first-aid-mission';
import { CameraZoom } from '@game/systems/camera-zoom';
import { TownSession } from '@game/systems/town-session';
import { approachMaster, leaveWorkshop, walkTo } from '../fixtures/first-aid-route';

function canvasContext(): CanvasRenderingContext2D {
  // Verify drawing commands and content, without claiming browser pixel output.
  return new Proxy({}, { get: (target, property) => Reflect.get(target, property) ?? vi.fn() }) as CanvasRenderingContext2D;
}
afterEach(()=>{ vi.restoreAllMocks(); document.body.replaceChildren(); localStorage.clear(); });

it('labels mission places and follows pickup, room exit, delivery and restoration',()=>{
  const ctx=canvasContext();
  const fillText=vi.fn(); ctx.fillText=fillText;
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation((() => ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext);
  const world=new TownWorld(), mission=new FirstAidMission(world), zoom=new CameraZoom();
  const session=new TownSession(world,mission);
  const host=document.createElement('div');document.body.append(host);
  const unmount=mountTownHud(host,mission,zoom,session);
  try {
    expect(host.querySelector('.town-map-places')?.textContent).toContain('Маяк');
    expect(host.querySelector('.town-map-places')?.textContent).toContain('Поликлиника');
    expect(host.querySelector('.town-map-goal')?.textContent).toBe('Маяк · вход');
    expect(fillText.mock.calls.some(call=>call[0]==='Вы')).toBe(true);
    approachMaster(mission);
    expect(host.querySelector('.town-map-goal')?.textContent).toBe('Мастер');
    mission.interact();
    expect(host.querySelector('.town-map-goal')?.textContent).toBe('Выход на улицу');
    leaveWorkshop(mission);
    expect(host.querySelector('.town-map-goal')?.textContent).toBe('Поликлиника · вход');
    walkTo(world,{x:32,z:46});walkTo(world,{x:40,z:46});mission.interact();
    walkTo(world,{x:0,z:.25});walkTo(world,{x:.75,z:.25});
    expect(host.querySelector('.town-map-goal')?.textContent).toBe('Медработник');
    mission.interact();
    expect(host.querySelector('.town-map-goal')?.textContent).toBe('Помощь доставлена');
    mission.restore('deliver-aid');
    expect(host.querySelector('.town-map-goal')?.textContent).toBe('Медработник');
  } finally { unmount();session.destroy();mission.destroy(); }
});

it('lets the player collapse and reopen the mission panel without changing progress',()=>{
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
  const world=new TownWorld(),mission=new FirstAidMission(world),session=new TownSession(world,mission);
  const host=document.createElement('div');document.body.append(host);
  const unmount=mountTownHud(host,mission,new CameraZoom(),session);
  try {
    const button=host.querySelector<HTMLButtonElement>('.town-mission-toggle')!;
    const body=host.querySelector<HTMLElement>('#town-mission-body')!;
    const original=body.hidden;
    button.click(); expect(body.hidden).toBe(!original);expect(button.getAttribute('aria-expanded')).toBe(String(original));
    button.click(); expect(body.hidden).toBe(original);
    expect(mission.snapshot.stage).toBe('meet-master');
  } finally {unmount();session.destroy();mission.destroy();}
});

it('switches map modes independently of camera zoom and keeps the objective visible when collapsed',()=>{
  const ctx=canvasContext(), text=vi.fn();ctx.fillText=text;
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation((()=>ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext);
  const world=new TownWorld(),mission=new FirstAidMission(world),session=new TownSession(world,mission),zoom=new CameraZoom();
  const host=document.createElement('div');document.body.append(host);
  const unmount=mountTownHud(host,mission,zoom,session);
  try {
    const body=host.querySelector<HTMLElement>('#town-mission-body')!;
    expect(body.hidden).toBe(true);
    expect(body.contains(host.querySelector('.town-objective'))).toBe(false);
    const initial=zoom.span;
    host.querySelector<HTMLButtonElement>('[data-map-mode="district"]')!.click();
    expect(host.querySelector('[data-map-mode="district"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-map-mode="nearby"]')!.getAttribute('aria-pressed')).toBe('false');
    expect(zoom.span).toBe(initial);
    for(const label of ['Маяк','Клиника','Сад','Роща','Площадь','Вы'])expect(text.mock.calls.some(call=>call[0]===label)).toBe(true);
    const expand=host.querySelector<HTMLButtonElement>('.town-map-expand')!;expand.click();
    expect(expand.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('.town-map-panel')!.classList.contains('town-map-expanded')).toBe(true);
    expand.click();expect(expand.getAttribute('aria-expanded')).toBe('false');
  } finally {unmount();session.destroy();mission.destroy();}
});

it('offers a planet atlas, a separate global camera view and ambient feedback',()=>{
  const ctx=canvasContext(),text=vi.fn();ctx.fillText=text;
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation((()=>ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext);
  const world=new TownWorld(),mission=new FirstAidMission(world),session=new TownSession(world,mission),zoom=new CameraZoom();
  const host=document.createElement('div');document.body.append(host);const unmount=mountTownHud(host,mission,zoom,session);
  try{
    host.querySelector<HTMLButtonElement>('[data-map-mode="planet"]')!.click();
    expect(host.querySelector('.town-map-location')?.textContent).toContain('развёртка');
    expect(text.mock.calls.some(call=>call[0]==='Мельница')).toBe(true);expect(zoom.span).toBe(11);
    host.querySelector<HTMLButtonElement>('[data-zoom="planet"]')!.click();
    for(let i=0;i<160;i++)zoom.step(.1);expect(zoom.span).toBeCloseTo(56);
    world.restore({interiorId:null,position:{x:22,z:30},outdoorReturn:{x:22,z:30}});
    host.querySelector<HTMLButtonElement>('.town-interaction')!.click();
    expect(host.querySelector('.town-life-message')?.textContent).toContain('полил');
    expect(host.querySelector<HTMLElement>('.town-life-message')!.hidden).toBe(false);
    expect(mission.snapshot.stage).toBe('meet-master');
  }finally{unmount();session.destroy();mission.destroy();}
});

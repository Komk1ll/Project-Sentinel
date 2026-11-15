import type { TownPosition, TownWorld } from '@game/systems/town-world';

export const STORY_ROBOT = { x: 28.5, z: 45.8 } as const;
export const STORY_PARK = { x: 26, z: 24 } as const;
export const STORY_LIBRARY = { x: .9, z: -.5 } as const;
export const STORY_NETWORK = { x: 1.2, z: -1.55 } as const;
export const STORY_FRAGMENTS = [
  { x: -2.65, z: .15, name: 'Фотография открытия «Маяка»' },
  { x: 1.2, z: -2.05, name: 'Рисунок старого Зареченска' },
] as const;

export const STORY_TITLES = ['Сначала люди', 'Вернуть помощника', 'У памяти есть имена', 'Сеть доверия', 'Что мы сохранили'] as const;
export type Ending = 'network' | 'volunteers';
export interface CampaignProgress {
  readonly repair: number;
  readonly archiveStarted: boolean;
  readonly fragments: number;
  readonly archived: boolean;
  readonly network: number;
  readonly ending: Ending | null;
}
export const START_CAMPAIGN: CampaignProgress = {
  repair: 0, archiveStarted: false, fragments: 0, archived: false, network: 0, ending: null,
};

export function networkRestored(mask: number): boolean {
  // Every service has one link to the working source. The failed relay must be isolated.
  return mask === 0b10111;
}

export function isCampaignProgress(value: unknown): value is CampaignProgress {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as CampaignProgress;
  return Number.isInteger(p.repair) && p.repair >= 0 && p.repair <= 3 &&
    typeof p.archiveStarted === 'boolean' && Number.isInteger(p.fragments) && p.fragments >= 0 && p.fragments <= 3 &&
    typeof p.archived === 'boolean' && Number.isInteger(p.network) && p.network >= 0 && (p.network <= 15 || networkRestored(p.network)) &&
    (p.ending === null || p.ending === 'network' || p.ending === 'volunteers') &&
    (!p.archiveStarted || p.repair === 3) && (!p.fragments || p.archiveStarted) &&
    (!p.archived || p.fragments === 3) && (!p.network || p.archived) &&
    (p.ending === null || (p.archived && (p.ending === 'volunteers' || networkRestored(p.network))));
}

type StorySpot = { readonly point: TownPosition; readonly buildingId: string | null; readonly label: string };
export interface CampaignTarget extends StorySpot {
  readonly id: 'robot' | 'librarian' | 'photo' | 'drawing' | 'network' | 'park';
}
const robot: CampaignTarget = { id: 'robot', point: STORY_ROBOT, buildingId: null, label: 'Осмотреть робота' };
const librarian: CampaignTarget = { id: 'librarian', point: STORY_LIBRARY, buildingId: 'library', label: 'Поговорить с библиотекарем' };
const network: CampaignTarget = { id: 'network', point: STORY_NETWORK, buildingId: 'townhall', label: 'Открыть схему городской сети' };
const park: CampaignTarget = { id: 'park', point: STORY_PARK, buildingId: null, label: 'Обсудить решение с жителями' };

function fragmentTargets(p: CampaignProgress): CampaignTarget[] {
  return STORY_FRAGMENTS.flatMap((fragment, index) => p.fragments & (1 << index) ? [] : [{
    id: index === 0 ? 'photo' : 'drawing',
    point: fragment, buildingId: 'library', label: 'Забрать фрагмент · ' + fragment.name,
  }]);
}

export function campaignTarget(p: CampaignProgress): CampaignTarget | null {
  if (p.ending) return null;
  if (p.repair < 3) return robot;
  if (!p.archiveStarted || p.fragments === 3 && !p.archived) return librarian;
  if (!p.archived) return fragmentTargets(p)[0] ?? librarian;
  return networkRestored(p.network) ? park : network;
}

export function nearbyCampaignTarget(p: CampaignProgress, world: TownWorld): CampaignTarget | null {
  if (world.interiorFloor > 0 || world.activeBoat !== null || world.activeCar !== null) return null;
  const target = campaignTarget(p);
  const choices = !target ? [park, librarian] : target.id === 'photo' || target.id === 'drawing'
    ? fragmentTargets(p) : p.archived ? [target, target === park ? network : park, librarian] : [target];
  return choices.find(({ point, buildingId }) =>
    (world.interior?.id ?? null) === buildingId && Math.hypot(world.position.x - point.x, world.position.z - point.z) <= 1.35) ?? null;
}

export interface CampaignAction { readonly id: string; readonly label: string; readonly disabled?: boolean; }
export interface CampaignPanel { readonly target: CampaignTarget['id'] | 'menu'; readonly title: string; readonly text: string; readonly actions: readonly CampaignAction[]; readonly outcomes?: readonly string[]; }

export const ARCHIVE_ENTRIES = [
  { title: 'Открытие мастерской «Маяк»', text: 'Художественная фотография. На первом снимке мастера и соседи стоят у самодельной вывески. Сегодня на этом месте волонтёры получают наборы для поликлиники.' },
  { title: 'Воспоминание мастера', text: 'Художественная запись. «Верстак делали всем двором. Кто-то принёс доски, кто-то одолжил инструменты. Так мы и научились не оставлять друг друга с бедой». ' },
  { title: 'Рисунок набережной', text: 'Художественный рисунок. Школьники отметили на карте пристань, яблоневый сад и дорожку от мастерской к парку. Их рисунок сохранился в резервной копии.' },
] as const;

const repairSteps = [
  { title: 'Диагностика доставщика', text: 'Двигатель цел. Индикатор связи мигает красным, а датчик пути ничего не видит.', right: 'Проверить модуль связи', wrong: 'Заменить двигатель' },
  { title: 'Осмотр разъёма', text: 'Мастер нашёл ослабленный разъём. Запасной модуль подойдёт после отключения питания.', right: 'Отключить питание и закрепить разъём', wrong: 'Включить мотор при открытом корпусе' },
  { title: 'Контрольный запуск', text: 'Разъём закреплён. Проверь доставщика перед отправкой в поликлинику.', right: 'Запустить тест доставки', wrong: 'Отправить без проверки' },
] as const;

export function campaignPanel(target: CampaignTarget['id'], p: CampaignProgress, note = ''): CampaignPanel {
  if (target === 'robot') {
    const step = repairSteps[p.repair]!;
    return { target, title: step.title, text: note || step.text,
      actions: [{ id: 'repair-right', label: step.right }, { id: 'repair-wrong', label: step.wrong }] };
  }
  if (target === 'librarian') return { target, title: 'Архив Зареченска',
    text: p.archived
      ? 'Художественный архив. Фотография: открытие мастерской. Запись мастера: соседи вместе собрали первый верстак. Рисунок: набережная глазами школьников.'
      : p.fragments === 3
        ? 'Оба фрагмента найдены. Фотография расскажет, кто открыл мастерскую, а рисунок сохранит память о районе.'
        : 'Библиотекарь: «У стены слева осталась фотография открытия мастерской. За проходом у дальних полок ищи рисунок района».',
    actions: p.archived ? ARCHIVE_ENTRIES.map((entry, i) => ({ id: 'archive-read-' + i, label: entry.title })) : [{ id: p.fragments === 3 ? 'archive-save' : 'archive-start', label: p.fragments === 3 ? 'Сделать резервную копию' : 'Начать поиск' }] };
  if (target === 'network') {
    const links = ['Мастерская', 'Поликлиника', 'Библиотека', 'Неисправный узел'];
    return { target, title: 'Условная схема городской сети',
      text: note || 'Соедини три службы с рабочим источником, неисправный узел отключи. Каждую связь можно переключить обратно.',
      actions: [...links.map((label, i) => ({ id: 'edge-' + i, label: label + ' · ' + (p.network & (1 << i) ? 'подключено' : 'отключено') })),
        { id: 'network-hint', label: 'Подсказка' }, { id: 'network-check', label: 'Проверить схему' }] };
  }
  return { target, title: p.ending ? 'Что мы сохранили' : 'Решение жителей',
    text: p.ending === 'network'
      ? 'Помощь доставлена. Архив сохранён. Службы снова связаны, и робот продолжает развозить грузы.'
      : p.ending === 'volunteers'
        ? 'Помощь доставлена. Архив сохранён. Сеть отключена, а жители распределили доставку между волонтёрами.'
        : networkRestored(p.network)
          ? 'Архив сохранён. Можно запустить проверенную сеть или оставить городские службы на ручном управлении.'
          : 'Архив сохранён. Для запуска сети закончи проверку в администрации. Волонтёры готовы взять работу на себя уже сейчас.',
    outcomes: p.ending ? ['Помощь · набор передан поликлинике', 'Архив · резервная копия сохранена',
      p.ending === 'network' ? 'Службы · проверенная сеть работает' : 'Службы · доставку ведут волонтёры'] : undefined,
    actions: p.ending ? [] : [{ id: 'finish-network', label: 'Запустить проверенную сеть', disabled: !networkRestored(p.network) },
      { id: 'finish-volunteers', label: 'Отключить сеть и работать вручную' }] };
}

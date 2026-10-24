import '@ui/player-hud.css';
import type { PlayerProgress, PlayerProgressState } from '@game/systems/player-progress';

const icons: Readonly<Record<string, string>> = {
  health: '<path d="M16 28 4 16C-5 6 9-2 16 8 23-2 37 6 28 16z"/>',
  stamina: '<path d="M14 1h12l-9 12h9L9 32l4-15H5z"/>',
  hunger: '<path d="m5 3 5 10-4 15M8 14l9 6M22 2l7 9-9 6M24 15l4 13M15 8l3 7"/>',
  mood: '<circle cx="16" cy="16" r="13"/><circle cx="11" cy="12" r="1.5" fill="#09151e"/><circle cx="21" cy="12" r="1.5" fill="#09151e"/><path d="M10 21q6-4 12 0" stroke="#09151e" fill="none"/>',
};

function icon(name: string): string {
  return `<svg viewBox="0 0 34 36" aria-hidden="true" fill="currentColor" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name] ?? ''}</svg>`;
}

const stats = [
  { id: 'health', label: 'Здоровье', color: '#eb253e' },
  { id: 'stamina', label: 'Выносливость', color: '#ffc23b' },
  { id: 'hunger', label: 'Сытость', color: '#00ca80' },
  { id: 'mood', label: 'Настроение', color: '#00a9f4' },
] as const;

/** Renders current progression values without coupling the view to gameplay rules. */
export function renderPlayerHud(state: PlayerProgressState): string {
  return `
    <section class="character-card" aria-label="Алексей, характеристики">
      <div class="character-details">
        <h1 class="character-name">Алексей</h1>
        <p class="character-role">Цифровой волонтер</p>
        <p class="character-level">Ур. ${state.level}</p>
        <div class="experience-track" style="--experience-value:${state.experience}%" role="progressbar" aria-label="Опыт" aria-valuenow="${state.experience}" aria-valuemin="0" aria-valuemax="100"><div class="experience-fill"></div></div>
      </div>
      <div class="character-stats">
        ${stats.map(stat => `
          <div class="stat-row" style="--stat-color:${stat.color};--stat-value:${state[stat.id]}%">
            <span class="stat-icon">${icon(stat.id)}</span>
            <span class="stat-label">${stat.label}</span>
            <div class="stat-track" role="progressbar" aria-label="${stat.label}" aria-valuenow="${state[stat.id]}" aria-valuemin="0" aria-valuemax="100"><div class="stat-fill"></div></div>
            <span class="stat-value">${state[stat.id]}/100</span>
          </div>`).join('')}
      </div>
    </section>`;
}

/** Subscribes the compact HUD to game-owned progress and returns its cleanup. */
export function mountPlayerHud(container: HTMLElement, progress: PlayerProgress): () => void {
  const hud = document.createElement('aside');
  hud.className = 'player-hud';
  hud.lang = 'ru';
  hud.setAttribute('aria-label', 'Характеристики персонажа');
  const unsubscribe = progress.subscribe(state => {
    hud.innerHTML = renderPlayerHud(state);
  });
  container.prepend(hud);
  return () => {
    unsubscribe();
    hud.remove();
  };
}

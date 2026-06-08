import { getConstellationNames, type ConstellationInfo } from './constellations';

let infoCard: HTMLDivElement | null = null;

export const Events = {
  CONSTELLATION_SELECTED: 'constellation-selected',
  TIME_SPEED_CHANGE: 'time-speed-change',
  TIME_TOGGLE_PAUSE: 'time-toggle-pause',
  TIME_RESET: 'time-reset',
  CLOSE_INFO_CARD: 'close-info-card'
};

function createStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    .ui-container {
      pointer-events: auto;
    }
    .glass-panel {
      background: rgba(20, 30, 60, 0.55);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(150, 180, 255, 0.25);
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    }
    .constellation-select-wrapper {
      position: absolute;
      top: 20px;
      left: 20px;
      padding: 10px 14px;
      min-width: 180px;
    }
    .constellation-label {
      font-size: 12px;
      color: rgba(200, 215, 255, 0.7);
      margin-bottom: 6px;
      letter-spacing: 1px;
    }
    .constellation-select {
      width: 100%;
      background: rgba(10, 20, 45, 0.6);
      color: #e8efff;
      border: 1px solid rgba(120, 160, 255, 0.3);
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 14px;
      cursor: pointer;
      outline: none;
      font-family: inherit;
      transition: border-color 0.2s, background 0.2s;
    }
    .constellation-select:hover,
    .constellation-select:focus {
      border-color: rgba(150, 190, 255, 0.7);
      background: rgba(20, 40, 80, 0.7);
    }
    .constellation-select option {
      background: #0a1430;
      color: #e8efff;
    }
    .time-controls {
      position: absolute;
      top: 20px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
    }
    .ctrl-btn {
      background: rgba(40, 70, 130, 0.6);
      color: #dde8ff;
      border: 1px solid rgba(120, 160, 255, 0.3);
      border-radius: 8px;
      padding: 7px 12px;
      font-size: 13px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s ease;
      min-width: 42px;
      user-select: none;
    }
    .ctrl-btn:hover {
      background: rgba(70, 110, 200, 0.8);
      border-color: rgba(150, 190, 255, 0.7);
    }
    .ctrl-btn:active {
      transform: scale(0.95);
    }
    .ctrl-btn.active {
      background: rgba(100, 150, 255, 0.85);
      border-color: rgba(180, 210, 255, 0.9);
      color: #ffffff;
    }
    .speed-label {
      font-size: 11px;
      color: rgba(200, 215, 255, 0.7);
      margin-right: 4px;
      letter-spacing: 0.5px;
    }
    .info-card-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      z-index: 100;
    }
    .info-card-overlay.visible {
      opacity: 1;
      pointer-events: auto;
    }
    .info-card {
      background: linear-gradient(135deg, rgba(20, 35, 70, 0.92), rgba(15, 25, 55, 0.95));
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(130, 170, 255, 0.35);
      border-radius: 12px;
      padding: 28px 30px;
      max-width: 440px;
      width: calc(100% - 40px);
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.55), 0 0 60px rgba(100, 150, 255, 0.15);
      transform: translateY(20px) scale(0.96);
      opacity: 0;
      transition: all 0.3s ease;
    }
    .info-card-overlay.visible .info-card {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    .info-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .info-card-title {
      font-size: 24px;
      font-weight: 600;
      color: #ffffff;
      letter-spacing: 1px;
    }
    .info-card-title-en {
      font-size: 13px;
      color: rgba(170, 195, 255, 0.7);
      margin-top: 4px;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .info-close-btn {
      background: rgba(80, 120, 200, 0.5);
      border: 1px solid rgba(150, 180, 255, 0.3);
      color: #dde8ff;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      line-height: 1;
    }
    .info-close-btn:hover {
      background: rgba(120, 170, 255, 0.8);
      transform: scale(1.08);
    }
    .info-section {
      margin-bottom: 14px;
    }
    .info-section-label {
      font-size: 11px;
      color: rgba(150, 180, 230, 0.7);
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .info-section-content {
      font-size: 13.5px;
      color: rgba(220, 230, 255, 0.92);
      line-height: 1.65;
    }
    .star-list {
      list-style: none;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .star-item {
      background: rgba(80, 130, 220, 0.25);
      border: 1px solid rgba(120, 170, 255, 0.3);
      border-radius: 6px;
      padding: 3px 10px;
      font-size: 12px;
      color: rgba(210, 225, 255, 0.9);
    }
    @media (max-width: 600px) {
      .constellation-select-wrapper {
        top: 12px;
        left: 12px;
        padding: 8px 12px;
        min-width: 140px;
      }
      .constellation-label {
        font-size: 11px;
      }
      .constellation-select {
        font-size: 13px;
        padding: 7px 8px;
      }
      .time-controls {
        top: 12px;
        right: 12px;
        gap: 5px;
        padding: 8px 10px;
      }
      .ctrl-btn {
        padding: 6px 9px;
        font-size: 12px;
        min-width: 36px;
      }
      .speed-label {
        display: none;
      }
      .info-card {
        padding: 22px 20px;
        max-width: calc(100% - 32px);
      }
      .info-card-title {
        font-size: 20px;
      }
    }
  `;
  document.head.appendChild(style);
}

function createConstellationSelect(root: HTMLElement): void {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui-container glass-panel constellation-select-wrapper';

  const label = document.createElement('div');
  label.className = 'constellation-label';
  label.textContent = '星座';

  const select = document.createElement('select');
  select.className = 'constellation-select';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '选择星座...';
  select.appendChild(defaultOption);

  getConstellationNames().forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    const event = new CustomEvent(Events.CONSTELLATION_SELECTED, {
      detail: { name: select.value || null }
    });
    window.dispatchEvent(event);
  });

  wrapper.appendChild(label);
  wrapper.appendChild(select);
  root.appendChild(wrapper);
}

function createTimeControls(root: HTMLElement): void {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui-container glass-panel time-controls';

  const speedLabel = document.createElement('span');
  speedLabel.className = 'speed-label';
  speedLabel.textContent = '速度';
  wrapper.appendChild(speedLabel);

  const speeds = [1, 2, 4];
  const speedBtns: HTMLButtonElement[] = [];

  speeds.forEach((speed) => {
    const btn = document.createElement('button');
    btn.className = 'ctrl-btn' + (speed === 1 ? ' active' : '');
    btn.textContent = `${speed}x`;
    btn.dataset.speed = String(speed);
    btn.addEventListener('click', () => {
      speedBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const event = new CustomEvent(Events.TIME_SPEED_CHANGE, {
        detail: { speed }
      });
      window.dispatchEvent(event);
    });
    speedBtns.push(btn);
    wrapper.appendChild(btn);
  });

  const pauseBtn = document.createElement('button');
  pauseBtn.className = 'ctrl-btn';
  pauseBtn.textContent = '▶';
  pauseBtn.title = '播放/暂停';
  let paused = true;
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? '▶' : '⏸';
    const event = new CustomEvent(Events.TIME_TOGGLE_PAUSE, {
      detail: { paused }
    });
    window.dispatchEvent(event);
  });
  wrapper.appendChild(pauseBtn);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'ctrl-btn';
  resetBtn.textContent = '⟲';
  resetBtn.title = '重置';
  resetBtn.addEventListener('click', () => {
    paused = true;
    pauseBtn.textContent = '▶';
    speedBtns.forEach((b) => b.classList.remove('active'));
    speedBtns[0].classList.add('active');
    const event = new CustomEvent(Events.TIME_RESET);
    window.dispatchEvent(event);
  });
  wrapper.appendChild(resetBtn);

  root.appendChild(wrapper);
}

function createInfoCard(root: HTMLElement): void {
  const overlay = document.createElement('div');
  overlay.className = 'info-card-overlay';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hideInfoCard();
    }
  });

  const card = document.createElement('div');
  card.className = 'info-card';

  const header = document.createElement('div');
  header.className = 'info-card-header';

  const titleWrap = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'info-card-title';
  title.id = 'info-card-title';
  const titleEn = document.createElement('div');
  titleEn.className = 'info-card-title-en';
  titleEn.id = 'info-card-title-en';
  titleWrap.appendChild(title);
  titleWrap.appendChild(titleEn);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'info-close-btn';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', hideInfoCard);

  header.appendChild(titleWrap);
  header.appendChild(closeBtn);

  const starsSection = document.createElement('div');
  starsSection.className = 'info-section';
  const starsLabel = document.createElement('div');
  starsLabel.className = 'info-section-label';
  starsLabel.textContent = '主要恒星';
  const starsList = document.createElement('ul');
  starsList.className = 'star-list';
  starsList.id = 'info-card-stars';
  starsSection.appendChild(starsLabel);
  starsSection.appendChild(starsList);

  const mythSection = document.createElement('div');
  mythSection.className = 'info-section';
  const mythLabel = document.createElement('div');
  mythLabel.className = 'info-section-label';
  mythLabel.textContent = '神话背景';
  const mythContent = document.createElement('div');
  mythContent.className = 'info-section-content';
  mythContent.id = 'info-card-myth';
  mythSection.appendChild(mythLabel);
  mythSection.appendChild(mythContent);

  card.appendChild(header);
  card.appendChild(starsSection);
  card.appendChild(mythSection);
  overlay.appendChild(card);
  root.appendChild(overlay);

  infoCard = overlay;
}

export function showInfoCard(info: ConstellationInfo): void {
  if (!infoCard) return;
  const titleEl = document.getElementById('info-card-title');
  const titleEnEl = document.getElementById('info-card-title-en');
  const starsEl = document.getElementById('info-card-stars');
  const mythEl = document.getElementById('info-card-myth');

  if (titleEl) titleEl.textContent = info.name;
  if (titleEnEl) titleEnEl.textContent = info.nameEn;
  if (starsEl) {
    starsEl.innerHTML = '';
    info.mainStars.forEach((s) => {
      const li = document.createElement('li');
      li.className = 'star-item';
      li.textContent = s;
      starsEl.appendChild(li);
    });
  }
  if (mythEl) mythEl.textContent = info.mythology;

  infoCard.classList.add('visible');
}

export function hideInfoCard(): void {
  if (!infoCard) return;
  infoCard.classList.remove('visible');
  const event = new CustomEvent(Events.CLOSE_INFO_CARD);
  window.dispatchEvent(event);
}

export function initUI(): void {
  createStyles();
  const root = document.getElementById('ui-root');
  if (!root) return;
  createConstellationSelect(root);
  createTimeControls(root);
  createInfoCard(root);
}

export function setConstellationSelectValue(name: string | null): void {
  const select = document.querySelector('.constellation-select') as HTMLSelectElement | null;
  if (select) {
    select.value = name || '';
  }
}

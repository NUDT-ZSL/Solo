import * as THREE from 'three';
import type { Season } from './constellation';
import type { ConstellationData } from './constellation';

type SeasonChangeCallback = (season: Season) => void;
type RippleTrigger = () => void;

const SEASON_LABELS: Record<Season, string> = {
  spring: '春季',
  summer: '夏季',
  autumn: '秋季',
  winter: '冬季',
};

const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

let onSeasonChange: SeasonChangeCallback | null = null;
let onResetView: (() => void) | null = null;
let triggerRipple: RippleTrigger | null = null;

export function initUIPanel(
  seasonCb: SeasonChangeCallback,
  resetCb: () => void,
  rippleCb: RippleTrigger
): void {
  onSeasonChange = seasonCb;
  onResetView = resetCb;
  triggerRipple = rippleCb;

  createNavbar();
  createInfoPanel();
  createSeasonSlider();
  createRippleOverlay();
  handleUIPanelResize();
  window.addEventListener('resize', handleUIPanelResize);
}

function createNavbar(): void {
  const nav = document.createElement('nav');
  nav.id = 'sky-navbar';
  nav.innerHTML = `
    <div class="nav-inner">
      <div class="nav-title">SkyExplorer</div>
      <button id="reset-view-btn">重置视角</button>
    </div>
  `;
  applyNavbarStyles(nav);
  document.body.appendChild(nav);

  document.getElementById('reset-view-btn')!.addEventListener('click', () => {
    onResetView?.();
  });
}

function applyNavbarStyles(nav: HTMLElement): void {
  const style: Partial<CSSStyleDeclaration> = {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    height: '50px',
    background: 'rgba(15, 23, 42, 0.85)',
    borderBottom: '1px solid #334155',
    zIndex: '100',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  };
  Object.assign(nav.style, style);

  const inner = nav.querySelector('.nav-inner') as HTMLElement;
  Object.assign(inner.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  });

  const title = nav.querySelector('.nav-title') as HTMLElement;
  Object.assign(title.style, {
    fontSize: '18px',
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: '1px',
  });

  const btn = nav.querySelector('#reset-view-btn') as HTMLElement;
  Object.assign(btn.style, {
    padding: '8px 18px',
    borderRadius: '8px',
    border: 'none',
    background: '#312e81',
    color: '#ffffff',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    fontWeight: '500',
  });
  btn.addEventListener('mouseenter', () => {
    btn.style.background = '#4338ca';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = '#312e81';
  });
}

function createInfoPanel(): void {
  const panel = document.createElement('div');
  panel.id = 'info-panel';
  panel.innerHTML = `
    <div id="info-panel-content">
      <div class="info-placeholder">点击星座查看详情</div>
    </div>
  `;
  applyInfoPanelStyles(panel);
  document.body.appendChild(panel);
}

function applyInfoPanelStyles(panel: HTMLElement): void {
  Object.assign(panel.style, {
    position: 'fixed',
    top: '70px',
    right: '20px',
    width: '280px',
    background: 'rgba(30, 27, 75, 0.75)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: '16px',
    padding: '20px',
    zIndex: '90',
    border: '1px solid rgba(165, 180, 252, 0.15)',
    transition: 'all 0.3s ease',
    pointerEvents: 'none',
    boxSizing: 'border-box',
  });

  const placeholder = panel.querySelector('.info-placeholder') as HTMLElement;
  Object.assign(placeholder.style, {
    color: '#64748b',
    fontSize: '14px',
    textAlign: 'center',
    padding: '40px 0',
  });
}

export function updateInfoPanel(data: ConstellationData | null): void {
  const content = document.getElementById('info-panel-content');
  if (!content) return;

  if (!data) {
    content.innerHTML = `<div class="info-placeholder">点击星座查看详情</div>`;
    const placeholder = content.querySelector('.info-placeholder') as HTMLElement;
    Object.assign(placeholder.style, {
      color: '#64748b',
      fontSize: '14px',
      textAlign: 'center',
      padding: '40px 0',
    });
    return;
  }

  const seasonText = SEASON_LABELS[data.bestSeason];
  content.innerHTML = `
    <h3 style="margin:0 0 16px 0; font-size:20px; color:#e2e8f0; font-weight:700; letter-spacing:0.5px;">${data.nameZh}</h3>
    <div style="margin-bottom:12px;">
      <span style="color:#94a3b8; font-size:13px;">英文名</span>
      <div style="color:#a5b4fc; font-size:15px; font-weight:500;">${data.name}</div>
    </div>
    <div style="margin-bottom:12px;">
      <span style="color:#94a3b8; font-size:13px;">亮星数</span>
      <div style="color:#e2e8f0; font-size:15px; font-weight:500;">${data.brightStarCount} 颗</div>
    </div>
    <div style="margin-bottom:12px;">
      <span style="color:#94a3b8; font-size:13px;">最佳观测季节</span>
      <div style="color:#fbbf24; font-size:15px; font-weight:500;">${seasonText}</div>
    </div>
    <div style="margin-top:16px; padding-top:16px; border-top:1px solid rgba(165,180,252,0.15);">
      <span style="color:#94a3b8; font-size:13px;">神话故事</span>
      <div style="color:#cbd5e1; font-size:14px; line-height:1.7; margin-top:6px;">${data.mythStory}</div>
    </div>
  `;
}

function createSeasonSlider(): void {
  const container = document.createElement('div');
  container.id = 'season-slider-container';
  container.innerHTML = `
    <div class="slider-track-container">
      <input type="range" id="season-slider" min="0" max="3" step="1" value="1" />
    </div>
    <div id="season-label">${SEASON_LABELS[SEASON_ORDER[1]]}</div>
  `;
  applySeasonSliderStyles(container);
  document.body.appendChild(container);

  const slider = document.getElementById('season-slider') as HTMLInputElement;
  slider.addEventListener('input', () => {
    const idx = parseInt(slider.value, 10);
    const season = SEASON_ORDER[idx];
    const label = document.getElementById('season-label');
    if (label) {
      label.textContent = SEASON_LABELS[season];
    }
    onSeasonChange?.(season);
  });
}

function applySeasonSliderStyles(container: HTMLElement): void {
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '90',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    pointerEvents: 'auto',
  });

  const trackContainer = container.querySelector('.slider-track-container') as HTMLElement;
  Object.assign(trackContainer.style, {
    width: '400px',
  });

  const slider = document.createElement('style');
  slider.textContent = `
    #season-slider {
      width: 100%;
      height: 8px;
      -webkit-appearance: none;
      appearance: none;
      background: #312e81;
      border-radius: 4px;
      outline: none;
      cursor: pointer;
    }
    #season-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #a5b4fc;
      cursor: pointer;
      box-shadow: 0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(165,180,252,0.4);
      border: 2px solid rgba(255,255,255,0.3);
      transition: box-shadow 0.25s ease;
    }
    #season-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #a5b4fc;
      cursor: pointer;
      box-shadow: 0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(165,180,252,0.4);
      border: 2px solid rgba(255,255,255,0.3);
    }
  `;
  document.head.appendChild(slider);

  const label = container.querySelector('#season-label') as HTMLElement;
  Object.assign(label.style, {
    color: '#a5b4fc',
    fontSize: '15px',
    fontWeight: '600',
    letterSpacing: '2px',
    transition: 'all 0.25s ease',
    textShadow: '0 0 12px rgba(165,180,252,0.5)',
  });
}

function createRippleOverlay(): void {
  const ripple = document.createElement('div');
  ripple.id = 'ripple-overlay';
  Object.assign(ripple.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '200',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });
  document.body.appendChild(ripple);
}

export function playRipple(): void {
  const overlay = document.getElementById('ripple-overlay');
  if (!overlay) return;
  overlay.innerHTML = '';

  const ring = document.createElement('div');
  Object.assign(ring.style, {
    width: '0px',
    height: '0px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.6)',
    opacity: '0.6',
    transition: 'all 0.5s ease-out',
    boxSizing: 'border-box',
  });
  overlay.appendChild(ring);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      Object.assign(ring.style, {
        width: '160px',
        height: '160px',
        borderWidth: '2px',
        opacity: '0',
      });
    });
  });

  setTimeout(() => {
    ring.remove();
  }, 600);
}

function handleUIPanelResize(): void {
  const panel = document.getElementById('info-panel');
  if (!panel) return;

  if (window.innerWidth < 768) {
    Object.assign(panel.style, {
      top: 'auto',
      right: '0',
      bottom: '0',
      left: '0',
      width: '100%',
      height: '300px',
      borderRadius: '20px 20px 0 0',
    });
  } else {
    Object.assign(panel.style, {
      top: '70px',
      right: '20px',
      bottom: 'auto',
      left: 'auto',
      width: '280px',
      height: 'auto',
      borderRadius: '16px',
    });
  }
}

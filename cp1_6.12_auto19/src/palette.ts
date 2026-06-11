import type { GradientState } from './editor';
import { GradientEditor } from './editor';

const MAX_PALETTE_SIZE = 20;
const STORAGE_KEY = 'gradientlab.palette.v1';

export interface SavedGradient extends GradientState {
  id: string;
  createdAt: number;
}

type PaletteListener = (items: SavedGradient[]) => void;

function generateId(): string {
  return 'g_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let sat = 0;
  const lum = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = lum > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hue = (b - r) / d + 2; break;
      case b: hue = (r - g) / d + 4; break;
    }
    hue /= 6;
  }
  return { h: hue * 360, s: sat * 100, l: lum * 100 };
}

function normalizeHue(h: number): number {
  const mod = ((h % 360) + 360) % 360;
  return mod;
}

function hslToHex(h: number, s: number, l: number): string {
  h = normalizeHue(h);
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const color = l - a * Math.max(Math.min(k(n) - 3, 9 - k(n), 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export interface InspirationItem {
  name: string;
  tag: string;
  state: GradientState;
}

export class PaletteManager {
  private container: HTMLElement;
  private items: SavedGradient[] = [];
  private listeners: Set<PaletteListener> = new Set();
  private onApply?: (state: GradientState) => void;
  private onSaveRequest?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.load();
    this.render();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.items = parsed.slice(0, MAX_PALETTE_SIZE);
        }
      }
    } catch {
      this.items = [];
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    } catch {
    }
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn([...this.items]));
  }

  setApplyHandler(handler: (state: GradientState) => void): void {
    this.onApply = handler;
  }

  setSaveRequestHandler(handler: () => void): void {
    this.onSaveRequest = handler;
  }

  save(state: GradientState): boolean {
    if (this.items.length >= MAX_PALETTE_SIZE) {
      return false;
    }
    const item: SavedGradient = {
      ...state,
      id: generateId(),
      createdAt: Date.now()
    };
    this.items.unshift(item);
    this.persist();
    this.render();
    this.emit();
    return true;
  }

  remove(id: string): void {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx !== -1) {
      this.items.splice(idx, 1);
      this.persist();
      this.render();
      this.emit();
    }
  }

  clear(): void {
    this.items = [];
    this.persist();
    this.render();
    this.emit();
  }

  getAll(): SavedGradient[] {
    return [...this.items];
  }

  getCount(): number {
    return this.items.length;
  }

  canSave(): boolean {
    return this.items.length < MAX_PALETTE_SIZE;
  }

  exportJSON(): void {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      count: this.items.length,
      gradients: this.items.map((g) => ({
        id: g.id,
        color1: g.color1,
        color2: g.color2,
        angle: g.angle,
        type: g.type,
        css: GradientEditor.generateCSS(g),
        createdAt: new Date(g.createdAt).toISOString()
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gradient-palette-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  static generateInspiration(state: GradientState): InspirationItem[] {
    const hsl1 = hexToHsl(state.color1);
    const hsl2 = hexToHsl(state.color2);

    const rotateHue = (h: number, deg: number): number => normalizeHue(h + deg);
    const rotateAngle = (a: number, deg: number): number => normalizeHue(a + deg);

    const clampL = (l: number): number => Math.max(15, Math.min(85, l));
    const clampS = (s: number): number => Math.max(20, Math.min(95, s));

    const complementary: GradientState = {
      color1: hslToHex(rotateHue(hsl1.h, 180), clampS(hsl1.s + 10), clampL(hsl1.l - 5)),
      color2: hslToHex(rotateHue(hsl2.h, 180), clampS(hsl2.s + 10), clampL(hsl2.l + 8)),
      angle: rotateAngle(state.angle, 45),
      type: state.type
    };

    const analogous: GradientState = {
      color1: hslToHex(rotateHue(hsl1.h, 30), clampS(hsl1.s - 5), clampL(hsl1.l + 10)),
      color2: hslToHex(rotateHue(hsl2.h, -30), clampS(hsl2.s - 5), clampL(hsl2.l - 8)),
      angle: state.angle,
      type: state.type
    };

    const triadic: GradientState = {
      color1: hslToHex(rotateHue(hsl1.h, 120), clampS(hsl1.s), clampL(hsl1.l + 5)),
      color2: hslToHex(rotateHue(hsl2.h, -120), clampS(hsl2.s), clampL(hsl2.l - 3)),
      angle: rotateAngle(state.angle, 90),
      type: state.type === 'linear' ? 'radial' : 'linear'
    };

    return [
      { name: '互补配色', tag: 'Complementary', state: complementary },
      { name: '邻近配色', tag: 'Analogous', state: analogous },
      { name: '三角配色', tag: 'Triadic', state: triadic }
    ];
  }

  private render(): void {
    const count = this.items.length;
    const canSave = this.canSave();

    if (count === 0) {
      this.container.innerHTML = `
        <div class="palette-section" id="palette-section">
          <div class="section-header">
            <div class="section-title-group">
              <h3 class="section-title">调色板</h3>
              <span class="section-subtitle">0 / ${MAX_PALETTE_SIZE}</span>
            </div>
            <div class="section-actions">
              <button class="btn btn-outline" id="palette-save" disabled>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17,21 17,13 7,13 7,21" />
                  <polyline points="7,3 7,8 15,8" />
                </svg>
                保存当前
              </button>
              <button class="btn btn-secondary" id="palette-export" disabled>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                导出JSON
              </button>
            </div>
          </div>
          <div class="palette-empty">
            <svg class="palette-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="13.5" cy="6.5" r="2.5" />
              <circle cx="19" cy="13" r="2.5" />
              <circle cx="6" cy="12" r="2.5" />
              <circle cx="10" cy="20" r="2.5" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 2-.1 3-.4.3-.1.4-.5.2-.8l-1.3-2.5c-.2-.3-.5-.5-.9-.5H9c-3.3 0-6-2.7-6-6s2.7-6 6-6h7.5c2.5 0 4.5 2 4.5 4.5 0 .8-.2 1.6-.6 2.3" />
            </svg>
            <div class="palette-empty-text">调色板为空</div>
            <div class="palette-empty-hint">点击「保存当前」将渐变添加到调色板</div>
          </div>
        </div>
      `;
    } else {
      const cardsHTML = this.items.map((item) => {
        const css = GradientEditor.generateCSS(item);
        return `
          <div class="palette-card" data-id="${item.id}">
            <button class="palette-delete" data-delete="${item.id}" aria-label="删除">×</button>
            <div class="palette-thumb" style="background: ${css}"></div>
            <div class="palette-card-info">
              <div class="palette-card-label">${item.type === 'linear' ? `${item.angle}°` : 'Radial'}</div>
              <div class="palette-card-colors">
                <div class="palette-card-color" style="background: ${item.color1}"></div>
                <div class="palette-card-color" style="background: ${item.color2}"></div>
                <span class="palette-card-arrow">→</span>
              </div>
            </div>
          </div>
        `;
      }).join('');

      this.container.innerHTML = `
        <div class="palette-section" id="palette-section">
          <div class="section-header">
            <div class="section-title-group">
              <h3 class="section-title">调色板</h3>
              <span class="section-subtitle">${count} / ${MAX_PALETTE_SIZE}</span>
            </div>
            <div class="section-actions">
              <button class="btn btn-primary" id="palette-save" ${canSave ? '' : 'disabled'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17,21 17,13 7,13 7,21" />
                  <polyline points="7,3 7,8 15,8" />
                </svg>
                保存当前
              </button>
              <button class="btn btn-secondary" id="palette-clear">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3,6 5,6 21,6" />
                  <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
                清空
              </button>
              <button class="btn btn-secondary" id="palette-export">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                导出JSON
              </button>
            </div>
          </div>
          <div class="palette-grid">
            ${cardsHTML}
          </div>
        </div>
      `;
    }

    this.bindEvents();
  }

  private bindEvents(): void {
    const saveBtn = this.container.querySelector('#palette-save') as HTMLButtonElement | null;
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.onSaveRequest?.());
    }

    const clearBtn = this.container.querySelector('#palette-clear') as HTMLButtonElement | null;
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (this.items.length > 0 && confirm('确定清空调色板中的所有渐变色吗？')) {
          this.clear();
        }
      });
    }

    const exportBtn = this.container.querySelector('#palette-export') as HTMLButtonElement | null;
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportJSON());
    }

    const cards = this.container.querySelectorAll('.palette-card');
    cards.forEach((card) => {
      card.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-delete]')) return;
        const id = card.getAttribute('data-id');
        const item = this.items.find((i) => i.id === id);
        if (item) {
          this.onApply?.(item);
        }
      });
    });

    const deleteBtns = this.container.querySelectorAll('[data-delete]');
    deleteBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).getAttribute('data-delete');
        if (id) this.remove(id);
      });
    });
  }

  subscribe(listener: PaletteListener): () => void {
    this.listeners.add(listener);
    listener([...this.items]);
    return () => this.listeners.delete(listener);
  }
}

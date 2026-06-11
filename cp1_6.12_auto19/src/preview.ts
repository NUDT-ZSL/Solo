import type { GradientState } from './editor';
import { GradientEditor } from './editor';
import type { InspirationItem } from './palette';
import { PaletteManager } from './palette';

export class PreviewManager {
  private container: HTMLElement;
  private paletteContainer: HTMLElement;
  private currentState: GradientState;
  private inspiration: InspirationItem[] = [];
  private onInspirationApply?: (state: GradientState) => void;
  private onFullscreenOpen?: () => void;
  private clipboardToastTimer: number | null = null;

  constructor(container: HTMLElement, paletteContainer: HTMLElement, initialState: GradientState) {
    this.container = container;
    this.paletteContainer = paletteContainer;
    this.currentState = initialState;
    this.inspiration = PaletteManager.generateInspiration(initialState);
    this.render();
    this.bindEvents();
  }

  setInspirationApplyHandler(handler: (state: GradientState) => void): void {
    this.onInspirationApply = handler;
  }

  setFullscreenOpenHandler(handler: () => void): void {
    this.onFullscreenOpen = handler;
  }

  update(state: GradientState): void {
    this.currentState = state;
    this.inspiration = PaletteManager.generateInspiration(state);
    this.updatePreview();
    this.updateCodeBlock();
    this.updateInspiration();
  }

  private render(): void {
    const css = GradientEditor.generateCSS(this.currentState);
    const bgCSS = GradientEditor.toBackgroundCSS(this.currentState);

    const typeLabel = this.currentState.type === 'linear' ? 'Linear' : 'Radial';

    const inspirationHTML = this.inspiration.map((item, idx) => {
      const itemCSS = GradientEditor.generateCSS(item.state);
      return `
        <div class="inspiration-card" data-idx="${idx}">
          <div class="inspiration-thumb" style="background: ${itemCSS}">
            <span class="inspiration-tag">${item.tag}</span>
            <button class="inspiration-apply" data-apply-idx="${idx}">
              应用
            </button>
          </div>
          <div class="inspiration-info">
            <div class="inspiration-name">${item.name}</div>
            <div class="inspiration-colors">
              <span class="inspiration-color">${item.state.color1.toUpperCase()}</span>
              <span class="inspiration-color">${item.state.color2.toUpperCase()}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="preview-bar-section">
        <div class="preview-bar" id="preview-bar" style="background: ${css}" title="点击进入全屏预览">
          <div class="preview-bar-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
              <path d="M15 3h6v6" />
              <path d="M9 21H3v-6" />
              <path d="M21 3l-7 7" />
              <path d="M3 21l7-7" />
            </svg>
            全屏预览
          </div>
          <div class="preview-bar-label">${typeLabel} · ${this.currentState.type === 'linear' ? this.currentState.angle + '°' : 'Circle'}</div>
        </div>
        <div class="action-row">
          <button class="btn btn-primary" id="copy-css-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            复制CSS代码
            <div class="copy-toast" id="copy-toast">已复制</div>
          </button>
        </div>
      </div>

      <div class="code-card">
        <div class="code-card-header">
          <span class="code-card-title">CSS 代码</span>
        </div>
        <pre class="code-block" id="css-code-block">${bgCSS}</pre>
      </div>

      <div id="palette-wrapper"></div>

      <div class="inspiration-section">
        <div class="section-header">
          <div class="section-title-group">
            <h3 class="section-title">配色灵感</h3>
            <span class="section-subtitle">基于当前颜色自动生成</span>
          </div>
        </div>
        <div class="inspiration-grid" id="inspiration-grid">
          ${inspirationHTML}
        </div>
      </div>
    `;

    const paletteWrapper = this.container.querySelector('#palette-wrapper') as HTMLElement;
    if (paletteWrapper) {
      paletteWrapper.appendChild(this.paletteContainer);
    }
  }

  private bindEvents(): void {
    const previewBar = this.container.querySelector('#preview-bar') as HTMLElement | null;
    if (previewBar) {
      previewBar.addEventListener('click', () => this.onFullscreenOpen?.());
    }

    const copyBtn = this.container.querySelector('#copy-css-btn') as HTMLButtonElement | null;
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyCSS());
    }

    const applyBtns = this.container.querySelectorAll('[data-apply-idx]');
    applyBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number((btn as HTMLElement).getAttribute('data-apply-idx'));
        const item = this.inspiration[idx];
        if (item) {
          this.onInspirationApply?.(item.state);
        }
      });
    });

    const inspCards = this.container.querySelectorAll('.inspiration-card');
    inspCards.forEach((card) => {
      card.addEventListener('click', () => {
        const idx = Number((card as HTMLElement).getAttribute('data-idx'));
        const item = this.inspiration[idx];
        if (item) {
          this.onInspirationApply?.(item.state);
        }
      });
    });
  }

  private updatePreview(): void {
    const bar = this.container.querySelector('#preview-bar') as HTMLElement | null;
    const label = this.container.querySelector('.preview-bar-label') as HTMLElement | null;
    if (bar) {
      bar.style.background = GradientEditor.generateCSS(this.currentState);
    }
    if (label) {
      const typeLabel = this.currentState.type === 'linear' ? 'Linear' : 'Radial';
      label.textContent = `${typeLabel} · ${this.currentState.type === 'linear' ? this.currentState.angle + '°' : 'Circle'}`;
    }
  }

  private updateCodeBlock(): void {
    const block = this.container.querySelector('#css-code-block') as HTMLElement | null;
    if (block) {
      block.textContent = GradientEditor.toBackgroundCSS(this.currentState);
    }
  }

  private updateInspiration(): void {
    const grid = this.container.querySelector('#inspiration-grid') as HTMLElement | null;
    if (!grid) return;

    const cards = grid.querySelectorAll('.inspiration-card');
    cards.forEach((card, idx) => {
      const item = this.inspiration[idx];
      if (!item) return;
      const thumb = card.querySelector('.inspiration-thumb') as HTMLElement | null;
      const colors = card.querySelectorAll('.inspiration-color');
      if (thumb) {
        thumb.style.background = GradientEditor.generateCSS(item.state);
      }
      if (colors[0]) colors[0].textContent = item.state.color1.toUpperCase();
      if (colors[1]) colors[1].textContent = item.state.color2.toUpperCase();
    });
  }

  private copyCSS(): void {
    const css = GradientEditor.toBackgroundCSS(this.currentState);
    const toast = this.container.querySelector('#copy-toast') as HTMLElement | null;

    const fallbackCopy = (): void => {
      try {
        const ta = document.createElement('textarea');
        ta.value = css;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '-9999px';
        ta.style.opacity = '0';
        ta.style.pointerEvents = 'none';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        let ok = false;
        try {
          ok = document.execCommand('copy');
        } catch {
          ok = false;
        }
        document.body.removeChild(ta);
        if (ok) this.showToast(toast);
      } catch {
        this.showToast(toast);
      }
    };

    requestAnimationFrame(() => {
      if (navigator.clipboard && window.isSecureContext) {
        let done = false;
        const timeoutId = window.setTimeout(() => {
          if (!done) {
            done = true;
            fallbackCopy();
          }
        }, 300);

        navigator.clipboard
          .writeText(css)
          .then(() => {
            if (!done) {
              done = true;
              window.clearTimeout(timeoutId);
              this.showToast(toast);
            }
          })
          .catch(() => {
            if (!done) {
              done = true;
              window.clearTimeout(timeoutId);
              fallbackCopy();
            }
          });
      } else {
        fallbackCopy();
      }
    });
  }

  private showToast(toast: HTMLElement | null): void {
    if (!toast) return;
    if (this.clipboardToastTimer) {
      window.clearTimeout(this.clipboardToastTimer);
    }
    toast.classList.add('show');
    this.clipboardToastTimer = window.setTimeout(() => {
      toast.classList.remove('show');
      this.clipboardToastTimer = null;
    }, 1500);
  }
}

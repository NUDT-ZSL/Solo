import { GradientEditor, type GradientState } from './editor';
import { PaletteManager } from './palette';
import { PreviewManager } from './preview';

interface AppState {
  current: GradientState;
}

class App {
  private editor: GradientEditor;
  private palette: PaletteManager;
  private preview: PreviewManager;
  private state: AppState;

  private _clockTimer: number | null = null;
  private fullscreenOpen: boolean = false;

  constructor() {
    const editorEl = document.getElementById('editor-content');
    const panelEl = document.getElementById('editor-panel');
    const toggleEl = document.getElementById('mobile-toggle');
    const previewEl = document.getElementById('preview-root');
    const overlayEl = document.getElementById('fullscreen-overlay');

    if (!editorEl || !previewEl || !overlayEl) {
      throw new Error('Failed to locate app mount points');
    }

    this.state = {
      current: {
        color1: '#6366f1',
        color2: '#00d4ff',
        angle: 135,
        type: 'linear'
      }
    };

    this.editor = new GradientEditor(
      { container: editorEl, panel: panelEl, toggle: toggleEl },
      this.state.current
    );
    this.palette = new PaletteManager(document.createElement('div'));
    this.preview = new PreviewManager(previewEl, (this.palette as unknown as { container: HTMLElement }).container, this.state.current);

    this.setupBindings();
    this.setupFullscreen();
    this.startClock();
    this.setupCleanup();
  }

  private setupCleanup(): void {
    window.addEventListener('beforeunload', () => {
      if (this._clockTimer !== null) {
        window.clearInterval(this._clockTimer);
        this._clockTimer = null;
      }
    });
  }

  private setupBindings(): void {
    this.editor.subscribe((state) => {
      this.state.current = state;
      this.preview.update(state);
    });

    this.palette.setApplyHandler((state) => {
      this.editor.applyPalette(state);
    });

    this.palette.setSaveRequestHandler(() => {
      const saved = this.palette.save(this.state.current);
      if (!saved) {
        this.showFloatingNotice('调色板已满（最多20个）', true);
      } else {
        this.showFloatingNotice('已保存到调色板', false);
      }
    });

    this.preview.setInspirationApplyHandler((state) => {
      this.editor.applyPalette(state);
    });

    this.preview.setFullscreenOpenHandler(() => {
      this.openFullscreen();
    });
  }

  private setupFullscreen(): void {
    const overlay = document.getElementById('fullscreen-overlay') as HTMLElement;
    const closeBtn = document.getElementById('fullscreen-close') as HTMLElement;

    closeBtn.addEventListener('click', () => this.closeFullscreen());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.fullscreenOpen) {
        this.closeFullscreen();
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeFullscreen();
      }
    });
  }

  private openFullscreen(): void {
    const overlay = document.getElementById('fullscreen-overlay') as HTMLElement;
    const css = GradientEditor.generateCSS(this.state.current);
    overlay.style.background = css;
    overlay.classList.remove('hidden');
    this.fullscreenOpen = true;
  }

  private closeFullscreen(): void {
    const overlay = document.getElementById('fullscreen-overlay') as HTMLElement;
    overlay.classList.add('hidden');
    this.fullscreenOpen = false;
  }

  private startClock(): void {
    const timeEl = document.getElementById('clock-time') as HTMLElement | null;
    const dateEl = document.getElementById('clock-date') as HTMLElement | null;

    const tick = () => {
      const now = new Date();
      if (timeEl) {
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        timeEl.textContent = `${hh}:${mm}:${ss}`;
      }
      if (dateEl) {
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        const w = weekDays[now.getDay()];
        dateEl.textContent = `${year}年${month}月${day}日 · 星期${w}`;
      }
    };

    tick();
    this._clockTimer = window.setInterval(tick, 1000);
  }

  private showFloatingNotice(text: string, isError: boolean): void {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      padding: 10px 22px;
      border-radius: 12px;
      font-family: var(--font-display);
      font-size: 13px;
      font-weight: 600;
      z-index: 200;
      opacity: 0;
      transition: all 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
      pointer-events: none;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid ${isError ? 'rgba(255, 85, 119, 0.35)' : 'rgba(0, 212, 255, 0.35)'};
      background: ${isError ? 'rgba(80, 20, 35, 0.85)' : 'rgba(20, 50, 80, 0.85)'};
      color: ${isError ? '#ff88aa' : '#00d4ff'};
      box-shadow: 0 8px 28px rgba(0,0,0,0.4);
    `;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(-10px)';
      setTimeout(() => el.remove(), 300);
    }, 1800);
  }
}

function bootstrap(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App());
  } else {
    new App();
  }
}

bootstrap();

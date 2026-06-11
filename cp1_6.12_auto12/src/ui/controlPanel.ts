/**
 * ============================================================
 *  src/ui/controlPanel.ts — 右下角控制面板
 * ============================================================
 *
 *  【职责】
 *    1. 模式切换按钮：俯视总览 / 自由漫游（发出 onModeChange 事件）
 *    2. 设备搜索输入框：前缀匹配（发出 onSearch 事件，debounce 120ms）
 *    3. 重置视角按钮（发出 onResetView 事件）
 *    4. 响应式断点：1920×1080 / 1366×768 / <768px
 *
 *  【上游调用】
 *    — main.ts:  new ControlPanel(container)
 *                .onModeChange / .onSearch / .onResetView 订阅
 *                .setMode() / .clearSearch()（被 main.ts 调用）
 *
 *  【下游依赖】
 *    — 无外部模块，仅操作 DOM + 发出 RxJS Subject 事件
 *
 *  【数据流向】
 *    用户点击"自由漫游" ──► onModeChange.next('free')  ──► main.ts 切换相机状态
 *    用户输入搜索关键字  ──► onSearch.next(term)       ──► deviceRenderer.setSearchTerm()
 *    用户点击"重置视角"  ──► onResetView.next()        ──► main.ts.resetToOverview()
 * ============================================================
 */

import { Subject, Subscription } from 'rxjs';

export type ViewMode = 'overview' | 'free';

export class ControlPanel {
  private container: HTMLElement;
  private panel: HTMLDivElement;
  private searchInput: HTMLInputElement;
  private overviewBtn: HTMLButtonElement;
  private freeBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private subscriptions = new Subscription();
  private currentMode: ViewMode = 'overview';

  public readonly onModeChange = new Subject<ViewMode>();
  public readonly onSearch = new Subject<string>();
  public readonly onResetView = new Subject<void>();

  constructor(parent: HTMLElement) {
    this.container = parent;
    this.injectStyles();

    this.panel = this.createPanel();
    this.container.appendChild(this.panel);

    this.searchInput = this.panel.querySelector('#ctrl-search') as HTMLInputElement;
    this.overviewBtn = this.panel.querySelector('#btn-overview') as HTMLButtonElement;
    this.freeBtn = this.panel.querySelector('#btn-free') as HTMLButtonElement;
    this.resetBtn = this.panel.querySelector('#btn-reset') as HTMLButtonElement;

    this.bindEvents();
  }

  private injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .control-panel {
        position: absolute;
        bottom: 16px;
        right: 16px;
        z-index: 100;
        padding: 16px;
        background: rgba(30, 41, 59, 0.75);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(100, 150, 255, 0.2);
        border-radius: 14px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 260px;
      }
      .cp-title {
        font-size: 11px;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        margin-bottom: 2px;
      }
      .cp-search-wrap {
        position: relative;
      }
      .cp-search-icon {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        color: #64748b;
        pointer-events: none;
      }
      .cp-search {
        width: 100%;
        padding: 9px 12px 9px 36px;
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(100, 150, 255, 0.2);
        border-radius: 8px;
        color: #e2e8f0;
        font-size: 13px;
        font-family: 'SF Mono', 'Consolas', monospace;
        outline: none;
        transition: all 0.2s;
        box-sizing: border-box;
      }
      .cp-search::placeholder {
        color: #475569;
      }
      .cp-search:focus {
        border-color: rgba(96, 165, 250, 0.6);
        box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.12);
        background: rgba(15, 23, 42, 0.85);
      }
      .cp-mode-btns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .cp-btn {
        padding: 8px 12px;
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(100, 150, 255, 0.2);
        border-radius: 8px;
        color: #cbd5e1;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s;
      }
      .cp-btn:hover {
        background: rgba(15, 23, 42, 0.85);
        border-color: rgba(100, 150, 255, 0.4);
        color: #e2e8f0;
      }
      .cp-btn.active {
        background: rgba(96, 165, 250, 0.15);
        border-color: rgba(96, 165, 250, 0.5);
        color: #60a5fa;
        box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.2);
      }
      .cp-btn-reset {
        background: rgba(255, 136, 0, 0.08);
        border-color: rgba(255, 136, 0, 0.3);
        color: #ff8800;
      }
      .cp-btn-reset:hover {
        background: rgba(255, 136, 0, 0.18);
        border-color: rgba(255, 136, 0, 0.5);
      }
      .cp-hint {
        padding-top: 8px;
        border-top: 1px solid rgba(100, 150, 255, 0.12);
        font-size: 11px;
        color: #475569;
        line-height: 1.7;
      }
      .cp-hint kbd {
        display: inline-block;
        padding: 1px 5px;
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(100, 150, 255, 0.25);
        border-radius: 4px;
        font-family: 'SF Mono', 'Consolas', monospace;
        font-size: 10px;
        color: #94a3b8;
        margin: 0 2px;
      }

      /* ===== 分辨率断点：1366 x 768 ===== */
      @media (max-width: 1440px) {
        .control-panel {
          padding: 12px;
          gap: 10px;
          min-width: 240px;
          bottom: 12px;
          right: 12px;
          border-radius: 12px;
        }
        .cp-search { padding: 7px 10px 7px 32px; font-size: 12px; }
        .cp-btn { padding: 7px 10px; font-size: 11px; }
        .cp-hint { font-size: 10px; line-height: 1.6; }
        .cp-hint kbd { font-size: 9px; padding: 1px 4px; }
      }

      /* ===== 分辨率断点：1366 x 768 专用 ===== */
      @media (max-width: 1366px) {
        .control-panel {
          padding: 10px;
          gap: 8px;
          min-width: 220px;
          bottom: 10px;
          right: 10px;
          border-radius: 10px;
        }
        .cp-title { font-size: 10px; letter-spacing: 1px; }
        .cp-search { padding: 6px 10px 6px 30px; font-size: 11px; }
        .cp-btn { padding: 6px 8px; font-size: 11px; }
        .cp-hint { font-size: 9px; line-height: 1.55; padding-top: 6px; }
        .cp-hint kbd { font-size: 9px; padding: 0 3px; }
      }

      /* ===== 分辨率断点：<768px 移动端 ===== */
      @media (max-width: 768px) {
        .control-panel {
          min-width: auto;
          width: calc(100% - 32px);
          left: 16px;
          right: 16px;
          bottom: 10px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'control-panel';
    panel.innerHTML = `
      <div>
        <div class="cp-title">设备搜索</div>
        <div class="cp-search-wrap">
          <svg class="cp-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="ctrl-search" class="cp-search" placeholder="输入 ID 或名称前缀..." autocomplete="off" spellcheck="false">
        </div>
      </div>

      <div>
        <div class="cp-title">视图模式</div>
        <div class="cp-mode-btns">
          <button class="cp-btn active" id="btn-overview">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            俯视总览
          </button>
          <button class="cp-btn" id="btn-free">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            自由漫游
          </button>
        </div>
      </div>

      <button class="cp-btn cp-btn-reset" id="btn-reset">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
        重置视角
      </button>

      <div class="cp-hint">
        <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移动</div>
        <div><kbd>Q</kbd><kbd>E</kbd> 下降 / 上升</div>
        <div>鼠标左键拖拽 旋转视角</div>
        <div>双击设备 聚焦查看</div>
      </div>
    `;
    return panel;
  }

  private bindEvents() {
    this.overviewBtn.addEventListener('click', () => {
      this.setMode('overview');
    });

    this.freeBtn.addEventListener('click', () => {
      this.setMode('free');
    });

    this.resetBtn.addEventListener('click', () => {
      this.onResetView.next();
    });

    let searchTimer: ReturnType<typeof setTimeout>;
    this.searchInput.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        this.onSearch.next(value);
      }, 120);
    });

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        (e.target as HTMLInputElement).value = '';
        this.onSearch.next('');
        (e.target as HTMLInputElement).blur();
      }
    });
  }

  public setMode(mode: ViewMode) {
    this.currentMode = mode;
    if (mode === 'overview') {
      this.overviewBtn.classList.add('active');
      this.freeBtn.classList.remove('active');
    } else {
      this.freeBtn.classList.add('active');
      this.overviewBtn.classList.remove('active');
    }
    this.onModeChange.next(mode);
  }

  public clearSearch() {
    this.searchInput.value = '';
    this.onSearch.next('');
  }

  public dispose() {
    this.subscriptions.unsubscribe();
  }
}

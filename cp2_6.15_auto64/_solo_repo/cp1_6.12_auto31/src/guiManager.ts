import type { Artifact, DataStore } from './dataStore';

export interface GUIManagerOptions {
  dataStore: DataStore;
  onSelectArtifact: (index: number) => void;
  onTogglePanel?: (expanded: boolean) => void;
}

const PANEL_ICON_MAP: Record<string, string> = {
  vase: '◐',
  ding: '◈',
  jade: '◉',
  sword: '†'
};

const TEXT_FADE_CLASS = 'fade-in';
const PANEL_COLLAPSED_CLASS = 'panel-collapsed';
const ITEM_ACTIVE_CLASS = 'active';

export class GUIManager {
  private readonly dataStore: DataStore;
  private readonly onSelectArtifact: (index: number) => void;
  private readonly onTogglePanel?: (expanded: boolean) => void;

  private readonly overlayEl: HTMLElement;
  private readonly overlayNameEl: HTMLElement;
  private readonly progressBarEl: HTMLElement;
  private readonly progressPercentEl: HTMLElement;

  private readonly panelEl: HTMLElement;
  private readonly panelHeaderEl: HTMLElement;
  private readonly panelToggleBtn: HTMLButtonElement;
  private readonly panelIconEl: HTMLElement;
  private readonly panelNameEl: HTMLElement;
  private readonly panelDynastyEl: HTMLElement;
  private readonly panelLocationEl: HTMLElement;
  private readonly panelDescriptionEl: HTMLElement;

  private readonly listContainerEl: HTMLElement;
  private readonly listItems: HTMLElement[];

  private isPanelExpanded: boolean;
  private lastAnimationAt: number;
  private readonly animationCooldown: number;

  constructor(options: GUIManagerOptions) {
    this.dataStore = options.dataStore;
    this.onSelectArtifact = options.onSelectArtifact;
    this.onTogglePanel = options.onTogglePanel;

    this.overlayEl = GUIManager.requireById('loading-overlay');
    this.overlayNameEl = GUIManager.requireById('loading-artifact-name');
    this.progressBarEl = GUIManager.requireById('progress-bar');
    this.progressPercentEl = GUIManager.requireById('loading-percent');

    this.panelEl = GUIManager.requireById('info-panel');
    this.panelHeaderEl = GUIManager.requireById('panel-header');
    this.panelToggleBtn = GUIManager.requireById<HTMLButtonElement>('panel-toggle-btn');
    this.panelIconEl = GUIManager.requireById('panel-icon');
    this.panelNameEl = GUIManager.requireById('panel-artifact-name');
    this.panelDynastyEl = GUIManager.requireById('panel-artifact-dynasty');
    this.panelLocationEl = GUIManager.requireById('panel-artifact-location');
    this.panelDescriptionEl = GUIManager.requireById('panel-artifact-description');

    this.listContainerEl = GUIManager.requireById('artifact-list');

    this.isPanelExpanded = false;
    this.listItems = [];
    this.lastAnimationAt = 0;
    this.animationCooldown = 320;

    this.buildList();
    this.bindEvents();
    this.updateContent(this.dataStore.getCurrentArtifact());
    this.highlightListItem(this.dataStore.getCurrentIndex());
    this.setPanelCollapsedState(false, false);
  }

  updateProgress(percent: number, name: string): void {
    const safe = Math.max(0, Math.min(100, Math.round(percent)));
    this.progressBarEl.style.width = `${safe}%`;
    this.progressPercentEl.textContent = `${safe}%`;
    this.overlayNameEl.textContent = name;
  }

  showProgress(): void {
    this.overlayEl.classList.remove('hidden');
  }

  hideProgress(): void {
    requestAnimationFrame(() => {
      this.overlayEl.classList.add('hidden');
    });
  }

  updateContent(artifact: Artifact): void {
    const now = performance.now();
    const animate = now - this.lastAnimationAt > this.animationCooldown;
    this.lastAnimationAt = now;

    const nameNodes = [this.panelNameEl, this.panelDynastyEl, this.panelLocationEl, this.panelDescriptionEl];
    if (animate) {
      for (const el of nameNodes) {
        el.classList.remove(TEXT_FADE_CLASS);
        void el.offsetWidth;
      }
    }

    this.panelIconEl.textContent = PANEL_ICON_MAP[artifact.placeholderType] ?? '◈';
    this.panelNameEl.textContent = artifact.name;
    this.panelDynastyEl.textContent = artifact.dynasty;
    this.panelLocationEl.textContent = artifact.location;
    this.panelDescriptionEl.textContent = artifact.description;

    if (animate) {
      const delays = [0, 60, 120, 200];
      nameNodes.forEach((el, i) => {
        setTimeout(() => el.classList.add(TEXT_FADE_CLASS), delays[i]);
      });
    }
  }

  togglePanel(force?: boolean): void {
    const next = typeof force === 'boolean' ? force : !this.isPanelExpanded;
    this.setPanelCollapsedState(next);
    this.onTogglePanel?.(next);
  }

  highlightListItem(index: number): void {
    this.listItems.forEach((el, i) => {
      el.classList.toggle(ITEM_ACTIVE_CLASS, i === index);
    });
  }

  scrollListItemIntoView(index: number): void {
    const item = this.listItems[index];
    if (!item) return;
    if (typeof item.scrollIntoView === 'function') {
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }

  private buildList(): void {
    this.listContainerEl.innerHTML = '';
    const artifacts = this.dataStore.getAllArtifacts();
    artifacts.forEach((artifact, index) => {
      const item = document.createElement('div');
      item.className = 'artifact-item';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('data-index', String(index));
      item.innerHTML = `
        <span class="item-index">${String(index + 1).padStart(2, '0')}</span>
        <div class="item-info">
          <span class="item-name"></span>
          <span class="item-dynasty"></span>
        </div>
      `;
      const nameEl = item.querySelector<HTMLElement>('.item-name');
      const dynastyEl = item.querySelector<HTMLElement>('.item-dynasty');
      if (nameEl) nameEl.textContent = artifact.shortName;
      if (dynastyEl) dynastyEl.textContent = GUIManager.shortenDynasty(artifact.dynasty);

      this.listContainerEl.appendChild(item);
      this.listItems.push(item);
    });
  }

  private bindEvents(): void {
    this.listItems.forEach((el, index) => {
      el.addEventListener('click', () => {
        if (index === this.dataStore.getCurrentIndex()) return;
        this.onSelectArtifact(index);
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (index === this.dataStore.getCurrentIndex()) return;
          this.onSelectArtifact(index);
        }
      });
    });

    this.panelHeaderEl.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('#panel-toggle-btn')) return;
      this.togglePanel();
    });
    this.panelToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePanel();
    });
  }

  private setPanelCollapsedState(expanded: boolean, withTransition: boolean = true): void {
    this.isPanelExpanded = expanded;
    if (!withTransition) {
      this.panelEl.style.transition = 'none';
      requestAnimationFrame(() => {
        this.panelEl.classList.toggle(PANEL_COLLAPSED_CLASS, !expanded);
        requestAnimationFrame(() => {
          this.panelEl.style.transition = '';
        });
      });
    } else {
      this.panelEl.classList.toggle(PANEL_COLLAPSED_CLASS, !expanded);
    }
  }

  private static requireById<T extends HTMLElement = HTMLElement>(id: string): T {
    const el = document.getElementById(id) as T | null;
    if (!el) {
      throw new Error(`[GUIManager] 找不到 DOM 元素: #${id}`);
    }
    return el;
  }

  private static shortenDynasty(dynasty: string): string {
    if (dynasty.length <= 16) return dynasty;
    const m = dynasty.match(/([^（(]+)/);
    return m ? m[1].trim() : dynasty.slice(0, 14) + '…';
  }
}

import { GravityEngine, GravitySource } from './gravityEngine';

export type LaunchCallback = () => void;
export type ResetCallback = () => void;
export type SourceDeleteCallback = (sourceId: string) => void;

export class UIController {
  private engine: GravityEngine;
  private launchBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private sourceListEl: HTMLDivElement;
  private modalOverlay: HTMLDivElement;
  private modalCancelBtn: HTMLButtonElement;
  private modalConfirmBtn: HTMLButtonElement;
  private massInput: HTMLInputElement;

  private pendingSourcePosition: { x: number; y: number } | null = null;

  private onLaunch: LaunchCallback | null = null;
  private onReset: ResetCallback | null = null;
  private onSourceDelete: SourceDeleteCallback | null = null;
  private onSourceAdded: (() => void) | null = null;

  constructor(engine: GravityEngine) {
    this.engine = engine;

    const launchBtn = document.getElementById('launch-btn');
    const resetBtn = document.getElementById('reset-btn');
    const sourceListEl = document.getElementById('source-list');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalCancelBtn = document.getElementById('modal-cancel');
    const modalConfirmBtn = document.getElementById('modal-confirm');
    const massInput = document.getElementById('mass-input');

    if (!launchBtn || !resetBtn || !sourceListEl ||
        !modalOverlay || !modalCancelBtn || !modalConfirmBtn || !massInput) {
      throw new Error('UIController: required DOM elements not found');
    }

    this.launchBtn = launchBtn as HTMLButtonElement;
    this.resetBtn = resetBtn as HTMLButtonElement;
    this.sourceListEl = sourceListEl as HTMLDivElement;
    this.modalOverlay = modalOverlay as HTMLDivElement;
    this.modalCancelBtn = modalCancelBtn as HTMLButtonElement;
    this.modalConfirmBtn = modalConfirmBtn as HTMLButtonElement;
    this.massInput = massInput as HTMLInputElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.launchBtn.addEventListener('click', () => {
      if (this.onLaunch) this.onLaunch();
    });

    this.resetBtn.addEventListener('click', () => {
      if (this.onReset) this.onReset();
    });

    this.modalCancelBtn.addEventListener('click', () => {
      this.hideModal();
    });

    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) this.hideModal();
    });

    this.modalConfirmBtn.addEventListener('click', () => {
      this.confirmAddSource();
    });

    this.massInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.confirmAddSource();
      if (e.key === 'Escape') this.hideModal();
    });
  }

  private confirmAddSource(): void {
    let mass = parseFloat(this.massInput.value);
    if (isNaN(mass)) mass = 1.0;
    mass = Math.max(0.1, Math.min(10.0, mass));

    if (this.pendingSourcePosition) {
      this.engine.addSource(this.pendingSourcePosition.x, this.pendingSourcePosition.y, mass);
      if (this.onSourceAdded) this.onSourceAdded();
    }
    this.hideModal();
  }

  public showAddSourceModal(x: number, y: number): void {
    this.pendingSourcePosition = { x, y };
    this.massInput.value = '1.0';
    this.modalOverlay.classList.add('active');
    setTimeout(() => {
      this.massInput.focus();
      this.massInput.select();
    }, 30);
  }

  private hideModal(): void {
    this.modalOverlay.classList.remove('active');
    this.pendingSourcePosition = null;
  }

  public refreshSourceList(): void {
    this.sourceListEl.innerHTML = '';
    const sources = this.engine.getSources();
    for (const source of sources) {
      const item = this.createSourceItem(source);
      this.sourceListEl.appendChild(item);
    }
  }

  private createSourceItem(source: GravitySource): HTMLElement {
    const item = document.createElement('div');
    item.className = 'source-item';

    const info = document.createElement('div');
    info.className = 'source-info';

    const massEl = document.createElement('div');
    massEl.className = 'source-mass';
    massEl.textContent = `质量: ${source.mass.toFixed(1)}`;

    const coordEl = document.createElement('div');
    coordEl.className = 'source-coord';
    coordEl.textContent = `坐标: (${Math.round(source.x)}, ${Math.round(source.y)})`;

    info.appendChild(massEl);
    info.appendChild(coordEl);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.setAttribute('aria-label', '删除引力源');
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', () => {
      this.engine.removeSource(source.id);
      if (this.onSourceDelete) this.onSourceDelete(source.id);
      if (this.onSourceAdded) this.onSourceAdded();
    });

    item.appendChild(info);
    item.appendChild(deleteBtn);
    return item;
  }

  public setOnLaunch(cb: LaunchCallback): void {
    this.onLaunch = cb;
  }

  public setOnReset(cb: ResetCallback): void {
    this.onReset = cb;
  }

  public setOnSourceDelete(cb: SourceDeleteCallback): void {
    this.onSourceDelete = cb;
  }

  public setOnSourceAdded(cb: () => void): void {
    this.onSourceAdded = cb;
  }
}

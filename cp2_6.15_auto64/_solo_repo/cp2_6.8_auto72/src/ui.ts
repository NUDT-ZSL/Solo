import type { PetStats, PetAction } from './pet';

export interface ActionButton {
  element: HTMLButtonElement;
  cooldown: number;
  maxCooldown: number;
  action: PetAction;
  overlay: HTMLDivElement | null;
}

export class UIManager {
  private barHunger: HTMLElement;
  private barHappiness: HTMLElement;
  private barEnergy: HTMLElement;
  private barClean: HTMLElement;
  private labelHunger: HTMLElement;
  private labelHappiness: HTMLElement;
  private labelEnergy: HTMLElement;
  private labelClean: HTMLElement;
  private warningBorder: HTMLElement;
  private buttons: Map<PetAction, ActionButton>;
  private onActionCallback: ((action: PetAction) => void) | null = null;

  constructor() {
    this.barHunger = document.getElementById('bar-hunger')!;
    this.barHappiness = document.getElementById('bar-happiness')!;
    this.barEnergy = document.getElementById('bar-energy')!;
    this.barClean = document.getElementById('bar-clean')!;
    this.labelHunger = document.getElementById('label-hunger')!;
    this.labelHappiness = document.getElementById('label-happiness')!;
    this.labelEnergy = document.getElementById('label-energy')!;
    this.labelClean = document.getElementById('label-clean')!;
    this.warningBorder = document.getElementById('warningBorder')!;
    this.buttons = new Map();

    this.initButtons();
  }

  setOnActionCallback(callback: (action: PetAction) => void): void {
    this.onActionCallback = callback;
  }

  updateStats(stats: PetStats): void {
    this.updateStatusBar(this.barHunger, this.labelHunger, stats.hunger);
    this.updateStatusBar(this.barHappiness, this.labelHappiness, stats.happiness);
    this.updateStatusBar(this.barEnergy, this.labelEnergy, stats.energy);
    this.updateStatusBar(this.barClean, this.labelClean, stats.clean);

    const minStat = Math.min(stats.hunger, stats.happiness, stats.energy, stats.clean);
    if (minStat < 20) {
      this.warningBorder.classList.add('active');
    } else {
      this.warningBorder.classList.remove('active');
    }
  }

  updateCooldowns(dt: number): void {
    this.buttons.forEach((btn) => {
      if (btn.cooldown > 0) {
        btn.cooldown = Math.max(0, btn.cooldown - dt);
        this.updateButtonState(btn);
      }
    });
  }

  triggerCooldown(action: PetAction): void {
    const btn = this.buttons.get(action);
    if (btn) {
      btn.cooldown = btn.maxCooldown;
      this.updateButtonState(btn);
    }
  }

  isActionReady(action: PetAction): boolean {
    const btn = this.buttons.get(action);
    return btn ? btn.cooldown <= 0 : false;
  }

  private initButtons(): void {
    const buttonElements = document.querySelectorAll<HTMLButtonElement>('.action-btn');
    buttonElements.forEach((el) => {
      const action = el.dataset.action as PetAction;
      const btn: ActionButton = {
        element: el,
        cooldown: 0,
        maxCooldown: 10,
        action,
        overlay: null
      };

      el.addEventListener('click', () => {
        if (this.isActionReady(action) && this.onActionCallback) {
          this.onActionCallback(action);
        }
      });

      this.buttons.set(action, btn);
    });
  }

  private updateStatusBar(bar: HTMLElement, label: HTMLElement, value: number): void {
    const clampedValue = Math.max(0, Math.min(100, value));
    bar.style.width = `${clampedValue}%`;
    bar.style.backgroundColor = this.getStatusColor(clampedValue);
    label.textContent = `${Math.round(clampedValue)}%`;
  }

  private getStatusColor(value: number): string {
    if (value < 20) return '#F44336';
    if (value < 50) return '#FF9800';
    return '#4CAF50';
  }

  private updateButtonState(btn: ActionButton): void {
    if (btn.cooldown > 0) {
      btn.element.classList.add('disabled');
      if (!btn.overlay) {
        btn.overlay = document.createElement('div');
        btn.overlay.className = 'cooldown-overlay';
        btn.element.appendChild(btn.overlay);
      }
      btn.overlay.textContent = `${Math.ceil(btn.cooldown)}`;
    } else {
      btn.element.classList.remove('disabled');
      if (btn.overlay) {
        btn.overlay.remove();
        btn.overlay = null;
      }
    }
  }
}

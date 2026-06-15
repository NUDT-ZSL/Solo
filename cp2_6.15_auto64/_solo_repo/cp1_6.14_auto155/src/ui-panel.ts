import { FleetManager, Formation, ShipType } from './fleet-manager';

export class UIPanel {
  private fleet: FleetManager;
  private panelEl!: HTMLElement;
  private toggleBtn!: HTMLElement;
  private countFrigateEl!: HTMLElement;
  private countDestroyerEl!: HTMLElement;
  private countCarrierEl!: HTMLElement;
  private selectedCountEl!: HTMLElement;
  private totalShieldEl!: HTMLElement;
  private shieldFillEl!: HTMLElement;
  private formationBtns: NodeListOf<HTMLElement> | null = null;
  private lastShieldPct = -1;
  private lastSelected = -1;
  private lastFormation: Formation | null = null;
  private lastByType: Record<ShipType, number> | null = null;

  constructor(fleet: FleetManager) {
    this.fleet = fleet;
  }

  init(): void {
    const $ = (id: string): HTMLElement => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`Element #${id} not found`);
      return el;
    };

    this.panelEl = $('uiPanel');
    this.toggleBtn = $('panelToggle');
    this.countFrigateEl = $('countFrigate');
    this.countDestroyerEl = $('countDestroyer');
    this.countCarrierEl = $('countCarrier');
    this.selectedCountEl = $('selectedCount');
    this.totalShieldEl = $('totalShield');
    this.shieldFillEl = $('shieldFill');
    this.formationBtns = document.querySelectorAll<HTMLElement>('.formation-btn');

    this.formationBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const f = btn.dataset.formation as Formation | undefined;
        if (f && Object.values(Formation).includes(f)) {
          this.fleet.setFormation(f);
          this.updateFormationUI();
        }
      });
    });

    this.toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePanel();
    });

    const closeOnMobile = (): void => {
      if (window.innerWidth < 768) {
        this.closePanel();
      }
    };
    document.addEventListener('click', (e) => {
      const target = e.target as Node;
      if (!this.panelEl.contains(target) && !this.toggleBtn.contains(target)) {
        closeOnMobile();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768) {
        this.panelEl.classList.remove('open');
        this.toggleBtn.classList.remove('active');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeOnMobile();
      }
    });

    this.fleet.onSelectChange = () => this.update();
    this.fleet.onFormationChange = () => this.updateFormationUI();

    this.update();
    this.updateFormationUI();
  }

  private togglePanel(): void {
    const isOpen = this.panelEl.classList.toggle('open');
    this.toggleBtn.classList.toggle('active', isOpen);
  }

  private closePanel(): void {
    this.panelEl.classList.remove('open');
    this.toggleBtn.classList.remove('active');
  }

  public openPanel(): void {
    this.panelEl.classList.add('open');
    this.toggleBtn.classList.add('active');
  }

  private updateFormationUI(): void {
    const current = this.fleet.formation;
    if (current === this.lastFormation) return;
    this.lastFormation = current;
    this.formationBtns?.forEach((btn) => {
      const f = btn.dataset.formation as Formation | undefined;
      btn.classList.toggle('active', f === current);
    });
  }

  update(): void {
    const stats = this.fleet.getStats();

    if (this.lastSelected !== stats.selected) {
      this.selectedCountEl.textContent = `${stats.selected} 艘`;
      this.lastSelected = stats.selected;
    }

    const pct = stats.maxShield > 0 ? Math.round((stats.totalShield / stats.maxShield) * 100) : 0;
    if (this.totalShieldEl.textContent !== `${stats.totalShield} / ${stats.maxShield}`) {
      this.totalShieldEl.textContent = `${stats.totalShield} / ${stats.maxShield}`;
    }
    if (pct !== this.lastShieldPct) {
      this.shieldFillEl.style.width = `${pct}%`;
      this.lastShieldPct = pct;
    }

    if (!this.lastByType ||
        stats.byType[ShipType.FRIGATE] !== this.lastByType[ShipType.FRIGATE] ||
        stats.byType[ShipType.DESTROYER] !== this.lastByType[ShipType.DESTROYER] ||
        stats.byType[ShipType.CARRIER] !== this.lastByType[ShipType.CARRIER]) {
      this.countFrigateEl.textContent = String(stats.byType[ShipType.FRIGATE]);
      this.countDestroyerEl.textContent = String(stats.byType[ShipType.DESTROYER]);
      this.countCarrierEl.textContent = String(stats.byType[ShipType.CARRIER]);
      this.lastByType = { ...stats.byType };
    }

    this.updateFormationUI();
  }
}

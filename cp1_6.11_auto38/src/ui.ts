import { SeasonName } from './seasonThemes';
import { PARTICLE_COUNT_GLOBAL_MIN, PARTICLE_COUNT_GLOBAL_MAX } from './letterEngine';

export interface UICallbacks {
  onSeasonChange: (season: SeasonName) => void;
  onGenerate: (text: string) => boolean;
  onDownload: () => Promise<void>;
  onParticleCountChange: (count: number) => void;
  getPrimaryColor: () => string;
  getCurrentSeason: () => SeasonName;
}

const SEASON_END_COLORS: Record<SeasonName, string> = {
  spring: '#FFEB3B',
  summer: '#01579B',
  autumn: '#FFD700',
  winter: '#B3E5FC'
};

export class UIController {
  private seasonBtns: NodeListOf<HTMLButtonElement>;
  private input: HTMLInputElement;
  private charCount: HTMLElement;
  private generateBtn: HTMLButtonElement;
  private downloadBtn: HTMLButtonElement;
  private particleSlider: HTMLInputElement;
  private particleValue: HTMLElement;

  private cb: UICallbacks;

  constructor(cb: UICallbacks) {
    this.cb = cb;
    this.seasonBtns = document.querySelectorAll('.season-btn') as NodeListOf<HTMLButtonElement>;
    this.input = document.getElementById('letterInput') as HTMLInputElement;
    this.charCount = document.getElementById('charCount') as HTMLElement;
    this.generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
    this.downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
    this.particleSlider = document.getElementById('particleSlider') as HTMLInputElement;
    this.particleValue = document.getElementById('particleValue') as HTMLElement;

    this.initSlider();
    this.updateButtonColors();
    this.updateCharCount();
    this.bindEvents();
  }

  private initSlider(): void {
    if (this.particleSlider) {
      this.particleSlider.min = String(PARTICLE_COUNT_GLOBAL_MIN);
      this.particleSlider.max = String(PARTICLE_COUNT_GLOBAL_MAX);
      this.particleSlider.step = '10';
      const defaultVal = Math.round(
        (PARTICLE_COUNT_GLOBAL_MIN + PARTICLE_COUNT_GLOBAL_MAX) / 2
      );
      this.particleSlider.value = String(defaultVal);
      if (this.particleValue) this.particleValue.textContent = String(defaultVal);
      this.cb.onParticleCountChange(defaultVal);
    }
  }

  private bindEvents(): void {
    this.seasonBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const season = btn.dataset.season as SeasonName;
        if (!season) return;
        this.setActiveSeason(season);
        this.cb.onSeasonChange(season);
        this.updateButtonColors();
      });
    });

    this.input.addEventListener('input', () => this.updateCharCount());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        this.handleGenerate();
      }
    });

    this.generateBtn.addEventListener('click', () => this.handleGenerate());
    this.downloadBtn.addEventListener('click', () => this.handleDownload());

    if (this.particleSlider) {
      let debounce: number | null = null;
      this.particleSlider.addEventListener('input', () => {
        const val = parseInt(this.particleSlider.value, 10);
        if (this.particleValue) this.particleValue.textContent = String(val);
        if (debounce) clearTimeout(debounce);
        debounce = window.setTimeout(() => {
          this.cb.onParticleCountChange(val);
        }, 60);
      });
    }
  }

  private setActiveSeason(season: SeasonName): void {
    this.seasonBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.season === season);
    });
  }

  private updateButtonColors(): void {
    const color = this.cb.getPrimaryColor();
    const endColor = SEASON_END_COLORS[this.cb.getCurrentSeason()];
    const gradient = `linear-gradient(135deg, var(--btn-color-start), var(--btn-color-end))`;
    [this.generateBtn, this.downloadBtn].forEach(btn => {
      btn.style.setProperty('--btn-color-start', color);
      btn.style.setProperty('--btn-color-end', endColor);
      btn.style.background = gradient;
    });
  }

  private updateCharCount(): void {
    const len = this.input.value.length;
    this.charCount.textContent = `${len} / 100`;
    if (len < 20 || len > 100) {
      this.charCount.style.color = 'rgba(255,100,100,0.6)';
    } else {
      this.charCount.style.color = 'rgba(255,255,255,0.4)';
    }
  }

  private handleGenerate(): void {
    const text = this.input.value.trim();
    if (text.length < 20 || text.length > 100) {
      this.shake(this.input);
      this.input.focus();
      return;
    }
    const ok = this.cb.onGenerate(text);
    if (!ok) this.shake(this.generateBtn);
  }

  private async handleDownload(): Promise<void> {
    const orig = this.downloadBtn.textContent;
    this.downloadBtn.textContent = '生成中...';
    this.downloadBtn.style.pointerEvents = 'none';
    try {
      await this.cb.onDownload();
    } finally {
      this.downloadBtn.textContent = orig;
      this.downloadBtn.style.pointerEvents = 'auto';
    }
  }

  private shake(el: HTMLElement): void {
    let count = 0;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    const handler = () => {
      count++;
      if (count >= 1) {
        el.removeEventListener('animationend', handler);
        el.classList.remove('shake');
      }
    };
    el.addEventListener('animationend', handler);
  }

  refreshSeasonButtons(): void {
    this.updateButtonColors();
  }
}

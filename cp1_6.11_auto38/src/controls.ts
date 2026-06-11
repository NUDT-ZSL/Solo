import { SeasonName } from './seasonThemes';
import { LetterEngine } from './letterEngine';

export class Controls {
  private engine: LetterEngine;
  private seasonBtns: NodeListOf<HTMLButtonElement>;
  private input: HTMLInputElement;
  private charCount: HTMLElement;
  private generateBtn: HTMLButtonElement;
  private downloadBtn: HTMLButtonElement;
  private cornerHitAreas: NodeListOf<HTMLElement>;
  private isDragging: boolean = false;
  private activeCorner: 'tl' | 'tr' | 'bl' | 'br' | null = null;

  constructor(engine: LetterEngine) {
    this.engine = engine;
    this.seasonBtns = document.querySelectorAll('.season-btn') as NodeListOf<HTMLButtonElement>;
    this.input = document.getElementById('letterInput') as HTMLInputElement;
    this.charCount = document.getElementById('charCount') as HTMLElement;
    this.generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
    this.downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
    this.cornerHitAreas = document.querySelectorAll('.corner-hit') as NodeListOf<HTMLElement>;

    this.bindEvents();
    this.updateButtonColors();
    this.updateCharCount();
  }

  private bindEvents(): void {
    this.seasonBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const season = btn.dataset.season as SeasonName;
        if (!season) return;
        this.setActiveSeason(season);
        this.engine.setSeason(season);
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

    this.cornerHitAreas.forEach(area => {
      const corner = area.dataset.corner as 'tl' | 'tr' | 'bl' | 'br';
      if (!corner) return;

      area.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = true;
        this.activeCorner = corner;
        this.engine.startFold(corner, e.clientX, e.clientY);
      });

      area.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        this.isDragging = true;
        this.activeCorner = corner;
        this.engine.startFold(corner, touch.clientX, touch.clientY);
      }, { passive: false });
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.engine.updateFold(e.clientX, e.clientY);
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (this.isDragging) {
        const touch = e.touches[0];
        this.engine.updateFold(touch.clientX, touch.clientY);
      }
    }, { passive: true });

    const endDrag = () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.engine.endFold();
      }
    };

    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);
    window.addEventListener('touchcancel', endDrag);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.engine.resetFold();
      }
    });
  }

  private setActiveSeason(season: SeasonName): void {
    this.seasonBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.season === season);
    });
  }

  private updateButtonColors(): void {
    const color = this.engine.getPrimaryColor();
    const colorEndMap: Record<SeasonName, string> = {
      spring: '#FFEB3B',
      summer: '#01579B',
      autumn: '#FFD700',
      winter: '#B3E5FC'
    };
    const endColor = colorEndMap[this.engine.getSeason()];

    const gradient = `linear-gradient(135deg, ${color}, ${endColor})`;
    [this.generateBtn, this.downloadBtn].forEach(btn => {
      btn.style.background = gradient;
    });
  }

  private updateCharCount(): void {
    const len = this.input.value.length;
    this.charCount.textContent = `${len} / 100`;
    if (len < 20) {
      this.charCount.style.color = 'rgba(255,100,100,0.6)';
    } else if (len > 100) {
      this.charCount.style.color = 'rgba(255,100,100,0.6)';
    } else {
      this.charCount.style.color = 'rgba(255,255,255,0.4)';
    }
  }

  private handleGenerate(): void {
    const text = this.input.value.trim();
    if (text.length < 20) {
      this.shakeElement(this.input);
      this.input.focus();
      return;
    }
    if (text.length > 100) {
      this.shakeElement(this.input);
      return;
    }
    this.engine.generateText(text);
  }

  private async handleDownload(): Promise<void> {
    const originalText = this.downloadBtn.textContent;
    this.downloadBtn.textContent = '生成中...';
    this.downloadBtn.style.pointerEvents = 'none';
    try {
      await this.engine.downloadPNG();
    } finally {
      this.downloadBtn.textContent = originalText;
      this.downloadBtn.style.pointerEvents = 'auto';
    }
  }

  private shakeElement(el: HTMLElement): void {
    const original = el.style.transform;
    el.style.transition = 'transform 0.05s';
    let count = 0;
    const shake = () => {
      if (count >= 6) {
        el.style.transform = original;
        el.style.transition = '';
        return;
      }
      const offset = count % 2 === 0 ? -4 : 4;
      el.style.transform = `translateX(${offset}px)`;
      count++;
      setTimeout(shake, 50);
    };
    shake();
  }
}

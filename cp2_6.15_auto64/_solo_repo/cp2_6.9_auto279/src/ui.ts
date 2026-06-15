export interface UIControls {
  particleCount: number;
  trailLength: number;
  colorScheme: number;
}

export interface UICallbacks {
  onParticleCountChange: (count: number) => void;
  onTrailLengthChange: (length: number) => void;
  onColorSchemeChange: (scheme: number) => void;
}

const SCHEME_NAMES = ['暖阳', '极光', '幻彩'];
const SCHEME_COLORS = [
  ['#FF6B35', '#FFD700'],
  ['#00E5FF', '#00FF87'],
  ['#FF007F', '#7A00FF']
];

export class UI {
  private particleCountSlider: HTMLInputElement;
  private trailLengthSlider: HTMLInputElement;
  private colorSchemeSlider: HTMLInputElement;
  private countValue: HTMLElement;
  private trailValue: HTMLElement;
  private schemeValue: HTMLElement;
  private schemePreview: HTMLElement;
  private callbacks: UICallbacks;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;

    this.particleCountSlider = document.getElementById('particle-count-slider') as HTMLInputElement;
    this.trailLengthSlider = document.getElementById('trail-length-slider') as HTMLInputElement;
    this.colorSchemeSlider = document.getElementById('color-scheme-slider') as HTMLInputElement;

    this.countValue = document.getElementById('count-value') as HTMLElement;
    this.trailValue = document.getElementById('trail-value') as HTMLElement;
    this.schemeValue = document.getElementById('scheme-value') as HTMLElement;
    this.schemePreview = document.getElementById('scheme-preview') as HTMLElement;

    this.bindEvents();
    this.updateSchemePreview();
  }

  private bindEvents(): void {
    this.particleCountSlider.addEventListener('input', () => {
      const value = Math.floor(this.particleCountSlider.valueAsNumber);
      this.countValue.textContent = value.toString();
      this.callbacks.onParticleCountChange(value);
    });

    this.trailLengthSlider.addEventListener('input', () => {
      const value = Math.floor(this.trailLengthSlider.valueAsNumber);
      this.trailValue.textContent = value.toString();
      this.callbacks.onTrailLengthChange(value);
    });

    this.colorSchemeSlider.addEventListener('input', () => {
      const value = Math.floor(this.colorSchemeSlider.valueAsNumber);
      this.schemeValue.textContent = SCHEME_NAMES[value];
      this.callbacks.onColorSchemeChange(value);
    });
  }

  private updateSchemePreview(): void {
    this.schemePreview.innerHTML = '';
    SCHEME_COLORS.forEach((colors, index) => {
      const dot = document.createElement('div');
      dot.className = 'scheme-dot';
      dot.style.background = `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
      dot.style.opacity = index === Math.floor(this.colorSchemeSlider.valueAsNumber) ? '1' : '0.4';
      this.schemePreview.appendChild(dot);
    });

    this.colorSchemeSlider.addEventListener('input', () => {
      const current = Math.floor(this.colorSchemeSlider.valueAsNumber);
      Array.from(this.schemePreview.children).forEach((dot, i) => {
        (dot as HTMLElement).style.opacity = i === current ? '1' : '0.4';
      });
    });
  }

  public getControls(): UIControls {
    return {
      particleCount: Math.floor(this.particleCountSlider.valueAsNumber),
      trailLength: Math.floor(this.trailLengthSlider.valueAsNumber),
      colorScheme: Math.floor(this.colorSchemeSlider.valueAsNumber)
    };
  }
}

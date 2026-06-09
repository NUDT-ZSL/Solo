import { RainbowBridge, ColorTheme } from './bridge';
import { InteractionController } from './interaction';

export class UIController {
  private bridge: RainbowBridge;
  private interaction: InteractionController;

  private granularitySlider: HTMLInputElement;
  private granularityValue: HTMLElement;
  private wavespeedSlider: HTMLInputElement;
  private wavespeedValue: HTMLElement;
  private themeButtons: NodeListOf<HTMLButtonElement>;
  private resetButton: HTMLButtonElement;

  constructor(bridge: RainbowBridge, interaction: InteractionController) {
    this.bridge = bridge;
    this.interaction = interaction;

    this.granularitySlider = document.getElementById('granularity') as HTMLInputElement;
    this.granularityValue = document.getElementById('granularity-val') as HTMLElement;
    this.wavespeedSlider = document.getElementById('wavespeed') as HTMLInputElement;
    this.wavespeedValue = document.getElementById('wavespeed-val') as HTMLElement;
    this.themeButtons = document.querySelectorAll('.theme-btn');
    this.resetButton = document.getElementById('reset-view') as HTMLButtonElement;

    this.init();
  }

  private init() {
    this.granularitySlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.bridge.setGranularity(val);
      this.granularityValue.textContent = val.toFixed(2);
    });

    this.wavespeedSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.bridge.setWaveSpeed(val);
      this.wavespeedValue.textContent = val.toFixed(2);
    });

    this.themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.themeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.dataset.theme as ColorTheme;
        this.bridge.setTheme(theme);
        this.shineEffect(btn);
      });
    });

    this.resetButton.addEventListener('click', () => {
      this.interaction.resetView();
      this.bounceResetButton();
    });

    this.preventPanelEvents();
  }

  private preventPanelEvents() {
    const panel = document.querySelector('.control-panel') as HTMLElement;
    if (panel) {
      const stop = (e: Event) => e.stopPropagation();
      panel.addEventListener('pointerdown', stop);
      panel.addEventListener('pointermove', stop);
      panel.addEventListener('pointerup', stop);
      panel.addEventListener('wheel', stop);
    }
    const hint = document.querySelector('.hint') as HTMLElement;
    if (hint) {
      const stop = (e: Event) => e.stopPropagation();
      hint.addEventListener('pointerdown', stop);
      hint.addEventListener('wheel', stop);
    }
  }

  private shineEffect(btn: HTMLElement) {
    btn.animate([
      { boxShadow: '0 4px 20px rgba(200, 120, 255, 0.4)' },
      { boxShadow: '0 4px 40px rgba(255, 180, 240, 0.8)' },
      { boxShadow: '0 4px 20px rgba(200, 120, 255, 0.4)' }
    ], {
      duration: 600,
      easing: 'ease-out'
    });
  }

  private bounceResetButton() {
    this.resetButton.animate([
      { transform: 'translateY(0)' },
      { transform: 'translateY(-6px) scale(1.03)' },
      { transform: 'translateY(0)' }
    ], {
      duration: 350,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
    });
  }
}

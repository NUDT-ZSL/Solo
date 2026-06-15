import { AudioAnalyzer, AudioFeatures } from './AudioAnalyzer';
import { ParticleSystem } from './ParticleSystem';

export class UI {
  private audioAnalyzer: AudioAnalyzer;
  private particleSystem: ParticleSystem;
  private isPaused = false;
  private onResetCamera: (() => void) | null = null;

  constructor(audioAnalyzer: AudioAnalyzer, particleSystem: ParticleSystem) {
    this.audioAnalyzer = audioAnalyzer;
    this.particleSystem = particleSystem;
    this.bindEvents();
  }

  setResetCameraCallback(cb: () => void): void {
    this.onResetCamera = cb;
  }

  private bindEvents(): void {
    const btnPreset1 = document.getElementById('btn-preset1') as HTMLButtonElement;
    const btnPreset2 = document.getElementById('btn-preset2') as HTMLButtonElement;
    const btnUpload = document.getElementById('btn-upload') as HTMLButtonElement;
    const btnStop = document.getElementById('btn-stop') as HTMLButtonElement;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;

    btnPreset1.addEventListener('click', () => this.handlePreset('clair-de-lune', btnPreset1));
    btnPreset2.addEventListener('click', () => this.handlePreset('canon', btnPreset2));

    btnUpload.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      try {
        await this.audioAnalyzer.loadUserAudio(file);
        this.setActiveButton(btnUpload);
        this.showStopButton();
        this.updateStatus(true, `播放中: ${file.name}`);
      } catch (err) {
        this.updateStatus(false, '音频加载失败');
      }
      target.value = '';
    });

    btnStop.addEventListener('click', () => {
      this.audioAnalyzer.stop();
      this.hideStopButton();
      this.clearActiveButtons();
      this.updateStatus(false, '等待音频输入...');
    });

    const sliderSpeed = document.getElementById('slider-speed') as HTMLInputElement;
    const sliderHalo = document.getElementById('slider-halo') as HTMLInputElement;
    const sliderSensitivity = document.getElementById('slider-sensitivity') as HTMLInputElement;

    sliderSpeed.addEventListener('input', () => {
      const val = parseFloat(sliderSpeed.value);
      document.getElementById('speed-value')!.textContent = `${val.toFixed(1)}x`;
      this.particleSystem.setParams({ speed: val });
    });

    sliderHalo.addEventListener('input', () => {
      const val = parseFloat(sliderHalo.value);
      document.getElementById('halo-value')!.textContent = `${val.toFixed(1)}x`;
      this.particleSystem.setParams({ haloIntensity: val });
    });

    sliderSensitivity.addEventListener('input', () => {
      const val = parseFloat(sliderSensitivity.value);
      document.getElementById('sensitivity-value')!.textContent = `${val.toFixed(1)}x`;
      this.particleSystem.setParams({ sensitivity: val });
    });

    const btnResetCamera = document.getElementById('btn-reset-camera') as HTMLButtonElement;
    btnResetCamera.addEventListener('click', () => {
      this.onResetCamera?.();
    });

    const btnCloseCard = document.getElementById('btn-close-card') as HTMLButtonElement;
    btnCloseCard.addEventListener('click', () => {
      this.hideInfoCard();
    });

    const infoCard = document.getElementById('info-card') as HTMLDivElement;
    infoCard.addEventListener('click', (e) => {
      if (e.target === infoCard) {
        this.hideInfoCard();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideInfoCard();
      }
    });
  }

  private async handlePreset(name: string, btn: HTMLButtonElement): Promise<void> {
    try {
      await this.audioAnalyzer.loadPreset(name);
      this.setActiveButton(btn);
      this.showStopButton();
      const labels: Record<string, string> = {
        'clair-de-lune': '月光曲',
        'canon': '卡农',
      };
      this.updateStatus(true, `播放中: ${labels[name] || name}`);
    } catch {
      this.updateStatus(false, '音频加载失败');
    }
  }

  private setActiveButton(activeBtn: HTMLButtonElement): void {
    this.clearActiveButtons();
    activeBtn.classList.add('active');
  }

  private clearActiveButtons(): void {
    const buttons = document.querySelectorAll('.btn-glass');
    buttons.forEach(b => b.classList.remove('active'));
  }

  private showStopButton(): void {
    const btnStop = document.getElementById('btn-stop') as HTMLButtonElement;
    btnStop.style.display = 'inline-flex';
  }

  private hideStopButton(): void {
    const btnStop = document.getElementById('btn-stop') as HTMLButtonElement;
    btnStop.style.display = 'none';
  }

  private updateStatus(active: boolean, text: string): void {
    const dot = document.getElementById('status-dot') as HTMLDivElement;
    const statusText = document.getElementById('status-text') as HTMLSpanElement;

    if (active) {
      dot.classList.remove('idle');
    } else {
      dot.classList.add('idle');
    }
    statusText.textContent = text;
  }

  showInfoCard(features: AudioFeatures): void {
    const card = document.getElementById('info-card') as HTMLDivElement;
    card.classList.add('visible');
    this.isPaused = true;

    this.drawSpectrum(features.frequencyData);
    this.drawEmotionTags(features);
  }

  hideInfoCard(): void {
    const card = document.getElementById('info-card') as HTMLDivElement;
    card.classList.remove('visible');
    this.isPaused = false;
  }

  get paused(): boolean {
    return this.isPaused;
  }

  private drawSpectrum(frequencyData: Uint8Array): void {
    const canvas = document.getElementById('spectrum-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(155, 48, 255, 0.3)');
    gradient.addColorStop(0.5, 'rgba(0, 229, 160, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const barCount = 128;
    const barWidth = width / barCount;
    const step = Math.floor(frequencyData.length / barCount);

    for (let i = 0; i < barCount; i++) {
      const value = frequencyData[i * step] / 255;
      const barHeight = value * height * 0.85;

      const t = i / barCount;
      let r: number, g: number, b: number;
      if (t < 0.25) {
        r = 155; g = 48; b = 255;
      } else if (t < 0.5) {
        r = 106; g = 90; b = 205;
      } else if (t < 0.75) {
        r = 0; g = 229; b = 160;
      } else {
        r = 255; g = 215; b = 0;
      }

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
      ctx.fillRect(
        i * barWidth + 1,
        height - barHeight,
        barWidth - 2,
        barHeight
      );
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < barCount; i++) {
      const value = frequencyData[i * step] / 255;
      const x = i * barWidth + barWidth / 2;
      const y = height - value * height * 0.85;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  private drawEmotionTags(features: AudioFeatures): void {
    const container = document.getElementById('emotion-tags') as HTMLDivElement;
    container.innerHTML = '';
    const tags = this.audioAnalyzer.getEmotionTags(features);
    tags.forEach(tag => {
      const el = document.createElement('span');
      el.className = 'emotion-tag';
      el.textContent = tag;
      container.appendChild(el);
    });
  }
}

import { AudioAnalyzer } from './audioAnalyzer';
import { Visualizer } from './visualizer';
import { ColorTheme, VisualizerMode, WaveType } from './types';

export class Controls {
  private analyzer: AudioAnalyzer;
  private visualizer: Visualizer;
  private fileInput: HTMLInputElement;
  private uploadBtn: HTMLElement;
  private playBtn: HTMLElement;
  private volumeSlider: HTMLInputElement;
  private oscillatorType: HTMLSelectElement;
  private frequencySlider: HTMLInputElement;
  private gainSlider: HTMLInputElement;
  private oscillatorBtn: HTMLElement;
  private modeButtons: Record<VisualizerMode, HTMLElement>;
  private themeButtons: Record<ColorTheme, HTMLElement>;
  private menuToggle: HTMLElement;
  private controlPanel: HTMLElement;
  private hint: HTMLElement;
  private oscillatorActive = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private currentDragX = 0;
  private currentDragY = 0;
  private isDragging = false;

  constructor(analyzer: AudioAnalyzer, visualizer: Visualizer) {
    this.analyzer = analyzer;
    this.visualizer = visualizer;

    this.fileInput = document.getElementById('fileInput') as HTMLInputElement;
    this.uploadBtn = document.getElementById('uploadBtn')!;
    this.playBtn = document.getElementById('playBtn')!;
    this.volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
    this.oscillatorType = document.getElementById('oscillatorType') as HTMLSelectElement;
    this.frequencySlider = document.getElementById('frequencySlider') as HTMLInputElement;
    this.gainSlider = document.getElementById('gainSlider') as HTMLInputElement;
    this.oscillatorBtn = document.getElementById('oscillatorBtn')!;
    this.menuToggle = document.getElementById('menuToggle')!;
    this.controlPanel = document.getElementById('controlPanel')!;
    this.hint = document.getElementById('canvasHint')!;

    this.modeButtons = {
      [VisualizerMode.BARS]: document.getElementById('modeBars')!,
      [VisualizerMode.PARTICLES]: document.getElementById('modeParticles')!,
      [VisualizerMode.WAVE]: document.getElementById('modeWave')!
    };

    this.themeButtons = {
      [ColorTheme.AURORA]: document.getElementById('themeAurora')!,
      [ColorTheme.LAVA]: document.getElementById('themeLava')!,
      [ColorTheme.DEEP_SEA]: document.getElementById('themeDeepSea')!,
      [ColorTheme.NEON]: document.getElementById('themeNeon')!
    };

    this.bindEvents();
  }

  private bindEvents(): void {
    this.uploadBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    this.playBtn.addEventListener('click', () => this.handlePlayPause());
    this.volumeSlider.addEventListener('input', (e) => this.handleVolumeChange(e));
    this.oscillatorBtn.addEventListener('click', () => this.toggleOscillator());
    this.oscillatorType.addEventListener('change', (e) => this.handleOscillatorType(e));
    this.frequencySlider.addEventListener('input', (e) => this.handleFrequencyChange(e));
    this.gainSlider.addEventListener('input', (e) => this.handleGainChange(e));

    Object.entries(this.modeButtons).forEach(([mode, btn]) => {
      btn.addEventListener('click', () => this.setMode(mode as VisualizerMode));
    });

    Object.entries(this.themeButtons).forEach(([theme, btn]) => {
      btn.addEventListener('click', () => this.setTheme(theme as ColorTheme));
    });

    this.menuToggle.addEventListener('click', () => this.togglePanel());

    const canvas = document.getElementById('visualizerCanvas')!;
    canvas.addEventListener('mousedown', (e) => this.handleDragStart(e));
    window.addEventListener('mousemove', (e) => this.handleDragMove(e));
    window.addEventListener('mouseup', () => this.handleDragEnd());
    canvas.addEventListener('mouseenter', () => this.showHint(true));
    canvas.addEventListener('mouseleave', () => this.showHint(false));
    canvas.addEventListener('wheel', (e) => this.handleZoom(e), { passive: false });

    this.updateUI();
  }

  private async handleFileUpload(e: Event): Promise<void> {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.uploadBtn.textContent = '解码中...';
    this.oscillatorActive = false;
    this.updateOscillatorUI();

    try {
      await this.analyzer.decodeAudioFile(file);
      this.analyzer.playDecodedFile();
      this.uploadBtn.textContent = file.name.length > 15 ? file.name.slice(0, 15) + '...' : file.name;
    } catch (err) {
      this.uploadBtn.textContent = '上传失败';
      setTimeout(() => (this.uploadBtn.textContent = '上传音频'), 2000);
    }
    this.updateUI();
  }

  private handlePlayPause(): void {
    if (this.oscillatorActive) {
      this.toggleOscillator();
    } else if (this.analyzer.hasAudioBuffer()) {
      this.analyzer.togglePlayback();
    }
    this.updateUI();
  }

  private handleVolumeChange(e: Event): void {
    const value = parseFloat((e.target as HTMLInputElement).value) / 100;
    this.analyzer.setVolume(value);
  }

  private toggleOscillator(): void {
    if (this.oscillatorActive) {
      this.analyzer.stopAll();
      this.oscillatorActive = false;
    } else {
      const type = this.oscillatorType.value as WaveType;
      const freq = parseFloat(this.frequencySlider.value);
      const gain = parseFloat(this.gainSlider.value) / 100;
      this.analyzer.startOscillator(type, freq, gain);
      this.oscillatorActive = true;
    }
    this.updateOscillatorUI();
    this.updateUI();
  }

  private handleOscillatorType(e: Event): void {
    const type = (e.target as HTMLSelectElement).value as WaveType;
    this.analyzer.setOscillatorType(type);
  }

  private handleFrequencyChange(e: Event): void {
    const freq = parseFloat((e.target as HTMLInputElement).value);
    this.analyzer.setOscillatorFrequency(freq);
  }

  private handleGainChange(e: Event): void {
    const gain = parseFloat((e.target as HTMLInputElement).value) / 100;
    this.analyzer.setOscillatorGain(gain);
  }

  private setMode(mode: VisualizerMode): void {
    this.visualizer.setMode(mode);
    Object.values(this.modeButtons).forEach(b => b.classList.remove('active'));
    this.modeButtons[mode].classList.add('active');
  }

  private setTheme(theme: ColorTheme): void {
    this.visualizer.setTheme(theme);
    Object.values(this.themeButtons).forEach(b => b.classList.remove('active'));
    this.themeButtons[theme].classList.add('active');
  }

  private togglePanel(): void {
    this.controlPanel.classList.toggle('expanded');
  }

  private handleDragStart(e: MouseEvent): void {
    this.isDragging = true;
    this.dragStartX = e.clientX - this.currentDragX;
    this.dragStartY = e.clientY - this.currentDragY;
    this.visualizer.setDragging(true);
  }

  private handleDragMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    this.currentDragX = e.clientX - this.dragStartX;
    this.currentDragY = e.clientY - this.dragStartY;
    this.visualizer.setDragOffset(this.currentDragX, this.currentDragY);
  }

  private handleDragEnd(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.visualizer.setDragging(false);
      setTimeout(() => {
        this.currentDragX = 0;
        this.currentDragY = 0;
      }, 500);
    }
  }

  private handleZoom(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    this.visualizer.setScale(this.visualizer.getScale() * delta);
  }

  private showHint(show: boolean): void {
    this.hint.style.opacity = show ? '1' : '0';
  }

  private updateOscillatorUI(): void {
    this.oscillatorBtn.textContent = this.oscillatorActive ? '停止振荡器' : '启动振荡器';
    this.oscillatorBtn.classList.toggle('active', this.oscillatorActive);
  }

  private updateUI(): void {
    const isPlaying = this.analyzer.getIsPlaying();
    this.playBtn.textContent = isPlaying ? '⏸ 暂停' : '▶ 播放';
  }
}

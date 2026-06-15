import { WaveformRenderer, type BlendMode, type WaveformState } from './waveform';
import { AudioEngine } from './audio';

const PANEL_WIDTH = 520;
const PANEL_HEIGHT = 680;
const SCREEN_WIDTH = 400;
const SCREEN_HEIGHT = 220;
const KNOB_DIAMETER = 50;
const KNOB_RADIUS = KNOB_DIAMETER / 2;

const DEFAULT_STATE: WaveformState = {
  freqA: 500,
  freqB: 1000,
  blendMode: 'add'
};

const BLEND_MODES: BlendMode[] = ['add', 'difference', 'maximum'];
const BLEND_LABELS: Record<BlendMode, string> = {
  add: '叠加',
  difference: '差值',
  maximum: '最大值'
};

class KnobController {
  private element: HTMLElement;
  private indicator: HTMLElement;
  private valueDisplay: HTMLElement;
  private minValue: number;
  private maxValue: number;
  private currentValue: number;
  private onChange: (value: number) => void;
  private isDragging: boolean = false;
  private startAngle: number = 0;
  private startValue: number = 0;
  private lastAngle: number = 0;
  private minAngle: number = -135;
  private maxAngle: number = 135;
  private label: string;
  private unit: string;

  constructor(
    label: string,
    minValue: number,
    maxValue: number,
    defaultValue: number,
    unit: string,
    onChange: (value: number) => void
  ) {
    this.label = label;
    this.unit = unit;
    this.minValue = minValue;
    this.maxValue = maxValue;
    this.currentValue = defaultValue;
    this.onChange = onChange;

    this.element = this.createKnobElement();
    this.indicator = this.element.querySelector('.knob-indicator') as HTMLElement;
    this.valueDisplay = this.element.querySelector('.knob-value') as HTMLElement;

    this.bindEvents();
    this.updateVisual();
  }

  private createKnobElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'knob-container';
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      user-select: none;
    `;

    const labelEl = document.createElement('div');
    labelEl.className = 'knob-label';
    labelEl.style.cssText = `
      color: #C8A96E;
      font-size: 12px;
      letter-spacing: 2px;
      text-transform: uppercase;
      font-family: 'Courier New', monospace;
    `;
    labelEl.textContent = this.label;
    container.appendChild(labelEl);

    const knobWrapper = document.createElement('div');
    knobWrapper.className = 'knob-wrapper';
    knobWrapper.style.cssText = `
      position: relative;
      width: ${KNOB_DIAMETER + 16}px;
      height: ${KNOB_DIAMETER + 16}px;
      cursor: grab;
    `;

    const tickRing = document.createElement('div');
    tickRing.className = 'knob-tick-ring';
    tickRing.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 50%;
    `;

    for (let angle = this.minAngle; angle <= this.maxAngle; angle += 10) {
      const tick = document.createElement('div');
      const rad = (angle * Math.PI) / 180;
      const outerR = (KNOB_DIAMETER + 16) / 2 - 2;
      const innerR = (KNOB_DIAMETER + 16) / 2 - 8;
      const x1 = (KNOB_DIAMETER + 16) / 2 + Math.sin(rad) * outerR;
      const y1 = (KNOB_DIAMETER + 16) / 2 - Math.cos(rad) * outerR;
      const x2 = (KNOB_DIAMETER + 16) / 2 + Math.sin(rad) * innerR;
      const y2 = (KNOB_DIAMETER + 16) / 2 - Math.cos(rad) * innerR;
      tick.style.cssText = `
        position: absolute;
        left: ${x1}px;
        top: ${y1}px;
        width: 1px;
        height: ${outerR - innerR}px;
        background: rgba(200, 169, 110, 0.4);
        transform-origin: center top;
        transform: translateX(-0.5px) rotate(${angle}deg);
      `;
      tickRing.appendChild(tick);
    }
    knobWrapper.appendChild(tickRing);

    const knobOuter = document.createElement('div');
    knobOuter.className = 'knob-outer';
    knobOuter.style.cssText = `
      position: absolute;
      top: 8px;
      left: 8px;
      width: ${KNOB_DIAMETER}px;
      height: ${KNOB_DIAMETER}px;
      border-radius: 50%;
      background: linear-gradient(145deg, #8A7A6E, #6B5B4F);
      box-shadow: 
        inset 0 2px 4px rgba(255, 255, 255, 0.1),
        inset 0 -2px 4px rgba(0, 0, 0, 0.3),
        0 2px 8px rgba(0, 0, 0, 0.4);
    `;

    const knobInner = document.createElement('div');
    knobInner.className = 'knob-inner';
    knobInner.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: ${KNOB_DIAMETER - 14}px;
      height: ${KNOB_DIAMETER - 14}px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, #3E2C1F, #2E1F14);
      box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.6);
    `;

    const indicator = document.createElement('div');
    indicator.className = 'knob-indicator';
    indicator.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 6px;
      height: 6px;
      margin-left: -3px;
      margin-top: -3px;
      border-radius: 50%;
      background: #E0C080;
      box-shadow: 0 0 6px rgba(224, 192, 128, 0.8);
      transform-origin: center ${-(KNOB_RADIUS - 4)}px;
    `;

    knobInner.appendChild(indicator);
    knobOuter.appendChild(knobInner);
    knobWrapper.appendChild(knobOuter);
    container.appendChild(knobWrapper);

    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'knob-value';
    valueDisplay.style.cssText = `
      color: #F5F0E1;
      font-size: 13px;
      font-family: 'Courier New', monospace;
      min-width: 60px;
      text-align: center;
      background: rgba(0, 0, 0, 0.3);
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid rgba(200, 169, 110, 0.3);
    `;
    container.appendChild(valueDisplay);

    return container;
  }

  private bindEvents(): void {
    const knobWrapper = this.element.querySelector('.knob-wrapper') as HTMLElement;

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      this.isDragging = true;
      knobWrapper.style.cursor = 'grabbing';
      knobWrapper.setPointerCapture(e.pointerId);

      const rect = knobWrapper.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      this.startAngle = Math.atan2(dy, dx) * (180 / Math.PI);
      this.startValue = this.currentValue;
      this.lastAngle = this.startAngle;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isDragging) return;
      e.preventDefault();

      const rect = knobWrapper.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);

      let deltaAngle = currentAngle - this.lastAngle;
      if (deltaAngle > 180) deltaAngle -= 360;
      if (deltaAngle < -180) deltaAngle += 360;

      const currentKnobAngle = this.valueToAngle(this.currentValue);
      const newKnobAngle = Math.max(
        this.minAngle,
        Math.min(this.maxAngle, currentKnobAngle + deltaAngle * 0.8)
      );

      this.currentValue = this.angleToValue(newKnobAngle);
      this.lastAngle = currentAngle;

      this.updateVisual();
      this.onChange(this.currentValue);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      knobWrapper.style.cursor = 'grab';
      try {
        knobWrapper.releasePointerCapture(e.pointerId);
      } catch {}
    };

    knobWrapper.addEventListener('pointerdown', onPointerDown);
    knobWrapper.addEventListener('pointermove', onPointerMove);
    knobWrapper.addEventListener('pointerup', onPointerUp);
    knobWrapper.addEventListener('pointercancel', onPointerUp);
    knobWrapper.addEventListener('pointerleave', onPointerUp);
  }

  private valueToAngle(value: number): number {
    const ratio = (value - this.minValue) / (this.maxValue - this.minValue);
    return this.minAngle + ratio * (this.maxAngle - this.minAngle);
  }

  private angleToValue(angle: number): number {
    const ratio = (angle - this.minAngle) / (this.maxAngle - this.minAngle);
    return this.minValue + ratio * (this.maxValue - this.minValue);
  }

  private updateVisual(): void {
    const angle = this.valueToAngle(this.currentValue);
    this.indicator.style.transform = `rotate(${angle + 90}deg)`;

    if (this.unit === 'mode') {
      const modeIndex = Math.round(
        ((this.currentValue - this.minValue) / (this.maxValue - this.minValue)) *
        (BLEND_MODES.length - 1)
      );
      const safeIndex = Math.max(0, Math.min(BLEND_MODES.length - 1, modeIndex));
      this.valueDisplay.textContent = BLEND_LABELS[BLEND_MODES[safeIndex]];
    } else {
      this.valueDisplay.textContent = `${Math.round(this.currentValue)}${this.unit}`;
    }
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public getValue(): number {
    return this.currentValue;
  }

  public setValue(value: number): void {
    this.currentValue = Math.max(
      this.minValue,
      Math.min(this.maxValue, value)
    );
    this.updateVisual();
  }
}

class App {
  private container: HTMLElement;
  private panel: HTMLElement;
  private canvas: HTMLCanvasElement;
  private waveformRenderer: WaveformRenderer;
  private audioEngine: AudioEngine;

  private knobFreqA!: KnobController;
  private knobFreqB!: KnobController;
  private knobBlend!: KnobController;

  private recordBtn: HTMLElement;
  private recordDot: HTMLElement;
  private isRecordingBlink: boolean = false;
  private recordBlinkInterval: number | null = null;

  private resetBtn: HTMLElement;

  private playbackOverlay: HTMLElement | null = null;
  private playbackProgress: HTMLElement | null = null;
  private playbackBtn: HTMLElement | null = null;
  private playbackRafId: number | null = null;

  private isAudioInitialized: boolean = false;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`找不到容器 #${containerId}`);
    this.container = container;

    this.panel = this.createPanel();
    this.canvas = this.createCanvas();
    this.waveformRenderer = new WaveformRenderer(this.canvas);
    this.audioEngine = new AudioEngine();

    this.recordBtn = document.createElement('div');
    this.recordDot = document.createElement('div');
    this.resetBtn = document.createElement('div');

    this.buildUI();
    this.bindAudioEngineEvents();
    this.startRendering();
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: relative;
      width: ${PANEL_WIDTH}px;
      height: ${PANEL_HEIGHT}px;
      background: linear-gradient(180deg, #3E2C1F 0%, #2B1D14 100%);
      border-radius: 12px;
      border: 1.5px solid #C8A96E;
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.6),
        inset 0 1px 0 rgba(200, 169, 110, 0.2);
      padding: 30px;
      display: flex;
      flex-direction: column;
      align-items: center;
    `;
    return panel;
  }

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = SCREEN_WIDTH * 2;
    canvas.height = SCREEN_HEIGHT * 2;
    canvas.style.cssText = `
      width: ${SCREEN_WIDTH}px;
      height: ${SCREEN_HEIGHT}px;
      border-radius: 6px;
      box-shadow: 
        inset 0 0 60px rgba(0, 0, 0, 0.6),
        inset 0 0 30px rgba(10, 22, 40, 0.8),
        0 0 0 2px rgba(200, 169, 110, 0.4),
        0 4px 12px rgba(0, 0, 0, 0.4);
      display: block;
    `;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(2, 2);
    }
    return canvas;
  }

  private buildUI(): void {
    const title = document.createElement('div');
    title.style.cssText = `
      color: #C8A96E;
      font-size: 18px;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
      margin-bottom: 20px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    `;
    title.textContent = '微 光 调 频';
    this.panel.appendChild(title);

    const screenContainer = document.createElement('div');
    screenContainer.style.cssText = `
      position: relative;
      margin-bottom: 40px;
    `;
    screenContainer.appendChild(this.canvas);

    this.recordBtn = document.createElement('div');
    this.recordBtn.style.cssText = `
      position: absolute;
      top: -10px;
      right: -10px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(145deg, #D0D8DC, #B0BEC5);
      box-shadow: 
        0 2px 6px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.5);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.1s ease;
    `;
    this.recordBtn.title = '录音';

    this.recordDot = document.createElement('div');
    this.recordDot.style.cssText = `
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #E53935;
      box-shadow: 0 0 6px rgba(229, 57, 53, 0.8);
      transition: opacity 0.1s ease;
    `;
    this.recordBtn.appendChild(this.recordDot);

    screenContainer.appendChild(this.recordBtn);
    this.panel.appendChild(screenContainer);

    const knobsRow = document.createElement('div');
    knobsRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
      padding: 0 30px;
      margin-bottom: 30px;
    `;

    this.knobFreqA = new KnobController(
      '频率 A',
      100,
      2000,
      DEFAULT_STATE.freqA,
      'Hz',
      (value) => this.handleFreqAChange(value)
    );
    this.knobFreqB = new KnobController(
      '频率 B',
      200,
      4000,
      DEFAULT_STATE.freqB,
      'Hz',
      (value) => this.handleFreqBChange(value)
    );
    this.knobBlend = new KnobController(
      '混合',
      0,
      BLEND_MODES.length - 1,
      0,
      'mode',
      (value) => this.handleBlendChange(value)
    );

    knobsRow.appendChild(this.knobFreqA.getElement());
    knobsRow.appendChild(this.knobFreqB.getElement());
    knobsRow.appendChild(this.knobBlend.getElement());
    this.panel.appendChild(knobsRow);

    const bottomBar = document.createElement('div');
    bottomBar.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
    `;

    this.resetBtn = document.createElement('div');
    this.resetBtn.style.cssText = `
      width: 80px;
      height: 32px;
      background: #5D4037;
      color: #F5F0E1;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      font-size: 13px;
      letter-spacing: 2px;
      cursor: pointer;
      font-family: 'Courier New', monospace;
      transition: background 0.2s ease;
      border: 1px solid rgba(200, 169, 110, 0.3);
    `;
    this.resetBtn.textContent = '重置';
    this.resetBtn.addEventListener('mouseenter', () => {
      this.resetBtn.style.background = '#6D5047';
    });
    this.resetBtn.addEventListener('mouseleave', () => {
      this.resetBtn.style.background = '#5D4037';
    });

    bottomBar.appendChild(this.resetBtn);
    this.panel.appendChild(bottomBar);

    this.container.appendChild(this.panel);
  }

  private bindAudioEngineEvents(): void {
    this.audioEngine.setOnRecordingEnd(() => {
      this.stopRecordingBlink();
      this.showPlaybackOverlay();
    });
  }

  private handleFreqAChange(value: number): void {
    this.ensureAudioInitialized();
    this.waveformRenderer.updateWave({ freqA: value });
    this.audioEngine.setFrequencyA(value);
    this.recordCurrentState();
  }

  private handleFreqBChange(value: number): void {
    this.ensureAudioInitialized();
    this.waveformRenderer.updateWave({ freqB: value });
    this.audioEngine.setFrequencyB(value);
    this.recordCurrentState();
  }

  private handleBlendChange(value: number): void {
    this.ensureAudioInitialized();
    const modeIndex = Math.round(value);
    const safeIndex = Math.max(0, Math.min(BLEND_MODES.length - 1, modeIndex));
    const mode = BLEND_MODES[safeIndex];
    this.waveformRenderer.updateWave({ blendMode: mode });
    this.audioEngine.setBlendMode(mode);
    this.recordCurrentState();
  }

  private ensureAudioInitialized(): void {
    if (!this.isAudioInitialized) {
      this.isAudioInitialized = true;
      this.audioEngine.initAudio();
    }
  }

  private recordCurrentState(): void {
    if (this.audioEngine.getIsRecording()) {
      const modeIndex = Math.round(this.knobBlend.getValue());
      const safeIndex = Math.max(0, Math.min(BLEND_MODES.length - 1, modeIndex));
      this.audioEngine.recordFrame({
        freqA: this.knobFreqA.getValue(),
        freqB: this.knobFreqB.getValue(),
        blendMode: BLEND_MODES[safeIndex]
      });
    }
  }

  private startRendering(): void {
    this.waveformRenderer.startAnimation();
  }

  private startRecordingBlink(): void {
    this.isRecordingBlink = true;
    let visible = true;
    this.recordBlinkInterval = window.setInterval(() => {
      visible = !visible;
      this.recordDot.style.opacity = visible ? '1' : '0.2';
    }, 500);
  }

  private stopRecordingBlink(): void {
    this.isRecordingBlink = false;
    if (this.recordBlinkInterval !== null) {
      clearInterval(this.recordBlinkInterval);
      this.recordBlinkInterval = null;
    }
    this.recordDot.style.opacity = '1';
  }

  private showPlaybackOverlay(): void {
    this.playbackOverlay = document.createElement('div');
    this.playbackOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      width: 320px;
      height: 200px;
      background: rgba(0, 0, 0, 0.85);
      border-radius: 12px;
      padding: 30px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 25px;
      border: 1px solid rgba(200, 169, 110, 0.3);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      color: #F5F0E1;
      font-size: 16px;
      letter-spacing: 4px;
      font-family: 'Courier New', monospace;
    `;
    title.textContent = '录 制 完 成';
    panel.appendChild(title);

    this.playbackBtn = document.createElement('div');
    this.playbackBtn.style.cssText = `
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(145deg, #4FC3F7, #0288D1);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(79, 195, 247, 0.4);
      transition: transform 0.1s ease;
    `;

    const playIcon = document.createElement('div');
    playIcon.style.cssText = `
      width: 0;
      height: 0;
      border-left: 16px solid #fff;
      border-top: 10px solid transparent;
      border-bottom: 10px solid transparent;
      margin-left: 4px;
    `;
    this.playbackBtn.appendChild(playIcon);
    panel.appendChild(this.playbackBtn);

    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
    `;

    this.playbackProgress = document.createElement('div');
    this.playbackProgress.style.cssText = `
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #4FC3F7, #F06292);
      border-radius: 3px;
      transition: width 0.05s linear;
    `;
    progressContainer.appendChild(this.playbackProgress);
    panel.appendChild(progressContainer);

    this.playbackOverlay.appendChild(panel);
    document.body.appendChild(this.playbackOverlay);

    this.playbackBtn.addEventListener('click', () => this.startPlayback());
    this.playbackOverlay.addEventListener('click', (e) => {
      if (e.target === this.playbackOverlay) {
        this.closePlaybackOverlay();
      }
    });
  }

  private startPlayback(): void {
    if (this.audioEngine.getIsPlaying()) return;

    this.ensureAudioInitialized();

    this.audioEngine.startPlayback(
      (state) => {
        this.waveformRenderer.updateWave(state);
        this.audioEngine.setFrequencyA(state.freqA);
        this.audioEngine.setFrequencyB(state.freqB);
        this.audioEngine.setBlendMode(state.blendMode);
      },
      () => {
        this.stopPlaybackProgressUpdate();
      }
    );

    this.updatePlaybackProgressLoop();
  }

  private updatePlaybackProgressLoop(): void {
    if (!this.playbackProgress) return;

    const progress = this.audioEngine.getPlaybackProgress();
    this.playbackProgress.style.width = `${progress * 100}%`;

    if (this.audioEngine.getIsPlaying()) {
      this.playbackRafId = requestAnimationFrame(() => this.updatePlaybackProgressLoop());
    }
  }

  private stopPlaybackProgressUpdate(): void {
    if (this.playbackRafId !== null) {
      cancelAnimationFrame(this.playbackRafId);
      this.playbackRafId = null;
    }
  }

  private closePlaybackOverlay(): void {
    this.audioEngine.stopPlayback();
    this.stopPlaybackProgressUpdate();
    if (this.playbackOverlay) {
      this.playbackOverlay.remove();
      this.playbackOverlay = null;
    }
    this.playbackProgress = null;
    this.playbackBtn = null;
  }

  private resetToDefault(): void {
    this.ensureAudioInitialized();
    this.audioEngine.clearRecording();
    this.closePlaybackOverlay();
    this.stopRecordingBlink();

    this.knobFreqA.setValue(DEFAULT_STATE.freqA);
    this.knobFreqB.setValue(DEFAULT_STATE.freqB);
    this.knobBlend.setValue(0);

    this.waveformRenderer.updateWave(DEFAULT_STATE);
    this.audioEngine.setFrequencyA(DEFAULT_STATE.freqA);
    this.audioEngine.setFrequencyB(DEFAULT_STATE.freqB);
    this.audioEngine.setBlendMode(DEFAULT_STATE.blendMode);
  }

  public start(): void {
    this.recordBtn.addEventListener('click', () => {
      this.ensureAudioInitialized();

      if (this.audioEngine.getIsRecording()) {
        this.audioEngine.stopRecording();
      } else {
        this.audioEngine.clearRecording();
        this.closePlaybackOverlay();
        const modeIndex = Math.round(this.knobBlend.getValue());
        const safeIndex = Math.max(0, Math.min(BLEND_MODES.length - 1, modeIndex));
        this.audioEngine.startRecording({
          freqA: this.knobFreqA.getValue(),
          freqB: this.knobFreqB.getValue(),
          blendMode: BLEND_MODES[safeIndex]
        });
        this.startRecordingBlink();
      }
    });

    this.resetBtn.addEventListener('click', () => {
      this.resetToDefault();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App('app');
  app.start();
});

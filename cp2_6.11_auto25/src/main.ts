import { parseText, repositionParticles, MAX_CHARS } from './parser';
import { Renderer } from './renderer';
import { AudioController } from './audioController';
import type { Particle, AudioData, ControlParams, PerfMetrics, ToneStyle } from './types';

const DEFAULT_TEXT = '海浪无声 将漫无边际 化作潮汐的呼吸，星光落满 每一个字的缝隙。';
const HUE_SHIFT_PERIOD_MS = 10_000;
const HUE_SHIFT_DEGREES = 5;
const AUDIO_SAMPLE_EVERY_N_FRAMES = 3;

type DOMRefs = {
  loadingOverlay: HTMLDivElement;
  heroTextarea: HTMLTextAreaElement;
  heroCharCount: HTMLSpanElement;
  heroInputContainer: HTMLDivElement;
  panelTextarea: HTMLTextAreaElement;
  panelCharCount: HTMLSpanElement;
  canvas: HTMLCanvasElement;
  playPauseBtn: HTMLButtonElement;
  playPauseText: HTMLSpanElement;
  playIcon: SVGPolygonElement;
  speedSlider: HTMLInputElement;
  speedValue: HTMLSpanElement;
  sizeSlider: HTMLInputElement;
  sizeValue: HTMLSpanElement;
  fpsStat: HTMLDivElement;
  frameTimeStat: HTMLDivElement;
  bpmStat: HTMLDivElement;
  controlPanel: HTMLElement;
  panelToggle: HTMLButtonElement;
  toneButtons: NodeListOf<HTMLButtonElement>;
  mobileControls: HTMLElement;
  mobilePlayBtn: HTMLButtonElement;
  mobilePlayIcon: SVGSVGElement;
  mobileInputBtn: HTMLButtonElement;
  mobileToneBtn: HTMLButtonElement;
  mobileMenuBtn: HTMLButtonElement;
  mobileMenuPanel: HTMLElement;
  mobileSpeedSlider: HTMLInputElement;
  mobileSpeedValue: HTMLSpanElement;
  mobileSizeSlider: HTMLInputElement;
  mobileSizeValue: HTMLSpanElement;
};

class App {
  private dom: DOMRefs;
  private renderer: Renderer;
  private audio: AudioController;
  private particles: Particle[] = [];
  private controlParams: ControlParams;
  private animationFrameId: number = 0;
  private startTime: number = 0;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private audioSampleCounter: number = 0;
  private cachedAudioData: AudioData;
  private perfMetrics: PerfMetrics;
  private perfWindow: number[] = [];
  private fpsWindow: number[] = [];
  private lastPerfUpdate: number = 0;
  private hueStartTime: number = 0;
  private text = DEFAULT_TEXT;
  private resizeRaf: number = 0;
  private mobileToneCycle: ToneStyle[] = ['soft', 'bright', 'dark'];
  private currentToneIndex = 0;

  constructor() {
    this.dom = this.collectDom();
    this.renderer = new Renderer(this.dom.canvas);
    this.audio = new AudioController();
    this.controlParams = {
      speed: 1.0,
      particleSize: 14,
      toneStyle: 'soft',
      isPlaying: false,
      hueOffset: 0
    };
    this.cachedAudioData = {
      bpm: this.audio.getBpm(),
      bassAmplitude: 0,
      midAmplitude: 0,
      highAmplitude: 0,
      spectrum: new Float32Array(256),
      isPlaying: false
    };
    this.perfMetrics = { fps: 0, frameTime: 0, minFps: 60, avgFrameTime: 0 };
  }

  private collectDom(): DOMRefs {
    const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`Missing element #${id}`);
      return el as T;
    };
    const toneButtons = document.querySelectorAll<HTMLButtonElement>('.tone-btn[data-tone]');
    return {
      loadingOverlay: $('loadingOverlay') as HTMLDivElement,
      heroTextarea: $('heroTextarea') as HTMLTextAreaElement,
      heroCharCount: $('heroCharCount') as HTMLSpanElement,
      heroInputContainer: $('inputContainer') as HTMLDivElement,
      panelTextarea: $('panelTextarea') as HTMLTextAreaElement,
      panelCharCount: $('panelCharCount') as HTMLSpanElement,
      canvas: $('mainCanvas') as HTMLCanvasElement,
      playPauseBtn: $('playPauseBtn') as HTMLButtonElement,
      playPauseText: $('playPauseText') as HTMLSpanElement,
      playIcon: $('playIcon') as unknown as SVGPolygonElement,
      speedSlider: $('speedSlider') as HTMLInputElement,
      speedValue: $('speedValue') as HTMLSpanElement,
      sizeSlider: $('sizeSlider') as HTMLInputElement,
      sizeValue: $('sizeValue') as HTMLSpanElement,
      fpsStat: $('fpsStat') as HTMLDivElement,
      frameTimeStat: $('frameTimeStat') as HTMLDivElement,
      bpmStat: $('bpmStat') as HTMLDivElement,
      controlPanel: $('controlPanel') as HTMLElement,
      panelToggle: $('panelToggle') as HTMLButtonElement,
      toneButtons,
      mobileControls: $('mobileControls') as HTMLElement,
      mobilePlayBtn: $('mobilePlayBtn') as HTMLButtonElement,
      mobilePlayIcon: $('mobilePlayIcon') as unknown as SVGSVGElement,
      mobileInputBtn: $('mobileInputBtn') as HTMLButtonElement,
      mobileToneBtn: $('mobileToneBtn') as HTMLButtonElement,
      mobileMenuBtn: $('mobileMenuBtn') as HTMLButtonElement,
      mobileMenuPanel: $('mobileMenuPanel') as HTMLElement,
      mobileSpeedSlider: $('mobileSpeedSlider') as HTMLInputElement,
      mobileSpeedValue: $('mobileSpeedValue') as HTMLSpanElement,
      mobileSizeSlider: $('mobileSizeSlider') as HTMLInputElement,
      mobileSizeValue: $('mobileSizeValue') as HTMLSpanElement,
    };
  }

  init(): void {
    this.bindEvents();
    this.updateText(this.text);
    this.updateHeroInputVisibility();
    this.hideLoading();

    this.startTime = performance.now();
    this.hueStartTime = this.startTime;
    this.lastFrameTime = this.startTime;
    this.lastPerfUpdate = this.startTime;
    this.loop();

    this.handleResponsive();

    setTimeout(() => {
      if (window.innerWidth >= 768) {
        this.dom.controlPanel.classList.remove('collapsed');
      }
    }, 600);
  }

  private hideLoading(): void {
    this.dom.loadingOverlay.classList.add('hidden');
    setTimeout(() => {
      this.dom.loadingOverlay.style.display = 'none';
    }, 600);
  }

  private bindEvents(): void {
    this.dom.heroTextarea.addEventListener('input', e => {
      const val = (e.target as HTMLTextAreaElement).value;
      this.syncText(val, 'hero');
    });
    this.dom.panelTextarea.addEventListener('input', e => {
      const val = (e.target as HTMLTextAreaElement).value;
      this.syncText(val, 'panel');
    });

    this.dom.playPauseBtn.addEventListener('click', () => this.togglePlayback());

    this.dom.speedSlider.addEventListener('input', e => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.setSpeed(val);
    });
    this.dom.sizeSlider.addEventListener('input', e => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      this.setParticleSize(val);
    });

    this.dom.mobileSpeedSlider.addEventListener('input', e => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.setSpeed(val);
    });
    this.dom.mobileSizeSlider.addEventListener('input', e => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      this.setParticleSize(val);
    });

    this.dom.panelToggle.addEventListener('click', () => {
      this.dom.controlPanel.classList.toggle('collapsed');
    });

    this.dom.toneButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tone = btn.dataset.tone as ToneStyle;
        if (tone) this.setToneStyle(tone);
      });
    });

    this.dom.mobileMenuPanel.querySelectorAll<HTMLButtonElement>('.tone-btn[data-tone]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tone = btn.dataset.tone as ToneStyle;
        if (tone) this.setToneStyle(tone);
      });
    });

    this.dom.mobilePlayBtn.addEventListener('click', () => this.togglePlayback());
    this.dom.mobileInputBtn.addEventListener('click', () => {
      this.dom.heroInputContainer.classList.add('active');
      this.dom.heroInputContainer.classList.remove('has-text');
      this.dom.heroTextarea.focus();
    });
    this.dom.mobileToneBtn.addEventListener('click', () => {
      this.currentToneIndex = (this.currentToneIndex + 1) % this.mobileToneCycle.length;
      this.setToneStyle(this.mobileToneCycle[this.currentToneIndex]);
    });
    this.dom.mobileMenuBtn.addEventListener('click', () => {
      this.dom.mobileMenuPanel.classList.toggle('visible');
    });

    document.addEventListener('click', e => {
      const panel = this.dom.mobileMenuPanel;
      const btn = this.dom.mobileMenuBtn;
      if (panel.classList.contains('visible') &&
          !panel.contains(e.target as Node) &&
          !btn.contains(e.target as Node)) {
        panel.classList.remove('visible');
      }
    }, true);

    window.addEventListener('resize', () => {
      if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
      this.resizeRaf = requestAnimationFrame(() => {
        this.handleResize();
        this.handleResponsive();
      });
    });
  }

  private syncText(val: string, source: 'hero' | 'panel'): void {
    const clipped = val.slice(0, MAX_CHARS);
    this.text = clipped;
    if (source === 'hero') {
      if (this.dom.panelTextarea.value !== clipped) {
        this.dom.panelTextarea.value = clipped;
      }
    } else {
      if (this.dom.heroTextarea.value !== clipped) {
        this.dom.heroTextarea.value = clipped;
      }
    }
    this.updateCharCounts(clipped.length);
    this.updateText(clipped);
    this.updateHeroInputVisibility();
  }

  private updateCharCounts(n: number): void {
    this.dom.heroCharCount.textContent = String(n);
    this.dom.panelCharCount.textContent = String(n);
  }

  private updateHeroInputVisibility(): void {
    if (this.text.length > 0) {
      this.dom.heroInputContainer.classList.add('has-text');
      this.dom.heroInputContainer.classList.remove('active');
    } else {
      this.dom.heroInputContainer.classList.add('active');
      this.dom.heroInputContainer.classList.remove('has-text');
    }
  }

  private updateText(raw: string): void {
    this.particles = parseText(
      raw,
      this.renderer.width,
      this.renderer.height,
      this.controlParams.particleSize
    );
    this.renderer.setParticles(this.particles);
  }

  private handleResize(): void {
    this.renderer.resize();
    this.particles = repositionParticles(
      this.particles,
      this.renderer.width,
      this.renderer.height
    );
    if (this.particles.length > 0 && this.controlParams.particleSize > 0) {
      this.particles = parseText(
        this.text,
        this.renderer.width,
        this.renderer.height,
        this.controlParams.particleSize
      );
    }
    this.renderer.setParticles(this.particles);
  }

  private handleResponsive(): void {
    const w = window.innerWidth;
    if (w < 768) {
      this.dom.mobileControls.classList.add('visible');
    } else {
      this.dom.mobileControls.classList.remove('visible');
      this.dom.mobileMenuPanel.classList.remove('visible');
    }
  }

  private setSpeed(val: number): void {
    const v = Math.max(0.5, Math.min(2.0, val));
    this.controlParams.speed = v;
    this.dom.speedValue.textContent = `${v.toFixed(1)}x`;
    this.dom.mobileSpeedValue.textContent = `${v.toFixed(1)}x`;
    this.dom.speedSlider.value = String(v);
    this.dom.mobileSpeedSlider.value = String(v);
  }

  private setParticleSize(val: number): void {
    const v = Math.max(8, Math.min(24, val));
    this.controlParams.particleSize = v;
    this.dom.sizeValue.textContent = `${v}px`;
    this.dom.mobileSizeValue.textContent = `${v}px`;
    this.dom.sizeSlider.value = String(v);
    this.dom.mobileSizeSlider.value = String(v);
    this.updateText(this.text);
  }

  private setToneStyle(style: ToneStyle): void {
    this.controlParams.toneStyle = style;
    this.audio.setToneStyle(style);
    this.currentToneIndex = this.mobileToneCycle.indexOf(style);
    this.dom.toneButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tone === style);
    });
    this.dom.mobileMenuPanel.querySelectorAll<HTMLButtonElement>('.tone-btn[data-tone]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tone === style);
    });
  }

  private async togglePlayback(): Promise<void> {
    if (!this.controlParams.isPlaying) {
      try {
        await this.audio.start();
        this.controlParams.isPlaying = true;
        this.updatePlaybackUI();
      } catch (err) {
        console.warn('Audio start failed', err);
      }
    } else {
      this.audio.pause();
      this.controlParams.isPlaying = false;
      this.updatePlaybackUI();
    }
  }

  private updatePlaybackUI(): void {
    const playing = this.controlParams.isPlaying;
    this.dom.playPauseText.textContent = playing ? '暂停律动' : '开始律动';

    if (playing) {
      this.dom.playIcon.setAttribute('points', '6 4 10 4 10 20 6 20 14 4 18 4 18 20 14 20');
      this.dom.mobilePlayIcon.innerHTML = `
        <rect x="6" y="4" width="4" height="16" rx="1"></rect>
        <rect x="14" y="4" width="4" height="16" rx="1"></rect>
      `;
      this.dom.mobilePlayBtn.classList.add('playing');
    } else {
      this.dom.playIcon.setAttribute('points', '5 3 19 12 5 21 5 3');
      this.dom.mobilePlayIcon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
      this.dom.mobilePlayBtn.classList.remove('playing');
    }
  }

  private updateHueOffset(now: number): void {
    const elapsed = now - this.hueStartTime;
    const cycles = Math.floor(elapsed / HUE_SHIFT_PERIOD_MS);
    this.controlParams.hueOffset = cycles * HUE_SHIFT_DEGREES;
  }

  private updatePerf(now: number, dtMs: number): void {
    this.fpsWindow.push(dtMs);
    this.perfWindow.push(dtMs);
    if (this.perfWindow.length > 300) this.perfWindow.shift();
    if (this.fpsWindow.length > 60) this.fpsWindow.shift();

    if (now - this.lastPerfUpdate > 500) {
      this.lastPerfUpdate = now;
      const avgDt = this.perfWindow.reduce((a, b) => a + b, 0) / this.perfWindow.length;
      const fps60 = this.fpsWindow.length > 0
        ? 1000 / (this.fpsWindow.reduce((a, b) => a + b, 0) / this.fpsWindow.length)
        : 0;
      let minFps = 60;
      for (let i = 0; i < this.perfWindow.length; i++) {
        const instFps = 1000 / this.perfWindow[i];
        if (instFps < minFps) minFps = instFps;
      }

      this.perfMetrics.fps = fps60;
      this.perfMetrics.frameTime = avgDt;
      this.perfMetrics.minFps = minFps;
      this.perfMetrics.avgFrameTime = avgDt;

      this.updatePerfUI();
    }
  }

  private updatePerfUI(): void {
    const fps = Math.round(this.perfMetrics.fps);
    const ft = this.perfMetrics.frameTime.toFixed(1);
    const bpm = this.cachedAudioData.bpm;

    const fpsClass = fps >= 58 ? 'good' : fps >= 55 ? 'warn' : 'bad';
    const ftClass = this.perfMetrics.frameTime <= 12 ? 'good' : this.perfMetrics.frameTime <= 15 ? 'warn' : 'bad';

    this.dom.fpsStat.className = `perf-stat ${fpsClass}`;
    this.dom.fpsStat.textContent = `FPS: ${fps}`;

    this.dom.frameTimeStat.className = `perf-stat ${ftClass}`;
    this.dom.frameTimeStat.textContent = `帧: ${ft}ms`;

    this.dom.bpmStat.className = 'perf-stat good';
    this.dom.bpmStat.textContent = `BPM: ${bpm}`;
  }

  private loop = (): void => {
    this.animationFrameId = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.frameCount++;
    this.audioSampleCounter++;
    if (this.audioSampleCounter >= AUDIO_SAMPLE_EVERY_N_FRAMES) {
      this.audioSampleCounter = 0;
      this.cachedAudioData = this.audio.getAudioData();
    }

    this.updateHueOffset(now);
    this.controlParams.isPlaying = this.cachedAudioData.isPlaying;

    const frameStart = performance.now();

    this.renderer.update(
      (now - this.startTime) / 1000,
      this.cachedAudioData,
      this.controlParams,
      this.frameCount
    );

    this.renderer.render(this.controlParams);

    const frameEnd = performance.now();
    const frameDuration = frameEnd - frameStart;

    this.updatePerf(now, Math.max(dt, 16.67));
    void frameDuration;
  };

  destroy(): void {
    cancelAnimationFrame(this.animationFrameId);
    if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
    this.audio.dispose();
  }
}

function boot(): void {
  const app = new App();
  app.init();
  (window as unknown as { __tidalApp?: App }).__tidalApp = app;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

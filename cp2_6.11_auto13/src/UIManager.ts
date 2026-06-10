import type { AppState, CursorState, Recording, RecordEntry } from './types';

export class UIManager {
  public state: AppState = {
    scaleFactor: 1.0,
    mode: 'single',
    isRecording: false,
    isPlaying: false,
    rippleTime: 0,
    scaleTextTime: 0
  };

  public cursor: CursorState = {
    isActive: false,
    x: 0,
    y: 0,
    isDown: false
  };

  public recordings: Map<string, Recording> = new Map();
  private currentRecording: Recording | null = null;
  private recordingStartTime: number = 0;
  private readonly MAX_RECORD_DURATION = 20000;

  public playStartTime: number = 0;
  public playRecording: Recording | null = null;
  public playIndex: number = 0;
  public playbackProgress: number = 0;

  private lastTriggeredIndex: number = -1;
  private lastTriggeredChord: Set<number> = new Set();

  private domElements: {
    canvas: HTMLCanvasElement | null;
    recordBtn: HTMLElement | null;
    singleBtn: HTMLElement | null;
    chordBtn: HTMLElement | null;
    playBtn: HTMLElement | null;
    codeInput: HTMLInputElement | null;
    playbackPanel: HTMLElement | null;
    playbackCode: HTMLElement | null;
    rippleContainer: HTMLElement | null;
  } = {
    canvas: null,
    recordBtn: null,
    singleBtn: null,
    chordBtn: null,
    playBtn: null,
    codeInput: null,
    playbackPanel: null,
    playbackCode: null,
    rippleContainer: null
  };

  private onTriggerBeam: ((index: number) => void) | null = null;
  private onModeChange: ((mode: 'single' | 'chord') => void) | null = null;
  private onScaleChange: ((scale: number) => void) | null = null;

  constructor() {}

  public init(
    canvas: HTMLCanvasElement,
    onTriggerBeam: (index: number) => void,
    onModeChange: (mode: 'single' | 'chord') => void,
    onScaleChange: (scale: number) => void
  ): void {
    this.domElements.canvas = canvas;
    this.onTriggerBeam = onTriggerBeam;
    this.onModeChange = onModeChange;
    this.onScaleChange = onScaleChange;

    this.domElements.recordBtn = document.getElementById('recordBtn');
    this.domElements.singleBtn = document.getElementById('singleBtn');
    this.domElements.chordBtn = document.getElementById('chordBtn');
    this.domElements.playBtn = document.getElementById('playBtn');
    this.domElements.codeInput = document.getElementById('codeInput') as HTMLInputElement;
    this.domElements.playbackPanel = document.getElementById('playbackPanel');
    this.domElements.playbackCode = document.getElementById('playbackCode');
    this.domElements.rippleContainer = document.getElementById('rippleContainer');

    this.bindDOMEvents();
    this.bindCanvasEvents();
  }

  private bindDOMEvents(): void {
    this.domElements.recordBtn?.addEventListener('click', () => this.toggleRecording());
    this.domElements.singleBtn?.addEventListener('click', () => this.setMode('single'));
    this.domElements.chordBtn?.addEventListener('click', () => this.setMode('chord'));
    this.domElements.playBtn?.addEventListener('click', () => this.startPlayback());
  }

  private bindCanvasEvents(): void {
    const canvas = this.domElements.canvas;
    if (!canvas) return;

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.cursor.x = (e.clientX - rect.left) * (canvas.width / rect.width);
      this.cursor.y = (e.clientY - rect.top) * (canvas.height / rect.height);
      this.cursor.isActive = true;
      this.handleCursorMove();
    });

    canvas.addEventListener('mousedown', (e) => {
      this.cursor.isDown = true;
      const rect = canvas.getBoundingClientRect();
      this.cursor.x = (e.clientX - rect.left) * (canvas.width / rect.width);
      this.cursor.y = (e.clientY - rect.top) * (canvas.height / rect.height);
      this.cursor.isActive = true;
      this.handleCursorMove();
    });

    window.addEventListener('mouseup', () => {
      this.cursor.isDown = false;
      this.lastTriggeredIndex = -1;
      this.lastTriggeredChord.clear();
    });

    canvas.addEventListener('mouseleave', () => {
      this.cursor.isActive = false;
      this.lastTriggeredIndex = -1;
      this.lastTriggeredChord.clear();
    });

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      this.cursor.x = (touch.clientX - rect.left) * (canvas.width / rect.width);
      this.cursor.y = (touch.clientY - rect.top) * (canvas.height / rect.height);
      this.cursor.isActive = true;
      this.cursor.isDown = true;
      this.handleCursorMove();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      this.cursor.x = (touch.clientX - rect.left) * (canvas.width / rect.width);
      this.cursor.y = (touch.clientY - rect.top) * (canvas.height / rect.height);
      this.cursor.isActive = true;
      this.handleCursorMove();
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.cursor.isDown = false;
      this.cursor.isActive = false;
      this.lastTriggeredIndex = -1;
      this.lastTriggeredChord.clear();
    }, { passive: false });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.handleWheel(e.deltaY);
    }, { passive: false });
  }

  private handleWheel(deltaY: number): void {
    const delta = deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(2.0, this.state.scaleFactor + delta));
    if (newScale !== this.state.scaleFactor) {
      this.state.scaleFactor = newScale;
      this.state.scaleTextTime = 150;
      this.onScaleChange?.(newScale);
    }
  }

  public handleCursorMove(): void {}

  public triggerBeamIndex(index: number, beamManager: any): void {
    if (index < 0 || index > 11) return;

    const beamAreaY = beamManager.beamStartY;
    const beamHeight = beamManager.arrayHeight;
    const cursorInBeamY = this.cursor.y >= beamAreaY && this.cursor.y <= beamAreaY + beamHeight + 40;

    if (!cursorInBeamY && !this.state.isPlaying) return;

    if (this.state.mode === 'single') {
      if (this.cursor.isDown || this.state.isPlaying) {
        if (index !== this.lastTriggeredIndex) {
          this.lastTriggeredIndex = index;
          this.fireTrigger(index);
        }
      }
    } else {
      const chordSet = new Set<number>();
      chordSet.add(index);
      if (index > 0) chordSet.add(index - 1);
      if (index < 11) chordSet.add(index + 1);

      if (this.cursor.isDown || this.state.isPlaying) {
        let changed = false;
        for (const idx of chordSet) {
          if (!this.lastTriggeredChord.has(idx)) {
            changed = true;
            this.fireTrigger(idx);
          }
        }
        if (changed) {
          this.lastTriggeredChord = chordSet;
        }
      }
    }
  }

  private fireTrigger(index: number): void {
    this.onTriggerBeam?.(index);

    if (this.state.isRecording && this.currentRecording) {
      const elapsed = performance.now() - this.recordingStartTime;
      if (elapsed <= this.MAX_RECORD_DURATION) {
        this.currentRecording.entries.push({
          beamIndex: index,
          timestamp: elapsed
        });
      }
    }
  }

  private toggleRecording(): void {
    if (!this.state.isRecording) {
      this.state.isRecording = true;
      this.currentRecording = {
        code: '',
        entries: [],
        duration: 0
      };
      this.recordingStartTime = performance.now();
      this.domElements.recordBtn?.classList.add('recording');

      setTimeout(() => {
        if (this.state.isRecording) {
          this.stopRecording();
        }
      }, this.MAX_RECORD_DURATION);
    } else {
      this.stopRecording();
    }
  }

  private stopRecording(): void {
    if (!this.currentRecording) return;
    this.state.isRecording = false;
    this.domElements.recordBtn?.classList.remove('recording');

    const elapsed = performance.now() - this.recordingStartTime;
    this.currentRecording.duration = Math.min(elapsed, this.MAX_RECORD_DURATION);

    let code = '';
    for (let i = 0; i < 6; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    this.currentRecording.code = code;
    this.recordings.set(code, this.currentRecording);

    if (this.domElements.playbackCode) {
      this.domElements.playbackCode.textContent = code;
    }
    this.domElements.playbackPanel?.classList.add('show');

    setTimeout(() => {
      this.domElements.playbackPanel?.classList.remove('show');
    }, 5000);

    this.currentRecording = null;
  }

  private setMode(mode: 'single' | 'chord'): void {
    if (this.state.mode === mode) return;
    this.state.mode = mode;
    this.onModeChange?.(mode);

    if (mode === 'single') {
      this.domElements.singleBtn?.classList.add('active');
      this.domElements.chordBtn?.classList.remove('active');
    } else {
      this.domElements.chordBtn?.classList.add('active');
      this.domElements.singleBtn?.classList.remove('active');
    }

    this.triggerRipple();
  }

  private triggerRipple(): void {
    const container = this.domElements.rippleContainer;
    if (!container) return;

    const ripple = document.createElement('div');
    ripple.className = 'ripple animate';
    container.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 800);
  }

  private startPlayback(): void {
    const code = this.domElements.codeInput?.value.trim() || '';
    if (code.length !== 6) return;

    const recording = this.recordings.get(code);
    if (!recording) {
      if (this.domElements.codeInput) {
        this.domElements.codeInput.style.borderColor = '#FF4040';
        setTimeout(() => {
          if (this.domElements.codeInput) {
            this.domElements.codeInput.style.borderColor = '';
          }
        }, 600);
      }
      return;
    }

    this.state.isPlaying = true;
    this.playRecording = recording;
    this.playStartTime = performance.now();
    this.playIndex = 0;
    this.playbackProgress = 0;
  }

  public updatePlayback(beamManager: any): void {
    if (!this.state.isPlaying || !this.playRecording) return;

    const elapsed = performance.now() - this.playStartTime;
    const duration = this.playRecording.duration;
    this.playbackProgress = Math.min(1, elapsed / duration);

    while (
      this.playIndex < this.playRecording.entries.length &&
      this.playRecording.entries[this.playIndex].timestamp <= elapsed
    ) {
      const entry = this.playRecording.entries[this.playIndex];
      this.fireTrigger(entry.beamIndex);
      this.playIndex++;
    }

    if (elapsed >= duration + 500) {
      this.state.isPlaying = false;
      this.playRecording = null;
      this.playbackProgress = 0;
    }
  }

  public handleInput(beamManager: any): void {
    this.updatePlayback(beamManager);

    if (this.state.scaleTextTime > 0) {
      this.state.scaleTextTime--;
    }

    if (this.cursor.isActive) {
      const idx = beamManager.findBeamIndexAt(this.cursor.x, this.cursor.y);
      if (idx >= 0) {
        this.triggerBeamIndex(idx, beamManager);
      } else {
        this.lastTriggeredIndex = -1;
        this.lastTriggeredChord.clear();
      }
    }
  }

  public drawScaleText(ctx: CanvasRenderingContext2D, canvasWidth: number, beamStartY: number): void {
    if (this.state.scaleTextTime <= 0) return;

    const alpha = Math.min(1, this.state.scaleTextTime / 60);
    const text = this.state.scaleFactor.toFixed(1) + 'x';

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 5;
    ctx.fillText(text, canvasWidth / 2, beamStartY - 20);
    ctx.restore();
  }

  public drawPlaybackProgress(
    ctx: CanvasRenderingContext2D,
    beamStartX: number,
    beamArrayWidth: number,
    beamStartY: number,
    beamHeight: number
  ): void {
    if (!this.state.isPlaying) return;

    const barY = beamStartY + beamHeight + 20;
    const barHeight = 3;
    const totalWidth = beamArrayWidth;

    const progressWidth = totalWidth * this.playbackProgress;
    const speedPxPerSec = 200;

    ctx.save();
    const grad = ctx.createLinearGradient(beamStartX, barY, beamStartX + totalWidth, barY);
    grad.addColorStop(0, 'rgba(74, 158, 255, 0.3)');
    grad.addColorStop(1, 'rgba(74, 158, 255, 0.9)');

    ctx.fillStyle = grad;
    ctx.shadowColor = '#4A9EFF';
    ctx.shadowBlur = 10;
    ctx.fillRect(beamStartX, barY, progressWidth, barHeight);

    ctx.fillStyle = '#4A9EFF';
    ctx.beginPath();
    ctx.arc(beamStartX + progressWidth, barY + barHeight / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

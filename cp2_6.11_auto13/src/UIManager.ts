import type { AppState, CursorState, Recording, RecordEntry, BeamManagerLike } from './types';

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
  private readonly MAX_RECORD_DURATION: number = 20000;
  private readonly PROGRESS_SPEED_PX_PER_SEC: number = 200;

  public playStartTime: number = 0;
  public playRecording: Recording | null = null;
  public playIndex: number = 0;
  public playbackProgressX: number = 0;

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

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      this.updateCursorFromEvent(e.clientX, e.clientY);
      this.cursor.isActive = true;
    });

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      this.cursor.isDown = true;
      this.updateCursorFromEvent(e.clientX, e.clientY);
      this.cursor.isActive = true;
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

    canvas.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      const touch: Touch | undefined = e.touches[0];
      if (touch) {
        this.updateCursorFromEvent(touch.clientX, touch.clientY);
        this.cursor.isActive = true;
        this.cursor.isDown = true;
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault();
      const touch: Touch | undefined = e.touches[0];
      if (touch) {
        this.updateCursorFromEvent(touch.clientX, touch.clientY);
        this.cursor.isActive = true;
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e: TouchEvent) => {
      e.preventDefault();
      this.cursor.isDown = false;
      this.cursor.isActive = false;
      this.lastTriggeredIndex = -1;
      this.lastTriggeredChord.clear();
    }, { passive: false });

    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      this.handleWheel(e.deltaY);
    }, { passive: false });
  }

  private updateCursorFromEvent(clientX: number, clientY: number): void {
    const canvas = this.domElements.canvas;
    if (!canvas) return;

    const rect: DOMRect = canvas.getBoundingClientRect();
    const scaleX: number = canvas.width / rect.width;
    const scaleY: number = canvas.height / rect.height;
    this.cursor.x = (clientX - rect.left) * scaleX;
    this.cursor.y = (clientY - rect.top) * scaleY;
  }

  private handleWheel(deltaY: number): void {
    const delta: number = deltaY > 0 ? -0.1 : 0.1;
    const newScale: number = Math.max(0.5, Math.min(2.0, this.state.scaleFactor + delta));
    if (Math.abs(newScale - this.state.scaleFactor) > 0.001) {
      this.state.scaleFactor = newScale;
      this.state.scaleTextTime = 150;
      this.onScaleChange?.(newScale);
    }
  }

  public triggerBeamIndex(index: number, beamManager: BeamManagerLike): void {
    if (index < 0 || index > 11) return;

    const beamAreaY: number = beamManager.beamStartY;
    const beamHeight: number = beamManager.arrayHeight;
    const cursorInBeamY: boolean = this.cursor.y >= beamAreaY && this.cursor.y <= beamAreaY + beamHeight + 40;

    if (!cursorInBeamY && !this.state.isPlaying) return;

    if (this.state.mode === 'single') {
      if (this.cursor.isDown || this.state.isPlaying) {
        if (index !== this.lastTriggeredIndex) {
          this.lastTriggeredIndex = index;
          this.fireTrigger(index);
        }
      }
    } else {
      const chordSet: Set<number> = new Set<number>();
      chordSet.add(index);
      if (index > 0) chordSet.add(index - 1);
      if (index < 11) chordSet.add(index + 1);

      if (this.cursor.isDown || this.state.isPlaying) {
        let changed: boolean = false;
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
      const elapsed: number = performance.now() - this.recordingStartTime;
      if (elapsed <= this.MAX_RECORD_DURATION) {
        const entry: RecordEntry = {
          beamIndex: index,
          timestamp: elapsed
        };
        this.currentRecording.entries.push(entry);
      }
    }
  }

  private toggleRecording(): void {
    if (!this.state.isRecording) {
      this.startRecording();
    } else {
      this.stopRecording();
    }
  }

  private startRecording(): void {
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
  }

  private stopRecording(): void {
    if (!this.currentRecording) return;
    this.state.isRecording = false;
    this.domElements.recordBtn?.classList.remove('recording');

    const elapsed: number = performance.now() - this.recordingStartTime;
    this.currentRecording.duration = Math.min(elapsed, this.MAX_RECORD_DURATION);

    const code: string = this.generateUniqueCode();
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

  private generateUniqueCode(): string {
    let code: string = '';
    let attempts: number = 0;
    const maxAttempts: number = 100;

    do {
      code = '';
      for (let i: number = 0; i < 6; i++) {
        code += Math.floor(Math.random() * 10).toString();
      }
      attempts++;
    } while (this.recordings.has(code) && attempts < maxAttempts);

    return code;
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

    const ripple: HTMLDivElement = document.createElement('div');
    ripple.className = 'ripple animate';
    container.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 800);
  }

  private startPlayback(): void {
    const code: string = this.domElements.codeInput?.value.trim() || '';
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      this.shakeInput();
      return;
    }

    const recording: Recording | undefined = this.recordings.get(code);
    if (!recording) {
      this.shakeInput();
      return;
    }

    this.state.isPlaying = true;
    this.playRecording = recording;
    this.playStartTime = performance.now();
    this.playIndex = 0;
    this.playbackProgressX = 0;
  }

  private shakeInput(): void {
    const input = this.domElements.codeInput;
    if (!input) return;
    input.style.borderColor = '#FF4040';
    setTimeout(() => {
      if (input) {
        input.style.borderColor = '';
      }
    }, 600);
  }

  public updatePlayback(beamStartX: number, beamArrayWidth: number): void {
    if (!this.state.isPlaying || !this.playRecording) return;

    const elapsed: number = performance.now() - this.playStartTime;
    const duration: number = this.playRecording.duration;

    this.playbackProgressX = Math.min(
      beamArrayWidth,
      (elapsed / 1000) * this.PROGRESS_SPEED_PX_PER_SEC
    );

    while (
      this.playIndex < this.playRecording.entries.length &&
      this.playRecording.entries[this.playIndex].timestamp <= elapsed
    ) {
      const entry: RecordEntry = this.playRecording.entries[this.playIndex];
      this.fireTrigger(entry.beamIndex);
      this.playIndex++;
    }

    if (elapsed >= duration + 500) {
      this.state.isPlaying = false;
      this.playRecording = null;
      this.playbackProgressX = 0;
    }
  }

  public handleInput(beamManager: BeamManagerLike, beamStartX: number, beamArrayWidth: number): void {
    this.updatePlayback(beamStartX, beamArrayWidth);

    if (this.state.scaleTextTime > 0) {
      this.state.scaleTextTime--;
    }

    if (this.cursor.isActive) {
      const idx: number = beamManager.findBeamIndexAt(this.cursor.x, this.cursor.y);
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

    const alpha: number = Math.min(1, this.state.scaleTextTime / 60);
    const text: string = this.state.scaleFactor.toFixed(1) + 'x';

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

    const barY: number = beamStartY + beamHeight + 20;
    const barHeight: number = 3;
    const progressX: number = this.playbackProgressX;

    const clampedProgress: number = Math.max(0, Math.min(beamArrayWidth, progressX));

    ctx.save();
    const grad: CanvasGradient = ctx.createLinearGradient(beamStartX, barY, beamStartX + clampedProgress, barY);
    grad.addColorStop(0, 'rgba(74, 158, 255, 0.3)');
    grad.addColorStop(1, 'rgba(74, 158, 255, 0.9)');

    ctx.fillStyle = grad;
    ctx.shadowColor = '#4A9EFF';
    ctx.shadowBlur = 10;
    ctx.fillRect(beamStartX, barY, clampedProgress, barHeight);

    ctx.fillStyle = '#4A9EFF';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(beamStartX + clampedProgress, barY + barHeight / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

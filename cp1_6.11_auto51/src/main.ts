import { AudioEngine } from './audio';
import { DrawEngine } from './draw';
import { NoteColor, NOTE_COLORS, FPS_TARGET } from './config';

class GameApp {
  private canvas: HTMLCanvasElement;
  private audioEngine: AudioEngine;
  private drawEngine: DrawEngine;
  private playBtn: HTMLButtonElement;
  private undoBtn: HTMLButtonElement;
  private clearBtn: HTMLButtonElement;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLElement;
  private loading: HTMLElement;

  private lastTime: number = 0;
  private animFrameId: number | null = null;
  private isDragging: boolean = false;
  private dragColor: NoteColor | null = null;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.playBtn = document.getElementById('playBtn') as HTMLButtonElement;
    this.undoBtn = document.getElementById('undoBtn') as HTMLButtonElement;
    this.clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
    this.speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
    this.speedValue = document.getElementById('speedValue') as HTMLElement;
    this.loading = document.getElementById('loading') as HTMLElement;

    this.audioEngine = new AudioEngine();
    this.drawEngine = new DrawEngine(this.canvas);

    this.init();
  }

  private init(): void {
    this.setupEventListeners();
    this.setupAudioCallbacks();
    this.syncNotesToAudio();
    this.hideLoading();
    this.startGameLoop();
  }

  private hideLoading(): void {
    setTimeout(() => {
      this.loading.classList.add('hidden');
    }, 300);
  }

  private setupEventListeners(): void {
    const noteBtns = document.querySelectorAll('.note-btn');
    noteBtns.forEach((btn) => {
      (btn as HTMLElement).addEventListener('dragstart', (e: DragEvent) => {
        const color = (btn as HTMLElement).dataset.color as NoteColor;
        this.dragColor = color;
        this.isDragging = true;
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'copy';
          e.dataTransfer.setData('text/plain', color);
        }
      });

      (btn as HTMLElement).addEventListener('dragend', () => {
        this.isDragging = false;
        this.dragColor = null;
        this.drawEngine.setDragPreview(null);
      });
    });

    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      if (this.dragColor) {
        const pos = this.getCanvasPos(e);
        this.drawEngine.setDragPreview({
          color: this.dragColor,
          x: pos.x,
          y: pos.y,
        });
      }
    });

    this.canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      const color = (e.dataTransfer?.getData('text/plain') || this.dragColor) as NoteColor;
      if (color && NOTE_COLORS[color]) {
        const pos = this.getCanvasPos(e);
        this.drawEngine.addNote(color, pos.x, pos.y);
        this.syncNotesToAudio();
      }
      this.isDragging = false;
      this.dragColor = null;
      this.drawEngine.setDragPreview(null);
    });

    this.canvas.addEventListener('dragleave', () => {
      this.drawEngine.setDragPreview(null);
    });

    this.playBtn.addEventListener('click', () => {
      this.togglePlayback();
    });

    this.undoBtn.addEventListener('click', () => {
      this.undoLastNote();
    });

    this.clearBtn.addEventListener('click', () => {
      this.clearAll();
    });

    this.speedSlider.addEventListener('input', () => {
      const speed = parseFloat(this.speedSlider.value);
      this.updateSpeed(speed);
    });

    window.addEventListener('resize', () => {
      this.drawEngine.resize();
    });
  }

  private setupAudioCallbacks(): void {
    this.audioEngine.onNotePlayed((_color: NoteColor, index: number) => {
      this.drawEngine.triggerNotePulse(index);
    });

    this.audioEngine.onPlayComplete(() => {});
  }

  private getCanvasPos(e: MouseEvent | DragEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : 0;
    const clientY = 'clientY' in e ? e.clientY : 0;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private syncNotesToAudio(): void {
    const drawNotes = this.drawEngine.getNotes();
    this.audioEngine.setNotes(
      drawNotes.map((n) => ({
        color: n.color,
        x: n.x,
        y: n.y,
        id: n.id,
      }))
    );
  }

  private togglePlayback(): void {
    if (this.audioEngine.getIsPlaying()) {
      this.audioEngine.stopPlayback();
      this.playBtn.textContent = '播放';
    } else {
      this.audioEngine.startPlayback();
      this.playBtn.textContent = '暂停';
    }
  }

  private undoLastNote(): void {
    if (this.audioEngine.getIsPlaying()) {
      this.audioEngine.stopPlayback();
      this.playBtn.textContent = '播放';
    }
    this.drawEngine.removeLastNote();
    this.syncNotesToAudio();
  }

  private clearAll(): void {
    if (this.audioEngine.getIsPlaying()) {
      this.audioEngine.stopPlayback();
      this.playBtn.textContent = '播放';
    }
    this.drawEngine.clearAll();
    this.syncNotesToAudio();
  }

  private updateSpeed(speed: number): void {
    this.speedValue.textContent = speed.toFixed(1) + 'x';
    this.audioEngine.setSpeed(speed);
    this.drawEngine.setSpeed(speed);

    if (this.audioEngine.getIsPlaying()) {
      this.audioEngine.stopPlayback();
      this.audioEngine.startPlayback();
    }
  }

  private startGameLoop(): void {
    const targetInterval = 1000 / FPS_TARGET;
    let lastFrameTime = performance.now();
    let accumulator = 0;

    const loop = (now: number) => {
      this.animFrameId = requestAnimationFrame(loop);

      const frameTime = now - lastFrameTime;
      lastFrameTime = now;

      accumulator += frameTime;

      while (accumulator >= targetInterval) {
        const dt = targetInterval / 1000;
        this.drawEngine.update(dt);
        accumulator -= targetInterval;
      }

      this.drawEngine.render();
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.audioEngine.destroy();
  }
}

let app: GameApp | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new GameApp();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.destroy();
  }
});

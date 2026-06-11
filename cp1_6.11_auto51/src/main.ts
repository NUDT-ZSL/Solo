import { AudioEngine } from './audio';
import { DrawEngine } from './draw';
import {
  NoteColor,
  NOTE_COLORS,
  FPS_TARGET,
  PlacedNote,
  DragPreview,
} from './config';

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
  private noteToolButtons: HTMLElement[];

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
    this.noteToolButtons = Array.from(
      document.querySelectorAll<HTMLElement>('.note-btn')
    );

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
    this.noteToolButtons.forEach((btn) => {
      btn.addEventListener('dragstart', this.handleToolDragStart);
      btn.addEventListener('dragend', this.handleToolDragEnd);
    });

    this.canvas.addEventListener('dragover', this.handleCanvasDragOver);
    this.canvas.addEventListener('drop', this.handleCanvasDrop);
    this.canvas.addEventListener('dragleave', this.handleCanvasDragLeave);

    this.playBtn.addEventListener('click', this.handlePlayToggle);
    this.undoBtn.addEventListener('click', this.handleUndo);
    this.clearBtn.addEventListener('click', this.handleClear);
    this.speedSlider.addEventListener('input', this.handleSpeedChange);

    window.addEventListener('resize', this.handleResize);
  }

  private handleToolDragStart = (e: DragEvent): void => {
    const color = (e.currentTarget as HTMLElement).dataset.color as NoteColor;
    if (!color || !NOTE_COLORS[color]) return;
    this.dragColor = color;
    this.isDragging = true;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', color);
    }
  };

  private handleToolDragEnd = (): void => {
    this.isDragging = false;
    this.dragColor = null;
    this.drawEngine.setDragPreview(null);
  };

  private handleCanvasDragOver = (e: DragEvent): void => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    if (this.dragColor) {
      const pos = this.getCanvasPosFromDrag(e);
      const preview: DragPreview = {
        color: this.dragColor,
        x: pos.x,
        y: pos.y,
      };
      this.drawEngine.setDragPreview(preview);
    }
  };

  private handleCanvasDrop = (e: DragEvent): void => {
    e.preventDefault();
    const color =
      (e.dataTransfer?.getData('text/plain') as NoteColor) || this.dragColor;

    if (color && NOTE_COLORS[color]) {
      const pos = this.getCanvasPosFromDrag(e);
      this.drawEngine.addNote(color, pos.x, pos.y);
      this.syncNotesToAudio();
    }

    this.isDragging = false;
    this.dragColor = null;
    this.drawEngine.setDragPreview(null);
  };

  private handleCanvasDragLeave = (): void => {
    this.drawEngine.setDragPreview(null);
  };

  private handlePlayToggle = (): void => {
    this.togglePlayback();
  };

  private handleUndo = (): void => {
    this.undoLastNote();
  };

  private handleClear = (): void => {
    this.clearAll();
  };

  private handleSpeedChange = (): void => {
    const speed = parseFloat(this.speedSlider.value);
    this.updateSpeed(speed);
  };

  private handleResize = (): void => {
    this.drawEngine.resize();
  };

  private setupAudioCallbacks(): void {
    this.audioEngine.onNotePlayed((_color: NoteColor, index: number) => {
      this.drawEngine.triggerNotePulse(index);
    });

    this.audioEngine.onPlayComplete(() => {});
  }

  private getCanvasPosFromDrag(e: DragEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private syncNotesToAudio(): void {
    const drawNotes: PlacedNote[] = this.drawEngine.getNotes();
    this.audioEngine.setNotes(drawNotes);
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
    const wasPlaying = this.audioEngine.getIsPlaying();
    if (wasPlaying) {
      this.audioEngine.stopPlayback();
      this.playBtn.textContent = '播放';
    }
    this.drawEngine.removeLastNote();

    const halfDuration = 150;
    window.setTimeout(() => {
      this.syncNotesToAudio();
    }, halfDuration);
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
  }

  private startGameLoop(): void {
    const targetInterval = 1000 / FPS_TARGET;
    let lastFrameTime = performance.now();
    let accumulator = 0;

    const loop = (now: number) => {
      this.animFrameId = requestAnimationFrame(loop);

      const frameTime = Math.min(now - lastFrameTime, 100);
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

    this.noteToolButtons.forEach((btn) => {
      btn.removeEventListener('dragstart', this.handleToolDragStart);
      btn.removeEventListener('dragend', this.handleToolDragEnd);
    });

    this.canvas.removeEventListener('dragover', this.handleCanvasDragOver);
    this.canvas.removeEventListener('drop', this.handleCanvasDrop);
    this.canvas.removeEventListener('dragleave', this.handleCanvasDragLeave);

    this.playBtn.removeEventListener('click', this.handlePlayToggle);
    this.undoBtn.removeEventListener('click', this.handleUndo);
    this.clearBtn.removeEventListener('click', this.handleClear);
    this.speedSlider.removeEventListener('input', this.handleSpeedChange);
    window.removeEventListener('resize', this.handleResize);

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

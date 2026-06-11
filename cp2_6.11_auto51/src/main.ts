import { AudioEngine } from './audio';
import { DrawEngine } from './draw';
import { NoteColor, PLAYBACK, NOTE_COLORS } from './config';

class GameApp {
  private audio: AudioEngine;
  private draw: DrawEngine;
  private canvas: HTMLCanvasElement;
  private canvasWrapper: HTMLElement;

  private isPlaying: boolean = false;
  private playbackSpeed: number = PLAYBACK.DEFAULT_SPEED;
  private cancelPlayback: (() => void) | null = null;

  private isDragging: boolean = false;
  private dragColor: NoteColor | null = null;

  private btnPlay: HTMLButtonElement;
  private btnUndo: HTMLButtonElement;
  private btnClear: HTMLButtonElement;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLElement;
  private dragGhost: HTMLElement;
  private loadingEl: HTMLElement;

  private lastFrameTime: number = 0;
  private rafId: number = 0;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.canvasWrapper = document.getElementById('canvas-wrapper') as HTMLElement;

    this.btnPlay = document.getElementById('btn-play') as HTMLButtonElement;
    this.btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;
    this.btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.speedValue = document.getElementById('speed-value') as HTMLElement;
    this.dragGhost = document.getElementById('drag-ghost') as HTMLElement;
    this.loadingEl = document.getElementById('loading') as HTMLElement;

    this.audio = new AudioEngine();
    this.draw = new DrawEngine(this.canvas);

    this.init();
  }

  private init(): void {
    this.setupAudioCallbacks();
    this.setupEventListeners();
    this.setupResizeObserver();
    this.startGameLoop();

    window.setTimeout(() => {
      this.loadingEl.classList.add('fade-out');
      window.setTimeout(() => {
        this.loadingEl.style.display = 'none';
      }, 600);
    }, 800);
  }

  private setupAudioCallbacks(): void {
    this.audio.onNotePlay((color: NoteColor) => {
      const notes = this.draw.getNotes();
      for (let i = 0; i < notes.length; i++) {
        if (notes[i].color === color && notes[i].isPlaying) {
          this.draw.emitParticles(notes[i].x, notes[i].y, color, this.playbackSpeed);
          this.draw.shiftBackground(color);
          break;
        }
      }
    });
  }

  private setupEventListeners(): void {
    const toolNotes = document.querySelectorAll<HTMLElement>('.tool-note');
    toolNotes.forEach((el) => {
      el.addEventListener('dragstart', (e) => this.onToolDragStart(e, el));
      el.addEventListener('mousedown', (e) => this.onToolMouseDown(e, el));
    });

    this.canvas.addEventListener('dragover', (e) => this.onCanvasDragOver(e));
    this.canvas.addEventListener('drop', (e) => this.onCanvasDrop(e));
    this.canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onCanvasMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => this.onCanvasMouseLeave());

    document.addEventListener('mousemove', (e) => this.onDocMouseMove(e));
    document.addEventListener('mouseup', () => this.onDocMouseUp());

    this.btnPlay.addEventListener('click', () => this.onPlayClick());
    this.btnUndo.addEventListener('click', () => this.onUndoClick());
    this.btnClear.addEventListener('click', () => this.onClearClick());

    this.speedSlider.addEventListener('input', () => this.onSpeedChange());

    document.addEventListener('click', () => this.audio.resume(), { once: true });
    document.addEventListener('keydown', () => this.audio.resume(), { once: true });
  }

  private setupResizeObserver(): void {
    const ro = new ResizeObserver(() => {
      this.draw.resize();
    });
    ro.observe(this.canvasWrapper);
  }

  private onToolDragStart(e: DragEvent, el: HTMLElement): void {
    const color = el.dataset.color as NoteColor;
    if (!color) return;
    this.dragColor = color;
    e.dataTransfer?.setData('text/plain', color);
    e.dataTransfer!.effectAllowed = 'copy';
  }

  private onToolMouseDown(e: MouseEvent, el: HTMLElement): void {
    const color = el.dataset.color as NoteColor;
    if (!color) return;
    this.isDragging = true;
    this.dragColor = color;
    this.dragGhost.style.display = 'block';
    this.dragGhost.style.background = NOTE_COLORS[color].hex;
    this.dragGhost.style.boxShadow = `0 0 20px ${NOTE_COLORS[color].hex}`;
    this.updateGhostPosition(e.clientX, e.clientY);
    e.preventDefault();
  }

  private onDocMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      this.updateGhostPosition(e.clientX, e.clientY);
    }
  }

  private onDocMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragColor = null;
      this.dragGhost.style.display = 'none';
      this.draw.setDragPreview(null);
    }
  }

  private onCanvasMouseMove(e: MouseEvent): void {
    if (this.isDragging && this.dragColor) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.draw.setDragPreview(this.dragColor, x, y);
    }
  }

  private onCanvasMouseUp(e: MouseEvent): void {
    if (this.isDragging && this.dragColor) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.placeNote(this.dragColor, x, y);
      this.isDragging = false;
      this.dragColor = null;
      this.dragGhost.style.display = 'none';
      this.draw.setDragPreview(null);
    }
  }

  private onCanvasMouseLeave(): void {
    if (this.isDragging) {
      this.draw.setDragPreview(null);
    }
  }

  private onCanvasDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  private onCanvasDrop(e: DragEvent): void {
    e.preventDefault();
    const color = e.dataTransfer?.getData('text/plain') as NoteColor;
    if (!color) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.placeNote(color, x, y);
    this.dragColor = null;
  }

  private updateGhostPosition(x: number, y: number): void {
    this.dragGhost.style.left = x + 'px';
    this.dragGhost.style.top = y + 'px';
  }

  private placeNote(color: NoteColor, x: number, y: number): void {
    const padding = 24;
    const w = this.canvasWrapper.clientWidth;
    const h = this.canvasWrapper.clientHeight;
    const clampedX = Math.max(padding, Math.min(w - padding, x));
    const clampedY = Math.max(padding, Math.min(h - padding, y));
    this.draw.addNote(color, clampedX, clampedY);

    if (this.isPlaying) {
      this.restartPlayback();
    }
  }

  private onPlayClick(): void {
    this.audio.resume();
    if (this.isPlaying) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
  }

  private startPlayback(): void {
    const notes = this.draw.getNotes();
    if (notes.length === 0) return;

    this.isPlaying = true;
    this.btnPlay.textContent = '⏸ 暂停';

    const colors = notes.map((n) => n.color);
    this.cancelPlayback = this.audio.scheduleSequence(colors, this.playbackSpeed, (index) => {
      this.draw.triggerNotePulse(index);
      const note = notes[index];
      if (note) {
        this.draw.emitParticles(note.x, note.y, note.color, this.playbackSpeed);
        this.draw.shiftBackground(note.color);
      }
    });
  }

  private stopPlayback(): void {
    this.isPlaying = false;
    this.btnPlay.textContent = '▶ 播放';
    if (this.cancelPlayback) {
      this.cancelPlayback();
      this.cancelPlayback = null;
    }
  }

  private restartPlayback(): void {
    this.stopPlayback();
    window.setTimeout(() => this.startPlayback(), 100);
  }

  private onUndoClick(): void {
    const removed = this.draw.removeLastNote();
    if (removed && this.isPlaying) {
      this.restartPlayback();
    }
    if (!removed && this.isPlaying) {
      this.stopPlayback();
    }
  }

  private onClearClick(): void {
    this.draw.clearAll();
    this.stopPlayback();
  }

  private onSpeedChange(): void {
    const value = parseFloat(this.speedSlider.value);
    this.playbackSpeed = value;
    this.speedValue.textContent = value.toFixed(1) + 'x';
    if (this.isPlaying) {
      this.restartPlayback();
    }
  }

  private startGameLoop(): void {
    this.lastFrameTime = performance.now();
    const loop = (now: number) => {
      const delta = Math.min(0.05, (now - this.lastFrameTime) / 1000);
      this.lastFrameTime = now;
      this.update(delta);
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private update(deltaTime: number): void {
    this.draw.update(deltaTime);
  }

  private render(): void {
    this.draw.render();
  }

  public destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.stopPlayback();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});

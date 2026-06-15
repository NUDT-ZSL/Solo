import { Editor, type Level, type ToolType } from './editor';
import { Player } from './player';
import { AudioManager } from './audio';

const STORAGE_KEY = 'rhythm_runner_levels';

interface SavedLevels {
  [id: string]: Level;
}

class GameApp {
  private editor: Editor;
  private player: Player;
  private audio: AudioManager;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private timelineCanvas: HTMLCanvasElement;

  private isPlaying = false;
  private lastTime = 0;
  private animationId = 0;

  private flashOverlay: HTMLElement;

  private toolButtons: NodeListOf<HTMLElement>;
  private beatToolBtn: HTMLElement;
  private playBtn: HTMLElement;
  private stopBtn: HTMLElement;
  private undoBtn: HTMLElement;
  private redoBtn: HTMLElement;
  private undoStatus: HTMLElement;
  private saveBtn: HTMLElement;
  private levelNameInput: HTMLInputElement;
  private levelList: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.timelineCanvas = document.getElementById('timelineCanvas') as HTMLCanvasElement;
    this.flashOverlay = document.getElementById('flashOverlay')!;

    this.toolButtons = document.querySelectorAll('.tool-btn');
    this.beatToolBtn = document.getElementById('beatToolBtn')!;
    this.playBtn = document.getElementById('playBtn')!;
    this.stopBtn = document.getElementById('stopBtn')!;
    this.undoBtn = document.getElementById('undoBtn')!;
    this.redoBtn = document.getElementById('redoBtn')!;
    this.undoStatus = document.getElementById('undoStatus')!;
    this.saveBtn = document.getElementById('saveBtn')!;
    this.levelNameInput = document.getElementById('levelNameInput') as HTMLInputElement;
    this.levelList = document.getElementById('levelList')!;

    this.editor = new Editor(this.canvas, this.timelineCanvas);
    this.player = new Player(this.editor.getGroundY());
    this.audio = new AudioManager();

    this.audio.setObserver(this.player.state);

    this.bindEvents();
    this.editor.onChange(() => this.updateUI());
    this.player.onCollision(() => this.onCollision());
    this.player.onFinish(() => this.onFinish());

    this.loadSavedLevels();
    this.updateUI();
    this.start();
  }

  private bindEvents(): void {
    this.toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool') as ToolType;
        this.toggleTool(tool);
      });
    });

    this.beatToolBtn.addEventListener('click', () => {
      this.toggleTool('beat');
    });

    this.playBtn.addEventListener('click', () => this.startPlayback());
    this.stopBtn.addEventListener('click', () => this.stopPlayback());

    this.undoBtn.addEventListener('click', () => this.editor.undo());
    this.redoBtn.addEventListener('click', () => this.editor.redo());

    this.saveBtn.addEventListener('click', () => this.saveLevel());

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.editor.redo();
        } else {
          this.editor.undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        this.editor.redo();
      }
      if (e.key === 'Escape') {
        this.editor.setTool(null);
      }
    });
  }

  private toggleTool(tool: ToolType): void {
    if (this.isPlaying) return;
    const current = this.editor.selectedTool;
    this.editor.setTool(current === tool ? null : tool);
  }

  private startPlayback(): void {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.editor.setTool(null);
    this.player.start();
    this.audio.setBeats(this.editor.beats.map(b => ({ x: b.x })));
    this.audio.start();

    this.updateUI();
  }

  private stopPlayback(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.player.stop();
    this.audio.stop();
    this.editor.setScrollX(0);

    this.updateUI();
  }

  private onCollision(): void {
    this.audio.playHit();
    this.flashOverlay.classList.remove('active');
    void this.flashOverlay.offsetWidth;
    this.flashOverlay.classList.add('active');
    setTimeout(() => {
      this.stopPlayback();
    }, 300);
  }

  private onFinish(): void {
    this.audio.playSuccess();
    setTimeout(() => {
      this.stopPlayback();
    }, 500);
  }

  private saveLevel(): void {
    const name = this.levelNameInput.value.trim();
    if (!name) {
      this.levelNameInput.focus();
      return;
    }

    const level = this.editor.getLevelData(name);
    const saved = this.getSavedLevels();
    saved[level.id] = level;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    this.levelNameInput.value = '';
    this.loadSavedLevels();
  }

  private getSavedLevels(): SavedLevels {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private loadSavedLevels(): void {
    const saved = this.getSavedLevels();
    const levels = Object.values(saved).sort((a, b) => b.createdAt - a.createdAt);

    if (levels.length === 0) {
      this.levelList.innerHTML = '<div class="empty-levels">暂无保存的关卡</div>';
      return;
    }

    this.levelList.innerHTML = '';
    for (const level of levels) {
      const item = document.createElement('div');
      item.className = 'level-item';

      const name = document.createElement('div');
      name.className = 'level-item-name';
      name.textContent = level.name;
      name.title = level.name;

      const actions = document.createElement('div');
      actions.className = 'level-item-actions';

      const loadBtn = document.createElement('button');
      loadBtn.className = 'level-btn';
      loadBtn.textContent = '加载';
      loadBtn.addEventListener('click', () => {
        if (this.isPlaying) return;
        this.editor.loadLevel(level);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'level-btn';
      deleteBtn.textContent = '删除';
      deleteBtn.addEventListener('click', () => {
        if (this.isPlaying) return;
        const saved = this.getSavedLevels();
        delete saved[level.id];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        this.loadSavedLevels();
      });

      actions.appendChild(loadBtn);
      actions.appendChild(deleteBtn);
      item.appendChild(name);
      item.appendChild(actions);
      this.levelList.appendChild(item);
    }
  }

  private updateUI(): void {
    const playing = this.isPlaying;

    this.toolButtons.forEach(btn => {
      const tool = btn.getAttribute('data-tool') as ToolType;
      btn.classList.toggle('active', this.editor.selectedTool === tool);
      (btn as HTMLButtonElement).disabled = playing;
    });

    (this.beatToolBtn as HTMLButtonElement).classList.toggle('active', this.editor.selectedTool === 'beat');
    (this.beatToolBtn as HTMLButtonElement).disabled = playing;

    (this.playBtn as HTMLButtonElement).disabled = playing;
    (this.stopBtn as HTMLButtonElement).disabled = !playing;

    (this.undoBtn as HTMLButtonElement).disabled = playing || this.editor.getUndoCount() === 0;
    (this.redoBtn as HTMLButtonElement).disabled = playing || this.editor.getRedoCount() === 0;

    this.undoStatus.textContent = `撤销(${this.editor.getUndoCount()}/10)`;

    (this.saveBtn as HTMLButtonElement).disabled = playing;
    this.levelNameInput.disabled = playing;

    const loadBtns = this.levelList.querySelectorAll('.level-btn');
    loadBtns.forEach(btn => {
      (btn as HTMLButtonElement).disabled = playing;
    });
  }

  private start(): void {
    this.lastTime = performance.now();
    const loop = (time: number) => {
      const deltaTime = Math.min((time - this.lastTime) / 1000, 0.05);
      this.lastTime = time;
      this.update(deltaTime);
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  private update(deltaTime: number): void {
    if (this.isPlaying) {
      const result = this.player.update(deltaTime, this.editor.obstacles);
      this.editor.setScrollX(this.player.getCameraX(this.canvas.width));
      this.audio.setScrollX(this.editor.getScrollX());
      this.audio.update();

      if (result.collided || result.finished) {
      }
    }
  }

  private render(): void {
    if (this.isPlaying) {
      this.renderPlayMode();
    } else {
      this.editor.render();
    }
  }

  private renderPlayMode(): void {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const scrollX = this.editor.getScrollX();
    const GRID_SIZE = this.editor.getGridSize();
    const GROUND_Y = this.editor.getGroundY();

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#2A2A2E';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#3D3D42';
    ctx.lineWidth = 1;
    const startX = -(scrollX % GRID_SIZE);
    for (let x = startX; x < W; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(W, GROUND_Y);
    ctx.stroke();

    for (const beat of this.editor.beats) {
      const screenX = beat.x - scrollX;
      if (screenX < -20 || screenX > W + 20) continue;
      ctx.strokeStyle = 'rgba(155, 89, 182, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, GROUND_Y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const obs of this.editor.obstacles) {
      const screenX = obs.x - scrollX;
      if (screenX < -150 || screenX > W + 150) continue;

      if (obs.type === 'platform') {
        this.player.renderPlatform(ctx, obs, scrollX);
      } else {
        const left = screenX - obs.width / 2;
        const top = obs.baseY - obs.height;

        if (obs.type === 'spike') {
          ctx.fillStyle = obs.color;
          const spikes = 4;
          const spikeWidth = obs.width / spikes;
          ctx.beginPath();
          for (let i = 0; i < spikes; i++) {
            const sx = left + i * spikeWidth;
            ctx.moveTo(sx, obs.baseY);
            ctx.lineTo(sx + spikeWidth / 2, top);
            ctx.lineTo(sx + spikeWidth, obs.baseY);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = obs.color;
          ctx.fillRect(left, top, obs.width, obs.height);
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(left, top + obs.height - 4, obs.width, 4);
        }
      }
    }

    this.player.render(ctx, scrollX);
    this.renderTimelinePlayMode();
  }

  private renderTimelinePlayMode(): void {
    const ctx = this.timelineCanvas.getContext('2d')!;
    const W = this.timelineCanvas.width;
    const H = this.timelineCanvas.height;
    const scrollX = this.editor.getScrollX();
    const GRID_SIZE = this.editor.getGridSize();

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1E1E22';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#3D3D42';
    ctx.lineWidth = 1;
    const startX = -(scrollX % GRID_SIZE);
    for (let x = startX; x < W; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    for (const beat of this.editor.beats) {
      const screenX = beat.x - scrollX;
      if (screenX < -20 || screenX > W + 20) continue;
      ctx.strokeStyle = '#9B59B6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(screenX, 5);
      ctx.lineTo(screenX, H - 5);
      ctx.stroke();
    }

    const playerScreenX = this.player.state.x - scrollX;
    ctx.fillStyle = '#E74C3C';
    ctx.beginPath();
    ctx.arc(playerScreenX, H / 2, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});

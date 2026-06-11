import { PathMemory, AtmosphereType, ATMOSPHERE_CONFIGS } from './path';
import { CanvasRenderer, RenderMode, PerfStats } from './renderer';
import { UIController, AppMode } from './ui';

class App {
  private canvas!: HTMLCanvasElement;
  private renderer!: CanvasRenderer;
  private ui!: UIController;
  private pathMemory!: PathMemory;
  
  private mode: AppMode = 'draw';
  private isDrawing: boolean = false;
  private playbackProgress: number = 0;
  private playbackStartTime: number = 0;
  private isPlaying: boolean = false;

  constructor() {
    this.init();
  }

  private init(): void {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      console.error('Canvas element not found');
      return;
    }

    this.pathMemory = new PathMemory();
    this.pathMemory.name = '未命名路径';
    this.pathMemory.startNewPath();

    this.renderer = new CanvasRenderer(this.canvas);
    this.renderer.setPathMemory(this.pathMemory);
    this.renderer.setMode('draw');
    this.renderer.resize();

    this.renderer.setOnFrameCallback((stats: PerfStats) => {
      if (stats.fps < 25) {
        console.warn(`[Perf] Low FPS: ${stats.fps}, Particles: ${stats.particleCount}, Points: ${stats.pointCount}`);
      }
    });

    this.ui = new UIController({
      onModeChange: this.handleModeChange.bind(this),
      onParticleDensityChange: this.handleParticleDensityChange.bind(this),
      onPlaybackSpeedChange: this.handlePlaybackSpeedChange.bind(this),
      onAddAtmosphere: this.handleAddAtmosphere.bind(this),
      onSave: this.handleSave.bind(this),
      onLoad: this.handleLoad.bind(this),
      onAuthorChange: this.handleAuthorChange.bind(this),
      onPathNameChange: this.handlePathNameChange.bind(this)
    });

    this.bindCanvasEvents();
    this.bindWindowEvents();
    this.updateCanAddAtmosphere();

    this.ui.setPathName(this.pathMemory.name);
    this.ui.setMode('draw');

    this.renderer.start();
  }

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('mousedown', this.handlePointerDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handlePointerMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handlePointerUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handlePointerUp.bind(this));

    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this));
  }

  private bindWindowEvents(): void {
    let resizeTimer: number | null = null;
    window.addEventListener('resize', () => {
      if (resizeTimer !== null) {
        clearTimeout(resizeTimer);
      }
      resizeTimer = window.setTimeout(() => {
        this.renderer.resize();
      }, 100);
    });
  }

  private handlePointerDown(e: MouseEvent): void {
    if (this.mode !== 'draw') return;
    
    if (this.pathMemory.isEmpty()) {
      this.pathMemory.startNewPath();
      this.renderer.resetDrawingState();
    }
    
    this.isDrawing = true;
    this.renderer.setDrawing(true);
    
    const coords = this.renderer.getCanvasCoords(e.clientX, e.clientY);
    this.pathMemory.addPoint(coords.x, coords.y);
    this.renderer.addPendingTailPoint(coords.x, coords.y);
    this.updateCanAddAtmosphere();
  }

  private handlePointerMove(e: MouseEvent): void {
    if (!this.isDrawing || this.mode !== 'draw') return;
    
    const coords = this.renderer.getCanvasCoords(e.clientX, e.clientY);
    this.pathMemory.addPoint(coords.x, coords.y);
    this.renderer.addPendingTailPoint(coords.x, coords.y);
    this.updateCanAddAtmosphere();
  }

  private handlePointerUp(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.renderer.setDrawing(false);
    this.updateCanAddAtmosphere();
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (this.mode !== 'draw') return;
    const touch = e.touches[0];
    if (!touch) return;

    if (this.pathMemory.isEmpty()) {
      this.pathMemory.startNewPath();
      this.renderer.resetDrawingState();
    }
    
    this.isDrawing = true;
    this.renderer.setDrawing(true);

    const coords = this.renderer.getCanvasCoords(touch.clientX, touch.clientY);
    this.pathMemory.addPoint(coords.x, coords.y);
    this.renderer.addPendingTailPoint(coords.x, coords.y);
    this.updateCanAddAtmosphere();
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDrawing || this.mode !== 'draw') return;
    const touch = e.touches[0];
    if (!touch) return;

    const coords = this.renderer.getCanvasCoords(touch.clientX, touch.clientY);
    this.pathMemory.addPoint(coords.x, coords.y);
    this.renderer.addPendingTailPoint(coords.x, coords.y);
    this.updateCanAddAtmosphere();
  }

  private handleTouchEnd(): void {
    if (this.isDrawing) {
      this.handlePointerUp();
    }
  }

  private handleModeChange(mode: AppMode): void {
    this.mode = mode;
    
    if (mode === 'playback') {
      if (this.pathMemory.isEmpty()) {
        this.ui.showToast('请先绘制一条路径', 'error');
        this.ui.setMode('draw');
        this.mode = 'draw';
        return;
      }
      this.stopPlayback();
      this.startPlayback();
    } else {
      this.stopPlayback();
    }

    this.renderer.setMode(mode as RenderMode);
  }

  private startPlayback(): void {
    this.isPlaying = true;
    this.playbackProgress = 0;
    this.playbackStartTime = performance.now();
    this.renderer.resetFadeOut();
    this.renderer.setPlaybackProgress(0);
    requestAnimationFrame(this.playbackLoop.bind(this));
  }

  private stopPlayback(): void {
    this.isPlaying = false;
    this.playbackProgress = 0;
    this.renderer.setPlaybackProgress(0);
  }

  private playbackLoop = (): void => {
    if (!this.isPlaying || this.mode !== 'playback') return;

    const now = performance.now();
    const elapsed = now - this.playbackStartTime;
    const totalDuration = 30000 / this.pathMemory.playbackSpeed;
    
    this.playbackProgress = Math.min(1, elapsed / totalDuration);
    this.renderer.setPlaybackProgress(this.playbackProgress);

    if (this.playbackProgress < 1) {
      requestAnimationFrame(this.playbackLoop);
    } else {
      setTimeout(() => {
        if (this.isPlaying && this.mode === 'playback') {
          this.isPlaying = false;
          setTimeout(() => {
            if (this.mode === 'playback') {
              this.startPlayback();
            }
          }, 1200);
        }
      }, 1500);
    }
  };

  private handleParticleDensityChange(value: number): void {
    this.pathMemory.particleDensity = value;
    this.renderer.setParticleDensity(value);
  }

  private handlePlaybackSpeedChange(value: number): void {
    this.pathMemory.playbackSpeed = value;
  }

  private handleAddAtmosphere(type: AtmosphereType): void {
    if (!this.pathMemory.hasUnsegmentedPoints()) {
      this.ui.showToast('请先绘制新的路径段', 'error');
      return;
    }
    this.pathMemory.addAtmosphereSegment(type);
    const config = ATMOSPHERE_CONFIGS[type];
    this.ui.showToast(`已添加「${config.name}」氛围`, 'success');
    this.updateCanAddAtmosphere();
  }

  private handleSave(): void {
    if (this.pathMemory.isEmpty()) {
      this.ui.showToast('请先绘制路径', 'error');
      return;
    }

    if (this.pathMemory.segments.length === 0) {
      this.ui.showToast('请至少添加一段氛围', 'error');
      return;
    }

    const fileSizeStatus = this.pathMemory.getFileSizeStatus();
    
    if (!fileSizeStatus.ok) {
      this.ui.showToast(`文件过大 (${Math.round(fileSizeStatus.size / 1024)}KB)，已自动压缩`, 'info');
    }

    const data = this.pathMemory.serialize();
    const filename = this.pathMemory.name || '路径记忆';
    const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
    
    this.ui.downloadFile(data, finalFilename);
    
    const finalSize = new Blob([data]).size;
    this.ui.showToast(`保存成功 (${Math.round(finalSize / 1024)}KB)`, 'success');
  }

  private handleLoad(file: File): void {
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.ui.showToast('请选择JSON文件', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) throw new Error('文件内容为空');

        const memory = PathMemory.deserialize(content);
        
        if (!memory.name || memory.name === '未命名路径') {
          memory.name = file.name.replace(/\.json$/i, '');
        }
        
        this.pathMemory = memory;
        this.renderer.setPathMemory(memory);
        this.ui.updateFromMemory(memory);
        
        this.mode = 'playback';
        this.ui.setMode('playback');
        this.renderer.setMode('playback');
        
        setTimeout(() => {
          this.startPlayback();
        }, 400);

        this.ui.showToast(`加载成功：${memory.name}`, 'success');
      } catch (err) {
        console.error(err);
        this.ui.showToast('加载失败：文件格式不正确', 'error');
      }
    };
    reader.onerror = () => {
      this.ui.showToast('读取文件失败', 'error');
    };
    reader.readAsText(file);
  }

  private handleAuthorChange(author: string): void {
    this.pathMemory.author = author;
  }

  private handlePathNameChange(name: string): void {
    this.pathMemory.name = name;
  }

  private updateCanAddAtmosphere(): void {
    const canAdd = this.pathMemory.hasUnsegmentedPoints();
    this.ui.setCanAddAtmosphere(canAdd);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});

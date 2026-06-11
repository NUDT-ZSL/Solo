import { PathMemory, AtmosphereType, Point } from './path';
import { CanvasRenderer } from './renderer';
import { UIManager, UICallbacks } from './ui';
import './style.css';

interface AppState {
  mode: 'drawing' | 'playback';
  isDrawing: boolean;
  currentSegmentStart: number;
  playbackTime: number;
  playbackStartTime: number;
  isPlaybackComplete: boolean;
  fadeOutProgress: number;
  lastParticleEmitTime: number;
  lastEmitPointIndex: number;
}

const FADE_OUT_DURATION = 1000;
const PARTICLE_EMIT_INTERVAL = 50;

class App {
  private pathMemory: PathMemory;
  private renderer: CanvasRenderer;
  private ui: UIManager;
  private state: AppState;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private drawingStartTime: number = 0;

  constructor() {
    this.pathMemory = new PathMemory();
    this.state = this.createInitialState();
    
    const callbacks: UICallbacks = {
      onModeChange: this.handleModeChange.bind(this),
      onParticleDensityChange: this.handleParticleDensityChange.bind(this),
      onPlaybackSpeedChange: this.handlePlaybackSpeedChange.bind(this),
      onAddAtmosphere: this.handleAddAtmosphere.bind(this),
      onSave: this.handleSave.bind(this),
      onLoad: this.handleLoad.bind(this),
      onAuthorChange: this.handleAuthorChange.bind(this),
      onClearPath: this.handleClearPath.bind(this)
    };
    
    this.ui = new UIManager(document.body, callbacks, this.pathMemory);
    
    const canvas = this.ui.getCanvas();
    this.renderer = new CanvasRenderer(canvas);
    
    this.setupCanvasEvents();
    this.setupResizeHandler();
    this.startAnimationLoop();
    this.ui.updateFileSize();
  }

  private createInitialState(): AppState {
    return {
      mode: 'drawing',
      isDrawing: false,
      currentSegmentStart: 0,
      playbackTime: 0,
      playbackStartTime: 0,
      isPlaybackComplete: false,
      fadeOutProgress: 0,
      lastParticleEmitTime: 0,
      lastEmitPointIndex: -1
    };
  }

  private setupCanvasEvents(): void {
    const canvas = this.ui.getCanvas();
    
    canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
    
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handleMouseDown(touch);
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handleMouseMove(touch);
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.handleMouseUp(e);
    }, { passive: false });
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.renderer.resize();
    });
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const canvas = this.ui.getCanvas();
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  private handleMouseDown(e: MouseEvent | Touch): void {
    if (this.state.mode !== 'drawing') return;
    
    this.state.isDrawing = true;
    this.drawingStartTime = performance.now();
    
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    const normalized = this.renderer.canvasToNormalize(coords.x, coords.y);
    
    this.state.currentSegmentStart = this.pathMemory.getPointCount();
    
    const timestamp = 0;
    this.pathMemory.addPoint(normalized.x, normalized.y, timestamp);
    
    const point: Point = { x: normalized.x, y: normalized.y, timestamp: this.drawingStartTime };
    this.renderer.addTrailPoint(point, this.drawingStartTime);
    
    this.ui.updateFileSize();
  }

  private handleMouseMove(e: MouseEvent | Touch): void {
    if (this.state.mode !== 'drawing' || !this.state.isDrawing) return;
    
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    const normalized = this.renderer.canvasToNormalize(coords.x, coords.y);
    
    const currentTime = performance.now();
    const elapsed = currentTime - this.drawingStartTime;
    
    this.pathMemory.addPoint(normalized.x, normalized.y, elapsed);
    
    const point: Point = { x: normalized.x, y: normalized.y, timestamp: currentTime };
    this.renderer.addTrailPoint(point, currentTime);
    
    this.ui.updateFileSize();
    this.ui.updateAtmosphereButtonState(this.pathMemory.getPointCount() >= 2);
  }

  private handleMouseUp(_e: Event): void {
    if (this.state.mode !== 'drawing' || !this.state.isDrawing) return;
    
    this.state.isDrawing = false;
    this.renderer.resetTrail();
    this.ui.updateSegmentList();
  }

  private handleModeChange(mode: 'drawing' | 'playback'): void {
    this.state.mode = mode;
    
    if (mode === 'playback') {
      this.startPlayback();
    } else {
      this.stopPlayback();
    }
  }

  private handleParticleDensityChange(_value: number): void {
  }

  private handlePlaybackSpeedChange(_value: number): void {
    if (this.state.mode === 'playback' && !this.state.isPlaybackComplete) {
      const now = performance.now();
      this.state.playbackStartTime = now - this.state.playbackTime / this.pathMemory.playbackSpeed / 2;
    }
  }

  private handleAddAtmosphere(type: AtmosphereType): void {
    const endIndex = this.pathMemory.getPointCount() - 1;
    if (endIndex < this.state.currentSegmentStart) {
      this.ui.showMessage('请先绘制一段路径', 'error');
      return;
    }
    
    const success = this.pathMemory.addSegment(
      this.state.currentSegmentStart,
      endIndex,
      type
    );
    
    if (success) {
      this.state.currentSegmentStart = endIndex + 1;
      this.ui.updateSegmentList();
      this.ui.updateFileSize();
      this.ui.showMessage(`已添加「${this.getAtmosphereName(type)}」氛围段`, 'success');
    } else {
      this.ui.showMessage('添加失败，该范围可能已存在氛围', 'error');
    }
  }

  private getAtmosphereName(type: AtmosphereType): string {
    const names: Record<AtmosphereType, string> = {
      forest: '森林',
      ocean: '海洋',
      dusk: '暮色',
      volcano: '火山'
    };
    return names[type];
  }

  private handleSave(): void {
    this.ui.showMessage('路径已保存', 'success');
  }

  private async handleLoad(file: File): Promise<void> {
    try {
      const text = await file.text();
      const loadedMemory = PathMemory.deserialize(text);
      
      if (!loadedMemory) {
        this.ui.showMessage('文件格式无效', 'error');
        return;
      }
      
      const fileName = file.name.replace(/\.json$/i, '');
      loadedMemory.name = fileName;
      
      this.pathMemory = loadedMemory;
      this.ui.setPathMemory(this.pathMemory);
      this.ui.updatePathName(fileName);
      this.ui.setModeFromExternal('playback');
      this.startPlayback();
      
      this.ui.showMessage(`成功加载「${fileName}」`, 'success');
    } catch (error) {
      this.ui.showMessage('加载文件失败', 'error');
      console.error(error);
    }
  }

  private handleAuthorChange(_author: string): void {
  }

  private handleClearPath(): void {
    if (this.pathMemory.getPointCount() > 0) {
      if (!confirm('确定要清空当前路径吗？')) return;
    }
    
    this.pathMemory.clear();
    this.renderer.resetParticles();
    this.renderer.resetTrail();
    this.state = this.createInitialState();
    this.ui.updateSegmentList();
    this.ui.updateFileSize();
    this.ui.updateAtmosphereButtonState(false);
    this.ui.showMessage('路径已清空', 'info');
  }

  private startPlayback(): void {
    if (this.pathMemory.getPointCount() < 2) {
      this.ui.showMessage('请先绘制路径后再回放', 'error');
      this.ui.setModeFromExternal('drawing');
      return;
    }
    
    const now = performance.now();
    this.state.playbackTime = 0;
    this.state.playbackStartTime = now;
    this.state.isPlaybackComplete = false;
    this.state.fadeOutProgress = 0;
    this.state.lastParticleEmitTime = 0;
    this.state.lastEmitPointIndex = -1;
    this.renderer.resetParticles();
  }

  private stopPlayback(): void {
    this.state.isPlaybackComplete = false;
    this.state.fadeOutProgress = 0;
    this.renderer.resetParticles();
  }

  private updatePlayback(currentTime: number): void {
    const totalDuration = this.pathMemory.getTotalDuration();
    if (totalDuration === 0) return;
    
    const speed = this.pathMemory.playbackSpeed;
    
    if (!this.state.isPlaybackComplete) {
      const elapsed = currentTime - this.state.playbackStartTime;
      this.state.playbackTime = elapsed * speed * 2;
      
      if (this.state.playbackTime >= totalDuration) {
        this.state.playbackTime = totalDuration;
        this.state.isPlaybackComplete = true;
        this.state.playbackStartTime = currentTime;
      }
      
      this.emitParticlesDuringPlayback(currentTime);
    } else {
      const fadeElapsed = currentTime - this.state.playbackStartTime;
      this.state.fadeOutProgress = Math.min(1, fadeElapsed / FADE_OUT_DURATION);
      
      if (this.state.fadeOutProgress >= 1) {
        this.state.playbackStartTime = currentTime - 2000;
      }
    }
    
    this.renderer.updateParticles(currentTime, this.state.fadeOutProgress);
  }

  private emitParticlesDuringPlayback(currentTime: number): void {
    const points = this.pathMemory.getPoints();
    const density = this.pathMemory.particleDensity;
    const speed = this.pathMemory.playbackSpeed;
    
    const playbackTime = this.state.playbackTime;
    const startTime = points[0].timestamp;
    const effectiveTime = playbackTime + startTime;
    
    let currentPointIndex = 0;
    for (let i = 0; i < points.length; i++) {
      if (points[i].timestamp <= effectiveTime) {
        currentPointIndex = i;
      } else {
        break;
      }
    }
    
    if (currentPointIndex <= this.state.lastEmitPointIndex) return;
    
    const emitInterval = PARTICLE_EMIT_INTERVAL / speed;
    if (currentTime - this.state.lastParticleEmitTime < emitInterval) return;
    
    this.state.lastParticleEmitTime = currentTime;
    
    for (let idx = this.state.lastEmitPointIndex + 1; idx <= currentPointIndex; idx++) {
      const atmosphere = this.pathMemory.getAtmosphereAtIndex(idx);
      if (atmosphere) {
        const point = points[idx];
        const emitCount = Math.max(1, Math.floor(density / 30));
        
        for (let i = 0; i < emitCount; i++) {
          const offsetX = this.renderer.getRandomRange(-0.01, 0.01);
          const offsetY = this.renderer.getRandomRange(-0.01, 0.01);
          this.renderer.emitParticles(
            point.x + offsetX,
            point.y + offsetY,
            atmosphere,
            1,
            currentTime
          );
        }
      }
    }
    
    this.state.lastEmitPointIndex = currentPointIndex;
  }

  private startAnimationLoop(): void {
    const loop = (currentTime: number) => {
      if (this.lastFrameTime === 0) {
        this.lastFrameTime = currentTime;
      }
      
      this.lastFrameTime = currentTime;
      
      this.renderer.clear();
      this.renderer.drawBackground();
      
      if (this.state.mode === 'drawing') {
        this.renderer.drawFullPath(this.pathMemory, this.pathMemory.getTotalDuration(), 1);
        this.renderer.drawMarkers(this.pathMemory);
        
        if (this.state.isDrawing) {
          this.renderer.drawTrail(currentTime);
        }
      } else {
        this.updatePlayback(currentTime);
        this.renderer.drawFullPath(
          this.pathMemory,
          this.state.playbackTime,
          this.pathMemory.playbackSpeed
        );
        this.renderer.drawParticles();
        this.renderer.drawMarkers(this.pathMemory);
      }
      
      this.animationFrameId = requestAnimationFrame(loop);
    };
    
    this.animationFrameId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});

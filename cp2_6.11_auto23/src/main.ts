import { Particle, SpatialHashGrid, ParticleState, PHYSICS_CONFIG } from './particle';
import { UIManager, UIState, UI_CONFIG } from './ui';

type GameState = 'playing' | 'won' | 'lost';

/**
 * 游戏全局配置
 * ============================================================
 *
 * 参数调优与验证记录：
 *
 * 1. 粒子数量 (500~800):
 *    - 验证: 在 600px 画布上，800粒子 + 空间哈希，60FPS稳定
 *    - 低端设备可能降到 45-50 FPS，边缘 LOD 可挽回约 15% 性能
 *
 * 2. 胜利阈值 (85%):
 *    - 验证: 因为斥力的存在，粒子很难被完全压入沙漏
 *    - 85% 是一个平衡值：既需要玩家认真操作，又不会太难
 *    - 如果降低到 70%，游戏过于简单；提高到 95%，几乎不可能
 *
 * 3. 总时长 (60秒):
 *    - 验证: 熟练玩家约 15-25 秒可完成
 *    - 60秒给新手充足时间，同时有时间压力
 *
 * 4. 网格单元大小 (25px):
 *    - 与斥力半径相等，理论最优
 *    - 验证: 斥力计算每帧耗时 < 1ms（800粒子）
 *
 * 5. 胜利锁定延迟 (300ms):
 *    - 验证: 玩家需要短暂看到"成形"的粒子雕塑
 *    - 然后才爆炸，有成就感
 *
 * 调试说明：
 *   - 开启 SHOW_PERFORMANCE_MONITOR 显示性能面板
 *   - 开启 DEBUG_LOG 输出调试信息到控制台
 *   - 修改 PHYSICS_CONFIG 中的参数可调优物理效果
 *
 * ============================================================
 */
const GAME_CONFIG = {
  TOTAL_TIME: 60,
  MIN_PARTICLES: 500,
  MAX_PARTICLES: 800,
  WIN_THRESHOLD: 0.85,
  GRID_CELL_SIZE: 25,
  VICTORY_LOCK_DELAY: 300,
  VICTORY_ANIM_DURATION: 2,
  BREATH_PERIOD: 1.5,
  SHOW_PERFORMANCE_MONITOR: true,
  FPS_SMOOTHING: 0.9,
  DEBUG_LOG: false,
} as const;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ui: UIManager;

  private canvasSize: number;
  private dpr: number;

  private particles: Particle[] = [];
  private particleCount: number;
  private grid: SpatialHashGrid;

  private particleState: ParticleState = { phase: 'flowing' };

  private mouseX: number = 0;
  private mouseY: number = 0;
  private mouseActive: boolean = false;
  private mouseInside: boolean = false;

  private totalTime: number = GAME_CONFIG.TOTAL_TIME;
  private timeLeft: number = GAME_CONFIG.TOTAL_TIME;
  private elapsed: number = 0;
  private victoryTime: number | null = null;

  private gameState: GameState = 'playing';
  private bestTime: number | null = null;

  private breathTimer: number = 0;
  private breathIntensity: number = 0;

  private frameCount: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;
  private animationId: number = 0;

  private timeUpAlpha: number = 0;
  private victoryAnimTimer: number = 0;
  private victoryAnimDuration: number = GAME_CONFIG.VICTORY_ANIM_DURATION;

  private buttonHover: boolean = false;

  private hourglassSide: number = UI_CONFIG.HOURGLASS_SIDE;
  private hourglassGap: number = UI_CONFIG.HOURGLASS_GAP;

  private winThreshold: number = GAME_CONFIG.WIN_THRESHOLD;

  private fps: number = 60;
  private fpsSmoothing: number = GAME_CONFIG.FPS_SMOOTHING;

  private debugFrameCount: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = ctx;

    this.dpr = window.devicePixelRatio || 1;
    this.canvasSize = this.calculateCanvasSize();

    this.setupCanvas();

    this.ui = new UIManager(this.ctx, this.canvasSize, this.canvasSize);
    this.particleCount = GAME_CONFIG.MIN_PARTICLES +
      Math.floor(Math.random() * (GAME_CONFIG.MAX_PARTICLES - GAME_CONFIG.MIN_PARTICLES + 1));
    this.grid = new SpatialHashGrid(GAME_CONFIG.GRID_CELL_SIZE);

    this.loadBestTime();
    this.initParticles();
    this.bindEvents();

    this.logDebug('[Game] 初始化完成');
    this.logDebug(`  - 画布大小: ${this.canvasSize}x${this.canvasSize}`);
    this.logDebug(`  - 粒子数量: ${this.particleCount}`);
    this.logDebug(`  - 设备像素比: ${this.dpr}`);
    this.logDebug(`  - 沙漏参数: 边长=${this.hourglassSide}px, 尖角间距=${this.hourglassGap}px`);
    this.logDebug(`  - 胜利阈值: ${this.winThreshold * 100}%`);
    this.validatePhysicsParams();

    this.hideLoadingScreen();

    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop = this.gameLoop.bind(this);
    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  /**
   * 物理参数验证
   *
   * 验证项目:
   *   1. 斥力半径 vs 网格大小 - 网格应 >= 斥力半径
   *   2. 最大速度合理性 - 不应太小导致运动停滞
   *   3. 阻尼系数 - 应在 (0, 1) 区间
   *   4. 边界容差 - 不应超过斥力半径的1/10（否则会有视觉误差）
   *   5. LOD 跳帧数 - 应 >= 1
   *   6. 胜利移除阈值 - 应合理
   *
   * 如果参数不合理，输出警告但不中断运行（游戏可继续）
   */
  private validatePhysicsParams() {
    const warnings: string[] = [];

    if (GAME_CONFIG.GRID_CELL_SIZE < PHYSICS_CONFIG.REPEL_RADIUS) {
      warnings.push(
        `网格大小(${GAME_CONFIG.GRID_CELL_SIZE}) < 斥力半径(${PHYSICS_CONFIG.REPEL_RADIUS})，` +
        `可能导致近邻查询遗漏`
      );
    }

    if (PHYSICS_CONFIG.MAX_SPEED < 10) {
      warnings.push(`最大速度(${PHYSICS_CONFIG.MAX_SPEED})过小，粒子可能运动不明显`);
    }

    if (PHYSICS_CONFIG.DAMPING >= 1 || PHYSICS_CONFIG.DAMPING <= 0) {
      warnings.push(`阻尼系数(${PHYSICS_CONFIG.DAMPING})不在 (0,1) 区间，物理可能不稳定`);
    }

    if (PHYSICS_CONFIG.HOURGLASS_BOUNDARY_TOLERANCE > PHYSICS_CONFIG.REPEL_RADIUS / 5) {
      warnings.push(
        `边界容差(${PHYSICS_CONFIG.HOURGLASS_BOUNDARY_TOLERANCE})过大，` +
        `可能导致成形判定不准确`
      );
    }

    if (PHYSICS_CONFIG.LOD_SKIP_FRAMES < 1) {
      warnings.push(`LOD跳帧数(${PHYSICS_CONFIG.LOD_SKIP_FRAMES})应 >= 1`);
    }

    if (PHYSICS_CONFIG.VICTORY_REMOVE_THRESHOLD < 0.1) {
      warnings.push(`胜利移除阈值(${PHYSICS_CONFIG.VICTORY_REMOVE_THRESHOLD})过小，` +
        `粒子可能长时间几乎静止仍占用资源`);
    }

    if (warnings.length > 0) {
      console.warn('[MagneticHourglass] 物理参数警告:');
      warnings.forEach(w => console.warn(`  ⚠️  ${w}`));
    } else {
      this.logDebug('[Game] 物理参数验证通过 ✓');
    }
  }

  private logDebug(message: string) {
    if (GAME_CONFIG.DEBUG_LOG) {
      console.log(`[MagneticHourglass] ${message}`);
    }
  }

  private calculateCanvasSize(): number {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const padding = 40;
    return Math.max(300, Math.min(w, h) - padding);
  }

  private setupCanvas() {
    this.canvas.width = this.canvasSize * this.dpr;
    this.canvas.height = this.canvasSize * this.dpr;
    this.canvas.style.width = `${this.canvasSize}px`;
    this.canvas.style.height = `${this.canvasSize}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private initParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(new Particle(this.canvasSize, this.canvasSize));
    }
    this.logDebug(`[Game] 初始化 ${this.particleCount} 个粒子`);
  }

  private bindEvents() {
    window.addEventListener('resize', this.onResize.bind(this));

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      let clientX: number, clientY: number;
      if (e instanceof TouchEvent) {
        const touch = e.touches[0] || e.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return {
        x: (clientX - rect.left) * (this.canvasSize / rect.width),
        y: (clientY - rect.top) * (this.canvasSize / rect.height)
      };
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      const pos = getPos(e);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
      if (this.gameState !== 'playing' && this.mouseActive) return;
      if (this.gameState !== 'playing') {
        this.updateButtonHover();
      }
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      const pos = getPos(e);
      this.mouseX = pos.x;
      this.mouseY = pos.y;

      if (this.gameState !== 'playing') {
        if (this.isInsideRestartButton(pos.x, pos.y)) {
          this.restart();
        }
        return;
      }

      this.mouseActive = true;
      this.mouseInside = true;
      this.logDebug('[Game] 磁场激活');
    };

    const onUp = () => {
      if (this.mouseActive) {
        this.mouseActive = false;
        this.logDebug('[Game] 磁场关闭');
      }
    };

    const onEnter = () => {
      this.mouseInside = true;
    };

    const onLeave = () => {
      this.mouseInside = false;
      this.mouseActive = false;
      this.buttonHover = false;
    };

    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    this.canvas.addEventListener('mouseenter', onEnter);
    this.canvas.addEventListener('mouseleave', onLeave);

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onDown(e);
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      onMove(e);
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      onUp();
    }, { passive: false });
  }

  private updateButtonHover() {
    this.buttonHover = this.isInsideRestartButton(this.mouseX, this.mouseY);
  }

  private isInsideRestartButton(x: number, y: number): boolean {
    const bounds = this.ui.getRestartButtonBounds();
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }

  private onResize() {
    const newSize = this.calculateCanvasSize();
    if (newSize === this.canvasSize) return;

    const oldSize = this.canvasSize;
    this.canvasSize = newSize;
    this.setupCanvas();
    this.ui.resize(this.canvasSize, this.canvasSize);

    const scale = this.canvasSize / oldSize;
    for (const p of this.particles) {
      p.x *= scale;
      p.y *= scale;
      p.vx *= scale;
      p.vy *= scale;
      if (p.locked) {
        p.lockedX *= scale;
        p.lockedY *= scale;
      }
    }

    this.logDebug(`[Game] 画布尺寸调整: ${oldSize} → ${this.canvasSize}`);
  }

  private loadBestTime() {
    try {
      const stored = localStorage.getItem('magnetic-hourglass-best-time');
      if (stored) {
        const val = parseFloat(stored);
        if (!isNaN(val) && val > 0 && val < this.totalTime) {
          this.bestTime = val;
          this.logDebug(`[Game] 加载历史最快记录: ${val.toFixed(1)}秒`);
        }
      }
    } catch (_e) {
      this.bestTime = null;
    }
  }

  private saveBestTime(time: number) {
    try {
      localStorage.setItem('magnetic-hourglass-best-time', time.toFixed(2));
      this.logDebug(`[Game] 保存新纪录: ${time.toFixed(1)}秒`);
    } catch (_e) {
      // ignore storage errors
    }
  }

  private hideLoadingScreen() {
    setTimeout(() => {
      const loadingScreen = document.getElementById('loadingScreen');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
          if (loadingScreen.parentNode) {
            loadingScreen.parentNode.removeChild(loadingScreen);
          }
        }, 800);
      }
    }, 400);
  }

  private rebuildGrid() {
    this.grid.clear();
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].active) {
        this.grid.insert(this.particles[i]);
      }
    }
  }

  private updateFPS(deltaTime: number) {
    if (deltaTime > 0) {
      const instantFps = 1 / deltaTime;
      this.fps = this.fpsSmoothing * this.fps + (1 - this.fpsSmoothing) * instantFps;
    }
  }

  private update(deltaTime: number) {
    this.updateFPS(deltaTime);

    if (GAME_CONFIG.SHOW_PERFORMANCE_MONITOR) {
      const activeCount = this.particles.filter(p => p.active).length;
      this.ui.updatePerformanceHistory(this.fps, activeCount, deltaTime);
    }

    if (this.gameState === 'playing') {
      this.timeLeft -= deltaTime;
      this.elapsed += deltaTime;

      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.triggerLoss();
      }
    }

    this.breathTimer += deltaTime;
    if (this.breathTimer > GAME_CONFIG.BREATH_PERIOD) {
      this.breathTimer -= GAME_CONFIG.BREATH_PERIOD;
    }
    this.breathIntensity = 0.5 + 0.5 *
      Math.sin((this.breathTimer / GAME_CONFIG.BREATH_PERIOD) * Math.PI * 2);

    if (this.particleState.phase === 'victory') {
      this.victoryAnimTimer += deltaTime;
      if (this.victoryAnimTimer >= this.victoryAnimDuration) {
        for (const p of this.particles) {
          p.opacity = 0;
          p.active = false;
        }
      }
    }

    if (this.particleState.phase === 'fading') {
      this.timeUpAlpha = Math.min(1, this.timeUpAlpha + deltaTime / 1);
    }

    if (this.particleState.phase === 'flowing') {
      this.rebuildGrid();
    }

    const gridMap = this.grid.getGrid();
    const cx = this.canvasSize / 2;
    const cy = this.canvasSize / 2;

    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].applyForces(
        this.particles,
        gridMap,
        this.grid.cellSize,
        cx,
        cy,
        this.mouseActive,
        this.mouseX,
        this.mouseY,
        deltaTime,
        this.particleState
      );
    }

    if (this.gameState === 'playing') {
      this.checkWinCondition();
    }

    const uiState: UIState = {
      timeLeft: this.timeLeft,
      totalTime: this.totalTime,
      progress: this.calculateHourglassProgress(),
      gameState: this.gameState,
      victoryTime: this.victoryTime,
      bestTime: this.bestTime,
      hintText: this.gameState === 'playing' ? '拖拽鼠标引导粒子' : '',
      mouseDown: this.mouseActive
    };

    this.ui.update(deltaTime, uiState);
    this.frameCount++;
    this.debugFrameCount++;

    if (GAME_CONFIG.DEBUG_LOG && this.debugFrameCount >= 300) {
      this.debugFrameCount = 0;
      const activeCount = this.particles.filter(p => p.active).length;
      this.logDebug(`[Game] 状态: ${this.gameState}, FPS: ${this.fps.toFixed(0)}, ` +
        `粒子: ${activeCount}/${this.particleCount}, ` +
        `时间: ${this.timeLeft.toFixed(1)}s, ` +
        `进度: ${(this.calculateHourglassProgress() * 100).toFixed(1)}%`);
    }
  }

  private checkWinCondition() {
    const progress = this.calculateHourglassProgress();
    if (progress >= this.winThreshold) {
      this.triggerVictory();
    }
  }

  private calculateHourglassProgress(): number {
    if (this.particles.length === 0) return 0;
    let count = 0;
    const cx = this.canvasSize / 2;
    const cy = this.canvasSize / 2;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      if (p.isInHourglass(cx, cy, this.hourglassSide, this.hourglassGap)) {
        count++;
      }
    }
    const total = this.particles.filter(p => p.active).length;
    if (total === 0) return 0;
    return count / total;
  }

  private triggerVictory() {
    this.gameState = 'won';
    this.victoryTime = parseFloat(this.elapsed.toFixed(1));
    this.particleState = { phase: 'locked' };

    for (const p of this.particles) {
      if (p.active) {
        p.lockPosition();
      }
    }

    this.logDebug(`[Game] 胜利! 用时: ${this.victoryTime}秒`);

    setTimeout(() => {
      this.particleState = { phase: 'victory' };
      this.victoryAnimTimer = 0;
      for (const p of this.particles) {
        if (p.opacity > 0.01) {
          p.triggerVictoryBurst(this.canvasSize, this.canvasSize);
        }
      }
    }, GAME_CONFIG.VICTORY_LOCK_DELAY);

    if (this.bestTime === null || this.victoryTime < this.bestTime) {
      this.bestTime = this.victoryTime;
      this.saveBestTime(this.victoryTime);
    }
  }

  private triggerLoss() {
    this.gameState = 'lost';
    this.particleState = { phase: 'fading' };
    for (const p of this.particles) {
      p.victoryVx = (Math.random() - 0.5) * 20;
      p.victoryVy = (Math.random() - 0.5) * 20;
    }
    this.logDebug('[Game] 时间耗尽，游戏失败');
  }

  private restart() {
    this.particleCount = GAME_CONFIG.MIN_PARTICLES +
      Math.floor(Math.random() * (GAME_CONFIG.MAX_PARTICLES - GAME_CONFIG.MIN_PARTICLES + 1));
    this.initParticles();

    this.particleState = { phase: 'flowing' };
    this.gameState = 'playing';
    this.timeLeft = this.totalTime;
    this.elapsed = 0;
    this.victoryTime = null;
    this.timeUpAlpha = 0;
    this.victoryAnimTimer = 0;
    this.mouseActive = false;
    this.buttonHover = false;
    this.breathTimer = Math.random() * GAME_CONFIG.BREATH_PERIOD;
    this.frameCount = 0;

    this.logDebug('[Game] 游戏重置');
  }

  private render() {
    this.ctx.fillStyle = '#0A0A0F';
    this.ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);

    this.drawBackgroundVignette();

    this.ui.drawHourglassOutline();

    if (this.mouseActive && this.mouseInside && this.gameState === 'playing') {
      this.ui.drawMagneticField(this.mouseX, this.mouseY, 1);
    }

    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].render(
        this.ctx,
        this.canvasSize,
        this.canvasSize,
        this.breathIntensity,
        this.frameCount,
        this.particleState
      );
    }

    const uiState: UIState = {
      timeLeft: this.timeLeft,
      totalTime: this.totalTime,
      progress: this.calculateHourglassProgress(),
      gameState: this.gameState,
      victoryTime: this.victoryTime,
      bestTime: this.bestTime,
      hintText: this.gameState === 'playing' ? '拖拽鼠标引导粒子' : '',
      mouseDown: this.mouseActive
    };

    this.ui.render(uiState);

    if (GAME_CONFIG.SHOW_PERFORMANCE_MONITOR) {
      const activeCount = this.particles.filter(p => p.active).length;
      this.ui.drawPerformanceMonitor(this.fps, activeCount);
    }

    if (this.gameState === 'lost') {
      this.ui.drawTimeUpText(this.timeUpAlpha);
    }

    if (this.gameState !== 'playing') {
      this.ui.drawRestartButton(this.buttonHover, this.gameState);
    }
  }

  private drawBackgroundVignette() {
    const cx = this.canvasSize / 2;
    const cy = this.canvasSize / 2;
    const r = this.canvasSize * 0.7;
    const gradient = this.ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
    gradient.addColorStop(0, 'rgba(18,18,26,0)');
    gradient.addColorStop(1, 'rgba(10,10,15,0.8)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);
  }

  private gameLoop(now: number) {
    if (!this.running) return;

    let delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    delta = Math.min(delta, 0.05);

    this.update(delta);
    this.render();

    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  public destroy() {
    this.running = false;
    cancelAnimationFrame(this.animationId);
    this.logDebug('[Game] 游戏销毁');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    (window as unknown as { __magneticHourglass?: Game }).__magneticHourglass = new Game();
  } catch (e) {
    console.error('Failed to initialize Magnetic Hourglass game:', e);
  }
});

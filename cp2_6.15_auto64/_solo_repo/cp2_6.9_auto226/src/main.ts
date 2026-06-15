import { LevelManager } from './level';
import { Renderer, RenderState } from './render';
import { BlockManager, BLOCK_WIDTH, BLOCK_HEIGHT, BlockInstance } from './block';
import { Player } from './player';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Balloon {
  x: number;
  y: number;
  color: string;
  speed: number;
  wobble: number;
  wobbleSpeed: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private levelManager: LevelManager;
  private blockManager: BlockManager;
  private player: Player;

  private renderState: RenderState;
  private particles: Particle[] = [];
  private balloons: Balloon[] = [];
  private startTime: number = 0;
  private successHandled: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private runButtonHovered: boolean = false;
  private resetButtonHovered: boolean = false;
  private hoveredLibraryType: string | null = null;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.renderer = new Renderer(this.canvas);
    this.levelManager = new LevelManager();
    this.blockManager = new BlockManager();
    this.player = new Player(this.levelManager);
    this.renderState = { gridOffsetX: 0, gridOffsetY: 0, time: 0 };

    this.startTime = performance.now();
    this.setupEventListeners();
    this.updateSlotArea();
    this.gameLoop();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.renderer.resize();
      this.updateSlotArea();
      this.updatePlayerGridOffset();
    });

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => this.onMouseUp(new MouseEvent('mouseup')));
  }

  private updateSlotArea(): void {
    const area = this.renderer.getPuzzleArea();
    this.blockManager.setSlotArea(area.x, area.y);
  }

  private updatePlayerGridOffset(): void {
    const center = this.renderer.getGridCenter();
    const totalWidth = 8 * 50;
    const totalHeight = 8 * 50;
    this.player.setGridOffset(
      center.x - totalWidth / 2,
      center.y - totalHeight / 2
    );
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this.mouseX = mx;
    this.mouseY = my;

    if (this.player.isRunning()) return;

    const runBtn = this.renderer.getRunButtonRect();
    if (mx >= runBtn.x && mx <= runBtn.x + runBtn.width &&
        my >= runBtn.y && my <= runBtn.y + runBtn.height) {
      this.handleRun();
      return;
    }

    const resetBtn = this.renderer.getResetButtonRect();
    if (mx >= resetBtn.x && mx <= resetBtn.x + resetBtn.width &&
        my >= resetBtn.y && my <= resetBtn.y + resetBtn.height) {
      this.handleReset();
      return;
    }

    const blockOnCanvas = this.blockManager.getBlockOnCanvas(mx, my);
    if (blockOnCanvas) {
      if (this.blockManager.handleLoopClick(blockOnCanvas, mx, my)) {
        return;
      }
      this.blockManager.startDrag(blockOnCanvas, mx, my);
      return;
    }

    const libType = this.blockManager.getBlockAtLibrary(mx, my);
    if (libType) {
      this.blockManager.handleLibraryClick(mx, my);
      const newBlock = this.blockManager.blocks[this.blockManager.blocks.length - 1];
      if (newBlock) {
        this.blockManager.startDrag(newBlock, mx, my);
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this.mouseX = mx;
    this.mouseY = my;

    if (this.blockManager.draggedBlock) {
      this.blockManager.updateDrag(mx, my);
    }

    const runBtn = this.renderer.getRunButtonRect();
    this.runButtonHovered = mx >= runBtn.x && mx <= runBtn.x + runBtn.width &&
                            my >= runBtn.y && my <= runBtn.y + runBtn.height;

    const resetBtn = this.renderer.getResetButtonRect();
    this.resetButtonHovered = mx >= resetBtn.x && mx <= resetBtn.x + resetBtn.width &&
                              my >= resetBtn.y && my <= resetBtn.y + resetBtn.height;

    this.hoveredLibraryType = this.blockManager.getBlockAtLibrary(mx, my);
  }

  private onMouseUp(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this.mouseX = mx;
    this.mouseY = my;

    if (this.blockManager.draggedBlock) {
      this.blockManager.endDrag(mx, my);
    }
  }

  private handleRun(): void {
    if (this.player.isRunning()) return;
    const instructions = this.blockManager.getExecutableBlocks();
    if (instructions.length === 0) return;
    this.successHandled = false;
    this.particles = [];
    this.player.run(instructions);
  }

  private handleReset(): void {
    this.player.resetToStart();
    this.particles = [];
    this.successHandled = false;
    this.updatePlayerGridOffset();
  }

  private spawnParticles(x: number, y: number): void {
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: '#FFD700',
        size: 3 + Math.random() * 4
      });
    }
  }

  private spawnBalloons(): void {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3'];
    for (let i = 0; i < 15; i++) {
      this.balloons.push({
        x: Math.random() * window.innerWidth,
        y: window.innerHeight + 50 + Math.random() * 200,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: 1 + Math.random() * 1.5,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 1 + Math.random() * 2
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= dt / 1000;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateBalloons(dt: number): void {
    for (const b of this.balloons) {
      b.y -= b.speed;
      if (b.y < -100) {
        b.y = window.innerHeight + 50;
        b.x = Math.random() * window.innerWidth;
      }
    }
    if (this.balloons.length < 15 && this.levelManager.isAllCompleted()) {
      this.spawnBalloons();
    }
  }

  private handleLevelComplete(): void {
    if (this.successHandled) return;
    this.successHandled = true;

    const playerState = this.player.getState();
    this.spawnParticles(playerState.pixelX, playerState.pixelY);

    setTimeout(() => {
      const hasNext = this.levelManager.completeLevel();
      if (hasNext) {
        this.blockManager.clearBlocks();
        this.player.resetToStart();
        this.updatePlayerGridOffset();
      } else {
        this.spawnBalloons();
      }
    }, 1500);
  }

  private gameLoop = (): void => {
    const now = performance.now();
    const dt = 16.67;
    this.renderState.time = (now - this.startTime) / 1000;

    this.blockManager.animateBlocks(now);
    this.player.update(now);
    this.updatePlayerGridOffset();

    this.updateParticles(dt);
    this.updateBalloons(dt);

    if (this.player.isSuccess() && !this.successHandled) {
      this.handleLevelComplete();
    }

    this.render();

    requestAnimationFrame(this.gameLoop);
  };

  private render(): void {
    this.renderer.clear();

    const currentLevel = this.levelManager.getCurrentLevel();

    this.renderer.drawLevelTitle(currentLevel.name);

    this.renderer.drawPuzzleArea();

    this.renderer.drawBlockLibrary();
    const libBlocks = this.blockManager.getLibraryBlocks();
    for (const lb of libBlocks) {
      this.renderer.drawBlock(
        lb.type,
        lb.x,
        lb.y,
        lb.width,
        lb.height,
        { hovered: this.hoveredLibraryType === lb.type }
      );
    }

    const playerState = this.player.getState();
    const playerBlockIndex = playerState.currentBlockIndex;

    for (const block of this.blockManager.blocks) {
      const isHighlighted = this.player.isRunning() &&
                            block.slotIndex !== null &&
                            block.slotIndex === playerBlockIndex;
      const blockHeight = block.type === 'loop' ? BLOCK_HEIGHT + 10 : BLOCK_HEIGHT;
      this.renderer.drawBlock(
        block.type,
        block.x,
        block.y,
        BLOCK_WIDTH,
        blockHeight,
        {
          dragged: block.isDragging,
          highlighted: isHighlighted,
          loopCount: block.loopCount
        }
      );
    }

    this.renderer.drawGrid(currentLevel, this.renderState);
    this.player.setGridOffset(this.renderState.gridOffsetX, this.renderState.gridOffsetY);

    this.renderer.drawPlayer(
      playerState.pixelX,
      playerState.pixelY,
      playerState.direction,
      {
        glowing: playerState.glowing,
        flashing: playerState.flashing,
        flashOn: playerState.flashOn,
        trail: playerState.trail
      }
    );

    this.renderer.drawParticles(this.particles);

    this.renderer.drawRunButton(this.runButtonHovered);
    this.renderer.drawResetButton(this.resetButtonHovered);

    this.renderer.drawProgressBar(
      this.levelManager.getCurrentLevelIndex(),
      this.levelManager.getTotalLevels(),
      this.levelManager.getCompletedLevels()
    );

    if (this.levelManager.isAllCompleted()) {
      this.renderer.drawBalloons(this.balloons, this.renderState.time);
      this.renderer.drawCelebration(this.renderState.time);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});

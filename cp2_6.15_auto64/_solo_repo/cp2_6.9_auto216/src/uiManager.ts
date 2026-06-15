import { MazeGenerator, CELL_SIZE } from './mazeGenerator';
import { ShadowEntity, ShadowState } from './shadows';

export interface UIData {
  timeRemaining: number;
  currentCell: { x: number; z: number };
  fragmentsCollected: number;
  totalFragments: number;
  playerCell: { x: number; z: number };
  exitCell: { x: number; z: number } | null;
  shadowState: ShadowState;
  boostInfo: {
    remaining: number;
    max: number;
    cooldown: number;
    isActive: boolean;
  };
}

export class UIManager {
  private mazeGenerator: MazeGenerator;
  private timerElement: HTMLElement;
  private roomElement: HTMLElement;
  private fragmentsElement: HTMLElement;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  private hudTopLeft: HTMLElement;
  private minimapContainer: HTMLElement;
  private gameOverScreen: HTMLElement;
  private gameWinScreen: HTMLElement;
  private startScreen: HTMLElement;
  private boostIndicator: HTMLElement;
  private boostBar: HTMLElement;
  private boostLabel: HTMLElement;
  private totalTime: number = 120;

  constructor(mazeGenerator: MazeGenerator) {
    this.mazeGenerator = mazeGenerator;

    this.timerElement = document.getElementById('timer-value')!;
    this.roomElement = document.getElementById('room-value')!;
    this.fragmentsElement = document.getElementById('fragments-value')!;
    this.minimapCanvas = document.getElementById('minimap') as HTMLCanvasElement;
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;
    this.hudTopLeft = document.getElementById('hud-top-left')!;
    this.minimapContainer = document.getElementById('minimap-container')!;
    this.gameOverScreen = document.getElementById('game-over')!;
    this.gameWinScreen = document.getElementById('game-win')!;
    this.startScreen = document.getElementById('start-screen')!;
    this.boostIndicator = document.getElementById('boost-indicator')!;
    this.boostBar = document.getElementById('boost-bar')!;
    this.boostLabel = document.getElementById('boost-label')!;
  }

  showGameUI(): void {
    this.startScreen.style.display = 'none';
    this.hudTopLeft.style.display = 'flex';
    this.minimapContainer.style.display = 'block';
    this.boostIndicator.style.display = 'block';
    this.gameOverScreen.style.display = 'none';
    this.gameWinScreen.style.display = 'none';
  }

  showStartScreen(): void {
    this.startScreen.style.display = 'flex';
    this.hudTopLeft.style.display = 'none';
    this.minimapContainer.style.display = 'none';
    this.boostIndicator.style.display = 'none';
    this.gameOverScreen.style.display = 'none';
    this.gameWinScreen.style.display = 'none';
  }

  showGameOver(): void {
    this.gameOverScreen.style.display = 'block';
  }

  showGameWin(): void {
    this.gameWinScreen.style.display = 'block';
  }

  update(data: UIData): void {
    this.updateTimer(data.timeRemaining);
    this.updateRoom(data.currentCell);
    this.updateFragments(data.fragmentsCollected, data.totalFragments);
    this.updateMinimap(data);
    this.updateBoost(data.boostInfo);
  }

  private updateTimer(timeRemaining: number): void {
    const seconds = Math.max(0, Math.ceil(timeRemaining));
    this.timerElement.textContent = seconds.toString();

    if (seconds <= 10) {
      this.timerElement.style.animation = 'none';
      this.timerElement.style.animation = `borderPulse 0.5s ease-in-out infinite`;
    } else {
      this.timerElement.style.animation = 'none';
    }
  }

  private updateRoom(cell: { x: number; z: number }): void {
    this.roomElement.textContent = `(${cell.x}, ${cell.z})`;
  }

  private updateFragments(collected: number, total: number): void {
    this.fragmentsElement.textContent = `${collected} / ${total}`;
  }

  private updateBoost(boostInfo: UIData['boostInfo']): void {
    if (boostInfo.isActive) {
      this.boostLabel.textContent = '冲刺中';
      this.boostLabel.style.color = '#FFD700';
      const pct = (boostInfo.remaining / boostInfo.max) * 100;
      this.boostBar.style.width = `${pct}%`;
    } else if (boostInfo.cooldown > 0) {
      this.boostLabel.textContent = '冷却中';
      this.boostLabel.style.color = '#FF6B35';
      const pct = ((3 - boostInfo.cooldown) / 3) * 100;
      this.boostBar.style.width = `${pct}%`;
    } else {
      this.boostLabel.textContent = '就绪';
      this.boostLabel.style.color = '#00FF88';
      this.boostBar.style.width = '100%';
    }
  }

  private updateMinimap(data: UIData): void {
    const ctx = this.minimapCtx;
    const canvas = this.minimapCanvas;
    const mazeSize = this.mazeGenerator.getSize();
    const cellSize = CELL_SIZE;
    const padding = 10;
    const drawSize = Math.min(canvas.width, canvas.height) - padding * 2;
    const cellDrawSize = drawSize / mazeSize;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bgGradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    bgGradient.addColorStop(0, 'rgba(26, 36, 59, 0.9)');
    bgGradient.addColorStop(1, 'rgba(10, 14, 23, 0.9)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cells = this.mazeGenerator.getCells();
    ctx.strokeStyle = 'rgba(160, 196, 255, 0.8)';
    ctx.lineWidth = 2;

    for (let x = 0; x < mazeSize; x++) {
      for (let z = 0; z < mazeSize; z++) {
        const cell = cells[x][z];
        const offsetX = padding + x * cellDrawSize;
        const offsetY = padding + z * cellDrawSize;

        ctx.fillStyle = 'rgba(45, 45, 68, 0.6)';
        ctx.fillRect(offsetX, offsetY, cellDrawSize, cellDrawSize);

        ctx.beginPath();
        if (cell.walls.north) {
          ctx.moveTo(offsetX, offsetY);
          ctx.lineTo(offsetX + cellDrawSize, offsetY);
        }
        if (cell.walls.south) {
          ctx.moveTo(offsetX, offsetY + cellDrawSize);
          ctx.lineTo(offsetX + cellDrawSize, offsetY + cellDrawSize);
        }
        if (cell.walls.west) {
          ctx.moveTo(offsetX, offsetY);
          ctx.lineTo(offsetX, offsetY + cellDrawSize);
        }
        if (cell.walls.east) {
          ctx.moveTo(offsetX + cellDrawSize, offsetY);
          ctx.lineTo(offsetX + cellDrawSize, offsetY + cellDrawSize);
        }
        ctx.stroke();
      }
    }

    if (data.exitCell) {
      const ex = padding + data.exitCell.x * cellDrawSize + cellDrawSize / 2;
      const ey = padding + data.exitCell.z * cellDrawSize + cellDrawSize / 2;

      const exitUnlocked = this.mazeGenerator.isExitUnlocked();
      const glowColor = exitUnlocked ? 'rgba(0, 255, 136, 0.8)' : 'rgba(100, 100, 100, 0.5)';
      const fillColor = exitUnlocked ? '#00FF88' : '#666666';

      ctx.shadowBlur = 10;
      ctx.shadowColor = glowColor;
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(ex, ey, cellDrawSize * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (exitUnlocked) {
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.005);
        ctx.strokeStyle = `rgba(0, 255, 136, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ex, ey, cellDrawSize * 0.45, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (data.shadowState.active) {
      const sx = padding + (data.shadowState.position.x / cellSize) * cellDrawSize + cellDrawSize / 2;
      const sy = padding + (data.shadowState.position.z / cellSize) * cellDrawSize + cellDrawSize / 2;

      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(sx, sy, cellDrawSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    const px = padding + (data.playerCell.x) * cellDrawSize + cellDrawSize / 2;
    const py = padding + (data.playerCell.z) * cellDrawSize + cellDrawSize / 2;

    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(px, py, cellDrawSize * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(74, 144, 217, 0.5)';
    ctx.fillRect(
      padding - 4,
      padding - 4,
      drawSize + 8,
      drawSize + 8
    );
  }

  reset(): void {
    this.updateTimer(this.totalTime);
    this.updateRoom({ x: 0, z: 0 });
    this.updateFragments(0, 3);
    this.gameOverScreen.style.display = 'none';
    this.gameWinScreen.style.display = 'none';
  }
}

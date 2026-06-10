import { Board } from './board.js';
import { PieceManager, Piece } from './pieces.js';
import { EffectSystem } from './effects.js';

type GameState = 'waiting' | 'playing' | 'victory';
type LogType = 'move' | 'cross' | 'explosion';

interface GameLog {
  type: LogType;
  message: string;
  timestamp: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private board: Board;
  private pieceManager: PieceManager;
  private effects: EffectSystem;
  
  private state: GameState = 'waiting';
  private currentPlayer: 1 | 2 = 1;
  private turnTimeRemaining: number = 30000;
  private turnStartTime: number = 0;
  private winner: 1 | 2 | null = null;
  
  private logs: GameLog[] = [];
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private isMobile: boolean = false;
  private drawerOpen: boolean = false;
  
  private logDrawer: HTMLElement | null = null;
  private drawerToggle: HTMLElement | null = null;
  private logList: HTMLElement | null = null;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
    
    this.board = new Board();
    this.pieceManager = new PieceManager();
    this.effects = new EffectSystem();
    
    this.init();
  }

  private init(): void {
    this.resizeCanvas();
    this.setupEventListeners();
    this.setupUIElements();
    this.checkMobile();
    
    const boardCenter = this.board.cellToScreen(3.5, 3.5);
    this.effects.createStardustRing(boardCenter.x, boardCenter.y);
    
    this.pieceManager.init(this.board);
    
    this.state = 'playing';
    this.turnStartTime = Date.now();
    this.turnTimeRemaining = 30000;
    
    this.addLog('move', '游戏开始！玩家1（水蓝）先手');
    
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private setupUIElements(): void {
    this.logDrawer = document.getElementById('logDrawer');
    this.drawerToggle = document.getElementById('drawerToggle');
    this.logList = document.getElementById('logList');
    
    if (this.drawerToggle) {
      this.drawerToggle.addEventListener('click', () => {
        this.drawerOpen = !this.drawerOpen;
        if (this.logDrawer) {
          this.logDrawer.classList.toggle('open', this.drawerOpen);
        }
        if (this.drawerToggle) {
          this.drawerToggle.classList.toggle('open', this.drawerOpen);
        }
      });
    }
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth <= 768 && window.matchMedia("(orientation: portrait)").matches;
    if (this.drawerToggle) {
      this.drawerToggle.classList.toggle('visible', this.isMobile);
    }
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.scale(dpr, dpr);
    
    if (this.board) {
      this.board.updateLayout();
      const boardCenter = this.board.cellToScreen(3.5, 3.5);
      this.effects.createStardustRing(boardCenter.x, boardCenter.y);
    }
    
    this.checkMobile();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resizeCanvas());
    
    this.canvas.addEventListener('click', (e) => this.handleClick(e.clientX, e.clientY));
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handleClick(touch.clientX, touch.clientY);
    }, { passive: false });
  }

  private handleClick(x: number, y: number): void {
    if (this.state !== 'playing') return;
    if (this.pieceManager.pieces.some(p => p.moveAnimation !== null)) return;
    
    const cell = this.board.screenToCell(x, y);
    
    if (!cell) {
      this.pieceManager.selectPiece(null);
      return;
    }
    
    const pieceAtCell = this.pieceManager.getPieceAt(cell.row, cell.col);
    
    if (this.pieceManager.selectedPiece) {
      const reachable = this.pieceManager.selectedPiece.getReachableCells(this.board);
      const isReachable = reachable.some(r => r.row === cell.row && r.col === cell.col);
      
      if (isReachable && !pieceAtCell) {
        this.movePiece(this.pieceManager.selectedPiece, cell.row, cell.col);
        return;
      }
      
      if (pieceAtCell && pieceAtCell.playerId === this.currentPlayer) {
        this.pieceManager.selectPiece(pieceAtCell);
        return;
      }
      
      this.pieceManager.selectPiece(null);
      return;
    }
    
    if (pieceAtCell && pieceAtCell.playerId === this.currentPlayer) {
      this.pieceManager.selectPiece(pieceAtCell);
    }
  }

  private movePiece(piece: Piece, toRow: number, toCol: number): void {
    const fromRow = piece.row;
    const fromCol = piece.col;
    
    piece.move(toRow, toCol);
    
    setTimeout(() => {
      const trail = this.board.addTrail(piece.playerId, fromRow, fromCol, toRow, toCol);
      
      const playerName = piece.playerId === 1 ? '玩家1' : '玩家2';
      this.addLog('move', `${playerName} 移动棋子 (${fromRow},${fromCol}) → (${toRow},${toCol})`);
      
      const crossings = this.board.detectCrossings(trail);
      
      for (const crossing of crossings) {
        this.addLog('cross', `轨迹交叉！位置 (${crossing.row},${crossing.col})`);
        
        const pos = this.board.cellToScreen(crossing.row, crossing.col);
        this.effects.createExplosion(pos.x, pos.y);
        
        this.board.startFlashArea(crossing.row, crossing.col, 2);
        this.board.resetArea(crossing.row, crossing.col, 2);
        
        this.addLog('explosion', `脉冲爆炸！重置 (${crossing.row},${crossing.col}) 周围区域`);
      }
      
      this.pieceManager.selectPiece(null);
      
      const victory = this.board.checkVictory();
      if (victory) {
        this.handleVictory(victory);
        return;
      }
      
      this.nextTurn();
    }, 300);
  }

  private nextTurn(): void {
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    this.turnTimeRemaining = 30000;
    this.turnStartTime = Date.now();
    
    const playerName = this.currentPlayer === 1 ? '玩家1（水蓝）' : '玩家2（橙红）';
    this.addLog('move', `轮到 ${playerName}`);
  }

  private handleVictory(winner: 1 | 2): void {
    this.state = 'victory';
    this.winner = winner;
    
    const playerName = winner === 1 ? '玩家1（水蓝）' : '玩家2（橙红）';
    this.addLog('move', `${playerName} 获胜！`);
    
    this.effects.createVictoryParticles(winner);
  }

  addLog(type: LogType, message: string): void {
    const log: GameLog = {
      type,
      message,
      timestamp: Date.now(),
    };
    this.logs.push(log);
    if (this.logs.length > 50) {
      this.logs.shift();
    }
    this.updateLogUI();
  }

  private updateLogUI(): void {
    if (this.isMobile) {
      this.updateDrawerLog();
    }
  }

  private updateDrawerLog(): void {
    if (!this.logList) return;
    
    this.logList.innerHTML = '';
    for (let i = this.logs.length - 1; i >= 0; i--) {
      const log = this.logs[i];
      const div = document.createElement('div');
      div.className = `log-item ${log.type}`;
      const time = new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      div.textContent = `[${time}] ${log.message}`;
      this.logList.appendChild(div);
    }
  }

  private update(deltaTime: number): void {
    if (this.state === 'playing') {
      this.turnTimeRemaining -= deltaTime;
      if (this.turnTimeRemaining <= 0) {
        this.addLog('move', `${this.currentPlayer === 1 ? '玩家1' : '玩家2'} 超时，跳过回合`);
        this.pieceManager.selectPiece(null);
        this.nextTurn();
      }
    }
    
    this.board.updateFlash();
    this.pieceManager.update(this.board);
    this.effects.update(deltaTime);
  }

  private render(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.ctx.clearRect(0, 0, width, height);
    
    const bgGradient = this.ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#0F1630');
    bgGradient.addColorStop(1, '#1A3A2A');
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, width, height);
    
    this.effects.render(this.ctx);
    
    this.board.render(this.ctx);
    
    this.pieceManager.render(this.ctx, this.board);
    
    this.renderUI();
  }

  private renderUI(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.renderTimer(width, height);
    
    if (!this.isMobile) {
      this.renderDesktopLog(width, height);
      this.renderAreaInfo(width, height);
    }
    
    this.renderCurrentPlayerIndicator(width, height);
  }

  private renderTimer(width: number, height: number): void {
    const time = Math.ceil(this.turnTimeRemaining / 1000);
    const isWarning = time <= 10;
    
    let color = '#FFFFFF';
    let shadowColor = '#A78BFA';
    let fontSize = 36;
    
    if (isWarning) {
      color = '#FF4444';
      const blink = Math.sin(Date.now() * 0.02) > 0;
      if (!blink && time <= 5) {
        fontSize = 44;
      }
    }
    
    this.ctx.save();
    this.ctx.font = `700 ${fontSize}px "Noto Serif SC", serif`;
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'top';
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = shadowColor;
    this.ctx.shadowBlur = isWarning ? 15 : 8;
    this.ctx.fillText(`${time}s`, width - 30, 25);
    this.ctx.restore();
    
    this.ctx.save();
    this.ctx.font = '400 14px "Noto Serif SC", serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.shadowBlur = 0;
    this.ctx.fillText('剩余时间', width - 30, 70);
    this.ctx.restore();
  }

  private renderDesktopLog(width: number, height: number): void {
    const panelX = 20;
    const panelY = 20;
    const panelWidth = 260;
    const panelHeight = height - 40;
    
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(15, 22, 48, 0.85)';
    this.ctx.beginPath();
    this.ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 12);
    this.ctx.fill();
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.restore();
    
    this.ctx.save();
    this.ctx.font = '700 18px "Noto Serif SC", serif';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.textAlign = 'left';
    this.ctx.shadowColor = 'rgba(167, 139, 250, 0.5)';
    this.ctx.shadowBlur = 10;
    this.ctx.fillText('游戏日志', panelX + 20, panelY + 35);
    this.ctx.restore();
    
    this.ctx.save();
    this.ctx.font = '400 13px "Noto Serif SC", serif';
    this.ctx.shadowBlur = 0;
    
    let y = panelY + 70;
    const maxLogs = Math.floor((panelHeight - 90) / 34);
    const startIdx = Math.max(0, this.logs.length - maxLogs);
    
    for (let i = startIdx; i < this.logs.length; i++) {
      const log = this.logs[i];
      
      let color = '#00D4FF';
      if (log.type === 'cross') color = '#FFD700';
      if (log.type === 'explosion') color = '#FF3333';
      
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      this.ctx.beginPath();
      this.ctx.roundRect(panelX + 15, y - 4, panelWidth - 30, 28, 6);
      this.ctx.fill();
      
      this.ctx.fillStyle = color;
      this.ctx.fillRect(panelX + 15, y - 4, 3, 28);
      
      this.ctx.fillStyle = color;
      const time = new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.ctx.fillText(`[${time}] ${log.message}`, panelX + 25, y + 14);
      
      y += 34;
    }
    this.ctx.restore();
  }

  private renderAreaInfo(width: number, height: number): void {
    const panelX = 20;
    const panelY = height - 100;
    const panelWidth = 260;
    
    const area1 = this.board.calculateTotalOwnedCells(1);
    const area2 = this.board.calculateTotalOwnedCells(2);
    const total = this.board.size * this.board.size;
    const pct1 = ((area1 / total) * 100).toFixed(1);
    const pct2 = ((area2 / total) * 100).toFixed(1);
    
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(15, 22, 48, 0.85)';
    this.ctx.beginPath();
    this.ctx.roundRect(panelX, panelY, panelWidth, 80, 12);
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.restore();
    
    this.ctx.save();
    this.ctx.font = '600 14px "Noto Serif SC", serif';
    
    this.ctx.fillStyle = '#00D4FF';
    this.ctx.fillText(`玩家1: ${pct1}%`, panelX + 20, panelY + 30);
    
    this.ctx.fillStyle = '#FF6B35';
    this.ctx.fillText(`玩家2: ${pct2}%`, panelX + 20, panelY + 58);
    
    const barWidth = panelWidth - 120;
    const barX = panelX + 100;
    
    this.ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
    this.ctx.fillRect(barX, panelY + 20, barWidth * (area1 / total), 8);
    
    this.ctx.fillStyle = 'rgba(255, 107, 53, 0.3)';
    this.ctx.fillRect(barX, panelY + 48, barWidth * (area2 / total), 8);
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.51)';
    this.ctx.fillRect(barX + barWidth * 0.51, panelY + 15, 2, 46);
    this.ctx.restore();
  }

  private renderCurrentPlayerIndicator(width: number, height: number): void {
    if (this.state !== 'playing') return;
    
    const playerName = this.currentPlayer === 1 ? '玩家1 回合' : '玩家2 回合';
    const color = this.currentPlayer === 1 ? '#00D4FF' : '#FF6B35';
    
    this.ctx.save();
    this.ctx.font = '700 24px "Noto Serif SC", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15;
    
    if (this.isMobile) {
      this.ctx.fillText(playerName, width / 2, 50);
    } else {
      this.ctx.fillText(playerName, width / 2 + 130, 50);
    }
    this.ctx.restore();
  }

  private gameLoop(): void {
    const now = performance.now();
    const deltaTime = Math.min(now - this.lastTime, 50);
    this.lastTime = now;
    
    this.update(deltaTime);
    this.render();
    
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});

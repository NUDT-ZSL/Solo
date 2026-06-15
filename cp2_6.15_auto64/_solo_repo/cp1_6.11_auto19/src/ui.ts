import type { PlayerState } from './player';

export type GamePhase = 1 | 2 | 3;
export type GameState = 'ready' | 'playing' | 'ended';

const TARGET_OUTER_RADIUS = 60;
const TARGET_INNER_RADIUS = 30;
const COLOR_GOLD = '#FFD700';
const COLOR_RED = '#FF3333';
const COLOR_WHITE = '#FFFFFF';
const COLOR_CYAN = '#00FFFF';

export interface UIData {
  playerState: PlayerState;
  gameState: GameState;
  gamePhase: GamePhase;
  timeRemaining: number;
  centerX: number;
  centerY: number;
  canvasSize: number;
  phaseTransition: boolean;
  phaseTransitionTimer: number;
}

export class UIRenderer {
  private data: UIData;
  private restartButton: { x: number; y: number; width: number; height: number; hover: boolean } = {
    x: 0,
    y: 0,
    width: 200,
    height: 60,
    hover: false
  };
  private resetFlash: number = 0;
  private scorePopups: Array<{ x: number; y: number; score: number; life: number; maxLife: number }> = [];
  
  constructor(data: UIData) {
    this.data = data;
  }
  
  updateData(data: Partial<UIData>): void {
    Object.assign(this.data, data);
  }
  
  addScorePopup(x: number, y: number, score: number): void {
    this.scorePopups.push({ x, y, score, life: 1000, maxLife: 1000 });
  }
  
  triggerResetFlash(): void {
    this.resetFlash = 500;
  }
  
  update(deltaTime: number): void {
    if (this.resetFlash > 0) {
      this.resetFlash = Math.max(0, this.resetFlash - deltaTime);
    }
    
    this.scorePopups = this.scorePopups.filter(popup => {
      popup.life -= deltaTime;
      return popup.life > 0;
    });
  }
  
  checkRestartButton(x: number, y: number): boolean {
    return (
      x >= this.restartButton.x - this.restartButton.width / 2 &&
      x <= this.restartButton.x + this.restartButton.width / 2 &&
      y >= this.restartButton.y - this.restartButton.height / 2 &&
      y <= this.restartButton.y + this.restartButton.height / 2
    );
  }
  
  setButtonHover(hover: boolean): void {
    this.restartButton.hover = hover;
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    this.drawCombo(ctx);
    this.drawEnergyBar(ctx);
    this.drawScore(ctx);
    this.drawTimer(ctx);
    this.drawPhaseIndicator(ctx);
    this.drawScorePopups(ctx);
    
    if (this.data.gameState === 'ended') {
      this.drawEndScreen(ctx);
    }
    
    if (this.resetFlash > 0) {
      this.drawResetFlash(ctx);
    }
  }
  
  private drawCombo(ctx: CanvasRenderingContext2D): void {
    const { playerState } = this.data;
    const x = 40;
    const y = 60;
    
    if (playerState.combo <= 0) return;
    
    ctx.save();
    
    const scale = playerState.comboScale;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);
    
    let color = COLOR_CYAN;
    if (playerState.comboFlash) {
      const flashAlpha = Math.sin(playerState.comboFlashTimer * 0.05) * 0.5 + 0.5;
      color = `rgba(255, 51, 51, ${flashAlpha})`;
    }
    
    ctx.font = 'bold 48px Orbitron, sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    
    ctx.fillText(`${playerState.combo}`, x, y);
    
    ctx.font = 'bold 18px Orbitron, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.shadowBlur = 4;
    ctx.fillText('COMBO', x, y + 50);
    
    ctx.restore();
  }
  
  private drawEnergyBar(ctx: CanvasRenderingContext2D): void {
    const { playerState, canvasSize } = this.data;
    const barWidth = 200;
    const barHeight = 12;
    const x = canvasSize - barWidth - 40;
    const y = 60;
    
    ctx.save();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);
    
    const energyPercent = playerState.energy / 100;
    const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
    
    if (playerState.ultimateReady) {
      const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
      gradient.addColorStop(0, `rgba(255, 215, 0, ${pulse})`);
      gradient.addColorStop(1, `rgba(255, 180, 0, ${pulse})`);
    } else {
      gradient.addColorStop(0, '#8B5CF6');
      gradient.addColorStop(1, '#3B82F6');
    }
    
    ctx.fillStyle = gradient;
    ctx.shadowColor = playerState.ultimateReady ? COLOR_GOLD : '#8B5CF6';
    ctx.shadowBlur = playerState.ultimateReady ? 15 : 8;
    ctx.fillRect(x, y, barWidth * energyPercent, barHeight);
    
    ctx.font = 'bold 14px Orbitron, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.shadowBlur = 4;
    ctx.fillText('ENERGY', x + barWidth, y - 5);
    
    if (playerState.ultimateReady) {
      ctx.font = 'bold 12px Orbitron, sans-serif';
      ctx.fillStyle = COLOR_GOLD;
      ctx.textAlign = 'center';
      ctx.shadowBlur = 8;
      ctx.fillText('点击靶点释放大招!', canvasSize / 2, y + barHeight + 25);
    }
    
    ctx.restore();
  }
  
  private drawScore(ctx: CanvasRenderingContext2D): void {
    const { playerState, canvasSize } = this.data;
    const x = canvasSize - 40;
    const y = 100;
    
    ctx.save();
    ctx.font = 'bold 28px Orbitron, sans-serif';
    ctx.fillStyle = COLOR_WHITE;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.shadowColor = COLOR_WHITE;
    ctx.shadowBlur = 4;
    ctx.fillText(`${playerState.score.toLocaleString()}`, x, y);
    
    ctx.font = 'bold 14px Orbitron, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 0;
    ctx.fillText('SCORE', x, y + 32);
    ctx.restore();
  }
  
  private drawTimer(ctx: CanvasRenderingContext2D): void {
    const { timeRemaining, canvasSize } = this.data;
    const x = canvasSize / 2;
    const y = 50;
    
    const seconds = Math.ceil(timeRemaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeStr = `${minutes}:${secs.toString().padStart(2, '0')}`;
    
    ctx.save();
    ctx.font = 'bold 32px Orbitron, sans-serif';
    ctx.fillStyle = COLOR_WHITE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = COLOR_WHITE;
    ctx.shadowBlur = 4;
    ctx.fillText(timeStr, x, y);
    
    ctx.font = 'bold 14px Orbitron, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 0;
    ctx.fillText('TIME', x, y + 36);
    ctx.restore();
  }
  
  private drawPhaseIndicator(ctx: CanvasRenderingContext2D): void {
    const { gamePhase, phaseTransition, phaseTransitionTimer } = this.data;
    const x = 40;
    const y = 130;
    
    ctx.save();
    
    let glowIntensity = 0.5;
    if (phaseTransition) {
      glowIntensity = Math.sin(phaseTransitionTimer * 0.02) * 0.5 + 0.5;
    }
    
    const colors = ['#00FFFF', '#FF00FF', '#FF6B00'];
    const color = colors[gamePhase - 1];
    
    ctx.font = 'bold 18px Orbitron, sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = color;
    ctx.shadowBlur = 8 + glowIntensity * 8;
    ctx.fillText(`PHASE ${gamePhase}`, x, y);
    
    const phaseNames = ['', '初级', '中级', '高级'];
    ctx.font = 'bold 14px Orbitron, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 4;
    ctx.fillText(phaseNames[gamePhase], x, y + 24);
    
    ctx.restore();
  }
  
  drawTarget(ctx: CanvasRenderingContext2D, targetFlash: boolean, ultimateReady: boolean): void {
    const { centerX, centerY } = this.data;
    
    ctx.save();
    
    let outerColor = 'rgba(200, 200, 200, 0.4)';
    let innerColor = 'rgba(100, 100, 100, 0.3)';
    let glowColor = 'rgba(255, 255, 255, 0.3)';
    let glowBlur = 10;
    let midColor = 'rgba(150, 150, 150, 0.3)';
    let centerColor = 'rgba(200, 200, 200, 0.5)';
    
    if (targetFlash) {
      outerColor = 'rgba(255, 51, 51, 0.9)';
      innerColor = 'rgba(255, 100, 100, 0.6)';
      midColor = 'rgba(255, 80, 80, 0.7)';
      centerColor = 'rgba(255, 51, 51, 0.9)';
      glowColor = COLOR_RED;
      glowBlur = 25;
    } else if (ultimateReady) {
      const pulse = Math.sin(Date.now() * 0.008) * 0.4 + 0.6;
      const pulse2 = Math.sin(Date.now() * 0.012) * 0.3 + 0.7;
      outerColor = `rgba(255, 215, 0, ${0.8 * pulse})`;
      innerColor = `rgba(255, 180, 0, ${0.5 * pulse})`;
      midColor = `rgba(255, 200, 0, ${0.65 * pulse2})`;
      centerColor = `rgba(255, 215, 0, ${pulse})`;
      glowColor = COLOR_GOLD;
      glowBlur = 30 * pulse;
      
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, TARGET_OUTER_RADIUS * 1.5
      );
      gradient.addColorStop(0, `rgba(255, 215, 0, ${0.3 * pulse})`);
      gradient.addColorStop(0.5, `rgba(255, 180, 0, ${0.15 * pulse})`);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, TARGET_OUTER_RADIUS * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
    
    ctx.strokeStyle = outerColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, TARGET_OUTER_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = innerColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, TARGET_INNER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = midColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, (TARGET_OUTER_RADIUS + TARGET_INNER_RADIUS) / 2, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = centerColor;
    ctx.shadowBlur = glowBlur * 0.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
  
  drawPhaseGlow(ctx: CanvasRenderingContext2D): void {
    const { gamePhase, canvasSize, phaseTransition, phaseTransitionTimer } = this.data;
    
    if (!phaseTransition) return;
    
    const pulseAlpha = Math.sin(phaseTransitionTimer * 0.01) * 0.15 + 0.1;
    const colors = ['rgba(0, 255, 255, ', 'rgba(255, 0, 255, ', 'rgba(255, 107, 0, '];
    const color = colors[gamePhase - 1] + pulseAlpha + ')';
    
    ctx.save();
    
    const gradient = ctx.createRadialGradient(
      canvasSize / 2, canvasSize / 2, canvasSize * 0.3,
      canvasSize / 2, canvasSize / 2, canvasSize * 0.7
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, color);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, canvasSize - 8, canvasSize - 8);
    
    ctx.restore();
  }
  
  private drawScorePopups(ctx: CanvasRenderingContext2D): void {
    for (const popup of this.scorePopups) {
      const t = 1 - popup.life / popup.maxLife;
      const easedT = 1 - Math.pow(1 - t, 3);
      const alpha = 1 - t;
      const offsetY = easedT * 50;
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 20px Orbitron, sans-serif';
      ctx.fillStyle = COLOR_GOLD;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = COLOR_GOLD;
      ctx.shadowBlur = 8;
      ctx.fillText(`+${popup.score}`, popup.x, popup.y - offsetY);
      ctx.restore();
    }
  }
  
  private drawEndScreen(ctx: CanvasRenderingContext2D): void {
    const { playerState, centerX, centerY, canvasSize } = this.data;
    
    ctx.save();
    
    ctx.fillStyle = 'rgba(0, 0, 17, 0.85)';
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    
    ctx.font = 'bold 56px Orbitron, sans-serif';
    ctx.fillStyle = COLOR_GOLD;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = COLOR_GOLD;
    ctx.shadowBlur = 16;
    ctx.fillText('游戏结束', centerX, centerY - 150);
    
    ctx.font = 'bold 48px Orbitron, sans-serif';
    ctx.fillStyle = COLOR_WHITE;
    ctx.shadowColor = COLOR_WHITE;
    ctx.shadowBlur = 8;
    ctx.fillText(playerState.score.toLocaleString(), centerX, centerY - 60);
    
    ctx.font = 'bold 18px Orbitron, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 0;
    ctx.fillText('总分', centerX, centerY - 25);
    
    ctx.font = 'bold 32px Orbitron, sans-serif';
    ctx.fillStyle = COLOR_CYAN;
    ctx.shadowColor = COLOR_CYAN;
    ctx.shadowBlur = 8;
    ctx.fillText(`${playerState.maxCombo}`, centerX, centerY + 30);
    
    ctx.font = 'bold 18px Orbitron, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 0;
    ctx.fillText('最高连击', centerX, centerY + 65);
    
    this.restartButton.x = centerX;
    this.restartButton.y = centerY + 140;
    
    const buttonScale = this.restartButton.hover ? 1.05 : 1;
    
    ctx.save();
    ctx.translate(this.restartButton.x, this.restartButton.y);
    ctx.scale(buttonScale, buttonScale);
    ctx.translate(-this.restartButton.x, -this.restartButton.y);
    
    const btnGradient = ctx.createLinearGradient(
      this.restartButton.x - this.restartButton.width / 2,
      this.restartButton.y,
      this.restartButton.x + this.restartButton.width / 2,
      this.restartButton.y
    );
    btnGradient.addColorStop(0, '#8B5CF6');
    btnGradient.addColorStop(1, '#3B82F6');
    
    ctx.fillStyle = btnGradient;
    ctx.shadowColor = '#8B5CF6';
    ctx.shadowBlur = this.restartButton.hover ? 20 : 10;
    ctx.beginPath();
    ctx.roundRect(
      this.restartButton.x - this.restartButton.width / 2,
      this.restartButton.y - this.restartButton.height / 2,
      this.restartButton.width,
      this.restartButton.height,
      12
    );
    ctx.fill();
    
    ctx.font = 'bold 20px Orbitron, sans-serif';
    ctx.fillStyle = COLOR_WHITE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = COLOR_WHITE;
    ctx.shadowBlur = 4;
    ctx.fillText('再来一次', this.restartButton.x, this.restartButton.y);
    
    ctx.restore();
    ctx.restore();
  }
  
  private drawResetFlash(ctx: CanvasRenderingContext2D): void {
    const { canvasSize } = this.data;
    const alpha = this.resetFlash / 500;
    
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    ctx.restore();
  }
  
  drawBackground(ctx: CanvasRenderingContext2D): void {
    const { canvasSize } = this.data;
    
    const gradient = ctx.createRadialGradient(
      canvasSize / 2, canvasSize / 2, 0,
      canvasSize / 2, canvasSize / 2, canvasSize * 0.7
    );
    gradient.addColorStop(0, '#1A0033');
    gradient.addColorStop(1, '#000011');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5) % canvasSize;
      const y = (i * 97.3) % canvasSize;
      const size = (i % 3) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

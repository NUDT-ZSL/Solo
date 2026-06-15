export interface GameUIState {
  score: number;
  highScore: number;
  combo: number;
  lives: number;
  gameOver: boolean;
  boosted: boolean;
  boostIntensity: number;
}

export class UI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameUIState;
  
  private heartShakeTimers: number[] = [0, 0, 0];
  private heartShakeDuration: number = 300;
  private comboScaleAnimation: number = 0;
  private comboScaleDuration: number = 500;
  private lastCombo: number = 0;
  private gameOverAlpha: number = 0;
  private buttonHover: boolean = false;
  private buttonScale: number = 1;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.state = {
      score: 0,
      highScore: 0,
      combo: 0,
      lives: 3,
      gameOver: false,
      boosted: false,
      boostIntensity: 0,
    };
    this.setupInput();
  }

  private setupInput(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.state.gameOver) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const buttonRect = this.getRestartButtonRect();
      this.buttonHover = 
        mouseX >= buttonRect.x &&
        mouseX <= buttonRect.x + buttonRect.width &&
        mouseY >= buttonRect.y &&
        mouseY <= buttonRect.y + buttonRect.height;
      
      this.buttonScale = this.buttonHover ? 1.1 : 1;
    });
    
    this.canvas.addEventListener('click', (e) => {
      if (!this.state.gameOver || this.gameOverAlpha < 0.9) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const buttonRect = this.getRestartButtonRect();
      if (
        mouseX >= buttonRect.x &&
        mouseX <= buttonRect.x + buttonRect.width &&
        mouseY >= buttonRect.y &&
        mouseY <= buttonRect.y + buttonRect.height
      ) {
        this.dispatchRestartEvent();
      }
    });
  }

  private getRestartButtonRect(): { x: number; y: number; width: number; height: number } {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    return {
      x: centerX - 80,
      y: centerY + 60,
      width: 160,
      height: 50,
    };
  }

  private dispatchRestartEvent(): void {
    const event = new CustomEvent('gameRestart');
    window.dispatchEvent(event);
  }

  update(deltaTime: number, newState: Partial<GameUIState>): void {
    Object.assign(this.state, newState);
    
    for (let i = 0; i < this.heartShakeTimers.length; i++) {
      if (this.heartShakeTimers[i] > 0) {
        this.heartShakeTimers[i] -= deltaTime;
      }
    }
    
    if (this.state.combo > this.lastCombo && this.state.combo > 5) {
      this.comboScaleAnimation = this.comboScaleDuration;
    }
    this.lastCombo = this.state.combo;
    
    if (this.comboScaleAnimation > 0) {
      this.comboScaleAnimation -= deltaTime;
    }
    
    if (this.state.gameOver) {
      this.gameOverAlpha = Math.min(1, this.gameOverAlpha + deltaTime * 0.003);
    } else {
      this.gameOverAlpha = 0;
    }
  }

  onLifeLost(lifeIndex: number): void {
    if (lifeIndex >= 0 && lifeIndex < this.heartShakeTimers.length) {
      this.heartShakeTimers[lifeIndex] = this.heartShakeDuration;
    }
  }

  render(): void {
    this.renderScore();
    this.renderCombo();
    this.renderHealthBar();
    
    if (this.state.gameOver && this.gameOverAlpha > 0) {
      this.renderGameOver();
    }
  }

  private renderScore(): void {
    const padding = 30;
    const x = this.canvas.width - padding;
    const y = padding + 10;
    
    this.ctx.save();
    this.ctx.font = 'bold 28px "Segoe UI", "PingFang SC", sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'top';
    
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 4;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`${this.state.score}`, x, y);
    
    this.ctx.font = 'bold 14px "Segoe UI", "PingFang SC", sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fillText('得分', x, y + 35);
    
    if (this.state.highScore > 0) {
      this.ctx.font = '12px "Segoe UI", "PingFang SC", sans-serif';
      this.ctx.fillStyle = 'rgba(255, 213, 79, 0.8)';
      this.ctx.fillText(`最高: ${this.state.highScore}`, x, y + 58);
    }
    
    this.ctx.restore();
  }

  private renderCombo(): void {
    if (this.state.combo <= 0) return;
    
    const padding = 30;
    const x = this.canvas.width - padding;
    const y = padding + 100;
    
    let scale = 1;
    if (this.comboScaleAnimation > 0 && this.state.combo > 5) {
      const progress = 1 - this.comboScaleAnimation / this.comboScaleDuration;
      scale = 1 + Math.sin(progress * Math.PI) * 0.3;
    }
    
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-x, -y);
    
    this.ctx.font = 'bold 24px "Segoe UI", "PingFang SC", sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'top';
    
    const glowIntensity = this.state.combo > 5 ? 20 : 10;
    this.ctx.shadowColor = '#ffd54f';
    this.ctx.shadowBlur = glowIntensity;
    
    this.ctx.fillStyle = '#ffd54f';
    this.ctx.fillText(`${this.state.combo}x`, x, y);
    
    this.ctx.font = 'bold 12px "Segoe UI", "PingFang SC", sans-serif';
    this.ctx.fillStyle = 'rgba(255, 213, 79, 0.8)';
    this.ctx.fillText('连击', x, y + 30);
    
    this.ctx.restore();
  }

  private renderHealthBar(): void {
    const centerX = this.canvas.width / 2;
    const y = 25;
    const heartSize = 24;
    const spacing = 10;
    const totalWidth = 3 * heartSize + 2 * spacing;
    const startX = centerX - totalWidth / 2;
    
    for (let i = 0; i < 3; i++) {
      const x = startX + i * (heartSize + spacing);
      const isActive = i < this.state.lives;
      const isShaking = this.heartShakeTimers[i] > 0;
      
      let drawX = x;
      let drawY = y;
      
      if (isShaking) {
        const shakeProgress = 1 - this.heartShakeTimers[i] / this.heartShakeDuration;
        const shakeIntensity = (1 - shakeProgress) * 5;
        drawX += (Math.random() - 0.5) * shakeIntensity * 2;
        drawY += (Math.random() - 0.5) * shakeIntensity * 2;
      }
      
      this.drawHeart(drawX, drawY, heartSize, isActive);
    }
  }

  private drawHeart(x: number, y: number, size: number, active: boolean): void {
    this.ctx.save();
    
    const color = active ? '#ff6b6b' : '#555555';
    const glowColor = active ? '#ff6b6b' : 'transparent';
    
    if (active) {
      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = 10;
    }
    
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    
    const topY = y + size * 0.3;
    const bottomY = y + size;
    const centerX = x + size / 2;
    
    this.ctx.moveTo(centerX, bottomY);
    this.ctx.bezierCurveTo(
      centerX - size * 0.9,
      y + size * 0.5,
      centerX - size * 0.5,
      y,
      centerX,
      topY
    );
    this.ctx.bezierCurveTo(
      centerX + size * 0.5,
      y,
      centerX + size * 0.9,
      y + size * 0.5,
      centerX,
      bottomY
    );
    this.ctx.closePath();
    this.ctx.fill();
    
    if (active) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.beginPath();
      this.ctx.arc(x + size * 0.35, y + size * 0.35, size * 0.12, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  private renderGameOver(): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    this.ctx.save();
    this.ctx.globalAlpha = this.gameOverAlpha;
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    const panelWidth = 400;
    const panelHeight = 280;
    const panelX = centerX - panelWidth / 2;
    const panelY = centerY - panelHeight / 2;
    
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 20);
    this.ctx.strokeStyle = this.createGradientBorder();
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    this.ctx.clip();
    
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    
    this.ctx.restore();
    
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    this.ctx.font = 'bold 32px "Segoe UI", "PingFang SC", sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.shadowColor = '#00d4ff';
    this.ctx.shadowBlur = 15;
    this.ctx.fillText('游戏结束', centerX, panelY + 50);
    
    this.ctx.shadowBlur = 0;
    this.ctx.font = 'bold 24px "Segoe UI", "PingFang SC", sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`最终得分: ${this.state.score}`, centerX, panelY + 110);
    
    this.ctx.font = '18px "Segoe UI", "PingFang SC", sans-serif';
    this.ctx.fillStyle = '#ffd54f';
    this.ctx.fillText(`最高纪录: ${this.state.highScore}`, centerX, panelY + 145);
    
    const buttonRect = this.getRestartButtonRect();
    this.renderRestartButton(buttonRect);
    
    this.ctx.font = '14px "Segoe UI", "PingFang SC", sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.fillText('按 空格 或 点击按钮 重新开始', centerX, panelY + panelHeight - 30);
    
    this.ctx.restore();
  }

  private createGradientBorder(): CanvasGradient {
    const gradient = this.ctx.createLinearGradient(
      this.canvas.width / 2 - 200,
      this.canvas.height / 2 - 140,
      this.canvas.width / 2 + 200,
      this.canvas.height / 2 + 140
    );
    gradient.addColorStop(0, '#00d4ff');
    gradient.addColorStop(0.5, '#7b2ff7');
    gradient.addColorStop(1, '#00d4ff');
    return gradient;
  }

  private renderRestartButton(rect: { x: number; y: number; width: number; height: number }): void {
    this.ctx.save();
    
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    
    this.ctx.translate(centerX, centerY);
    this.ctx.scale(this.buttonScale, this.buttonScale);
    this.ctx.translate(-centerX, -centerY);
    
    this.ctx.beginPath();
    this.ctx.roundRect(rect.x, rect.y, rect.width, rect.height, 12);
    
    if (this.buttonHover) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.strokeStyle = '#1a1a2e';
    } else {
      const btnGradient = this.ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
      btnGradient.addColorStop(0, '#00d4ff');
      btnGradient.addColorStop(1, '#7b2ff7');
      this.ctx.fillStyle = btnGradient;
      this.ctx.strokeStyle = 'transparent';
    }
    
    this.ctx.lineWidth = 2;
    this.ctx.fill();
    this.ctx.stroke();
    
    this.ctx.font = 'bold 18px "Segoe UI", "PingFang SC", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = this.buttonHover ? '#1a1a2e' : '#ffffff';
    this.ctx.fillText('重新开始', centerX, centerY);
    
    this.ctx.restore();
  }

  reset(): void {
    this.heartShakeTimers = [0, 0, 0];
    this.comboScaleAnimation = 0;
    this.lastCombo = 0;
    this.gameOverAlpha = 0;
    this.buttonHover = false;
    this.buttonScale = 1;
    this.state.gameOver = false;
  }

  getState(): Readonly<GameUIState> {
    return this.state;
  }
}

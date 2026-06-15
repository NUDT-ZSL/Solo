import {
  IProjectile,
  IEnemy,
  IParticle,
  IWeapon,
  WeaponType,
  UI_CONSTANTS,
  PLAYER_CONSTANTS,
  ENEMY_CONSTANTS
} from '../WeaponModule/WeaponType';

interface IToolbarButton {
  type: WeaponType;
  x: number;
  y: number;
  width: number;
  height: number;
  borderAlpha: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width: number;
  private height: number;
  private mapTop: number;
  private mapHeight: number;
  private currentWeaponType: WeaponType = WeaponType.ARROW;
  private toolbarButtons: IToolbarButton[] = [];
  private isGameOver = false;
  private finalScore = 0;
  private borderTransitionSpeed = 0.1;
  private minMapWidth = UI_CONSTANTS.MIN_MAP_WIDTH;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    this.mapTop = 20;
    this.mapHeight = this.height - 130;
    this.updateToolbarButtons();
  }

  getMapBounds(): { top: number; bottom: number; left: number; right: number; height: number; width: number } {
    const mapWidth = Math.max(this.minMapWidth - 40, this.width - 40);
    return {
      top: this.mapTop,
      bottom: this.mapTop + this.mapHeight,
      left: 20,
      right: 20 + mapWidth,
      height: this.mapHeight,
      width: mapWidth
    };
  }

  setCurrentWeapon(type: WeaponType): void {
    this.currentWeaponType = type;
  }

  setGameOver(value: boolean, score = 0): void {
    this.isGameOver = value;
    this.finalScore = score;
  }

  updateSize(width: number, height: number): void {
    this.width = Math.max(width, this.minMapWidth);
    this.height = height;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.mapHeight = this.height - 130;
    this.updateToolbarButtons();
  }

  private updateToolbarButtons(): void {
    const toolbarHeight = UI_CONSTANTS.TOOLBAR_HEIGHT;
    const toolbarWidth = Math.min(
      this.width * UI_CONSTANTS.TOOLBAR_WIDTH_PERCENT,
      this.width - 80
    );
    const toolbarX = (this.width - toolbarWidth) / 2;
    const buttonW = UI_CONSTANTS.BUTTON_WIDTH;
    const buttonH = UI_CONSTANTS.BUTTON_HEIGHT;
    const spacing = 40;
    const totalWidth = buttonW * 3 + spacing * 2;
    const startX = toolbarX + (toolbarWidth - totalWidth) / 2;
    const buttonY = this.height - toolbarHeight + -15 + (toolbarHeight - buttonH) / 2;

    const existingButtons = this.toolbarButtons;
    this.toolbarButtons = [
      {
        type: WeaponType.ARROW,
        x: startX,
        y: buttonY,
        width: buttonW,
        height: buttonH,
        borderAlpha: existingButtons[0]?.borderAlpha ?? (this.currentWeaponType === WeaponType.ARROW ? 1 : 0)
      },
      {
        type: WeaponType.MAGIC,
        x: startX + buttonW + spacing,
        y: buttonY,
        width: buttonW,
        height: buttonH,
        borderAlpha: existingButtons[1]?.borderAlpha ?? (this.currentWeaponType === WeaponType.MAGIC ? 1 : 0)
      },
      {
        type: WeaponType.AXE,
        x: startX + buttonW * 2 + spacing * 2,
        y: buttonY,
        width: buttonW,
        height: buttonH,
        borderAlpha: existingButtons[2]?.borderAlpha ?? (this.currentWeaponType === WeaponType.AXE ? 1 : 0)
      }
    ];
  }

  updateToolbarTransitions(): void {
    for (const btn of this.toolbarButtons) {
      const targetAlpha = btn.type === this.currentWeaponType ? 1 : 0;
      btn.borderAlpha += (targetAlpha - btn.borderAlpha) * this.borderTransitionSpeed;
    }
  }

  getToolbarButtonAt(x: number, y: number): WeaponType | null {
    for (const btn of this.toolbarButtons) {
      if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
        return btn.type;
      }
    }
    return null;
  }

  isPointInMapArea(x: number, y: number): boolean {
    const bounds = this.getMapBounds();
    return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
  }

  clear(): void {
    this.ctx.fillStyle = UI_CONSTANTS.BG_COLOR;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawMap(): void {
    const bounds = this.getMapBounds();
    const radius = UI_CONSTANTS.MAP_RADIUS;
    const x = bounds.left;
    const y = bounds.top;
    const w = bounds.width;
    const h = bounds.height;

    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + w - radius, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    this.ctx.lineTo(x + w, y + h - radius);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    this.ctx.lineTo(x + radius, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
    this.ctx.fillStyle = UI_CONSTANTS.MAP_COLOR;
    this.ctx.fill();
  }

  drawPlayer(
    x: number,
    y: number,
    radius: number,
    healthAnim: number,
    scoreAnim: number,
    score: number,
    health: number
  ): void {
    this.ctx.save();
    this.ctx.shadowColor = PLAYER_CONSTANTS.STROKE_COLOR;
    this.ctx.shadowBlur = 15;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = PLAYER_CONSTANTS.COLOR;
    this.ctx.fill();
    this.ctx.strokeStyle = PLAYER_CONSTANTS.STROKE_COLOR;
    this.ctx.lineWidth = PLAYER_CONSTANTS.STROKE_WIDTH;
    this.ctx.stroke();
    this.ctx.restore();

    this.drawHUD(score, health, scoreAnim, healthAnim);
  }

  private drawHUD(
    score: number,
    health: number,
    scoreAnim: number,
    healthAnim: number
  ): void {
    const scoreScale = 1 + scoreAnim * UI_CONSTANTS.SCORE_SCALE_AMOUNT;
    const healthScale = 1 + healthAnim * UI_CONSTANTS.SCORE_SCALE_AMOUNT;

    this.ctx.save();
    this.ctx.font = `600 ${UI_CONSTANTS.SCORE_FONT_SIZE * scoreScale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`得分: ${score}`, this.width - 30, 50);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.translate(this.width - 30, 80);
    this.ctx.scale(healthScale, healthScale);
    this.drawHeart(0, 0, 12);
    this.ctx.fillStyle = '#ff4444';
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.font = '600 20px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.fillStyle = '#ff4444';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`× ${health}`, this.width - 55, 87);
    this.ctx.restore();
  }

  private drawHeart(x: number, y: number, size: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + size / 4);
    this.ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size / 4);
    this.ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size * 0.75, x, y + size);
    this.ctx.bezierCurveTo(x, y + size * 0.75, x + size / 2, y + size / 2, x + size / 2, y + size / 4);
    this.ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);
    this.ctx.closePath();
  }

  drawEnemy(enemy: IEnemy): void {
    this.ctx.save();
    this.ctx.shadowColor = ENEMY_CONSTANTS.STROKE_COLOR;
    this.ctx.shadowBlur = 8;
    this.ctx.fillStyle = ENEMY_CONSTANTS.COLOR;
    this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    this.ctx.strokeStyle = ENEMY_CONSTANTS.STROKE_COLOR;
    this.ctx.lineWidth = ENEMY_CONSTANTS.STROKE_WIDTH;
    this.ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
    this.ctx.restore();

    const barW = enemy.width;
    const barH = 4;
    const barY = enemy.y - 8;
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(enemy.x, barY, barW, barH);
    this.ctx.fillStyle = ENEMY_CONSTANTS.STROKE_COLOR;
    this.ctx.fillRect(enemy.x, barY, barW * (enemy.health / enemy.maxHealth), barH);
  }

  drawProjectile(proj: IProjectile): void {
    if (proj.trail.length > 1) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(255, 82, 82, 0.4)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(proj.trail[0].x, proj.trail[0].y);
      for (let i = 1; i < proj.trail.length; i++) {
        this.ctx.lineTo(proj.trail[i].x, proj.trail[i].y);
      }
      this.ctx.stroke();
      this.ctx.restore();
    }

    this.ctx.save();
    this.ctx.translate(proj.x, proj.y);
    this.ctx.rotate(proj.rotation);

    switch (proj.weapon.type) {
      case WeaponType.ARROW:
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(-12, -2, 20, 4);
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.beginPath();
        this.ctx.moveTo(8, 0);
        this.ctx.lineTo(4, -5);
        this.ctx.lineTo(4, 5);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.fillRect(-12, -4, 3, 8);
        break;
      case WeaponType.MAGIC:
        this.ctx.shadowColor = '#9b59b6';
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = '#9b59b6';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#e8daef';
        this.ctx.beginPath();
        this.ctx.arc(-2, -2, 3, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case WeaponType.AXE:
        this.ctx.rotate(Date.now() * 0.02);
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(-3, -12, 6, 24);
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.beginPath();
        this.ctx.moveTo(3, -10);
        this.ctx.lineTo(15, -5);
        this.ctx.lineTo(15, 5);
        this.ctx.lineTo(3, 10);
        this.ctx.closePath();
        this.ctx.fill();
        break;
    }

    this.ctx.restore();
  }

  drawParticle(particle: IParticle): void {
    const alpha = particle.life / particle.maxLife;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = particle.color;
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawAimLine(startX: number, startY: number, endX: number, endY: number): void {
    this.ctx.save();
    this.ctx.strokeStyle = UI_CONSTANTS.AIM_LINE_COLOR;
    this.ctx.lineWidth = UI_CONSTANTS.AIM_LINE_WIDTH;
    this.ctx.setLineDash([8, 4]);
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.fillStyle = UI_CONSTANTS.AIM_LINE_COLOR;
    this.ctx.beginPath();
    this.ctx.arc(endX, endY, 6, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawTrajectoryPreview(
    startX: number,
    startY: number,
    weapon: IWeapon,
    targetX: number,
    targetY: number
  ): void {
    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    let vx = (dx / dist) * weapon.speed;
    let vy = (dy / dist) * weapon.speed;
    let px = startX;
    let py = startY;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 82, 82, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    this.ctx.moveTo(px, py);

    for (let i = 0; i < 60; i++) {
      vy += weapon.gravity;
      px += vx;
      py += vy;
      if (px < 0 || px > this.width || py < 0 || py > this.height) break;
      this.ctx.lineTo(px, py);
    }

    this.ctx.stroke();
    this.ctx.restore();
  }

  drawToolbar(): void {
    this.updateToolbarTransitions();

    const toolbarWidth = Math.min(
      this.width * UI_CONSTANTS.TOOLBAR_WIDTH_PERCENT,
      this.width - 80
    );
    const toolbarHeight = UI_CONSTANTS.TOOLBAR_HEIGHT;
    const toolbarX = (this.width - toolbarWidth) / 2;
    const toolbarY = this.height - toolbarHeight - 15;

    this.ctx.save();
    this.ctx.fillStyle = UI_CONSTANTS.TOOLBAR_BG;
    this.ctx.beginPath();
    this.ctx.roundRect(toolbarX, toolbarY, toolbarWidth, toolbarHeight, UI_CONSTANTS.TOOLBAR_RADIUS);
    this.ctx.fill();
    this.ctx.restore();

    for (const btn of this.toolbarButtons) {
      this.drawWeaponIcon(btn);

      const alpha = btn.borderAlpha;
      const borderColor = this.lerpColorHex(
        UI_CONSTANTS.UNSELECTED_BORDER,
        UI_CONSTANTS.SELECTED_BORDER,
        alpha
      );
      const lineWidth = 2 + alpha * 1;

      this.ctx.save();
      this.ctx.strokeStyle = borderColor;
      this.ctx.lineWidth = lineWidth;
      this.ctx.beginPath();
      this.ctx.roundRect(btn.x, btn.y, btn.width, btn.height, UI_CONSTANTS.BUTTON_RADIUS);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private lerpColorHex(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r},${g},${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 136, g: 136, b: 136 };
  }

  private drawWeaponIcon(btn: IToolbarButton): void {
    const cx = btn.x + btn.width / 2;
    const cy = btn.y + btn.height / 2;
    this.ctx.save();
    this.ctx.translate(cx, cy);

    switch (btn.type) {
      case WeaponType.ARROW:
        this.ctx.strokeStyle = '#8b4513';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(-18, 0);
        this.ctx.lineTo(10, 0);
        this.ctx.stroke();
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.beginPath();
        this.ctx.moveTo(10, 0);
        this.ctx.lineTo(4, -5);
        this.ctx.lineTo(4, 5);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.fillRect(-20, -4, 4, 8);
        break;
      case WeaponType.MAGIC:
        this.ctx.shadowColor = '#9b59b6';
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = '#9b59b6';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 12, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#e8daef';
        this.ctx.beginPath();
        this.ctx.arc(-3, -3, 4, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case WeaponType.AXE:
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(-3, -15, 6, 30);
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.beginPath();
        this.ctx.moveTo(3, -12);
        this.ctx.lineTo(18, -6);
        this.ctx.lineTo(18, 6);
        this.ctx.lineTo(3, 12);
        this.ctx.closePath();
        this.ctx.fill();
        break;
    }

    this.ctx.restore();
  }

  drawGameOver(): void {
    if (!this.isGameOver) return;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const panelW = 400;
    const panelH = 250;
    const panelX = (this.width - panelW) / 2;
    const panelY = (this.height - panelH) / 2;

    this.ctx.fillStyle = 'rgba(30, 30, 40, 0.95)';
    this.ctx.beginPath();
    this.ctx.roundRect(panelX, panelY, panelW, panelH, 16);
    this.ctx.fill();
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = '#ff4444';
    this.ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('游戏结束', this.width / 2, panelY + 70);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.fillText(`最终得分: ${this.finalScore}`, this.width / 2, panelY + 130);

    const btnW = 140;
    const btnH = 50;
    const btnX = (this.width - btnW) / 2;
    const btnY = panelY + 170;

    this.ctx.fillStyle = '#ffd700';
    this.ctx.beginPath();
    this.ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    this.ctx.fill();

    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.fillText('重新开始', this.width / 2, btnY + 33);

    this.ctx.restore();
  }

  isRestartButtonClicked(x: number, y: number): boolean {
    if (!this.isGameOver) return false;
    const panelH = 250;
    const panelY = (this.height - panelH) / 2;
    const btnW = 140;
    const btnH = 50;
    const btnX = (this.width - btnW) / 2;
    const btnY = panelY + 170;
    return x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH;
  }
}

import { Role, GameStats, GameState } from '../types';

export class UIRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  setContext(ctx: CanvasRenderingContext2D): void {
    this.ctx = ctx;
  }

  renderTimer(
    x: number,
    y: number,
    timeRemaining: number,
    totalTime: number
  ): void {
    const radius = 25;
    const thickness = 5;
    const ratio = timeRemaining / totalTime;

    const r = Math.floor(255 * (1 - ratio));
    const g = Math.floor(255 * ratio);
    const b = 80;

    const gradient = this.ctx.createLinearGradient(
      x - radius,
      y - radius,
      x + radius,
      y + radius
    );
    gradient.addColorStop(0, `rgb(102, 187, 106)`);
    gradient.addColorStop(1, `rgb(${r}, ${g}, ${b})`);

    this.ctx.save();

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.lineWidth = thickness;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(
      x,
      y,
      radius,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * ratio
    );
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = thickness;
    this.ctx.lineCap = 'round';
    this.ctx.shadowColor = gradient.toString();
    this.ctx.shadowBlur = 5;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    const seconds = Math.ceil(timeRemaining / 1000);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowColor = '#000000';
    this.ctx.shadowBlur = 3;
    this.ctx.fillText(`${seconds}`, x, y);

    this.ctx.font = '10px sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fillText('倒计时', x, y + radius + 12);

    this.ctx.restore();
  }

  renderHunterStatus(
    x: number,
    y: number,
    state: GameState
  ): void {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, 140, 70, 8);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.renderTimer(x + 35, y + 35, state.timeRemaining, state.totalTime);

    const detectionPercent = state.stats.hunter.sonarCount > 0
      ? Math.min(100, (state.stats.hunter.detectionCount / state.stats.hunter.sonarCount) * 100)
      : 0;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 12px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`探测率: ${detectionPercent.toFixed(0)}%`, x + 75, y + 25);
    
    this.ctx.font = '11px sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.fillText(`声波: ${state.stats.hunter.sonarCount}次`, x + 75, y + 45);

    this.ctx.restore();
  }

  renderStalkerStatus(
    x: number,
    y: number,
    health: number,
    shield: number,
    isCrouching: boolean,
    isOnWall: boolean
  ): void {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, 220, 70, 8);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(100, 180, 255, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 11px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('血量', x + 10, y + 20);

    const healthWidth = 200;
    const healthHeight = 15;
    const healthX = x + 10;
    const healthY = y + 25;

    const healthGradient = this.ctx.createLinearGradient(
      healthX,
      healthY,
      healthX + healthWidth,
      healthY
    );
    healthGradient.addColorStop(0, '#66bb6a');
    healthGradient.addColorStop(1, '#ef5350');

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(healthX, healthY, healthWidth, healthHeight);

    this.ctx.fillStyle = healthGradient;
    this.ctx.fillRect(healthX, healthY, healthWidth * (health / 100), healthHeight);

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(healthX, healthY, healthWidth, healthHeight);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 10px sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`${Math.round(health)}%`, healthX + healthWidth - 5, healthY + healthHeight - 3);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 11px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('护盾', x + 10, y + 52);

    const shieldWidth = 180;
    const shieldHeight = 8;
    const shieldX = x + 10;
    const shieldY = y + 57;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(shieldX, shieldY, shieldWidth, shieldHeight);

    this.ctx.fillStyle = '#42a5f5';
    this.ctx.shadowColor = '#42a5f5';
    this.ctx.shadowBlur = 5;
    this.ctx.fillRect(shieldX, shieldY, shieldWidth * (shield / 50), shieldHeight);
    this.ctx.shadowBlur = 0;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(shieldX, shieldY, shieldWidth, shieldHeight);

    let statusY = y + 25;
    if (isCrouching) {
      this.ctx.fillStyle = 'rgba(255, 200, 100, 0.9)';
      this.ctx.font = 'bold 10px sans-serif';
      this.ctx.textAlign = 'right';
      this.ctx.fillText('[蹲伏]', x + 210, statusY);
      statusY += 15;
    }
    if (isOnWall) {
      this.ctx.fillStyle = 'rgba(180, 100, 255, 0.9)';
      this.ctx.font = 'bold 10px sans-serif';
      this.ctx.textAlign = 'right';
      this.ctx.fillText('[贴墙]', x + 210, statusY);
    }

    this.ctx.restore();
  }

  renderSkillIcon(
    x: number,
    y: number,
    diameter: number,
    cooldownPercent: number,
    isReady: boolean,
    isActive: boolean,
    label: string,
    keybind: string
  ): void {
    const radius = diameter / 2;
    const centerX = x + radius;
    const centerY = y + radius;

    this.ctx.save();

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    
    if (isReady) {
      const gradient = this.ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.2,
        centerX,
        centerY,
        radius
      );
      gradient.addColorStop(0, isActive ? '#9370db' : '#64b5f6');
      gradient.addColorStop(1, isActive ? '#5b4aa3' : '#3d8bc4');
      this.ctx.fillStyle = gradient;
      
      this.ctx.shadowColor = isActive ? '#9370db' : '#64b5f6';
      this.ctx.shadowBlur = 15;
    } else {
      this.ctx.fillStyle = '#555555';
    }
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.strokeStyle = isReady ? '#ffffff' : '#888888';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    if (!isReady) {
      const angle = Math.PI * 2 * cooldownPercent - Math.PI / 2;
      
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius - 1, -Math.PI / 2, angle);
      this.ctx.lineTo(centerX, centerY);
      this.ctx.fill();
    }

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowColor = '#000000';
    this.ctx.shadowBlur = 2;
    
    if (label === '影遁') {
      this.ctx.fillText('影', centerX, centerY - 2);
    } else {
      this.ctx.fillText(label[0], centerX, centerY - 2);
    }
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = isReady ? '#ffff00' : '#aaaaaa';
    this.ctx.font = 'bold 10px sans-serif';
    this.ctx.fillText(`[${keybind}]`, centerX, centerY + diameter * 0.3);

    if (!isReady) {
      const remaining = Math.ceil((1 - cooldownPercent) * 20);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.shadowColor = '#000000';
      this.ctx.shadowBlur = 3;
      this.ctx.fillText(`${remaining}s`, centerX, centerY - radius - 8);
      this.ctx.shadowBlur = 0;
    }

    this.ctx.restore();
  }

  renderGameOverPanel(
    canvasWidth: number,
    canvasHeight: number,
    stats: GameStats,
    onRestart: () => void,
    mouseX: number,
    mouseY: number,
    isHovering: boolean,
    isClicked: boolean
  ): { x: number; y: number; w: number; h: number } | null {
    if (!stats.gameOver) return null;

    const panelWidth = 500;
    const panelHeight = 420;
    const panelX = (canvasWidth - panelWidth) / 2;
    const panelY = (canvasHeight - panelHeight) / 2;

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    this.ctx.fillStyle = 'rgba(30, 30, 50, 0.85)';
    this.ctx.beginPath();
    this.ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 16);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    const winnerText = stats.winner === Role.HUNTER ? '猎人胜利！' : '潜行者胜利！';
    const winnerColor = stats.winner === Role.HUNTER ? '#ff6b6b' : '#4ecdc4';

    this.ctx.fillStyle = winnerColor;
    this.ctx.font = 'bold 32px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = winnerColor;
    this.ctx.shadowBlur = 15;
    this.ctx.fillText(winnerText, canvasWidth / 2, panelY + 50);
    this.ctx.shadowBlur = 0;

    const colWidth = (panelWidth - 60) / 2;
    const leftColX = panelX + 30;
    const rightColX = panelX + 30 + colWidth + 20;
    const dataStartY = panelY + 90;
    const rowHeight = 32;

    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('猎人数据', leftColX, dataStartY);

    this.ctx.fillStyle = '#4ecdc4';
    this.ctx.fillText('潜行者数据', rightColX, dataStartY);

    this.ctx.font = '13px sans-serif';
    
    let row = 0;
    this.renderStatRow(leftColX, dataStartY + 30 + row * rowHeight, '抓捕用时', 
      stats.hunter.captureTime > 0 ? `${(stats.hunter.captureTime / 1000).toFixed(1)}s` : '-');
    row++;
    this.renderStatRow(leftColX, dataStartY + 30 + row * rowHeight, '声波释放', `${stats.hunter.sonarCount}次`);
    row++;
    this.renderStatRow(leftColX, dataStartY + 30 + row * rowHeight, '探测命中', `${stats.hunter.detectionCount}次`);

    row = 0;
    this.renderStatRow(rightColX, dataStartY + 30 + row * rowHeight, '存活时间', `${(stats.stalker.surviveTime / 1000).toFixed(1)}s`);
    row++;
    this.renderStatRow(rightColX, dataStartY + 30 + row * rowHeight, '移动距离', `${stats.stalker.moveDistance.toFixed(0)}px`);
    row++;
    this.renderStatRow(rightColX, dataStartY + 30 + row * rowHeight, '影遁释放', `${stats.stalker.shadowCloneCount}次`);

    const btnWidth = 160;
    const btnHeight = 50;
    const btnX = (canvasWidth - btnWidth) / 2;
    const btnY = panelY + panelHeight - 80;

    let btnScale = 1;
    let btnColor = '#4caf50';

    if (isHovering) {
      btnColor = '#388e3c';
    }
    if (isClicked) {
      btnScale = 0.95;
    }

    const scaledWidth = btnWidth * btnScale;
    const scaledHeight = btnHeight * btnScale;
    const scaledX = btnX + (btnWidth - scaledWidth) / 2;
    const scaledY = btnY + (btnHeight - scaledHeight) / 2;

    this.ctx.fillStyle = btnColor;
    this.ctx.beginPath();
    this.ctx.roundRect(scaledX, scaledY, scaledWidth, scaledHeight, 10);
    this.ctx.shadowColor = btnColor;
    this.ctx.shadowBlur = isHovering ? 15 : 8;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('再来一局', btnX + btnWidth / 2, btnY + btnHeight / 2);

    this.ctx.restore();

    return { x: btnX, y: btnY, w: btnWidth, h: btnHeight };
  }

  private renderStatRow(x: number, y: number, label: string, value: string): void {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(label, x, y);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(value, x + 200, y);

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + 6);
    this.ctx.lineTo(x + 200, y + 6);
    this.ctx.stroke();
  }

  renderFPS(
    x: number,
    y: number,
    fps: number
  ): void {
    this.ctx.save();
    this.ctx.fillStyle = fps >= 55 ? 'rgba(100, 255, 100, 0.8)' : 'rgba(255, 100, 100, 0.8)';
    this.ctx.font = 'bold 12px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.shadowColor = '#000000';
    this.ctx.shadowBlur = 2;
    this.ctx.fillText(`FPS: ${fps.toFixed(0)}`, x, y);
    this.ctx.restore();
  }

  renderRoleIndicator(
    x: number,
    y: number,
    role: Role
  ): void {
    this.ctx.save();
    
    const text = role === Role.HUNTER ? '第三人称猎人视角' : '第一人称潜行者视角';
    const color = role === Role.HUNTER ? '#ff6b6b' : '#4ecdc4';
    
    this.ctx.fillStyle = color;
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.shadowColor = '#000000';
    this.ctx.shadowBlur = 3;
    this.ctx.fillText(text, x, y);
    
    this.ctx.font = '11px sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    if (role === Role.STALKER) {
      this.ctx.fillText('WASD移动 | Shift疾跑 | Ctrl蹲伏 | E贴墙 | Q影遁', x, y + 18);
    } else {
      this.ctx.fillText('鼠标点击指定猎人行进方向 | 声波自动释放', x, y + 18);
    }
    
    this.ctx.restore();
  }

  renderStartScreen(
    canvasWidth: number,
    canvasHeight: number,
    mouseX: number,
    mouseY: number,
    isHovering: boolean,
    isClicked: boolean
  ): { x: number; y: number; w: number; h: number } {
    this.ctx.save();

    const gradient = this.ctx.createRadialGradient(
      canvasWidth / 2,
      canvasHeight / 2,
      0,
      canvasWidth / 2,
      canvasHeight / 2,
      Math.max(canvasWidth, canvasHeight) / 2
    );
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0a0a15');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 48px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#64b5f6';
    this.ctx.shadowBlur = 20;
    this.ctx.fillText('声波幽灵猎人', canvasWidth / 2, canvasHeight / 2 - 100);
    this.ctx.shadowBlur = 0;

    this.ctx.font = '16px sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fillText('基于声波反射的非对称对抗游戏', canvasWidth / 2, canvasHeight / 2 - 60);

    const infoY = canvasHeight / 2 - 20;
    this.ctx.font = '13px sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.textAlign = 'left';
    const infoX = canvasWidth / 2 - 200;
    
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.fillText('🔴 猎人', infoX, infoY);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = '12px sans-serif';
    this.ctx.fillText('• 第三人称追捕视角', infoX, infoY + 20);
    this.ctx.fillText('• 每2秒自动发射环形声波', infoX, infoY + 38);
    this.ctx.fillText('• 声波命中潜行者会变红并震动', infoX, infoY + 56);
    this.ctx.fillText('• 60秒内抓到潜行者获胜', infoX, infoY + 74);

    this.ctx.fillStyle = '#4ecdc4';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.fillText('🔵 潜行者', infoX + 250, infoY);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = '12px sans-serif';
    this.ctx.fillText('• 第一人称躲藏视角', infoX + 250, infoY + 20);
    this.ctx.fillText('• WASD移动 / Shift疾跑 / Ctrl蹲伏', infoX + 250, infoY + 38);
    this.ctx.fillText('• Q释放影遁（假声波诱饵）', infoX + 250, infoY + 56);
    this.ctx.fillText('• 存活60秒获胜', infoX + 250, infoY + 74);

    const btnWidth = 200;
    const btnHeight = 60;
    const btnX = (canvasWidth - btnWidth) / 2;
    const btnY = canvasHeight / 2 + 100;

    let btnScale = 1;
    let btnColor = '#4caf50';

    if (isHovering) {
      btnColor = '#388e3c';
    }
    if (isClicked) {
      btnScale = 0.95;
    }

    const scaledWidth = btnWidth * btnScale;
    const scaledHeight = btnHeight * btnScale;
    const scaledX = btnX + (btnWidth - scaledWidth) / 2;
    const scaledY = btnY + (btnHeight - scaledHeight) / 2;

    this.ctx.fillStyle = btnColor;
    this.ctx.beginPath();
    this.ctx.roundRect(scaledX, scaledY, scaledWidth, scaledHeight, 12);
    this.ctx.shadowColor = btnColor;
    this.ctx.shadowBlur = isHovering ? 20 : 10;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('开始游戏', btnX + btnWidth / 2, btnY + btnHeight / 2);

    this.ctx.restore();

    return { x: btnX, y: btnY, w: btnWidth, h: btnHeight };
  }
}

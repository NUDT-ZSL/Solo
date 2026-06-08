import { Beetle } from './beetle';
import { BattleLogEntry, FloatingDamage, Particle } from './battle';

export interface UIButton {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  icon: string;
  hovered: boolean;
  actionType: 'attack' | 'defend' | 'counter' | 'ultimate';
  disabled: boolean;
  normalColor: string;
  hoverColor: string;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private shakeOffset: { x: number; y: number };
  buttons: UIButton[];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.shakeOffset = { x: 0, y: 0 };
    this.buttons = [];
    this.initButtons();
  }

  initButtons(): void {
    const baseY = 600;
    const btnWidth = 140;
    const btnHeight = 60;
    const spacing = 20;
    const startX = (this.canvas.width - (btnWidth * 4 + spacing * 3)) / 2;

    this.buttons = [
      {
        x: startX, y: baseY, width: btnWidth, height: btnHeight,
        label: '普通攻击', icon: '⚔️',
        hovered: false, actionType: 'attack', disabled: false,
        normalColor: '#8B2500', hoverColor: '#A52A2A'
      },
      {
        x: startX + btnWidth + spacing, y: baseY, width: btnWidth, height: btnHeight,
        label: '铁壁防御', icon: '🛡️',
        hovered: false, actionType: 'defend', disabled: false,
        normalColor: '#B8860B', hoverColor: '#DAA520'
      },
      {
        x: startX + (btnWidth + spacing) * 2, y: baseY, width: btnWidth, height: btnHeight,
        label: '尖刺反击', icon: '🦔',
        hovered: false, actionType: 'counter', disabled: false,
        normalColor: '#556B2F', hoverColor: '#6B8E23'
      },
      {
        x: startX + (btnWidth + spacing) * 3, y: baseY, width: btnWidth, height: btnHeight,
        label: '必杀技', icon: '💥',
        hovered: false, actionType: 'ultimate', disabled: false,
        normalColor: '#8B0000', hoverColor: '#B22222'
      }
    ];
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  updateShake(intensity: number): void {
    if (intensity > 0) {
      this.shakeOffset.x = (Math.random() - 0.5) * intensity * 2;
      this.shakeOffset.y = (Math.random() - 0.5) * intensity * 2;
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }
  }

  drawArena(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.shakeOffset.x, this.shakeOffset.y);

    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#1a0f08');
    gradient.addColorStop(0.5, '#2d1a0c');
    gradient.addColorStop(1, '#1a0f08');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#3d2817';
    ctx.fillRect(0, 500, this.canvas.width, 100);

    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 500);
    ctx.lineTo(this.canvas.width, 500);
    ctx.stroke();

    ctx.strokeStyle = '#5c3d1e';
    for (let i = 0; i < this.canvas.width; i += 60) {
      ctx.beginPath();
      ctx.moveTo(i, 500);
      ctx.lineTo(i + 30, 540);
      ctx.lineTo(i + 60, 500);
      ctx.stroke();
    }

    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, this.canvas.width - 20, this.canvas.height - 20);

    const cornerSize = 25;
    ctx.fillStyle = '#c9a227';
    const corners = [
      [10, 10], [this.canvas.width - 10 - cornerSize, 10],
      [10, this.canvas.height - 10 - cornerSize],
      [this.canvas.width - 10 - cornerSize, this.canvas.height - 10 - cornerSize]
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.arc(cx + cornerSize / 2, cy + cornerSize / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawBeetle(beetle: Beetle, isAttacker: boolean): void {
    beetle.scale = isAttacker ? 1.2 : 0.85;

    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.shakeOffset.x, this.shakeOffset.y);
    ctx.translate(beetle.position.x, beetle.position.y);

    let offsetX = 0;
    if (beetle.state.isHit) {
      const flash = Math.sin(beetle.state.hitTimer * 50) > 0;
      if (beetle.facing === 'right') {
        offsetX = -5;
      } else {
        offsetX = 5;
      }
      if (flash) {
        ctx.globalAlpha = 0.6;
      }
    }
    ctx.translate(offsetX, 0);

    ctx.scale(beetle.facing === 'right' ? beetle.scale : -beetle.scale, beetle.scale);

    this.drawBeetleBody(beetle);

    ctx.restore();
  }

  private drawBeetleBody(beetle: Beetle): void {
    const ctx = this.ctx;
    const legColor = beetle.colors.legs;
    const bodyColor = beetle.colors.body;
    const eyeColor = beetle.colors.eyes;

    ctx.save();

    ctx.fillStyle = legColor;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;

    const legPositions = [
      { x: -40, y: 15 },
      { x: -20, y: 20 },
      { x: 0, y: 22 },
      { x: 20, y: 20 },
      { x: 35, y: 18 },
      { x: 50, y: 12 }
    ];

    for (let i = 0; i < 3; i++) {
      legPositions.forEach((pos, idx) => {
        const side = i === 0 ? -1 : 1;
        const yOff = i === 1 ? pos.y + 5 : pos.y - 5;
        const xDir = idx < 3 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(pos.x, yOff);
        ctx.lineTo(pos.x - 15 * xDir, yOff + 20 * side);
        ctx.lineTo(pos.x - 25 * xDir, yOff + 30 * side);
        ctx.stroke();
      });
    }

    const bodyPoints: [number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.PI / 8;
      const rx = 55;
      const ry = 38;
      bodyPoints.push([
        Math.cos(angle) * rx, Math.sin(angle) * ry]);
    }

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(bodyPoints[0][0], bodyPoints[0][1]);
    for (let i = 1; i < bodyPoints.length; i++) {
      ctx.lineTo(bodyPoints[i][0], bodyPoints[i][1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -38);
    ctx.lineTo(0, 38);
    ctx.stroke();

    ctx.fillStyle = eyeColor;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(30, -12, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(30, 12, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(32, -14, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(32, 10, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(45, -8);
    ctx.lineTo(55, -20);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(55, -22, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(45, 8);
    ctx.lineTo(55, 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(55, 22, 5, 0, Math.PI * 2);
    ctx.stroke();

    if (beetle.state.isDefending) {
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = '#4488ff';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, 75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (beetle.state.isCountering) {
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = '#88ff44';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        const r1 = 60;
        const r2 = 80;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
        ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  drawStatsPanel(beetle: Beetle, x: number, y: number, isCurrentTurn: boolean): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.shakeOffset.x, this.shakeOffset.y);

    const panelWidth = 240;
    const panelHeight = 160;

    ctx.fillStyle = 'rgba(30, 18, 10, 0.9)';
    ctx.fillRect(x, y, panelWidth, panelHeight);

    ctx.strokeStyle = isCurrentTurn ? '#ffd700' : '#c9a227';
    ctx.lineWidth = isCurrentTurn ? 4 : 2;
    ctx.strokeRect(x, y, panelWidth, panelHeight);

    ctx.fillStyle = beetle.colors.body;
    ctx.font = 'bold 20px Georgia';
    ctx.fillText(beetle.name, x + 15, y + 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Georgia';

    const statsY = y + 55;
    ctx.fillText(`❤️ 生命值:`, x + 15, statsY);

    const hpBarWidth = 160;
    const hpBarHeight = 18;
    const hpX = x + 80;
    const hpY = statsY - 14;
    ctx.fillStyle = '#333333';
    ctx.fillRect(hpX, hpY, hpBarWidth, hpBarHeight);

    const hpPercent = beetle.state.displayHp / beetle.stats.maxHp;
    const hpColor = hpPercent > 0.5 ? '#44ff44' : hpPercent > 0.25 ? '#ffaa00' : '#ff4444';
    ctx.fillStyle = hpColor;
    ctx.fillRect(hpX, hpY, hpBarWidth * hpPercent, hpBarHeight);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpX, hpY, hpBarWidth, hpBarHeight);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.ceil(beetle.state.displayHp)}/${beetle.stats.maxHp}`, hpX + hpBarWidth / 2 - 20, hpY + 14);

    ctx.fillStyle = '#ffffff';
    const energyY = statsY + 25;
    ctx.fillText(`⚡ 能量:`, x + 15, energyY);
    const energyPercent = beetle.stats.energy / beetle.stats.maxEnergy;
    ctx.fillStyle = '#333333';
    ctx.fillRect(hpX, energyY - 14, hpBarWidth, hpBarHeight);
    ctx.fillStyle = '#44aaff';
    ctx.fillRect(hpX, energyY - 14, hpBarWidth * energyPercent, hpBarHeight);
    ctx.strokeRect(hpX, energyY - 14, hpBarWidth, hpBarHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${beetle.stats.energy}/${beetle.stats.maxEnergy}`, hpX + hpBarWidth / 2 - 20, energyY);

    ctx.fillStyle = '#cccccc';
    ctx.font = '13px Georgia';
    ctx.fillText(`⚔️ 攻击: ${beetle.stats.attack}`, x + 15, energyY + 25);
    ctx.fillText(`🛡️ 防御: ${beetle.stats.defense}`, x + 15, energyY + 45);
    ctx.fillText(`💨 速度: ${beetle.stats.speed}`, x + 130, energyY + 25);

    if (isCurrentTurn) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 12px Georgia';
      ctx.fillText('▶ 当前行动', x + 130, energyY + 45);
    }

    ctx.restore();
  }

  drawFloatingDamage(damages: FloatingDamage[]): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.shakeOffset.x, this.shakeOffset.y);

    for (const d of damages) {
      const alpha = Math.min(1, d.timer / d.maxTimer);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = d.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.font = `bold ${d.isCounter ? 28 : 32}px Georgia`;
      ctx.textAlign = 'center';
      const text = (d.isCounter ? '反 ' : '') + `-${d.value}`;
      ctx.strokeText(text, d.x, d.y);
      ctx.fillText(text, d.x, d.y);
    }
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.shakeOffset.x, this.shakeOffset.y);

    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawFlash(color: string, alpha: number): void {
    if (alpha <= 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }

  drawButtons(currentBeetle: Beetle | null): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.shakeOffset.x, this.shakeOffset.y);

    for (const btn of this.buttons) {
      this.drawButton(btn, currentBeetle);
    }

    ctx.restore();
  }

  private drawButton(btn: UIButton, currentBeetle: Beetle | null): void {
    const ctx = this.ctx;
    const disabled = btn.disabled || !currentBeetle;

    const yOffset = btn.hovered && !disabled ? -3 : 0;
    const y = btn.y + yOffset;

    const gradient = ctx.createLinearGradient(btn.x, y, btn.x, y + btn.height);
    if (disabled) {
      gradient.addColorStop(0, '#555555');
      gradient.addColorStop(1, '#333333');
    } else if (btn.hovered) {
      gradient.addColorStop(0, btn.hoverColor);
      gradient.addColorStop(1, btn.normalColor);
    } else {
      gradient.addColorStop(0, btn.normalColor);
      gradient.addColorStop(1, btn.hoverColor);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(btn.x, y, btn.width, btn.height);

    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 3;
    ctx.strokeRect(btn.x, y, btn.width, btn.height);

    if (btn.hovered && !disabled) {
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(btn.x + 3, y + 3, btn.width - 6, btn.height - 6);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(btn.x + 3, y + 3, btn.width - 6, 10);
    }

    ctx.fillStyle = disabled ? '#888888' : '#ffffff';
    ctx.font = 'bold 16px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(btn.icon + ' ' + btn.label, btn.x + btn.width / 2, y + btn.height / 2 + 5);
    ctx.textAlign = 'left';

    if (btn.actionType === 'ultimate' && currentBeetle) {
      ctx.fillStyle = currentBeetle.stats.energy < 20 ? '#ff6666' : '#88ff88';
      ctx.font = '11px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText(`消耗20能量`, btn.x + btn.width / 2, y + btn.height - 8);
      ctx.textAlign = 'left';
    }
  }

  drawBattleLog(logs: BattleLogEntry[]): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.shakeOffset.x, this.shakeOffset.y);

    const panelX = 970;
    const panelY = 100;
    const panelWidth = 300;
    const panelHeight = 460;

    ctx.fillStyle = 'rgba(20, 12, 6, 0.9)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('⚔️ 战斗日志', panelX + panelWidth / 2, panelY + 30);
    ctx.textAlign = 'left';

    ctx.beginPath();
    ctx.moveTo(panelX + 20, panelY + 40);
    ctx.lineTo(panelX + panelWidth - 20, panelY + 40);
    ctx.strokeStyle = '#c9a227';
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(panelX + 10, panelY + 50, panelWidth - 20, panelHeight - 60);
    ctx.clip();

    let y = panelY + 70;
    for (let i = 0; i < Math.min(logs.length, 25); i++) {
      const entry = logs[i];
      const time = new Date(entry.timestamp);
      const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

      ctx.fillStyle = '#888888';
      ctx.font = '11px Georgia';
      ctx.fillText(`[${timeStr}]`, panelX + 15, y);

      ctx.fillStyle = entry.color;
      ctx.font = '13px Georgia';
      const msgStart = panelX + 65;
      ctx.fillText(entry.action + ' ' + entry.message, msgStart, y);

      ctx.fillStyle = '#cccccc';
      ctx.font = '11px Georgia';
      ctx.fillText(entry.actor, panelX + 15, y + 14);

      y += 32;
    }

    ctx.restore();
    ctx.restore();
  }

  drawDeathFragments(effect: { active: boolean; beetleIndex: number; fragments: Array<{ x: number; y: number; rotation: number; size: number; color: string }>}): void {
    if (!effect.active) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.shakeOffset.x, this.shakeOffset.y);

    for (const f of effect.fragments) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rotation);
      ctx.fillStyle = f.color;
      ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(-f.size / 2, -f.size / 2, f.size, f.size);
      ctx.restore();
    }

    ctx.restore();
  }

  drawVictory(beetles: [Beetle, Beetle], victory: { active: boolean; timer: number; winnerIndex: number }): void {
    if (!victory.active) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.shakeOffset.x, this.shakeOffset.y);

    const glowRadius = Math.min(1, victory.timer / 1.5);
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 400);
    glowGradient.addColorStop(0, `rgba(255, 215, 0, ${0.6 * glowRadius})`);
    glowGradient.addColorStop(0.5, `rgba(255, 200, 0, ${0.3 * glowRadius})`);
    glowGradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (victory.timer > 0.5 && victory.winnerIndex >= 0) {
      const winner = beetles[victory.winnerIndex];
      const appearT = Math.min(1, (victory.timer - 0.5) / 1);
      const scale = 0.5 + appearT * 1.5;
      const rotation = (victory.timer - 0.5) * Math.PI * 2;

      ctx.save();
      ctx.translate(centerX, centerY - 50);
      ctx.rotate(rotation * (1 - appearT));
      ctx.scale(scale, scale);
      ctx.globalAlpha = appearT;

      const bodyPoints: [number, number][] = [];
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + Math.PI / 8;
        const rx = 55;
        const ry = 38;
        bodyPoints.push([Math.cos(angle) * rx, Math.sin(angle) * ry]);
      }
      ctx.fillStyle = winner.colors.body;
      ctx.beginPath();
      ctx.moveTo(bodyPoints[0][0], bodyPoints[0][1]);
      for (let i = 1; i < bodyPoints.length; i++) {
        ctx.lineTo(bodyPoints[i][0], bodyPoints[i][1]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = winner.colors.eyes;
      ctx.beginPath();
      ctx.arc(30, -12, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(30, 12, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      if (appearT >= 1) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 60px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 胜利！ 🏆', centerX, centerY + 130);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Georgia';
        ctx.fillText(`${winner.name} 获胜！`, centerX, centerY + 180);
        ctx.textAlign = 'left';
      }
    }

    if (victory.timer > 2.5) {
      const btnX = centerX - 100;
      const btnY = centerY + 220;
      ctx.fillStyle = '#8B2500';
      ctx.fillRect(btnX, btnY, 200, 50);
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 3;
      ctx.strokeRect(btnX, btnY, 200, 50);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('🔄 重新开始', centerX, btnY + 33);
      ctx.textAlign = 'left';
    }

    ctx.restore();
  }

  getButtonAt(x: number, y: number): UIButton | null {
    for (const btn of this.buttons) {
      if (x >= btn.x && x <= btn.x + btn.width &&
          y >= btn.y && y <= btn.y + btn.height) {
        return btn;
      }
    }
    return null;
  }

  isRestartButton(x: number, y: number, victory: { active: boolean; timer: number }): boolean {
    if (!victory.active || victory.timer <= 2.5) return false;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const btnX = centerX - 100;
    const btnY = centerY + 220;
    return x >= btnX && x <= btnX + 200 && y >= btnY && y <= btnY + 50;
  }
}

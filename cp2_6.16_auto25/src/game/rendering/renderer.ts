import type { PlayerState, AsteroidState, MeteorState, Particle, ChatMessage, UpgradeType } from '../../types';
import { ORE_COLORS, ORE_NAMES, ORE_VALUES } from '../../types';
import { PerlinNoise } from '../../utils/perlin';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private perlin: PerlinNoise;
  private cloudOffset: number = 0;
  private cameraX: number = 0;
  private cameraY: number = 0;
  private baseX: number = 1000;
  private baseY: number = 750;
  private highlightTime: number = 0;
  private beamPhase: number = 0;
  private upgradeAnimationTime: Record<string, number> = {};
  private lastMeteorTrailTime: number = 0;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.perlin = new PerlinNoise(12345);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  
  resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  clear(): void {
    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  drawNebulaBackground(deltaTime: number): void {
    this.cloudOffset += deltaTime * 0.5;
    
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height / 2,
      0,
      this.canvas.width / 2,
      this.canvas.height / 2,
      Math.max(this.canvas.width, this.canvas.height) / 2
    );
    gradient.addColorStop(0, '#3b0066');
    gradient.addColorStop(1, '#1a0033');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    const cloudLayers = 3;
    for (let layer = 0; layer < cloudLayers; layer++) {
      this.drawCloudLayer(layer);
    }
    
    this.drawStars();
  }
  
  private drawCloudLayer(layer: number): void {
    const imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
    const data = imageData.data;
    
    const scale = 0.002 + layer * 0.001;
    const offset = this.cloudOffset * (0.5 + layer * 0.3);
    const alpha = 0.1 + layer * 0.05;
    
    for (let y = 0; y < this.canvas.height; y++) {
      for (let x = 0; x < this.canvas.width; x++) {
        const nx = x * scale + offset;
        const ny = y * scale + offset * 0.7;
        
        const noise = this.perlin.octaveNoise2D(nx, ny, 4, 0.5);
        const value = (noise + 1) / 2;
        
        const idx = (y * this.canvas.width + x) * 4;
        
        if (value > 0.55) {
          const intensity = Math.pow((value - 0.55) / 0.45, 1.5);
          const r = Math.floor(59 * intensity * alpha);
          const g = Math.floor(0 * intensity * alpha);
          const b = Math.floor(102 * intensity * alpha);
          
          data[idx] = Math.min(255, r);
          data[idx + 1] = Math.min(255, g);
          data[idx + 2] = Math.min(255, b);
          data[idx + 3] = Math.floor(255 * intensity * alpha);
        }
      }
    }
    
    this.ctx.putImageData(imageData, 0, 0);
  }
  
  private drawStars(): void {
    this.ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
      const x = (i * 137.5) % this.canvas.width;
      const y = (i * 89.3) % this.canvas.height;
      const size = (i % 3) * 0.5 + 0.5;
      const twinkle = Math.sin(Date.now() * 0.002 + i) * 0.3 + 0.7;
      this.ctx.globalAlpha = twinkle * 0.8;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }
  
  updateCamera(playerX: number, playerY: number): void {
    this.cameraX = playerX - this.canvas.width / 2;
    this.cameraY = playerY - this.canvas.height / 2;
  }
  
  worldToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: x - this.cameraX,
      y: y - this.cameraY
    };
  }
  
  screenToWorld(x: number, y: number): { x: number; y: number } {
    return {
      x: x + this.cameraX,
      y: y + this.cameraY
    };
  }
  
  drawBase(): void {
    const pos = this.worldToScreen(this.baseX, this.baseY);
    
    this.beamPhase += 0.05;
    
    const beamGradient = this.ctx.createRadialGradient(
      pos.x, pos.y, 0,
      pos.x, pos.y, 80
    );
    beamGradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    beamGradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.1)');
    beamGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    this.ctx.fillStyle = beamGradient;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, 80, 0, Math.PI * 2);
    this.ctx.fill();
    
    const beamHeight = 150 + Math.sin(this.beamPhase) * 20;
    const beamGradient2 = this.ctx.createLinearGradient(
      pos.x, pos.y,
      pos.x, pos.y - beamHeight
    );
    beamGradient2.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
    beamGradient2.addColorStop(1, 'rgba(255, 215, 0, 0)');
    this.ctx.fillStyle = beamGradient2;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x - 30, pos.y);
    this.ctx.lineTo(pos.x + 30, pos.y);
    this.ctx.lineTo(pos.x + 15, pos.y - beamHeight);
    this.ctx.lineTo(pos.x - 15, pos.y - beamHeight);
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, 80, 0, Math.PI * 2);
    this.ctx.stroke();
    
    this.ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, 80, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 14px Segoe UI';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('基 地', pos.x, pos.y + 5);
  }
  
  drawAsteroid(asteroid: AsteroidState, playerX: number, playerY: number, highlightTime: number): void {
    const pos = this.worldToScreen(asteroid.x, asteroid.y);
    const color = ORE_COLORS[asteroid.type];
    const scale = asteroid.volume / 100;
    
    const points = asteroid.vertices.map(v => ({
      x: pos.x + Math.cos(v.angle) * asteroid.size * v.radius * scale,
      y: pos.y + Math.sin(v.angle) * asteroid.size * v.radius * scale
    }));
    
    this.ctx.save();
    
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.closePath();
    
    const gradient = this.ctx.createRadialGradient(
      pos.x - asteroid.size * 0.3,
      pos.y - asteroid.size * 0.3,
      0,
      pos.x,
      pos.y,
      asteroid.size
    );
    gradient.addColorStop(0, this.lightenColor(color, 30));
    gradient.addColorStop(1, this.darkenColor(color, 30));
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    this.ctx.strokeStyle = this.darkenColor(color, 20);
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    if (asteroid.type === 'crystal') {
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 15;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }
    
    const isNearPlayer = Math.hypot(asteroid.x - playerX, asteroid.y - playerY) < 80;
    
    if (isNearPlayer) {
      const dashOffset = (highlightTime % 500) < 250 ? 1 : 0.3;
      this.ctx.globalAlpha = dashOffset;
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.lineDashOffset = -highlightTime * 0.02;
      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.ctx.lineTo(points[i].x, points[i].y);
      }
      this.ctx.closePath();
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      this.ctx.globalAlpha = 1;
    }
    
    this.ctx.restore();
  }
  
  drawPlayer(player: PlayerState, isLocal: boolean): void {
    const pos = this.worldToScreen(player.x, player.y);
    
    this.ctx.save();
    this.ctx.translate(pos.x, pos.y);
    this.ctx.rotate(player.rotation);
    
    if (player.damaged) {
      this.ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.05) * 0.5;
    }
    
    this.ctx.fillStyle = player.color;
    this.ctx.beginPath();
    this.ctx.moveTo(20, 0);
    this.ctx.lineTo(-15, -12);
    this.ctx.lineTo(-10, 0);
    this.ctx.lineTo(-15, 12);
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.strokeStyle = isLocal ? '#ffffff' : this.darkenColor(player.color, 30);
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    if (isLocal) {
      this.ctx.shadowColor = player.color;
      this.ctx.shadowBlur = 10;
      this.ctx.strokeStyle = player.color;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }
    
    this.ctx.restore();
    
    const shieldWidth = 40;
    const shieldHeight = 4;
    const shieldX = pos.x - shieldWidth / 2;
    const shieldY = pos.y - 25;
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(shieldX, shieldY, shieldWidth, shieldHeight);
    
    const shieldPercent = player.shield / player.maxShield;
    const shieldColor = shieldPercent > 0.5 ? '#69f0ae' : shieldPercent > 0.25 ? '#ffd740' : '#ff5252';
    this.ctx.fillStyle = shieldColor;
    this.ctx.fillRect(shieldX, shieldY, shieldWidth * shieldPercent, shieldHeight);
    
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(shieldX, shieldY, shieldWidth, shieldHeight);
    
    if (isLocal) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '10px Segoe UI';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(player.name, pos.x, pos.y - 32);
    }
  }
  
  drawMeteor(meteor: MeteorState, deltaTime: number, particleSystem: any): void {
    const pos = this.worldToScreen(meteor.x, meteor.y);
    
    const now = Date.now();
    if (now - this.lastMeteorTrailTime > 20) {
      particleSystem.spawnMeteorTrail(meteor.x, meteor.y, meteor.rotation);
      this.lastMeteorTrailTime = now;
    }
    
    this.ctx.save();
    this.ctx.translate(pos.x, pos.y);
    this.ctx.rotate(meteor.rotation);
    
    this.ctx.fillStyle = '#ffd700';
    this.ctx.beginPath();
    this.ctx.moveTo(12, 0);
    this.ctx.lineTo(-8, -6);
    this.ctx.lineTo(-5, 0);
    this.ctx.lineTo(-8, 6);
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.shadowColor = '#ffd700';
    this.ctx.shadowBlur = 10;
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
    
    this.ctx.restore();
  }
  
  drawParticles(particles: Particle[]): void {
    particles.forEach(p => {
      const pos = this.worldToScreen(p.x, p.y);
      const alpha = p.life / p.maxLife;
      
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      
      if (p.type === 'shockwave') {
        const progress = 1 - alpha;
        const radius = p.size * progress;
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 3 * (1 - progress);
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
      } else {
        this.ctx.fillStyle = p.color;
        if (p.type === 'flame') {
          this.ctx.shadowColor = p.color;
          this.ctx.shadowBlur = 5;
        }
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, p.size * alpha, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
      
      this.ctx.restore();
    });
  }
  
  drawScoreboard(players: PlayerState[]): void {
    const panelX = 20;
    const panelY = 20;
    const panelWidth = 200;
    const rowHeight = 24;
    const headerHeight = 30;
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.roundRect(panelX, panelY, panelWidth, headerHeight + players.length * rowHeight, 8);
    this.ctx.fill();
    
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 14px Segoe UI';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('计分板', panelX + 10, panelY + 20);
    
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    
    sortedPlayers.forEach((player, index) => {
      const y = panelY + headerHeight + index * rowHeight;
      
      this.ctx.fillStyle = player.color;
      this.ctx.beginPath();
      this.ctx.arc(panelX + 15, y + 12, 4, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.fillStyle = '#e0e0e0';
      this.ctx.font = '12px Segoe UI';
      this.ctx.fillText(player.name, panelX + 25, y + 16);
      
      this.ctx.fillStyle = '#ffd700';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`${player.score}`, panelX + panelWidth - 60, y + 16);
      
      this.ctx.fillStyle = '#00e5ff';
      this.ctx.fillText(`Lv.${player.level}`, panelX + panelWidth - 20, y + 16);
    });
  }
  
  drawCargo(player: PlayerState): void {
    const panelWidth = 180;
    const panelHeight = 100;
    const panelX = this.canvas.width - panelWidth - 20;
    const panelY = this.canvas.height - panelHeight - 20;
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    this.ctx.lineWidth = 1;
    this.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    this.ctx.fill();
    this.ctx.stroke();
    
    this.ctx.fillStyle = '#e0e0e0';
    this.ctx.font = 'bold 12px Segoe UI';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`货舱 (${player.cargo.length}/${player.cargoCapacity})`, panelX + 10, panelY + 20);
    
    const cargoCounts: Record<string, number> = { iron: 0, copper: 0, crystal: 0 };
    player.cargo.forEach(ore => {
      cargoCounts[ore]++;
    });
    
    const ores = ['iron', 'copper', 'crystal'];
    ores.forEach((ore, index) => {
      const y = panelY + 45 + index * 18;
      const color = ORE_COLORS[ore];
      
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(panelX + 15, y);
      this.ctx.lineTo(panelX + 25, y + 5);
      this.ctx.lineTo(panelX + 15, y + 10);
      this.ctx.lineTo(panelX + 5, y + 5);
      this.ctx.closePath();
      this.ctx.fill();
      
      if (ore === 'crystal') {
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 5;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
      
      this.ctx.fillStyle = '#e0e0e0';
      this.ctx.font = '11px Segoe UI';
      this.ctx.fillText(`${ORE_NAMES[ore]}: ${cargoCounts[ore]}`, panelX + 35, y + 9);
      
      this.ctx.fillStyle = '#ffd700';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`+${ORE_VALUES[ore] * cargoCounts[ore]}`, panelX + panelWidth - 10, y + 9);
    });
  }
  
  drawChat(messages: ChatMessage[]): void {
    const panelWidth = 200;
    const panelHeight = 150;
    const panelX = 20;
    const panelY = this.canvas.height - panelHeight - 20;
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    this.ctx.fill();
    this.ctx.stroke();
    
    this.ctx.fillStyle = '#00e5ff';
    this.ctx.font = 'bold 12px Segoe UI';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('聊天', panelX + 10, panelY + 18);
    
    const displayMessages = messages.slice(-5);
    this.ctx.font = '11px Segoe UI';
    displayMessages.forEach((msg, index) => {
      const y = panelY + 40 + index * 20;
      this.ctx.fillStyle = '#ffd700';
      this.ctx.fillText(msg.playerName + ': ', panelX + 10, y);
      this.ctx.fillStyle = '#e0e0e0';
      const nameWidth = this.ctx.measureText(msg.playerName + ': ').width;
      this.ctx.fillText(msg.message, panelX + 10 + nameWidth, y);
    });
  }
  
  drawCountdown(gameTime: number): void {
    const minutes = Math.floor(gameTime / 60000);
    const seconds = Math.floor((gameTime % 60000) / 1000);
    const timeStr = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 48px Segoe UI';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(timeStr, this.canvas.width / 2, 50);
    
    this.ctx.shadowColor = '#ffd700';
    this.ctx.shadowBlur = 10;
    this.ctx.fillText(timeStr, this.canvas.width / 2, 50);
    this.ctx.shadowBlur = 0;
  }
  
  drawAlarmBorder(alarmActive: boolean): void {
    if (!alarmActive) return;
    
    const intensity = (Date.now() % 500) < 250 ? 1 : 0.3;
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 0, 0, ' + intensity + ')';
    this.ctx.lineWidth = 8;
    this.ctx.strokeRect(4, 4, this.canvas.width - 8, this.canvas.height - 8);
    this.ctx.restore();
  }
  
  drawUpgradePanel(player: PlayerState, upgrades: UpgradeType[], selectedUpgrade: string | null, onUpgrade: (type: string) => void): void {
    const panelWidth = 400;
    const panelHeight = 300;
    const panelX = (this.canvas.width - panelWidth) / 2;
    const panelY = (this.canvas.height - panelHeight) / 2;
    
    this.ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 1;
    this.roundRect(panelX, panelY, panelWidth, panelHeight, 16);
    this.ctx.fill();
    this.ctx.stroke();
    
    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 20px Segoe UI';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('飞船升级', this.canvas.width / 2, panelY + 35);
    
    const cardWidth = 110;
    const cardHeight = 180;
    const spacing = 20;
    const startX = panelX + (panelWidth - cardWidth * 3 - spacing * 2) / 2;
    
    upgrades.forEach((upgrade, index) => {
      const cardX = startX + index * (cardWidth + spacing);
      const cardY = panelY + 60;
      
      const cargoCounts: Record<string, number> = { iron: 0, copper: 0, crystal: 0 };
      player.cargo.forEach(ore => {
        cargoCounts[ore]++;
      });
      let canAfford = true;
      if (upgrade.cost.iron && cargoCounts.iron < upgrade.cost.iron) canAfford = false;
      if (upgrade.cost.copper && cargoCounts.copper < upgrade.cost.copper) canAfford = false;
      if (upgrade.cost.crystal && cargoCounts.crystal < upgrade.cost.crystal) canAfford = false;
      const animationTime = this.upgradeAnimationTime[upgrade.type] || 0;
      const animProgress = Math.min(1, animationTime / 300);
      const scale = 1 + Math.sin(animProgress * Math.PI) * 0.2;
      
      this.ctx.save();
      this.ctx.translate(cardX + cardWidth / 2, cardY + cardHeight / 2);
      this.ctx.scale(scale, scale);
      this.ctx.rotate(animProgress * Math.PI * 2);
      this.ctx.translate(-(cardX + cardWidth / 2), -(cardY + cardHeight / 2));
      
      this.ctx.fillStyle = canAfford ? 'rgba(0, 229, 255, 0.1)' : 'rgba(100, 100, 100, 0.1)';
      this.ctx.strokeStyle = canAfford ? '#00e5ff' : '#666666';
      this.ctx.lineWidth = 2;
      this.roundRect(cardX, cardY, cardWidth, cardHeight, 12);
      this.ctx.fill();
      this.ctx.stroke();
      
      this.ctx.restore();
      
      this.ctx.fillStyle = canAfford ? '#e0e0e0' : '#888888';
      this.ctx.font = 'bold 14px Segoe UI';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(upgrade.name, cardX + cardWidth / 2, cardY + 30);
      
      const iconY = cardY + 70;
      this.ctx.fillStyle = canAfford ? '#00e5ff' : '#666666';
      this.ctx.font = '24px Segoe UI';
      const icons: Record<string, string> = {
        cargo: '📦',
        shield: '🛡️',
        mining: '⛏️'
      };
      this.ctx.fillText(icons[upgrade.type] || '🔧', cardX + cardWidth / 2, iconY + 8);
      
      this.ctx.font = '10px Segoe UI';
      this.ctx.fillStyle = '#aaaaaa';
      const lines = upgrade.description.split('\n');
      lines.forEach((line, i) => {
        this.ctx.fillText(line, cardX + cardWidth / 2, cardY + 110 + i * 14);
      });
      
      this.ctx.font = '10px Segoe UI';
      let costY = cardY + 140;
      if (upgrade.cost.iron) {
        this.ctx.fillStyle = ORE_COLORS.iron;
        this.ctx.fillText('铁矿: ' + upgrade.cost.iron, cardX + cardWidth / 2, costY);
        costY += 14;
      }
      if (upgrade.cost.copper) {
        this.ctx.fillStyle = ORE_COLORS.copper;
        this.ctx.fillText('铜矿: ' + upgrade.cost.copper, cardX + cardWidth / 2, costY);
        costY += 14;
      }
      if (upgrade.cost.crystal) {
        this.ctx.fillStyle = ORE_COLORS.crystal;
        this.ctx.fillText('晶矿: ' + upgrade.cost.crystal, cardX + cardWidth / 2, costY);
      }
      
      const btnY = cardY + cardHeight - 30;
      const btnWidth = 80;
      const btnHeight = 24;
      const btnX = cardX + (cardWidth - btnWidth) / 2;
      
      this.ctx.fillStyle = canAfford ? '#ffd700' : '#555555';
      this.roundRect(btnX, btnY, btnWidth, btnHeight, 6);
      this.ctx.fill();
      
      this.ctx.fillStyle = '#000000';
      this.ctx.font = 'bold 11px Segoe UI';
      this.ctx.fillText('升级', cardX + cardWidth / 2, btnY + 16);
    });
    
    this.ctx.fillStyle = '#aaaaaa';
    this.ctx.font = '11px Segoe UI';
    this.ctx.fillText('按 ESC 关闭', this.canvas.width / 2, panelY + panelHeight - 20);
  }
  
  drawGameOver(players: PlayerState[], onRestart: () => void): void {
    const panelWidth = 500;
    const panelHeight = 400;
    const panelX = (this.canvas.width - panelWidth) / 2;
    const panelY = (this.canvas.height - panelHeight) / 2;
    
    this.ctx.fillStyle = 'rgba(13, 13, 31, 0.95)';
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 2;
    this.roundRect(panelX, panelY, panelWidth, panelHeight, 24);
    this.ctx.fill();
    this.ctx.stroke();
    
    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 28px Segoe UI';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('游戏结束', this.canvas.width / 2, panelY + 50);
    
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    
    const headerY = panelY + 85;
    this.ctx.fillStyle = '#888888';
    this.ctx.font = 'bold 12px Segoe UI';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('排名', panelX + 30, headerY);
    this.ctx.fillText('玩家', panelX + 80, headerY);
    this.ctx.fillText('总价值', panelX + 200, headerY);
    this.ctx.fillText('等级', panelX + 300, headerY);
    this.ctx.fillText('开采数', panelX + 370, headerY);
    this.ctx.fillText('评价', panelX + 440, headerY);
    
    sortedPlayers.forEach((player, index) => {
      const y = panelY + 115 + index * 45;
      
      this.ctx.fillStyle = player.color;
      this.ctx.beginPath();
      this.ctx.arc(panelX + 40, y - 5, 4, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.fillStyle = '#e0e0e0';
      this.ctx.font = '14px Segoe UI';
      this.ctx.fillText(String(index + 1), panelX + 30, y);
      this.ctx.fillText(player.name, panelX + 80, y);
      
      this.ctx.fillStyle = '#ffd700';
      this.ctx.fillText(String(player.score), panelX + 200, y);
      
      this.ctx.fillStyle = '#00e5ff';
      this.ctx.fillText('Lv.' + player.level, panelX + 300, y);
      
      this.ctx.fillStyle = '#e0e0e0';
      this.ctx.fillText(String(player.asteroidsMined), panelX + 370, y);
      
      let comment = '';
      let icon = '';
      if (index === 0) {
        comment = '冠军！';
        icon = '🏆';
      } else if (index === sortedPlayers.length - 1 && sortedPlayers.length > 1) {
        comment = '继续加油！';
        icon = '💪';
      } else if (player.score > 500) {
        comment = '表现不错';
        icon = '👍';
      } else if (player.asteroidsMined > 10) {
        comment = '勤劳矿工';
        icon = '⛏️';
      } else {
        comment = '还需努力';
        icon = '📈';
      }
      
      this.ctx.fillText(icon, panelX + 440, y);
      this.ctx.fillStyle = '#aaaaaa';
      this.ctx.font = '10px Segoe UI';
      this.ctx.fillText(comment, panelX + 440, y + 14);
    });
    
    const btnWidth = 120;
    const btnHeight = 40;
    const btnX = panelX + panelWidth - btnWidth - 30;
    const btnY = panelY + panelHeight - btnHeight - 20;
    
    this.ctx.fillStyle = '#ffd700';
    this.roundRect(btnX, btnY, btnWidth, btnHeight, 12);
    this.ctx.fill();
    
    this.ctx.fillStyle = '#000000';
    this.ctx.font = 'bold 14px Segoe UI';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('再来一局', btnX + btnWidth / 2, btnY + 25);
  }
  
  triggerUpgradeAnimation(type: string): void {
    this.upgradeAnimationTime[type] = 300;
  }
  
  updateAnimations(deltaTime: number): void {
    Object.keys(this.upgradeAnimationTime).forEach(key => {
      if (this.upgradeAnimationTime[key] > 0) {
        this.upgradeAnimationTime[key] -= deltaTime * 1000;
        if (this.upgradeAnimationTime[key] <= 0) {
          this.upgradeAnimationTime[key] = 0;
        }
      }
    });
  }
  
  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }
  
  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }
  
  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }
  
  generatePlayerComment(player: PlayerState, rank: number, totalPlayers: number): { icon: string; comment: string } {
    if (rank === 0 && totalPlayers > 1) {
      return { icon: '🏆', comment: '采矿大师！' };
    } else if (rank === totalPlayers - 1 && totalPlayers > 1) {
      return { icon: '💪', comment: '下次会更好！' };
    } else if (player.score >= 1000) {
      return { icon: '🌟', comment: '太空富豪！' };
    } else if (player.asteroidsMined >= 20) {
      return { icon: '⛏️', comment: '勤劳矿工' };
    } else if (player.level >= 3) {
      return { icon: '🚀', comment: '升级达人' };
    } else if (player.score >= 500) {
      return { icon: '👍', comment: '表现不错' };
    } else {
      return { icon: '📈', comment: '继续努力' };
    }
  }
}

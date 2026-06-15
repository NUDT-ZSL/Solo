import { GameMap, Obstacle } from './map';
import { Player, Zombie, ZombieType, ZOMBIE_CONFIG } from './entities';
import { Trap, TrapType, TRAP_CONFIG } from './trap';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameStateUI {
  state: 'menu' | 'playing' | 'gameover';
  player: Player;
  zombies: Zombie[];
  traps: Trap[];
  map: GameMap;
  particles: Particle[];
  resources: number;
  killCount: number;
  surviveTime: number;
  selectedTrap: TrapType | null;
  startButton: { x: number; y: number; w: number; h: number; hover: boolean };
  trapButtons: Array<{ type: TrapType; x: number; y: number; w: number; h: number; hover: boolean }>;
  mouseX: number;
  mouseY: number;
}

const COLORS = {
  bg: '#1a1a1a',
  wall: '#424242',
  rubble: '#795548',
  healthBar: '#f44336',
  resource: '#ffd54f',
  selectedGlow: '#00e676',
};

export function render(ctx: CanvasRenderingContext2D, ui: GameStateUI): void {
  const { map } = ui;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, map.width, map.height);

  drawGrid(ctx, map);
  drawObstacles(ctx, map.obstacles);
  drawTraps(ctx, ui.traps);

  if (ui.state === 'playing' || ui.state === 'gameover') {
    drawZombies(ctx, ui.zombies);
    drawPlayer(ctx, ui.player);
    drawParticles(ctx, ui.particles);

    if (ui.selectedTrap && ui.state === 'playing') {
      drawTrapPreview(ctx, ui);
    }

    drawStatusPanel(ctx, ui);
    drawTrapPanel(ctx, ui);
  }

  if (ui.state === 'menu') {
    drawMenuScreen(ctx, ui);
  }

  if (ui.state === 'gameover') {
    drawGameOverScreen(ctx, ui);
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, map: GameMap): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= map.width; x += map.cellSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, map.height);
    ctx.stroke();
  }
  for (let y = 0; y <= map.height; y += map.cellSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(map.width, y);
    ctx.stroke();
  }
}

function drawObstacles(ctx: CanvasRenderingContext2D, obstacles: Obstacle[]): void {
  for (const obs of obstacles) {
    const r = obs.rect;
    ctx.fillStyle = obs.type === 'wall' ? COLORS.wall : COLORS.rubble;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }
}

function drawTraps(ctx: CanvasRenderingContext2D, traps: Trap[]): void {
  for (const trap of traps) {
    if (trap.active) {
      trap.render(ctx);
    }
  }
}

function drawZombies(ctx: CanvasRenderingContext2D, zombies: Zombie[]): void {
  for (const z of zombies) {
    ctx.save();
    ctx.fillStyle = z.color;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const hpPercent = z.health / z.maxHealth;
    if (hpPercent < 1) {
      const barW = z.radius * 2;
      const barH = 4;
      const barX = z.x - barW / 2;
      const barY = z.y - z.radius - 10;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = hpPercent > 0.5 ? '#4caf50' : hpPercent > 0.25 ? '#ff9800' : '#f44336';
      ctx.fillRect(barX, barY, barW * hpPercent, barH);
    }

    const eyeAngle = Math.atan2(0, -1);
    const eyeOffset = z.radius * 0.35;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(z.x + Math.cos(eyeAngle - 0.3) * eyeOffset, z.y + Math.sin(eyeAngle - 0.3) * eyeOffset, 2, 0, Math.PI * 2);
    ctx.arc(z.x + Math.cos(eyeAngle + 0.3) * eyeOffset, z.y + Math.sin(eyeAngle + 0.3) * eyeOffset, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(z.x + Math.cos(eyeAngle - 0.3) * eyeOffset, z.y + Math.sin(eyeAngle - 0.3) * eyeOffset, 1, 0, Math.PI * 2);
    ctx.arc(z.x + Math.cos(eyeAngle + 0.3) * eyeOffset, z.y + Math.sin(eyeAngle + 0.3) * eyeOffset, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
  ctx.save();

  ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.arc(player.x, player.y, player.viewRadius, player.facingAngle - player.viewAngle / 2, player.facingAngle + player.viewAngle / 2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(76, 175, 80, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

  const dirLen = player.radius * 1.5;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x + Math.cos(player.facingAngle) * dirLen, player.y + Math.sin(player.facingAngle) * dirLen);
  ctx.stroke();

  if (player.damageAnimTime > 0) {
    const scale = 1 + (1 - player.damageAnimTime / 0.3) * 0.5;
    ctx.fillStyle = COLORS.healthBar;
    ctx.font = `bold ${14 * scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`-${player.lastDamageValue}`, player.x, player.y - player.radius - 15);
  }
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawTrapPreview(ctx: CanvasRenderingContext2D, ui: GameStateUI): void {
  if (!ui.selectedTrap) return;
  const config = TRAP_CONFIG[ui.selectedTrap];
  const canPlace = Trap.canPlace(ui.mouseX, ui.mouseY, ui.map, ui.traps);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = canPlace ? '#4caf50' : '#f44336';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(ui.mouseX, ui.mouseY, config.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = canPlace ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)';
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = config.color;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(config.icon, ui.mouseX, ui.mouseY);
  ctx.restore();
}

function drawStatusPanel(ctx: CanvasRenderingContext2D, ui: GameStateUI): void {
  const px = 12;
  const py = 12;
  const pw = 200;
  const ph = 110;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  roundRect(ctx, px, py, pw, ph, 8);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const hpPercent = ui.player.health / ui.player.maxHealth;
  ctx.fillText('血量', px + 12, py + 12);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(px + 12, py + 32, pw - 24, 14);
  ctx.fillStyle = COLORS.healthBar;
  ctx.fillRect(px + 12, py + 32, (pw - 24) * hpPercent, 14);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.max(0, Math.ceil(ui.player.health))}/${ui.player.maxHealth}`, px + pw / 2, py + 33);

  ctx.fillStyle = COLORS.resource;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`💰 ${ui.resources}`, px + 12, py + 56);

  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  ctx.fillText(`击杀: ${ui.killCount}`, px + 12, py + 82);

  const timeStr = formatTime(ui.surviveTime);
  ctx.textAlign = 'right';
  ctx.fillText(timeStr, px + pw - 12, py + 82);

  ctx.restore();
}

function drawTrapPanel(ctx: CanvasRenderingContext2D, ui: GameStateUI): void {
  const types: TrapType[] = ['spike', 'mine', 'slow', 'fence'];
  const btnW = 60;
  const btnH = 50;
  const gap = 8;
  const padding = 10;
  const totalW = types.length * btnW + (types.length - 1) * gap + padding * 2;
  const totalH = btnH + padding * 2;
  const px = ui.map.width - totalW - 12;
  const py = ui.map.height - totalH - 12;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  roundRect(ctx, px, py, totalW, totalH, 8);
  ctx.fill();

  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    const config = TRAP_CONFIG[type];
    const bx = px + padding + i * (btnW + gap);
    const by = py + padding;
    const isSelected = ui.selectedTrap === type;
    const isHover = ui.trapButtons[i]?.hover;
    const canAfford = ui.resources >= config.cost;

    if (isSelected) {
      ctx.shadowColor = COLORS.selectedGlow;
      ctx.shadowBlur = 12;
    }

    ctx.fillStyle = isSelected ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255, 255, 255, 0.08)';
    if (isHover) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    }
    ctx.beginPath();
    roundRect(ctx, bx, by, btnW, btnH, 8);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (isSelected) {
      ctx.strokeStyle = COLORS.selectedGlow;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = canAfford ? config.color : '#666';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.icon, bx + btnW / 2, by + 16);

    ctx.fillStyle = canAfford ? '#fff' : '#666';
    ctx.font = '11px sans-serif';
    ctx.fillText(config.label, bx + btnW / 2, by + 38);

    ctx.fillStyle = canAfford ? COLORS.resource : '#666';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`${config.cost}`, bx + btnW / 2, by + btnH - 4);
  }
  ctx.restore();
}

function drawMenuScreen(ctx: CanvasRenderingContext2D, ui: GameStateUI): void {
  const { map } = ui;
  ctx.save();
  ctx.fillStyle = 'rgba(26, 26, 26, 0.95)';
  ctx.fillRect(0, 0, map.width, map.height);

  ctx.fillStyle = '#4caf50';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('僵尸追击塔防', map.width / 2, map.height / 2 - 100);

  ctx.fillStyle = '#bdbdbd';
  ctx.font = '18px sans-serif';
  ctx.fillText('在有限资源下布置陷阱，利用地形规划逃脱路线', map.width / 2, map.height / 2 - 50);
  ctx.fillText('鼠标点击移动幸存者，数字键 1-4 选择陷阱，左键放置', map.width / 2, map.height / 2 - 25);
  ctx.fillText('合理利用障碍物和陷阱，尽可能长时间生存', map.width / 2, map.height / 2);

  const btn = ui.startButton;

  const scale = btn.hover ? 1.05 : 1;
  const btnW = btn.w * scale;
  const btnH = btn.h * scale;
  const btnX = btn.x + (btn.w - btnW) / 2;
  const btnY = btn.y + (btn.h - btnH) / 2;

  if (btn.hover) {
    ctx.shadowColor = COLORS.selectedGlow;
    ctx.shadowBlur = 20;
  }

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  roundRect(ctx, btnX, btnY, btnW, btnH, 12);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('开始游戏', map.width / 2, map.height / 2 + 100 + btnH / 2);

  ctx.restore();
}

function drawGameOverScreen(ctx: CanvasRenderingContext2D, ui: GameStateUI): void {
  const { map } = ui;
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, map.width, map.height);

  ctx.fillStyle = '#f44336';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('游戏结束', map.width / 2, map.height / 2 - 120);

  const panelW = 320;
  const panelH = 200;
  const panelX = map.width / 2 - panelW / 2;
  const panelY = map.height / 2 - panelH / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.beginPath();
  roundRect(ctx, panelX, panelY, panelW, panelH, 12);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('得分统计', map.width / 2, panelY + 35);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#bdbdbd';
  ctx.fillText('击杀数', map.width / 2 - 80, panelY + 80);
  ctx.fillText('存活时间', map.width / 2 - 80, panelY + 115);
  ctx.fillText('资源总量', map.width / 2 - 80, panelY + 150);

  ctx.fillStyle = COLORS.resource;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${ui.killCount}`, map.width / 2 + 80, panelY + 80);
  ctx.fillText(formatTime(ui.surviveTime), map.width / 2 + 80, panelY + 115);
  ctx.fillText(`${ui.resources}`, map.width / 2 + 80, panelY + 150);

  const btn = ui.startButton;
  const scale = btn.hover ? 1.05 : 1;
  const btnW = btn.w * scale;
  const btnH = btn.h * scale;
  const btnX = btn.x + (btn.w - btnW) / 2;
  const btnY = btn.y + (btn.h - btnH) / 2;

  if (btn.hover) {
    ctx.shadowColor = COLORS.selectedGlow;
    ctx.shadowBlur = 15;
  }
  ctx.fillStyle = '#4caf50';
  ctx.beginPath();
  roundRect(ctx, btnX, btnY, btnW, btnH, 12);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('再来一局', map.width / 2, panelY + panelH + 40 + btnH / 2);

  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

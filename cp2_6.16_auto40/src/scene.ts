import { CONFIG, COLORS, TreasureChest, Shark, ShipEntrance } from './assets';
import { GameState } from './gameState';
import { Player } from './player';

export class Scene {
  canvasW: number;
  canvasH: number;
  shipX: number;
  shipY: number;
  shipW: number = 200;
  shipH: number = 80;
  surfaceX: number;
  surfaceY: number = 30;
  sandCanvas: HTMLCanvasElement | null = null;
  private sailOffset: number = 0;

  constructor(canvasW: number, canvasH: number) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.shipX = canvasW / 2;
    this.shipY = canvasH * 0.55;
    this.surfaceX = canvasW / 2;
    this.generateSandNoise();
  }

  private generateSandNoise(): void {
    const w = Math.min(this.canvasW, 400);
    const h = 60;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const sctx = c.getContext('2d')!;
    sctx.fillStyle = COLORS.SAND_BASE;
    sctx.fillRect(0, 0, w, h);
    const imgData = sctx.getImageData(0, 0, w, h);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 30;
      imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + noise));
      imgData.data[i + 1] = Math.max(0, Math.min(255, imgData.data[i + 1] + noise));
      imgData.data[i + 2] = Math.max(0, Math.min(255, imgData.data[i + 2] + noise * 0.5));
      imgData.data[i + 3] = 200;
    }
    sctx.putImageData(imgData, 0, 0);
    this.sandCanvas = c;
  }

  resize(w: number, h: number): void {
    this.canvasW = w;
    this.canvasH = h;
    this.shipX = w / 2;
    this.shipY = h * 0.55;
    this.surfaceX = w / 2;
    this.generateSandNoise();
  }

  update(dt: number): void {
    this.sailOffset = Math.sin(Date.now() * 0.002) * 8;
  }

  updateSharkList(sharks: Shark[], player: Player, gameState: GameState, entrances: ShipEntrance[], dt: number): void {
    for (const shark of sharks) {
      if (shark.isChasing && !gameState.isPlayerInShip) {
        const dx = player.x - shark.x;
        const dy = player.y - shark.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          shark.x += (dx / dist) * CONFIG.SHARK_CHASE_SPEED * dt;
          shark.y += (dy / dist) * CONFIG.SHARK_CHASE_SPEED * dt;
          shark.angle = Math.atan2(dy, dx);
        }
      } else if (shark.isChasing && gameState.isPlayerInShip) {
        const nextPt = shark.patrolPath[shark.currentPathIndex];
        const dx = nextPt.x - shark.x;
        const dy = nextPt.y - shark.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) {
          shark.currentPathIndex = (shark.currentPathIndex + 1) % shark.patrolPath.length;
        } else if (dist > 1) {
          shark.x += (dx / dist) * CONFIG.SHARK_PATROL_SPEED * dt;
          shark.y += (dy / dist) * CONFIG.SHARK_PATROL_SPEED * dt;
          shark.angle = Math.atan2(dy, dx);
        }
      } else {
        const target = shark.patrolPath[shark.currentPathIndex];
        const dx = target.x - shark.x;
        const dy = target.y - shark.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) {
          shark.currentPathIndex = (shark.currentPathIndex + 1) % shark.patrolPath.length;
        } else {
          shark.x += (dx / dist) * CONFIG.SHARK_PATROL_SPEED * dt;
          shark.y += (dy / dist) * CONFIG.SHARK_PATROL_SPEED * dt;
          shark.angle = Math.atan2(dy, dx);
        }
        const pdx = player.x - shark.x;
        const pdy = player.y - shark.y;
        if (Math.sqrt(pdx * pdx + pdy * pdy) < CONFIG.SHARK_CHASE_RADIUS && !gameState.isPlayerInShip) {
          shark.isChasing = true;
          shark.chaseTimer = 3;
        }
      }
    }
  }

  drawBackground(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, 0, this.canvasH);
    grad.addColorStop(0, COLORS.SEA_TOP);
    grad.addColorStop(1, COLORS.SEA_BOTTOM);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvasW, this.canvasH);
  }

  drawSand(ctx: CanvasRenderingContext2D): void {
    const sandY = this.canvasH - 60;
    if (this.sandCanvas) {
      ctx.drawImage(this.sandCanvas, 0, sandY, this.canvasW, 60);
    } else {
      ctx.fillStyle = COLORS.SAND_BASE;
      ctx.fillRect(0, sandY, this.canvasW, 60);
    }
  }

  drawShip(ctx: CanvasRenderingContext2D, entrances: ShipEntrance[]): void {
    ctx.save();
    ctx.translate(this.shipX, this.shipY);
    ctx.rotate(-0.15);

    ctx.beginPath();
    ctx.moveTo(-this.shipW / 2, 0);
    ctx.lineTo(-this.shipW / 2 + 20, this.shipH / 2);
    ctx.lineTo(this.shipW / 2 - 20, this.shipH / 2);
    ctx.lineTo(this.shipW / 2, 0);
    ctx.lineTo(this.shipW / 2 - 10, -this.shipH / 2);
    ctx.lineTo(-this.shipW / 2 + 10, -this.shipH / 2);
    ctx.closePath();
    ctx.fillStyle = COLORS.HULL_DARK;
    ctx.fill();
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < 3; i++) {
      const sx = -30 + i * 30;
      ctx.beginPath();
      ctx.moveTo(sx, -this.shipH / 2);
      ctx.lineTo(sx + this.sailOffset, -this.shipH / 2 - 25);
      ctx.lineTo(sx + 5, -this.shipH / 2 - 5);
      ctx.closePath();
      ctx.fillStyle = 'rgba(210, 180, 140, 0.5)';
      ctx.fill();
    }

    ctx.restore();

    for (const ent of entrances) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(ent.x, ent.y, ent.width, ent.height);
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 1;
      ctx.strokeRect(ent.x, ent.y, ent.width, ent.height);
    }
  }

  drawChests(ctx: CanvasRenderingContext2D, chests: TreasureChest[], dt: number): void {
    for (const chest of chests) {
      ctx.save();

      if (chest.glowAlpha > 0 && !chest.isOpen) {
        ctx.shadowColor = COLORS.CHEST_GOLD;
        ctx.shadowBlur = 6;
        ctx.globalAlpha = chest.glowAlpha * 0.6;
        ctx.fillStyle = COLORS.CHEST_GOLD;
        ctx.fillRect(chest.x - chest.width / 2 - 4, chest.y - chest.height / 2 - 4, chest.width + 8, chest.height + 8);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      if (chest.isOpen) {
        const lidAngle = chest.openProgress * -1.2;
        ctx.translate(chest.x, chest.y - chest.height / 2);
        ctx.save();
        ctx.rotate(lidAngle);
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(-chest.width / 2, -chest.height / 2, chest.width, chest.height / 2);
        ctx.strokeStyle = COLORS.CHEST_GOLD;
        ctx.lineWidth = 2;
        ctx.strokeRect(-chest.width / 2, -chest.height / 2, chest.width, chest.height / 2);
        ctx.restore();

        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-chest.width / 2, 0, chest.width, chest.height / 2);
        ctx.strokeStyle = COLORS.CHEST_GOLD;
        ctx.lineWidth = 2;
        ctx.strokeRect(-chest.width / 2, 0, chest.width, chest.height / 2);
      } else {
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(chest.x - chest.width / 2, chest.y - chest.height / 2, chest.width, chest.height);
        ctx.strokeStyle = COLORS.CHEST_GOLD;
        ctx.lineWidth = 2;
        ctx.strokeRect(chest.x - chest.width / 2, chest.y - chest.height / 2, chest.width, chest.height);
        ctx.beginPath();
        ctx.arc(chest.x, chest.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.CHEST_GOLD;
        ctx.fill();
      }

      for (let i = chest.coins.length - 1; i >= 0; i--) {
        const coin = chest.coins[i];
        coin.x += coin.vx * dt;
        coin.y += coin.vy * dt;
        coin.life -= dt;
        if (coin.life <= 0) {
          chest.coins.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.CHEST_GOLD;
        ctx.globalAlpha = coin.life / 0.2;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }
  }

  drawSharks(ctx: CanvasRenderingContext2D, sharks: Shark[]): void {
    for (const shark of sharks) {
      ctx.save();
      ctx.translate(shark.x, shark.y);
      ctx.rotate(shark.angle);

      ctx.beginPath();
      ctx.moveTo(CONFIG.SHARK_SIZE / 2, 0);
      ctx.lineTo(-CONFIG.SHARK_SIZE / 2, -CONFIG.SHARK_SIZE / 4);
      ctx.lineTo(-CONFIG.SHARK_SIZE / 2, CONFIG.SHARK_SIZE / 4);
      ctx.closePath();
      ctx.fillStyle = COLORS.SHARK_BODY;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -CONFIG.SHARK_SIZE / 4);
      ctx.lineTo(-8, -CONFIG.SHARK_SIZE / 2);
      ctx.lineTo(-8, -CONFIG.SHARK_SIZE / 4);
      ctx.closePath();
      ctx.fillStyle = COLORS.SHARK_BODY;
      ctx.fill();

      if (shark.isChasing) {
        ctx.beginPath();
        ctx.arc(CONFIG.SHARK_SIZE / 4, -2, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#f44336';
        ctx.fill();
      }

      ctx.restore();
    }
  }

  drawSurface(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = COLORS.SURFACE_COLOR;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(this.surfaceX - CONFIG.SURFACE_WIDTH / 2, this.surfaceY - CONFIG.SURFACE_HEIGHT / 2, CONFIG.SURFACE_WIDTH, CONFIG.SURFACE_HEIGHT);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#81d4fa';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.surfaceX - CONFIG.SURFACE_WIDTH / 2, this.surfaceY - CONFIG.SURFACE_HEIGHT / 2, CONFIG.SURFACE_WIDTH, CONFIG.SURFACE_HEIGHT);
    ctx.fillStyle = COLORS.UI_TEXT;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('水面', this.surfaceX, this.surfaceY + 4);
  }

  drawOxygenBar(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const barW = 300;
    const barH = 20;
    const barX = 20;
    const barY = 20;
    const ratio = gameState.oxygen / CONFIG.OXYGEN_MAX;

    ctx.fillStyle = COLORS.OXYGEN_BG;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 10);
    ctx.fill();

    if (ratio > 0) {
      const fillW = barW * ratio;
      const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      grad.addColorStop(0, COLORS.OXYGEN_GREEN);
      grad.addColorStop(0.5, COLORS.OXYGEN_YELLOW);
      grad.addColorStop(1, COLORS.OXYGEN_RED);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barH, 10);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 10);
    ctx.stroke();

    ctx.fillStyle = COLORS.UI_TEXT;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`氧气 ${Math.ceil(gameState.oxygen)}%`, barX + barW / 2, barY + 14);
  }

  drawTreasureCount(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const x = this.canvasW - 20;
    const y = 25;
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.CHEST_GOLD;
    ctx.font = '14px sans-serif';
    ctx.fillText(`金币: ${gameState.goldCoins}`, x, y);
    ctx.fillStyle = '#e040fb';
    ctx.fillText(`宝石: ${gameState.gems}`, x, y + 20);
    ctx.fillStyle = '#8d6e63';
    ctx.fillText(`地图碎片: ${gameState.mapFragments}`, x, y + 40);
  }

  drawWarningEffects(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (gameState.oxygen < CONFIG.OXYGEN_LOW_THRESHOLD && !gameState.isGameOver) {
      ctx.save();
      ctx.strokeStyle = COLORS.WARNING_RED;
      ctx.lineWidth = 8;
      ctx.globalAlpha = gameState.warningPulseAlpha;
      ctx.strokeRect(0, 0, this.canvasW, this.canvasH);
      ctx.restore();
    }
    if (gameState.showCriticalWarning) {
      ctx.save();
      ctx.fillStyle = COLORS.WARNING_RED;
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
      ctx.fillText('⚠ 氧气即将耗尽！', this.canvasW / 2, this.canvasH / 2 - 40);
      ctx.restore();
    }
  }

  drawChestPrompt(ctx: CanvasRenderingContext2D, nearChestIndex: number, chests: TreasureChest[]): void {
    if (nearChestIndex < 0 || nearChestIndex >= chests.length) return;
    const chest = chests[nearChestIndex];
    if (chest.isOpen) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 31, 63, 0.7)';
    ctx.beginPath();
    ctx.roundRect(chest.x - 35, chest.y - chest.height / 2 - 22, 70, 16, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.UI_TEXT;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('按 E 打开', chest.x, chest.y - chest.height / 2 - 10);
    ctx.restore();
  }

  drawOpenMessages(ctx: CanvasRenderingContext2D, messages: Array<{ text: string; x: number; y: number; life: number }>, dt: number): void {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      msg.life -= dt;
      msg.y -= 30 * dt;
      if (msg.life <= 0) {
        messages.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.min(1, msg.life);
      ctx.fillStyle = COLORS.CHEST_GOLD;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(msg.text, msg.x, msg.y);
      ctx.restore();
    }
  }

  drawGameOver(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!gameState.isGameOver) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.canvasW, this.canvasH);
    ctx.fillStyle = COLORS.WARNING_RED;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', this.canvasW / 2, this.canvasH / 2 - 20);
    ctx.fillStyle = COLORS.UI_TEXT;
    ctx.font = '18px sans-serif';
    ctx.fillText(`金币: ${gameState.goldCoins}  宝石: ${gameState.gems}  地图碎片: ${gameState.mapFragments}`, this.canvasW / 2, this.canvasH / 2 + 20);
    ctx.font = '14px sans-serif';
    ctx.fillText('按 R 重新开始', this.canvasW / 2, this.canvasH / 2 + 60);
    ctx.restore();
  }

  drawStartScreen(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.canvasW, this.canvasH);
    ctx.fillStyle = '#4fc3f7';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('沉船探秘', this.canvasW / 2, this.canvasH / 2 - 40);
    ctx.fillStyle = COLORS.UI_TEXT;
    ctx.font = '16px sans-serif';
    ctx.fillText('WASD/方向键移动 | 鼠标控制探照灯方向 | 鼠标拖拽潜水员移动', this.canvasW / 2, this.canvasH / 2 + 10);
    ctx.fillText('靠近宝箱按E打开 | 避开鲨鱼 | 躲入沉船避险 | 浮出水面补充氧气', this.canvasW / 2, this.canvasH / 2 + 35);
    ctx.fillStyle = '#4fc3f7';
    ctx.font = '20px sans-serif';
    ctx.fillText('按任意键开始', this.canvasW / 2, this.canvasH / 2 + 80);
    ctx.restore();
  }
}

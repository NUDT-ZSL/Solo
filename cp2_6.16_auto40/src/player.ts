import { CONFIG, COLORS, TreasureChest, Shark, ShipEntrance } from './assets';
import { GameState } from './gameState';

export class Player {
  x: number;
  y: number;
  radius: number = CONFIG.PLAYER_RADIUS;
  lightAngle: number = 0;
  private keys: Set<string> = new Set();
  private mouseWorldX: number = 0;
  private mouseWorldY: number = 0;
  private isDragging: boolean = false;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  initInput(canvas: HTMLCanvasElement): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.mouseWorldX = (e.clientX - rect.left) * scaleX;
      this.mouseWorldY = (e.clientY - rect.top) * scaleY;
      if (this.isDragging) {
        this.x = this.mouseWorldX + this.dragOffsetX;
        this.y = this.mouseWorldY + this.dragOffsetY;
      }
    });
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      const dx = mx - this.x;
      const dy = my - this.y;
      if (dx * dx + dy * dy < (this.radius + 20) * (this.radius + 20)) {
        this.isDragging = true;
        this.dragOffsetX = this.x - mx;
        this.dragOffsetY = this.y - my;
      }
    });
    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });
  }

  update(dt: number, canvasW: number, canvasH: number): void {
    if (this.isDragging) {
      this.updateLightAngle();
      this.clampPosition(canvasW, canvasH);
      return;
    }
    let dx = 0;
    let dy = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }
    this.x += dx * CONFIG.PLAYER_SPEED * dt;
    this.y += dy * CONFIG.PLAYER_SPEED * dt;
    this.updateLightAngle();
    this.clampPosition(canvasW, canvasH);
  }

  private updateLightAngle(): void {
    this.lightAngle = Math.atan2(this.mouseWorldY - this.y, this.mouseWorldX - this.x);
  }

  private clampPosition(canvasW: number, canvasH: number): void {
    this.x = Math.max(this.radius, Math.min(canvasW - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(canvasH - this.radius, this.y));
  }

  checkNearChest(chests: TreasureChest[], gameState: GameState): void {
    gameState.nearChestIndex = -1;
    for (let i = 0; i < chests.length; i++) {
      const c = chests[i];
      if (c.isOpen) {
        c.glowAlpha = Math.max(0, c.glowAlpha - 0.05);
        continue;
      }
      const dx = this.x - c.x;
      const dy = this.y - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONFIG.CHEST_INTERACT_RADIUS) {
        c.glowAlpha = Math.min(1, c.glowAlpha + 0.1);
        gameState.nearChestIndex = i;
      } else {
        c.glowAlpha = Math.max(0, c.glowAlpha - 0.05);
      }
    }
  }

  tryOpenChest(chests: TreasureChest[], gameState: GameState): boolean {
    const idx = gameState.nearChestIndex;
    if (idx < 0 || idx >= chests.length) return false;
    const chest = chests[idx];
    if (chest.isOpen) return false;
    chest.isOpen = true;
    chest.openProgress = 0;
    gameState.addTreasure(chest.content, chest.contentValue);
    gameState.openChestMessages.push({
      text: `${chest.content} +${chest.contentValue}`,
      x: chest.x,
      y: chest.y - 20,
      life: 1.5,
    });
    const coinCount = 10 + Math.floor(Math.random() * 6);
    for (let i = 0; i < coinCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;
      chest.coins.push({
        x: chest.x,
        y: chest.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.2,
        radius: 2 + Math.random(),
      });
    }
    this.playChestSound();
    return true;
  }

  private playChestSound(): void {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (_e) { /* audio not available */ }
  }

  checkSharkCollision(sharks: Shark[], entrances: ShipEntrance[], gameState: GameState): void {
    let inShip = false;
    for (const ent of entrances) {
      if (
        this.x > ent.x && this.x < ent.x + ent.width &&
        this.y > ent.y && this.y < ent.y + ent.height
      ) {
        inShip = true;
        break;
      }
    }
    gameState.isPlayerInShip = inShip;

    for (const shark of sharks) {
      if (!inShip) {
        const dx = this.x - shark.x;
        const dy = this.y - shark.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.SHARK_CHASE_RADIUS) {
          shark.isChasing = true;
          shark.chaseTimer = 3;
        }
        if (shark.isChasing && dist < 15) {
          gameState.isGameOver = true;
        }
      }
    }
  }

  checkSurfaceRefill(surfaceX: number, surfaceY: number, gameState: GameState): void {
    const dx = this.x - surfaceX;
    const dy = this.y - surfaceY;
    if (Math.abs(dx) < CONFIG.SURFACE_WIDTH / 2 + this.radius && Math.abs(dy) < CONFIG.SURFACE_HEIGHT / 2 + this.radius) {
      gameState.refillOxygen();
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const halfAngle = (CONFIG.LIGHTBEAM_ANGLE * Math.PI / 180) / 2;
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, CONFIG.LIGHTBEAM_LENGTH);
    grad.addColorStop(0, 'rgba(255, 235, 59, 0.25)');
    grad.addColorStop(1, 'rgba(255, 235, 59, 0)');
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.arc(this.x, this.y, CONFIG.LIGHTBEAM_LENGTH, this.lightAngle - halfAngle, this.lightAngle + halfAngle);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.PLAYER_SUIT;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y - 2, this.radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.PLAYER_HEAD;
    ctx.fill();

    const lampX = this.x + Math.cos(this.lightAngle) * this.radius;
    const lampY = this.y + Math.sin(this.lightAngle) * this.radius;
    ctx.beginPath();
    ctx.arc(lampX, lampY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffeb3b';
    ctx.fill();
    ctx.restore();
  }
}

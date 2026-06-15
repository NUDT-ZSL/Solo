import {
  Player,
  Enemy,
  Bullet,
  Chest,
  Portal,
  Bomb,
  TILE_SIZE,
  ROOM_SIZE,
  BEAT_INTERVAL,
  BEAT_WINDOW_PERFECT,
  BEAT_WINDOW_GOOD,
  ItemType,
  EnemyType,
  BeatAccuracy,
  Vec2
} from './entities';
import { AudioManager } from './audio';
import { RhythmManager, RhythmBeatEvent } from './rhythm';

export interface GameStateData {
  level: number;
  score: number;
  gameOver: boolean;
  victory: boolean;
  allEnemiesKilled: boolean;
  allChestsOpened: boolean;
  roomCenter: Vec2;
}

type InputState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  attack: boolean;
  item1: boolean;
  item2: boolean;
  cycle: boolean;
};

export class Game {
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  chests: Chest[];
  bombs: Bomb[];
  portal: Portal | null;

  audio: AudioManager;
  rhythm: RhythmManager;
  private unregisterBeatListener: (() => void) | null = null;

  private input: InputState;
  private lastAttackPressed: boolean = false;
  private lastItem1Pressed: boolean = false;
  private lastItem2Pressed: boolean = false;
  private lastCyclePressed: boolean = false;

  private nextEnemyId: number = 1;
  private nextBulletId: number = 1;
  private nextChestId: number = 1;
  private nextBombId: number = 1;

  private state: GameStateData;
  private roundTime: number = 0;
  private readonly ROUND_DURATION: number = 60000;

  private levelTransition: boolean = false;
  private levelTransitionTime: number = 0;
  private readonly LEVEL_TRANSITION_DURATION: number = 1000;

  private displayMessage: string | null = null;
  private displayMessageTime: number = 0;
  private readonly MESSAGE_DURATION: number = 1500;

  private lastBeatIndexProcessed: number = -1;
  private enemyOccupied: Set<string> = new Set();

  private cameraX: number = 0;
  private cameraY: number = 0;
  private cameraTargetX: number = 0;
  private cameraTargetY: number = 0;
  private readonly CAMERA_LERP: number = 0.15;

  constructor(audio: AudioManager, rhythm: RhythmManager) {
    this.audio = audio;
    this.rhythm = rhythm;

    this.player = new Player(2, 4);
    this.enemies = [];
    this.bullets = [];
    this.chests = [];
    this.bombs = [];
    this.portal = null;

    this.input = {
      up: false, down: false, left: false, right: false,
      attack: false, item1: false, item2: false, cycle: false
    };

    this.state = {
      level: 1,
      score: 0,
      gameOver: false,
      victory: false,
      allEnemiesKilled: false,
      allChestsOpened: false,
      roomCenter: { x: ROOM_SIZE * TILE_SIZE / 2, y: ROOM_SIZE * TILE_SIZE / 2 }
    };
  }

  start(): void {
    this.stop();
    this.player = new Player(2, 4);
    this.enemies = [];
    this.bullets = [];
    this.chests = [];
    this.bombs = [];
    this.portal = null;
    this.nextEnemyId = 1;
    this.nextBulletId = 1;
    this.nextChestId = 1;
    this.nextBombId = 1;
    this.levelTransition = false;
    this.levelTransitionTime = 0;
    this.displayMessage = null;
    this.roundTime = 0;
    this.lastBeatIndexProcessed = -1;

    this.state = {
      level: 1,
      score: 0,
      gameOver: false,
      victory: false,
      allEnemiesKilled: false,
      allChestsOpened: false,
      roomCenter: { x: ROOM_SIZE * TILE_SIZE / 2, y: ROOM_SIZE * TILE_SIZE / 2 }
    };

    this.rhythm.resetForNewGame();
    this.unregisterBeatListener = this.rhythm.addBeatListener((e) => this.onBeatEvent(e));
    this.generateRoom();
    this.updateCameraTarget();
    this.cameraX = this.cameraTargetX;
    this.cameraY = this.cameraTargetY;
  }

  stop(): void {
    if (this.unregisterBeatListener) {
      this.unregisterBeatListener();
      this.unregisterBeatListener = null;
    }
  }

  private onBeatEvent(event: RhythmBeatEvent): void {
    const beat = event.beatIndex;
    if (beat === this.lastBeatIndexProcessed) return;
    this.lastBeatIndexProcessed = beat;

    for (const enemy of this.enemies) {
      if (enemy.dying) continue;
      if (enemy.type === 'slime' && beat % 2 === 0) {
        this.fireSlimeBullet(enemy);
      }
    }
  }

  setInput(key: keyof InputState, pressed: boolean): void {
    this.input[key] = pressed;
  }

  getState(): GameStateData {
    return { ...this.state };
  }

  getCamera(): { x: number; y: number } {
    return { x: this.cameraX, y: this.cameraY };
  }

  getMessage(): { text: string; alpha: number } | null {
    if (!this.displayMessage) return null;
    const t = this.displayMessageTime / this.MESSAGE_DURATION;
    let alpha = 1;
    if (t < 0.1) alpha = t / 0.1;
    else if (t > 0.8) alpha = Math.max(0, (1 - t) / 0.2);
    return { text: this.displayMessage, alpha: Math.min(1, Math.max(0, alpha)) };
  }

  getLevelTransitionProgress(): number {
    if (!this.levelTransition) return 0;
    return 1 - this.levelTransitionTime / this.LEVEL_TRANSITION_DURATION;
  }

  isLevelTransitioning(): boolean {
    return this.levelTransition;
  }

  private showMessage(text: string): void {
    this.displayMessage = text;
    this.displayMessageTime = this.MESSAGE_DURATION;
  }

  private generateRoom(): void {
    this.enemies = [];
    this.bullets = [];
    this.chests = [];
    this.bombs = [];
    this.portal = null;
    this.enemyOccupied.clear();
    this.roundTime = 0;
    this.state.allEnemiesKilled = false;
    this.state.allChestsOpened = false;
    this.lastBeatIndexProcessed = -1;

    const occupied = new Set<string>();
    const startKey = `${this.player.targetX},${this.player.targetY}`;
    occupied.add(startKey);

    const enemyCount = 3 + Math.floor(Math.random() * 3);
    const maxEnemies = Math.min(enemyCount, 5);

    for (let i = 0; i < maxEnemies; i++) {
      const pos = this.findRandomPosition(occupied);
      if (!pos) break;

      occupied.add(`${pos.x},${pos.y}`);
      this.enemyOccupied.add(`${pos.x},${pos.y}`);

      const type: EnemyType = Math.random() < 0.5 ? 'slime' : 'bat';
      const enemy = new Enemy(this.nextEnemyId++, type, pos.x, pos.y);

      const levelMult = 1 + this.state.level * 0.12;
      enemy.hp = Math.floor(enemy.hp * levelMult);
      enemy.maxHp = enemy.hp;
      enemy.displayHp = enemy.hp;

      this.enemies.push(enemy);
    }

    const chestCount = 1 + Math.floor(Math.random() * 2);

    for (let i = 0; i < chestCount; i++) {
      const pos = this.findRandomPosition(occupied);
      if (!pos) break;
      occupied.add(`${pos.x},${pos.y}`);
      this.chests.push(new Chest(this.nextChestId++, pos.x, pos.y));
    }
  }

  private findRandomPosition(occupied: Set<string>): { x: number; y: number } | null {
    for (let attempt = 0; attempt < 50; attempt++) {
      const x = Math.floor(Math.random() * ROOM_SIZE);
      const y = Math.floor(Math.random() * (ROOM_SIZE - 1));
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        return { x, y };
      }
    }
    return null;
  }

  private updateCameraTarget(): void {
    this.cameraTargetX = this.player.x * TILE_SIZE + TILE_SIZE / 2;
    this.cameraTargetY = this.player.y * TILE_SIZE + TILE_SIZE / 2;
  }

  update(dt: number): void {
    if (this.state.gameOver) return;

    if (this.displayMessageTime > 0) {
      this.displayMessageTime -= dt;
      if (this.displayMessageTime <= 0) {
        this.displayMessage = null;
      }
    }

    if (this.levelTransition) {
      this.levelTransitionTime -= dt;
      if (this.levelTransitionTime <= 0) {
        this.completeLevelTransition();
      }
      return;
    }

    this.roundTime += dt;
    if (this.roundTime >= this.ROUND_DURATION) {
      this.roundTime = 0;
    }

    this.rhythm.update(dt);
    this.player.update(dt);
    this.rhythm.updateComboBarState(this.player.rhythm.perfectStreak);

    const beatIdx = this.audio.getCurrentBeat();
    const beatProg = this.audio.getBeatProgress();

    for (const enemy of this.enemies) {
      enemy.update(dt, this.player, beatIdx, beatProg);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.dying && e.deathTimer <= 0) {
        this.onEnemyKilled(e);
        this.enemies.splice(i, 1);
      }
    }

    const playerPx = this.player.x * TILE_SIZE + TILE_SIZE / 2;
    const playerPy = this.player.y * TILE_SIZE + TILE_SIZE / 2;

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(dt, playerPx, playerPy, beatProg);

      if (b.isEnemy) {
        const dx = b.x - playerPx;
        const dy = b.y - playerPy;
        const collideR = b.radius + 20;
        if (dx * dx + dy * dy < collideR * collideR) {
          this.onPlayerHit(b.damage);
          this.bullets.splice(i, 1);
          continue;
        }
      }

      if (b.isExpired()) {
        this.bullets.splice(i, 1);
        continue;
      }

      const maxX = ROOM_SIZE * TILE_SIZE + 100;
      const maxY = ROOM_SIZE * TILE_SIZE + 100;
      if (b.x < -100 || b.x > maxX || b.y < -100 || b.y > maxY) {
        this.bullets.splice(i, 1);
      }
    }

    for (const chest of this.chests) {
      chest.update(dt, beatProg);
    }

    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i];
      bomb.update(dt, beatProg);
      if (bomb.exploded) {
        this.onBombExplode(bomb);
        this.bombs.splice(i, 1);
      }
    }

    if (this.portal) {
      this.portal.update(dt, beatProg);
    }

    this.handleInput();
    this.checkChestPickup();
    this.checkMeleeEnemyDamage();
    this.checkBatDiveDamage();
    this.checkPortalEntry();
    this.checkRoomCleared();

    this.updateCameraTarget();
    this.cameraX += (this.cameraTargetX - this.cameraX) * this.CAMERA_LERP;
    this.cameraY += (this.cameraTargetY - this.cameraY) * this.CAMERA_LERP;
  }

  private handleInput(): void {
    const attackJustPressed = this.input.attack && !this.lastAttackPressed;
    const item1JustPressed = this.input.item1 && !this.lastItem1Pressed;
    const item2JustPressed = this.input.item2 && !this.lastItem2Pressed;
    const cycleJustPressed = this.input.cycle && !this.lastCyclePressed;

    this.lastAttackPressed = this.input.attack;
    this.lastItem1Pressed = this.input.item1;
    this.lastItem2Pressed = this.input.item2;
    this.lastCyclePressed = this.input.cycle;

    if (this.player.canMove()) {
      const dx = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
      const dy = (this.input.down ? 1 : 0) - (this.input.up ? 1 : 0);

      if (dx !== 0 || dy !== 0) {
        const result = this.tryMoveWithRhythm(dx, dy);
        if (result) {
          this.player.moveCooldown = BEAT_INTERVAL * 0.45;
        } else {
          this.player.moveCooldown = 50;
        }
      }
    }

    if (attackJustPressed && !this.player.isAttacking) {
      this.handlePlayerAttack();
    }

    if (item1JustPressed) {
      this.tryUseItem('rhythm_shield');
    }
    if (item2JustPressed) {
      this.tryUseItem('rhythm_bomb');
    }
    if (cycleJustPressed) {
      this.cycleSelectedItem();
    }
  }

  private tryMoveWithRhythm(dx: number, dy: number): boolean {
    const targetX = this.player.targetX + dx;
    const targetY = this.player.targetY + dy;

    if (targetX < 0 || targetX >= ROOM_SIZE || targetY < 0 || targetY >= ROOM_SIZE) {
      return false;
    }

    for (const enemy of this.enemies) {
      if (!enemy.dying && enemy.gridX === targetX && enemy.gridY === targetY) {
        return false;
      }
    }

    const offset = this.audio.getBeatOffsetMs();
    const absOffset = Math.abs(offset);
    const beatProg = this.audio.getBeatProgress();

    const inWindow = absOffset <= BEAT_WINDOW_GOOD;
    const nearEdge = beatProg > 0.75 || beatProg < 0.1;
    const shieldOverride = this.player.rhythm.shieldImmuneActive;

    if (inWindow || nearEdge || shieldOverride) {
      const moved = this.player.startMove(dx, dy);
      if (moved && inWindow && absOffset <= BEAT_WINDOW_PERFECT) {
        this.player.rhythm.lastMoveBeat = this.audio.getCurrentBeat();
      } else if (moved && shieldOverride) {
        this.player.rhythm.lastMoveBeat = this.audio.getCurrentBeat();
      }
      return moved;
    }
    return false;
  }

  private handlePlayerAttack(): void {
    this.player.startAttack();
    this.player.rhythm.lastAttackBeat = this.audio.getCurrentBeat();

    const evalResult = this.rhythm.evaluateAttack(this.player.rhythm.shieldImmuneActive);
    const damage = this.player.registerAttack(evalResult.result);

    const isPerfect = evalResult.result === 'perfect';
    this.audio.playAttackSound(isPerfect);

    const playerPx = this.player.x * TILE_SIZE + TILE_SIZE / 2;
    const playerPy = this.player.y * TILE_SIZE + TILE_SIZE / 2;
    this.rhythm.createNoteParticles(playerPx, playerPy, isPerfect);

    if (evalResult.result === 'miss') {
      this.audio.playMissSound();
    }

    const hitbox = this.player.getAttackHitbox();

    for (const enemy of this.enemies) {
      if (enemy.dying) continue;
      const c = enemy.getCenter();
      const r = 28;
      const within =
        c.x + r > hitbox.x &&
        c.x - r < hitbox.x + hitbox.w &&
        c.y + r > hitbox.y &&
        c.y - r < hitbox.y + hitbox.h;

      if (within) {
        const killed = enemy.takeDamage(damage);
        this.audio.playHitSound();
        const color = isPerfect ? '#ffd700' : '#ff6b6b';
        this.rhythm.createHitParticles(c.x, c.y, color, 10);

        if (killed) {
          this.rhythm.createDeathParticles(c.x, c.y);
        }
      }
    }
  }

  private fireSlimeBullet(enemy: Enemy): void {
    if (enemy.type !== 'slime' || enemy.dying) return;
    const center = enemy.getCenter();
    const bullet = new Bullet(this.nextBulletId++, center.x, center.y, true);
    const targetX = this.player.x * TILE_SIZE + TILE_SIZE / 2;
    const targetY = this.player.y * TILE_SIZE + TILE_SIZE / 2;
    bullet.setTarget(targetX, targetY);
    bullet.damage = 8 + this.state.level * 2;
    this.bullets.push(bullet);
  }

  private onPlayerHit(damage: number): void {
    if (this.player.takeDamage(damage)) {
      this.audio.playPlayerHurtSound();
      const px = this.player.x * TILE_SIZE + TILE_SIZE / 2;
      const py = this.player.y * TILE_SIZE + TILE_SIZE / 2;
      this.rhythm.createHitParticles(px, py, '#ff4757', 12);
      this.rhythm.triggerFlash('#ff0000', 120);
      this.player.rhythm.perfectStreak = 0;
      this.player.rhythm.shieldImmuneActive = false;
      this.player.rhythm.shieldImmuneTimer = 0;

      if (this.player.hp <= 0) {
        this.state.gameOver = true;
        this.audio.stopBGM();
      }
    }
  }

  private onEnemyKilled(enemy: Enemy): void {
    const exp = enemy.type === 'slime' ? 80 : 50;
    const score = enemy.type === 'slime' ? 100 : 75;

    if (this.player.gainExp(exp)) {
      this.audio.playLevelUpSound();
      this.rhythm.triggerFlash('#ffd700', 350);
      this.showMessage(`升级! Lv.${this.player.level}`);
    }
    this.state.score += score;

    if (this.enemies.filter(e => !e.dying).length <= 1) {
      this.state.allEnemiesKilled = true;
    }
  }

  private checkChestPickup(): void {
    if (this.player.isMoving) return;
    const px = this.player.x * TILE_SIZE + TILE_SIZE / 2;
    const py = this.player.y * TILE_SIZE + TILE_SIZE / 2;

    for (const chest of this.chests) {
      if (chest.opened) continue;
      const cx = chest.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = chest.y * TILE_SIZE + TILE_SIZE / 2;
      const dx = cx - px;
      const dy = cy - py;
      const r = 44;
      if (dx * dx + dy * dy < r * r) {
        chest.opened = true;
        this.player.addItem(chest.contents, 1);
        this.state.score += 50;
        this.audio.playPickupSound();
        this.rhythm.createChestParticles(cx, cy);
        this.showMessage(`获得: ${this.itemName(chest.contents)}`);

        if (this.chests.every(c => c.opened)) {
          this.state.allChestsOpened = true;
        }
      }
    }
  }

  private checkMeleeEnemyDamage(): void {
    if (this.player.invincible || this.player.isMoving) return;
    const px = this.player.x * TILE_SIZE + TILE_SIZE / 2;
    const py = this.player.y * TILE_SIZE + TILE_SIZE / 2;

    for (const enemy of this.enemies) {
      if (enemy.dying || enemy.isDiving) continue;
      const c = enemy.getCenter();
      const dx = c.x - px;
      const dy = c.y - py;
      const r = 38;
      if (dx * dx + dy * dy < r * r) {
        this.onPlayerHit(4 + this.state.level);
        break;
      }
    }
  }

  private checkBatDiveDamage(): void {
    if (this.player.invincible) return;
    const px = this.player.x * TILE_SIZE + TILE_SIZE / 2;
    const py = this.player.y * TILE_SIZE + TILE_SIZE / 2;

    for (const enemy of this.enemies) {
      if (enemy.type !== 'bat' || enemy.dying || !enemy.isDiving) continue;
      const c = enemy.getCenter();
      const dx = c.x - px;
      const dy = c.y - py;
      const r = 34;
      if (dx * dx + dy * dy < r * r) {
        this.onPlayerHit(7 + this.state.level);
        break;
      }
    }
  }

  private checkRoomCleared(): void {
    if (this.portal) return;

    const livingEnemies = this.enemies.filter(e => !e.dying).length;
    const openChests = this.chests.filter(c => !c.opened).length;

    if (livingEnemies === 0 && openChests === 0) {
      this.state.allEnemiesKilled = true;
      this.state.allChestsOpened = true;
      this.portal = new Portal(Math.floor(ROOM_SIZE / 2), Math.floor(ROOM_SIZE / 2));
      this.audio.playPortalSound();
      this.showMessage('传送门开启!');
    }
  }

  private checkPortalEntry(): void {
    if (!this.portal || this.levelTransition || this.player.isMoving) return;

    const px = this.player.x * TILE_SIZE + TILE_SIZE / 2;
    const py = this.player.y * TILE_SIZE + TILE_SIZE / 2;
    const portalX = this.portal.x * TILE_SIZE + TILE_SIZE / 2;
    const portalY = this.portal.y * TILE_SIZE + TILE_SIZE / 2;
    const dx = portalX - px;
    const dy = portalY - py;
    const r = 40;

    if (dx * dx + dy * dy < r * r) {
      this.levelTransition = true;
      this.levelTransitionTime = this.LEVEL_TRANSITION_DURATION;
      this.audio.playPortalSound();
      this.rhythm.triggerFlash('#5f27cd', 700);
    }
  }

  private completeLevelTransition(): void {
    this.levelTransition = false;
    this.state.level++;

    this.player.targetX = 2;
    this.player.targetY = 4;
    this.player.x = 2;
    this.player.y = 4;
    this.player.fromX = 2;
    this.player.fromY = 4;
    this.player.isMoving = false;
    this.player.moveProgress = 1;

    this.generateRoom();
    this.updateCameraTarget();
    this.cameraX = this.cameraTargetX;
    this.cameraY = this.cameraTargetY;

    this.showMessage(`第 ${this.state.level} 层`);
  }

  private tryUseItem(type: ItemType): boolean {
    const count = this.player.inventory.get(type) || 0;
    if (count <= 0) {
      return false;
    }

    switch (type) {
      case 'rhythm_shield':
        if (this.player.shieldCooldown > 0) {
          this.showMessage('护盾冷却中...');
          return false;
        }
        if (this.player.useItem(type)) {
          this.audio.playShieldSound();
          this.rhythm.triggerFlash('#4ecdc4', 280);
          this.showMessage('节拍护盾激活!');
          return true;
        }
        return false;

      case 'speed_boots':
        if (this.player.useItem(type)) {
          this.audio.playPickupSound();
          this.rhythm.triggerFlash('#54a0ff', 240);
          this.showMessage('移速永久 +15%!');
          return true;
        }
        return false;

      case 'rhythm_bomb':
        if (this.player.useItem(type)) {
          const x = this.player.x * TILE_SIZE + TILE_SIZE / 2;
          const y = this.player.y * TILE_SIZE + TILE_SIZE / 2;
          const bomb = new Bomb(this.nextBombId++, x, y);
          this.bombs.push(bomb);
          this.showMessage('炸弹投出!');
          return true;
        }
        return false;
    }
    return false;
  }

  private cycleSelectedItem(): void {
    const allItems: ItemType[] = ['rhythm_shield', 'rhythm_bomb', 'speed_boots'];
    const available = allItems.filter(t => (this.player.inventory.get(t) || 0) > 0);
    if (available.length === 0) return;

    const current = this.player.selectedItem;
    const idx = current ? available.indexOf(current) : -1;
    const next = (idx + 1) % available.length;
    this.player.selectedItem = available[next];
  }

  private onBombExplode(bomb: Bomb): void {
    this.audio.playExplosionSound();
    this.rhythm.triggerScreenShake(14, bomb.shakeTime);
    this.rhythm.createExplosionParticles(bomb.x, bomb.y);
    this.rhythm.triggerFlash('#ffa502', 220);

    for (const enemy of this.enemies) {
      if (enemy.dying) continue;
      const c = enemy.getCenter();
      const dx = c.x - bomb.x;
      const dy = c.y - bomb.y;
      if (dx * dx + dy * dy < bomb.explosionRadius * bomb.explosionRadius) {
        const killed = enemy.takeDamage(bomb.damage);
        if (killed) {
          this.rhythm.createDeathParticles(c.x, c.y);
        } else {
          this.rhythm.createHitParticles(c.x, c.y, '#ffa502', 8);
        }
      }
    }
  }

  private itemName(type: ItemType): string {
    switch (type) {
      case 'rhythm_shield': return '节拍护盾';
      case 'speed_boots': return '速度鞋';
      case 'rhythm_bomb': return '节拍炸弹';
    }
  }
}

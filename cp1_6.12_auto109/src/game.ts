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
  ItemType,
  EnemyType
} from './entities';
import { AudioManager } from './audio';
import { RhythmManager, AttackResult } from './rhythm';

export interface GameState {
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  chests: Chest[];
  bombs: Bomb[];
  portal: Portal | null;
  level: number;
  score: number;
  roundTime: number;
  roundDuration: number;
  paused: boolean;
  gameOver: boolean;
  victory: boolean;
  enemiesDefeated: number;
  totalEnemies: number;
  chestsCollected: number;
  totalChests: number;
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
  state: GameState;
  audio: AudioManager;
  rhythm: RhythmManager;
  private input: InputState;
  private lastAttackPressed: boolean;
  private lastItem1Pressed: boolean;
  private lastItem2Pressed: boolean;
  private lastCyclePressed: boolean;
  private nextEnemyId: number;
  private nextBulletId: number;
  private nextChestId: number;
  private nextBombId: number;
  private levelTransition: boolean;
  private levelTransitionTimer: number;
  private displayMessage: string | null;
  private displayMessageTimer: number;
  private lastBeatProcessed: number;

  constructor(audio: AudioManager, rhythm: RhythmManager) {
    this.audio = audio;
    this.rhythm = rhythm;
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      attack: false,
      item1: false,
      item2: false,
      cycle: false
    };
    this.lastAttackPressed = false;
    this.lastItem1Pressed = false;
    this.lastItem2Pressed = false;
    this.lastCyclePressed = false;
    this.nextEnemyId = 1;
    this.nextBulletId = 1;
    this.nextChestId = 1;
    this.nextBombId = 1;
    this.levelTransition = false;
    this.levelTransitionTimer = 0;
    this.displayMessage = null;
    this.displayMessageTimer = 0;
    this.lastBeatProcessed = -1;

    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      player: new Player(2, 4),
      enemies: [],
      bullets: [],
      chests: [],
      bombs: [],
      portal: null,
      level: 1,
      score: 0,
      roundTime: 0,
      roundDuration: 60000,
      paused: false,
      gameOver: false,
      victory: false,
      enemiesDefeated: 0,
      totalEnemies: 0,
      chestsCollected: 0,
      totalChests: 0
    };
  }

  start(): void {
    this.state = this.createInitialState();
    this.nextEnemyId = 1;
    this.nextBulletId = 1;
    this.nextChestId = 1;
    this.nextBombId = 1;
    this.levelTransition = false;
    this.generateRoom();
  }

  private generateRoom(): void {
    this.state.enemies = [];
    this.state.bullets = [];
    this.state.chests = [];
    this.state.bombs = [];
    this.state.portal = null;
    this.state.roundTime = 0;
    this.state.enemiesDefeated = 0;
    this.state.chestsCollected = 0;

    const occupiedPositions = new Set<string>();
    occupiedPositions.add(`${this.state.player.targetX},${this.state.player.targetY}`);

    const enemyCount = 3 + Math.floor(Math.random() * 3) + Math.floor(this.state.level / 3);
    this.state.totalEnemies = enemyCount;

    for (let i = 0; i < enemyCount; i++) {
      let x: number, y: number;
      let attempts = 0;
      do {
        x = Math.floor(Math.random() * ROOM_SIZE);
        y = Math.floor(Math.random() * (ROOM_SIZE - 1));
        attempts++;
      } while (occupiedPositions.has(`${x},${y}`) && attempts < 50);

      if (attempts < 50) {
        occupiedPositions.add(`${x},${y}`);
        const type: EnemyType = Math.random() < 0.5 ? 'slime' : 'bat';
        const enemy = new Enemy(this.nextEnemyId++, type, x, y);
        enemy.hp = Math.floor(enemy.hp * (1 + this.state.level * 0.15));
        enemy.maxHp = enemy.hp;
        enemy.displayHp = enemy.hp;
        this.state.enemies.push(enemy);
      }
    }

    const chestCount = 1 + Math.floor(Math.random() * 2);
    this.state.totalChests = chestCount;

    for (let i = 0; i < chestCount; i++) {
      let x: number, y: number;
      let attempts = 0;
      do {
        x = Math.floor(Math.random() * ROOM_SIZE);
        y = Math.floor(Math.random() * (ROOM_SIZE - 1));
        attempts++;
      } while (occupiedPositions.has(`${x},${y}`) && attempts < 50);

      if (attempts < 50) {
        occupiedPositions.add(`${x},${y}`);
        this.state.chests.push(new Chest(this.nextChestId++, x, y));
      }
    }
  }

  setInput(key: keyof InputState, pressed: boolean): void {
    this.input[key] = pressed;
  }

  update(dt: number): void {
    if (this.state.paused || this.state.gameOver) return;

    if (this.levelTransition) {
      this.levelTransitionTimer -= dt;
      if (this.levelTransitionTimer <= 0) {
        this.levelTransition = false;
        this.state.level++;
        this.state.player.targetX = 2;
        this.state.player.targetY = 4;
        this.state.player.x = 2;
        this.state.player.y = 4;
        this.state.player.fromX = 2;
        this.state.player.fromY = 4;
        this.state.player.isMoving = false;
        this.state.player.moveProgress = 1;
        this.generateRoom();
        this.showMessage(`第 ${this.state.level} 层`);
      }
      return;
    }

    if (this.displayMessage) {
      this.displayMessageTimer -= dt;
      if (this.displayMessageTimer <= 0) {
        this.displayMessage = null;
      }
    }

    this.state.roundTime += dt;
    if (this.state.roundTime >= this.state.roundDuration) {
      this.state.roundTime = 0;
    }

    const currentBeat = this.audio.getBeatIndex();
    if (currentBeat !== this.lastBeatProcessed && currentBeat >= 0) {
      this.lastBeatProcessed = currentBeat;
    }

    this.handleInput(dt);
    this.state.player.update(dt);

    for (const enemy of this.state.enemies) {
      enemy.update(dt, this.state.player);
      if (enemy.type === 'slime' && !enemy.dying && enemy.shouldFire()) {
        this.fireEnemyBullet(enemy);
      }
      if (enemy.isDiving && enemy.type === 'bat') {
        this.checkDiveCollision(enemy);
      }
    }

    this.state.enemies = this.state.enemies.filter(e => {
      if (e.dying && e.deathTimer <= 0) {
        this.state.enemiesDefeated++;
        const expGain = e.type === 'slime' ? 80 : 50;
        const scoreGain = e.type === 'slime' ? 100 : 75;
        if (this.state.player.gainExp(expGain)) {
          this.audio.playLevelUpSound();
          this.rhythm.triggerFlash('#ffd700', 400);
          this.showMessage(`升级! Lv.${this.state.player.level}`);
        }
        this.state.score += scoreGain;
        this.checkRoomCleared();
        return false;
      }
      return true;
    });

    for (let i = this.state.bullets.length - 1; i >= 0; i--) {
      const bullet = this.state.bullets[i];
      const playerPx = this.state.player.x * TILE_SIZE + TILE_SIZE / 2;
      const playerPy = this.state.player.y * TILE_SIZE + TILE_SIZE / 2;
      bullet.update(dt, playerPx, playerPy);

      if (bullet.isEnemy) {
        const dx = bullet.x - playerPx;
        const dy = bullet.y - playerPy;
        const distSq = dx * dx + dy * dy;
        if (distSq < (bullet.radius + 18) * (bullet.radius + 18)) {
          if (this.state.player.takeDamage(bullet.damage)) {
            this.audio.playPlayerHurtSound();
            this.rhythm.createHitParticles(playerPx, playerPy, '#ff4757');
            this.rhythm.triggerFlash('#ff0000', 150);
            this.rhythm.resetCombo();
            if (this.state.player.hp <= 0) {
              this.state.gameOver = true;
              this.audio.stopBGM();
            }
          }
          this.state.bullets.splice(i, 1);
          continue;
        }
      }

      const roomPx = ROOM_SIZE * TILE_SIZE / 2;
      const bx = bullet.x - roomPx;
      const by = bullet.y - roomPx;
      const maxDist = roomPx + 100;
      if (Math.abs(bx) > maxDist || Math.abs(by) > maxDist || bullet.isExpired()) {
        this.state.bullets.splice(i, 1);
      }
    }

    const beatProgress = this.audio.getBeatProgress();
    for (const chest of this.state.chests) {
      chest.update(dt, beatProgress);
    }

    if (this.state.portal) {
      this.state.portal.update(dt, beatProgress);
      this.checkPortalEntry();
    }

    for (let i = this.state.bombs.length - 1; i >= 0; i--) {
      const bomb = this.state.bombs[i];
      bomb.update(dt);
      if (bomb.exploded) {
        this.triggerBombExplosion(bomb);
        this.state.bombs.splice(i, 1);
      }
    }

    this.checkChestCollection();
    this.checkEnemyCollision();
  }

  private handleInput(dt: number): void {
    const attackJustPressed = this.input.attack && !this.lastAttackPressed;
    const item1JustPressed = this.input.item1 && !this.lastItem1Pressed;
    const item2JustPressed = this.input.item2 && !this.lastItem2Pressed;
    const cycleJustPressed = this.input.cycle && !this.lastCyclePressed;

    this.lastAttackPressed = this.input.attack;
    this.lastItem1Pressed = this.input.item1;
    this.lastItem2Pressed = this.input.item2;
    this.lastCyclePressed = this.input.cycle;

    if (!this.levelTransition && !this.state.player.isMoving) {
      let dx = 0, dy = 0;
      if (this.input.up) dy = -1;
      else if (this.input.down) dy = 1;
      else if (this.input.left) dx = -1;
      else if (this.input.right) dx = 1;

      if (dx !== 0 || dy !== 0) {
        const moveResult = this.rhythm.evaluateMove();
        if (moveResult.canMove) {
          if (this.state.player.startMove(dx, dy)) {
            this.state.player.moveCooldown = BEAT_INTERVAL * 0.4;
            if (moveResult.result === 'miss') {
              if (!this.state.player.activeShield) {
                this.rhythm.resetCombo();
              }
            }
          }
        }
      }
    }

    if (attackJustPressed && !this.state.player.isAttacking) {
      this.handleAttack();
    }

    if (item1JustPressed) {
      this.useItem('rhythm_shield');
    }
    if (item2JustPressed) {
      this.useItem('rhythm_bomb');
    }
    if (cycleJustPressed) {
      this.cycleSelectedItem();
    }
  }

  private handleAttack(): void {
    const evaluation = this.rhythm.evaluateAttack();
    const damage = this.state.player.attack * evaluation.damageMultiplier;
    this.state.player.startAttack();

    const isPerfect = evaluation.result === 'perfect';
    this.audio.playAttackSound(isPerfect);

    const hitbox = this.state.player.getAttackHitbox();
    const playerPx = this.state.player.x * TILE_SIZE + TILE_SIZE / 2;
    const playerPy = this.state.player.y * TILE_SIZE + TILE_SIZE / 2;

    if (isPerfect) {
      this.rhythm.createNoteParticles(playerPx, playerPy, true);
    } else if (evaluation.result === 'good') {
      this.rhythm.createNoteParticles(playerPx, playerPy - 10, false);
    }

    for (const enemy of this.state.enemies) {
      if (enemy.dying) continue;
      const eCenter = enemy.getCenter();
      const enemySize = 24;

      if (
        eCenter.x + enemySize > hitbox.x &&
        eCenter.x - enemySize < hitbox.x + hitbox.w &&
        eCenter.y + enemySize > hitbox.y &&
        eCenter.y - enemySize < hitbox.y + hitbox.h
      ) {
        if (enemy.takeDamage(damage)) {
          this.audio.playHitSound();
          this.rhythm.createHitParticles(eCenter.x, eCenter.y, isPerfect ? '#ffd700' : '#ff6b6b');
          if (enemy.dying) {
            this.rhythm.createDeathParticles(eCenter.x, eCenter.y);
          }
        } else {
          this.audio.playHitSound();
          this.rhythm.createHitParticles(eCenter.x, eCenter.y, '#ff6b6b');
        }
      }
    }
  }

  private fireEnemyBullet(enemy: Enemy): void {
    const center = enemy.getCenter();
    const bullet = new Bullet(this.nextBulletId++, center.x, center.y, true);
    const playerPx = this.state.player.x * TILE_SIZE + TILE_SIZE / 2;
    const playerPy = this.state.player.y * TILE_SIZE + TILE_SIZE / 2;
    bullet.setTarget(playerPx, playerPy);
    bullet.damage = 8 + this.state.level * 2;
    this.state.bullets.push(bullet);
  }

  private checkDiveCollision(enemy: Enemy): void {
    const eCenter = enemy.getCenter();
    const playerPx = this.state.player.x * TILE_SIZE + TILE_SIZE / 2;
    const playerPy = this.state.player.y * TILE_SIZE + TILE_SIZE / 2;
    const dx = eCenter.x - playerPx;
    const dy = eCenter.y - playerPy;
    const distSq = dx * dx + dy * dy;
    const collisionDist = 32;

    if (distSq < collisionDist * collisionDist) {
      if (this.state.player.takeDamage(6 + this.state.level)) {
        this.audio.playPlayerHurtSound();
        this.rhythm.createHitParticles(playerPx, playerPy, '#ff4757');
        this.rhythm.triggerFlash('#ff0000', 120);
        this.rhythm.resetCombo();
        if (this.state.player.hp <= 0) {
          this.state.gameOver = true;
          this.audio.stopBGM();
        }
      }
    }
  }

  private checkEnemyCollision(): void {
    if (this.state.player.invincible || this.state.player.isMoving) return;
    const playerPx = this.state.player.x * TILE_SIZE + TILE_SIZE / 2;
    const playerPy = this.state.player.y * TILE_SIZE + TILE_SIZE / 2;

    for (const enemy of this.state.enemies) {
      if (enemy.dying) continue;
      const eCenter = enemy.getCenter();
      const dx = eCenter.x - playerPx;
      const dy = eCenter.y - playerPy;
      const distSq = dx * dx + dy * dy;
      const collisionDist = 40;

      if (distSq < collisionDist * collisionDist) {
        if (this.state.player.takeDamage(5)) {
          this.audio.playPlayerHurtSound();
          this.rhythm.createHitParticles(playerPx, playerPy, '#ff4757');
          this.rhythm.triggerFlash('#ff0000', 100);
          this.rhythm.resetCombo();
          if (this.state.player.hp <= 0) {
            this.state.gameOver = true;
            this.audio.stopBGM();
          }
        }
        break;
      }
    }
  }

  private checkChestCollection(): void {
    if (this.state.player.isMoving) return;
    const playerPx = this.state.player.x * TILE_SIZE + TILE_SIZE / 2;
    const playerPy = this.state.player.y * TILE_SIZE + TILE_SIZE / 2;

    for (let i = this.state.chests.length - 1; i >= 0; i--) {
      const chest = this.state.chests[i];
      if (chest.opened) continue;
      const cx = chest.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = chest.y * TILE_SIZE + TILE_SIZE / 2;
      const dx = cx - playerPx;
      const dy = cy - playerPy;
      const distSq = dx * dx + dy * dy;
      if (distSq < 48 * 48) {
        chest.opened = true;
        this.state.player.addItem(chest.contents, 1);
        this.state.chestsCollected++;
        this.state.score += 50;
        this.audio.playPickupSound();
        this.rhythm.createHitParticles(cx, cy, '#ffd700');
        this.showMessage(this.getItemName(chest.contents));
        this.checkRoomCleared();
      }
    }
  }

  private getItemName(type: ItemType): string {
    switch (type) {
      case 'rhythm_shield': return '节拍护盾!';
      case 'speed_boots': return '速度鞋!';
      case 'rhythm_bomb': return '节拍炸弹!';
    }
  }

  private useItem(type: ItemType): boolean {
    const count = this.state.player.inventory.get(type) || 0;
    if (count <= 0) return false;

    switch (type) {
      case 'rhythm_shield':
        if (this.state.player.shieldCooldown > 0) {
          this.showMessage('护盾冷却中...');
          return false;
        }
        if (this.state.player.useItem(type)) {
          this.audio.playShieldSound();
          this.rhythm.triggerFlash('#4ecdc4', 300);
          this.showMessage('节拍护盾激活!');
          return true;
        }
        return false;

      case 'speed_boots':
        if (this.state.player.useItem(type)) {
          this.audio.playPickupSound();
          this.rhythm.triggerFlash('#54a0ff', 250);
          this.showMessage('移速永久+15%!');
          return true;
        }
        return false;

      case 'rhythm_bomb':
        if (this.state.player.useItem(type)) {
          const bomb = new Bomb(
            this.nextBombId++,
            this.state.player.x * TILE_SIZE + TILE_SIZE / 2,
            this.state.player.y * TILE_SIZE + TILE_SIZE / 2
          );
          this.state.bombs.push(bomb);
          this.showMessage('炸弹已投出!');
          return true;
        }
        return false;
    }
    return false;
  }

  private cycleSelectedItem(): void {
    const items: ItemType[] = ['rhythm_shield', 'speed_boots', 'rhythm_bomb'];
    const available = items.filter(i => (this.state.player.inventory.get(i) || 0) > 0);
    if (available.length === 0) return;

    const current = this.state.player.selectedItem;
    const currentIdx = current ? available.indexOf(current) : -1;
    const nextIdx = (currentIdx + 1) % available.length;
    this.state.player.selectedItem = available[nextIdx];
  }

  private triggerBombExplosion(bomb: Bomb): void {
    this.audio.playExplosionSound();
    this.rhythm.triggerScreenShake(12, bomb.shakeTime);
    this.rhythm.createExplosionParticles(bomb.x, bomb.y);
    this.rhythm.triggerFlash('#ffa502', 200);

    for (const enemy of this.state.enemies) {
      if (enemy.dying) continue;
      const eCenter = enemy.getCenter();
      const dx = eCenter.x - bomb.x;
      const dy = eCenter.y - bomb.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < bomb.explosionRadius * bomb.explosionRadius) {
        if (enemy.takeDamage(bomb.damage)) {
          if (enemy.dying) {
            this.rhythm.createDeathParticles(eCenter.x, eCenter.y);
          }
        }
      }
    }
  }

  private checkRoomCleared(): void {
    const allEnemiesDead = this.state.enemiesDefeated >= this.state.totalEnemies;
    const allChestsCollected = this.state.chestsCollected >= this.state.totalChests;

    if (allEnemiesDead && allChestsCollected && !this.state.portal) {
      this.state.portal = new Portal(
        Math.floor(ROOM_SIZE / 2),
        Math.floor(ROOM_SIZE / 2) - 1
      );
      this.audio.playPortalSound();
      this.showMessage('传送门已开启!');
    }
  }

  private checkPortalEntry(): void {
    if (!this.state.portal || this.levelTransition || this.state.player.isMoving) return;

    const playerPx = this.state.player.x * TILE_SIZE + TILE_SIZE / 2;
    const playerPy = this.state.player.y * TILE_SIZE + TILE_SIZE / 2;
    const portalPx = this.state.portal.x * TILE_SIZE + TILE_SIZE / 2;
    const portalPy = this.state.portal.y * TILE_SIZE + TILE_SIZE / 2;

    const dx = portalPx - playerPx;
    const dy = portalPy - playerPy;
    const distSq = dx * dx + dy * dy;

    if (distSq < 40 * 40) {
      this.levelTransition = true;
      this.levelTransitionTimer = 1000;
      this.audio.playPortalSound();
      this.rhythm.triggerFlash('#5f27cd', 800);
    }
  }

  private showMessage(msg: string): void {
    this.displayMessage = msg;
    this.displayMessageTimer = 1500;
  }

  getMessage(): { text: string; alpha: number } | null {
    if (!this.displayMessage) return null;
    const t = this.displayMessageTimer / 1500;
    const alpha = t < 0.1 ? t / 0.1 : t > 0.8 ? (1 - t) / 0.2 : 1;
    return { text: this.displayMessage, alpha: Math.max(0, Math.min(1, alpha)) };
  }

  getLevelTransitionProgress(): number {
    if (!this.levelTransition) return 0;
    return 1 - this.levelTransitionTimer / 1000;
  }

  getCameraTarget(): { x: number; y: number } {
    const centerX = this.state.player.x * TILE_SIZE + TILE_SIZE / 2;
    const centerY = this.state.player.y * TILE_SIZE + TILE_SIZE / 2;
    return { x: centerX, y: centerY };
  }

  getActiveShieldTimer(): number {
    return this.state.player.activeShield ? this.state.player.shieldTimer : 0;
  }

  getShieldCooldown(): number {
    return !this.state.player.activeShield && this.state.player.shieldCooldown > 0
      ? this.state.player.shieldCooldown
      : 0;
  }
}

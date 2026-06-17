import Konva from 'konva';
import { SKILLS, COMBO_RULES, getSkillByType, getSkillByKey, SkillType, SkillConfig, ComboRule } from './skills';

export interface CooldownState {
  light: number;
  heavy: number;
  special: number;
}

export interface ComboRecord {
  id: number;
  name: string;
  count: number;
  color: string;
}

export interface GameEngineCallbacks {
  onCooldownUpdate: (cooldowns: CooldownState) => void;
  onComboRecord: (record: ComboRecord) => void;
}

interface Projectile {
  id: number;
  type: SkillType;
  x: number;
  y: number;
  speed: number;
  size: number;
  damage: number;
  color: string;
  shape: Konva.Circle;
  hasHit: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  shape: Konva.Circle;
  life: number;
  maxLife: number;
}

interface ChargingState {
  type: SkillType;
  startTime: number;
  duration: number;
  color: string;
}

interface ComboText {
  text: string;
  startTime: number;
  duration: number;
  shape: Konva.Text;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GROUND_Y = 550;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 80;
const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 80;
const PLAYER_SPEED = 4;

export class GameEngine {
  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private player: Konva.Rect;
  private playerGlow: Konva.Circle;
  private enemy: Konva.Rect;
  private groundLine: Konva.Line;

  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private cooldowns: CooldownState = { light: 0, heavy: 0, special: 0 };
  private comboSequence: SkillType[] = [];
  private lastComboTime: number = 0;
  private comboRecordId: number = 0;
  private projectileId: number = 0;
  private particleId: number = 0;

  private keys: Set<string> = new Set();
  private chargingState: ChargingState | null = null;
  private comboActive: boolean = false;
  private comboProjectilesRemaining: number = 0;
  private comboCurrentSkillIndex: number = 0;
  private comboLastFireTime: number = 0;
  private comboKnockback: number = 0;
  private comboDamageMultiplier: number = 1;

  private enemyFlashTime: number = 0;
  private enemyKnockbackY: number = 0;
  private enemyKnockbackVelocity: number = 0;
  private enemyBaseX: number = 650;

  private comboTexts: ComboText[] = [];

  private animationFrame: number | null = null;
  private lastTime: number = 0;
  private callbacks: GameEngineCallbacks;

  constructor(containerId: string, callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;

    this.stage = new Konva.Stage({
      container: containerId,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });

    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    const gradient = new Konva.Rect({
      x: 0,
      y: 0,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      fillLinearGradientStartPoint: { x: 0, y: 0 },
      fillLinearGradientEndPoint: { x: 0, y: CANVAS_HEIGHT },
      fillLinearGradientColorStops: [0, '#1A1A2E', 1, '#16213E'],
    });
    this.layer.add(gradient);

    this.groundLine = new Konva.Line({
      points: [0, GROUND_Y, CANVAS_WIDTH, GROUND_Y],
      stroke: '#4A4A4A',
      strokeWidth: 2,
    });
    this.layer.add(this.groundLine);

    this.playerGlow = new Konva.Circle({
      x: 0,
      y: 0,
      radius: 60,
      fill: '#FFD700',
      opacity: 0,
      listening: false,
    });
    this.layer.add(this.playerGlow);

    this.player = new Konva.Rect({
      x: 200,
      y: GROUND_Y - PLAYER_HEIGHT,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      fill: '#4CAF50',
      cornerRadius: 5,
    });
    this.layer.add(this.player);

    this.enemy = new Konva.Rect({
      x: this.enemyBaseX,
      y: GROUND_Y - ENEMY_HEIGHT,
      width: ENEMY_WIDTH,
      height: ENEMY_HEIGHT,
      fill: '#E53935',
      cornerRadius: 5,
    });
    this.layer.add(this.enemy);

    this.setupKeyboardEvents();
    this.startGameLoop();
  }

  private setupKeyboardEvents() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    this.keys.add(key);

    const skill = getSkillByKey(key);
    if (skill && !this.chargingState && !this.comboActive) {
      this.tryCastSkill(skill.type);
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    this.keys.delete(key);
  }

  private tryCastSkill(skillType: SkillType) {
    const skill = getSkillByType(skillType);
    if (!skill) return;

    if (this.cooldowns[skillType] > 0) return;

    this.chargingState = {
      type: skillType,
      startTime: performance.now(),
      duration: skill.chargeTime,
      color: skill.color,
    };

    this.cooldowns[skillType] = skill.cooldown;

    this.comboSequence.push(skillType);
    this.lastComboTime = performance.now();
    this.checkCombo();

    this.callbacks.onCooldownUpdate({ ...this.cooldowns });
  }

  private checkCombo() {
    const now = performance.now();

    if (now - this.lastComboTime > 500) {
      this.comboSequence = [this.comboSequence[this.comboSequence.length - 1]];
    }

    for (const rule of COMBO_RULES) {
      if (this.comboSequence.length < rule.sequence.length) continue;

      const recent = this.comboSequence.slice(-rule.sequence.length);
      const matches = recent.every((s, i) => s === rule.sequence[i]);

      if (matches) {
        this.triggerCombo(rule);
        break;
      }
    }
  }

  private triggerCombo(rule: ComboRule) {
    this.comboActive = true;
    this.comboProjectilesRemaining = rule.sequence.length;
    this.comboCurrentSkillIndex = 0;
    this.comboLastFireTime = 0;
    this.comboKnockback = rule.knockback;
    this.comboDamageMultiplier = rule.damageMultiplier;

    this.cooldowns.light = 0;
    this.cooldowns.heavy = 0;
    this.cooldowns.special = 0;

    this.comboRecordId++;
    this.callbacks.onComboRecord({
      id: this.comboRecordId,
      name: rule.name,
      count: rule.sequence.length,
      color: rule.color,
    });

    this.playerGlow.fill('#FFD700');
    this.playerGlow.opacity(0.6);
    this.playerGlow.x(this.player.x() + PLAYER_WIDTH / 2);
    this.playerGlow.y(this.player.y() + PLAYER_HEIGHT / 2);
    this.playerGlow.radius(80);

    this.showComboText(rule.name);

    this.callbacks.onCooldownUpdate({ ...this.cooldowns });
  }

  private showComboText(text: string) {
    const comboTextShape = new Konva.Text({
      x: 0,
      y: CANVAS_HEIGHT / 2 - 40,
      width: CANVAS_WIDTH,
      text: text,
      fontSize: 48,
      fontFamily: 'Arial, sans-serif',
      fill: '#FFD700',
      align: 'center',
      shadowColor: '#FFD700',
      shadowBlur: 20,
      shadowOpacity: 0.8,
      opacity: 0,
      fontStyle: 'bold',
      listening: false,
    });
    this.layer.add(comboTextShape);
    comboTextShape.moveToTop();

    this.comboTexts.push({
      text: text,
      startTime: performance.now(),
      duration: 1500,
      shape: comboTextShape,
    });
  }

  private fireProjectile(skillType: SkillType, damageMultiplier: number = 1, applyKnockback: boolean = false) {
    const skill = getSkillByType(skillType);
    if (!skill) return;

    this.projectileId++;

    const projectileShape = new Konva.Circle({
      x: this.player.x() + PLAYER_WIDTH,
      y: this.player.y() + PLAYER_HEIGHT / 2,
      radius: skill.projectileSize / 2,
      fill: skill.color,
      shadowColor: skill.color,
      shadowBlur: 10,
    });
    this.layer.add(projectileShape);

    this.projectiles.push({
      id: this.projectileId,
      type: skillType,
      x: this.player.x() + PLAYER_WIDTH,
      y: this.player.y() + PLAYER_HEIGHT / 2,
      speed: skill.projectileSpeed,
      size: skill.projectileSize,
      damage: skill.damage * damageMultiplier,
      color: skill.color,
      shape: projectileShape,
      hasHit: false,
    });
  }

  private createExplosion(x: number, y: number, color: string) {
    const particleCount = 8;
    const speed = 3;

    for (let i = 0; i < particleCount; i++) {
      this.particleId++;
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const vx = Math.cos(angle) * speed * (0.8 + Math.random() * 0.4);
      const vy = Math.sin(angle) * speed * (0.8 + Math.random() * 0.4);

      const particleShape = new Konva.Circle({
        x: x,
        y: y,
        radius: 4,
        fill: color,
        opacity: 1,
      });
      this.layer.add(particleShape);

      this.particles.push({
        id: this.particleId,
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        color: color,
        shape: particleShape,
        life: 400,
        maxLife: 400,
      });
    }
  }

  private checkCollision(projectile: Projectile): boolean {
    const enemyX = this.enemy.x();
    const enemyY = this.enemy.y() + this.enemyKnockbackY;

    if (
      projectile.x + projectile.size / 2 > enemyX &&
      projectile.x - projectile.size / 2 < enemyX + ENEMY_WIDTH &&
      projectile.y + projectile.size / 2 > enemyY &&
      projectile.y - projectile.size / 2 < enemyY + ENEMY_HEIGHT
    ) {
      return true;
    }
    return false;
  }

  private applyHit(projectile: Projectile) {
    this.createExplosion(projectile.x, projectile.y, projectile.color);

    this.enemyFlashTime = 200;
    this.enemy.x(Math.min(this.enemy.x() + 40, CANVAS_WIDTH - ENEMY_WIDTH));

    if (this.comboActive && this.comboKnockback > 0) {
      this.enemyKnockbackVelocity = -12;
    }
  }

  private startGameLoop() {
    this.lastTime = performance.now();
    const loop = (time: number) => {
      const deltaTime = Math.min(time - this.lastTime, 50);
      this.lastTime = time;
      this.update(deltaTime, time);
      this.animationFrame = requestAnimationFrame(loop);
    };
    this.animationFrame = requestAnimationFrame(loop);
  }

  private update(deltaTime: number, currentTime: number) {
    this.updatePlayer(deltaTime);
    this.updateCharging(deltaTime, currentTime);
    this.updateCombo(deltaTime, currentTime);
    this.updateCooldowns(deltaTime);
    this.updateProjectiles(deltaTime);
    this.updateParticles(deltaTime);
    this.updateEnemy(deltaTime);
    this.updateGlow(deltaTime, currentTime);
    this.updateComboTexts(currentTime);

    this.layer.batchDraw();
  }

  private updatePlayer(deltaTime: number) {
    let dx = 0;

    if (this.keys.has('a')) dx -= PLAYER_SPEED;
    if (this.keys.has('d')) dx += PLAYER_SPEED;

    const newX = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_WIDTH, this.player.x() + dx));
    this.player.x(newX);
  }

  private updateCharging(deltaTime: number, currentTime: number) {
    if (!this.chargingState) return;

    const elapsed = currentTime - this.chargingState.startTime;

    const flashSpeed = 0.008;
    const flashPhase = Math.sin(currentTime * flashSpeed);
    const glowOpacity = 0.3 + flashPhase * 0.2;

    this.playerGlow.fill(this.chargingState.color);
    this.playerGlow.opacity(glowOpacity);
    this.playerGlow.x(this.player.x() + PLAYER_WIDTH / 2);
    this.playerGlow.y(this.player.y() + PLAYER_HEIGHT / 2);
    this.playerGlow.radius(50 + flashPhase * 10);

    this.player.fill(this.chargingState.color);

    if (elapsed >= this.chargingState.duration) {
      const skillType = this.chargingState.type;
      this.chargingState = null;
      this.player.fill('#4CAF50');
      this.playerGlow.opacity(0);
      this.fireProjectile(skillType);

      this.comboRecordId++;
      const skill = getSkillByType(skillType);
      if (skill) {
        this.callbacks.onComboRecord({
          id: this.comboRecordId,
          name: skill.name,
          count: 1,
          color: skill.color,
        });
      }
    }
  }

  private updateCombo(deltaTime: number, currentTime: number) {
    if (!this.comboActive) return;

    if (this.comboProjectilesRemaining > 0) {
      if (
        this.comboLastFireTime === 0 ||
        currentTime - this.comboLastFireTime >= 100
      ) {
        const skillType = ['light', 'heavy', 'special'][this.comboCurrentSkillIndex] as SkillType;
        this.fireProjectile(skillType, this.comboDamageMultiplier, true);
        this.comboCurrentSkillIndex++;
        this.comboProjectilesRemaining--;
        this.comboLastFireTime = currentTime;
      }
    }

    if (this.comboProjectilesRemaining <= 0) {
      const glowOpacity = this.playerGlow.opacity();
      if (glowOpacity > 0) {
        this.playerGlow.opacity(Math.max(0, glowOpacity - deltaTime / 500));
      } else {
        this.comboActive = false;
        this.playerGlow.opacity(0);
      }
    }
  }

  private updateCooldowns(deltaTime: number) {
    let updated = false;

    for (const type of ['light', 'heavy', 'special'] as SkillType[]) {
      if (this.cooldowns[type] > 0) {
        this.cooldowns[type] = Math.max(0, this.cooldowns[type] - deltaTime);
        updated = true;
      }
    }

    if (updated) {
      this.callbacks.onCooldownUpdate({ ...this.cooldowns });
    }
  }

  private updateProjectiles(deltaTime: number) {
    const toRemove: number[] = [];

    for (const proj of this.projectiles) {
      proj.x += proj.speed;
      proj.shape.x(proj.x);

      if (!proj.hasHit && this.checkCollision(proj)) {
        proj.hasHit = true;
        this.applyHit(proj);
        toRemove.push(proj.id);
      }

      if (proj.x > CANVAS_WIDTH + 50) {
        toRemove.push(proj.id);
      }
    }

    for (const id of toRemove) {
      const idx = this.projectiles.findIndex((p) => p.id === id);
      if (idx !== -1) {
        this.projectiles[idx].shape.destroy();
        this.projectiles.splice(idx, 1);
      }
    }
  }

  private updateParticles(deltaTime: number) {
    const toRemove: number[] = [];

    for (const particle of this.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.1;
      particle.life -= deltaTime;

      particle.shape.x(particle.x);
      particle.shape.y(particle.y);
      particle.shape.opacity(Math.max(0, particle.life / particle.maxLife));

      if (particle.life <= 0) {
        toRemove.push(particle.id);
      }
    }

    for (const id of toRemove) {
      const idx = this.particles.findIndex((p) => p.id === id);
      if (idx !== -1) {
        this.particles[idx].shape.destroy();
        this.particles.splice(idx, 1);
      }
    }
  }

  private updateEnemy(deltaTime: number) {
    if (this.enemyFlashTime > 0) {
      this.enemyFlashTime -= deltaTime;
      if (this.enemyFlashTime > 0) {
        this.enemy.fill('#FFFFFF');
      } else {
        this.enemy.fill('#E53935');
      }
    }

    if (this.enemyKnockbackY !== 0 || this.enemyKnockbackVelocity !== 0) {
      this.enemyKnockbackVelocity += 0.5;
      this.enemyKnockbackY += this.enemyKnockbackVelocity;

      if (this.enemyKnockbackY >= 0) {
        this.enemyKnockbackY = 0;
        this.enemyKnockbackVelocity = 0;
      }

      this.enemy.y(GROUND_Y - ENEMY_HEIGHT + this.enemyKnockbackY);
    }
  }

  private updateGlow(deltaTime: number, currentTime: number) {
    if (this.chargingState || this.comboActive) return;
    this.playerGlow.opacity(0);
  }

  private updateComboTexts(currentTime: number) {
    const toRemove: number[] = [];

    for (let i = 0; i < this.comboTexts.length; i++) {
      const ct = this.comboTexts[i];
      const elapsed = currentTime - ct.startTime;
      const progress = elapsed / ct.duration;

      if (progress >= 1) {
        toRemove.push(i);
        continue;
      }

      let opacity: number;
      if (progress < 0.2) {
        opacity = progress / 0.2;
      } else if (progress < 0.7) {
        opacity = 1;
      } else {
        opacity = 1 - (progress - 0.7) / 0.3;
      }

      ct.shape.opacity(opacity);
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      this.comboTexts[idx].shape.destroy();
      this.comboTexts.splice(idx, 1);
    }
  }

  public destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    this.stage.destroy();
  }
}

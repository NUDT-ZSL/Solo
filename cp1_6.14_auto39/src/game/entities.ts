import { Position, RoomData, TILE_SIZE, isWalkable, getTileCenter } from './room';

export type ItemType =
  | 'health_potion'
  | 'attack_ring'
  | 'speed_boots'
  | 'shield'
  | 'gold_bag';

export type PermanentUpgradeType =
  | 'max_hp'
  | 'attack'
  | 'initial_gold';

export interface Item {
  id: string;
  type: ItemType;
  name: string;
  description: string;
  icon: string;
  duration?: number;
}

export interface PermanentUpgrade {
  id: string;
  type: PermanentUpgradeType;
  name: string;
  icon: string;
  value: number;
}

export interface CollisionEvent {
  type: 'enemy_hit' | 'player_hit' | 'item_pickup' | 'chest_open' | 'exit';
  entityId?: string;
  damage?: number;
  item?: Item;
}

export const ITEM_TEMPLATES: Record<ItemType, Omit<Item, 'id'>> = {
  health_potion: {
    type: 'health_potion',
    name: '回血药水',
    description: '恢复30点生命值',
    icon: '❤️',
  },
  attack_ring: {
    type: 'attack_ring',
    name: '攻击之戒',
    description: '攻击力+5，持续一层',
    icon: '💍',
    duration: 1,
  },
  speed_boots: {
    type: 'speed_boots',
    name: '速度之靴',
    description: '移动速度+20%，持续一层',
    icon: '👢',
    duration: 1,
  },
  shield: {
    type: 'shield',
    name: '护盾',
    description: '抵挡下一次伤害',
    icon: '🛡️',
  },
  gold_bag: {
    type: 'gold_bag',
    name: '金币袋',
    description: '获得10金币',
    icon: '💰',
  },
};

export const PERMANENT_UPGRADE_TEMPLATES: Record<
  PermanentUpgradeType,
  Omit<PermanentUpgrade, 'id'>
> = {
  max_hp: {
    type: 'max_hp',
    name: '最大生命+20',
    icon: 'HP+',
    value: 20,
  },
  attack: {
    type: 'attack',
    name: '攻击力+5',
    icon: 'ATK+',
    value: 5,
  },
  initial_gold: {
    type: 'initial_gold',
    name: '初始金币+10',
    icon: 'G+',
    value: 10,
  },
};

export class Entity {
  id: string;
  x: number;
  y: number;
  vx: number = 0;
  vy: number = 0;
  radius: number;

  constructor(id: string, x: number, y: number, radius: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.radius = radius;
  }

  getPosition(): Position {
    return { x: this.x, y: this.y };
  }

  distanceTo(other: Entity): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export class Player extends Entity {
  hp: number;
  maxHp: number;
  attackPower: number;
  baseAttack: number;
  speed: number;
  baseSpeed: number;
  gold: number;
  direction: number = 0;
  isAttacking: boolean = false;
  attackTimer: number = 0;
  hitFlashTimer: number = 0;
  hasShield: boolean = false;
  activeItems: Item[] = [];
  permanentUpgrades: PermanentUpgrade[] = [];
  particles: Particle[] = [];
  invincibleTimer: number = 0;

  constructor(
    id: string,
    x: number,
    y: number,
    maxHp: number = 100,
    attackPower: number = 10,
    speed: number = 150,
    gold: number = 0
  ) {
    super(id, x, y, 10);
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.baseAttack = attackPower;
    this.attackPower = attackPower;
    this.baseSpeed = speed;
    this.speed = speed;
    this.gold = gold;
  }

  update(dt: number, input: PlayerInput, room: RoomData): void {
    let dx = 0;
    let dy = 0;

    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      this.direction = Math.atan2(dy, dx);
    }

    this.vx = dx * this.speed;
    this.vy = dy * this.speed;

    const newX = this.x + this.vx * dt;
    const newY = this.y + this.vy * dt;

    if (
      isWalkable(room, newX - this.radius, this.y) &&
      isWalkable(room, newX + this.radius, this.y)
    ) {
      this.x = newX;
    }
    if (
      isWalkable(room, this.x, newY - this.radius) &&
      isWalkable(room, this.x, newY + this.radius)
    ) {
      this.y = newY;
    }

    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
      }
    }

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
    }

    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
    }

    this.updateParticles(dt);
  }

  attack(): void {
    if (this.attackTimer <= 0) {
      this.isAttacking = true;
      this.attackTimer = 0.2;
    }
  }

  takeDamage(damage: number): boolean {
    if (this.invincibleTimer > 0) return false;

    if (this.hasShield) {
      this.hasShield = false;
      this.invincibleTimer = 0.5;
      return true;
    }

    this.hp -= damage;
    this.hitFlashTimer = 0.1;
    this.invincibleTimer = 0.5;
    return true;
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  addGold(amount: number): void {
    this.gold += amount;
  }

  applyItem(item: Item): void {
    switch (item.type) {
      case 'health_potion':
        this.heal(30);
        break;
      case 'attack_ring':
        this.attackPower = this.baseAttack + 5;
        this.activeItems.push({ ...item });
        break;
      case 'speed_boots':
        this.speed = this.baseSpeed * 1.2;
        this.activeItems.push({ ...item });
        break;
      case 'shield':
        this.hasShield = true;
        break;
      case 'gold_bag':
        this.addGold(10);
        break;
    }
  }

  applyPermanentUpgrade(upgrade: PermanentUpgrade): void {
    this.permanentUpgrades.push(upgrade);
    switch (upgrade.type) {
      case 'max_hp':
        this.maxHp += upgrade.value;
        this.hp = Math.min(this.maxHp, this.hp + upgrade.value);
        break;
      case 'attack':
        this.baseAttack += upgrade.value;
        this.attackPower = this.baseAttack;
        break;
      case 'initial_gold':
        this.addGold(upgrade.value);
        break;
    }
  }

  resetTemporaryEffects(): void {
    this.attackPower = this.baseAttack;
    this.speed = this.baseSpeed;
    this.activeItems = [];
  }

  private updateParticles(dt: number): void {
    const time = Date.now() / 1000;
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.angle += p.angularSpeed * dt;
      p.radius += p.expandSpeed * dt;
      return p.life > 0;
    });

    if (this.particles.length < 12) {
      const angle = Math.random() * Math.PI * 2;
      this.particles.push({
        x: this.x,
        y: this.y,
        angle: angle,
        radius: 15,
        life: 1.5,
        maxLife: 1.5,
        angularSpeed: 2,
        expandSpeed: 10,
        color: '#60a5fa',
        size: 2,
      });
    }

    this.particles.forEach((p) => {
      p.x = this.x + Math.cos(p.angle) * p.radius;
      p.y = this.y + Math.sin(p.angle) * p.radius;
    });
  }

  getAttackArea(): AttackArea | null {
    if (!this.isAttacking) return null;
    return {
      x: this.x,
      y: this.y,
      direction: this.direction,
      angle: Math.PI / 3,
      radius: 40,
    };
  }
}

export interface AttackArea {
  x: number;
  y: number;
  direction: number;
  angle: number;
  radius: number;
}

export interface Particle {
  x: number;
  y: number;
  angle: number;
  radius: number;
  life: number;
  maxLife: number;
  angularSpeed: number;
  expandSpeed: number;
  color: string;
  size: number;
}

export interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export type EnemyState = 'idle' | 'patrol' | 'chase';

export class Enemy extends Entity {
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  state: EnemyState = 'idle';
  isBoss: boolean;
  hitFlashTimer: number = 0;
  attackCooldown: number = 0;
  patrolTimer: number = 0;
  patrolDirection: number = 0;
  shootTimer: number = 0;
  knockbackX: number = 0;
  knockbackY: number = 0;
  chaseLingerTimer: number = 0;
  idleTimer: number = 0;
  wallCollisionCount: number = 0;

  constructor(
    id: string,
    x: number,
    y: number,
    isBoss: boolean = false
  ) {
    super(id, x, y, isBoss ? 24 : 16);
    this.isBoss = isBoss;
    if (isBoss) {
      this.maxHp = 200;
      this.hp = 200;
      this.attack = 20;
      this.speed = 80;
    } else {
      this.maxHp = 30;
      this.hp = 30;
      this.attack = 10;
      this.speed = 60;
    }
    this.idleTimer = Math.random() * 2;
    this.patrolDirection = Math.random() * Math.PI * 2;
  }

  update(
    dt: number,
    player: Player,
    room: RoomData,
    bullets: Projectile[]
  ): CollisionEvent | null {
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
    }

    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }

    const distToPlayer = this.distanceTo(player);
    const visionRange = this.isBoss ? 999 : 120;
    const aggroRange = this.isBoss ? 999 : 150;

    switch (this.state) {
      case 'idle':
        this.idleTimer -= dt;
        if (this.idleTimer <= 0) {
          this.state = 'patrol';
          this.patrolTimer = 2 + Math.random() * 2;
          this.patrolDirection = Math.random() * Math.PI * 2;
          this.wallCollisionCount = 0;
        }
        if (distToPlayer < aggroRange) {
          this.state = 'chase';
          this.chaseLingerTimer = 2;
        }
        break;

      case 'patrol':
        this.patrolTimer -= dt;
        if (this.patrolTimer <= 0) {
          this.state = 'idle';
          this.idleTimer = 1 + Math.random() * 2;
          this.vx = 0;
          this.vy = 0;
          break;
        }
        if (distToPlayer < aggroRange) {
          this.state = 'chase';
          this.chaseLingerTimer = 2;
          break;
        }
        this.vx = Math.cos(this.patrolDirection) * this.speed * 0.5;
        this.vy = Math.sin(this.patrolDirection) * this.speed * 0.5;
        break;

      case 'chase':
        if (distToPlayer < visionRange) {
          this.chaseLingerTimer = 2;
        } else {
          this.chaseLingerTimer -= dt;
        }

        if (this.chaseLingerTimer <= 0) {
          this.state = 'idle';
          this.idleTimer = 0.5;
          this.vx = 0;
          this.vy = 0;
          break;
        }

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          this.vx = (dx / len) * this.speed;
          this.vy = (dy / len) * this.speed;
        }
        break;
    }

    if (this.knockbackX !== 0 || this.knockbackY !== 0) {
      this.x += this.knockbackX * dt * 10;
      this.y += this.knockbackY * dt * 10;
      this.knockbackX *= 0.9;
      this.knockbackY *= 0.9;
      if (Math.abs(this.knockbackX) < 0.1) this.knockbackX = 0;
      if (Math.abs(this.knockbackY) < 0.1) this.knockbackY = 0;
    } else if (this.state !== 'idle') {
      const newX = this.x + this.vx * dt;
      const newY = this.y + this.vy * dt;

      let blockedX = false;
      let blockedY = false;

      if (
        isWalkable(room, newX - this.radius / 2, this.y) &&
        isWalkable(room, newX + this.radius / 2, this.y)
      ) {
        this.x = newX;
      } else {
        blockedX = true;
      }
      if (
        isWalkable(room, this.x, newY - this.radius / 2) &&
        isWalkable(room, this.x, newY + this.radius / 2)
      ) {
        this.y = newY;
      } else {
        blockedY = true;
      }

      if (blockedX || blockedY) {
        this.wallCollisionCount++;
        if (this.state === 'patrol') {
          if (this.wallCollisionCount > 8) {
            this.state = 'idle';
            this.idleTimer = 1;
            this.vx = 0;
            this.vy = 0;
            this.wallCollisionCount = 0;
          } else if (this.wallCollisionCount > 4) {
            this.patrolDirection = Math.random() * Math.PI * 2;
          } else {
            if (blockedX && blockedY) {
              this.patrolDirection += Math.PI;
            } else if (blockedX) {
              this.patrolDirection = Math.PI - this.patrolDirection;
            } else {
              this.patrolDirection = -this.patrolDirection;
            }
          }
        }
        if (this.state === 'chase' && this.wallCollisionCount > 10) {
          this.state = 'idle';
          this.idleTimer = 0.8;
          this.vx = 0;
          this.vy = 0;
          this.wallCollisionCount = 0;
        }
      } else {
        this.wallCollisionCount = 0;
      }
    }

    if (this.isBoss) {
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        this.shootTimer = 3;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const angle = Math.atan2(dy, dx);
        bullets.push(
          new Projectile(
            `bullet_${Date.now()}_${Math.random()}`,
            this.x,
            this.y,
            angle,
            300,
            this.attack
          )
        );
      }
    }

    if (distToPlayer < this.radius + player.radius && this.attackCooldown <= 0) {
      this.attackCooldown = 0.5;
      return {
        type: 'player_hit',
        damage: this.attack,
      };
    }

    return null;
  }

  takeDamage(damage: number, attackDirection: number): Debris[] | null {
    this.hp -= damage;
    this.hitFlashTimer = 0.1;
    this.knockbackX = Math.cos(attackDirection) * 15;
    this.knockbackY = Math.sin(attackDirection) * 15;

    if (this.hp <= 0) {
      const debris: Debris[] = [];
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const speed = 100 + Math.random() * 70;
        debris.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.3,
          maxLife: 0.3,
          color: this.isBoss ? '#22c55e' : '#ef4444',
          size: 6,
        });
      }
      return debris;
    }
    return null;
  }

  checkHitByAttack(attackArea: AttackArea): boolean {
    const dx = this.x - attackArea.x;
    const dy = this.y - attackArea.y;
    const distSq = dx * dx + dy * dy;
    const combinedRadius = attackArea.radius + this.radius;

    if (distSq > combinedRadius * combinedRadius) return false;

    const dist = Math.sqrt(distSq);
    if (dist < 0.001) return true;

    const halfAngle = attackArea.angle / 2;
    const dirX = Math.cos(attackArea.direction);
    const dirY = Math.sin(attackArea.direction);

    const dot = dx * dirX + dy * dirY;

    if (dot < 0 && dist > this.radius) return false;

    let effectiveHalfAngle = halfAngle;
    if (dist > this.radius) {
      effectiveHalfAngle = halfAngle + Math.asin(this.radius / dist);
    } else {
      effectiveHalfAngle = Math.PI;
    }

    const cosEffective = Math.cos(effectiveHalfAngle);
    if (dot >= dist * cosEffective) return true;

    return false;
  }
}

export class Projectile extends Entity {
  angle: number;
  speed: number;
  damage: number;
  life: number = 5;
  targetX: number;
  targetY: number;

  constructor(
    id: string,
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number
  ) {
    super(id, x, y, 4);
    this.angle = angle;
    this.speed = speed;
    this.damage = damage;
    this.targetX = x + Math.cos(angle) * 1000;
    this.targetY = y + Math.sin(angle) * 1000;
  }

  update(dt: number, player: Player, room: RoomData): boolean {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const targetAngle = Math.atan2(dy, dx);

    let angleDiff = targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    this.angle += angleDiff * 0.02;

    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.life -= dt;

    if (
      !isWalkable(room, this.x, this.y) ||
      this.life <= 0
    ) {
      return false;
    }

    const distToPlayer = Math.sqrt(
      Math.pow(this.x - player.x, 2) + Math.pow(this.y - player.y, 2)
    );
    return distToPlayer > this.radius + player.radius;
  }
}

export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  attack: boolean;
}

export function generateRandomItems(count: number = 3): Item[] {
  const types: ItemType[] = ['health_potion', 'attack_ring', 'speed_boots', 'shield', 'gold_bag'];
  const items: Item[] = [];
  const usedTypes = new Set<ItemType>();

  while (items.length < count && usedTypes.size < types.length) {
    const availableTypes = types.filter((t) => !usedTypes.has(t));
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    usedTypes.add(type);
    items.push({
      ...ITEM_TEMPLATES[type],
      id: `item_${Date.now()}_${Math.random()}`,
    });
  }

  return items;
}

export function generateRandomUpgrade(): PermanentUpgrade {
  const types: PermanentUpgradeType[] = ['max_hp', 'attack', 'initial_gold'];
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    ...PERMANENT_UPGRADE_TEMPLATES[type],
    id: `upgrade_${Date.now()}_${Math.random()}`,
  };
}

import { generateFloor, RoomData, FloorData, TILE_WALL, TILE_FLOOR, TILE_PORTAL, TILE_KEY } from './RoomGenerator';
import { SpellSystem, SpellType } from './SpellSystem';
import { Renderer } from './Renderer';

export interface Monster {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  alive: boolean;
  slowTimer: number;
  attackCooldown: number;
  spawnX: number;
  spawnY: number;
  bobPhase: number;
}

export interface Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  fragments: number;
  hasKey: boolean;
  invulnTimer: number;
}

export interface GameState {
  player: Player;
  currentRoom: number;
  floorNumber: number;
  floor: FloorData;
  monsters: Monster[];
  spellSystem: SpellSystem;
  selectedSpell: SpellType;
  gameover: boolean;
  victory: boolean;
}

export type StateChangeCallback = (state: GameState) => void;

export class GameEngine {
  renderer: Renderer;
  state!: GameState;
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private keys: Set<string> = new Set();
  private mouseX: number = 0;
  private mouseY: number = 0;
  private tileSize: number = 40;
  private stateListeners: StateChangeCallback[] = [];
  private nextMonsterId: number = 0;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.initFloor(1);
    this.setupInput();
  }

  private initFloor(floorNumber: number): void {
    const floor = generateFloor(floorNumber);
    this.nextMonsterId = 0;
    this.state = {
      player: {
        x: 0, y: 0, hp: 100, maxHp: 100,
        speed: 180, fragments: this.state?.player?.fragments || 0,
        hasKey: false, invulnTimer: 0,
      },
      currentRoom: 0,
      floorNumber,
      floor,
      monsters: [],
      spellSystem: this.state?.spellSystem || new SpellSystem(),
      selectedSpell: 'fireball',
      gameover: false,
      victory: false,
    };
    this.loadRoom(0);
  }

  private loadRoom(roomIndex: number): void {
    const room = this.state.floor.rooms[roomIndex];
    this.state.currentRoom = roomIndex;
    this.state.monsters = [];
    this.nextMonsterId = 0;

    this.state.player.x = room.playerSpawn.x * this.tileSize + this.tileSize / 2;
    this.state.player.y = room.playerSpawn.y * this.tileSize + this.tileSize / 2;

    for (const sp of room.monsterSpawns) {
      this.state.monsters.push({
        id: this.nextMonsterId++,
        x: sp.x * this.tileSize + this.tileSize / 2,
        y: sp.y * this.tileSize + this.tileSize / 2,
        hp: 30 + this.state.floorNumber * 10,
        maxHp: 30 + this.state.floorNumber * 10,
        speed: 60 + this.state.floorNumber * 5,
        alive: true,
        slowTimer: 0,
        attackCooldown: 0,
        spawnX: sp.x,
        spawnY: sp.y,
        bobPhase: Math.random() * Math.PI * 2,
      });
    }

    this.notifyListeners();
  }

  onStateChange(cb: StateChangeCallback): () => void {
    this.stateListeners.push(cb);
    return () => {
      const i = this.stateListeners.indexOf(cb);
      if (i >= 0) this.stateListeners.splice(i, 1);
    };
  }

  private notifyListeners(): void {
    for (const cb of this.stateListeners) {
      cb(this.state);
    }
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key === '1') this.state.selectedSpell = 'fireball';
      if (e.key === '2') this.state.selectedSpell = 'icespike';
      if (e.key === '3') this.state.selectedSpell = 'teleport';
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    window.addEventListener('mousemove', (e) => {
      const canvas = this.renderer.canvas;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.castSpell();
    });
  }

  private castSpell(): void {
    if (this.state.gameover || this.state.victory) return;
    const now = performance.now();
    const p = this.state.player;
    const spell = this.state.spellSystem;

    const proj = spell.cast(this.state.selectedSpell, p.x, p.y, this.mouseX, this.mouseY, now);
    if (!proj) return;

    if (this.state.selectedSpell === 'teleport') {
      const room = this.getCurrentRoom();
      const tx = Math.floor(proj.x / this.tileSize);
      const ty = Math.floor(proj.y / this.tileSize);
      if (tx > 0 && tx < room.width - 1 && ty > 0 && ty < room.height - 1 &&
          room.tiles[ty][tx] !== TILE_WALL) {
        this.spawnParticles(p.x, p.y, '#cc66ff', 20);
        p.x = proj.x;
        p.y = proj.y;
        this.spawnParticles(p.x, p.y, '#cc66ff', 20);
      }
      proj.alive = false;
    } else {
      spell.addProjectile(proj);
      this.spawnParticles(p.x, p.y,
        this.state.selectedSpell === 'fireball' ? '#ff6622' : '#aaddff', 5);
    }
  }

  private getCurrentRoom(): RoomData {
    return this.state.floor.rooms[this.state.currentRoom];
  }

  private isWall(px: number, py: number): boolean {
    const room = this.getCurrentRoom();
    const tx = Math.floor(px / this.tileSize);
    const ty = Math.floor(py / this.tileSize);
    if (tx < 0 || tx >= room.width || ty < 0 || ty >= room.height) return true;
    return room.tiles[ty][tx] === TILE_WALL;
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop = (time: number): void => {
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    if (!this.state.gameover && !this.state.victory) {
      this.update(dt);
    }

    this.renderer.render(this.state, this.tileSize, this.mouseX, this.mouseY);
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.updatePlayer(dt);
    this.updateMonsters(dt);
    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.checkPickups();
    this.notifyListeners();
  }

  private updatePlayer(dt: number): void {
    const p = this.state.player;
    let dx = 0, dy = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len; dy /= len;
      const nx = p.x + dx * p.speed * dt;
      const ny = p.y + dy * p.speed * dt;
      const r = 12;

      if (!this.isWall(nx - r, p.y - r) && !this.isWall(nx + r, p.y - r) &&
          !this.isWall(nx - r, p.y + r) && !this.isWall(nx + r, p.y + r)) {
        p.x = nx;
      }
      if (!this.isWall(p.x - r, ny - r) && !this.isWall(p.x + r, ny - r) &&
          !this.isWall(p.x - r, ny + r) && !this.isWall(p.x + r, ny + r)) {
        p.y = ny;
      }
    }

    if (p.invulnTimer > 0) p.invulnTimer -= dt;
  }

  private updateMonsters(dt: number): void {
    const p = this.state.player;
    for (const m of this.state.monsters) {
      if (!m.alive) continue;

      m.bobPhase += dt * 3;

      if (m.slowTimer > 0) m.slowTimer -= dt;
      const speedMult = m.slowTimer > 0 ? 0.3 : 1;

      const dx = p.x - m.x;
      const dy = p.y - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 20 && dist > 0) {
        const mx = m.x + (dx / dist) * m.speed * speedMult * dt;
        const my = m.y + (dy / dist) * m.speed * speedMult * dt;
        if (!this.isWall(mx, m.y)) m.x = mx;
        if (!this.isWall(m.x, my)) m.y = my;
      }

      if (dist < 30 && m.attackCooldown <= 0) {
        if (p.invulnTimer <= 0) {
          p.hp -= 10;
          p.invulnTimer = 1.0;
          this.spawnParticles(p.x, p.y, '#ff3333', 8);
          if (p.hp <= 0) {
            p.hp = 0;
            this.state.gameover = true;
            this.spawnParticles(p.x, p.y, '#ff0000', 40);
          }
        }
        m.attackCooldown = 1.5;
      }
      if (m.attackCooldown > 0) m.attackCooldown -= dt;
    }
  }

  private updateProjectiles(dt: number): void {
    const spellSys = this.state.spellSystem;
    const now = performance.now();

    spellSys.update(dt);

    const projectiles = spellSys.getActiveProjectiles();
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];

      if (proj.type !== 'teleport') {
        if (this.isWall(proj.x, proj.y)) {
          this.spawnParticles(proj.x, proj.y,
            proj.type === 'fireball' ? '#ff6622' : '#aaddff', 10);
          spellSys.removeProjectile(i);
          continue;
        }
      }

      for (const m of this.state.monsters) {
        if (!m.alive || proj.hitMonsters.has(m.id)) continue;
        const dx = proj.x - m.x;
        const dy = proj.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 20) {
          m.hp -= proj.damage;
          if (proj.slowDuration > 0) m.slowTimer = proj.slowDuration;
          proj.hitMonsters.add(m.id);

          this.spawnParticles(m.x, m.y,
            proj.type === 'fireball' ? '#ff8844' : '#88ccff', 6);

          if (m.hp <= 0) {
            m.alive = false;
            this.state.player.fragments++;
            this.spawnParticles(m.x, m.y, '#44ffaa', 25);
            this.spawnParticles(m.x, m.y, '#aaffcc', 15);
          }

          if (!proj.piercing) {
            spellSys.removeProjectile(i);
            break;
          }
        }
      }
    }
  }

  private checkPickups(): void {
    const p = this.state.player;
    const room = this.getCurrentRoom();
    const tx = Math.floor(p.x / this.tileSize);
    const ty = Math.floor(p.y / this.tileSize);

    if (tx >= 0 && tx < room.width && ty >= 0 && ty < room.height) {
      if (room.tiles[ty][tx] === TILE_KEY) {
        room.tiles[ty][tx] = TILE_FLOOR;
        p.hasKey = true;
        this.spawnParticles(p.x, p.y, '#ffdd44', 20);
      }

      if (room.tiles[ty][tx] === TILE_PORTAL && p.hasKey) {
        if (this.state.currentRoom < this.state.floor.roomCount - 1) {
          p.hasKey = false;
          this.loadRoom(this.state.currentRoom + 1);
        } else {
          p.hasKey = false;
          this.initFloor(this.state.floorNumber + 1);
        }
      }
    }
  }

  spawnParticles(x: number, y: number, color: string, count: number): void {
    this.renderer.spawnParticles(x, y, color, count);
  }

  private updateParticles(dt: number): void {
    this.renderer.updateParticles(dt);
  }

  selectSpell(spell: SpellType): void {
    this.state.selectedSpell = spell;
  }

  upgradeSpell(spell: SpellType): boolean {
    const p = this.state.player;
    if (p.fragments < 5) return false;
    if (!this.state.spellSystem.upgrade(spell)) return false;
    p.fragments -= 5;
    this.notifyListeners();
    return true;
  }

  restart(): void {
    this.initFloor(1);
    this.state.player.fragments = 0;
    this.state.spellSystem = new SpellSystem();
  }
}

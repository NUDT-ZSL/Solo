import { GameMap, Vec2 } from './map';
import {
  Player, Zombie, ZombieType,
  createPlayer, createZombie, updatePlayer, updateZombie,
  checkPlayerZombieAttack,
} from './entities';
import { Trap, TrapType, TRAP_CONFIG, createTrap } from './trap';
import { Particle, render, GameStateUI } from './renderer';

type GameState = 'menu' | 'playing' | 'gameover';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState = 'menu';

  private map!: GameMap;
  private player!: Player;
  private zombies: Zombie[] = [];
  private traps: Trap[] = [];
  private particles: Particle[] = [];

  private resources: number = 100;
  private killCount: number = 0;
  private surviveTime: number = 0;
  private lastResourceTick: number = 0;
  private waveTimer: number = 0;
  private waveInterval: number = 10000;
  private waveGeneratorId: number | null = null;
  private waveCount: number = 0;

  private selectedTrap: TrapType | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;

  private startButton = { x: 0, y: 0, w: 160, h: 50, hover: false };
  private trapButtons: Array<{ type: TrapType; x: number; y: number; w: number; h: number; hover: boolean }> = [];

  private lastTime: number = 0;
  private animationFrameId: number | null = null;

  private resourceAnimTime: number = 0;
  private lastResourceDelta: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.resizeCanvas();
    this.initMap();
    this.initTrapButtons();
    this.bindEvents();
  }

  private initMap(): void {
    this.map = new GameMap(this.canvas.width, this.canvas.height);
  }

  private initTrapButtons(): void {
    const types: TrapType[] = ['spike', 'mine', 'slow', 'fence'];
    const btnW = 60;
    const btnH = 50;
    const gap = 8;
    const padding = 10;
    const totalW = types.length * btnW + (types.length - 1) * gap + padding * 2;
    const totalH = btnH + padding * 2;
    const px = this.map.width - totalW - 12;
    const py = this.map.height - totalH - 12;
    this.trapButtons = types.map((type, i) => ({
      type,
      x: px + padding + i * (btnW + gap),
      y: py + padding,
      w: btnW,
      h: btnH,
      hover: false,
    }));
  }

  private resizeCanvas(): void {
    const minW = 800;
    const minH = 600;
    let w = Math.max(window.innerWidth, minW);
    let h = Math.max(window.innerHeight, minH);
    this.canvas.width = w;
    this.canvas.height = h;
  }

  private initGame(): void {
    this.player = createPlayer(this.map.width / 2, this.map.height * 0.8);
    this.zombies = [];
    this.traps = [];
    this.particles = [];
    this.resources = 100;
    this.killCount = 0;
    this.surviveTime = 0;
    this.lastResourceTick = performance.now();
    this.waveTimer = 0;
    this.waveCount = 0;
    this.selectedTrap = null;

    for (let i = 0; i < 2; i++) {
      this.spawnWave();
    }

    if (this.waveGeneratorId !== null) {
      window.clearInterval(this.waveGeneratorId);
    }
    this.waveGeneratorId = window.setInterval(() => {
      if (this.state === 'playing') {
        this.spawnWave();
      }
    }, this.waveInterval);
  }

  private spawnWave(): void {
    this.waveCount++;
    const baseCount = 5;
    const maxExtra = 5 + Math.min(this.waveCount * 2, 15);
    const count = baseCount + Math.floor(Math.random() * maxExtra);
    const speedMultiplier = 1 + (this.waveCount - 1) * 0.05;


    const types: ZombieType[] = ['normal', 'fast', 'giant'];
    const weights = [0.6, 0.3, 0.1];

    for (let i = 0; i < count; i++) {
      const edge = Math.floor(Math.random() * 4);
      let x = 0, y = 0;

      switch (edge) {
        case 0:
          x = Math.random() * this.map.width;
          y = -20;
          break;
        case 1:
          x = this.map.width + 20;
          y = Math.random() * this.map.height;
          break;
        case 2:
          x = Math.random() * this.map.width;
          y = this.map.height + 20;
          break;
        case 3:
          x = -20;
          y = Math.random() * this.map.height;
          break;
      }

      const r = Math.random();
      let ztype: ZombieType = 'normal';
      let acc = 0;
      for (let j = 0; j < types.length; j++) {
        acc += weights[j];
        if (r < acc) {
          ztype = types[j];
          break;
        }
      }

      const zombie = createZombie(ztype, x, y);
      zombie.speed = Math.floor(zombie.speed * speedMultiplier);
      this.zombies.push(zombie);
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.selectedTrap = null;
    });
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('resize', () => this.handleResize());
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;

    this.startButton.hover = this.pointInRect(
      this.mouseX, this.mouseY,
      this.startButton.x, this.startButton.y,
      this.startButton.w, this.startButton.h
    );

    for (const btn of this.trapButtons) {
      btn.hover = this.pointInRect(this.mouseX, this.mouseY, btn.x, btn.y, btn.w, btn.h);
    }
  }

  private handleClick(e: MouseEvent): void {
    if (this.state === 'menu' || this.state === 'gameover') {
      if (this.pointInRect(this.mouseX, this.mouseY, this.startButton.x, this.startButton.y, this.startButton.w, this.startButton.h)) {
        this.startGame();
      }
      return;
    }

    if (this.state !== 'playing') return;

    for (const btn of this.trapButtons) {
      if (this.pointInRect(this.mouseX, this.mouseY, btn.x, btn.y, btn.w, btn.h)) {
        this.selectedTrap = this.selectedTrap === btn.type ? null : btn.type;
        return;
      }
    }

    if (this.selectedTrap) {
      this.tryPlaceTrap(this.mouseX, this.mouseY);
    } else {
      this.player.targetX = this.mouseX;
      this.player.targetY = this.mouseY;
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.state !== 'playing') return;
    const keyMap: Record<string, TrapType> = { '1': 'spike', '2': 'mine', '3': 'slow', '4': 'fence' };
    const type = keyMap[e.key];
    if (type) {
      this.selectedTrap = this.selectedTrap === type ? null : type;
    }
    if (e.key === 'Escape') {
      this.selectedTrap = null;
    }
  }

  private handleResize(): void {
    this.resizeCanvas();
    if (this.map) {
      this.map.width = this.canvas.width;
      this.map.height = this.canvas.height;
      this.map.cols = Math.floor(this.map.width / this.map.cellSize);
      this.map.rows = Math.floor(this.map.height / this.map.cellSize);
      this.map.obstacles = [];
      (this.map as any).generateObstacles();
      this.map.updateGrid();
    }
    this.initTrapButtons();
  }

  private pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  private tryPlaceTrap(x: number, y: number): boolean {
    if (!this.selectedTrap) return false;
    const config = TRAP_CONFIG[this.selectedTrap];
    if (this.resources < config.cost) return false;
    if (!Trap.canPlace(this.selectedTrap, x, y, this.map, this.traps)) return false;
    this.resources -= config.cost;
    this.traps.push(createTrap(this.selectedTrap, x, y));
    this.resourceAnimTime = 0.3;
    this.lastResourceDelta = -config.cost;
    return true;
  }

  startGame(): void {
    this.state = 'playing';
    this.initGame();
    if (!this.animationFrameId) {
      this.lastTime = performance.now();
      this.loop();
    }
  }

  private loop = (): void => {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    this.lastTime = now;

    if (this.state === 'playing') {
      this.update(dt, now);
    }

    this.render();
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number, now: number): void {
    this.surviveTime += dt;

    if (now - this.lastResourceTick > 5000) {
      this.resources += 2;
      this.lastResourceTick = now;
      this.resourceAnimTime = 0.3;
      this.lastResourceDelta = 2;
    }

    if (this.resourceAnimTime > 0) {
      this.resourceAnimTime -= dt;
    }

    if (this.player.damageAnimTime > 0) {
      this.player.damageAnimTime -= dt;
    }

    updatePlayer(this.player, this.zombies, dt, this.map);

    for (const zombie of this.zombies) {
      updateZombie(zombie, this.player.x, this.player.y, dt, this.map, now);
    }

    for (const zombie of this.zombies) {
      const dist = Math.hypot(zombie.x - this.player.x, zombie.y - this.player.y);
      if (dist < 15 + zombie.radius) {
        if (now - zombie.lastAttackTime >= 1000) {
          zombie.lastAttackTime = now;
          this.player.health -= 10;
          this.player.lastDamageValue = 10;
          this.player.damageAnimTime = 0.3;
        }
      }
    }

    for (const trap of this.traps) {
      if (trap.active) {
        trap.update(this.zombies, dt, now);
      }
    }

    this.traps = this.traps.filter(t => t.active);

    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      if (z.health <= 0) {
        this.spawnDeathParticles(z);
        const drop = 5 + Math.floor(Math.random() * 11);
        this.resources += drop;
        this.killCount++;
        this.resourceAnimTime = 0.3;
        this.lastResourceDelta = drop;
        this.zombies.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > 300) {
      this.particles.splice(0, this.particles.length - 300);
    }

    if (this.player.health <= 0) {
      this.state = 'gameover';
      if (this.waveGeneratorId !== null) {
        window.clearInterval(this.waveGeneratorId);
        this.waveGeneratorId = null;
      }
    }
  }

  private spawnDeathParticles(zombie: Zombie): void {
    const count = 8 + Math.floor(Math.random() * 8);
    const colors = [zombie.color, '#fff', '#f44336', '#ff9800', '#9e9e9e'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        x: zombie.x,
        y: zombie.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4,
        maxLife: 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 3,
      });
    }
  }

  private render(): void {
    if (this.state === 'menu') {
      this.startButton.x = this.map.width / 2 - this.startButton.w / 2;
      this.startButton.y = this.map.height / 2 + 80;
    } else if (this.state === 'gameover') {
      this.startButton.x = this.map.width / 2 - this.startButton.w / 2;
      this.startButton.y = this.map.height / 2 + 140;
    }

    const ui: GameStateUI = {
      state: this.state,
      player: this.player,
      zombies: this.zombies,
      traps: this.traps,
      map: this.map,
      particles: this.particles,
      resources: this.resources,
      killCount: this.killCount,
      surviveTime: this.surviveTime,
      selectedTrap: this.selectedTrap,
      startButton: this.startButton,
      trapButtons: this.trapButtons,
      mouseX: this.mouseX,
      mouseY: this.mouseY,
    };

    render(this.ctx, ui);
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.waveGeneratorId !== null) {
      window.clearInterval(this.waveGeneratorId);
    }
  }
}

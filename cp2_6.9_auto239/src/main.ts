import {
  Submarine,
  Cruiser,
  SonarWave,
  Torpedo,
  Decoy
} from './entities';
import { Renderer, GameState } from './renderer';

const TOTAL_WAVES = 6;

class Game {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  keys: Set<string> = new Set();
  submarine!: Submarine;
  cruisers: Cruiser[] = [];
  sonarWaves: SonarWave[] = [];
  torpedoes: Torpedo[] = [];
  decoys: Decoy[] = [];
  state: GameState = 'playing';
  wave: number = 1;
  score: number = 0;
  cruiserSpawnTimer: number = 0;
  cruiserSpawnInterval: number = 0;
  cruisersSpawnedInWave: number = 0;
  cruisersPerWave: number = 0;
  waveTransitionTimer: number = 0;
  inWaveTransition: boolean = false;
  lastTime: number = 0;
  decoyCooldown: number = 0;
  running: boolean = true;

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.init();
    this.bindEvents();
  }

  init() {
    const w = this.renderer.width;
    const h = this.renderer.height;
    this.submarine = new Submarine(w / 2, h * 0.7);
    this.cruisers = [];
    this.sonarWaves = [];
    this.torpedoes = [];
    this.decoys = [];
    this.state = 'playing';
    this.wave = 1;
    this.score = 0;
    this.cruiserSpawnTimer = 0;
    this.cruisersSpawnedInWave = 0;
    this.cruisersPerWave = this.getCruisersPerWave(this.wave);
    this.cruiserSpawnInterval = this.getCruiserSpawnInterval();
    this.waveTransitionTimer = 0;
    this.inWaveTransition = false;
    this.decoyCooldown = 0;
    this.renderer.resetAnimations();
  }

  getCruisersPerWave(wave: number): number {
    return Math.min(1 + Math.floor((wave - 1) * 0.5), 3);
  }

  getCruiserSpawnInterval(): number {
    return 8 + Math.random() * 4;
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key);
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.releaseDecoy();
      }
      if (e.key === 'r' || e.key === 'R') {
        this.restart();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });

    window.addEventListener('resize', () => {
      this.renderer.resize();
    });

    this.canvas.addEventListener('click', (e) => {
      const w = this.renderer.width;
      const h = this.renderer.height;
      const btnWidth = 140;
      const btnHeight = 44;
      const x = w / 2 - btnWidth / 2;
      const y = h - 70;
      if (e.clientX >= x && e.clientX <= x + btnWidth &&
          e.clientY >= y && e.clientY <= y + btnHeight) {
        this.restart();
      }
    });
  }

  restart() {
    this.init();
  }

  releaseDecoy() {
    if (this.state !== 'playing') return;
    if (this.decoyCooldown > 0) return;
    this.decoys.push(new Decoy(this.submarine.x, this.submarine.y));
    this.decoyCooldown = 2;
  }

  update(deltaTime: number) {
    if (this.state !== 'playing') return;

    this.submarine.update(this.keys, this.renderer.width, this.renderer.height, deltaTime);

    this.decoyCooldown = Math.max(0, this.decoyCooldown - deltaTime);

    for (const decoy of this.decoys) {
      decoy.update(deltaTime);
    }
    this.decoys = this.decoys.filter(d => d.active);

    if (this.inWaveTransition) {
      this.waveTransitionTimer -= deltaTime;
      if (this.waveTransitionTimer <= 0) {
        this.inWaveTransition = false;
        this.cruisersSpawnedInWave = 0;
        this.cruisersPerWave = this.getCruisersPerWave(this.wave);
        this.cruiserSpawnInterval = this.getCruiserSpawnInterval();
      }
    } else {
      if (this.cruisersSpawnedInWave < this.cruisersPerWave) {
        this.cruiserSpawnTimer += deltaTime;
        if (this.cruiserSpawnTimer >= this.cruiserSpawnInterval) {
          this.cruiserSpawnTimer = 0;
          this.cruiserSpawnInterval = this.getCruiserSpawnInterval();
          this.cruisers.push(new Cruiser(this.renderer.width, this.renderer.height, this.wave));
          this.cruisersSpawnedInWave++;
        }
      } else if (this.cruisers.length === 0) {
        if (this.wave >= TOTAL_WAVES) {
          this.state = 'victory';
        } else {
          this.wave++;
          this.score += 100 * (this.wave - 1);
          this.inWaveTransition = true;
          this.waveTransitionTimer = 3;
        }
      }
    }

    for (const cruiser of this.cruisers) {
      const sonarWave = cruiser.update(
        this.renderer.width,
        this.renderer.height,
        deltaTime,
        this.submarine
      );
      if (sonarWave) {
        this.sonarWaves.push(sonarWave);
      }
      if (cruiser.canFireTorpedo(deltaTime)) {
        const dx = this.submarine.x - cruiser.x;
        const dy = this.submarine.y - cruiser.y;
        const angle = Math.atan2(dy, dx);
        this.torpedoes.push(new Torpedo(cruiser.x, cruiser.y, angle));
      }
    }
    this.cruisers = this.cruisers.filter(c => c.active);

    for (const wave of this.sonarWaves) {
      const result = wave.update(deltaTime, this.submarine, this.renderer.height);
      if (result.hit) {
        this.submarine.triggerExpose();
        const dead = this.submarine.takeDamage();
        if (dead) {
          this.state = 'defeat';
        }
      }
    }
    this.sonarWaves = this.sonarWaves.filter(w => w.active);

    for (const torpedo of this.torpedoes) {
      torpedo.update(
        { x: this.submarine.x, y: this.submarine.y },
        this.decoys,
        this.renderer.width,
        this.renderer.height,
        deltaTime
      );
      if (torpedo.checkCollision(this.submarine)) {
        torpedo.active = false;
        this.submarine.triggerExpose();
        const dead = this.submarine.takeDamage();
        if (dead) {
          this.state = 'defeat';
        }
      }
    }
    this.torpedoes = this.torpedoes.filter(t => t.active);
  }

  render(deltaTime: number) {
    this.renderer.clear();
    this.renderer.drawBackground();
    this.renderer.drawWaterWaves(deltaTime);

    for (const decoy of this.decoys) {
      this.renderer.drawDecoy(decoy);
    }

    for (const wave of this.sonarWaves) {
      this.renderer.drawSonarWave(wave);
    }

    for (const cruiser of this.cruisers) {
      this.renderer.drawCruiser(cruiser);
    }

    for (const torpedo of this.torpedoes) {
      this.renderer.drawTorpedo(torpedo);
    }

    this.renderer.drawSubmarine(this.submarine);

    this.renderer.drawRedFlash(deltaTime, this.submarine.exposed);

    this.renderer.drawUI(
      this.submarine.health,
      this.submarine.maxHealth,
      this.wave,
      TOTAL_WAVES,
      this.score
    );

    this.renderer.drawInstructions();

    if (this.state === 'playing') {
      this.renderer.drawRestartButton();
    }

    if (this.state === 'victory') {
      this.renderer.drawVictoryScreen(deltaTime);
    }

    if (this.state === 'defeat') {
      this.renderer.drawDefeatScreen(deltaTime);
    }
  }

  loop(currentTime: number) {
    if (!this.running) return;
    if (!this.lastTime) this.lastTime = currentTime;
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render(deltaTime);

    requestAnimationFrame((t) => this.loop(t));
  }

  start() {
    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});

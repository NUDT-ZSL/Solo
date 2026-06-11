import { Dice } from './dice';
import { Stats, ComboInfo } from './stats';
import confetti from 'canvas-confetti';

type GameState = 'idle' | 'rolling' | 'settling';

interface NebulaParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

const MAX_NEBULA_PARTICLES = 180;
const ROLL_DURATION = 1.8;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private statsCanvas: HTMLCanvasElement;
  private statsCtx: CanvasRenderingContext2D;
  
  private dice: Dice[] = [];
  private stats: Stats;
  private gameState: GameState = 'idle';
  
  private nebulaParticles: NebulaParticle[] = [];
  private width: number = 0;
  private height: number = 0;
  
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 0;
  
  private rollBtn: HTMLButtonElement;
  private resultDisplay: HTMLElement;
  private comboNameEl: HTMLElement;
  private comboScoreEl: HTMLElement;
  private fpsCounter: HTMLElement;
  private statsPanel: HTMLElement;
  private statsToggle: HTMLElement;
  private totalGamesEl: HTMLElement;
  private totalScoreEl: HTMLElement;
  private highScoreEl: HTMLElement;
  private colorPickers: HTMLInputElement[] = [];
  
  private animationId: number = 0;
  private resultTimeout?: number;
  private resultShockwaves: { radius: number; alpha: number; maxRadius: number }[] = [];
  private buttonAnimating: boolean = false;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.statsCanvas = document.getElementById('stats-canvas') as HTMLCanvasElement;
    this.statsCtx = this.statsCanvas.getContext('2d')!;
    
    this.rollBtn = document.getElementById('roll-btn') as HTMLButtonElement;
    this.resultDisplay = document.getElementById('result-display') as HTMLElement;
    this.comboNameEl = document.getElementById('combo-name') as HTMLElement;
    this.comboScoreEl = document.getElementById('combo-score') as HTMLElement;
    this.fpsCounter = document.getElementById('fps-counter') as HTMLElement;
    this.statsPanel = document.getElementById('stats-panel') as HTMLElement;
    this.statsToggle = document.getElementById('stats-toggle') as HTMLElement;
    this.totalGamesEl = document.getElementById('total-games') as HTMLElement;
    this.totalScoreEl = document.getElementById('total-score') as HTMLElement;
    this.highScoreEl = document.getElementById('high-score') as HTMLElement;
    
    this.colorPickers = [
      document.getElementById('color1') as HTMLInputElement,
      document.getElementById('color2') as HTMLInputElement,
      document.getElementById('color3') as HTMLInputElement,
    ];
    
    this.stats = new Stats();
    
    this.init();
  }

  private init(): void {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    this.initNebulaParticles();
    this.initDice();
    this.bindEvents();
    this.updateStatsUI();
    
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
    
    this.updateDicePositions();
  }

  private initNebulaParticles(): void {
    this.nebulaParticles = [];
    for (let i = 0; i < MAX_NEBULA_PARTICLES; i++) {
      this.nebulaParticles.push(this.createNebulaParticle());
    }
  }

  private createNebulaParticle(): NebulaParticle {
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.5 + 0.2,
      twinkleSpeed: Math.random() * 2 + 1,
      twinklePhase: Math.random() * Math.PI * 2,
    };
  }

  private initDice(): void {
    const colors = this.colorPickers.map(p => p.value);
    const centerY = this.height * 0.45;
    const spacing = Math.min(140, this.width / 4);
    const startX = this.width / 2 - spacing;
    const diceSize = Math.min(70, this.width / 8);
    
    this.dice = colors.map((color, i) => {
      return new Dice(
        startX + i * spacing,
        centerY,
        diceSize,
        color
      );
    });
  }

  private updateDicePositions(): void {
    const centerY = this.height * 0.45;
    const spacing = Math.min(140, this.width / 4);
    const startX = this.width / 2 - spacing;
    const diceSize = Math.min(70, this.width / 8);
    
    this.dice.forEach((die, i) => {
      die.setPosition(startX + i * spacing, centerY);
      die.size = diceSize;
    });
  }

  private bindEvents(): void {
    this.rollBtn.addEventListener('click', () => {
      this.triggerButtonBounce();
      this.rollDice();
    });
    
    this.colorPickers.forEach((picker, i) => {
      picker.addEventListener('input', (e) => {
        const color = (e.target as HTMLInputElement).value;
        if (this.dice[i]) {
          this.dice[i].setColor(color);
        }
      });
    });
    
    this.statsToggle.addEventListener('click', () => {
      this.stats.togglePanel();
      if (this.stats.isPanelMinimized()) {
        this.statsPanel.classList.add('minimized');
        this.statsToggle.textContent = '›';
      } else {
        this.statsPanel.classList.remove('minimized');
        this.statsToggle.textContent = '‹';
      }
    });
  }

  private triggerButtonBounce(): void {
    if (this.buttonAnimating) return;
    this.buttonAnimating = true;
    
    const startTime = performance.now();
    const duration = 300;
    
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      let scale: number;
      if (progress < 0.3) {
        scale = 1 - (progress / 0.3) * 0.1;
      } else if (progress < 0.6) {
        scale = 0.9 + ((progress - 0.3) / 0.3) * 0.2;
      } else {
        scale = 1.1 - ((progress - 0.6) / 0.4) * 0.1;
      }
      
      this.rollBtn.style.transform = `scale(${scale})`;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.rollBtn.style.transform = '';
        this.buttonAnimating = false;
      }
    };
    
    requestAnimationFrame(animate);
  }

  private async rollDice(): Promise<void> {
    if (this.gameState !== 'idle') return;
    
    this.gameState = 'rolling';
    this.rollBtn.disabled = true;
    this.resultDisplay.classList.remove('show');
    
    const values: [number, number, number] = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
    ];
    
    const rollPromises = this.dice.map((die, i) => 
      die.roll(values[i], ROLL_DURATION)
    );
    
    await Promise.all(rollPromises);
    
    this.gameState = 'settling';
    
    const combo = Stats.evaluateCombo(values);
    this.showResult(combo);
    this.stats.addResult(values, combo.score, combo);
    this.updateStatsUI();
    
    if (combo.type === 'triple') {
      this.triggerConfetti();
    }
    
    setTimeout(() => {
      this.gameState = 'idle';
      this.rollBtn.disabled = false;
    }, 800);
  }

  private showResult(combo: ComboInfo): void {
    this.comboNameEl.textContent = combo.name;
    this.comboScoreEl.textContent = combo.score.toString();
    this.resultDisplay.classList.add('show');
    
    this.resultShockwaves = [
      { radius: 0, alpha: 1, maxRadius: 100 },
      { radius: 0, alpha: 1, maxRadius: 150 },
      { radius: 0, alpha: 1, maxRadius: 200 },
    ];
    
    if (this.resultTimeout) {
      window.clearTimeout(this.resultTimeout);
    }
    this.resultTimeout = window.setTimeout(() => {
      this.resultDisplay.classList.remove('show');
    }, 2500);
  }

  private triggerConfetti(): void {
    const centerX = this.width / 2 / window.innerWidth;
    const centerY = this.height * 0.45 / window.innerHeight;
    
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { x: centerX, y: centerY },
      colors: ['#FF7B24', '#FFD700', '#FFA25A', '#FFFFFF'],
      zIndex: 1000,
    });
    
    setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FF7B24', '#FFD700'],
        zIndex: 1000,
      });
      confetti({
        particleCount: 100,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FFA25A', '#FFFFFF'],
        zIndex: 1000,
      });
    }, 200);
  }

  private updateStatsUI(): void {
    this.totalGamesEl.textContent = this.stats.getTotalGames().toString();
    this.totalScoreEl.textContent = this.stats.getTotalScore().toString();
    this.highScoreEl.textContent = this.stats.getHighScore().toString();
  }

  private gameLoop = (): void => {
    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    
    this.updateFPS(deltaTime);
    this.update(deltaTime);
    this.render();
    
    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    this.fpsTime += deltaTime;
    
    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.fpsTime);
      this.frameCount = 0;
      this.fpsTime = 0;
      this.fpsCounter.textContent = `FPS: ${this.currentFps}`;
    }
  }

  private update(deltaTime: number): void {
    this.updateNebula(deltaTime);
    
    this.dice.forEach(die => die.update(deltaTime));
    
    this.stats.update(deltaTime);
    
    this.resultShockwaves.forEach((wave, i) => {
      if (wave.alpha > 0) {
        const delay = i * 0.1;
        if (wave.radius === 0 && delay > 0) {
          wave.alpha -= deltaTime;
          if (wave.alpha <= 0) {
            wave.alpha = 1;
            wave.radius = 1;
          }
        } else {
          wave.radius += 500 * deltaTime;
          wave.alpha -= deltaTime * 2;
        }
      }
    });
    this.resultShockwaves = this.resultShockwaves.filter(w => w.alpha > 0);
  }

  private updateNebula(deltaTime: number): void {
    const time = performance.now() / 1000;
    
    this.nebulaParticles.forEach(p => {
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      
      p.twinklePhase += p.twinkleSpeed * deltaTime;
      
      if (p.x < -10) p.x = this.width + 10;
      if (p.x > this.width + 10) p.x = -10;
      if (p.y < -10) p.y = this.height + 10;
      if (p.y > this.height + 10) p.y = -10;
    });
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    this.renderNebula();
    this.dice.forEach(die => die.render(this.ctx));
    this.renderResultShockwaves();
    this.renderStatsChart();
  }

  private renderResultShockwaves(): void {
    const centerX = this.width / 2;
    const centerY = this.height * 0.5 + 100;
    
    this.resultShockwaves.forEach(wave => {
      if (wave.alpha > 0 && wave.radius > 0) {
        this.ctx.save();
        this.ctx.strokeStyle = `rgba(255, 123, 36, ${wave.alpha * 0.8})`;
        this.ctx.lineWidth = 4;
        this.ctx.shadowColor = 'rgba(255, 123, 36, 0.8)';
        this.ctx.shadowBlur = 25;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, wave.radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
        
        this.ctx.save();
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${wave.alpha * 0.4})`;
        this.ctx.lineWidth = 2;
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, wave.radius * 0.95, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      }
    });
  }

  private renderNebula(): void {
    const time = performance.now() / 1000;
    
    const bgGradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) / 1.5
    );
    bgGradient.addColorStop(0, 'rgba(45, 27, 78, 0.3)');
    bgGradient.addColorStop(0.5, 'rgba(26, 10, 46, 0.1)');
    bgGradient.addColorStop(1, 'rgba(13, 5, 24, 0)');
    
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.nebulaParticles.forEach(p => {
      const twinkle = Math.sin(p.twinklePhase) * 0.3 + 0.7;
      const alpha = p.alpha * twinkle;
      
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.shadowColor = 'rgba(255, 123, 36, 0.5)';
      this.ctx.shadowBlur = p.size * 3;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
    
    for (let i = 0; i < 3; i++) {
      const nebulaX = this.width * (0.3 + i * 0.2) + Math.sin(time * 0.3 + i) * 50;
      const nebulaY = this.height * (0.4 + Math.cos(i * 1.5) * 0.2) + Math.cos(time * 0.2 + i) * 30;
      
      const nebulaGradient = this.ctx.createRadialGradient(
        nebulaX, nebulaY, 0,
        nebulaX, nebulaY, 200
      );
      nebulaGradient.addColorStop(0, `rgba(255, 123, 36, ${0.08 + Math.sin(time + i) * 0.03})`);
      nebulaGradient.addColorStop(0.5, `rgba(138, 43, 226, ${0.05 + Math.cos(time * 0.7 + i) * 0.02})`);
      nebulaGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      this.ctx.fillStyle = nebulaGradient;
      this.ctx.fillRect(nebulaX - 200, nebulaY - 200, 400, 400);
    }
  }

  private renderStatsChart(): void {
    const rect = this.statsCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 2);
    
    if (this.statsCanvas.width !== rect.width * dpr) {
      this.statsCanvas.width = rect.width * dpr;
      this.statsCanvas.height = rect.height * dpr;
      this.statsCtx.scale(dpr, dpr);
    }
    
    this.statsCtx.clearRect(0, 0, rect.width, rect.height);
    this.stats.renderBarChart(this.statsCtx, 0, 0, rect.width, rect.height);
  }

  destroy(): void {
    cancelAnimationFrame(this.animationId);
    if (this.resultTimeout) {
      window.clearTimeout(this.resultTimeout);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});

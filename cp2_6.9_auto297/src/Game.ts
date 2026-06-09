import { Grid, drawHexagon } from './Grid';
import { Unit, createFirefly, createEnemyBug, updateUnit, checkUnitCombat, renderUnit } from './Unit';

interface ClickPulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

interface Button {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  hover: boolean;
  pressed: boolean;
  onPress: () => void;
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  grid: Grid;
  units: Unit[];
  coreX: number;
  coreY: number;
  coreHp: number;
  coreMaxHp: number;
  coreFlash: number;
  energy: number;
  wave: number;
  waveTimer: number;
  waveInterval: number;
  paused: boolean;
  selectedUnits: Set<number>;
  selecting: boolean;
  selectStartX: number;
  selectStartY: number;
  selectEndX: number;
  selectEndY: number;
  clickPulses: ClickPulse[];
  buttons: Button[];
  lastTime: number;
  running: boolean;
  animFrame: number;
  frameCount: number;
  fpsTime: number;
  fps: number;
  hatchCost: number;
  hatchAmount: number;
  totalBugs: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.grid = new Grid(20, 15);
    this.units = [];
    this.coreX = 0;
    this.coreY = 0;
    this.coreHp = 100;
    this.coreMaxHp = 100;
    this.coreFlash = 0;
    this.energy = 5;
    this.wave = 0;
    this.waveTimer = 0;
    this.waveInterval = 8;
    this.paused = false;
    this.selectedUnits = new Set();
    this.selecting = false;
    this.selectStartX = 0;
    this.selectStartY = 0;
    this.selectEndX = 0;
    this.selectEndY = 0;
    this.clickPulses = [];
    this.buttons = [];
    this.lastTime = 0;
    this.running = false;
    this.animFrame = 0;
    this.frameCount = 0;
    this.fpsTime = 0;
    this.fps = 60;
    this.hatchCost = 10;
    this.hatchAmount = 5;
    this.totalBugs = 0;

    this.resize();
    this.initGame();
    this.bindEvents();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const offX = (window.innerWidth - this.grid.width) / 2;
    const offY = (window.innerHeight - this.grid.height) / 2;
    this.grid.setOffset(offX, offY);

    this.coreX = 80 + offX;
    this.coreY = this.grid.height - 80 + offY;

    this.setupButtons();
  }

  setupButtons() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.buttons = [
      {
        x: w - 220,
        y: h - 60,
        width: 90,
        height: 36,
        label: '暂停',
        hover: false,
        pressed: false,
        onPress: () => this.togglePause()
      },
      {
        x: w - 110,
        y: h - 60,
        width: 90,
        height: 36,
        label: '重置',
        hover: false,
        pressed: false,
        onPress: () => this.reset()
      }
    ];
  }

  initGame() {
    this.units = [];
    this.totalBugs = 0;
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const dist = 40 + Math.random() * 20;
      const x = this.coreX + Math.cos(angle) * dist;
      const y = this.coreY + Math.sin(angle) * dist;
      this.units.push(createFirefly(x, y));
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    this.canvas.addEventListener('mousedown', e => {
      if (this.paused) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.hitCore(x, y)) {
        if (this.energy >= this.hatchCost) {
          this.hatchFireflies();
        }
        return;
      }

      const btn = this.hitButton(x, y);
      if (btn) {
        btn.pressed = true;
        return;
      }

      if (e.button === 0) {
        this.selecting = true;
        this.selectStartX = x;
        this.selectStartY = y;
        this.selectEndX = x;
        this.selectEndY = y;
      } else if (e.button === 2) {
        this.moveSelected(x, y);
      }
    });

    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (const btn of this.buttons) {
        btn.hover = this.pointInRect(x, y, btn);
      }

      if (this.selecting) {
        this.selectEndX = x;
        this.selectEndY = y;
      }
    });

    this.canvas.addEventListener('mouseup', e => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const btn = this.buttons.find(b => b.pressed);
      if (btn && this.pointInRect(x, y, btn)) {
        btn.onPress();
      }
      for (const b of this.buttons) b.pressed = false;

      if (this.selecting) {
        this.selecting = false;
        this.finishSelection();
      }
    });
  }

  pointInRect(x: number, y: number, r: { x: number; y: number; width: number; height: number }): boolean {
    return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
  }

  hitCore(x: number, y: number): boolean {
    return Math.hypot(x - this.coreX, y - this.coreY) < 24;
  }

  hitButton(x: number, y: number): Button | null {
    for (const btn of this.buttons) {
      if (this.pointInRect(x, y, btn)) return btn;
    }
    return null;
  }

  finishSelection() {
    const x1 = Math.min(this.selectStartX, this.selectEndX);
    const y1 = Math.min(this.selectStartY, this.selectEndY);
    const x2 = Math.max(this.selectStartX, this.selectEndX);
    const y2 = Math.max(this.selectStartY, this.selectEndY);
    const isClick = Math.abs(x2 - x1) < 5 && Math.abs(y2 - y1) < 5;

    this.selectedUnits.clear();
    for (const u of this.units) {
      u.selected = false;
      if (u.team !== 'player') continue;
      if (isClick) {
        if (Math.hypot(u.x - this.selectStartX, u.y - this.selectStartY) < 15) {
          u.selected = true;
          this.selectedUnits.add(u.id);
          break;
        }
      } else {
        if (u.x >= x1 && u.x <= x2 && u.y >= y1 && u.y <= y2) {
          u.selected = true;
          this.selectedUnits.add(u.id);
        }
      }
    }
  }

  moveSelected(tx: number, ty: number) {
    if (this.selectedUnits.size === 0) return;
    this.clickPulses.push({
      x: tx,
      y: ty,
      radius: 4,
      maxRadius: 20,
      life: 0.4,
      maxLife: 0.4
    });

    const ids = Array.from(this.selectedUnits);
    const count = ids.length;
    for (let i = 0; i < count; i++) {
      const u = this.units.find(unit => unit.id === ids[i]);
      if (!u) continue;
      const angle = (i / count) * Math.PI * 2;
      const dist = Math.min(count * 2, 20);
      u.targetX = tx + Math.cos(angle) * dist;
      u.targetY = ty + Math.sin(angle) * dist;
      u.hasTarget = true;
    }
  }

  hatchFireflies() {
    this.energy -= this.hatchCost;
    this.coreFlash = 0.15;
    for (let i = 0; i < this.hatchAmount; i++) {
      const angle = (i / this.hatchAmount) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 30 + Math.random() * 30;
      const x = this.coreX + Math.cos(angle) * dist;
      const y = this.coreY + Math.sin(angle) * dist;
      const ff = createFirefly(this.coreX, this.coreY);
      ff.targetX = x;
      ff.targetY = y;
      ff.hasTarget = true;
      this.units.push(ff);
    }
  }

  spawnWave() {
    this.wave++;
    const spawnCount = 4;
    for (let i = 0; i < spawnCount; i++) {
      const cell = this.grid.getRandomEdgeCell();
      const swarmSize = 5 + Math.floor(Math.random() * 4);
      for (let j = 0; j < swarmSize; j++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 30;
        const x = cell.x + Math.cos(angle) * dist;
        const y = cell.y + Math.sin(angle) * dist;
        const bug = createEnemyBug(x, y);
        bug.hasTarget = false;
        this.units.push(bug);
        this.totalBugs++;
      }
    }
  }

  togglePause() {
    this.paused = !this.paused;
    this.buttons[0].label = this.paused ? '继续' : '暂停';
  }

  reset() {
    this.energy = 5;
    this.wave = 0;
    this.waveTimer = 0;
    this.coreHp = this.coreMaxHp;
    this.coreFlash = 0;
    this.paused = false;
    this.buttons[0].label = '暂停';
    this.selectedUnits.clear();
    this.clickPulses = [];
    this.grid.reset();
    const offX = (window.innerWidth - this.grid.width) / 2;
    const offY = (window.innerHeight - this.grid.height) / 2;
    this.grid.setOffset(offX, offY);
    this.coreX = 80 + offX;
    this.coreY = this.grid.height - 80 + offY;
    this.initGame();
  }

  checkFlowerCapture() {
    for (const flower of this.grid.flowers) {
      let playerNear = 0;
      let enemyNear = 0;
      for (const u of this.units) {
        const dist = Math.hypot(u.x - flower.x, u.y - flower.y);
        if (dist < 20) {
          if (u.team === 'player') playerNear++;
          else enemyNear++;
        }
      }
      if (flower.owner !== 'player' && playerNear > 0 && playerNear > enemyNear) {
        flower.owner = 'player';
        flower.hp = flower.maxHp;
        flower.energyTimer = 0;
      } else if (flower.owner !== 'enemy' && enemyNear > 0 && enemyNear > playerNear) {
        flower.owner = 'enemy';
        flower.hp = flower.maxHp;
        flower.energyTimer = 0;
      }

      if (flower.owner === 'neutral') {
        for (const u of this.units) {
          if (u.team !== 'enemy') continue;
          const dist = Math.hypot(u.x - flower.x, u.y - flower.y);
          if (dist < 15) {
            flower.hp -= 0.5 * (1 / 60);
            flower.crackAnim = Math.min(1, flower.crackAnim + 0.02);
            if (flower.hp <= 0) {
              flower.hp = flower.maxHp;
              flower.owner = 'enemy';
              flower.crackAnim = 0;
              flower.energyTimer = 0;
            }
            break;
          }
        }
      }
    }
  }

  checkCoreAttack() {
    for (const u of this.units) {
      if (u.team !== 'enemy') continue;
      const dist = Math.hypot(u.x - this.coreX, u.y - this.coreY);
      if (dist < 40) {
        this.coreHp -= 0.2 * (1 / 60);
      }
    }
  }

  update(dt: number) {
    if (this.paused) return;

    if (this.coreFlash > 0) {
      this.coreFlash -= dt;
    }

    this.clickPulses = this.clickPulses.filter(p => {
      p.life -= dt;
      const t = 1 - p.life / p.maxLife;
      p.radius = 4 + (p.maxRadius - 4) * t;
      return p.life > 0;
    });

    this.waveTimer += dt;
    if (this.waveTimer >= this.waveInterval) {
      this.waveTimer = 0;
      this.spawnWave();
    }

    this.grid.update(dt, (owner) => {
      if (owner === 'player') this.energy += 1;
    });

    const flowerPositions = this.grid.flowers
      .filter(f => f.owner !== 'enemy')
      .map(f => ({ x: f.x, y: f.y }));

    for (const u of this.units) {
      updateUnit(u, dt, this.units, this.coreX, this.coreY, flowerPositions);
    }

    const { deadUnits } = checkUnitCombat(this.units, dt);
    if (deadUnits.length > 0) {
      this.units = this.units.filter(u => !deadUnits.includes(u.id));
      for (const id of deadUnits) {
        this.selectedUnits.delete(id);
      }
    }

    this.checkFlowerCapture();
    this.checkCoreAttack();

    if (this.coreHp <= 0) {
      this.reset();
    }
  }

  render() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const bg = this.ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#1A2E1A');
    bg.addColorStop(1, '#0D1A0D');
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0, 0, w, h);

    this.grid.render(this.ctx);
    this.renderCore();

    for (const u of this.units) {
      renderUnit(this.ctx, u);
    }

    if (this.selecting) {
      const x = Math.min(this.selectStartX, this.selectEndX);
      const y = Math.min(this.selectStartY, this.selectEndY);
      const sw = Math.abs(this.selectEndX - this.selectStartX);
      const sh = Math.abs(this.selectEndY - this.selectStartY);
      this.ctx.fillStyle = 'rgba(52, 152, 219, 0.15)';
      this.ctx.strokeStyle = '#3498DB';
      this.ctx.lineWidth = 2;
      this.ctx.fillRect(x, y, sw, sh);
      this.ctx.strokeRect(x, y, sw, sh);
    }

    for (const p of this.clickPulses) {
      const alpha = p.life / p.maxLife;
      this.ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.renderUI();
    this.renderButtons();
  }

  renderCore() {
    const grad = this.ctx.createRadialGradient(this.coreX, this.coreY, 0, this.coreX, this.coreY, 24);
    if (this.coreFlash > 0) {
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(1, '#FFFFFF');
    } else {
      grad.addColorStop(0, '#8E44AD');
      grad.addColorStop(1, '#6C3483');
    }

    const outerGlow = this.ctx.createRadialGradient(this.coreX, this.coreY, 0, this.coreX, this.coreY, 60);
    outerGlow.addColorStop(0, 'rgba(142, 68, 173, 0.4)');
    outerGlow.addColorStop(1, 'rgba(142, 68, 173, 0)');
    this.ctx.fillStyle = outerGlow;
    this.ctx.beginPath();
    this.ctx.arc(this.coreX, this.coreY, 60, 0, Math.PI * 2);
    this.ctx.fill();

    drawHexagon(this.ctx, this.coreX, this.coreY, 24, '', '#FFFFFF40', 2);
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = this.coreX + 24 * Math.cos(angle);
      const py = this.coreY + 24 * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(String(this.energy), this.coreX, this.coreY);

    const barW = 60;
    const barH = 5;
    const barX = this.coreX - barW / 2;
    const barY = this.coreY + 36;
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(barX, barY, barW, barH);
    this.ctx.fillStyle = '#8E44AD';
    this.ctx.fillRect(barX, barY, barW * (this.coreHp / this.coreMaxHp), barH);
  }

  renderUI() {
    const w = window.innerWidth;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(16, 14, 200, 60);

    const energyBarW = 120;
    const energyBarH = 14;
    const energyX = 26;
    const energyY = 24;
    const energyGrad = this.ctx.createLinearGradient(energyX, energyY, energyX + energyBarW, energyY);
    energyGrad.addColorStop(0, '#F1C40F');
    energyGrad.addColorStop(1, '#E67E22');
    this.ctx.fillStyle = '#333';
    this.ctx.beginPath();
    this.ctx.roundRect(energyX, energyY, energyBarW, energyBarH, 4);
    this.ctx.fill();
    this.ctx.fillStyle = energyGrad;
    this.ctx.beginPath();
    this.ctx.roundRect(energyX, energyY, Math.min(energyBarW, energyBarW * (this.energy / 20)), energyBarH, 4);
    this.ctx.fill();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${this.energy}/20`, energyX + energyBarW / 2, energyY + energyBarH / 2);

    const fireflyCount = this.units.filter(u => u.team === 'player').length;
    this.ctx.fillStyle = '#9B59B6';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`萤火虫: ${fireflyCount}`, 26, 48);

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(w - 180, 14, 164, 50);

    const nextWave = Math.max(0, Math.ceil(this.waveInterval - this.waveTimer));
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`第 ${this.wave} 波`, w - 26, 20);
    this.ctx.fillStyle = '#E74C3C';
    this.ctx.font = '14px sans-serif';
    this.ctx.fillText(`下一波: ${nextWave}s`, w - 26, 42);
  }

  renderButtons() {
    for (const btn of this.buttons) {
      let scale = 1;
      if (btn.hover) scale = 1.1;
      if (btn.pressed) scale = 0.95;

      this.ctx.save();
      this.ctx.translate(btn.x + btn.width / 2, btn.y + btn.height / 2);
      this.ctx.scale(scale, scale);
      this.ctx.translate(-btn.width / 2, -btn.height / 2);

      if (btn.hover && !btn.pressed) {
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetY = 2;
      }

      this.ctx.fillStyle = btn.pressed ? '#2C3E50' : '#34495E';
      this.ctx.beginPath();
      this.ctx.roundRect(0, 0, btn.width, btn.height, 6);
      this.ctx.fill();

      this.ctx.shadowColor = 'transparent';
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '14px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(btn.label, btn.width / 2, btn.height / 2);

      this.ctx.restore();
    }
  }

  loop = (ts: number) => {
    if (!this.running) return;

    const dt = Math.min(0.05, (ts - this.lastTime) / 1000 || 0);
    this.lastTime = ts;

    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    const targetDt = this.units.length > 200 ? 1 / 30 : 1 / 60;
    if (dt >= targetDt * 0.9) {
      this.update(dt);
      this.render();
    }

    this.animFrame = requestAnimationFrame(this.loop);
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.animFrame = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }
}

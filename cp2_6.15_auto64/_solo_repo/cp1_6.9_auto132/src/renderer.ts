import { GameState, GameModule, HexCoord, HexCell, Particle, MODULE_COLORS } from './types';
import { GameEngine } from './gameEngine';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: GameEngine;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
    this.engine = engine;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.engine.setCanvasSize(width, height);
    this.calculateOffsets();
  }

  private calculateOffsets(): void {
    const state = this.engine.getState();
    const hexSize = state.hexSize;
    const { gridWidth, gridHeight } = this.engine.getConfig();
    
    const w = Math.sqrt(3) * hexSize;
    const h = hexSize * 2;
    
    const totalWidth = (gridWidth + 0.5) * w;
    const totalHeight = gridHeight * h * 0.75 + h * 0.25;
    
    this.offsetX = (this.canvas.width - totalWidth) / 2;
    this.offsetY = (this.canvas.height - totalHeight) / 2;
  }

  public hexToScreen(coord: HexCoord): { x: number; y: number } {
    const hexSize = this.engine.getState().hexSize;
    const { x, y } = this.engine.hexToPixel(coord, hexSize);
    return { x: x + this.offsetX, y: y + this.offsetY };
  }

  public screenToHex(x: number, y: number): HexCoord {
    const hexSize = this.engine.getState().hexSize;
    return this.engine.pixelToHex(x - this.offsetX, y - this.offsetY, hexSize);
  }

  public render(currentTime: number): void {
    const state = this.engine.getState();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawBackground();
    this.drawGrid(state, currentTime);
    this.drawConnections(state, currentTime);
    this.drawShadow(state, currentTime);
    this.drawShieldPulses(state, currentTime);
    this.drawModules(state, currentTime);
    this.drawParticles(state, currentTime);
    this.drawCore(state, currentTime);
    this.drawWarningGlow(state, currentTime);
    this.drawMinimap(state, currentTime);
    this.drawSelectedCell(state);
  }

  private drawBackground(): void {
    const { width, height } = this.canvas;
    const gradient = this.ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height)
    );
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#05051a');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    this.drawStars();
  }

  private drawStars(): void {
    const { width, height } = this.canvas;
    const starCount = Math.floor((width * height) / 15000);
    
    this.ctx.save();
    for (let i = 0; i < starCount; i++) {
      const x = (Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1;
      const y = (Math.sin(i * 78.233 + 12.9898) * 78233.5453) % 1;
      const absX = Math.abs(x) * width;
      const absY = Math.abs(y) * height;
      const brightness = (Math.abs(x) % 0.5) + 0.3;
      const size = (Math.abs(y) % 1.5) + 0.5;
      
      this.ctx.beginPath();
      this.ctx.arc(absX, absY, size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.5})`;
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private drawGrid(state: GameState, _currentTime: number): void {
    const hexSize = state.hexSize;
    const { gridWidth, gridHeight } = this.engine.getConfig();

    for (let q = 0; q < gridWidth; q++) {
      for (let r = 0; r < gridHeight; r++) {
        const coord: HexCoord = { q, r };
        this.drawHexCell(coord, hexSize);
      }
    }
  }

  private drawHexCell(coord: HexCoord, hexSize: number): void {
    const { x, y } = this.hexToScreen(coord);
    const size = hexSize;
    
    this.ctx.save();
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 0.5;
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  private drawConnections(_state: GameState, _currentTime: number): void {
    const connections = this.engine.getConnections();
    
    connections.forEach((conn) => {
      const from = this.hexToScreen(conn.from);
      const to = this.hexToScreen(conn.to);
      
      this.ctx.save();
      if (conn.active) {
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.strokeStyle = conn.color;
        this.ctx.lineWidth = 2.5;
        this.ctx.shadowColor = conn.color;
        this.ctx.shadowBlur = 8;
        this.ctx.stroke();
      } else {
        this.ctx.beginPath();
        this.ctx.setLineDash([5, 5]);
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.strokeStyle = 'rgba(68, 136, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
      this.ctx.restore();
    });
  }

  private drawShadow(state: GameState, _currentTime: number): void {
    state.grid.forEach((cell) => {
      if (cell.shadowBrightness < 1) {
        this.drawCellShadow(cell);
      }
    });
  }

  private drawCellShadow(cell: HexCell): void {
    const { x, y } = this.hexToScreen(cell.coord);
    const hexSize = this.engine.getState().hexSize;
    const size = hexSize * 0.95;
    
    this.ctx.save();
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();
    
    const darkAmount = 1 - cell.shadowBrightness;
    this.ctx.fillStyle = `rgba(10, 0, 30, ${darkAmount * 0.85})`;
    this.ctx.fill();
    
    if (cell.shadowBrightness < 0.3) {
      this.ctx.strokeStyle = 'rgba(80, 0, 120, 0.6)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  private drawShieldPulses(state: GameState, currentTime: number): void {
    state.shieldPulses.forEach((pulse) => {
      const { x, y } = this.hexToScreen(pulse.coord);
      const elapsed = currentTime - pulse.startTime;
      const t = elapsed / pulse.duration;
      const radius = pulse.maxRadius * t;
      const opacity = 1 - t;
      
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(135, 206, 250, ${opacity * 0.3})`;
      this.ctx.fill();
      this.ctx.strokeStyle = `rgba(135, 206, 250, ${opacity})`;
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = '#87CEEB';
      this.ctx.shadowBlur = 15;
      this.ctx.stroke();
      this.ctx.restore();
    });
  }

  private drawModules(state: GameState, currentTime: number): void {
    state.modules.forEach((module) => {
      this.drawModule(module, state, currentTime);
    });
  }

  private drawModule(module: GameModule, state: GameState, currentTime: number): void {
    const { x, y } = this.hexToScreen(module.coord);
    const hexSize = state.hexSize;
    
    const animKey = module.id;
    let scale = 1;
    if (state.animations.has(animKey)) {
      const anim = state.animations.get(animKey)!;
      const elapsed = currentTime - anim.startTime;
      if (elapsed < anim.duration) {
        const t = elapsed / anim.duration;
        scale = 1 - Math.pow(1 - t, 3);
      }
    }
    
    const upAnimKey = `up_${module.id}`;
    let upScale = 1;
    if (state.animations.has(upAnimKey)) {
      const anim = state.animations.get(upAnimKey)!;
      const elapsed = currentTime - anim.startTime;
      if (elapsed < anim.duration) {
        const t = elapsed / anim.duration;
        upScale = 1 + 0.2 * Math.sin(t * Math.PI);
      }
    }
    
    const totalScale = scale * upScale;
    
    let warningFlash = 1;
    if (module.isWarning) {
      const flashPeriod = 1000 / 2;
      const phase = ((currentTime - (module.warningStartTime || 0)) % flashPeriod) / flashPeriod;
      warningFlash = phase < 0.5 ? 1 : 0.3;
    }
    
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(totalScale, totalScale);
    
    switch (module.type) {
      case 'harvester':
        this.drawHarvester(module, hexSize, currentTime, warningFlash);
        break;
      case 'tower':
        this.drawTower(module, hexSize, currentTime, warningFlash);
        break;
      case 'portal':
        this.drawPortal(module, hexSize, currentTime, warningFlash);
        break;
      case 'shield':
        this.drawShield(module, hexSize, currentTime, warningFlash);
        break;
    }
    
    this.drawModuleLevelRing(module, hexSize, currentTime);
    
    this.ctx.restore();
  }

  private drawModuleBase(hexSize: number, color: string, warningFlash: number, glow: number): void {
    const size = hexSize * 0.75;
    
    this.ctx.save();
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = size * Math.cos(angle);
      const py = size * Math.sin(angle);
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();
    
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15 * glow * warningFlash;
    
    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    gradient.addColorStop(0, this.adjustColorBrightness(color, 1.5 * warningFlash));
    gradient.addColorStop(0.5, this.adjustColorBrightness(color, 0.8 * warningFlash));
    gradient.addColorStop(1, this.adjustColorBrightness(color, 0.3 * warningFlash));
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  private drawHarvester(module: GameModule, hexSize: number, currentTime: number, warningFlash: number): void {
    const color = MODULE_COLORS.harvester;
    const glow = 0.5 + module.level * 0.1;
    
    this.drawModuleBase(hexSize, color, warningFlash, glow);
    
    const pulseSize = (hexSize * 0.4) * (0.8 + 0.2 * Math.sin(module.pulsePhase * Math.PI * 2));
    
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
    
    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, pulseSize);
    gradient.addColorStop(0, `rgba(255, 255, 200, ${0.9 * warningFlash})`);
    gradient.addColorStop(0.5, `rgba(255, 180, 0, ${0.7 * warningFlash})`);
    gradient.addColorStop(1, `rgba(255, 140, 0, ${0.3 * warningFlash})`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.shadowColor = '#FFA500';
    this.ctx.shadowBlur = 20 * warningFlash;
    this.ctx.fill();
    this.ctx.restore();
    
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + (currentTime / 2000) * (Math.PI / 3);
      const r1 = hexSize * 0.2;
      const r2 = hexSize * 0.5;
      
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(r1 * Math.cos(angle), r1 * Math.sin(angle));
      this.ctx.lineTo(r2 * Math.cos(angle), r2 * Math.sin(angle));
      this.ctx.strokeStyle = `rgba(255, 200, 50, ${0.5 * warningFlash})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private drawTower(module: GameModule, hexSize: number, currentTime: number, warningFlash: number): void {
    const color = MODULE_COLORS.tower;
    const baseGlow = 0.2 + (module.level / 10) * 0.8;
    const glowRadius = 20 + (module.level / 10) * 40;
    
    this.drawModuleBase(hexSize, color, warningFlash, baseGlow);
    
    const pulseT = Math.sin(module.pulsePhase * Math.PI * 2);
    const beamHeight = (0 + (pulseT + 1) / 2 * 40 / 30) * hexSize;
    const beamWidth = hexSize * 0.2;
    
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.roundRect(-beamWidth / 2, -beamHeight, beamWidth, beamHeight * 2, 2);
    
    const gradient = this.ctx.createLinearGradient(0, -beamHeight, 0, beamHeight);
    gradient.addColorStop(0, `rgba(255, 0, 255, 0)`);
    gradient.addColorStop(0.3, `rgba(255, 100, 255, ${0.8 * warningFlash})`);
    gradient.addColorStop(0.5, `rgba(255, 200, 255, ${warningFlash})`);
    gradient.addColorStop(0.7, `rgba(255, 100, 255, ${0.8 * warningFlash})`);
    gradient.addColorStop(1, `rgba(255, 0, 255, 0)`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.shadowColor = '#FF00FF';
    this.ctx.shadowBlur = glowRadius * warningFlash;
    this.ctx.fill();
    this.ctx.restore();
    
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.roundRect(-beamWidth, -beamHeight * 0.6, beamWidth * 2, beamHeight * 1.2, 4);
    this.ctx.fillStyle = `rgba(255, 150, 255, ${0.2 * warningFlash})`;
    this.ctx.fill();
    this.ctx.restore();
    
    const levelPct = module.level / 10;
    this.ctx.save();
    for (let i = 0; i < Math.ceil(levelPct * 5); i++) {
      const angle = (i / 5) * Math.PI * 2 + currentTime / 1500;
      const r = hexSize * 0.55;
      const px = r * Math.cos(angle);
      const py = r * Math.sin(angle);
      
      this.ctx.beginPath();
      this.ctx.arc(px, py, 2, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 200, 255, ${0.8 * warningFlash})`;
      this.ctx.shadowColor = '#FF00FF';
      this.ctx.shadowBlur = 5;
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private drawPortal(module: GameModule, hexSize: number, _currentTime: number, warningFlash: number): void {
    const color = MODULE_COLORS.portal;
    
    this.drawModuleBase(hexSize, color, warningFlash, 0.6);
    
    const outerSize = hexSize * 0.55;
    const innerSize = hexSize * 0.35;
    const rotation = (module.rotationPhase * Math.PI) / 180;
    
    this.ctx.save();
    this.ctx.rotate(rotation);
    
    this.ctx.beginPath();
    this.ctx.arc(0, 0, outerSize, 0, Math.PI * 2);
    const outerGradient = this.ctx.createConicGradient ? 
      this.ctx.createConicGradient(0, 0, 0) : null;
    if (outerGradient) {
      outerGradient.addColorStop(0, '#00FFFF');
      outerGradient.addColorStop(0.25, '#FF00FF');
      outerGradient.addColorStop(0.5, '#FFFF00');
      outerGradient.addColorStop(0.75, '#00FF00');
      outerGradient.addColorStop(1, '#00FFFF');
      this.ctx.strokeStyle = outerGradient;
    } else {
      this.ctx.strokeStyle = `rgba(0, 255, 255, ${0.8 * warningFlash})`;
    }
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = '#00FFFF';
    this.ctx.shadowBlur = 15 * warningFlash;
    this.ctx.stroke();
    this.ctx.restore();
    
    this.ctx.save();
    this.ctx.rotate(-rotation * 1.5);
    
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const px = innerSize * Math.cos(angle);
      const py = innerSize * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.closePath();
    this.ctx.strokeStyle = `rgba(255, 255, 0, ${0.7 * warningFlash})`;
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = '#FFFF00';
    this.ctx.shadowBlur = 10;
    this.ctx.stroke();
    this.ctx.restore();
    
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(0, 0, hexSize * 0.15, 0, Math.PI * 2);
    const coreGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, hexSize * 0.15);
    coreGradient.addColorStop(0, `rgba(255, 255, 255, ${warningFlash})`);
    coreGradient.addColorStop(0.5, `rgba(100, 255, 255, ${0.8 * warningFlash})`);
    coreGradient.addColorStop(1, `rgba(0, 200, 255, ${0.3 * warningFlash})`);
    this.ctx.fillStyle = coreGradient;
    this.ctx.shadowColor = '#00FFFF';
    this.ctx.shadowBlur = 20;
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawShield(_module: GameModule, hexSize: number, currentTime: number, warningFlash: number): void {
    const color = MODULE_COLORS.shield;
    
    this.drawModuleBase(hexSize, color, warningFlash, 0.7);
    
    const flashT = Math.sin(currentTime / 250 * Math.PI * 2);
    const flashOpacity = 0.5 + 0.5 * flashT;
    
    const coreSize = hexSize * 0.35;
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
    
    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${flashOpacity * warningFlash})`);
    gradient.addColorStop(0.4, `rgba(200, 230, 255, ${0.8 * flashOpacity * warningFlash})`);
    gradient.addColorStop(1, `rgba(100, 180, 255, ${0.3 * flashOpacity * warningFlash})`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.shadowColor = '#87CEEB';
    this.ctx.shadowBlur = 25 * flashOpacity * warningFlash;
    this.ctx.fill();
    this.ctx.restore();
    
    this.ctx.save();
    const shieldRadius = hexSize * 0.9;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(135, 206, 250, ${0.2 * warningFlash})`;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 4]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.restore();
    
    this.ctx.save();
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + currentTime / 3000;
      const r = hexSize * 0.48;
      const px = r * Math.cos(angle);
      const py = r * Math.sin(angle);
      
      this.ctx.moveTo(px - 1, py);
      this.ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    }
    this.ctx.fillStyle = `rgba(180, 220, 255, ${0.7 * warningFlash})`;
    this.ctx.shadowColor = '#ADD8E6';
    this.ctx.shadowBlur = 6;
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawModuleLevelRing(module: GameModule, hexSize: number, currentTime: number): void {
    const level = module.level;
    if (level <= 1) return;
    
    const ringSize = hexSize * 0.65;
    const particleCount = Math.min(level, 5) * 4;
    const rotationSpeed = module.level * 0.5;
    const baseAngle = (currentTime / 1000) * rotationSpeed;
    const brightness = 0.3 + (level / 5) * 0.7;
    const color = MODULE_COLORS[module.type];
    
    this.ctx.save();
    for (let i = 0; i < particleCount; i++) {
      const angle = baseAngle + (i / particleCount) * Math.PI * 2;
      const px = ringSize * Math.cos(angle);
      const py = ringSize * Math.sin(angle);
      const size = 2 + level * 0.3;
      
      this.ctx.beginPath();
      this.ctx.arc(px, py, size, 0, Math.PI * 2);
      this.ctx.fillStyle = this.adjustColorBrightness(color, brightness);
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 8 * brightness;
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private drawParticles(state: GameState, _currentTime: number): void {
    state.particles.forEach((particle) => {
      this.drawParticle(particle);
    });
  }

  private drawParticle(particle: Particle): void {
    const from = this.hexToScreen(particle.fromCoord);
    const to = this.hexToScreen(particle.toCoord);
    
    const x = from.x + (to.x - from.x) * particle.progress;
    const y = from.y + (to.y - from.y) * particle.progress;
    
    const brightness = Math.min(particle.energyValue / 10, 1);
    const size = 3 + brightness * 4;
    
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.opacity})`);
    gradient.addColorStop(0.5, this.adjustColorOpacity(particle.color, particle.opacity * 0.8));
    gradient.addColorStop(1, this.adjustColorOpacity(particle.color, 0));
    
    this.ctx.fillStyle = gradient;
    this.ctx.shadowColor = particle.color;
    this.ctx.shadowBlur = 12 * (0.5 + brightness);
    this.ctx.fill();
    this.ctx.restore();
    
    const tailLength = Math.min(particle.progress * 2, 0.2);
    const tailStart = Math.max(0, particle.progress - tailLength);
    if (tailStart > 0) {
      const tx1 = from.x + (to.x - from.x) * tailStart;
      const ty1 = from.y + (to.y - from.y) * tailStart;
      
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(tx1, ty1);
      this.ctx.lineTo(x, y);
      
      const tailGradient = this.ctx.createLinearGradient(tx1, ty1, x, y);
      tailGradient.addColorStop(0, this.adjustColorOpacity(particle.color, 0));
      tailGradient.addColorStop(1, this.adjustColorOpacity(particle.color, particle.opacity * 0.5));
      
      this.ctx.strokeStyle = tailGradient;
      this.ctx.lineWidth = size * 0.7;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private drawCore(state: GameState, currentTime: number): void {
    const { gridWidth, gridHeight } = this.engine.getConfig();
    const coreCoord: HexCoord = {
      q: Math.floor(gridWidth / 2),
      r: Math.floor(gridHeight / 2)
    };
    const { x, y } = this.hexToScreen(coreCoord);
    const hexSize = state.hexSize;
    
    const coreCell = this.engine.getCell(coreCoord);
    if (!coreCell) return;
    
    const pulseSize = (hexSize * 0.5) * (0.9 + 0.1 * Math.sin(currentTime / 400 * Math.PI * 2));
    
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(x, y, pulseSize * 1.5, 0, Math.PI * 2);
    const outerGlow = this.ctx.createRadialGradient(x, y, 0, x, y, pulseSize * 1.5);
    outerGlow.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
    outerGlow.addColorStop(0.5, 'rgba(255, 180, 0, 0.15)');
    outerGlow.addColorStop(1, 'rgba(255, 150, 0, 0)');
    this.ctx.fillStyle = outerGlow;
    this.ctx.fill();
    this.ctx.restore();
    
    this.ctx.save();
    this.ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + currentTime / 2000;
      const r = pulseSize * (i % 2 === 0 ? 1 : 0.7);
      const px = x + r * Math.cos(angle);
      const py = y + r * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.closePath();
    
    const crystalGradient = this.ctx.createRadialGradient(x, y, 0, x, y, pulseSize);
    crystalGradient.addColorStop(0, '#FFFACD');
    crystalGradient.addColorStop(0.4, '#FFD700');
    crystalGradient.addColorStop(0.8, '#FFA500');
    crystalGradient.addColorStop(1, '#FF8C00');
    
    this.ctx.fillStyle = crystalGradient;
    this.ctx.shadowColor = '#FFD700';
    this.ctx.shadowBlur = 30;
    this.ctx.fill();
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();
    this.ctx.restore();
    
    if (coreCell.isShadow) {
      const covered = state.coreCoveredStartTime !== null;
      if (covered) {
        const elapsed = currentTime - (state.coreCoveredStartTime || 0);
        const pct = Math.min(elapsed / 5000, 1);
        const flash = Math.sin(currentTime / 80) > 0 ? 1 : 0.5;
        
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x, y, pulseSize * 1.8, 0, Math.PI * 2 * pct);
        this.ctx.strokeStyle = `rgba(255, 0, 0, ${flash})`;
        this.ctx.lineWidth = 4;
        this.ctx.shadowColor = '#FF0000';
        this.ctx.shadowBlur = 15;
        this.ctx.stroke();
        this.ctx.restore();
      }
    }
  }

  private drawWarningGlow(state: GameState, currentTime: number): void {
    state.warningGlows.forEach((glow) => {
      const elapsed = currentTime - glow.startTime;
      if (elapsed >= glow.duration) return;
      
      const opacity = 0.8 * (1 - elapsed / glow.duration);
      
      this.ctx.save();
      const { width, height } = this.canvas;
      
      const edges = [
        { x1: 0, y1: 0, x2: width, y2: 0 },
        { x1: width, y1: 0, x2: width, y2: height },
        { x1: 0, y1: height, x2: width, y2: height },
        { x1: 0, y1: 0, x2: 0, y2: height }
      ];
      
      edges.forEach((e) => {
        const gradient = this.ctx.createLinearGradient(e.x1, e.y1, e.x2, e.y2);
        gradient.addColorStop(0, `rgba(255, 0, 0, ${opacity})`);
        gradient.addColorStop(0.5, `rgba(255, 50, 50, ${opacity * 0.5})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, ${opacity})`);
        
        this.ctx.beginPath();
        this.ctx.moveTo(e.x1, e.y1);
        this.ctx.lineTo(e.x2, e.y2);
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 20;
        this.ctx.stroke();
      });
      this.ctx.restore();
    });
  }

  private drawMinimap(state: GameState, currentTime: number): void {
    const { width, height } = this.canvas;
    const isSmall = width < 768;
    const mapSize = isSmall ? 80 : 120;
    const padding = 20;
    
    const mapX = width - mapSize - padding;
    const mapY = height - mapSize - padding;
    
    const { gridWidth, gridHeight } = this.engine.getConfig();
    const cellW = mapSize / gridWidth;
    const cellH = mapSize / gridHeight;
    
    this.ctx.save();
    
    this.ctx.beginPath();
    this.ctx.roundRect(mapX, mapY, mapSize, mapSize, mapSize / 2);
    this.ctx.fillStyle = 'rgba(0, 0, 20, 0.6)';
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.clip();
    
    state.grid.forEach((cell) => {
      const mx = mapX + cell.coord.q * cellW;
      const my = mapY + cell.coord.r * cellH;
      
      if (cell.isShadow) {
        this.ctx.fillStyle = `rgba(60, 0, 80, ${1 - cell.shadowBrightness * 0.5})`;
      } else if (cell.isShieldProtected) {
        this.ctx.fillStyle = 'rgba(135, 206, 250, 0.4)';
      } else if (cell.module) {
        this.ctx.fillStyle = MODULE_COLORS[cell.module.type];
      } else {
        this.ctx.fillStyle = 'rgba(30, 30, 80, 0.3)';
      }
      
      this.ctx.fillRect(mx, my, cellW + 1, cellH + 1);
    });
    
    const coreX = mapX + Math.floor(gridWidth / 2) * cellW + cellW / 2;
    const coreY = mapY + Math.floor(gridHeight / 2) * cellH + cellH / 2;
    const coreFlash = 0.7 + 0.3 * Math.sin(currentTime / 300);
    
    this.ctx.beginPath();
    this.ctx.arc(coreX, coreY, Math.min(cellW, cellH) * 0.7, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(255, 215, 0, ${coreFlash})`;
    this.ctx.shadowColor = '#FFD700';
    this.ctx.shadowBlur = 8;
    this.ctx.fill();
    
    state.modules.forEach((module) => {
      if (module.type === 'shield') {
        const sx = mapX + module.coord.q * cellW + cellW / 2;
        const sy = mapY + module.coord.r * cellH + cellH / 2;
        const shieldRadius = cellW * 1.5;
        
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, shieldRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(135, 206, 250, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    });
    
    this.ctx.restore();
  }

  private drawSelectedCell(state: GameState): void {
    if (!state.selectedCell) return;
    
    const { x, y } = this.hexToScreen(state.selectedCell);
    const hexSize = state.hexSize;
    const size = hexSize * 0.9;
    
    this.ctx.save();
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.closePath();
    
    this.ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 4]);
    this.ctx.shadowColor = '#64C8FF';
    this.ctx.shadowBlur = 10;
    this.ctx.stroke();
    this.ctx.restore();
  }

  private adjustColorBrightness(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    const nr = Math.min(255, Math.floor(r * factor));
    const ng = Math.min(255, Math.floor(g * factor));
    const nb = Math.min(255, Math.floor(b * factor));
    
    return `rgb(${nr}, ${ng}, ${nb})`;
  }

  private adjustColorOpacity(hex: string, opacity: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  public getModuleAtScreen(screenX: number, screenY: number): GameModule | null {
    const state = this.engine.getState();
    const hexSize = state.hexSize;
    
    let closest: GameModule | null = null;
    let closestDist = Infinity;
    
    state.modules.forEach((module) => {
      const { x, y } = this.hexToScreen(module.coord);
      const dist = Math.sqrt((screenX - x) ** 2 + (screenY - y) ** 2);
      if (dist < hexSize * 0.8 && dist < closestDist) {
        closest = module;
        closestDist = dist;
      }
    });
    
    return closest;
  }

  public getCellAtScreen(screenX: number, screenY: number): HexCoord | null {
    const coord = this.screenToHex(screenX, screenY);
    if (this.engine.isValidCoord(coord)) {
      return coord;
    }
    return null;
  }
}

export default Renderer;

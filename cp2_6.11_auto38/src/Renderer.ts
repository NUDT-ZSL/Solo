import { Tilemap, GRID_SIZE, TILE_SIZE, TileType, Position, Rune } from './Tilemap';

export interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface MuralFragment {
  id: number;
  colors: string[];
  shapes: { type: string; x: number; y: number; size: number; rotation: number; color: string }[];
}

export interface RenderState {
  playerPos: Position;
  renderPlayerPos: Position;
  health: number;
  runes: Rune[];
  activatedCount: number;
  trail: TrailPoint[];
  portalActive: boolean;
  portalRotation: number;
  portalParticles: { angle: number; distance: number; speed: number; size: number }[];
  screenShake: { offsetX: number; offsetY: number; duration: number };
  inkSpread: { x: number; y: number; radius: number; maxRadius: number; alpha: number } | null;
  muralFragments: MuralFragment[];
  hintText: string;
  victoryProgress: number;
  victory: boolean;
  score: number;
}

const COLORS = {
  WALL: '#4A4E59',
  WALL_DARK: '#3A3E49',
  WALL_LIGHT: '#5A5E69',
  PASSAGE: '#D2C9B6',
  PASSAGE_DARK: '#C2B9A6',
  RUNE_INACTIVE: '#8B0000',
  RUNE_ACTIVE: '#FFD700',
  INK_SPIRIT: '#1a1a2e',
  INK_SPIRIT_EDGE: '#0a0a15',
  PORTAL_BLUE: '#4169E1',
  PORTAL_PURPLE: '#9370DB',
  GOLD: '#B8860B',
  GLASS_BG: 'rgba(26, 35, 58, 0.6)',
  MURAL_BG: 'rgba(210, 201, 182, 0.3)'
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private mazeOffsetX: number;
  private mazeOffsetY: number;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    this.mazeOffsetX = 250;
    this.mazeOffsetY = 60;
  }

  public render(state: RenderState, tilemap: Tilemap, time: number): void {
    this.ctx.save();
    
    this.applyScreenShake(state.screenShake);
    this.drawBackground();
    this.drawTilemap(tilemap, time);
    this.drawRunes(state.runes, time);
    this.drawTrail(state.trail, time);
    
    if (state.portalActive && tilemap.getPortalPosition()) {
      this.drawPortal(tilemap.getPortalPosition()!, state.portalRotation, state.portalParticles, time);
    }
    
    if (state.inkSpread) {
      this.drawInkSpread(state.inkSpread);
    }
    
    this.drawPlayer(state.renderPlayerPos, time);
    this.drawUI(state, time);
    
    if (state.victoryProgress > 0) {
      this.drawVictoryOverlay(state.victoryProgress, state.score);
    }
    
    this.ctx.restore();
  }

  private applyScreenShake(shake: { offsetX: number; offsetY: number; duration: number }): void {
    if (shake.duration > 0) {
      this.ctx.translate(shake.offsetX, shake.offsetY);
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, '#101B2B');
    gradient.addColorStop(1, '#0A0A0A');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawTilemap(tilemap: Tilemap, time: number): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tile = tilemap.getTile(x, y);
        const px = this.mazeOffsetX + x * TILE_SIZE;
        const py = this.mazeOffsetY + y * TILE_SIZE;

        if (tile === TileType.WALL) {
          this.drawWall(px, py, tilemap.getWallCracks(x, y));
        } else {
          this.drawPassage(px, py);
        }
      }
    }
  }

  private drawWall(x: number, y: number, cracks: { x: number; y: number; angle: number; length: number }[]): void {
    this.ctx.fillStyle = COLORS.WALL;
    this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    this.ctx.fillStyle = COLORS.WALL_DARK;
    this.ctx.fillRect(x, y + TILE_SIZE - 4, TILE_SIZE, 4);
    this.ctx.fillRect(x + TILE_SIZE - 4, y, 4, TILE_SIZE);

    this.ctx.fillStyle = COLORS.WALL_LIGHT;
    this.ctx.fillRect(x, y, TILE_SIZE, 2);
    this.ctx.fillRect(x, y, 2, TILE_SIZE);

    this.ctx.strokeStyle = '#2A2E39';
    this.ctx.lineWidth = 1;
    for (const crack of cracks) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + crack.x, y + crack.y);
      const endX = x + crack.x + Math.cos(crack.angle) * crack.length;
      const endY = y + crack.y + Math.sin(crack.angle) * crack.length;
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();
    }

    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
  }

  private drawPassage(x: number, y: number): void {
    this.ctx.fillStyle = COLORS.PASSAGE;
    this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    this.ctx.fillStyle = COLORS.PASSAGE_DARK;
    for (let i = 0; i < 3; i++) {
      const dotX = x + 8 + Math.random() * (TILE_SIZE - 16);
      const dotY = y + 8 + Math.random() * (TILE_SIZE - 16);
      this.ctx.beginPath();
      this.ctx.arc(dotX, dotY, 1, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.strokeStyle = 'rgba(180, 170, 150, 0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
  }

  private drawRunes(runes: Rune[], time: number): void {
    for (const rune of runes) {
      const px = this.mazeOffsetX + rune.position.x * TILE_SIZE + TILE_SIZE / 2;
      const py = this.mazeOffsetY + rune.position.y * TILE_SIZE + TILE_SIZE / 2;

      if (rune.activated) {
        const glowGradient = this.ctx.createRadialGradient(px, py, 0, px, py, 18);
        glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
        glowGradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
        glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        this.ctx.fillStyle = glowGradient;
        this.ctx.beginPath();
        this.ctx.arc(px, py, 18, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = COLORS.RUNE_ACTIVE;
        this.ctx.beginPath();
        this.ctx.arc(px, py, 8, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#FFF8DC';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(px, py, 8, 0, Math.PI * 2);
        this.ctx.stroke();
      } else {
        const breathe = (Math.sin(time / 500) + 1) / 2;
        const alpha = 0.4 + breathe * 0.4;
        const radius = 10 + breathe * 2;

        this.ctx.fillStyle = `rgba(139, 0, 0, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(px, py, radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = `rgba(178, 34, 34, ${alpha * 0.7})`;
        this.ctx.beginPath();
        this.ctx.arc(px, py, radius * 0.6, 0, Math.PI * 2);
        this.ctx.fill();

        if (rune.progress > 0) {
          const progressAngle = (rune.progress / 1000) * Math.PI * 2;
          this.ctx.strokeStyle = 'rgba(26, 26, 46, 0.8)';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.arc(px, py, 16, -Math.PI / 2, -Math.PI / 2 + progressAngle);
          this.ctx.stroke();
        }
      }
    }
  }

  private drawTrail(trail: TrailPoint[], time: number): void {
    const maxAge = 1500;
    for (let i = 0; i < trail.length; i++) {
      const point = trail[i];
      const age = time - point.timestamp;
      if (age > maxAge) continue;

      const alpha = 1 - (age / maxAge);
      const size = 8 * (1 - age / maxAge * 0.5);
      
      const px = this.mazeOffsetX + point.x * TILE_SIZE + TILE_SIZE / 2;
      const py = this.mazeOffsetY + point.y * TILE_SIZE + TILE_SIZE / 2;

      const gradient = this.ctx.createRadialGradient(px, py, 0, px, py, size);
      gradient.addColorStop(0, `rgba(26, 26, 46, ${alpha * 0.7})`);
      gradient.addColorStop(1, `rgba(26, 26, 46, 0)`);
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(px, py, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawPortal(pos: Position, rotation: number, particles: { angle: number; distance: number; speed: number; size: number }[], time: number): void {
    const px = this.mazeOffsetX + pos.x * TILE_SIZE + TILE_SIZE / 2;
    const py = this.mazeOffsetY + pos.y * TILE_SIZE + TILE_SIZE / 2;

    for (const p of particles) {
      const angle = p.angle + time * p.speed * 0.003;
      const dist = 15 + p.distance * 10 + Math.sin(time * 0.005 + p.angle) * 5;
      const particleX = px + Math.cos(angle) * dist;
      const particleY = py + Math.sin(angle) * dist;

      const gradient = this.ctx.createRadialGradient(particleX, particleY, 0, particleX, particleY, p.size * 2);
      gradient.addColorStop(0, 'rgba(147, 112, 219, 0.9)');
      gradient.addColorStop(0.5, 'rgba(65, 105, 225, 0.5)');
      gradient.addColorStop(1, 'rgba(65, 105, 225, 0)');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(particleX, particleY, p.size * 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    for (let i = 0; i < 3; i++) {
      const ringRotation = rotation + i * (Math.PI * 2 / 3);
      const ringRadius = 18 + i * 6;
      
      this.ctx.save();
      this.ctx.translate(px, py);
      this.ctx.rotate(ringRotation);

      this.ctx.strokeStyle = i % 2 === 0 ? 'rgba(65, 105, 225, 0.6)' : 'rgba(147, 112, 219, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, ringRadius, 0, Math.PI * 1.2);
      this.ctx.stroke();

      this.ctx.strokeStyle = i % 2 === 0 ? 'rgba(147, 112, 219, 0.4)' : 'rgba(65, 105, 225, 0.4)';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, ringRadius, Math.PI, Math.PI * 2.2);
      this.ctx.stroke();

      this.ctx.restore();
    }

    const centerGlow = this.ctx.createRadialGradient(px, py, 0, px, py, 12);
    centerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    centerGlow.addColorStop(0.3, 'rgba(147, 112, 219, 0.6)');
    centerGlow.addColorStop(1, 'rgba(65, 105, 225, 0)');
    this.ctx.fillStyle = centerGlow;
    this.ctx.beginPath();
    this.ctx.arc(px, py, 12, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawInkSpread(spread: { x: number; y: number; radius: number; maxRadius: number; alpha: number }): void {
    const px = this.mazeOffsetX + spread.x * TILE_SIZE + TILE_SIZE / 2;
    const py = this.mazeOffsetY + spread.y * TILE_SIZE + TILE_SIZE / 2;

    const gradient = this.ctx.createRadialGradient(px, py, 0, px, py, spread.radius);
    gradient.addColorStop(0, `rgba(26, 26, 46, ${spread.alpha * 0.6})`);
    gradient.addColorStop(0.7, `rgba(26, 26, 46, ${spread.alpha * 0.3})`);
    gradient.addColorStop(1, 'rgba(26, 26, 46, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(px, py, spread.radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawPlayer(pos: Position, time: number): void {
    const px = this.mazeOffsetX + pos.x * TILE_SIZE + TILE_SIZE / 2;
    const py = this.mazeOffsetY + pos.y * TILE_SIZE + TILE_SIZE / 2;
    const wobble = Math.sin(time * 0.008) * 1.5;

    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;

    this.ctx.fillStyle = COLORS.INK_SPIRIT;
    this.ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 14 + Math.sin(time * 0.01 + i) * 2 + wobble * 0.5;
      const x = px + Math.cos(angle) * radius;
      const y = py + Math.sin(angle) * radius;
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();

    this.ctx.strokeStyle = COLORS.INK_SPIRIT_EDGE;
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 14 + Math.sin(time * 0.01 + i) * 2 + wobble * 0.5;
      const x = px + Math.cos(angle) * radius;
      const y = py + Math.sin(angle) * radius;
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.stroke();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.arc(px - 4, py - 2, 3, 0, Math.PI * 2);
    this.ctx.arc(px + 4, py - 2, 3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.beginPath();
    this.ctx.arc(px - 3, py - 2, 1.5, 0, Math.PI * 2);
    this.ctx.arc(px + 5, py - 2, 1.5, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawUI(state: RenderState, time: number): void {
    this.drawStatusPanel(state);
    this.drawMuralFragments(state.muralFragments, time);
    this.drawHintBar(state.hintText);
  }

  private drawStatusPanel(state: RenderState): void {
    const panelX = 20;
    const panelY = 60;
    const panelWidth = 180;
    const panelHeight = 120;

    this.ctx.save();
    this.ctx.fillStyle = COLORS.GLASS_BG;
    this.beginRoundedRect(panelX, panelY, panelWidth, panelHeight, 6);
    this.ctx.fill();

    this.ctx.strokeStyle = COLORS.GOLD;
    this.ctx.lineWidth = 1;
    this.beginRoundedRect(panelX, panelY, panelWidth, panelHeight, 6);
    this.ctx.stroke();

    this.ctx.fillStyle = COLORS.GOLD;
    this.ctx.font = '14px "Songti SC", "SimSun", serif';
    this.ctx.fillText('墨水精灵状态', panelX + 15, panelY + 28);

    this.ctx.fillStyle = COLORS.PASSAGE;
    this.ctx.font = '13px "Songti SC", "SimSun", serif';
    this.ctx.fillText('生命值:', panelX + 15, panelY + 52);

    for (let i = 0; i < 3; i++) {
      const heartX = panelX + 75 + i * 22;
      const heartY = panelY + 48;
      if (i < state.health) {
        this.ctx.fillStyle = '#CD5C5C';
        this.drawHeart(heartX, heartY, 8);
      } else {
        this.ctx.fillStyle = 'rgba(205, 92, 92, 0.3)';
        this.drawHeart(heartX, heartY, 8);
      }
    }

    this.ctx.fillStyle = COLORS.PASSAGE;
    this.ctx.fillText('已拓符文:', panelX + 15, panelY + 80);
    
    this.ctx.fillStyle = COLORS.RUNE_ACTIVE;
    this.ctx.font = 'bold 16px "Songti SC", "SimSun", serif';
    this.ctx.fillText(`${state.activatedCount} / 6`, panelX + 95, panelY + 80);

    this.ctx.fillStyle = COLORS.PASSAGE;
    this.ctx.font = '13px "Songti SC", "SimSun", serif';
    this.ctx.fillText('壁画碎片:', panelX + 15, panelY + 105);
    
    this.ctx.fillStyle = COLORS.RUNE_ACTIVE;
    this.ctx.font = 'bold 16px "Songti SC", "SimSun", serif';
    this.ctx.fillText(`${state.muralFragments.length} / 6`, panelX + 95, panelY + 105);

    this.ctx.restore();
  }

  private drawHeart(x: number, y: number, size: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + size * 0.3);
    this.ctx.bezierCurveTo(x, y, x - size, y, x - size, y + size * 0.3);
    this.ctx.bezierCurveTo(x - size, y + size * 0.6, x, y + size * 0.8, x, y + size);
    this.ctx.bezierCurveTo(x, y + size * 0.8, x + size, y + size * 0.6, x + size, y + size * 0.3);
    this.ctx.bezierCurveTo(x + size, y, x, y, x, y + size * 0.3);
    this.ctx.fill();
  }

  private drawMuralFragments(fragments: MuralFragment[], time: number): void {
    const startX = 760;
    const startY = 60;
    const size = 64;
    const gap = 12;

    this.ctx.fillStyle = COLORS.GOLD;
    this.ctx.font = '14px "Songti SC", "SimSun", serif';
    this.ctx.fillText('壁画碎片', startX, startY - 10);

    for (let i = 0; i < 6; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const x = startX + col * (size + gap);
      const y = startY + row * (size + gap);

      this.ctx.save();
      this.ctx.fillStyle = COLORS.MURAL_BG;
      this.beginRoundedRect(x, y, size, size, 6);
      this.ctx.fill();

      this.ctx.strokeStyle = COLORS.GOLD;
      this.ctx.lineWidth = 1;
      this.beginRoundedRect(x, y, size, size, 6);
      this.ctx.stroke();

      if (fragments[i]) {
        this.drawMuralFragment(fragments[i], x, y, size, time);
      } else {
        this.ctx.fillStyle = 'rgba(184, 134, 11, 0.3)';
        this.ctx.font = '24px "Songti SC", serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('?', x + size / 2, y + size / 2 + 8);
        this.ctx.textAlign = 'left';
      }

      this.ctx.restore();
    }
  }

  private drawMuralFragment(fragment: MuralFragment, x: number, y: number, size: number, time: number): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.beginRoundedRect(x + 4, y + 4, size - 8, size - 8, 4);
    this.ctx.clip();

    const bgGradient = this.ctx.createLinearGradient(x, y, x + size, y + size);
    bgGradient.addColorStop(0, fragment.colors[0]);
    bgGradient.addColorStop(1, fragment.colors[1]);
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(x + 4, y + 4, size - 8, size - 8);

    for (const shape of fragment.shapes) {
      this.ctx.save();
      this.ctx.translate(x + shape.x, y + shape.y);
      this.ctx.rotate(shape.rotation + time * 0.0005);
      this.ctx.fillStyle = shape.color;
      this.ctx.globalAlpha = 0.8;

      if (shape.type === 'triangle') {
        this.ctx.beginPath();
        this.ctx.moveTo(0, -shape.size);
        this.ctx.lineTo(shape.size * 0.866, shape.size * 0.5);
        this.ctx.lineTo(-shape.size * 0.866, shape.size * 0.5);
        this.ctx.closePath();
        this.ctx.fill();
      } else if (shape.type === 'circle') {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, shape.size, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (shape.type === 'square') {
        this.ctx.fillRect(-shape.size / 2, -shape.size / 2, shape.size, shape.size);
      } else if (shape.type === 'diamond') {
        this.ctx.beginPath();
        this.ctx.moveTo(0, -shape.size);
        this.ctx.lineTo(shape.size, 0);
        this.ctx.lineTo(0, shape.size);
        this.ctx.lineTo(-shape.size, 0);
        this.ctx.closePath();
        this.ctx.fill();
      }

      this.ctx.restore();
    }

    this.ctx.restore();
  }

  private drawHintBar(text: string): void {
    const barWidth = 300;
    const barHeight = 36;
    const barX = (this.width - barWidth) / 2;
    const barY = this.height - 50;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(26, 35, 58, 0.7)';
    this.beginRoundedRect(barX, barY, barWidth, barHeight, 6);
    this.ctx.fill();

    this.ctx.strokeStyle = COLORS.GOLD;
    this.ctx.lineWidth = 1;
    this.beginRoundedRect(barX, barY, barWidth, barHeight, 6);
    this.ctx.stroke();

    this.ctx.fillStyle = COLORS.PASSAGE;
    this.ctx.font = '14px "Songti SC", "SimSun", serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, this.width / 2, barY + 24);
    this.ctx.textAlign = 'left';

    this.ctx.restore();
  }

  private drawVictoryOverlay(progress: number, score: number): void {
    this.ctx.save();
    
    const alpha = Math.min(progress * 2, 1);
    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (progress >= 0.5) {
      const contentAlpha = (progress - 0.5) * 2;
      this.ctx.globalAlpha = contentAlpha;
      
      this.ctx.fillStyle = '#1A233A';
      this.ctx.font = 'bold 48px "Songti SC", "SimSun", serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('通 关 成 功', this.width / 2, this.height / 2 - 60);

      this.ctx.fillStyle = '#B8860B';
      this.ctx.font = '28px "Songti SC", "SimSun", serif';
      this.ctx.fillText(`最终得分: ${score}`, this.width / 2, this.height / 2 + 10);

      this.ctx.fillStyle = '#4A4E59';
      this.ctx.font = '18px "Songti SC", "SimSun", serif';
      this.ctx.fillText('古老的符文已被唤醒...', this.width / 2, this.height / 2 + 60);

      this.ctx.fillStyle = '#8B0000';
      this.ctx.font = '16px "Songti SC", "SimSun", serif';
      this.ctx.fillText('按 R 键重新开始', this.width / 2, this.height / 2 + 110);

      this.ctx.textAlign = 'left';
    }

    this.ctx.restore();
  }

  private beginRoundedRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  public generateMuralFragment(): MuralFragment {
    const colorPalettes = [
      ['#E8D4A8', '#C4A35A'],
      ['#A8D4E8', '#5A9AC4'],
      ['#E8A8D4', '#C45AA3'],
      ['#D4E8A8', '#9AC45A'],
      ['#E8C4A8', '#C47D5A'],
      ['#A8A8E8', '#5A5AC4']
    ];
    
    const palette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
    const shapeTypes = ['triangle', 'circle', 'square', 'diamond'];
    const shapes = [];
    const shapeCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < shapeCount; i++) {
      shapes.push({
        type: shapeTypes[Math.floor(Math.random() * shapeTypes.length)],
        x: 12 + Math.random() * 40,
        y: 12 + Math.random() * 40,
        size: 6 + Math.random() * 14,
        rotation: Math.random() * Math.PI * 2,
        color: palette[Math.floor(Math.random() * palette.length)]
      });
    }

    return {
      id: Date.now(),
      colors: palette,
      shapes
    };
  }
}

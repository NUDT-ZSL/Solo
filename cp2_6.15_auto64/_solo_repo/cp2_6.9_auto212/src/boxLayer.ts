import { drawNoiseTexture, drawWoodGrain } from './effects';

export interface InteractiveElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hovered: boolean;
  pressed: boolean;
  scale: number;
  targetScale: number;
  type: 'gear' | 'latch' | 'cell' | 'puzzle' | 'dial';
}

export interface Gear extends InteractiveElement {
  color: string;
  rotation: number;
  targetRotation: number;
  activated: boolean;
  latchOut: boolean;
  latchProgress: number;
}

export interface Latch extends InteractiveElement {
  pattern: number;
  slotId: number;
  currentSlot: number | null;
  dragging: boolean;
  dragOffsetX: number;
  dragOffsetY: number;
  correct: boolean;
}

export interface Slot {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  pattern: number;
  filled: boolean;
}

export interface Cell extends InteractiveElement {
  lit: boolean;
  orderIndex: number;
  correctOrder: number;
  litProgress: number;
}

export interface PuzzlePiece extends InteractiveElement {
  rotation: number;
  targetRotation: number;
  dragging: boolean;
  dragOffsetX: number;
  dragOffsetY: number;
  targetX: number;
  targetY: number;
  correctAngle: number;
  placed: boolean;
  points: { x: number; y: number }[];
  color: string;
}

export interface Dial extends InteractiveElement {
  value: number;
  targetValue: number;
  rotationOffset: number;
}

export class BoxLayer {
  currentLayer: number = 1;
  totalLayers: number = 5;

  private boxX: number = 0;
  private boxY: number = 0;
  private boxW: number = 0;
  private boxH: number = 0;

  gears: Gear[] = [];
  gearOrder: number[] = [];
  gearClickSequence: number[] = [];

  latches: Latch[] = [];
  slots: Slot[] = [];

  cells: Cell[] = [];
  cellLightSequence: number[] = [];
  cellPlayerSequence: number[] = [];
  cellShowingSequence: boolean = false;
  cellSequenceIndex: number = 0;
  cellSequenceTimer: number = 0;
  cellPlayerTurn: boolean = false;

  puzzlePieces: PuzzlePiece[] = [];
  puzzleCenterX: number = 0;
  puzzleCenterY: number = 0;

  dials: Dial[] = [];
  correctPassword: number[] = [0, 0, 0, 0];
  hintDigits: number[] = [];

  layerTimer: number = 0;
  layerTimeLimit: number = 10;
  layerFailed: boolean = false;
  layerSolved: boolean = false;

  private pentagonRadius = 70;

  setBoxDimensions(x: number, y: number, w: number, h: number): void {
    this.boxX = x;
    this.boxY = y;
    this.boxW = w;
    this.boxH = h;
  }

  initLayer(layer: number): void {
    this.currentLayer = layer;
    this.layerTimer = 0;
    this.layerFailed = false;
    this.layerSolved = false;

    switch (layer) {
      case 1:
        this.initLayer1();
        break;
      case 2:
        this.initLayer2();
        break;
      case 3:
        this.initLayer3();
        break;
      case 4:
        this.initLayer4();
        break;
      case 5:
        this.initLayer5();
        break;
    }
  }

  private initLayer1(): void {
    this.layerTimeLimit = 10;
    const centerX = this.boxX + this.boxW / 2;
    const centerY = this.boxY + this.boxH / 2;
    const radius = Math.min(this.boxW, this.boxH) * 0.18;

    const colors = ['#E74C3C', '#2ECC71', '#3498DB'];
    this.gears = [];
    for (let i = 0; i < 3; i++) {
      const angle = (-Math.PI / 2) + (i * 2 * Math.PI / 3);
      this.gears.push({
        id: `gear_${i}`,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        width: 60,
        height: 60,
        hovered: false,
        pressed: false,
        scale: 1,
        targetScale: 1,
        type: 'gear',
        color: colors[i],
        rotation: 0,
        targetRotation: 0,
        activated: false,
        latchOut: false,
        latchProgress: 0,
      });
    }
    this.gearOrder = [0, 1, 2];
    this.gearClickSequence = [];
    this.hintDigits[0] = 3;
  }

  private initLayer2(): void {
    this.layerTimeLimit = 10;
    const centerX = this.boxX + this.boxW / 2;
    const centerY = this.boxY + this.boxH / 2;

    this.latches = [];
    this.slots = [];

    for (let i = 0; i < 4; i++) {
      this.slots.push({
        id: i,
        x: centerX - 180 + i * 100,
        y: centerY - 60,
        width: 60,
        height: 60,
        pattern: i,
        filled: false,
      });
    }

    const latchOrder = [2, 0, 3, 1];
    for (let i = 0; i < 4; i++) {
      const startX = centerX - 180 + i * 100;
      this.latches.push({
        id: `latch_${i}`,
        x: startX,
        y: centerY + 80,
        width: 60,
        height: 60,
        hovered: false,
        pressed: false,
        scale: 1,
        targetScale: 1,
        type: 'latch',
        pattern: latchOrder[i],
        slotId: latchOrder[i],
        currentSlot: null,
        dragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0,
        correct: false,
      });
    }
    this.hintDigits[1] = 7;
  }

  private initLayer3(): void {
    this.layerTimeLimit = 10;
    const centerX = this.boxX + this.boxW / 2;
    const centerY = this.boxY + this.boxH / 2;
    const cellSize = 50;
    const gap = 10;

    this.cells = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col;
        this.cells.push({
          id: `cell_${idx}`,
          x: centerX - (3 * cellSize + 2 * gap) / 2 + col * (cellSize + gap),
          y: centerY - (3 * cellSize + 2 * gap) / 2 + row * (cellSize + gap),
          width: cellSize,
          height: cellSize,
          hovered: false,
          pressed: false,
          scale: 1,
          targetScale: 1,
          type: 'cell',
          lit: false,
          orderIndex: idx,
          correctOrder: idx,
          litProgress: 0,
        });
      }
    }

    this.cellLightSequence = [0, 4, 8, 2, 6, 1, 3, 5, 7];
    this.cellPlayerSequence = [];
    this.cellShowingSequence = true;
    this.cellSequenceIndex = 0;
    this.cellSequenceTimer = 0;
    this.cellPlayerTurn = false;
    this.hintDigits[2] = 1;
  }

  private initLayer4(): void {
    this.layerTimeLimit = 10;
    this.puzzleCenterX = this.boxX + this.boxW / 2;
    this.puzzleCenterY = this.boxY + this.boxH / 2;

    this.puzzlePieces = [];

    const pieceColors = ['#E74C3C', '#2ECC71', '#3498DB', '#F1C40F', '#9B59B6'];

    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
      const points = this.generatePentagonPiecePoints(i);

      const startX = this.puzzleCenterX - 200 + (i % 3) * 80;
      const startY = this.puzzleCenterY + 150 + Math.floor(i / 3) * 70;

      this.puzzlePieces.push({
        id: `piece_${i}`,
        x: startX,
        y: startY,
        width: 60,
        height: 60,
        hovered: false,
        pressed: false,
        scale: 1,
        targetScale: 1,
        type: 'puzzle',
        rotation: Math.floor(Math.random() * 4) * (Math.PI * 2 / 5),
        targetRotation: 0,
        dragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0,
        targetX: this.puzzleCenterX + Math.cos(angle) * this.pentagonRadius * 0.3,
        targetY: this.puzzleCenterY + Math.sin(angle) * this.pentagonRadius * 0.3,
        correctAngle: angle,
        placed: false,
        points,
        color: pieceColors[i],
      });
    }
    this.hintDigits[3] = 5;
  }

  private generatePentagonPiecePoints(pieceIndex: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const baseAngle = (pieceIndex * 2 * Math.PI / 5) - Math.PI / 2;

    points.push({ x: 0, y: 0 });
    for (let i = 0; i <= 1; i++) {
      const angle = baseAngle + (i * 2 * Math.PI / 5);
      points.push({
        x: Math.cos(angle) * this.pentagonRadius,
        y: Math.sin(angle) * this.pentagonRadius,
      });
    }
    return points;
  }

  private initLayer5(): void {
    this.layerTimeLimit = 15;
    const centerX = this.boxX + this.boxW / 2;
    const centerY = this.boxY + this.boxH / 2;

    this.dials = [];
    for (let i = 0; i < 4; i++) {
      this.dials.push({
        id: `dial_${i}`,
        x: centerX - 150 + i * 100,
        y: centerY,
        width: 70,
        height: 90,
        hovered: false,
        pressed: false,
        scale: 1,
        targetScale: 1,
        type: 'dial',
        value: 0,
        targetValue: 0,
        rotationOffset: 0,
      });
    }

    this.correctPassword = [this.hintDigits[0], this.hintDigits[1], this.hintDigits[2], this.hintDigits[3]];
  }

  update(dt: number): void {
    this.layerTimer += dt;

    for (const gear of this.gears) {
      gear.rotation += (gear.targetRotation - gear.rotation) * 0.1;
      gear.scale += (gear.targetScale - gear.scale) * 0.2;
      if (gear.latchOut && gear.latchProgress < 1) {
        gear.latchProgress = Math.min(1, gear.latchProgress + dt * 3);
      }
    }

    for (const latch of this.latches) {
      latch.scale += (latch.targetScale - latch.scale) * 0.2;
    }

    for (const cell of this.cells) {
      cell.scale += (cell.targetScale - cell.scale) * 0.2;
      if (cell.lit && cell.litProgress < 1) {
        cell.litProgress = Math.min(1, cell.litProgress + dt * 5);
      } else if (!cell.lit && cell.litProgress > 0) {
        cell.litProgress = Math.max(0, cell.litProgress - dt * 5);
      }
    }

    if (this.cellShowingSequence && !this.cellPlayerTurn) {
      this.cellSequenceTimer += dt;
      if (this.cellSequenceTimer > 0.5) {
        this.cellSequenceTimer = 0;
        if (this.cellSequenceIndex < this.cellLightSequence.length) {
          const cellIdx = this.cellLightSequence[this.cellSequenceIndex];
          this.cells[cellIdx].lit = !this.cells[cellIdx].lit;
          if (!this.cells[cellIdx].lit) {
            this.cellSequenceIndex++;
          }
        } else {
          this.cellShowingSequence = false;
          this.cellPlayerTurn = true;
        }
      }
    }

    for (const piece of this.puzzlePieces) {
      piece.scale += (piece.targetScale - piece.scale) * 0.2;
      piece.rotation += (piece.targetRotation - piece.rotation) * 0.1;
    }

    for (const dial of this.dials) {
      dial.scale += (dial.targetScale - dial.scale) * 0.2;
      dial.value += (dial.targetValue - dial.value) * 0.1;
    }

    if (!this.layerFailed && !this.layerSolved && this.layerTimer >= this.layerTimeLimit) {
      this.layerFailed = true;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderBox(ctx);

    switch (this.currentLayer) {
      case 1:
        this.renderLayer1(ctx);
        break;
      case 2:
        this.renderLayer2(ctx);
        break;
      case 3:
        this.renderLayer3(ctx);
        break;
      case 4:
        this.renderLayer4(ctx);
        break;
      case 5:
        this.renderLayer5(ctx);
        break;
    }
  }

  private renderBox(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(this.boxX, this.boxY, this.boxX, this.boxY + this.boxH);
    gradient.addColorStop(0, '#CD7F32');
    gradient.addColorStop(0.5, '#B87333');
    gradient.addColorStop(1, '#CD7F32');

    ctx.fillStyle = gradient;
    ctx.fillRect(this.boxX, this.boxY, this.boxW, this.boxH);

    drawWoodGrain(ctx, this.boxX, this.boxY, this.boxW, this.boxH);
    drawNoiseTexture(ctx, this.boxX, this.boxY, this.boxW, this.boxH);

    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.boxX, this.boxY, this.boxW, this.boxH);

    ctx.save();
    ctx.strokeStyle = 'rgba(184, 134, 11, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.boxX + 8, this.boxY + 8, this.boxW - 16, this.boxH - 16);
    ctx.restore();
  }

  private renderLayer1(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.gears.length; i++) {
      const gear = this.gears[i];
      const orderNum = this.gearOrder.indexOf(i) + 1;

      ctx.save();
      ctx.translate(gear.x, gear.y);
      ctx.scale(gear.scale, gear.scale);
      ctx.rotate(gear.rotation);

      if (gear.hovered) {
        ctx.shadowColor = gear.color;
        ctx.shadowBlur = 15;
      }

      const teethCount = 10;
      const outerRadius = 28;
      const innerRadius = 20;

      ctx.beginPath();
      for (let j = 0; j < teethCount * 2; j++) {
        const angle = (j * Math.PI) / teethCount;
        const r = j % 2 === 0 ? outerRadius : innerRadius;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      ctx.fillStyle = gear.color;
      ctx.fill();
      ctx.strokeStyle = '#00000060';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#2C3E50';
      ctx.fill();
      ctx.strokeStyle = '#00000080';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(5, -5);
      ctx.lineTo(-5, -5);
      ctx.closePath();
      ctx.fillStyle = gear.activated ? '#FFFFFF' : '#2C3E50';
      ctx.fill();

      ctx.restore();

      if (gear.latchOut) {
        ctx.save();
        ctx.translate(gear.x, gear.y);
        const latchOffset = gear.latchProgress * 30;
        ctx.fillStyle = '#B8860B';
        ctx.fillRect(-5, -30 - latchOffset, 10, 25);
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 1;
        ctx.strokeRect(-5, -30 - latchOffset, 10, 25);
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = gear.activated ? '#2ECC71' : '#FFFFFF';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(orderNum.toString(), gear.x, gear.y - 45);
      ctx.restore();
    }
  }

  private renderLayer2(ctx: CanvasRenderingContext2D): void {
    for (const slot of this.slots) {
      ctx.save();
      ctx.fillStyle = '#2C3E50';
      ctx.fillRect(slot.x, slot.y, slot.width, slot.height);

      this.renderPattern(ctx, slot.x + slot.width / 2, slot.y + slot.height / 2, slot.pattern, 20, '#4A5568');

      ctx.strokeStyle = '#1A202C';
      ctx.lineWidth = 2;
      ctx.strokeRect(slot.x, slot.y, slot.width, slot.height);

      if (slot.filled) {
        ctx.strokeStyle = '#2ECC71';
        ctx.lineWidth = 3;
        ctx.strokeRect(slot.x - 2, slot.y - 2, slot.width + 4, slot.height + 4);
      }
      ctx.restore();
    }

    for (const latch of this.latches) {
      ctx.save();
      ctx.translate(latch.x + latch.width / 2, latch.y + latch.height / 2);
      ctx.scale(latch.scale, latch.scale);

      if (latch.hovered && !latch.dragging) {
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 15;
      }

      ctx.fillStyle = latch.correct ? '#2ECC71' : '#7F8C8D';
      ctx.fillRect(-latch.width / 2, -latch.height / 2, latch.width, latch.height);

      this.renderPattern(ctx, 0, 0, latch.pattern, 20, latch.correct ? '#27AE60' : '#5D6D7E');

      ctx.strokeStyle = '#2C3E50';
      ctx.lineWidth = 2;
      ctx.strokeRect(-latch.width / 2, -latch.height / 2, latch.width, latch.height);
      ctx.restore();
    }
  }

  private renderPattern(ctx: CanvasRenderingContext2D, cx: number, cy: number, pattern: number, size: number, color: string): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    switch (pattern) {
      case 0:
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 1:
        ctx.fillRect(cx - size * 0.4, cy - size * 0.4, size * 0.8, size * 0.8);
        break;
      case 2:
        ctx.beginPath();
        ctx.moveTo(cx, cy - size * 0.5);
        ctx.lineTo(cx - size * 0.45, cy + size * 0.3);
        ctx.lineTo(cx + size * 0.45, cy + size * 0.3);
        ctx.closePath();
        ctx.fill();
        break;
      case 3:
        ctx.beginPath();
        ctx.moveTo(cx, cy - size * 0.5);
        ctx.lineTo(cx + size * 0.45, cy);
        ctx.lineTo(cx, cy + size * 0.5);
        ctx.lineTo(cx - size * 0.45, cy);
        ctx.closePath();
        ctx.fill();
        break;
    }
    ctx.restore();
  }

  private renderLayer3(ctx: CanvasRenderingContext2D): void {
    for (const cell of this.cells) {
      ctx.save();
      ctx.translate(cell.x + cell.width / 2, cell.y + cell.height / 2);
      ctx.scale(cell.scale, cell.scale);

      const litAmount = cell.litProgress;
      const baseColor = this.lerpColor('#2C3E50', '#F1C40F', litAmount);

      ctx.fillStyle = baseColor;
      ctx.fillRect(-cell.width / 2, -cell.height / 2, cell.width, cell.height);

      if (litAmount > 0.5) {
        ctx.shadowColor = '#F1C40F';
        ctx.shadowBlur = 10 + litAmount * 10;
      }

      ctx.strokeStyle = '#1A202C';
      ctx.lineWidth = 2;
      ctx.strokeRect(-cell.width / 2, -cell.height / 2, cell.width, cell.height);

      if (cell.hovered && this.cellPlayerTurn) {
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 10;
      }
      ctx.restore();
    }

    if (!this.cellPlayerTurn) {
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('观察序列...', this.boxX + this.boxW / 2, this.boxY + this.boxH - 40);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('按顺序点击所有暗格', this.boxX + this.boxW / 2, this.boxY + this.boxH - 40);
      ctx.restore();
    }
  }

  private renderLayer4(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
      const px = this.puzzleCenterX + Math.cos(angle) * this.pentagonRadius;
      const py = this.puzzleCenterY + Math.sin(angle) * this.pentagonRadius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    for (const piece of this.puzzlePieces) {
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rotation);
      ctx.scale(piece.scale, piece.scale);

      if (piece.hovered && !piece.dragging) {
        ctx.shadowColor = piece.color;
        ctx.shadowBlur = 15;
      }

      ctx.beginPath();
      ctx.moveTo(piece.points[0].x, piece.points[0].y);
      for (let i = 1; i < piece.points.length; i++) {
        ctx.lineTo(piece.points[i].x, piece.points[i].y);
      }
      ctx.closePath();

      ctx.fillStyle = piece.placed ? piece.color : piece.color + 'AA';
      ctx.fill();
      ctx.strokeStyle = piece.placed ? '#FFD700' : '#000000';
      ctx.lineWidth = piece.placed ? 3 : 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderLayer5(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.dials.length; i++) {
      const dial = this.dials[i];

      ctx.save();
      ctx.translate(dial.x + dial.width / 2, dial.y + dial.height / 2);
      ctx.scale(dial.scale, dial.scale);

      if (dial.hovered) {
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 15;
      }

      ctx.fillStyle = '#2C3E50';
      ctx.beginPath();
      ctx.roundRect(-dial.width / 2, -dial.height / 2, dial.width, dial.height, 8);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-dial.width / 2 + 5, -dial.height / 2 + 5, dial.width - 10, dial.height - 10, 5);
      ctx.clip();

      const displayVal = Math.round(dial.value) % 10;
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayVal.toString(), 0, 0);
      ctx.restore();

      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-dial.width / 2, -dial.height / 2, dial.width, dial.height, 8);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(0, -dial.height / 2 - 8);
      ctx.lineTo(8, -dial.height / 2);
      ctx.lineTo(-8, -dial.height / 2);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, dial.height / 2 + 8);
      ctx.lineTo(8, dial.height / 2);
      ctx.lineTo(-8, dial.height / 2);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const hintText = `提示：前四层线索 (点击箭头调整)`;
    ctx.fillText(hintText, this.boxX + this.boxW / 2, this.boxY + this.boxH - 30);
    ctx.restore();
  }

  private lerpColor(c1: string, c2: string, t: number): string {
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

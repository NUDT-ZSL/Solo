import { BoxLayer, Gear, Latch, Cell, PuzzlePiece, Dial } from './boxLayer';
import { Effects } from './effects';

export interface GameState {
  currentLayer: number;
  totalLayers: number;
  totalTime: number;
  maxTotalTime: number;
  gameWon: boolean;
  gameLost: boolean;
  transitioning: boolean;
}

export class PuzzleMechanics {
  private boxLayer: BoxLayer;
  private effects: Effects;
  private state: GameState;

  constructor(boxLayer: BoxLayer, effects: Effects) {
    this.boxLayer = boxLayer;
    this.effects = effects;
    this.state = {
      currentLayer: 1,
      totalLayers: 5,
      totalTime: 0,
      maxTotalTime: 300,
      gameWon: false,
      gameLost: false,
      transitioning: false,
    };
  }

  getState(): GameState {
    return { ...this.state };
  }

  resetGame(): void {
    this.state.currentLayer = 1;
    this.state.totalTime = 0;
    this.state.gameWon = false;
    this.state.gameLost = false;
    this.state.transitioning = false;
    this.boxLayer.initLayer(1);
  }

  resetCurrentLayer(): void {
    this.boxLayer.initLayer(this.state.currentLayer);
  }

  update(dt: number): void {
    if (!this.state.gameWon && !this.state.gameLost) {
      this.state.totalTime += dt;

      if (this.state.totalTime >= this.state.maxTotalTime) {
        this.state.gameLost = true;
        this.effects.flashScreen('#E74C3C');
      }
    }

    this.boxLayer.update(dt);

    if (this.boxLayer.layerFailed && !this.state.transitioning) {
      this.effects.flashScreen('#E74C3C');
      setTimeout(() => {
        this.boxLayer.initLayer(this.state.currentLayer);
      }, 500);
    }

    this.checkLayerSolved();
  }

  private checkLayerSolved(): void {
    if (this.state.transitioning || this.boxLayer.layerSolved) return;

    let solved = false;

    switch (this.state.currentLayer) {
      case 1:
        solved = this.checkLayer1Solved();
        break;
      case 2:
        solved = this.checkLayer2Solved();
        break;
      case 3:
        solved = this.checkLayer3Solved();
        break;
      case 4:
        solved = this.checkLayer4Solved();
        break;
      case 5:
        solved = this.checkLayer5Solved();
        break;
    }

    if (solved) {
      this.boxLayer.layerSolved = true;
      this.state.transitioning = true;

      const boxCX = this.boxLayer['boxX'] + this.boxLayer['boxW'] / 2;
      const boxCY = this.boxLayer['boxY'] + this.boxLayer['boxH'] / 2;
      this.effects.emitParticles(boxCX, boxCY, 50);

      if (this.state.currentLayer < this.state.totalLayers) {
        this.effects.showTransitionText(`第${this.state.currentLayer}层解锁！`);
        setTimeout(() => {
          this.state.currentLayer++;
          this.boxLayer.initLayer(this.state.currentLayer);
          this.state.transitioning = false;
        }, 2000);
      } else {
        this.state.gameWon = true;
        this.effects.showTransitionText('宝藏已获得！');
      }
    }
  }

  private checkLayer1Solved(): boolean {
    return this.boxLayer.gears.every(g => g.activated);
  }

  private checkLayer2Solved(): boolean {
    return this.boxLayer.latches.every(l => l.correct);
  }

  private checkLayer3Solved(): boolean {
    if (!this.boxLayer.cellPlayerTurn) return false;
    return this.boxLayer.cellPlayerSequence.length === this.boxLayer.cellLightSequence.length;
  }

  private checkLayer4Solved(): boolean {
    return this.boxLayer.puzzlePieces.every(p => p.placed);
  }

  private checkLayer5Solved(): boolean {
    for (let i = 0; i < 4; i++) {
      if (Math.round(this.boxLayer.dials[i].value) % 10 !== this.boxLayer.correctPassword[i]) {
        return false;
      }
    }
    return true;
  }

  handleClick(canvasX: number, canvasY: number, width: number, height: number): string | null {
    const { scaledX, scaledY } = this.scaleCoordinates(canvasX, canvasY, width, height);

    if (this.state.gameWon || this.state.gameLost) return null;

    switch (this.state.currentLayer) {
      case 1:
        return this.handleLayer1Click(scaledX, scaledY);
      case 3:
        return this.handleLayer3Click(scaledX, scaledY);
      case 5:
        return this.handleLayer5Click(scaledX, scaledY);
      default:
        return null;
    }
  }

  private handleLayer1Click(x: number, y: number): string | null {
    for (let i = 0; i < this.boxLayer.gears.length; i++) {
      const gear = this.boxLayer.gears[i];
      if (this.hitTestCircle(x, y, gear.x, gear.y, 35) && !gear.activated) {
        const expectedIndex = this.boxLayer.gearClickSequence.length;
        const expectedGearIdx = this.boxLayer.gearOrder[expectedIndex];

        if (i === expectedGearIdx) {
          this.activateGear(gear);
          this.boxLayer.gearClickSequence.push(i);
          return 'correct';
        } else {
          this.effects.flashScreen('#E74C3C');
          this.boxLayer.layerFailed = true;
          return 'wrong';
        }
      }
    }
    return null;
  }

  private activateGear(gear: Gear): void {
    gear.targetRotation += Math.PI / 2;
    gear.activated = true;
    setTimeout(() => {
      gear.latchOut = true;
    }, 300);
    this.effects.emitParticles(gear.x, gear.y, 10);
  }

  private handleLayer3Click(x: number, y: number): string | null {
    if (!this.boxLayer.cellPlayerTurn) return null;

    for (let i = 0; i < this.boxLayer.cells.length; i++) {
      const cell = this.boxLayer.cells[i];
      if (this.hitTestRect(x, y, cell.x, cell.y, cell.width, cell.height) && !cell.lit) {
        const expectedIdx = this.boxLayer.cellLightSequence[this.boxLayer.cellPlayerSequence.length];

        if (i === expectedIdx) {
          cell.lit = true;
          cell.targetScale = 0.95;
          setTimeout(() => { cell.targetScale = 1; }, 150);
          this.boxLayer.cellPlayerSequence.push(i);
          this.effects.emitParticles(cell.x + cell.width / 2, cell.y + cell.height / 2, 5);
          return 'correct';
        } else {
          this.effects.flashScreen('#E74C3C');
          this.boxLayer.layerFailed = true;
          return 'wrong';
        }
      }
    }
    return null;
  }

  private handleLayer5Click(x: number, y: number): string | null {
    for (let i = 0; i < this.boxLayer.dials.length; i++) {
      const dial = this.boxLayer.dials[i];
      const topArrowY = dial.y - 8;
      const bottomArrowY = dial.y + dial.height + 8;

      if (this.hitTestTriangle(x, y, dial.x + dial.width / 2, topArrowY, 8, true)) {
        dial.targetValue = (dial.targetValue + 1) % 10;
        dial.targetScale = 0.95;
        setTimeout(() => { dial.targetScale = 1; }, 150);
        return 'dial_up';
      }

      if (this.hitTestTriangle(x, y, dial.x + dial.width / 2, bottomArrowY, 8, false)) {
        dial.targetValue = (dial.targetValue + 9) % 10;
        dial.targetScale = 0.95;
        setTimeout(() => { dial.targetScale = 1; }, 150);
        return 'dial_down';
      }
    }
    return null;
  }

  handleMouseDown(canvasX: number, canvasY: number, width: number, height: number): void {
    const { scaledX, scaledY } = this.scaleCoordinates(canvasX, canvasY, width, height);

    if (this.state.currentLayer === 2) {
      this.handleLayer2MouseDown(scaledX, scaledY);
    } else if (this.state.currentLayer === 4) {
      this.handleLayer4MouseDown(scaledX, scaledY);
    }
  }

  private handleLayer2MouseDown(x: number, y: number): void {
    for (const latch of this.boxLayer.latches) {
      if (!latch.correct && this.hitTestRect(x, y, latch.x, latch.y, latch.width, latch.height)) {
        latch.dragging = true;
        latch.dragOffsetX = x - (latch.x + latch.width / 2);
        latch.dragOffsetY = y - (latch.y + latch.height / 2);
        latch.targetScale = 0.95;
        break;
      }
    }
  }

  private handleLayer4MouseDown(x: number, y: number): void {
    for (const piece of this.boxLayer.puzzlePieces) {
      if (!piece.placed) {
        if (this.hitTestRotatedPiece(x, y, piece)) {
          piece.dragging = true;
          piece.dragOffsetX = x - piece.x;
          piece.dragOffsetY = y - piece.y;
          piece.targetScale = 0.95;
          break;
        }
      }
    }
  }

  handleMouseMove(canvasX: number, canvasY: number, width: number, height: number): void {
    const { scaledX, scaledY } = this.scaleCoordinates(canvasX, canvasY, width, height);

    if (this.state.currentLayer === 2) {
      this.handleLayer2MouseMove(scaledX, scaledY);
    } else if (this.state.currentLayer === 4) {
      this.handleLayer4MouseMove(scaledX, scaledY);
    }

    this.updateHoverStates(scaledX, scaledY);
  }

  private handleLayer2MouseMove(x: number, y: number): void {
    for (const latch of this.boxLayer.latches) {
      if (latch.dragging) {
        latch.x = x - latch.dragOffsetX - latch.width / 2;
        latch.y = y - latch.dragOffsetY - latch.height / 2;
      }
    }
  }

  private handleLayer4MouseMove(x: number, y: number): void {
    for (const piece of this.boxLayer.puzzlePieces) {
      if (piece.dragging) {
        piece.x = x - piece.dragOffsetX;
        piece.y = y - piece.dragOffsetY;
      }
    }
  }

  handleMouseUp(canvasX: number, canvasY: number, width: number, height: number): void {
    if (this.state.currentLayer === 2) {
      this.handleLayer2MouseUp();
    } else if (this.state.currentLayer === 4) {
      this.handleLayer4MouseUp();
    }
  }

  private handleLayer2MouseUp(): void {
    for (const latch of this.boxLayer.latches) {
      if (latch.dragging) {
        latch.dragging = false;
        latch.targetScale = 1;

        let matched = false;
        for (const slot of this.boxLayer.slots) {
          if (!slot.filled) {
            const dx = (latch.x + latch.width / 2) - (slot.x + slot.width / 2);
            const dy = (latch.y + latch.height / 2) - (slot.y + slot.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 40) {
              if (slot.pattern === latch.pattern) {
                latch.x = slot.x;
                latch.y = slot.y;
                latch.correct = true;
                latch.currentSlot = slot.id;
                slot.filled = true;
                this.effects.emitParticles(slot.x + slot.width / 2, slot.y + slot.height / 2, 10);
              } else {
                this.returnLatchToStart(latch);
                this.effects.flashScreen('#E74C3C');
              }
              matched = true;
              break;
            }
          }
        }

        if (!matched) {
          this.returnLatchToStart(latch);
        }
      }
    }
  }

  private returnLatchToStart(latch: Latch): void {
    const centerX = this.boxLayer['boxX'] + this.boxLayer['boxW'] / 2;
    const centerY = this.boxLayer['boxY'] + this.boxLayer['boxH'] / 2;
    const latchIndex = this.boxLayer.latches.indexOf(latch);
    latch.x = centerX - 180 + latchIndex * 100;
    latch.y = centerY + 80;
  }

  private handleLayer4MouseUp(): void {
    for (const piece of this.boxLayer.puzzlePieces) {
      if (piece.dragging) {
        piece.dragging = false;
        piece.targetScale = 1;

        const dx = piece.x - piece.targetX;
        const dy = piece.y - piece.targetY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const normAngle = ((piece.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const angleDiff = Math.abs(normAngle - piece.correctAngle);
        const angleDiffAlt = Math.PI * 2 - angleDiff;
        const angleOk = Math.min(angleDiff, angleDiffAlt) < 0.3;

        if (dist < 50 && angleOk) {
          piece.x = piece.targetX;
          piece.y = piece.targetY;
          piece.rotation = piece.correctAngle;
          piece.targetRotation = piece.correctAngle;
          piece.placed = true;
          this.effects.emitParticles(piece.x, piece.y, 15);
        }
      }
    }
  }

  handleRightClick(canvasX: number, canvasY: number, width: number, height: number): boolean {
    const { scaledX, scaledY } = this.scaleCoordinates(canvasX, canvasY, width, height);

    if (this.state.currentLayer === 4) {
      for (const piece of this.boxLayer.puzzlePieces) {
        if (!piece.placed && !piece.dragging) {
          if (this.hitTestRotatedPiece(scaledX, scaledY, piece)) {
            piece.targetRotation += Math.PI * 2 / 5;
            piece.targetScale = 0.95;
            setTimeout(() => { piece.targetScale = 1; }, 150);
            return true;
          }
        }
      }
    }
    return false;
  }

  private updateHoverStates(x: number, y: number): void {
    for (const gear of this.boxLayer.gears) {
      gear.hovered = this.hitTestCircle(x, y, gear.x, gear.y, 35);
      gear.targetScale = gear.hovered ? 1.1 : 1;
    }

    for (const latch of this.boxLayer.latches) {
      if (!latch.dragging) {
        latch.hovered = this.hitTestRect(x, y, latch.x, latch.y, latch.width, latch.height);
        if (!latch.correct) {
          latch.targetScale = latch.hovered ? 1.1 : 1;
        }
      }
    }

    for (const cell of this.boxLayer.cells) {
      cell.hovered = this.hitTestRect(x, y, cell.x, cell.y, cell.width, cell.height);
      if (!cell.lit) {
        cell.targetScale = cell.hovered && this.boxLayer.cellPlayerTurn ? 1.05 : 1;
      }
    }

    for (const piece of this.boxLayer.puzzlePieces) {
      if (!piece.dragging) {
        piece.hovered = this.hitTestRotatedPiece(x, y, piece);
        if (!piece.placed) {
          piece.targetScale = piece.hovered ? 1.1 : 1;
        }
      }
    }

    for (const dial of this.boxLayer.dials) {
      dial.hovered = this.hitTestRect(x, y, dial.x - 10, dial.y - 15, dial.width + 20, dial.height + 30);
      dial.targetScale = dial.hovered ? 1.03 : 1;
    }
  }

  private scaleCoordinates(canvasX: number, canvasY: number, canvasWidth: number, canvasHeight: number): { scaledX: number; scaledY: number } {
    const targetWidth = 1280;
    const targetHeight = 720;
    const scaleX = targetWidth / canvasWidth;
    const scaleY = targetHeight / canvasHeight;
    return {
      scaledX: canvasX * scaleX,
      scaledY: canvasY * scaleY,
    };
  }

  private hitTestCircle(x: number, y: number, cx: number, cy: number, r: number): boolean {
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  }

  private hitTestRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
  }

  private hitTestTriangle(x: number, y: number, cx: number, cy: number, size: number, pointUp: boolean): boolean {
    const halfBase = size;
    const height = size;
    let points: [number, number][];

    if (pointUp) {
      points = [
        [cx, cy - height],
        [cx - halfBase, cy],
        [cx + halfBase, cy],
      ];
    } else {
      points = [
        [cx, cy + height],
        [cx - halfBase, cy],
        [cx + halfBase, cy],
      ];
    }

    const sign = (p1: [number, number], p2: [number, number], p3: [number, number]) => {
      return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
    };

    const d1 = sign([x, y], points[0], points[1]);
    const d2 = sign([x, y], points[1], points[2]);
    const d3 = sign([x, y], points[2], points[0]);

    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

    return !(hasNeg && hasPos);
  }

  private hitTestRotatedPiece(x: number, y: number, piece: PuzzlePiece): boolean {
    const dx = x - piece.x;
    const dy = y - piece.y;
    const cos = Math.cos(-piece.rotation);
    const sin = Math.sin(-piece.rotation);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    const pts = piece.points;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y;
      const xj = pts[j].x, yj = pts[j].y;

      if (((yi > localY) !== (yj > localY)) &&
          (localX < (xj - xi) * (localY - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }
}

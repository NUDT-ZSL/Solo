const TILE_SIZE = 40;
const ELEMENTS = {
  fire:  { color: '#ff4444', glow: '#ff6622', name: '火' },
  water: { color: '#4488ff', glow: '#66aaff', name: '水' },
  earth: { color: '#aa7744', glow: '#cc9966', name: '土' },
  wind:  { color: '#44ff88', glow: '#66ffaa', name: '风' }
};

const LEVELS = [
  {
    id: 1,
    name: '觉醒之庭',
    width: 10,
    height: 8,
    playerStart: { x: 1, y: 1 },
    portalPos: { x: 8, y: 6 },
    sequence: ['fire', 'water', 'earth'],
    blocks: [
      { x: 3, y: 2, element: 'fire' },
      { x: 5, y: 4, element: 'water' },
      { x: 2, y: 5, element: 'earth' }
    ],
    walls: [
      [4,0],[4,1],[4,2],[6,4],[6,5]
    ],
    starThresholds: { time: 30, steps: 18, perfect: true }
  },
  {
    id: 2,
    name: '流水迷径',
    width: 11,
    height: 8,
    playerStart: { x: 1, y: 1 },
    portalPos: { x: 9, y: 6 },
    sequence: ['water', 'fire', 'wind'],
    blocks: [
      { x: 2, y: 3, element: 'water' },
      { x: 5, y: 1, element: 'fire' },
      { x: 7, y: 5, element: 'wind' }
    ],
    walls: [
      [3,1],[3,2],[3,3],[5,3],[5,4],[5,5],[8,2],[8,3],[8,4]
    ],
    starThresholds: { time: 35, steps: 22, perfect: true }
  },
  {
    id: 3,
    name: '风暴之巅',
    width: 12,
    height: 9,
    playerStart: { x: 0, y: 0 },
    portalPos: { x: 10, y: 7 },
    sequence: ['wind', 'earth', 'fire', 'water'],
    blocks: [
      { x: 3, y: 1, element: 'wind' },
      { x: 1, y: 5, element: 'earth' },
      { x: 7, y: 3, element: 'fire' },
      { x: 9, y: 6, element: 'water' }
    ],
    walls: [
      [2,2],[2,3],[4,0],[4,1],[4,2],[6,4],[6,5],[6,6],[8,1],[8,2],[9,4],[9,5]
    ],
    starThresholds: { time: 45, steps: 30, perfect: true }
  },
  {
    id: 4,
    name: '大地之心',
    width: 10,
    height: 10,
    playerStart: { x: 0, y: 0 },
    portalPos: { x: 8, y: 8 },
    sequence: ['earth', 'water', 'wind', 'fire'],
    blocks: [
      { x: 4, y: 2, element: 'earth' },
      { x: 1, y: 6, element: 'water' },
      { x: 6, y: 4, element: 'wind' },
      { x: 7, y: 7, element: 'fire' }
    ],
    walls: [
      [2,1],[2,2],[2,3],[5,0],[5,1],[5,2],[3,5],[3,6],[3,7],[7,3],[7,4],[8,6]
    ],
    starThresholds: { time: 50, steps: 35, perfect: true }
  },
  {
    id: 5,
    name: '元素归一',
    width: 12,
    height: 10,
    playerStart: { x: 0, y: 4 },
    portalPos: { x: 10, y: 4 },
    sequence: ['fire', 'wind', 'earth', 'water', 'fire'],
    blocks: [
      { x: 2, y: 2, element: 'fire' },
      { x: 5, y: 7, element: 'wind' },
      { x: 8, y: 1, element: 'earth' },
      { x: 4, y: 4, element: 'water' },
      { x: 9, y: 6, element: 'fire' }
    ],
    walls: [
      [1,0],[1,1],[1,3],[1,5],[1,6],[1,8],[3,3],[3,4],[3,5],[6,0],[6,1],[6,6],[6,7],[6,8],[8,3],[8,4],[8,5],[10,1],[10,2],[10,6],[10,7]
    ],
    starThresholds: { time: 60, steps: 40, perfect: true }
  }
];

export class Level {
  constructor(levelIndex) {
    this.data = LEVELS[levelIndex] || LEVELS[0];
    this.width = this.data.width;
    this.height = this.data.height;
    this.blocks = this.data.blocks.map(b => ({
      x: b.x,
      y: b.y,
      element: b.element,
      activated: false,
      activating: 0
    }));
    this.walls = new Set();
    this.data.walls.forEach(([x, y]) => {
      this.walls.add(`${x},${y}`);
    });
    this.currentStep = 0;
    this.sequence = [...this.data.sequence];
    this.portalOpen = false;
    this.portalAnimating = 0;
    this.errorFlash = 0;
    this.perfectOrder = true;
  }

  isWall(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return true;
    return this.walls.has(`${x},${y}`);
  }

  getBlock(x, y) {
    return this.blocks.find(b => b.x === x && b.y === y);
  }

  tryActivate(x, y) {
    const block = this.getBlock(x, y);
    if (!block || block.activated) return null;

    if (block.element === this.sequence[this.currentStep]) {
      block.activated = true;
      block.activating = 1.0;
      this.currentStep++;
      if (this.currentStep >= this.sequence.length) {
        this.portalOpen = true;
        this.portalAnimating = 1.0;
      }
      return { success: true, element: block.element, allActivated: this.portalOpen };
    } else {
      this.errorFlash = 1.0;
      this.perfectOrder = false;
      this.resetBlocks();
      return { success: false, element: block.element, allActivated: false };
    }
  }

  resetBlocks() {
    this.blocks.forEach(b => {
      b.activated = false;
      b.activating = 0;
    });
    this.currentStep = 0;
  }

  resetFull() {
    this.resetBlocks();
    this.portalOpen = false;
    this.portalAnimating = 0;
    this.errorFlash = 0;
    this.perfectOrder = true;
  }

  isPortalPos(x, y) {
    return x === this.data.portalPos.x && y === this.data.portalPos.y;
  }

  update(dt) {
    this.blocks.forEach(b => {
      if (b.activating > 0) {
        b.activating = Math.max(0, b.activating - dt * 2);
      }
    });
    if (this.portalAnimating > 0) {
      this.portalAnimating = Math.max(0, this.portalAnimating - dt);
    }
    if (this.errorFlash > 0) {
      this.errorFlash = Math.max(0, this.errorFlash - dt * 3);
    }
  }

  calculateStars(elapsedTime, steps) {
    const t = this.data.starThresholds;
    let stars = 0;
    if (elapsedTime <= t.time) stars++;
    if (steps <= t.steps) stars++;
    if (this.perfectOrder) stars++;
    return stars;
  }

  draw(ctx) {
    this._drawBackground(ctx);
    this._drawGrid(ctx);
    this._drawWalls(ctx);
    this._drawBlocks(ctx);
    this._drawPortal(ctx);
    if (this.errorFlash > 0) {
      ctx.fillStyle = `rgba(255, 50, 50, ${this.errorFlash * 0.25})`;
      ctx.fillRect(0, 0, this.width * TILE_SIZE, this.height * TILE_SIZE);
    }
  }

  _drawBackground(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, this.height * TILE_SIZE);
    grad.addColorStop(0, '#0a0a2e');
    grad.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width * TILE_SIZE, this.height * TILE_SIZE);
  }

  _drawGrid(ctx) {
    ctx.strokeStyle = 'rgba(42, 42, 74, 0.5)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * TILE_SIZE + 0.5, 0);
      ctx.lineTo(x * TILE_SIZE + 0.5, this.height * TILE_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= this.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE_SIZE + 0.5);
      ctx.lineTo(this.width * TILE_SIZE, y * TILE_SIZE + 0.5);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.isWall(x, y)) {
          ctx.fillStyle = 'rgba(30, 30, 60, 0.4)';
          ctx.fillRect(x * TILE_SIZE + 1, y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        }
      }
    }
  }

  _drawWalls(ctx) {
    this.data.walls.forEach(([x, y]) => {
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      ctx.fillStyle = '#1a1a3a';
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = '#22224a';
      ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      ctx.fillStyle = '#2a2a5a';
      ctx.fillRect(px + 3, py + 2, TILE_SIZE - 8, 2);
      ctx.fillRect(px + 3, py + TILE_SIZE - 6, TILE_SIZE - 8, 2);
    });
  }

  _drawBlocks(ctx) {
    this.blocks.forEach(block => {
      const px = block.x * TILE_SIZE;
      const py = block.y * TILE_SIZE;
      const elem = ELEMENTS[block.element];

      if (block.activated) {
        const pulse = 0.5 + 0.3 * Math.sin(Date.now() * 0.004);
        ctx.fillStyle = elem.color + '33';
        ctx.fillRect(px - 4, py - 4, TILE_SIZE + 8, TILE_SIZE + 8);
        ctx.shadowColor = elem.glow;
        ctx.shadowBlur = 8 * pulse;
        ctx.fillStyle = elem.color;
        ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#222244';
        ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        ctx.strokeStyle = elem.color + '88';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 4.5, py + 4.5, TILE_SIZE - 9, TILE_SIZE - 9);
      }

      this._drawElementIcon(ctx, block.x, block.y, block.element, block.activated);
    });
  }

  _drawElementIcon(ctx, gx, gy, element, activated) {
    const px = gx * TILE_SIZE + TILE_SIZE / 2;
    const py = gy * TILE_SIZE + TILE_SIZE / 2;
    const s = 4;
    const col = activated ? ELEMENTS[element].color : ELEMENTS[element].color + '88';

    ctx.fillStyle = col;

    if (element === 'fire') {
      ctx.fillRect(px - s, py - s, 2, 8);
      ctx.fillRect(px - s + 2, py - s - 2, 2, 4);
      ctx.fillRect(px - s + 2, py - s + 6, 2, 4);
      ctx.fillRect(px - s + 4, py - s, 2, 8);
      ctx.fillRect(px - s + 6, py - s + 2, 2, 4);
    } else if (element === 'water') {
      ctx.fillRect(px - s, py - s + 2, 8, 4);
      ctx.fillRect(px - s + 2, py - s, 4, 2);
      ctx.fillRect(px - s + 2, py - s + 6, 4, 2);
    } else if (element === 'earth') {
      ctx.fillRect(px - s, py - s, 8, 8);
      ctx.fillStyle = activated ? '#2a1a0a' : '#1a1a30';
      ctx.fillRect(px - s + 2, py - s + 2, 4, 4);
    } else if (element === 'wind') {
      ctx.fillRect(px - s, py - s, 8, 2);
      ctx.fillRect(px - s + 2, py - s + 3, 6, 2);
      ctx.fillRect(px - s, py - s + 6, 8, 2);
    }
  }

  _drawPortal(ctx) {
    const px = this.data.portalPos.x * TILE_SIZE;
    const py = this.data.portalPos.y * TILE_SIZE;

    if (this.portalOpen) {
      const t = Date.now() * 0.003;
      const pulse = 0.6 + 0.4 * Math.sin(t);

      ctx.shadowColor = '#ffdd44';
      ctx.shadowBlur = 12 * pulse;
      ctx.fillStyle = `rgba(255, 221, 68, ${0.3 + 0.2 * pulse})`;
      ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      ctx.fillStyle = '#ffdd44';
      ctx.fillRect(px + 6, py + 4, TILE_SIZE - 12, TILE_SIZE - 8);
      ctx.fillStyle = '#ffffaa';
      ctx.fillRect(px + 10, py + 8, TILE_SIZE - 20, TILE_SIZE - 16);

      ctx.fillStyle = `rgba(255, 255, 200, ${0.5 * pulse})`;
      ctx.fillRect(px - 4, py - 4, TILE_SIZE + 8, TILE_SIZE + 8);

      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#1a1a3a';
      ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      ctx.strokeStyle = '#333366';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 4.5, py + 4.5, TILE_SIZE - 9, TILE_SIZE - 9);
    }
  }

  static get ELEMENTS() { return ELEMENTS; }
  static get TILE_SIZE() { return TILE_SIZE; }
  static get LEVELS() { return LEVELS; }
  static get totalLevels() { return LEVELS.length; }
}

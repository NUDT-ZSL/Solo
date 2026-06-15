export interface CardData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  text: string;
  links: string[];
}

const WORD_POOL = [
  '灵感火花', '混沌边缘', '量子跃迁', '蝴蝶效应', '奇点将至',
  '思维迷雾', '创意思维', '解构重构', '共鸣频率', '意识流',
  '破界跨界', '认知升级', '未来图景', '逆向思维', '心智模型',
  '涌现现象', '范式转移', '黑天鹅', '第二曲线', '增长黑客',
  '设计思维', '精益创业', '敏捷迭代', '系统思考', '极简主义',
  '游戏化', '同理心', '价值主张', '用户旅程', '痛点洞察',
  '数据驱动', '算法美学', '人机协同', '神经元', '拓扑结构',
  '分形几何', '混沌理论', '熵增定律', '耗散结构', '自组织',
  '超链接', '语义网络', '知识图谱', '思想实验', '假设驱动'
];

const CARD_COLORS = [
  ['#6366f1', '#8b5cf6'],
  ['#3b82f6', '#6366f1'],
  ['#8b5cf6', '#a855f7'],
  ['#0ea5e9', '#6366f1'],
  ['#a855f7', '#ec4899'],
  ['#06b6d4', '#3b82f6'],
  ['#d946ef', '#8b5cf6'],
  ['#2563eb', '#8b5cf6']
];

export function getRandomWords(count: number = 2): string {
  const shuffled = [...WORD_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).join('·');
}

export function getRandomColor(): string[] {
  return CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)];
}

export type CardState = 'appearing' | 'idle' | 'dragging' | 'snapping' | 'disappearing';

export class Card {
  public id: string;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public baseWidth: number;
  public baseHeight: number;
  public color: string[];
  public text: string;
  public links: string[];
  public state: CardState;
  public scale: number;
  public opacity: number;
  public breathingPhase: number;
  public snapTarget: { x: number; y: number } | null;
  public snapProgress: number;
  public dragOffset: { x: number; y: number };
  public isDragging: boolean;
  public isHovered: boolean;
  public glowIntensity: number;
  public animProgress: number;

  constructor(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string[],
    text: string
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.baseWidth = width;
    this.baseHeight = height;
    this.color = color;
    this.text = text;
    this.links = [];
    this.state = 'appearing';
    this.scale = 0;
    this.opacity = 0;
    this.breathingPhase = Math.random() * Math.PI * 2;
    this.snapTarget = null;
    this.snapProgress = 0;
    this.dragOffset = { x: 0, y: 0 };
    this.isDragging = false;
    this.isHovered = false;
    this.glowIntensity = 0;
    this.animProgress = 0;
  }

  get centerX(): number {
    return this.x + this.width / 2;
  }

  get centerY(): number {
    return this.y + this.height / 2;
  }

  get left(): number {
    return this.x;
  }

  get right(): number {
    return this.x + this.width;
  }

  get top(): number {
    return this.y;
  }

  get bottom(): number {
    return this.y + this.height;
  }

  public containsPoint(px: number, py: number): boolean {
    return px >= this.x && px <= this.x + this.width &&
           py >= this.y && py <= this.y + this.height;
  }

  public addLink(linkId: string): void {
    if (!this.links.includes(linkId)) {
      this.links.push(linkId);
    }
  }

  public removeLink(linkId: string): void {
    const index = this.links.indexOf(linkId);
    if (index !== -1) {
      this.links.splice(index, 1);
    }
  }

  public startDrag(mouseX: number, mouseY: number): void {
    this.isDragging = true;
    this.state = 'dragging';
    this.dragOffset.x = mouseX - this.x;
    this.dragOffset.y = mouseY - this.y;
  }

  public moveTo(mouseX: number, mouseY: number): void {
    this.x = mouseX - this.dragOffset.x;
    this.y = mouseY - this.dragOffset.y;
  }

  public startSnap(targetX: number, targetY: number): void {
    this.snapTarget = { x: targetX, y: targetY };
    this.snapProgress = 0;
    this.state = 'snapping';
  }

  public triggerDisappear(): void {
    this.state = 'disappearing';
    this.animProgress = 0;
  }

  public update(dt: number, time: number): void {
    this.breathingPhase += dt * 1.5;
    const breathing = Math.sin(this.breathingPhase) * 0.015 + 1;

    const targetGlow = this.isDragging ? 1 : (this.isHovered ? 0.5 : 0.2);
    this.glowIntensity += (targetGlow - this.glowIntensity) * Math.min(1, dt * 8);

    switch (this.state) {
      case 'appearing': {
        this.animProgress = Math.min(1, this.animProgress + dt / 0.3);
        const p = this.animProgress;
        const elastic = this.elasticOut(p);
        this.scale = elastic;
        this.opacity = Math.min(1, p * 1.5);
        if (this.animProgress >= 1) {
          this.state = 'idle';
          this.animProgress = 0;
        }
        break;
      }
      case 'idle': {
        this.scale = breathing;
        this.opacity = 1;
        break;
      }
      case 'dragging': {
        this.scale = breathing * 1.05;
        this.opacity = 1;
        break;
      }
      case 'snapping': {
        if (this.snapTarget) {
          this.snapProgress = Math.min(1, this.snapProgress + dt / 0.2);
          const ease = this.easeOutCubic(this.snapProgress);
          this.x = this.x + (this.snapTarget.x - this.x) * ease;
          this.y = this.y + (this.snapTarget.y - this.y) * ease;
          if (this.snapProgress >= 1) {
            this.state = 'idle';
            this.snapTarget = null;
          }
        }
        this.scale = breathing;
        this.opacity = 1;
        break;
      }
      case 'disappearing': {
        this.animProgress = Math.min(1, this.animProgress + dt / 0.3);
        const p = this.animProgress;
        this.scale = 1 - p;
        this.opacity = 1 - p;
        break;
      }
    }
  }

  private elasticOut(t: number): number {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    const s = p / 4;
    return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-this.centerX, -this.centerY);
    ctx.globalAlpha = this.opacity;

    const w = this.width;
    const h = this.height;
    const x = this.x;
    const y = this.y;
    const radius = 10;

    const glowBlur = 8 + this.glowIntensity * 16;
    const glowColor = this.color[0];
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;

    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, this.color[0] + 'cc');
    gradient.addColorStop(1, this.color[1] + 'cc');

    ctx.fillStyle = gradient;
    this.roundRect(ctx, x, y, w, h, radius);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + this.glowIntensity * 0.25})`;
    ctx.lineWidth = 1;
    this.roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, radius);
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 255, 255, ${0.75 + this.glowIntensity * 0.2})`;
    ctx.font = `${this.isMobile() ? 400 : 300} ${Math.floor(Math.min(12, w / 6))}px 'Noto Sans SC', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;

    const displayText = this.truncateText(ctx, this.text, w - 16);
    ctx.fillText(displayText, x + w / 2, y + h / 2);

    ctx.restore();
  }

  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let result = text;
    while (result.length > 1 && ctx.measureText(result + '…').width > maxWidth) {
      result = result.slice(0, -1);
    }
    return result + '…';
  }

  private isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  public toJSON(): CardData {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      width: this.baseWidth,
      height: this.baseHeight,
      color: this.color[0] + '|' + this.color[1],
      text: this.text,
      links: [...this.links]
    };
  }

  public static fromJSON(data: CardData & { color?: string }): Card {
    let colorArr: string[];
    if (typeof (data as any).color === 'string') {
      colorArr = (data as any).color.split('|');
    } else {
      colorArr = data.color as unknown as string[];
    }
    const card = new Card(
      data.id,
      data.x,
      data.y,
      data.width,
      data.height,
      colorArr,
      data.text
    );
    card.links = [...data.links];
    card.state = 'appearing';
    card.scale = 0;
    card.opacity = 0;
    card.animProgress = 0;
    return card;
  }
}

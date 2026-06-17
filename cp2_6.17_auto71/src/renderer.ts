import { GameController, GameEvent, EVENT_COLORS, EventType } from './gameController';
import { Cat, AttributeType } from './cat';

interface Layout {
  width: number;
  height: number;
  titleBar: { x: number; y: number; width: number; height: number };
  statusBar: { x: number; y: number; width: number; height: number };
  catPanels: { x: number; y: number; width: number; height: number }[];
  centerArea: { x: number; y: number; width: number; height: number };
  logsArea: { x: number; y: number; width: number; height: number };
  nextButton: { x: number; y: number; width: number; height: number };
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private controller: GameController;
  private hoveredButton: boolean = false;
  private buttonHoverTime: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private restartButtonHovered: boolean = false;
  private clickMessage: string | null = null;
  private clickMessageTimer: number = 0;

  readonly MIN_WIDTH: number = 900;
  readonly MAX_WIDTH: number = 1200;
  readonly MIN_HEIGHT: number = 850;
  readonly GAP: number = 16;
  readonly CAT_PANEL_W: number = 200;
  readonly CAT_PANEL_H: number = 180;
  readonly LOG_PANEL_W: number = 220;

  constructor(canvas: HTMLCanvasElement, controller: GameController) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.controller = controller;
    this.resize();
    this.setupMouseListeners();
  }

  resize(): void {
    const w = Math.min(this.MAX_WIDTH, Math.max(this.MIN_WIDTH, window.innerWidth - 40));
    const h = this.MIN_HEIGHT;
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  private setupMouseListeners(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      this.updateHoverState();
    });
  }

  private getLayout(): Layout {
    const w = this.canvas.width;
    const h = this.canvas.height;

    const titleBar = { x: 0, y: 0, width: w, height: 60 };
    const statusBar = { x: 20, y: 70, width: w - 40, height: 40 };

    const catPanelX = 20;
    const catPanels = [];
    for (let i = 0; i < this.controller.MAX_CATS; i++) {
      catPanels.push({
        x: catPanelX,
        y: 130 + i * (this.CAT_PANEL_H + this.GAP),
        width: this.CAT_PANEL_W,
        height: this.CAT_PANEL_H,
      });
    }

    const logsX = w - this.LOG_PANEL_W - 20;
    const logsArea = {
      x: logsX,
      y: 130,
      width: this.LOG_PANEL_W,
      height: h - 200,
    };

    const centerX = catPanelX + this.CAT_PANEL_W + this.GAP;
    const centerW = logsX - centerX - this.GAP;
    const centerArea = {
      x: centerX,
      y: 130,
      width: centerW,
      height: h - 260,
    };

    const buttonW = 200;
    const buttonH = 50;
    const nextButton = {
      x: centerX + (centerW - buttonW) / 2,
      y: h - 110,
      width: buttonW,
      height: buttonH,
    };

    return {
      width: w,
      height: h,
      titleBar,
      statusBar,
      catPanels,
      centerArea,
      logsArea,
      nextButton,
    };
  }

  private updateHoverState(): void {
    const layout = this.getLayout();
    const { nextButton } = layout;

    this.hoveredButton = this.pointInRect(
      this.mouseX, this.mouseY,
      nextButton.x, nextButton.y,
      nextButton.width, nextButton.height
    );

    if (this.controller.isGameOver) {
      const restartBtn = this.getRestartButtonRect();
      this.restartButtonHovered = this.pointInRect(
        this.mouseX, this.mouseY,
        restartBtn.x, restartBtn.y,
        restartBtn.width, restartBtn.height
      );
    }
  }

  handleClick(x: number, y: number): void {
    const layout = this.getLayout();

    if (this.controller.isGameOver) {
      const restartBtn = this.getRestartButtonRect();
      if (this.pointInRect(x, y, restartBtn.x, restartBtn.y, restartBtn.width, restartBtn.height)) {
        this.controller.restart(['橘子', '小黑', '小花']);
        this.clickMessage = '游戏已重新开始！';
        this.clickMessageTimer = 2000;
      }
      return;
    }

    const { catPanels, nextButton } = layout;

    for (let i = 0; i < catPanels.length; i++) {
      const panel = catPanels[i];
      if (i < this.controller.cats.length && this.pointInRect(x, y, panel.x, panel.y, panel.width, panel.height)) {
        const cat = this.controller.cats[i];
        if (cat.isAway) {
          this.clickMessage = `${cat.name} 正在休息恢复中...`;
          this.clickMessageTimer = 2000;
        } else {
          this.clickMessage = `${cat.name}：健康${cat.health} 饱腹${cat.hunger} 心情${cat.happiness}`;
          this.clickMessageTimer = 2000;
        }
        return;
      }
    }

    if (this.pointInRect(x, y, nextButton.x, nextButton.y, nextButton.width, nextButton.height)) {
      if (this.controller.canAdvanceTurn()) {
        this.controller.nextTurn();
      }
    }
  }

  private getRestartButtonRect() {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2 + 60;
    return { x: cx - 70, y: cy, width: 140, height: 44 };
  }

  private pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  update(deltaTime: number): void {
    if (this.hoveredButton) {
      this.buttonHoverTime = Math.min(200, this.buttonHoverTime + deltaTime);
    } else {
      this.buttonHoverTime = Math.max(0, this.buttonHoverTime - deltaTime);
    }

    if (this.clickMessageTimer > 0) {
      this.clickMessageTimer -= deltaTime;
      if (this.clickMessageTimer <= 0) {
        this.clickMessage = null;
      }
    }
  }

  render(): void {
    const ctx = this.ctx;
    const layout = this.getLayout();

    ctx.fillStyle = '#faf3e0';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawTitleBar(layout.titleBar);
    this.drawStatusBar(layout.statusBar);
    this.drawCatPanels(layout.catPanels);
    this.drawCenterArea(layout.centerArea);
    this.drawLogsArea(layout.logsArea);
    this.drawNextButton(layout.nextButton);

    if (this.controller.currentEvent !== null) {
      this.drawEventPopup(this.controller.currentEvent);
    }

    if (this.controller.isGameOver) {
      this.drawGameOverScreen();
    }

    if (this.clickMessage !== null) {
      this.drawClickMessage(this.clickMessage, this.clickMessageTimer);
    }
  }

  private drawTitleBar(rect: { x: number; y: number; width: number; height: number }): void {
    const ctx = this.ctx;
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2 + 10;

    ctx.save();
    ctx.font = 'bold 24px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5d4037';
    ctx.shadowColor = 'rgba(93, 64, 55, 0.3)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText('流浪猫救助小站', cx, cy);
    ctx.restore();
  }

  private drawStatusBar(rect: { x: number; y: number; width: number; height: number }): void {
    const ctx = this.ctx;

    this.drawRoundedRect(rect.x, rect.y, rect.width, rect.height, 8);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
    ctx.strokeStyle = '#ffcc80';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5d4037';
    ctx.fillText(`回合数：${this.controller.turn}`, rect.x + 20, rect.y + rect.height / 2);

    const activeCats = this.controller.cats.filter(c => !c.isAway).length;
    ctx.textAlign = 'center';
    ctx.fillText(`在队猫咪：${activeCats}/${this.controller.cats.length}`, rect.x + rect.width / 2, rect.y + rect.height / 2);

    const attrLabels: { type: AttributeType; label: string; color: string }[] = [
      { type: 'health', label: '健康', color: '#4caf50' },
      { type: 'hunger', label: '饱腹', color: '#ff9800' },
      { type: 'happiness', label: '心情', color: '#2196f3' },
    ];

    const attrX = rect.x + rect.width - 30;
    const attrSpacing = 130;

    for (let i = attrLabels.length - 1; i >= 0; i--) {
      const label = attrLabels[i];
      const totalValue = this.controller.cats.reduce((sum, c) => sum + c[label.type], 0);
      const avgValue = this.controller.cats.length > 0 ? Math.round(totalValue / this.controller.cats.length) : 0;

      let isFlashing = false;
      let isRising = false;
      for (const cat of this.controller.cats) {
        if (cat.isFlashing(label.type)) isFlashing = true;
        if (cat.isRising(label.type)) isRising = true;
      }

      let textColor = '#333';
      if (isFlashing && !isRising) {
        textColor = '#e53935';
      } else if (isRising) {
        textColor = '#43a047';
      }

      const x = attrX - (attrLabels.length - 1 - i) * attrSpacing;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#666';
      ctx.font = '13px "Microsoft YaHei", sans-serif';
      ctx.fillText(`${label.label}：`, x - 35, rect.y + rect.height / 2);
      ctx.fillStyle = textColor;
      ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
      ctx.fillText(`${avgValue}`, x, rect.y + rect.height / 2);
    }

    ctx.restore();
  }

  private drawCatPanels(panels: { x: number; y: number; width: number; height: number }[]): void {
    for (let i = 0; i < panels.length; i++) {
      if (i < this.controller.cats.length) {
        this.drawCatPanel(panels[i], this.controller.cats[i]);
      } else {
        this.drawEmptyCatPanel(panels[i]);
      }
    }
  }

  private drawCatPanel(rect: { x: number; y: number; width: number; height: number }, cat: Cat): void {
    const ctx = this.ctx;

    this.drawRoundedRect(rect.x, rect.y, rect.width, rect.height, 12);

    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
    if (cat.isAway) {
      grad.addColorStop(0, '#bdbdbd');
      grad.addColorStop(1, '#9e9e9e');
    } else {
      grad.addColorStop(0, '#fff3e0');
      grad.addColorStop(1, '#fce4ec');
    }
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = '#ffcc80';
    ctx.lineWidth = 2;
    ctx.stroke();

    const nameBarHeight = 36;
    this.drawRoundedRectTop(rect.x, rect.y, rect.width, nameBarHeight, 12);
    ctx.fillStyle = cat.isAway ? '#757575' : '#ff9800';
    ctx.fill();

    ctx.save();
    ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(cat.name, rect.x + rect.width / 2, rect.y + nameBarHeight / 2);
    ctx.restore();

    const attrs: { type: AttributeType; label: string; color: string; display: number; actual: number }[] = [
      { type: 'health', label: '健康', color: '#4caf50', display: cat.displayHealth, actual: cat.health },
      { type: 'hunger', label: '饱腹', color: '#ff9800', display: cat.displayHunger, actual: cat.hunger },
      { type: 'happiness', label: '心情', color: '#2196f3', display: cat.displayHappiness, actual: cat.happiness },
    ];

    const progressY = rect.y + nameBarHeight + 24;
    const progressSpacing = 44;

    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      const y = progressY + i * progressSpacing;

      ctx.save();
      ctx.font = '12px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#5d4037';
      ctx.fillText(attr.label, rect.x + 15, y);

      let valueColor = '#333';
      if (cat.isFlashing(attr.type)) valueColor = '#e53935';
      else if (cat.isRising(attr.type)) valueColor = '#43a047';

      ctx.fillStyle = valueColor;
      ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(attr.display)}`, rect.x + rect.width - 15, y);

      const barX = rect.x + 15;
      const barY = y + 18;
      const barW = rect.width - 30;
      const barH = 10;

      this.drawRoundedRect(barX, barY, barW, barH, 5);
      ctx.fillStyle = '#e0e0e0';
      ctx.fill();

      const fillW = Math.max(0, (attr.display / cat.MAX_VALUE) * barW);
      if (fillW > 0) {
        this.drawRoundedRect(barX, barY, fillW, barH, 5);
        ctx.fillStyle = attr.color;
        ctx.fill();
      }

      ctx.restore();
    }

    if (cat.isAway) {
      ctx.save();
      this.drawRoundedRect(rect.x, rect.y, rect.width, rect.height, 12);
      ctx.fillStyle = 'rgba(158, 158, 158, 0.5)';
      ctx.fill();

      ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText('暂离', rect.x + rect.width / 2, rect.y + rect.height / 2);
      ctx.restore();
    }
  }

  private drawEmptyCatPanel(rect: { x: number; y: number; width: number; height: number }): void {
    const ctx = this.ctx;

    this.drawRoundedRect(rect.x, rect.y, rect.width, rect.height, 12);
    ctx.fillStyle = 'rgba(224, 224, 224, 0.3)';
    ctx.fill();
    ctx.strokeStyle = '#ffcc80';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.save();
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(158, 158, 158, 0.5)';
    ctx.fillText('+', rect.x + rect.width / 2, rect.y + rect.height / 2);

    ctx.font = '14px "Microsoft YaHei", sans-serif';
    ctx.fillText('空位', rect.x + rect.width / 2, rect.y + rect.height / 2 + 40);
    ctx.restore();
  }

  private drawCenterArea(rect: { x: number; y: number; width: number; height: number }): void {
    const ctx = this.ctx;

    this.drawRoundedRect(rect.x, rect.y, rect.width, rect.height, 12);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
    ctx.strokeStyle = '#ffcc80';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2 - 30;

    ctx.font = '64px sans-serif';
    const catEmojis = ['🐱', '🐈', '😺', '😻', '🙀'];
    ctx.fillText(catEmojis[Math.floor(this.controller.turn / 3) % catEmojis.length], cx, cy);

    ctx.font = '16px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#5d4037';
    ctx.fillText('救助站日常', cx, cy + 60);

    ctx.font = '13px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('每回合代表游戏内2小时', cx, cy + 90);
    ctx.fillText('点击"下一回合"按钮开始', cx, cy + 115);

    ctx.restore();
  }

  private drawLogsArea(rect: { x: number; y: number; width: number; height: number }): void {
    const ctx = this.ctx;

    this.drawRoundedRect(rect.x, rect.y, rect.width, rect.height, 12);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
    ctx.strokeStyle = '#ffcc80';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.font = 'bold 15px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#5d4037';
    ctx.fillText('📋 回合日志', rect.x + rect.width / 2, rect.y + 12);
    ctx.restore();

    const dividerY = rect.y + 38;
    ctx.beginPath();
    ctx.moveTo(rect.x + 15, dividerY);
    ctx.lineTo(rect.x + rect.width - 15, dividerY);
    ctx.strokeStyle = '#ffcc80';
    ctx.lineWidth = 1;
    ctx.stroke();

    let currentY = dividerY + 10;
    const maxVisibleHeight = rect.y + rect.height - 20;

    const logs = this.controller.getLogs();
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const cardHeight = this.estimateLogCardHeight(log);

      if (currentY + cardHeight > maxVisibleHeight) break;

      this.drawLogCard(rect.x + 15, currentY, rect.width - 30, cardHeight, log);
      currentY += cardHeight + 8;
    }

    if (logs.length === 0) {
      ctx.save();
      ctx.font = '12px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#999';
      ctx.fillText('暂无日志记录', rect.x + rect.width / 2, dividerY + 30);
      ctx.restore();
    }
  }

  private estimateLogCardHeight(log: { changes: { type: string; value: number }[] }): number {
    const baseHeight = 40;
    const changeLines = Math.ceil(log.changes.length);
    return baseHeight + changeLines * 16;
  }

  private drawLogCard(x: number, y: number, w: number, h: number, log: { turn: number; eventType: EventType; eventName: string; catName: string; changes: { type: AttributeType; value: number }[]; isDecay: boolean }): void {
    const ctx = this.ctx;

    this.drawRoundedRect(x + 10, y, w - 10, h, 8);
    const grad = ctx.createLinearGradient(x + 10, y, x + 10, y + h);
    grad.addColorStop(0, '#e3f2fd');
    grad.addColorStop(1, '#bbdefb');
    ctx.fillStyle = grad;
    ctx.fill();

    const dotColor = log.isDecay ? '#9e9e9e' : EVENT_COLORS[log.eventType];
    ctx.beginPath();
    ctx.arc(x + 14, y + h / 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#1565c0';
    ctx.fillText(`回合${log.turn}`, x + 24, y + 8);

    ctx.fillStyle = '#37474f';
    ctx.fillText(`${log.catName} · ${log.eventName}`, x + 24 + 55, y + 8);

    ctx.font = '11px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#546e7a';
    for (let i = 0; i < log.changes.length; i++) {
      const change = log.changes[i];
      const prefix = change.value >= 0 ? '+' : '';
      const label = this.controller.getAttributeLabel(change.type);
      const color = change.value >= 0 ? '#43a047' : '#e53935';
      ctx.fillStyle = color;
      const text = `${label}${prefix}${change.value}`;
      ctx.fillText(text, x + 24, y + 28 + i * 16);
    }

    ctx.restore();
  }

  private drawNextButton(rect: { x: number; y: number; width: number; height: number }): void {
    const ctx = this.ctx;

    const canClick = this.controller.canAdvanceTurn();
    const hoverProgress = this.buttonHoverTime / 200;

    this.drawRoundedRect(rect.x, rect.y, rect.width, rect.height, 12);

    if (!canClick) {
      ctx.fillStyle = '#bdbdbd';
    } else {
      const baseColor = [0xff, 0xb7, 0x4d];
      const darkenAmount = hoverProgress * 20;
      const r = Math.max(0, baseColor[0] - darkenAmount);
      const g = Math.max(0, baseColor[1] - darkenAmount);
      const b = Math.max(0, baseColor[2] - darkenAmount);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    }
    ctx.fill();

    ctx.strokeStyle = '#ffcc80';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = canClick ? '#ffffff' : '#eeeeee';
    const label = this.controller.currentEvent !== null ? '事件进行中...' : '下一回合';
    ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2);
    ctx.restore();
  }

  private drawEventPopup(event: GameEvent): void {
    const ctx = this.ctx;
    const cat = this.controller.cats[event.catIndex];
    if (!cat) return;

    const w = 240;
    const h = 120;
    const x = this.canvas.width / 2 - w / 2;
    const y = this.canvas.height / 2 - h / 2;

    ctx.save();

    this.drawRoundedRect(x, y, w, h, 16);
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#fce4ec');
    grad.addColorStop(1, '#f8bbd0');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = '#795548';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '36px sans-serif';
    ctx.fillText(event.icon, x + w / 2, y + 35);

    ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#5d4037';
    ctx.fillText(`${cat.name} · ${event.name}`, x + w / 2, y + 75);

    ctx.font = '13px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#795548';
    ctx.fillText(event.description, x + w / 2, y + 98);

    ctx.restore();
  }

  private drawGameOverScreen(): void {
    const ctx = this.ctx;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const panelW = 360;
    const panelH = 240;
    const px = cx - panelW / 2;
    const py = cy - panelH / 2;

    this.drawRoundedRect(px, py, panelW, panelH, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#ffcc80';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#5d4037';
    ctx.fillText('🏠 救助站结算', cx, py + 20);

    ctx.font = '14px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#795548';
    ctx.fillText(`总回合数：${this.controller.turn} 回合`, cx, py + 55);

    const catsStartY = py + 85;
    ctx.font = '13px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';

    for (let i = 0; i < this.controller.cats.length; i++) {
      const cat = this.controller.cats[i];
      const rowY = catsStartY + i * 22;
      ctx.fillStyle = cat.isAway ? '#9e9e9e' : '#37474f';
      const status = cat.isAway ? ' (暂离)' : '';
      ctx.fillText(
        `${cat.name}${status}：健康${cat.health} 饱腹${cat.hunger} 心情${cat.happiness}`,
        px + 30,
        rowY
      );
    }

    const restartBtn = this.getRestartButtonRect();
    this.drawRoundedRect(restartBtn.x, restartBtn.y, restartBtn.width, restartBtn.height, 10);

    if (this.restartButtonHovered) {
      ctx.fillStyle = '#f57c00';
    } else {
      ctx.fillStyle = '#ff9800';
    }
    ctx.fill();

    ctx.font = 'bold 15px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('重新开始', restartBtn.x + restartBtn.width / 2, restartBtn.y + restartBtn.height / 2);

    ctx.restore();
  }

  private drawRoundedRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
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

  private drawRoundedRectTop(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private drawClickMessage(message: string, timer: number): void {
    const ctx = this.ctx;
    const alpha = Math.min(1, timer / 500);

    const padding = 16;
    ctx.font = '14px "Microsoft YaHei", sans-serif';
    const textWidth = ctx.measureText(message).width;
    const w = textWidth + padding * 2;
    const h = 40;
    const x = this.canvas.width / 2 - w / 2;
    const y = 120;

    ctx.save();
    ctx.globalAlpha = alpha;

    this.drawRoundedRect(x, y, w, h, 8);
    ctx.fillStyle = 'rgba(93, 64, 55, 0.95)';
    ctx.fill();
    ctx.strokeStyle = '#ffcc80';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '14px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(message, x + w / 2, y + h / 2);

    ctx.restore();
  }
}

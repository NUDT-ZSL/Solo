import { BoxLayer } from './boxLayer';
import { PuzzleMechanics } from './puzzleMechanics';
import { Effects } from './effects';

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;
const ASPECT_RATIO = 16 / 9;

interface UIButton {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  hovered: boolean;
  onClick: () => void;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private boxLayer: BoxLayer;
  private puzzleMechanics: PuzzleMechanics;
  private effects: Effects;

  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  private lastTime: number = 0;
  private running: boolean = false;

  private resetButton: UIButton;
  private hintButton: UIButton;
  private helpButton: UIButton;
  private showHelp: boolean = false;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;

    this.boxLayer = new BoxLayer();
    this.effects = new Effects();
    this.puzzleMechanics = new PuzzleMechanics(this.boxLayer, this.effects);

    this.resetButton = {
      x: 0, y: 0, width: 120, height: 45,
      label: '重置游戏', hovered: false,
      onClick: () => this.puzzleMechanics.resetGame()
    };

    this.hintButton = {
      x: 0, y: 0, width: 100, height: 45,
      label: '提示', hovered: false,
      onClick: () => this.showHint()
    };

    this.helpButton = {
      x: 0, y: 0, width: 50, height: 50,
      label: '?', hovered: false,
      onClick: () => { this.showHelp = !this.showHelp; }
    };

    this.resize();
    this.initEvents();
    this.initLayer();
  }

  private initLayer(): void {
    const boxW = BASE_WIDTH * 0.7;
    const boxH = BASE_HEIGHT * 0.7;
    const boxX = (BASE_WIDTH - boxW) / 2;
    const boxY = (BASE_HEIGHT - boxH) / 2;
    this.boxLayer.setBoxDimensions(boxX, boxY, boxW, boxH);
    this.boxLayer.initLayer(1);
  }

  private resize(): void {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let canvasWidth: number;
    let canvasHeight: number;

    if (windowWidth / windowHeight > ASPECT_RATIO) {
      canvasHeight = windowHeight;
      canvasWidth = canvasHeight * ASPECT_RATIO;
    } else {
      canvasWidth = windowWidth;
      canvasHeight = canvasWidth / ASPECT_RATIO;
    }

    this.canvas.width = BASE_WIDTH;
    this.canvas.height = BASE_HEIGHT;
    this.canvas.style.width = `${canvasWidth}px`;
    this.canvas.style.height = `${canvasHeight}px`;

    this.scale = canvasWidth / BASE_WIDTH;
    this.offsetX = (windowWidth - canvasWidth) / 2;
    this.offsetY = (windowHeight - canvasHeight) / 2;

    this.resetButton.x = BASE_WIDTH - this.resetButton.width - 30;
    this.resetButton.y = BASE_HEIGHT - this.resetButton.height - 30;

    this.hintButton.x = this.resetButton.x - this.hintButton.width - 15;
    this.hintButton.y = BASE_HEIGHT - this.hintButton.height - 30;

    this.helpButton.x = BASE_WIDTH - this.helpButton.width - 30;
    this.helpButton.y = 30;
  }

  private initEvents(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousemove', (e) => {
      const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
      this.updateButtonHover(x, y);
      this.puzzleMechanics.handleMouseMove(x, y, BASE_WIDTH, BASE_HEIGHT);
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);

      if (this.handleButtonClick(x, y)) return;

      this.puzzleMechanics.handleMouseDown(x, y, BASE_WIDTH, BASE_HEIGHT);
    });

    this.canvas.addEventListener('mouseup', (e) => {
      const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
      this.puzzleMechanics.handleMouseUp(x, y, BASE_WIDTH, BASE_HEIGHT);
    });

    this.canvas.addEventListener('click', (e) => {
      const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);

      if (this.handleButtonClick(x, y)) return;
      if (this.showHelp && !this.isInHelpPanel(x, y)) {
        this.showHelp = false;
        return;
      }

      this.puzzleMechanics.handleClick(x, y, BASE_WIDTH, BASE_HEIGHT);
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
      this.puzzleMechanics.handleRightClick(x, y, BASE_WIDTH, BASE_HEIGHT);
    });
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (BASE_WIDTH / rect.width);
    const y = (clientY - rect.top) * (BASE_HEIGHT / rect.height);
    return { x, y };
  }

  private updateButtonHover(x: number, y: number): void {
    this.resetButton.hovered = this.hitTestButton(x, y, this.resetButton);
    this.hintButton.hovered = this.hitTestButton(x, y, this.hintButton);
    this.helpButton.hovered = this.hitTestButton(x, y, this.helpButton);
  }

  private hitTestButton(x: number, y: number, btn: UIButton): boolean {
    return x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height;
  }

  private handleButtonClick(x: number, y: number): boolean {
    if (this.hitTestButton(x, y, this.resetButton)) {
      this.resetButton.onClick();
      return true;
    }
    if (this.hitTestButton(x, y, this.hintButton)) {
      this.hintButton.onClick();
      return true;
    }
    if (this.hitTestButton(x, y, this.helpButton)) {
      this.helpButton.onClick();
      return true;
    }
    return false;
  }

  private isInHelpPanel(x: number, y: number): boolean {
    const panelX = BASE_WIDTH - 350;
    const panelY = 90;
    const panelW = 320;
    const panelH = 380;
    return x >= panelX && x <= panelX + panelW && y >= panelY && y <= panelY + panelH;
  }

  private showHint(): void {
    const state = this.puzzleMechanics.getState();
    const layer = state.currentLayer;
    const hints: Record<number, string> = {
      1: '按数字顺序 1→2→3 依次点击齿轮',
      2: '将锁扣拖入图案相同的插槽',
      3: '仔细观察亮灯顺序，然后按相同顺序点击',
      4: '右键旋转碎片，拖至虚线五边形对应位置',
      5: `密码线索：层1=3, 层2=7, 层3=1, 层4=5`,
    };
    alert(`第${layer}层提示：${hints[layer] || '继续探索！'}`);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(dt);
    this.render();

    requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.puzzleMechanics.update(dt);
    this.effects.update();
  }

  private render(): void {
    this.renderBackground();
    this.boxLayer.render(this.ctx);
    this.effects.render(this.ctx, BASE_WIDTH, BASE_HEIGHT);
    this.renderUI();

    const state = this.puzzleMechanics.getState();
    if (state.gameWon) {
      this.renderVictory();
    } else if (state.gameLost) {
      this.renderGameOver();
    }

    if (this.showHelp) {
      this.renderHelpPanel();
    }
  }

  private renderBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
    gradient.addColorStop(0, '#3E2723');
    gradient.addColorStop(1, '#5D4037');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    this.ctx.save();
    for (let i = 0; i < 200; i++) {
      this.ctx.globalAlpha = Math.random() * 0.05;
      this.ctx.fillStyle = Math.random() > 0.5 ? '#FFFFFF' : '#000000';
      this.ctx.fillRect(
        Math.random() * BASE_WIDTH,
        Math.random() * BASE_HEIGHT,
        1 + Math.random() * 2,
        1 + Math.random() * 2
      );
    }
    this.ctx.restore();
  }

  private renderUI(): void {
    const state = this.puzzleMechanics.getState();

    this.renderTopLeftHUD(state);
    this.renderBottomRightButtons();
    this.renderHelpButton();
  }

  private renderTopLeftHUD(state: { currentLayer: number; totalLayers: number; totalTime: number; maxTotalTime: number; gameWon: boolean; gameLost: boolean }): void {
    this.ctx.save();

    const timeLeft = Math.max(0, state.maxTotalTime - state.totalTime);
    const minutes = Math.floor(timeLeft / 60);
    const seconds = Math.floor(timeLeft % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    this.ctx.fillStyle = timeLeft < 30 ? '#E74C3C' : '#FFFFFF';
    this.ctx.font = 'bold 32px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.shadowColor = '#000000';
    this.ctx.shadowBlur = 4;
    this.ctx.fillText(`⏱ ${timeStr}`, 30, 30);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.fillText(`第 ${state.currentLayer} / ${state.totalLayers} 层`, 30, 75);

    const progressX = 30;
    const progressY = 115;
    const progressW = 250;
    const progressH = 14;

    this.ctx.fillStyle = '#2C3E50';
    this.ctx.beginPath();
    this.ctx.roundRect(progressX, progressY, progressW, progressH, 7);
    this.ctx.fill();

    const progress = state.currentLayer / state.totalLayers;
    const grad = this.ctx.createLinearGradient(progressX, progressY, progressX + progressW, progressY);
    grad.addColorStop(0, '#F1C40F');
    grad.addColorStop(1, '#E67E22');
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.roundRect(progressX, progressY, progressW * progress, progressH, 7);
    this.ctx.fill();

    this.ctx.strokeStyle = '#B8860B';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(progressX, progressY, progressW, progressH, 7);
    this.ctx.stroke();

    const layerTimeLeft = Math.max(0, this.boxLayer.layerTimeLimit - this.boxLayer.layerTimer);
    if (!state.gameWon && !state.gameLost && layerTimeLeft < this.boxLayer.layerTimeLimit) {
      this.ctx.fillStyle = layerTimeLeft < 3 ? '#E74C3C' : '#F39C12';
      this.ctx.font = 'bold 20px sans-serif';
      this.ctx.fillText(`本层倒计时: ${layerTimeLeft.toFixed(1)}s`, 30, 145);
    }

    this.ctx.restore();
  }

  private renderBottomRightButtons(): void {
    this.renderButton(this.resetButton, '#E74C3C', '#C0392B');
    this.renderButton(this.hintButton, '#3498DB', '#2980B9');
  }

  private renderButton(btn: UIButton, baseColor: string, hoverColor: string): void {
    this.ctx.save();

    const color = btn.hovered ? hoverColor : baseColor;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 8);
    this.ctx.fill();

    this.ctx.strokeStyle = '#FFFFFF40';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    if (btn.hovered) {
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 10;
    }

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2);

    this.ctx.restore();
  }

  private renderHelpButton(): void {
    this.ctx.save();

    this.ctx.fillStyle = this.helpButton.hovered ? '#00000080' : '#00000050';
    this.ctx.beginPath();
    this.ctx.arc(
      this.helpButton.x + this.helpButton.width / 2,
      this.helpButton.y + this.helpButton.height / 2,
      this.helpButton.width / 2,
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    if (this.helpButton.hovered) {
      this.ctx.shadowColor = '#FFFFFF';
      this.ctx.shadowBlur = 10;
    }

    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 28px serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(this.helpButton.label,
      this.helpButton.x + this.helpButton.width / 2,
      this.helpButton.y + this.helpButton.height / 2 + 2
    );

    this.ctx.restore();
  }

  private renderHelpPanel(): void {
    const panelX = BASE_WIDTH - 350;
    const panelY = 90;
    const panelW = 320;
    const panelH = 380;

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(44, 62, 80, 0.95)';
    this.ctx.beginPath();
    this.ctx.roundRect(panelX, panelY, panelW, panelH, 12);
    this.ctx.fill();

    this.ctx.strokeStyle = '#B8860B';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = 'bold 22px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('操作说明', panelX + panelW / 2, panelY + 20);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '14px sans-serif';
    this.ctx.textAlign = 'left';

    const tips = [
      '• 左键点击：与齿轮、暗格、密码盘交互',
      '• 左键拖拽：移动锁扣和拼图碎片',
      '• 右键点击：旋转五边形拼图碎片',
      '',
      '五层机关：',
      '1. 齿轮：按 1→2→3 顺序点击旋转',
      '2. 锁扣：拖入图案匹配的插槽',
      '3. 暗格：记忆亮灯顺序后复现',
      '4. 拼图：右键旋转 + 拖拽吸附',
      '5. 密码：根据前四层线索输入',
      '',
      '限时5分钟内完成全部五层！',
    ];

    let y = panelY + 60;
    for (const tip of tips) {
      this.ctx.fillText(tip, panelX + 20, y);
      y += tip === '' ? 8 : 22;
    }

    this.ctx.restore();
  }

  private renderVictory(): void {
    const state = this.puzzleMechanics.getState();
    const totalTime = state.totalTime;

    this.ctx.save();

    const grad = this.ctx.createLinearGradient(0, 0, BASE_WIDTH, BASE_HEIGHT);
    grad.addColorStop(0, '#FFD700');
    grad.addColorStop(1, '#FFA500');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    for (let i = 0; i < 100; i++) {
      this.ctx.globalAlpha = Math.random() * 0.3;
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(
        Math.random() * BASE_WIDTH,
        Math.random() * BASE_HEIGHT,
        1 + Math.random() * 3,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;

    const boxW = 500;
    const boxH = 400;
    const boxX = (BASE_WIDTH - boxW) / 2;
    const boxY = (BASE_HEIGHT - boxH) / 2;

    this.ctx.strokeStyle = '#FFD700';
    this.ctx.lineWidth = 8;
    this.ctx.shadowColor = '#FFA500';
    this.ctx.shadowBlur = 30;
    this.ctx.beginPath();
    this.ctx.roundRect(boxX, boxY, boxW, boxH, 20);
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fill();

    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = 'bold 48px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.shadowColor = '#FFA500';
    this.ctx.shadowBlur = 15;
    this.ctx.fillText('🎉 恭喜通关！', BASE_WIDTH / 2, boxY + 30);

    const minutes = Math.floor(totalTime / 60);
    const seconds = Math.floor(totalTime % 60);
    const ms = Math.floor((totalTime % 1) * 100);
    const timeStr = `${minutes}分${seconds.toString().padStart(2, '0')}秒${ms.toString().padStart(2, '0')}`;

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 28px sans-serif';
    this.ctx.shadowBlur = 5;
    this.ctx.fillText(`耗时：${timeStr}`, BASE_WIDTH / 2, boxY + 110);

    const stars = totalTime < 90 ? 3 : totalTime < 150 ? 2 : 1;
    this.ctx.font = '60px sans-serif';
    const starStr = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fillText(starStr, BASE_WIDTH / 2, boxY + 160);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 22px sans-serif';
    const ratingText = stars === 3 ? '完美！大师级解谜者！' :
                       stars === 2 ? '不错！熟练的寻宝人！' :
                       '通关了！继续练习吧！';
    this.ctx.fillText(ratingText, BASE_WIDTH / 2, boxY + 250);

    this.ctx.fillStyle = '#BDC3C7';
    this.ctx.font = '16px sans-serif';
    this.ctx.fillText(`星级标准: <90秒=3星 | <150秒=2星 | 其余=1星`, BASE_WIDTH / 2, boxY + 300);
    this.ctx.fillText('点击「重置游戏」再来一局', BASE_WIDTH / 2, boxY + 330);

    this.ctx.restore();
  }

  private renderGameOver(): void {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(231, 76, 60, 0.85)';
    this.ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    const boxW = 450;
    const boxH = 250;
    const boxX = (BASE_WIDTH - boxW) / 2;
    const boxY = (BASE_HEIGHT - boxH) / 2;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.beginPath();
    this.ctx.roundRect(boxX, boxY, boxW, boxH, 15);
    this.ctx.fill();

    this.ctx.strokeStyle = '#E74C3C';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    this.ctx.fillStyle = '#E74C3C';
    this.ctx.font = 'bold 48px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('⏰ 时间到！', BASE_WIDTH / 2, boxY + 30);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '22px sans-serif';
    this.ctx.fillText('5分钟已用完，寻宝失败...', BASE_WIDTH / 2, boxY + 110);
    this.ctx.fillText('点击「重置游戏」重新挑战！', BASE_WIDTH / 2, boxY + 150);

    this.ctx.restore();
  }
}

const game = new Game();
game.start();

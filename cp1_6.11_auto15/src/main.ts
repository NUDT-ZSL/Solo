import { LakeRenderer } from './lake';
import { FishingSystem } from './fishing';
import {
  CreatureSystem,
  AchievementSystem,
  Achievement,
  CollectedCreature,
  CREATURE_TEMPLATES,
  RARITY_CONFIG,
  CreatureType,
  CreatureTemplate
} from './creature';

interface UIPanel {
  visible: boolean;
  animationProgress: number;
}

interface AchievementNotification {
  achievement: Achievement;
  startTime: number;
  duration: number;
  flashProgress: number;
}

interface SelectedCreature {
  type: CreatureType;
  startTime: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  private lake: LakeRenderer;
  private fishing: FishingSystem;
  private creatureSystem: CreatureSystem;
  private achievementSystem: AchievementSystem;

  private lastTime: number = 0;
  private deltaTime: number = 0;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  private fps: number = 0;
  private fpsUpdateTime: number = 0;
  private frameCount: number = 0;

  private mouseX: number = 0;
  private mouseY: number = 0;

  private codexPanel: UIPanel = { visible: false, animationProgress: 0 };
  private achievementPanel: UIPanel = { visible: false, animationProgress: 0 };

  private achievementNotifications: AchievementNotification[] = [];
  private selectedCreature: SelectedCreature | null = null;

  private isMobile: boolean = false;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.creatureSystem = new CreatureSystem();
    this.lake = new LakeRenderer(this.canvas);
    this.fishing = new FishingSystem(this.canvas, this.lake, this.creatureSystem);
    this.achievementSystem = new AchievementSystem();

    this.resize();
    this.setupEventListeners();
    this.checkMobile();
  }

  private resize(): void {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
    this.lake.resize();
    this.fishing.resize();
    this.checkMobile();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < 768;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('click', (e) => this.onClick(e));

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onMouseUp({} as MouseEvent);
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'c' || e.key === 'C') {
        this.toggleCodex();
      } else if (e.key === 'a' || e.key === 'A') {
        this.toggleAchievements();
      } else if (e.key === 'Escape') {
        this.closeAllPanels();
      }
    });

    setTimeout(() => {
      const loadingScreen = document.getElementById('loadingScreen');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(() => loadingScreen.remove(), 500);
      }
    }, 1800);
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
    this.isMouseDown = true;

    if (!this.isClickOnUI(this.mouseX, this.mouseY)) {
      if (this.fishing.getState() === 'idle') {
        this.fishing.startCharging(this.mouseX, this.mouseY);
      } else if (this.fishing.getState() === 'biting') {
        this.fishing.reelIn();
      } else if (this.fishing.getState() === 'result') {
        this.fishing.clearCatchResult();
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;

    this.fishing.updateChargePosition(this.mouseX, this.mouseY);
  }

  private onMouseUp(_e: MouseEvent): void {
    this.isMouseDown = false;

    if (this.fishing.getState() === 'charging') {
      this.fishing.releaseCast();
    }
  }

  private onClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.isClickOnUI(x, y)) {
      this.handleUIClick(x, y);
    } else if (!this.codexPanel.visible && !this.achievementPanel.visible) {
      if (this.fishing.getState() === 'result') {
        this.fishing.clearCatchResult();
      }
    } else {
      this.closeAllPanels();
    }
  }

  private isClickOnUI(_x: number, y: number): boolean {
    if (this.isMobile) {
      return y < 70 || this.codexPanel.visible || this.achievementPanel.visible;
    }
    return y < 80 || this.codexPanel.visible || this.achievementPanel.visible;
  }

  private handleUIClick(x: number, y: number): void {
    if (this.codexPanel.visible) {
      this.handleCodexClick(x, y);
      return;
    }

    if (this.achievementPanel.visible) {
      return;
    }

    const buttonWidth = this.isMobile ? 80 : 120;
    const buttonHeight = this.isMobile ? 40 : 50;
    const buttonSpacing = this.isMobile ? 10 : 20;
    const startX = this.width / 2 - (buttonWidth * 3 + buttonSpacing * 2) / 2;

    for (let i = 0; i < 3; i++) {
      const bx = startX + i * (buttonWidth + buttonSpacing);
      const by = 15;
      if (x >= bx && x <= bx + buttonWidth && y >= by && y <= by + buttonHeight) {
        if (i === 0) {
          if (this.fishing.getState() === 'idle') {
            this.fishing.startCharging(this.width / 2, this.height / 2);
            setTimeout(() => this.fishing.releaseCast(), 500);
          }
        } else if (i === 1) {
          this.toggleCodex();
        } else if (i === 2) {
          this.toggleAchievements();
        }
        return;
      }
    }
  }

  private handleCodexClick(x: number, y: number): void {
    const padding = 20;
    const topPadding = 70;
    const itemSize = this.isMobile ? 50 : 60;
    const gap = this.isMobile ? 8 : 12;
    const cols = 5;

    const gridWidth = cols * itemSize + (cols - 1) * gap;
    const gridStartX = (this.width - gridWidth) / 2;

    for (let i = 0; i < CREATURE_TEMPLATES.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ix = gridStartX + col * (itemSize + gap);
      const iy = topPadding + padding + row * (itemSize + gap);

      if (x >= ix && x <= ix + itemSize && y >= iy && y <= iy + itemSize) {
        const template = CREATURE_TEMPLATES[i];
        if (this.creatureSystem.isCollected(template.type)) {
          this.selectedCreature = {
            type: template.type,
            startTime: Date.now()
          };
        }
        return;
      }
    }

    this.selectedCreature = null;
  }

  private toggleCodex(): void {
    this.codexPanel.visible = !this.codexPanel.visible;
    if (this.codexPanel.visible) {
      this.achievementPanel.visible = false;
      this.selectedCreature = null;
    }
  }

  private toggleAchievements(): void {
    this.achievementPanel.visible = !this.achievementPanel.visible;
    if (this.achievementPanel.visible) {
      this.codexPanel.visible = false;
      this.selectedCreature = null;
    }
  }

  private closeAllPanels(): void {
    this.codexPanel.visible = false;
    this.achievementPanel.visible = false;
    this.selectedCreature = null;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    this.deltaTime = Math.min(50, currentTime - this.lastTime);
    this.lastTime = currentTime;

    this.frameCount++;
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }

    this.update(currentTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(currentTime: number): void {
    this.lake.update(this.deltaTime, currentTime);
    this.fishing.update(this.deltaTime, currentTime);

    this.checkAchievements();

    const animationSpeed = this.deltaTime / 300;
    if (this.codexPanel.visible && this.codexPanel.animationProgress < 1) {
      this.codexPanel.animationProgress = Math.min(1, this.codexPanel.animationProgress + animationSpeed);
    } else if (!this.codexPanel.visible && this.codexPanel.animationProgress > 0) {
      this.codexPanel.animationProgress = Math.max(0, this.codexPanel.animationProgress - animationSpeed);
    }

    if (this.achievementPanel.visible && this.achievementPanel.animationProgress < 1) {
      this.achievementPanel.animationProgress = Math.min(1, this.achievementPanel.animationProgress + animationSpeed);
    } else if (!this.achievementPanel.visible && this.achievementPanel.animationProgress > 0) {
      this.achievementPanel.animationProgress = Math.max(0, this.achievementPanel.animationProgress - animationSpeed);
    }

    this.achievementNotifications = this.achievementNotifications.filter(n => {
      const elapsed = currentTime - n.startTime;
      n.flashProgress = Math.min(1, elapsed / 500);
      return elapsed < n.duration;
    });
  }

  private checkAchievements(): void {
    const stats = {
      score: this.fishing.getScore(),
      uniqueCaught: this.creatureSystem.getCollectedCount(),
      totalCaught: this.fishing.getTotalCaught(),
      caughtRarities: this.fishing.getCaughtRarities()
    };

    const newAchievements = this.achievementSystem.checkAchievements(stats);
    for (const achievement of newAchievements) {
      this.achievementNotifications.push({
        achievement,
        startTime: Date.now(),
        duration: 2000,
        flashProgress: 0
      });
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.lake.render();
    this.fishing.render();

    this.renderUI();
    this.renderCodexPanel();
    this.renderAchievementPanel();
    this.renderAchievementNotifications();
    this.renderCreatureDetail();
    this.renderCatchResult();

    this.renderFPS();
  }

  private renderUI(): void {
    const ctx = this.ctx;
    const buttonWidth = this.isMobile ? 80 : 120;
    const buttonHeight = this.isMobile ? 40 : 50;
    const buttonSpacing = this.isMobile ? 10 : 20;

    const buttons = ['快速投掷', '图鉴', '成就'];
    const startX = this.width / 2 - (buttonWidth * 3 + buttonSpacing * 2) / 2;

    ctx.save();

    ctx.fillStyle = 'rgba(10, 25, 47, 0.85)';
    ctx.fillRect(0, 0, this.width, this.isMobile ? 70 : 80);

    ctx.strokeStyle = 'rgba(100, 255, 218, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.isMobile ? 70 : 80);
    ctx.lineTo(this.width, this.isMobile ? 70 : 80);
    ctx.stroke();

    for (let i = 0; i < buttons.length; i++) {
      const bx = startX + i * (buttonWidth + buttonSpacing);
      const by = 15;

      const isHovered = this.mouseX >= bx && this.mouseX <= bx + buttonWidth &&
                        this.mouseY >= by && this.mouseY <= by + buttonHeight;

      ctx.fillStyle = 'rgba(10, 25, 47, 0.8)';
      ctx.strokeStyle = isHovered ? 'rgba(251, 191, 36, 0.6)' : 'rgba(100, 255, 218, 0.3)';
      ctx.lineWidth = 1;

      this.roundRect(ctx, bx, by, buttonWidth, buttonHeight, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isHovered ? '#fbbf24' : '#64ffda';
      ctx.font = `${this.isMobile ? 12 : 14}px "Microsoft YaHei"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(buttons[i], bx + buttonWidth / 2, by + buttonHeight / 2);
    }

    ctx.fillStyle = '#64ffda';
    ctx.font = `${this.isMobile ? 12 : 16}px "Microsoft YaHei"`;
    ctx.textAlign = 'left';
    ctx.fillText(`分数: ${this.fishing.getScore()}`, 20, this.isMobile ? 35 : 40);
    ctx.fillText(`已钓: ${this.fishing.getTotalCaught()}`, 20, this.isMobile ? 58 : 65);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#8892b0';
    ctx.font = `${this.isMobile ? 10 : 12}px "Microsoft YaHei"`;
    ctx.fillText(
      `成就: ${this.achievementSystem.getUnlockedCount()}/${this.achievementSystem.getAchievements().length}`,
      this.width - 20,
      this.isMobile ? 35 : 40
    );
    ctx.fillText(
      `图鉴: ${this.creatureSystem.getCollectedCount()}/${CREATURE_TEMPLATES.length}`,
      this.width - 20,
      this.isMobile ? 58 : 65
    );

    const state = this.fishing.getState();
    if (state === 'floating') {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8892b0';
      ctx.font = '14px "Microsoft YaHei"';
      ctx.fillText('等待鱼儿上钩...', this.width / 2, this.height - 30);
    } else if (state === 'biting') {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff4757';
      ctx.font = 'bold 20px "Microsoft YaHei"';
      ctx.fillText('咬钩了！快点击收杆！', this.width / 2, this.height - 30);
    } else if (state === 'idle') {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8892b0';
      ctx.font = '14px "Microsoft YaHei"';
      ctx.fillText('按住鼠标蓄力，松开投掷浮标', this.width / 2, this.height - 30);
    }

    ctx.restore();
  }

  private renderCodexPanel(): void {
    if (this.codexPanel.animationProgress <= 0) return;

    const ctx = this.ctx;
    const progress = this.codexPanel.animationProgress;

    const panelHeight = Math.min(this.height * 0.8, 500);
    const panelY = -panelHeight + (panelHeight + 80) * this.easeOutCubic(progress);

    ctx.save();

    ctx.fillStyle = `rgba(10, 25, 47, ${0.95 * progress})`;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = 'rgba(10, 25, 47, 0.95)';
    ctx.strokeStyle = 'rgba(100, 255, 218, 0.3)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, 20, panelY, this.width - 40, panelHeight, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#64ffda';
    ctx.font = 'bold 24px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText('生物图鉴', this.width / 2, panelY + 45);

    const padding = 20;
    const topPadding = 70;
    const itemSize = this.isMobile ? 50 : 60;
    const gap = this.isMobile ? 8 : 12;
    const cols = 5;

    const gridWidth = cols * itemSize + (cols - 1) * gap;
    const gridStartX = (this.width - gridWidth) / 2;

    for (let i = 0; i < CREATURE_TEMPLATES.length; i++) {
      const template = CREATURE_TEMPLATES[i];
      const collected = this.creatureSystem.isCollected(template.type);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ix = gridStartX + col * (itemSize + gap);
      const iy = panelY + topPadding + padding + row * (itemSize + gap);

      if (collected) {
        const creatureData = this.creatureSystem.getCreatureByType(template.type);
        if (creatureData) {
          this.renderCodexItem(ctx, ix, iy, itemSize, template, creatureData);
        }
      } else {
        ctx.fillStyle = 'rgba(136, 146, 176, 0.3)';
        this.roundRect(ctx, ix, iy, itemSize, itemSize, 8);
        ctx.fill();

        ctx.fillStyle = '#8892b0';
        ctx.font = '20px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', ix + itemSize / 2, iy + itemSize / 2);
      }
    }

    ctx.fillStyle = '#8892b0';
    ctx.font = '12px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText('点击已解锁的生物查看详情', this.width / 2, panelY + panelHeight - 30);

    ctx.restore();
  }

  private renderCodexItem(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    template: CreatureTemplate,
    data: CollectedCreature
  ): void {
    const isSelected = this.selectedCreature?.type === template.type;
    const rarityConfig = RARITY_CONFIG[data.rarity];

    ctx.save();

    if (isSelected) {
      ctx.shadowColor = rarityConfig.color;
      ctx.shadowBlur = 15;
    }

    ctx.fillStyle = 'rgba(10, 25, 47, 0.8)';
    ctx.strokeStyle = rarityConfig.color;
    ctx.lineWidth = 2;
    this.roundRect(ctx, x, y, size, size, 8);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.fillStyle = template.color;
    ctx.strokeStyle = rarityConfig.color;
    ctx.lineWidth = 1;
    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    const drawSize = size * 0.6;

    switch (template.type) {
      case 'ghostFish':
        this.drawMiniGhostFish(ctx, drawSize);
        break;
      case 'treasureChest':
        this.drawMiniTreasureChest(ctx, drawSize);
        break;
      case 'woodSpirit':
        this.drawMiniWoodSpirit(ctx, drawSize);
        break;
      case 'abyssLord':
        this.drawMiniAbyssLord(ctx, drawSize);
        break;
      case 'starJellyfish':
        this.drawMiniStarJellyfish(ctx, drawSize);
        break;
    }
    ctx.restore();

    ctx.fillStyle = '#64ffda';
    ctx.font = '10px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText(template.name, x + size / 2, y + size + 14);

    if (data.count > 1) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 10px "Microsoft YaHei"';
      ctx.textAlign = 'right';
      ctx.fillText(`×${data.count}`, x + size - 4, y + 12);
    }

    ctx.restore();
  }

  private drawMiniGhostFish(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, size / 2, size / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size / 2, 0);
    ctx.lineTo(-size / 2 - size / 6, -size / 4);
    ctx.lineTo(-size / 2 - size / 6, size / 4);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawMiniTreasureChest(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.fillRect(-size / 2, -size / 4, size, size / 2);
    ctx.strokeRect(-size / 2, -size / 4, size, size / 2);
    ctx.beginPath();
    ctx.moveTo(-size / 2, -size / 4);
    ctx.quadraticCurveTo(0, -size / 2, size / 2, -size / 4);
    ctx.fill();
    ctx.stroke();
  }

  private drawMiniWoodSpirit(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.beginPath();
    ctx.ellipse(0, 0, size / 3, size / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private drawMiniAbyssLord(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.beginPath();
    ctx.ellipse(0, 0, size / 2, size / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private drawMiniStarJellyfish(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.ellipse(0, 0, size / 2, size / 3, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private renderAchievementPanel(): void {
    if (this.achievementPanel.animationProgress <= 0) return;

    const ctx = this.ctx;
    const progress = this.achievementPanel.animationProgress;

    const panelWidth = this.isMobile ? this.width - 40 : 320;
    const panelHeight = Math.min(this.height - 120, 500);
    const panelX = this.width - panelWidth - 20;
    const startX = this.width + 20;
    const currentX = startX + (panelX - startX) * this.easeOutCubic(progress);

    ctx.save();

    ctx.fillStyle = `rgba(10, 25, 47, ${0.95 * progress})`;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = 'rgba(10, 25, 47, 0.95)';
    ctx.strokeStyle = 'rgba(100, 255, 218, 0.3)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, currentX, 80, panelWidth, panelHeight, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#64ffda';
    ctx.font = 'bold 24px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText('成就列表', currentX + panelWidth / 2, 115);

    const achievements = this.achievementSystem.getAchievements();
    const itemHeight = this.isMobile ? 55 : 60;
    const padding = 15;
    const scrollY = 0;

    for (let i = 0; i < achievements.length; i++) {
      const achievement = achievements[i];
      const iy = 140 + padding + i * (itemHeight + 8) + scrollY;

      if (iy > 80 + panelHeight - 30) break;

      this.renderAchievementItem(ctx, currentX + padding, iy, panelWidth - padding * 2, itemHeight, achievement);
    }

    ctx.restore();
  }

  private renderAchievementItem(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    achievement: Achievement
  ): void {
    ctx.save();

    if (achievement.unlocked) {
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
    } else {
      ctx.fillStyle = 'rgba(136, 146, 176, 0.1)';
    }

    ctx.strokeStyle = achievement.unlocked ? 'rgba(251, 191, 36, 0.5)' : 'rgba(136, 146, 176, 0.3)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, width, height, 6);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.fillStyle = achievement.unlocked ? '#fbbf24' : '#8892b0';
    ctx.font = '20px "Microsoft YaHei"';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(achievement.unlocked ? '★' : '☆', x + 12, y + height / 2);

    ctx.fillStyle = achievement.unlocked ? '#fbbf24' : '#8892b0';
    ctx.font = 'bold 14px "Microsoft YaHei"';
    ctx.fillText(achievement.name, x + 45, y + height / 2 - 10);

    ctx.fillStyle = achievement.unlocked ? '#64ffda' : '#8892b0';
    ctx.font = '11px "Microsoft YaHei"';
    ctx.fillText(achievement.description, x + 45, y + height / 2 + 12);

    ctx.restore();
  }

  private renderAchievementNotifications(): void {
    const ctx = this.ctx;

    for (let i = 0; i < this.achievementNotifications.length; i++) {
      const notification = this.achievementNotifications[i];
      const elapsed = Date.now() - notification.startTime;
      const totalProgress = elapsed / notification.duration;

      let opacity = 1;
      if (totalProgress < 0.1) {
        opacity = totalProgress / 0.1;
      } else if (totalProgress > 0.8) {
        opacity = (1 - totalProgress) / 0.2;
      }

      const flash = Math.sin(elapsed * 0.02) * 0.3 + 0.7;
      const yOffset = this.height / 2 - 60 + i * 80;

      ctx.save();
      ctx.globalAlpha = opacity;

      ctx.fillStyle = `rgba(251, 191, 36, ${flash * 0.3})`;
      ctx.fillRect(0, 0, this.width, this.height);

      const bannerWidth = this.isMobile ? 280 : 400;
      const bannerHeight = this.isMobile ? 80 : 100;
      const bx = (this.width - bannerWidth) / 2;
      const by = yOffset;

      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 30 * flash;
      ctx.fillStyle = 'rgba(10, 25, 47, 0.95)';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      this.roundRect(ctx, bx, by, bannerWidth, bannerHeight, 12);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 16px "Microsoft YaHei"';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 成就解锁！', this.width / 2, by + 30);

      ctx.font = 'bold 24px "Microsoft YaHei"';
      ctx.fillText(notification.achievement.name, this.width / 2, by + 65);

      ctx.font = '12px "Microsoft YaHei"';
      ctx.fillStyle = '#64ffda';
      ctx.fillText(notification.achievement.description, this.width / 2, by + 85);

      ctx.restore();
    }
  }

  private renderCreatureDetail(): void {
    if (!this.selectedCreature) return;

    const ctx = this.ctx;
    const creatureData = this.creatureSystem.getCreatureByType(this.selectedCreature.type);
    if (!creatureData) return;

    const template = CREATURE_TEMPLATES.find(t => t.type === this.selectedCreature!.type);
    if (!template) return;

    const elapsed = Date.now() - this.selectedCreature.startTime;
    const progress = Math.min(1, elapsed / 300);

    ctx.save();

    const panelWidth = this.isMobile ? this.width - 80 : 350;
    const panelHeight = this.isMobile ? 380 : 420;
    const px = (this.width - panelWidth) / 2;
    const py = (this.height - panelHeight) / 2;

    ctx.globalAlpha = progress;

    ctx.fillStyle = 'rgba(2, 12, 27, 0.8)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = 'rgba(10, 25, 47, 0.98)';
    ctx.strokeStyle = RARITY_CONFIG[creatureData.rarity].color;
    ctx.lineWidth = 2;
    this.roundRect(ctx, px, py, panelWidth, panelHeight, 12);
    ctx.fill();
    ctx.stroke();

    const iconSize = this.isMobile ? 80 : 100;
    ctx.save();
    ctx.translate(px + panelWidth / 2, py + 80);

    ctx.shadowColor = creatureData.glowColor;
    ctx.shadowBlur = 20;
    ctx.fillStyle = template.color;
    ctx.strokeStyle = RARITY_CONFIG[creatureData.rarity].color;
    ctx.lineWidth = 2;

    const drawSize = iconSize;
    switch (template.type) {
      case 'ghostFish':
        this.drawMiniGhostFish(ctx, drawSize);
        break;
      case 'treasureChest':
        this.drawMiniTreasureChest(ctx, drawSize);
        break;
      case 'woodSpirit':
        this.drawMiniWoodSpirit(ctx, drawSize);
        break;
      case 'abyssLord':
        this.drawMiniAbyssLord(ctx, drawSize);
        break;
      case 'starJellyfish':
        this.drawMiniStarJellyfish(ctx, drawSize);
        break;
    }
    ctx.restore();

    ctx.shadowBlur = 0;
    ctx.fillStyle = RARITY_CONFIG[creatureData.rarity].color;
    ctx.font = 'bold 22px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText(template.name, px + panelWidth / 2, py + 155);

    ctx.fillStyle = '#8892b0';
    ctx.font = '14px "Microsoft YaHei"';
    ctx.fillText(`稀有度：${RARITY_CONFIG[creatureData.rarity].name}`, px + panelWidth / 2, py + 185);
    ctx.fillText(`基础分数：${creatureData.score} 分`, px + panelWidth / 2, py + 208);

    ctx.fillStyle = '#64ffda';
    ctx.font = '14px "Microsoft YaHei"';
    ctx.fillText(`已捕获：${creatureData.count} 次`, px + panelWidth / 2, py + 240);

    ctx.fillStyle = '#8892b0';
    ctx.font = '12px "Microsoft YaHei"';
    ctx.textAlign = 'left';

    const textX = px + 30;
    const textWidth = panelWidth - 60;
    this.wrapText(ctx, template.description, textX, py + 275, textWidth, 18);

    ctx.fillStyle = '#64ffda';
    ctx.font = '11px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText('点击空白处关闭', px + panelWidth / 2, py + panelHeight - 25);

    ctx.restore();
  }

  private renderCatchResult(): void {
    this.fishing.renderCatchResult();
  }

  private renderFPS(): void {
    if (this.fps === 0) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(10, 25, 47, 0.7)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = this.fps >= 30 ? '#4ade80' : this.fps >= 20 ? '#fbbf24' : '#ff4757';
    ctx.fillText(`${this.fps} FPS`, this.width - 10, this.height - 10);
    ctx.fillText(`粒子: ${this.lake.getActiveParticleCount()}`, this.width - 10, this.height - 25);
    ctx.restore();
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

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const words = text.split('');
    let line = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, y);
        line = words[i];
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }
}

const game = new Game();
game.start();

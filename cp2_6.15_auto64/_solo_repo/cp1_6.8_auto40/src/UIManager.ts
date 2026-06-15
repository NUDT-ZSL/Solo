import type { SkillTreeManager, SkillNode, SkillBranch } from './SkillTreeManager';
import type { PlayerController } from './PlayerController';

export type UIScreen = 'menu' | 'playing' | 'skill_tree' | 'game_over' | 'level_complete' | 'paused';

interface AshParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class UIManager {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private screen: UIScreen = 'menu';
  private skillManager: SkillTreeManager;
  private player: PlayerController;

  private ashParticles: AshParticle[] = [];
  private menuPhase: number = 0;
  private screenShake: number = 0;
  private shakeIntensity: number = 0;

  private selectedSkillIndex: number = 0;
  private selectedBranch: SkillBranch = 'shadow';
  private scrollOffset: number = 0;

  private menuButtons: { x: number; y: number; w: number; h: number; label: string; action: string }[] = [];
  private hoveredButton: string | null = null;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number, skillManager: SkillTreeManager, player: PlayerController) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.skillManager = skillManager;
    this.player = player;
    this.initAshParticles();
    this.setupMenuButtons();
  }

  private initAshParticles(): void {
    for (let i = 0; i < 60; i++) {
      this.ashParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 15,
        vy: -10 - Math.random() * 20,
        size: 1 + Math.random() * 3,
        alpha: 0.2 + Math.random() * 0.5,
        life: Math.random() * 5,
        maxLife: 3 + Math.random() * 4,
      });
    }
  }

  private setupMenuButtons(): void {
    const cx = this.width / 2;
    this.menuButtons = [
      { x: cx - 120, y: 340, w: 240, h: 50, label: '开始深渊', action: 'start' },
      { x: cx - 120, y: 410, w: 240, h: 50, label: '技能树', action: 'skill_tree' },
    ];
  }

  setScreen(screen: UIScreen): void {
    this.screen = screen;
    if (screen === 'skill_tree') {
      this.selectedSkillIndex = 0;
      this.scrollOffset = 0;
    }
  }

  getScreen(): UIScreen {
    return this.screen;
  }

  triggerShake(intensity: number = 5, duration: number = 0.2): void {
    this.screenShake = duration;
    this.shakeIntensity = intensity;
  }

  getShakeOffset(): { x: number; y: number } {
    if (this.screenShake <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * this.shakeIntensity * 2,
      y: (Math.random() - 0.5) * this.shakeIntensity * 2,
    };
  }

  handleClick(mx: number, my: number): string | null {
    if (this.screen === 'menu') {
      for (const btn of this.menuButtons) {
        if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
          return btn.action;
        }
      }
    }

    if (this.screen === 'skill_tree') {
      const skills = this.skillManager.getSkills();
      const panelX = this.width / 2 - 450;
      const panelY = 60;
      for (const skill of skills) {
        const sx = panelX + skill.x;
        const sy = panelY + skill.y - this.scrollOffset;
        if (mx >= sx - 25 && mx <= sx + 25 && my >= sy - 25 && my <= sy + 25) {
          if (this.skillManager.canUnlock(skill.id)) {
            this.skillManager.unlockSkill(skill.id);
            this.player.refreshBoosts();
            this.triggerShake(8, 0.3);
            return 'skill_unlocked';
          }
          return null;
        }
      }

      const closeBtnX = this.width / 2 + 430;
      const closeBtnY = 65;
      if (mx >= closeBtnX && mx <= closeBtnX + 40 && my >= closeBtnY && my <= closeBtnY + 40) {
        return 'close_skill_tree';
      }
    }

    if (this.screen === 'game_over') {
      const cx = this.width / 2;
      if (mx >= cx - 120 && mx <= cx + 120 && my >= 420 && my <= 470) {
        return 'restart';
      }
      if (mx >= cx - 120 && mx <= cx + 120 && my >= 490 && my <= 540) {
        return 'to_menu';
      }
    }

    if (this.screen === 'level_complete') {
      const cx = this.width / 2;
      if (mx >= cx - 120 && mx <= cx + 120 && my >= 450 && my <= 500) {
        return 'next_level';
      }
    }

    if (this.screen === 'paused') {
      const cx = this.width / 2;
      if (mx >= cx - 120 && mx <= cx + 120 && my >= 350 && my <= 400) {
        return 'resume';
      }
      if (mx >= cx - 120 && mx <= cx + 120 && my >= 420 && my <= 470) {
        return 'to_menu';
      }
    }

    return null;
  }

  update(dt: number): void {
    this.menuPhase += dt;
    if (this.screenShake > 0) this.screenShake -= dt;

    for (const ash of this.ashParticles) {
      ash.x += ash.vx * dt;
      ash.y += ash.vy * dt;
      ash.life += dt;
      ash.alpha = 0.3 * (1 - ash.life / ash.maxLife);
      if (ash.life >= ash.maxLife || ash.y < -20 || ash.x < -20 || ash.x > this.width + 20) {
        ash.x = Math.random() * this.width;
        ash.y = this.height + 10;
        ash.life = 0;
        ash.vx = (Math.random() - 0.5) * 15;
        ash.vy = -10 - Math.random() * 20;
      }
    }
  }

  render(): void {
    switch (this.screen) {
      case 'menu':
        this.renderMenu();
        break;
      case 'playing':
        this.renderHUD();
        break;
      case 'skill_tree':
        this.renderSkillTree();
        break;
      case 'game_over':
        this.renderHUD();
        this.renderGameOver();
        break;
      case 'level_complete':
        this.renderHUD();
        this.renderLevelComplete();
        break;
      case 'paused':
        this.renderHUD();
        this.renderPaused();
        break;
    }
  }

  renderAshParticles(): void {
    for (const ash of this.ashParticles) {
      this.ctx.save();
      this.ctx.globalAlpha = ash.alpha;
      this.ctx.fillStyle = '#9ca3af';
      this.ctx.beginPath();
      this.ctx.arc(ash.x, ash.y, ash.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private renderMenu(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0612');
    grad.addColorStop(0.5, '#1a0a2e');
    grad.addColorStop(1, '#0d0820');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    this.renderAshParticles();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const titleY = 180 + Math.sin(this.menuPhase * 1.5) * 8;
    ctx.font = 'bold 56px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#c084fc';
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 30;
    ctx.fillText('深渊契约', w / 2, titleY);

    ctx.font = '20px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.shadowBlur = 0;
    ctx.fillText('ABYSS CONTRACT', w / 2, titleY + 45);

    ctx.font = '14px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#4b5563';
    ctx.fillText('WASD/方向键 移动 | 空格 跳跃 | J 攻击 | K 闪避 | L 远程', w / 2, h - 40);

    ctx.restore();

    for (const btn of this.menuButtons) {
      this.drawGlassButton(btn.x, btn.y, btn.w, btn.h, btn.label);
    }
  }

  private renderHUD(): void {
    const ctx = this.ctx;
    const p = this.player;

    ctx.save();

    const barX = 20;
    const barY = 20;
    const barW = 220;
    const barH = 22;

    ctx.fillStyle = 'rgba(10, 6, 18, 0.7)';
    this.drawRoundedRect(barX - 4, barY - 4, barW + 8, barH + 8, 6);
    ctx.fill();

    ctx.fillStyle = '#1f1024';
    this.drawRoundedRect(barX, barY, barW, barH, 4);
    ctx.fill();

    const hpRatio = p.hp / p.maxHp;
    const hpColor = hpRatio > 0.5 ? '#8b5cf6' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
    const hpGrad = ctx.createLinearGradient(barX, barY, barX + barW * hpRatio, barY);
    hpGrad.addColorStop(0, hpColor);
    hpGrad.addColorStop(1, this.lightenColor(hpColor, 30));
    ctx.fillStyle = hpGrad;
    this.drawRoundedRect(barX, barY, barW * hpRatio, barH, 4);
    ctx.fill();

    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, barX + barW / 2, barY + barH / 2);

    const fragX = barX;
    const fragY = barY + barH + 10;
    ctx.fillStyle = 'rgba(10, 6, 18, 0.7)';
    this.drawRoundedRect(fragX - 4, fragY - 4, 160, 28, 6);
    ctx.fill();

    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#a78bfa';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 8;
    ctx.fillText(`◆ ${this.skillManager.getFragments()}`, fragX + 6, fragY + 10);
    ctx.shadowBlur = 0;

    const levelX = this.width - 140;
    ctx.fillStyle = 'rgba(10, 6, 18, 0.7)';
    this.drawRoundedRect(levelX - 4, barY - 4, 128, 32, 6);
    ctx.fill();
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#c084fc';
    ctx.textAlign = 'left';
    ctx.fillText(`深渊 ${p.currentLevel} 层`, levelX + 6, barY + 12);

    const skillIcons = [
      { label: 'J', cd: p.attackCooldown, color: '#c084fc' },
      { label: 'K', cd: p.dashCooldown, maxCd: p.skillManager.getActiveBoosts().dashCooldown, color: '#8b5cf6' },
      { label: 'L', cd: p.shootCooldown, color: '#a78bfa' },
    ];

    const skillBarX = this.width / 2 - 75;
    const skillBarY = this.height - 60;
    for (let i = 0; i < skillIcons.length; i++) {
      const si = skillIcons[i];
      const ix = skillBarX + i * 55;
      ctx.fillStyle = 'rgba(10, 6, 18, 0.7)';
      this.drawRoundedRect(ix, skillBarY, 45, 45, 6);
      ctx.fill();

      ctx.strokeStyle = si.color;
      ctx.lineWidth = 2;
      this.drawRoundedRect(ix, skillBarY, 45, 45, 6);
      ctx.stroke();

      ctx.font = 'bold 16px "Segoe UI", sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(si.label, ix + 22, skillBarY + 22);

      if (si.cd > 0) {
        const maxCd = si.maxCd ?? 0.4;
        const cdRatio = Math.min(si.cd / maxCd, 1);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(ix, skillBarY, 45, 45 * cdRatio);
      }
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  private renderSkillTree(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.fillStyle = 'rgba(10, 6, 18, 0.92)';
    ctx.fillRect(0, 0, w, h);
    this.renderAshParticles();

    const panelX = w / 2 - 450;
    const panelY = 50;
    const panelW = 900;
    const panelH = 580;

    ctx.fillStyle = 'rgba(20, 10, 35, 0.8)';
    this.drawRoundedRect(panelX, panelY, panelW, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
    ctx.lineWidth = 1;
    this.drawRoundedRect(panelX, panelY, panelW, panelH, 12);
    ctx.stroke();

    ctx.save();
    ctx.font = 'bold 24px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#c084fc';
    ctx.textAlign = 'center';
    ctx.fillText('技能树', w / 2, panelY + 35);

    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#a78bfa';
    ctx.fillText(`◆ 混沌碎片: ${this.skillManager.getFragments()}`, w / 2, panelY + 58);
    ctx.restore();

    const branchNames: { branch: SkillBranch; name: string; color: string }[] = [
      { branch: 'shadow', name: '暗影系', color: '#8b5cf6' },
      { branch: 'fire', name: '火焰系', color: '#ef4444' },
      { branch: 'frost', name: '冰霜系', color: '#38bdf8' },
    ];

    for (let i = 0; i < branchNames.length; i++) {
      const bx = panelX + 150 + i * 300;
      ctx.save();
      ctx.font = 'bold 16px "Segoe UI", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = branchNames[i].color;
      ctx.textAlign = 'center';
      ctx.fillText(branchNames[i].name, bx, panelY + 85);
      ctx.restore();
    }

    const skills = this.skillManager.getSkills();

    for (const skill of skills) {
      for (const reqId of skill.requires) {
        const req = this.skillManager.getSkillById(reqId);
        if (req) {
          const sx1 = panelX + req.x;
          const sy1 = panelY + req.y - this.scrollOffset;
          const sx2 = panelX + skill.x;
          const sy2 = panelY + skill.y - this.scrollOffset;

          ctx.save();
          ctx.strokeStyle = skill.unlocked ? 'rgba(139, 92, 246, 0.5)' : 'rgba(75, 85, 99, 0.3)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx1, sy1);
          ctx.lineTo(sx2, sy2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    for (const skill of skills) {
      const sx = panelX + skill.x;
      const sy = panelY + skill.y - this.scrollOffset;

      ctx.save();

      if (skill.unlocked) {
        ctx.fillStyle = skill.iconColor;
        ctx.shadowColor = skill.iconColor;
        ctx.shadowBlur = 12;
      } else if (this.skillManager.canUnlock(skill.id)) {
        ctx.fillStyle = 'rgba(139, 92, 246, 0.4)';
        ctx.shadowColor = '#8b5cf6';
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = 'rgba(55, 65, 81, 0.6)';
      }

      this.drawRoundedRect(sx - 25, sy - 25, 50, 50, 8);
      ctx.fill();

      if (skill.unlocked) {
        ctx.strokeStyle = skill.iconColor;
        ctx.lineWidth = 2;
        this.drawRoundedRect(sx - 25, sy - 25, 50, 50, 8);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(skill.iconSymbol, sx, sy);

      ctx.font = '10px "Segoe UI", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = skill.unlocked ? '#e5e7eb' : '#9ca3af';
      ctx.fillText(skill.name, sx, sy + 36);

      if (!skill.unlocked) {
        ctx.font = '9px "Segoe UI", sans-serif';
        ctx.fillStyle = '#a78bfa';
        ctx.fillText(`◆${skill.cost}`, sx, sy + 48);
      }

      ctx.restore();
    }

    const closeBtnX = panelX + panelW - 50;
    const closeBtnY = panelY + 10;
    ctx.save();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
    this.drawRoundedRect(closeBtnX, closeBtnY, 40, 40, 6);
    ctx.fill();
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', closeBtnX + 20, closeBtnY + 20);
    ctx.restore();
  }

  private renderGameOver(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.fillStyle = 'rgba(10, 6, 18, 0.85)';
    ctx.fillRect(0, 0, w, h);
    this.renderAshParticles();

    ctx.save();
    ctx.textAlign = 'center';

    ctx.font = 'bold 48px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 20;
    ctx.fillText('灵魂陨落', w / 2, 250);

    ctx.shadowBlur = 0;
    ctx.font = '18px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(`到达深渊 ${this.player.currentLevel} 层`, w / 2, 310);
    ctx.fillText(`收集碎片: ${this.skillManager.getTotalFragments()}`, w / 2, 345);

    ctx.font = '14px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText('已永久解锁的技能将保留至下一次挑战', w / 2, 390);

    ctx.restore();

    this.drawGlassButton(w / 2 - 120, 420, 240, 50, '再次挑战');
    this.drawGlassButton(w / 2 - 120, 490, 240, 50, '返回主菜单');
  }

  private renderLevelComplete(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.fillStyle = 'rgba(10, 6, 18, 0.8)';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.textAlign = 'center';

    ctx.font = 'bold 42px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#8b5cf6';
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 20;
    ctx.fillText('深渊通关', w / 2, 260);

    ctx.shadowBlur = 0;
    ctx.font = '18px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#a78bfa';
    ctx.fillText(`第 ${this.player.currentLevel} 层 已征服`, w / 2, 320);
    ctx.fillText(`碎片: ${this.skillManager.getFragments()}`, w / 2, 360);

    ctx.restore();

    this.drawGlassButton(w / 2 - 120, 450, 240, 50, '深入下一层');
  }

  private renderPaused(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.fillStyle = 'rgba(10, 6, 18, 0.75)';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.textAlign = 'center';

    ctx.font = 'bold 36px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#c084fc';
    ctx.fillText('暂停', w / 2, 280);

    ctx.restore();

    this.drawGlassButton(w / 2 - 120, 350, 240, 50, '继续');
    this.drawGlassButton(w / 2 - 120, 420, 240, 50, '返回主菜单');
  }

  private drawGlassButton(x: number, y: number, w: number, h: number, label: string): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = 'rgba(30, 15, 50, 0.6)';
    this.drawRoundedRect(x, y, w, h, 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
    ctx.lineWidth = 1;
    this.drawRoundedRect(x, y, w, h, 8);
    ctx.stroke();

    const glossGrad = ctx.createLinearGradient(x, y, x, y + h / 2);
    glossGrad.addColorStop(0, 'rgba(139, 92, 246, 0.1)');
    glossGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glossGrad;
    this.drawRoundedRect(x, y, w, h / 2, 8);
    ctx.fill();

    ctx.font = 'bold 16px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#e5e7eb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
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

  private lightenColor(hex: string, amount: number): string {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
    return `rgb(${r},${g},${b})`;
  }
}

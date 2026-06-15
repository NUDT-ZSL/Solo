import { Beetle, PRESET_COLORS, BeetleColors } from './beetle';
import { BattleSystem } from './battle';
import { Renderer } from './renderer';

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private battle: BattleSystem | null;
  private lastTime: number;
  private frameCount: number;
  private fpsTime: number;
  private currentFPS: number;
  private aiTimer: number;
  private aiThinking: boolean;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new Renderer(this.canvas);
    this.battle = null;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fpsTime = 0;
    this.currentFPS = 60;
    this.aiTimer = 0;
    this.aiThinking = false;

    this.setupInput();
    this.initBattle();
    this.gameLoop();
  }

  initBattle(): void {
    const colors1: BeetleColors = {
      body: PRESET_COLORS[0],
      legs: PRESET_COLORS[7],
      eyes: PRESET_COLORS[3]
    };
    const colors2: BeetleColors = {
      body: PRESET_COLORS[1],
      legs: PRESET_COLORS[6],
      eyes: PRESET_COLORS[4]
    };

    const beetle1 = new Beetle('赤焰甲虫', colors1, { x: 350, y: 450 }, 'right');
    const beetle2 = new Beetle('蓝电甲虫', colors2, { x: 750, y: 450 }, 'left');

    this.battle = new BattleSystem(beetle1, beetle2);
    this.aiTimer = 0;
    this.aiThinking = false;
  }

  private setupInput(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      for (const btn of this.renderer.buttons) {
        btn.hovered = x >= btn.x && x <= btn.x + btn.width &&
                      y >= btn.y && y <= btn.y + btn.height;
      }
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (!this.battle) return;

      if (this.battle.victoryEffect.active && this.renderer.isRestartButton(x, y, this.battle.victoryEffect)) {
        this.initBattle();
        return;
      }

      if (this.battle.currentTurn !== 0 || this.battle.animatingAction || this.battle.phase === 'victory') return;

      const btn = this.renderer.getButtonAt(x, y);
      if (btn && !btn.disabled) {
        this.battle.executeAction(btn.actionType, 0);
      }
    });
  }

  private updateAI(dt: number): void {
    if (!this.battle) return;
    if (this.battle.currentTurn !== 1 || this.battle.animatingAction || this.battle.phase === 'victory') {
      this.aiTimer = 0;
      this.aiThinking = false;
      return;
    }

    if (!this.aiThinking) {
      this.aiThinking = true;
      this.aiTimer = 0.8;
    }

    this.aiTimer -= dt;
    if (this.aiTimer <= 0) {
      const ai = this.battle.beetles[1];
      const player = this.battle.beetles[0];
      const hpRatio = ai.stats.hp / ai.stats.maxHp;

      let action: 'attack' | 'defend' | 'counter' | 'ultimate' = 'attack';

      if (ai.stats.energy >= 20 && Math.random() < 0.3) {
        action = 'ultimate';
      } else if (hpRatio < 0.3 && Math.random() < 0.5) {
        action = 'defend';
      } else if (player.stats.attack > ai.stats.defense + 5 && Math.random() < 0.3) {
        action = 'counter';
      } else {
        const rand = Math.random();
        if (rand < 0.6) action = 'attack';
        else if (rand < 0.8) action = 'defend';
        else action = 'counter';
      }

      this.battle.executeAction(action, 1);
      this.aiThinking = false;
    }
  }

  private gameLoop = (): void => {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    if (dt > 0.05) dt = 0.05;
    this.lastTime = now;

    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    this.update(dt);
    this.render();

    requestAnimationFrame(this.gameLoop);
  }

  private update(dt: number): void {
    if (!this.battle) return;

    this.battle.update(dt);
    this.renderer.updateShake(this.battle.screenShake.intensity * (this.battle.screenShake.timer > 0 ? 1 : 0));
    this.updateAI(dt);
  }

  private render(): void {
    this.renderer.clear();

    if (!this.battle) return;

    this.renderer.drawArena();

    const attackerIdx = this.battle.currentTurn;

    const deadForVictory = this.battle.victoryEffect.active ? this.battle.victoryEffect.winnerIndex : -1;

    if (!this.battle.beetles[0].state.isDead || deadForVictory === 0) {
      this.renderer.drawBeetle(this.battle.beetles[0], attackerIdx === 0);
    }
    if (!this.battle.beetles[1].state.isDead || deadForVictory === 1) {
      this.renderer.drawBeetle(this.battle.beetles[1], attackerIdx === 1);
    }

    this.renderer.drawDeathFragments(this.battle.deathEffect);

    this.renderer.drawStatsPanel(this.battle.beetles[0], 20, 20, this.battle.currentTurn === 0 && this.battle.phase !== 'victory');
    this.renderer.drawStatsPanel(this.battle.beetles[1], 710, 20, this.battle.currentTurn === 1 && this.battle.phase !== 'victory');

    this.renderer.drawParticles(this.battle.particles);
    this.renderer.drawFloatingDamage(this.battle.floatingDamages);

    const flashAlpha = this.battle.flashEffect.timer > 0 ? (this.battle.flashEffect.timer / this.battle.flashEffect.maxTimer) * this.battle.flashEffect.alpha : 0;
    this.renderer.drawFlash(this.battle.flashEffect.color, flashAlpha);

    const currentBeetle = this.battle.phase === 'victory' ? null : this.battle.beetles[this.battle.currentTurn];
    for (const btn of this.renderer.buttons) {
      btn.disabled = this.battle.currentTurn !== 0 || this.battle.animatingAction || this.battle.phase === 'victory';
    }
    this.renderer.drawButtons(currentBeetle);

    this.renderer.drawBattleLog(this.battle.logs);
    this.renderer.drawVictory(this.battle.beetles, this.battle.victoryEffect);

    this.drawFPS();
    this.drawTurnIndicator();
  }

  private drawFPS(): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(10, 680, 90, 25);
    ctx.fillStyle = this.currentFPS >= 55 ? '#44ff44' : this.currentFPS >= 30 ? '#ffaa00' : '#ff4444';
    ctx.font = 'bold 14px Georgia';
    ctx.fillText(`FPS: ${this.currentFPS}`, 20, 698);
    ctx.restore();
  }

  private drawTurnIndicator(): void {
    if (!this.battle) return;
    if (this.battle.phase === 'victory') return;

    const ctx = this.canvas.getContext('2d')!;
    ctx.save();

    const centerX = 540;
    const y = 570;
    const currentBeetle = this.battle.beetles[this.battle.currentTurn];

    ctx.fillStyle = 'rgba(30, 18, 10, 0.9)';
    ctx.fillRect(centerX - 140, y, 280, 40);
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - 140, y, 280, 40);

    ctx.fillStyle = currentBeetle.colors.body;
    ctx.font = 'bold 20px Georgia';
    ctx.textAlign = 'center';
    const turnText = this.battle.currentTurn === 0
      ? `🎮 你的回合 - 第${this.battle.turnCount}回合`
      : (this.aiThinking ? `🤔 对手思考中... - 第${this.battle.turnCount}回合` : `🤖 对手回合 - 第${this.battle.turnCount}回合`);
    ctx.fillText(turnText, centerX, y + 27);
    ctx.textAlign = 'left';

    ctx.restore();
  }
}

window.addEventListener('load', () => {
  new Game();
});

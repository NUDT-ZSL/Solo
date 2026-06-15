import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { RuneTeam, RUNE_COLORS, RuneType } from '../entities/Rune';
import { GameStats } from '../managers/GameManager';

interface ResultParticle {
  gfx: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class ResultScene extends Container {
  private particles: ResultParticle[] = [];
  private particleContainer: Container;
  private contentContainer: Container;

  private titleText!: Text;
  private statsText!: Text;
  private restartBtn!: Graphics;
  private restartLabel!: Text;

  private onRestart?: () => void;
  private fadeInAlpha: number = 0;
  private isFadingIn: boolean = true;

  constructor() {
    super();
    this.particleContainer = new Container();
    this.contentContainer = new Container();
    this.addChild(this.particleContainer);
    this.addChild(this.contentContainer);

    this.createContent();
    this.contentContainer.alpha = 0;
  }

  private createContent(): void {
    const titleStyle = new TextStyle({
      fontFamily: 'Consolas, monospace',
      fontSize: 36,
      fill: 0xffcc44,
      fontWeight: 'bold',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowDistance: 2,
    });

    const statsStyle = new TextStyle({
      fontFamily: 'Consolas, monospace',
      fontSize: 16,
      fill: 0xaabbcc,
      lineHeight: 28,
    });

    this.titleText = new Text('', titleStyle);
    this.titleText.anchor.set(0.5);
    this.contentContainer.addChild(this.titleText);

    this.statsText = new Text('', statsStyle);
    this.statsText.anchor.set(0.5);
    this.contentContainer.addChild(this.statsText);

    this.restartBtn = new Graphics();
    this.restartBtn.beginFill(0x225522, 0.7);
    this.restartBtn.lineStyle(2, 0x55aa55, 0.8);
    this.restartBtn.drawRoundedRect(0, 0, 160, 44, 8);
    this.restartBtn.endFill();

    this.restartLabel = new Text('再来一局', {
      fontFamily: 'Consolas, monospace',
      fontSize: 18,
      fill: 0x88ff88,
    });
    this.restartLabel.anchor.set(0.5);
    this.restartLabel.x = 80;
    this.restartLabel.y = 22;

    const btnContainer = new Container();
    btnContainer.addChild(this.restartBtn);
    btnContainer.addChild(this.restartLabel);
    btnContainer.interactive = true;
    btnContainer.cursor = 'pointer';
    btnContainer.on('pointerdown', () => this.onRestart?.());

    this.contentContainer.addChild(btnContainer);
  }

  showResult(winner: RuneTeam, stats: GameStats): void {
    const screenW = (this.parent as any)?.width ?? window.innerWidth;
    const screenH = (this.parent as any)?.height ?? window.innerHeight;
    const cx = screenW / 2;
    const cy = screenH / 2;

    this.titleText.text = winner === RuneTeam.PLAYER ? '⚔ 胜利 ⚔' : '💀 败北 💀';
    this.titleText.style.fill = winner === RuneTeam.PLAYER ? 0xffcc44 : 0xff4444;
    this.titleText.x = cx;
    this.titleText.y = cy - 100;

    this.statsText.text =
      `总回合数: ${stats.turnsPlayed}\n` +
      `己方击毁: ${stats.enemyRunesDestroyed}  |  敌方击毁: ${stats.playerRunesDestroyed}\n` +
      `造成伤害: ${stats.totalDamageDealt}  |  承受伤害: ${stats.totalDamageReceived}`;
    this.statsText.x = cx;
    this.statsText.y = cy - 20;

    const btnContainer = this.contentContainer.children[2] as Container;
    btnContainer.x = cx - 80;
    btnContainer.y = cy + 60;

    this.spawnVictoryParticles(cx, cy, winner);
    this.isFadingIn = true;
    this.fadeInAlpha = 0;
  }

  setOnRestart(cb: () => void): void {
    this.onRestart = cb;
  }

  private spawnVictoryParticles(cx: number, cy: number, winner: RuneTeam): void {
    const colors = winner === RuneTeam.PLAYER
      ? [0xffcc44, 0xff8844, 0x44ffaa]
      : [0xff4444, 0xff6644, 0xcc2244];

    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const gfx = new Graphics();
      const size = 2 + Math.random() * 4;
      gfx.beginFill(color, 0.8);
      gfx.drawCircle(0, 0, size);
      gfx.endFill();
      gfx.x = cx + (Math.random() - 0.5) * 40;
      gfx.y = cy + (Math.random() - 0.5) * 40;

      this.particles.push({
        gfx,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 40 + Math.random() * 60,
      });
      this.particleContainer.addChild(gfx);
    }
  }

  update(delta: number): void {
    if (this.isFadingIn) {
      this.fadeInAlpha += delta / 60;
      this.contentContainer.alpha = Math.min(1, this.easeOutCubic(this.fadeInAlpha));
      if (this.fadeInAlpha >= 1) {
        this.isFadingIn = false;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;
      p.gfx.x += p.vx * delta * 0.5;
      p.gfx.y += p.vy * delta * 0.5;
      p.vy += 0.05 * delta;
      const pct = 1 - p.life / p.maxLife;
      p.gfx.alpha = Math.max(0, pct);
      p.gfx.scale.set(Math.max(0.01, pct));

      if (p.life >= p.maxLife) {
        this.particleContainer.removeChild(p.gfx);
        p.gfx.destroy();
        this.particles.splice(i, 1);
      }
    }

    if (Math.random() < 0.15 && this.particles.length < 120) {
      const screenW = (this.parent as any)?.width ?? window.innerWidth;
      const screenH = (this.parent as any)?.height ?? window.innerHeight;
      this.spawnAmbientParticle(screenW, screenH);
    }
  }

  private spawnAmbientParticle(sw: number, sh: number): void {
    const color = [0xffcc44, 0x44ccff, 0xbb55ff][Math.floor(Math.random() * 3)];
    const gfx = new Graphics();
    const size = 1 + Math.random() * 2;
    gfx.beginFill(color, 0.4);
    gfx.drawCircle(0, 0, size);
    gfx.endFill();
    gfx.x = Math.random() * sw;
    gfx.y = sh + 10;

    this.particles.push({
      gfx,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.5 - Math.random() * 1.5,
      life: 0,
      maxLife: 60 + Math.random() * 60,
    });
    this.particleContainer.addChild(gfx);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - Math.min(1, t), 3);
  }

  override destroy(options?: any): void {
    for (const p of this.particles) {
      this.particleContainer.removeChild(p.gfx);
      p.gfx.destroy();
    }
    this.particles = [];
    super.destroy(options);
  }
}

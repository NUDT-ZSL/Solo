// ===== 游戏主控制器 =====
import { Player, InputState } from './player';
import { Environment, Meteor, Crystal } from './environment';
import { Renderer } from './renderer';
import { UI, GameState } from './ui';

const CANVAS_W = 800;
const CANVAS_H = 600;

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  player: Player;
  env: Environment;
  renderer: Renderer;
  ui: UI;

  input: InputState = {
    keys: {},
    mouseX: CANVAS_W / 2,
    mouseY: CANVAS_H / 2,
    mouseDown: false,
    rightDown: false,
  };

  state: GameState = 'start';
  rafId: number | null = null;     // 真正暂停时 cancel
  lastTime: number = 0;

  // 防止空格键按下触发多次切换
  spaceWasDown: boolean = false;

  constructor() {
    const canvas = document.getElementById('game-canvas');
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Canvas not found');
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;

    this.player = new Player();
    this.env = new Environment(this.ctx);
    this.renderer = new Renderer(this.ctx);
    this.ui = new UI(this.ctx, {
      onStart: () => this.startGame(),
      onResume: () => this.resumeGame(),
      onRestart: () => this.startGame(),
    });

    this.bindEvents();
    this.setState('start');
    // 初始绘制一帧静态背景，避免canvas黑块
    this.renderStaticFrame();
  }

  // ===== 绑定输入事件 =====
  private bindEvents(): void {
    const c = this.canvas;

    window.addEventListener('keydown', (e) => {
      this.input.keys[e.key] = true;
      // 空格切换暂停（只在按下瞬间触发一次）
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (!this.spaceWasDown) {
          this.spaceWasDown = true;
          if (this.state === 'playing') this.pauseGame();
          else if (this.state === 'paused') this.resumeGame();
        }
      }
    }, { passive: false });

    window.addEventListener('keyup', (e) => {
      this.input.keys[e.key] = false;
      if (e.key === ' ' || e.code === 'Space') this.spaceWasDown = false;
    });

    // 鼠标坐标转换为 canvas 内坐标
    const toCanvasCoords = (e: MouseEvent): { x: number; y: number } => {
      const rect = c.getBoundingClientRect();
      const sx = CANVAS_W / rect.width;
      const sy = CANVAS_H / rect.height;
      return {
        x: (e.clientX - rect.left) * sx,
        y: (e.clientY - rect.top) * sy,
      };
    };
    c.addEventListener('mousemove', (e) => {
      const p = toCanvasCoords(e);
      this.input.mouseX = p.x;
      this.input.mouseY = p.y;
    });
    c.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (e.button === 0) this.input.mouseDown = true;
      else if (e.button === 2) this.input.rightDown = true;
    });
    c.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.input.mouseDown = false;
      else if (e.button === 2) this.input.rightDown = false;
    });
    // 右键菜单阻止
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    // 鼠标离开画布时抬起按键，避免卡住
    c.addEventListener('mouseleave', () => {
      this.input.mouseDown = false;
      this.input.rightDown = false;
    });
  }

  // ===== 状态管理 =====
  private setState(s: GameState, finalScore?: number): void {
    this.state = s;
    this.ui.setState(s, finalScore);
  }

  private startGame(): void {
    this.player.reset();
    this.env.reset();
    this.setState('playing');
    this.lastTime = 0;
    this.stopLoop();
    this.startLoop();
  }

  private pauseGame(): void {
    if (this.state !== 'playing') return;
    this.setState('paused');
    this.stopLoop();
    // 暂停时画一帧暗化叠加（让暂停界面下层看起来是暗的）
    this.ui.drawPauseOverlay();
  }

  private resumeGame(): void {
    if (this.state !== 'paused') return;
    this.setState('playing');
    this.lastTime = 0;
    this.startLoop();
  }

  private gameOver(): void {
    this.setState('gameover', this.player.score);
    this.stopLoop();
  }

  // ===== 真正的 requestAnimationFrame 循环控制 =====
  private startLoop(): void {
    const tick = (time: number): void => {
      if (this.lastTime === 0) this.lastTime = time;
      let dt = (time - this.lastTime) / 1000;
      this.lastTime = time;
      // 限制单帧最大 dt（切后台回来避免巨大跳跃）
      if (dt > 0.1) dt = 0.1;

      this.update(dt);
      this.render();

      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }
  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  // ===== 主更新 =====
  private update(dt: number): void {
    // 传递星暴减速到玩家
    this.player.starstormSlowFactor = this.env.getPlayerSlowFactor();

    // 更新
    this.player.update(dt, this.input);
    this.env.update(dt);

    // 减速力场影响陨石速度（在力场内的陨石速度降为 20%）
    this.applySlowFieldOnMeteors();

    // 碰撞检测
    this.handleCollisions();

    // 死亡判定
    if (!this.player.alive) {
      this.gameOver();
    }
  }

  private applySlowFieldOnMeteors(): void {
    const sf = this.player.slowField;
    if (!sf.active) return;
    const rr = sf.radius * sf.radius;
    const mx = this.env.meteors;
    for (let i = 0; i < mx.length; i++) {
      const m = mx[i];
      if (!m.active) continue;
      const dx = m.x - sf.x, dy = m.y - sf.y;
      if (dx * dx + dy * dy <= rr) {
        // 持续降速
        m.vx *= 0.95;
        m.vy *= 0.95;
      }
    }
  }

  // ===== 碰撞处理 =====
  private handleCollisions(): void {
    const pr = this.player.getRadius();
    const bullets = this.player.bullets;
    const meteors = this.env.meteors;
    const crystals = this.env.crystals;

    // 1. 子弹 vs 陨石
    for (let bi = 0; bi < bullets.length; bi++) {
      const b = bullets[bi];
      if (!b.active) continue;
      for (let mi = 0; mi < meteors.length; mi++) {
        const m = meteors[mi];
        if (!m.active) continue;
        const dx = b.x - m.x, dy = b.y - m.y;
        const R = m.radius + b.radius;
        if (dx * dx + dy * dy <= R * R) {
          // 命中
          b.active = false;
          m.hp -= b.damage;
          if (m.hp <= 0) {
            m.active = false;
            this.env.spawnMeteorFragments(m);
            if (m.isCombat) this.player.addScore(5);
          }
          break;
        }
      }
    }

    // 2. 子弹 vs 水晶（水晶也可以被击碎？需求说采集水晶，所以子弹不破坏水晶）
    // 跳过

    // 3. 玩家 vs 陨石
    for (let mi = 0; mi < meteors.length; mi++) {
      const m = meteors[mi];
      if (!m.active) continue;
      const dx = this.player.x - m.x, dy = this.player.y - m.y;
      const R = pr + m.radius;
      if (dx * dx + dy * dy <= R * R) {
        // 只有战斗陨石扣护盾
        if (m.isCombat) {
          this.player.damageShield(15);
        }
        // 击碎并产生碎块，把陨石推开一点防止穿透
        this.env.spawnMeteorFragments(m);
        m.active = false;
        // 玩家轻微反弹
        const len = Math.hypot(dx, dy) || 1;
        this.player.vx += (dx / len) * 80;
        this.player.vy += (dy / len) * 80;
        if (!this.player.alive) return;
      }
    }

    // 4. 玩家 vs 水晶（采集）
    for (let ci = 0; ci < crystals.length; ci++) {
      const c = crystals[ci];
      if (!c.active) continue;
      const dx = this.player.x - c.x, dy = this.player.y - c.y;
      const R = pr + c.radius;
      if (dx * dx + dy * dy <= R * R) {
        c.active = false;
        this.player.addShield(10);
        this.player.addEnergy(5);
        this.player.addScore(10);
      }
    }
  }

  // ===== 主渲染 =====
  private render(): void {
    // 1. 星云背景
    this.env.drawNebulaBackground();

    // 2. 环境对象（陨石、水晶）
    this.env.drawCrystals();
    this.env.drawMeteors();

    // 3. 玩家 + 子弹
    this.renderer.drawBullets(this.player.bullets);
    this.renderer.drawPlayer(this.player);

    // 4. 星暴视觉覆盖
    this.env.drawStarstormOverlay();

    // 5. 升级特效（在 HUD 之上）
    this.renderer.drawLevelUpEffect(this.player.getStats());

    // 6. HUD
    this.ui.drawHUD(this.player.getStats());

    // 7. 低护盾红色脉冲边框（最外层）
    this.renderer.drawLowShieldPulse(this.player);
  }

  // ===== 开始界面时，canvas画一个静态背景（不显示黑块） =====
  private renderStaticFrame(): void {
    this.env.drawNebulaBackground();
    // 画一个装饰性飞船
    this.env.drawCrystals();
    this.env.drawMeteors();
  }
}

// 启动
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});

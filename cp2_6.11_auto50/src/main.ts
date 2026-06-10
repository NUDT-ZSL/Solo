import { GameState } from './gameState';
import { Renderer } from './renderer';

const MAX_DT = 1 / 30;

class Game {
  private gs: GameState;
  private ren: Renderer;
  private prev: number;
  private raf: number;
  private on: boolean;
  private fpsCnt: number;
  private fpsAcc: number;

  constructor() {
    const cvs = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!cvs) throw new Error('no canvas');
    this.gs = new GameState();
    this.ren = new Renderer(cvs, this.gs);
    this.prev = 0;
    this.raf = 0;
    this.on = false;
    this.fpsCnt = 0;
    this.fpsAcc = 0;
    this._bind();
    this.gs.onGameOver = (s) => this._showEnd(s);
  }

  private _bind(): void {
    const cvs = this.ren.getCanvas();

    cvs.addEventListener('click', (e) => {
      const c = this.ren.hitTest(e.clientX, e.clientY);
      if (c) this.gs.selectTalisman(c.row, c.col);
    });

    cvs.addEventListener('mousemove', (e) => {
      const c = this.ren.hitTest(e.clientX, e.clientY);
      this.ren.setHover(c ? c.row : null, c ? c.col : null);
    });

    cvs.addEventListener('mouseleave', () => this.ren.setHover(null, null));

    let ds: { row: number; col: number } | null = null;
    cvs.addEventListener('mousedown', (e) => {
      const c = this.ren.hitTest(e.clientX, e.clientY);
      if (c) ds = c;
    });
    cvs.addEventListener('mouseup', (e) => {
      if (!ds) return;
      const ec = this.ren.hitTest(e.clientX, e.clientY);
      if (ec && (ec.row !== ds.row || ec.col !== ds.col)) {
        this.gs.selectTalisman(ds.row, ds.col);
        this.gs.selectTalisman(ec.row, ec.col);
      }
      ds = null;
    });

    const rb = document.getElementById('restart-btn');
    if (rb) rb.addEventListener('click', () => this._restart());
    const sb = document.getElementById('share-btn');
    if (sb) sb.addEventListener('click', () => this._share());
  }

  start(): void {
    if (this.on) return;
    this.on = true;
    this.gs.startGame();
    this.prev = performance.now();
    this._loop();
  }

  private _loop(): void {
    if (!this.on) return;
    this.raf = requestAnimationFrame(() => this._loop());
    const now = performance.now();
    let dt = (now - this.prev) / 1000;
    this.prev = now;
    if (dt > MAX_DT) dt = MAX_DT;
    this.fpsCnt++;
    this.fpsAcc += dt;
    if (this.fpsAcc >= 1) {
      this.fpsCnt = 0;
      this.fpsAcc = 0;
    }
    this.gs.update(dt);
    this.ren.update(dt);
    this.ren.render();
  }

  private _showEnd(_s: number): void {
    const m = document.getElementById('game-over-modal');
    const f = document.getElementById('final-score');
    const l = document.getElementById('leaderboard-list');
    if (m) m.classList.remove('hidden');
    if (f) f.textContent = String(this.gs.score);
    if (l) {
      l.innerHTML = '';
      const cr = this.gs.getRank(this.gs.score);
      const md = ['🥇', '🥈', '🥉', '4.', '5.'];
      let hit = false;
      this.gs.leaderboard.forEach((s, i) => {
        const d = document.createElement('div');
        d.className = 'leaderboard-item';
        if (!hit && s === this.gs.score && i + 1 === cr) {
          d.classList.add('current');
          hit = true;
        }
        d.innerHTML = `<span>${md[i]} 第${i + 1}名</span><span>${s}分</span>`;
        l.appendChild(d);
      });
    }
  }

  private _restart(): void {
    const m = document.getElementById('game-over-modal');
    if (m) m.classList.add('hidden');
    this.gs.startGame();
  }

  private async _share(): Promise<void> {
    const r = this.gs.getRank(this.gs.score);
    const txt = `我在符咒叠塔中获得了${this.gs.score}分，排名第${r}！`;
    try {
      await navigator.clipboard.writeText(txt);
      alert('成绩已复制到剪贴板！');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); alert('成绩已复制到剪贴板！'); }
      catch { alert('复制失败：' + txt); }
      document.body.removeChild(ta);
    }
  }

  destroy(): void { this.on = false; if (this.raf) cancelAnimationFrame(this.raf); }
}

let game: Game | null = null;
function boot(): void {
  try {
    game = new Game();
    game.start();
    (window as any).game = game;
  } catch (e) { console.error('boot fail:', e); }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

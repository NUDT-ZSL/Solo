import { LakeRenderer } from './lake.js';
import { FishingSystem, type FishingPhase } from './fishing.js';
import {
  CodexManager,
  CREATURES,
  RARITY_META,
  getCreatureById,
  type Creature,
  type CreatureType,
  type Rarity,
} from './creature.js';

interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (s: GameStats) => boolean;
}

interface GameStats {
  score: number;
  totalCaught: number;
  uniqueCount: number;
  rarityCounts: Record<Rarity, number>;
  hasMythic: boolean;
  totalCatchScore: number;
  catchStreak: number;
}

interface AchievementState {
  id: string;
  unlocked: boolean;
  unlockedAt?: number;
}

const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_cast',    name: '首次垂钓',     description: '成功钓起第一条生物',           icon: '🎣', check: s => s.totalCaught >= 1 },
  { id: 'collector_5',   name: '博物学家',     description: '收集5种不同的生物',             icon: '📖', check: s => s.uniqueCount >= 5 },
  { id: 'score_1000',    name: '千金之钓',     description: '累积积分达到 1000',             icon: '💰', check: s => s.score >= 1000 },
  { id: 'score_3000',    name: '墨渊富翁',     description: '累积积分达到 3000',             icon: '💎', check: s => s.score >= 3000 },
  { id: 'fisher_10',     name: '熟练钓客',     description: '累计钓起10只生物',              icon: '🐟', check: s => s.totalCaught >= 10 },
  { id: 'fisher_50',     name: '钓鱼大师',     description: '累计钓起50只生物',              icon: '🏅', check: s => s.totalCaught >= 50 },
  { id: 'rare_catch',    name: '珍稀邂逅',     description: '钓起一只史诗级以上生物',        icon: '🌟', check: s => s.rarityCounts.epic + s.rarityCounts.legendary + s.rarityCounts.mythic >= 1 },
  { id: 'abyss_master',  name: '深渊主宰',     description: '钓起传说中的深渊之主',          icon: '🐉', check: s => s.rarityCounts.legendary + s.rarityCounts.mythic >= 1 },
];

const LS_KEYS = {
  SCORE: 'moyuan_score',
  CAUGHT: 'moyuan_caught',
  RARITY: 'moyuan_rarity',
  ACHV: 'moyuan_achievements',
  STREAK: 'moyuan_streak',
} as const;

function loadNumber(key: string, def = 0): number {
  try {
    const raw = localStorage.getItem(key);
    return raw ? parseInt(raw, 10) || def : def;
  } catch { return def; }
}

function loadRarity(): Record<Rarity, number> {
  try {
    const raw = localStorage.getItem(LS_KEYS.RARITY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { common: 0, rare: 0, epic: 0, legendary: 0, mythic: 0 };
}

function loadAchievements(): Map<string, AchievementState> {
  try {
    const raw = localStorage.getItem(LS_KEYS.ACHV);
    if (raw) {
      const arr = JSON.parse(raw) as AchievementState[];
      return new Map(arr.map(a => [a.id, a]));
    }
  } catch { /* ignore */ }
  return new Map(ACHIEVEMENTS.map(a => [a.id, { id: a.id, unlocked: false }]));
}

class GameApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lake: LakeRenderer;
  private fishing: FishingSystem;
  private codex: CodexManager;

  private stats: GameStats;
  private achievements: Map<string, AchievementState>;
  private lastPhase: FishingPhase = 'idle';

  private powerBar: HTMLElement;
  private powerFill: HTMLElement;
  private scoreEl: HTMLElement;
  private biteHint: HTMLElement;
  private achvOverlay: HTMLElement;
  private achvUnlockName: HTMLElement;
  private codexPanel: HTMLElement;
  private achvPanel: HTMLElement;
  private codexGrid: HTMLElement;
  private achvList: HTMLElement;
  private codexDetail: HTMLElement;
  private creatureResult: HTMLElement;
  private statusTip: HTMLElement;

  private lastTime = 0;
  private rafId = 0;
  private fpsAccum = 0;
  private isMobile = false;
  private sensitivity = 1;
  private _achvQueue: string[] = [];
  private _achvPlaying = false;
  private prevPhaseForStreak: FishingPhase = 'idle';

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;

    this.lake = new LakeRenderer();
    this.codex = new CodexManager();

    this.fishing = new FishingSystem(
      this.lake,
      c => this.handleCatch(c),
      () => this.handleEscape(),
      () => this.codex.rollCatch().creature,
    );

    this.stats = {
      score: loadNumber(LS_KEYS.SCORE),
      totalCaught: loadNumber(LS_KEYS.CAUGHT),
      uniqueCount: this.codex.unlockCount(),
      rarityCounts: loadRarity(),
      hasMythic: loadRarity().mythic > 0,
      totalCatchScore: loadNumber(LS_KEYS.SCORE),
      catchStreak: loadNumber(LS_KEYS.STREAK),
    };
    this.achievements = loadAchievements();

    this.powerBar = document.getElementById('power-bar')!;
    this.powerFill = document.getElementById('power-fill')!;
    this.scoreEl = document.getElementById('score-value')!;
    this.biteHint = document.getElementById('bite-hint')!;
    this.achvOverlay = document.getElementById('achv-overlay')!;
    this.achvUnlockName = document.getElementById('achv-unlock-name')!;
    this.codexPanel = document.getElementById('codex-panel')!;
    this.achvPanel = document.getElementById('achv-panel')!;
    this.codexGrid = document.getElementById('codex-grid')!;
    this.achvList = document.getElementById('achv-list')!;
    this.codexDetail = document.getElementById('codex-detail')!;
    this.creatureResult = document.getElementById('creature-result')!;
    this.statusTip = document.getElementById('status-tip')!;

    this.isMobile = window.innerWidth < 768;
    this.sensitivity = this.isMobile ? 1.5 : 1;
    this.fishing.setSensitivity(this.sensitivity);

    this.resizeCanvas();
    this.lake.attach(this.canvas, this.ctx);
    this.bindEvents();
    this.renderCodexGrid();
    this.renderAchvList();
    this.updateScoreDisplay();
  }

  private resizeCanvas(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.lake.resize();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.debounce(() => {
      this.resizeCanvas();
      this.isMobile = window.innerWidth < 768;
      this.sensitivity = this.isMobile ? 1.5 : 1;
      this.fishing.setSensitivity(this.sensitivity);
    }, 200));

    const getPos = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      if ('touches' in e) {
        const t = e.touches[0] ?? e.changedTouches[0];
        return { x: t.clientX, y: t.clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      const p = getPos(e);
      if (e.target && !this.isCanvasTarget(e.target as HTMLElement)) return;
      if (this.fishing.phase === 'biting') {
        this.fishing.clickAction();
        return;
      }
      this.fishing.startCharge(p.x, p.y);
      this.powerBar.classList.add('active');
      this.updatePowerBarPos(p.x, p.y);
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      const p = getPos(e);
      this.fishing.mouseX = p.x;
      this.fishing.mouseY = p.y;
      if (this.fishing.isCharging) {
        this.updatePowerBarPos(p.x, p.y);
      }
    };

    const onUp = (e: MouseEvent | TouchEvent) => {
      const p = getPos(e);
      if (this.fishing.phase === 'charging') {
        this.fishing.releaseCast(p.x, p.y);
        this.powerBar.classList.remove('active');
      } else if (this.fishing.phase === 'biting') {
        this.fishing.clickAction();
      }
    };

    this.canvas.addEventListener('mousedown', onDown);
    this.canvas.addEventListener('mousemove', this.throttle(onMove, 16));
    window.addEventListener('mouseup', onUp);

    this.canvas.addEventListener('touchstart', e => { e.preventDefault(); onDown(e); }, { passive: false });
    this.canvas.addEventListener('touchmove', e => { e.preventDefault(); onMove(e); }, { passive: false });
    this.canvas.addEventListener('touchend', e => { e.preventDefault(); onUp(e); }, { passive: false });

    window.addEventListener('keydown', e => {
      if (e.code === 'Space') {
        if (this.fishing.phase === 'biting') this.fishing.clickAction();
      }
      if (e.key === 'Escape') {
        this.closeAllPanels();
      }
    });

    document.getElementById('btn-codex')!.addEventListener('click', e => {
      e.stopPropagation();
      this.togglePanel(this.codexPanel, this.achvPanel);
    });
    document.getElementById('btn-achv')!.addEventListener('click', e => {
      e.stopPropagation();
      this.togglePanel(this.achvPanel, this.codexPanel);
    });

    document.addEventListener('click', e => {
      const target = e.target as HTMLElement;
      if (!target) return;
      if (this.codexPanel.classList.contains('open') && !this.codexPanel.contains(target) && target.id !== 'btn-codex') {
        this.codexPanel.classList.remove('open');
      }
      if (this.achvPanel.classList.contains('open') && !this.achvPanel.contains(target) && target.id !== 'btn-achv') {
        this.achvPanel.classList.remove('open');
      }
    });

    this.achvOverlay.addEventListener('animationend', () => {
      this.achvOverlay.classList.remove('active');
      this._achvPlaying = false;
      this.playNextAchievement();
    });
  }

  private isCanvasTarget(el: HTMLElement): boolean {
    return el === this.canvas || this.canvas.contains(el);
  }

  private debounce<T extends (...a: unknown[]) => void>(fn: T, ms: number): T {
    let t = 0;
    return ((...args: Parameters<T>) => {
      clearTimeout(t);
      t = window.setTimeout(() => fn.apply(this, args), ms);
    }) as T;
  }

  private throttle<T extends (...a: never[]) => void>(fn: T, ms: number): T {
    let last = 0;
    return ((...args: Parameters<T>) => {
      const now = performance.now();
      if (now - last >= ms) {
        last = now;
        fn.apply(this, args);
      }
    }) as T;
  }

  private updatePowerBarPos(x: number, y: number): void {
    this.powerBar.style.left = x + 'px';
    this.powerBar.style.top = y + 'px';
    const pct = Math.round(this.fishing.chargePower * 100);
    this.powerFill.style.width = pct + '%';
  }

  private togglePanel(panel: HTMLElement, other: HTMLElement): void {
    const open = panel.classList.toggle('open');
    if (open) other.classList.remove('open');
  }

  private closeAllPanels(): void {
    this.codexPanel.classList.remove('open');
    this.achvPanel.classList.remove('open');
  }

  private renderCodexGrid(): void {
    this.codexGrid.innerHTML = '';
    for (const c of CREATURES) {
      const unlocked = this.codex.isUnlocked(c.id);
      const cell = document.createElement('div');
      cell.className = 'codex-cell ' + (unlocked ? 'unlocked' : 'locked');
      cell.innerHTML = `
        <div class="emoji">${unlocked ? c.emoji : '❓'}</div>
        <div class="name">${unlocked ? c.name : '???'}</div>
        <div class="rarity-bar ${RARITY_META[c.rarity].cls}"></div>
      `;
      if (unlocked) {
        cell.addEventListener('click', () => this.showCodexDetail(c.id));
      }
      this.codexGrid.appendChild(cell);
    }
  }

  private showCodexDetail(id: CreatureType): void {
    const c = getCreatureById(id);
    const rec = this.codex.getRecord(id);
    const meta = RARITY_META[c.rarity];
    if (!rec) return;
    const d = new Date(rec.firstCaughtAt);
    const dateStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    this.codexDetail.style.display = 'block';
    this.codexDetail.innerHTML = `
      <h4 style="color:${meta.color}">${c.emoji} ${c.name} <span style="font-size:12px;opacity:0.7">· ${meta.label}</span></h4>
      <p>${c.description}</p>
      <p style="margin-top:8px;">📅 首次捕获：${dateStr}</p>
      <p>🎯 捕获次数：<b style="color:${meta.color}">${rec.count}</b> 次</p>
      <p>⭐ 分值：${c.score} 分 / 只</p>
    `;
  }

  private renderAchvList(): void {
    this.achvList.innerHTML = '';
    for (const def of ACHIEVEMENTS) {
      const st = this.achievements.get(def.id);
      const unlocked = st?.unlocked ?? false;
      const item = document.createElement('div');
      item.className = 'achv-item' + (unlocked ? ' unlocked' : '');
      item.innerHTML = `
        <div class="achv-icon">${def.icon}</div>
        <div class="achv-info">
          <div class="achv-name">${def.name}</div>
          <div class="achv-desc">${def.description}</div>
        </div>
      `;
      this.achvList.appendChild(item);
    }
  }

  private updateScoreDisplay(): void {
    this.scoreEl.textContent = this.stats.score.toLocaleString();
  }

  private handleCatch(creature: Creature): void {
    const { isNew } = this.codex.rollCatchSimulate(creature.id);
    this.stats.score += creature.score;
    this.stats.totalCaught += 1;
    this.stats.rarityCounts[creature.rarity] += 1;
    if (creature.rarity === 'mythic') this.stats.hasMythic = true;
    if (isNew) this.stats.uniqueCount = this.codex.unlockCount();
    this.stats.catchStreak += 1;

    this.persist();
    this.updateScoreDisplay();
    this.renderCodexGrid();
    this.showCreatureResult(creature, isNew);

    const newAchv = this.checkAchievements();
    if (newAchv.length) {
      this._achvQueue.push(...newAchv);
      setTimeout(() => this.playNextAchievement(), 900);
    }
  }

  private handleEscape(): void {
    this.stats.catchStreak = 0;
    this.persist();
    this.statusTip.textContent = '💨 它逃走了…调整呼吸，再试一次吧';
    setTimeout(() => {
      if (this.fishing.phase === 'idle') {
        this.statusTip.textContent = '按住鼠标左键蓄力，松开投掷浮标 · 咬钩后0.8秒内点击收杆';
      }
    }, 2000);
  }

  private showCreatureResult(c: Creature, isNew: boolean): void {
    const meta = RARITY_META[c.rarity];
    const emojiEl = document.getElementById('res-emoji')!;
    const rarityEl = document.getElementById('res-rarity')!;
    const nameEl = document.getElementById('res-name')!;
    const descEl = document.getElementById('res-desc')!;
    const scoreEl = document.getElementById('res-score')!;

    emojiEl.textContent = c.emoji;
    rarityEl.textContent = (isNew ? '✨ NEW · ' : '') + meta.label;
    rarityEl.style.background = c.rarity === 'mythic'
      ? 'linear-gradient(90deg, var(--mythic-1), var(--mythic-2))'
      : meta.color;
    rarityEl.style.color = c.rarity === 'common' ? '#020c1b' : '#ffffff';
    nameEl.textContent = c.name;
    nameEl.style.color = meta.color;
    nameEl.style.textShadow = `0 0 14px ${meta.glow}`;
    descEl.textContent = c.description;
    scoreEl.textContent = c.score.toString();

    this.creatureResult.classList.add('show');
    setTimeout(() => this.creatureResult.classList.remove('show'), 1700);
  }

  private checkAchievements(): string[] {
    const unlocked: string[] = [];
    for (const def of ACHIEVEMENTS) {
      const st = this.achievements.get(def.id);
      if (st && !st.unlocked && def.check(this.stats)) {
        st.unlocked = true;
        st.unlockedAt = Date.now();
        this.achievements.set(def.id, st);
        unlocked.push(def.id);
      }
    }
    if (unlocked.length) {
      this.persistAchievements();
      this.renderAchvList();
    }
    return unlocked;
  }

  private playNextAchievement(): void {
    if (this._achvPlaying || !this._achvQueue.length) return;
    const id = this._achvQueue.shift()!;
    const def = ACHIEVEMENTS.find(a => a.id === id);
    if (!def) return;
    this._achvPlaying = true;
    this.achvUnlockName.textContent = `${def.icon}  ${def.name}`;
    this.achvOverlay.classList.remove('active');
    void this.achvOverlay.offsetWidth;
    this.achvOverlay.classList.add('active');
  }

  private persist(): void {
    try {
      localStorage.setItem(LS_KEYS.SCORE, String(this.stats.score));
      localStorage.setItem(LS_KEYS.CAUGHT, String(this.stats.totalCaught));
      localStorage.setItem(LS_KEYS.RARITY, JSON.stringify(this.stats.rarityCounts));
      localStorage.setItem(LS_KEYS.STREAK, String(this.stats.catchStreak));
    } catch { /* ignore */ }
  }

  private persistAchievements(): void {
    try {
      const arr = Array.from(this.achievements.values());
      localStorage.setItem(LS_KEYS.ACHV, JSON.stringify(arr));
    } catch { /* ignore */ }
  }

  start(): void {
    this.lastTime = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(3.5, (now - this.lastTime) / (1000 / 60));
      this.lastTime = now;
      this.fpsAccum += dt;

      this.tick(dt);

      if (this.fpsAccum >= 60) {
        this.fpsAccum = 0;
      }

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
  }

  private tick(dt: number): void {
    this.ctx.clearRect(0, 0, this.lake.getWidth(), this.lake.getHeight());
    this.lake.render(dt);

    const cone = this.fishing.getConeSplashState();
    if (cone && cone.progress < 1) {
      this.lake.renderConeSplash(cone.x, cone.y, cone.progress);
    }

    this.fishing.update(dt);
    this.fishing.render(this.ctx);
    this.updatePowerBarIfCharging();
    this.updatePhaseVisuals();
  }

  private updatePowerBarIfCharging(): void {
    if (this.fishing.isCharging) {
      this.updatePowerBarPos(this.fishing.mouseX, this.fishing.mouseY);
    }
  }

  private updatePhaseVisuals(): void {
    const ph = this.fishing.phase;
    if (ph !== this.lastPhase) {
      if (ph === 'biting') {
        this.biteHint.classList.add('active');
        this.statusTip.textContent = '⚡ 咬钩了！快速点击收杆！';
      } else if (this.lastPhase === 'biting') {
        this.biteHint.classList.remove('active');
      }
      if (ph === 'idle' && (this.prevPhaseForStreak === 'result' || this.prevPhaseForStreak === 'escape')) {
        this.statusTip.textContent = '按住鼠标左键蓄力，松开投掷浮标 · 咬钩后0.8秒内点击收杆';
      }
      this.prevPhaseForStreak = this.lastPhase;
      this.lastPhase = ph;
    }
  }
}

declare module './creature.js' {
  interface CodexManager {
    rollCatchSimulate(id: CreatureType): { isNew: boolean };
  }
}

CodexManager.prototype.rollCatchSimulate = function (this: CodexManager, id: CreatureType) {
  const existing = (this as unknown as { _collected: Map<CreatureType, unknown> })._collected.get(id);
  const isNew = !existing;
  if (existing) {
    const e = existing as { count: number };
    e.count += 1;
  } else {
    const mgr = this as unknown as { _collected: Map<CreatureType, { type: CreatureType; firstCaughtAt: number; count: number }>; save: () => void };
    mgr._collected.set(id, { type: id, firstCaughtAt: Date.now(), count: 1 });
  }
  const mgr2 = this as unknown as { save: () => void };
  mgr2.save();
  return { isNew };
};

window.addEventListener('DOMContentLoaded', () => {
  try {
    const app = new GameApp();
    app.start();
    (window as unknown as { __game?: GameApp }).__game = app;
  } catch (err) {
    console.error('[墨渊钓客] 初始化失败：', err);
    const errEl = document.createElement('div');
    errEl.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#ff6b6b;font-family:monospace;padding:24px;text-align:center;background:#020c1b;z-index:100;';
    errEl.textContent = '初始化失败：' + (err as Error).message;
    document.body.appendChild(errEl);
  }
});

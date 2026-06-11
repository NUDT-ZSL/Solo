import { Renderer } from './renderer';
import { Egg } from './egg';
import { Creature, AbilityType } from './creature';
import { Environment, Food, WeatherType } from './environment';

type Scene = 'egg' | 'hatching' | 'raising';

class Game {
  private renderer: Renderer;
  private environment: Environment;
  private egg: Egg | null = null;
  private creature: Creature | null = null;
  private scene: Scene = 'egg';
  private lastTime: number = 0;
  private rafId: number = 0;
  private draggingFood: Food | null = null;
  private heartsContainer: HTMLElement | null = null;
  private lastSatietyLevel: number = -1;
  private lastEvolutionLevel: number = 1;
  private lastIntimacy: number = 0;
  private animTime: number = 0;

  constructor() {
    const canvas = document.getElementById('game') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas 元素不存在');

    this.renderer = new Renderer(canvas);
    const dim = this.renderer.getBaseDimensions();
    this.environment = new Environment(dim.w, dim.h);
    this.initUI();
    this.initScene();
    this.bindEvents(canvas);
  }

  private initUI(): void {
    this.heartsContainer = document.getElementById('hearts');
    this.buildHearts();
    this.updateEvolutionLevel(1);
    this.updateIntimacy(0);
  }

  private buildHearts(): void {
    if (!this.heartsContainer) return;
    this.heartsContainer.innerHTML = '';
    const heartSvg = `<svg viewBox="0 0 24 24" fill="#4a4a4a"><path d="M12 21s-6.716-4.604-9.192-8.084C.49 10.125.961 6.5 3.5 6.5c1.5 0 3 1 4.5 2.5C9.5 7.5 11 6.5 12.5 6.5c1.5 0 3 1 4.5 2.5 1.5-1.5 3-2.5 4.5-2.5 2.539 0 3.01 3.625 3.692 6.416C18.716 16.396 12 21 12 21z"/></svg>`;
    for (let i = 0; i < 10; i++) {
      const div = document.createElement('div');
      div.className = 'heart';
      div.dataset.index = String(i);
      div.innerHTML = heartSvg;
      this.heartsContainer.appendChild(div);
    }
  }

  private initScene(): void {
    const dim = this.renderer.getBaseDimensions();
    this.egg = new Egg(dim.w / 2 - 16, dim.h * 0.48);
    this.scene = 'egg';
    this.showHint(true);
  }

  private bindEvents(canvas: HTMLCanvasElement): void {
    const getCoords = (e: MouseEvent | Touch) => this.renderer.getCanvasCoords(
      'clientX' in e ? e.clientX : (e as Touch).clientX,
      'clientY' in e ? e.clientY : (e as Touch).clientY
    );

    const onDown = (e: MouseEvent) => {
      const { x, y } = getCoords(e);
      this.handlePress(x, y);
    };

    const onMove = (e: MouseEvent) => {
      const { x, y } = getCoords(e);
      this.handleMove(x, y);
    };

    const onUp = (e: MouseEvent) => {
      const { x, y } = getCoords(e);
      this.handleRelease(x, y);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const { x, y } = getCoords(e.touches[0]);
      this.handlePress(x, y);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      const { x, y } = getCoords(e.touches[0]);
      this.handleMove(x, y);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 0) return;
      const { x, y } = getCoords(e.changedTouches[0]);
      this.handleRelease(x, y);
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', () => { if (this.draggingFood) this.handleRelease(-1, -1); });

    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
  }

  private handlePress(x: number, y: number): void {
    if (this.scene === 'egg' && this.egg && !this.egg.isHatched && !this.egg.isHatching) {
      if (this.egg.containsPoint(x, y)) {
        const started = this.egg.onClick(this.renderer);
        if (started) { this.scene = 'hatching'; this.showHint(false); }
      }
      return;
    }

    if (this.scene === 'raising' && this.creature) {
      if (this.creature.containsPoint(x, y) && !this.creature.isLocked()) {
        this.creature.interact();
        this.creature.bobTime += 80;
        return;
      }
      const food = this.environment.getFoodAt(x, y);
      if (food) {
        food.isDragging = true;
        this.draggingFood = food;
      }
    }
  }

  private handleMove(x: number, y: number): void {
    if (this.draggingFood && x >= 0) {
      this.draggingFood.x = x;
      this.draggingFood.y = y;
    }
  }

  private handleRelease(x: number, y: number): void {
    if (!this.draggingFood) return;
    const f = this.draggingFood;
    f.isDragging = false;

    if (this.creature && !this.creature.isLocked() && x >= 0 && y >= 0) {
      const c = this.creature.getCenter();
      const r = this.creature.getBoundingRadius() + f.size;
      const dx = x - c.x, dy = y - c.y;
      if (dx * dx + dy * dy <= r * r || this.creature.containsPoint(x, y)) {
        this.performFeed(f);
        this.draggingFood = null;
        return;
      }
    }

    if (this.creature && this.creature.containsPoint(f.x, f.y)) {
      this.performFeed(f);
    }
    this.draggingFood = null;
  }

  private performFeed(food: Food): void {
    if (!this.creature) return;
    this.environment.removeFood(food);
    this.creature.feed(this.renderer);
  }

  private showHint(show: boolean): void {
    const h = document.getElementById('click-hint');
    if (!h) return;
    if (show) h.classList.remove('hidden'); else h.classList.add('hidden');
  }

  private updateSatietyUI(v: number): void {
    if (!this.heartsContainer) return;
    const fullCount = Math.min(10, Math.max(0, Math.round(v / 10)));
    if (fullCount === this.lastSatietyLevel) return;
    this.lastSatietyLevel = fullCount;

    const hearts = this.heartsContainer.querySelectorAll<HTMLElement>('.heart');
    for (let i = 0; i < hearts.length; i++) {
      const h = hearts[i];
      const path = h.querySelector('path');
      if (!path) continue;
      if (i < fullCount) {
        if (path.getAttribute('fill') !== '#e74c3c') {
          h.classList.add('filling');
          setTimeout(() => h.classList.remove('filling'), 550);
          path.setAttribute('fill', '#e74c3c');
        }
      } else {
        path.setAttribute('fill', '#4a4a4a');
      }
    }
  }

  private updateEvolutionLevel(lv: number): void {
    if (lv === this.lastEvolutionLevel) return;
    this.lastEvolutionLevel = lv;
    const el = document.getElementById('evolution-level');
    if (!el) return;
    el.textContent = String(lv);
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  }

  private updateIntimacy(v: number): void {
    if (Math.round(v) === this.lastIntimacy) return;
    this.lastIntimacy = Math.round(v);
    const fill = document.getElementById('intimacy-fill') as HTMLElement | null;
    if (fill) fill.style.width = `${Math.min(100, Math.max(0, v))}%`;
  }

  private updateWeatherUI(): void {
    const wl = document.getElementById('weather-label');
    const ti = document.getElementById('time-indicator') as HTMLElement | null;
    if (wl) wl.textContent = `${this.environment.getWeatherLabel()} ${this.environment.getTimeText()}`;
    if (ti) ti.style.background = this.environment.getTimeIndicatorColor();
  }

  private loop = (t: number) => {
    const dt = Math.min(50, t - this.lastTime);
    this.lastTime = t;
    this.animTime += dt;

    if (this.egg && (this.scene === 'egg' || this.scene === 'hatching')) {
      const done = this.egg.update(dt);
      if (done) {
        this.egg.triggerShellBreak(this.renderer);
        this.spawnCreature();
      }
    }

    const dim = this.renderer.getBaseDimensions();
    this.environment.update(dt, this.renderer);
    this.updateWeatherUI();

    if (this.creature) {
      this.creature.update(dt, dim.w, this.environment.getGrassStartY(), this.renderer);
      this.creature.decreaseSatiety(dt);
      if (!this.creature.isLocked()) {
        if (this.creature.tryEvolve(this.renderer)) {
        }
      }
      const a: AbilityType[] = this.creature.abilities;
      if (a.includes('weather_control') && Math.random() < dt / 180000 && this.environment.weather !== 'sunny') {
        const types: WeatherType[] = ['sunny', 'cloudy', 'rain', 'snow'];
        const t2 = types[Math.floor(Math.random() * types.length)];
        if (t2 !== this.environment.weather) this.environment.forceWeatherChange(t2);
      }
      this.updateSatietyUI(this.creature.satiety);
      this.updateEvolutionLevel(this.creature.evolutionLevel);
      this.updateIntimacy(this.creature.intimacy);
    }

    this.renderer.updateParticles(dt);
    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private spawnCreature(): void {
    if (!this.egg) return;
    const center = this.egg.getCenter();
    const dim = this.renderer.getBaseDimensions();
    this.creature = new Creature(center.x, dim.h * 0.82, this.egg.genes, 16);
    this.scene = 'raising';
    setTimeout(() => { this.showHint(false); }, 1200);
  }

  private render(): void {
    this.renderer.clear();
    this.environment.drawSkyAndGrass(this.renderer);
    this.environment.drawFoods(this.renderer);
    if (this.egg && (this.scene === 'egg' || this.scene === 'hatching')) {
      this.egg.draw(this.renderer);
    }
    if (this.creature) this.creature.draw(this.renderer);
    this.renderer.drawParticles();
  }

  public start(): void {
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
    void this.rafId;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    const game = new Game();
    game.start();
  } catch (err) {
    console.error('游戏启动失败:', err);
  }
});

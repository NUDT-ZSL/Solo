import { Renderer } from './Renderer';
import { ParticleSystem } from './ParticleSystem';

interface ScrollState {
  progress: number;
  targetProgress: number;
  shatterProgress: number;
  targetShatter: number;
  currentChapter: number;
  totalChapters: number;
  brightnessMultiplier: number;
  targetBrightness: number;
  rodRotation: number;
}

type ChapterTransitionPhase =
  | 'idle'
  | 'shattering'
  | 'collapsing'
  | 'switching'
  | 'expanding'
  | 'assembling';

export class ScrollManager {
  private renderer: Renderer;
  private particleSystem: ParticleSystem;
  private canvas: HTMLCanvasElement;
  private leftRod: HTMLElement;
  private rightRod: HTMLElement;
  private chapterNav: HTMLElement;
  private scrollWrapper: HTMLElement;

  private state: ScrollState;
  private transitionPhase: ChapterTransitionPhase = 'idle';
  private pendingChapter: number | null = null;

  private rafId = 0;
  private lastTime = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartProgress = 0;
  private animationSpeed = 0.9;

  private fpsSamples: number[] = [];
  private currentFps = 60;
  private fpsEma = 60;
  private frameCount = 0;
  private fpsUpdateTimer = 0;

  constructor(
    renderer: Renderer,
    particleSystem: ParticleSystem,
    canvas: HTMLCanvasElement,
    elements: {
      leftRod: HTMLElement;
      rightRod: HTMLElement;
      chapterNav: HTMLElement;
      scrollWrapper: HTMLElement;
    }
  ) {
    this.renderer = renderer;
    this.particleSystem = particleSystem;
    this.canvas = canvas;
    this.leftRod = elements.leftRod;
    this.rightRod = elements.rightRod;
    this.chapterNav = elements.chapterNav;
    this.scrollWrapper = elements.scrollWrapper;

    const chapters = this.renderer.getChapters();
    this.state = {
      progress: 1,
      targetProgress: 1,
      shatterProgress: 0,
      targetShatter: 0,
      currentChapter: 0,
      totalChapters: chapters.length,
      brightnessMultiplier: 1,
      targetBrightness: 1,
      rodRotation: 0
    };

    this.buildChapterNav();
    this.attachEvents();
    this.renderInitial();
  }

  private buildChapterNav(): void {
    this.chapterNav.innerHTML = '';
    for (let i = 0; i < this.state.totalChapters; i++) {
      const dot = document.createElement('div');
      dot.className = 'chapter-dot' + (i === this.state.currentChapter ? ' active' : '');
      dot.title = `第 ${i + 1} 章`;
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        this.goToChapter(i);
      });
      this.chapterNav.appendChild(dot);
    }
  }

  private updateChapterNavUI(): void {
    const dots = this.chapterNav.querySelectorAll('.chapter-dot');
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === this.state.currentChapter);
    });
  }

  private attachEvents(): void {
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseenter', this.onMouseEnter);
    this.canvas.addEventListener('mouseleave', this.onMouseLeave);
    this.canvas.addEventListener('click', this.onClick);
    window.addEventListener('resize', this.onResize);
  }

  private renderInitial(): void {
    this.renderer.renderInitial();
    this.particleSystem.setScrollProgress(0);
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
    // setTimeout(() => this.triggerAutoExpand(), 500);
  }

  triggerAutoExpand(): void {
    if (this.transitionPhase !== 'idle') return;
    this.state.targetShatter = 0;
    this.state.targetProgress = 1;
    this.transitionPhase = 'assembling';
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (this.transitionPhase !== 'idle') return;

    const delta = e.deltaY > 0 ? 1 : -1;
    const step = 0.12;
    let newTarget = this.state.targetProgress + delta * step;

    if (delta > 0 && this.state.progress >= 0.98 &&
        this.state.currentChapter < this.state.totalChapters - 1) {
      this.goToChapter(this.state.currentChapter + 1);
      return;
    }
    if (delta < 0 && this.state.progress <= 0.02 && this.state.currentChapter > 0) {
      this.goToChapter(this.state.currentChapter - 1);
      return;
    }

    newTarget = Math.max(0, Math.min(1, newTarget));
    this.state.targetProgress = newTarget;
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (this.transitionPhase !== 'idle') return;
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartProgress = this.state.progress;
  };

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const inScroll = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height &&
                     x <= this.state.progress * rect.width;

    this.particleSystem.setMouseInScroll(inScroll);
    if (inScroll) {
      this.particleSystem.updateMouse(x, y);
    }

    if (this.isDragging && this.transitionPhase === 'idle') {
      const dx = e.clientX - this.dragStartX;
      const delta = dx / rect.width;
      const newTarget = Math.max(0, Math.min(1, this.dragStartProgress + delta));
      this.state.targetProgress = newTarget;
    }
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onMouseEnter = (): void => {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width > 0) {
      this.particleSystem.setMouseInScroll(true);
    }
  };

  private onMouseLeave = (): void => {
    this.particleSystem.setMouseInScroll(false);
    this.isDragging = false;
  };

  private onClick = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.transitionPhase === 'idle' && this.state.progress < 0.08) {
      this.state.targetShatter = 0;
      this.state.targetProgress = 1;
      this.transitionPhase = 'assembling';
      return;
    }
    if (this.transitionPhase === 'idle' && this.state.progress > 0.92 &&
        x > rect.width * 0.9) {
      this.state.targetShatter = 1;
      this.state.targetProgress = 0;
      this.transitionPhase = 'shattering';
      return;
    }

    if (this.state.progress > 0.2) {
      this.state.targetBrightness = 1.2;
      this.particleSystem.triggerBurst(x, y);

      setTimeout(() => {
        this.state.targetBrightness = 1;
      }, 500);
    }
  };

  private onResize = (): void => {
    this.renderer.resize();
    this.particleSystem.resize();
  };

  goToChapter(index: number): void {
    if (this.transitionPhase !== 'idle') return;
    if (index === this.state.currentChapter) return;
    if (index < 0 || index >= this.state.totalChapters) return;

    this.pendingChapter = index;
    this.state.targetShatter = 1;
    this.transitionPhase = 'shattering';
  }

  private loop = (time: number): void => {
    const dt = Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;

    this.updateFps(dt);
    this.update(dt);
    this.draw();

    this.rafId = requestAnimationFrame(this.loop);
  };

  private updateFps(dt: number): void {
    this.frameCount++;
    this.fpsUpdateTimer += dt;

    if (this.fpsUpdateTimer >= 0.5) {
      const instantFps = this.frameCount / this.fpsUpdateTimer;
      this.fpsEma = this.fpsEma * 0.7 + instantFps * 0.3;
      this.currentFps = this.fpsEma;
      this.frameCount = 0;
      this.fpsUpdateTimer = 0;

      if (this.currentFps < 52) {
        this.particleSystem.setMaxParticles(30);
      } else if (this.currentFps >= 58) {
        this.particleSystem.setMaxParticles(50);
      }
    }
  }

  private update(dt: number): void {
    if (dt <= 0) dt = 1 / 60;
    const s = this.state;

    const smoothSpeed = this.animationSpeed;
    const lerp = (current: number, target: number, rate: number): number => {
      const factor = 1 - Math.pow(0.0001, dt * rate);
      return current + (target - current) * factor;
    };

    s.progress = lerp(s.progress, s.targetProgress, smoothSpeed);
    s.shatterProgress = lerp(s.shatterProgress, s.targetShatter, smoothSpeed * 0.9);

    const prevProgress = s.progress;
    s.rodRotation += (s.progress - prevProgress) * 10;

    s.brightnessMultiplier = lerp(s.brightnessMultiplier, s.targetBrightness, 6);

    this.handleChapterTransition();

    this.renderer.setBrightness(s.brightnessMultiplier);
    this.particleSystem.setScrollProgress(s.progress);
    this.particleSystem.update(dt);

    const rodDeg = s.rodRotation * 55;
    this.leftRod.style.transform = `rotate(${rodDeg}deg)`;
    this.rightRod.style.transform = `rotate(${-rodDeg}deg)`;
    s.rodRotation *= 0.86;
  }

  private handleChapterTransition(): void {
    const s = this.state;

    switch (this.transitionPhase) {
      case 'shattering':
        if (s.shatterProgress >= 0.98) {
          s.shatterProgress = 1;
          this.transitionPhase = 'collapsing';
          s.targetProgress = 0;
        }
        break;

      case 'collapsing':
        if (s.progress <= 0.02) {
          s.progress = 0;
          this.transitionPhase = 'switching';
          if (this.pendingChapter !== null) {
            s.currentChapter = this.pendingChapter;
            this.pendingChapter = null;
            this.updateChapterNavUI();
          }
          setTimeout(() => {
            if (this.transitionPhase === 'switching') {
              s.targetProgress = 1;
              this.transitionPhase = 'expanding';
            }
          }, 150);
        }
        break;

      case 'expanding':
        if (s.progress >= 0.98) {
          s.progress = 1;
          this.transitionPhase = 'assembling';
          s.targetShatter = 0;
        }
        break;

      case 'assembling':
        if (s.shatterProgress <= 0.02) {
          s.shatterProgress = 0;
          this.transitionPhase = 'idle';
        }
        break;

      case 'idle':
      case 'switching':
      default:
        break;
    }
  }

  private draw(): void {
    this.renderer.render(
      this.state.progress,
      this.state.currentChapter,
      this.state.shatterProgress
    );
    this.particleSystem.render();
  }

  getFps(): number {
    return this.currentFps;
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mouseenter', this.onMouseEnter);
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
    this.canvas.removeEventListener('click', this.onClick);
    window.removeEventListener('resize', this.onResize);
  }
}

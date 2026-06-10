import { Renderer } from './Renderer';
import { ParticleSystem } from './ParticleSystem';

interface ScrollState {
  progress: number;
  targetProgress: number;
  currentChapter: number;
  totalChapters: number;
  isAnimating: boolean;
  brightnessMultiplier: number;
  targetBrightness: number;
  rodRotation: number;
}

type TransitionState = 'idle' | 'collapsing' | 'expanding';

export class ScrollManager {
  private renderer: Renderer;
  private particleSystem: ParticleSystem;
  private canvas: HTMLCanvasElement;
  private leftRod: HTMLElement;
  private rightRod: HTMLElement;
  private chapterNav: HTMLElement;
  private scrollWrapper: HTMLElement;

  private state: ScrollState;
  private transitionState: TransitionState = 'idle';
  private pendingChapter: number | null = null;

  private rafId = 0;
  private lastTime = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartProgress = 0;
  private animationSpeed = 0.9;
  private mouseVelAccum = 0;

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
      progress: 0,
      targetProgress: 0,
      currentChapter: 0,
      totalChapters: chapters.length,
      isAnimating: false,
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
    setTimeout(() => this.triggerAutoExpand(), 400);
  }

  triggerAutoExpand(): void {
    this.state.targetProgress = 1;
    this.state.isAnimating = true;
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (this.transitionState !== 'idle') return;

    const delta = e.deltaY > 0 ? 1 : -1;
    const step = 0.12;
    let newTarget = this.state.targetProgress + delta * step;

    if (delta > 0 && this.state.progress >= 0.98 && this.state.currentChapter < this.state.totalChapters - 1) {
      this.goToChapter(this.state.currentChapter + 1);
      return;
    }
    if (delta < 0 && this.state.progress <= 0.02 && this.state.currentChapter > 0) {
      this.goToChapter(this.state.currentChapter - 1);
      return;
    }

    newTarget = Math.max(0, Math.min(1, newTarget));
    this.state.targetProgress = newTarget;
    this.state.isAnimating = true;
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (this.transitionState !== 'idle') return;
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartProgress = this.state.progress;
  };

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const inScroll = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;

    this.particleSystem.setMouseInScroll(inScroll);
    if (inScroll) {
      this.particleSystem.updateMouse(x, y);
    }

    if (this.isDragging && this.transitionState === 'idle') {
      const dx = e.clientX - this.dragStartX;
      const delta = dx / rect.width;
      const newTarget = Math.max(0, Math.min(1, this.dragStartProgress + delta));
      this.state.targetProgress = newTarget;
      this.state.isAnimating = true;
    }

    this.mouseVelAccum *= 0.85;
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onMouseEnter = (): void => {
    this.particleSystem.setMouseInScroll(true);
  };

  private onMouseLeave = (): void => {
    this.particleSystem.setMouseInScroll(false);
    this.isDragging = false;
  };

  private onClick = (e: MouseEvent): void => {
    if (this.transitionState !== 'idle') return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.state.progress < 0.08) {
      this.state.targetProgress = 1;
      this.state.isAnimating = true;
      return;
    }
    if (this.state.progress > 0.92 && x > rect.width * 0.9) {
      this.state.targetProgress = 0;
      this.state.isAnimating = true;
      return;
    }

    this.state.targetBrightness = 1.2;
    this.particleSystem.triggerBurst(x, y);
    setTimeout(() => {
      this.state.targetBrightness = 1;
    }, 500);
  };

  private onResize = (): void => {
    this.renderer.resize();
    this.particleSystem.resize();
  };

  goToChapter(index: number): void {
    if (this.transitionState !== 'idle') return;
    if (index === this.state.currentChapter) return;
    if (index < 0 || index >= this.state.totalChapters) return;

    this.pendingChapter = index;
    this.transitionState = 'collapsing';
    this.state.targetProgress = 0;
    this.state.isAnimating = true;
  }

  private loop = (time: number): void => {
    const dt = Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;

    this.update(dt);
    this.draw();

    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    const s = this.state;

    const lerpFactor = 1 - Math.pow(0.0001, dt * this.animationSpeed);
    if (Math.abs(s.progress - s.targetProgress) > 0.001) {
      const prev = s.progress;
      s.progress += (s.targetProgress - s.progress) * lerpFactor;
      s.rodRotation += (s.progress - prev) * 8;
    } else {
      s.progress = s.targetProgress;
      s.isAnimating = false;

      if (this.transitionState === 'collapsing' && s.progress <= 0.001) {
        if (this.pendingChapter !== null) {
          s.currentChapter = this.pendingChapter;
          this.pendingChapter = null;
          this.updateChapterNavUI();
        }
        this.transitionState = 'expanding';
        s.targetProgress = 1;
        s.isAnimating = true;
      } else if (this.transitionState === 'expanding' && s.progress >= 0.999) {
        this.transitionState = 'idle';
      }
    }

    if (Math.abs(s.brightnessMultiplier - s.targetBrightness) > 0.005) {
      s.brightnessMultiplier += (s.targetBrightness - s.brightnessMultiplier) * Math.min(1, dt * 8);
    } else {
      s.brightnessMultiplier = s.targetBrightness;
    }

    this.renderer.setBrightness(s.brightnessMultiplier);
    this.particleSystem.setScrollProgress(s.progress);
    this.particleSystem.update(dt);

    const rodDeg = s.rodRotation * 60;
    this.leftRod.style.transform = `rotate(${rodDeg}deg)`;
    this.rightRod.style.transform = `rotate(${-rodDeg}deg)`;
    s.rodRotation *= 0.88;
  }

  private draw(): void {
    this.renderer.render(this.state.progress, this.state.currentChapter);
    this.particleSystem.render();
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

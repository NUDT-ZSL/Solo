import * as THREE from 'three';
import { Maze } from './maze';
import { Player, PlayerInput } from './player';
import { Collectibles } from './collectibles';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private maze: Maze;
  private player: Player;
  private collectibles: Collectibles;
  private clock: THREE.Clock;
  private elapsed = 0;
  private input: PlayerInput = { forward: false, backward: false, left: false, right: false };
  private counterEl: HTMLElement | null;
  private winTextEl: HTMLElement | null;
  private hasWon = false;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchMoved = false;

  constructor() {
    const canvas = document.getElementById('app') as HTMLCanvasElement;
    this.counterEl = document.getElementById('counter');
    this.winTextEl = document.getElementById('winText');

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 8, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);

    this.maze = new Maze(20, 20);
    this.scene.add(this.maze.group);

    this.player = new Player(this.camera, this.maze);
    this.scene.add(this.player.group);

    this.collectibles = new Collectibles(20);
    const positions = this.maze.getRandomEmptyPositions(20);
    this.collectibles.spawn(positions);
    this.scene.add(this.collectibles.group);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 15, 10);
    this.scene.add(dirLight);

    this.clock = new THREE.Clock();

    this.setupInput();
    this.updateCounter();

    window.addEventListener('resize', () => this.onResize());

    this.animate();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.input.forward = true;
          e.preventDefault();
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.input.backward = true;
          e.preventDefault();
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.input.left = true;
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.input.right = true;
          e.preventDefault();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.input.forward = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.input.backward = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.input.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.input.right = false;
          break;
      }
    });

    const el = this.renderer.domElement;
    let touchTimer: ReturnType<typeof setTimeout> | null = null;
    let touchDir: keyof PlayerInput | null = null;

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.touchMoved = false;
      }
      e.preventDefault();
    }, { passive: false });

    el.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0 && !this.touchMoved) {
        const dx = e.touches[0].clientX - this.touchStartX;
        const dy = e.touches[0].clientY - this.touchStartY;
        const threshold = 20;
        if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
          this.touchMoved = true;
          if (Math.abs(dx) > Math.abs(dy)) {
            touchDir = dx > 0 ? 'right' : 'left';
          } else {
            touchDir = dy > 0 ? 'backward' : 'forward';
          }
          this.input[touchDir] = true;
        }
      }
      e.preventDefault();
    }, { passive: false });

    const clearTouch = () => {
      if (touchDir) {
        this.input[touchDir] = false;
        touchDir = null;
      }
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    };

    el.addEventListener('touchend', clearTouch);
    el.addEventListener('touchcancel', clearTouch);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateCounter(): void {
    if (this.counterEl) {
      this.counterEl.textContent = `光球: ${this.collectibles.collectedCount} / ${this.collectibles.getTotalCount()}`;
    }
  }

  private triggerWin(): void {
    if (this.hasWon) return;
    this.hasWon = true;

    if (this.counterEl) {
      this.counterEl.classList.add('blink');
    }

    this.maze.setWinMode(true);
    this.maze.regenerate();
    this.player.reset(this.maze);

    const newPositions = this.maze.getRandomEmptyPositions(20);
    this.collectibles.spawn(newPositions);

    if (this.winTextEl) {
      this.winTextEl.classList.remove('show');
      void this.winTextEl.offsetWidth;
      this.winTextEl.classList.add('show');
      setTimeout(() => {
        if (this.winTextEl) this.winTextEl.classList.remove('show');
      }, 2100);
    }

    setTimeout(() => {
      this.hasWon = false;
      this.collectibles.collectedCount = 0;
      if (this.counterEl) {
        this.counterEl.classList.remove('blink');
      }
      this.updateCounter();
    }, 2200);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += dt;

    this.maze.update(dt);
    this.player.update(dt, this.input, this.elapsed);

    const changed = this.collectibles.update(dt, this.elapsed, this.player.position);
    if (changed) {
      this.updateCounter();
      if (this.collectibles.isAllCollected()) {
        this.triggerWin();
      }
    }

    this.renderer.render(this.scene, this.camera);
  };
}

new App();

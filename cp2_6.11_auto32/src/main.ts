import * as THREE from 'three';
import { Maze, MazeColorScheme } from './maze';
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
  private introTime = 2.5;
  private introElapsed = 0;
  private introStartPos = new THREE.Vector3(0, 8, 10);
  private introEndPos = new THREE.Vector3();

  private touchStartX = 0;
  private touchStartY = 0;
  private touchMoved = false;
  private touchDir: keyof PlayerInput | null = null;

  constructor() {
    const canvas = document.getElementById('app') as HTMLCanvasElement;
    this.counterEl = document.getElementById('counter');
    this.winTextEl = document.getElementById('winText');

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0A1128, 0.05);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.copy(this.introStartPos);
    this.camera.lookAt(0, 1, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    const genStart = performance.now();
    this.maze = new Maze(20, 20);
    const genEnd = performance.now();
    console.log(`迷宫生成耗时: ${(genEnd - genStart).toFixed(2)}ms`);
    console.log(`迷宫连通性验证: ${this.maze.verifyConnectivity() ? '通过' : '失败'}`);

    this.scene.add(this.maze.group);

    this.player = new Player(this.camera, this.maze);
    this.introEndPos.copy(this.player.position);
    this.scene.add(this.player.group);

    this.collectibles = new Collectibles(20);
    const positions = this.maze.getRandomEmptyPositions(20);
    this.collectibles.spawn(positions);
    this.scene.add(this.collectibles.group);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(15, 20, 12);
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x4A00E0, 0.3);
    fillLight.position.set(-10, 5, -5);
    this.scene.add(fillLight);

    this.clock = new THREE.Clock();

    this.setupInput();
    this.updateCounter();

    window.addEventListener('resize', () => this.onResize());

    this.animate();
  }

  private setupInput(): void {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    };

    const handleKeyUp = (e: KeyboardEvent) => {
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
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const el = this.renderer.domElement;

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
        const threshold = 24;
        if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
          this.touchMoved = true;
          if (Math.abs(dx) > Math.abs(dy)) {
            this.touchDir = dx > 0 ? 'right' : 'left';
          } else {
            this.touchDir = dy > 0 ? 'backward' : 'forward';
          }
          this.input[this.touchDir] = true;
        }
      }
      e.preventDefault();
    }, { passive: false });

    const clearTouch = () => {
      if (this.touchDir) {
        this.input[this.touchDir] = false;
        this.touchDir = null;
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
    console.log('🎉 通关！触发迷宫重组');

    if (this.counterEl) {
      this.counterEl.classList.add('blink');
    }

    this.maze.setColorScheme('gold');
    this.maze.regenerate();
    console.log(`新迷宫连通性验证: ${this.maze.verifyConnectivity() ? '通过' : '失败'}`);
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

  private updateIntro(dt: number): boolean {
    if (this.introElapsed >= this.introTime) {
      return false;
    }

    this.introElapsed += dt;
    const t = Math.min(this.introElapsed / this.introTime, 1);
    const ease = 1 - Math.pow(1 - t, 3);

    const pos = new THREE.Vector3().lerpVectors(this.introStartPos, this.introEndPos, ease);
    pos.y = this.introStartPos.y * (1 - ease) + this.introEndPos.y * ease;
    this.camera.position.copy(pos);

    const lookTarget = new THREE.Vector3(0, 1, 0);
    lookTarget.lerp(new THREE.Vector3(this.introEndPos.x, this.introEndPos.y - 0.5, this.introEndPos.z - 5), ease);
    this.camera.lookAt(lookTarget);

    return true;
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += dt;

    this.maze.update(dt);

    const inIntro = this.introElapsed < this.introTime;
    if (inIntro) {
      this.updateIntro(dt);
    } else {
      this.player.update(dt, this.input, this.elapsed);
    }

    const changed = this.collectibles.update(dt, this.player.position);
    if (changed) {
      this.updateCounter();
      if (this.collectibles.isAllCollected() && !this.hasWon) {
        this.triggerWin();
      }
    }

    if (this.collectibles.getActiveParticleCount() > 200) {
      console.warn(`粒子数量超标: ${this.collectibles.getActiveParticleCount()}`);
    }

    this.renderer.render(this.scene, this.camera);
  };
}

new App();

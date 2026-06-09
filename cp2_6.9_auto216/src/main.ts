import * as THREE from 'three';
import { MazeGenerator, MazeData, MAZE_SIZE } from './mazeGenerator';
import { PlayerController } from './playerController';
import { ShadowEntity } from './shadows';
import { UIManager } from './uiManager';

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvasContainer: HTMLElement;

  private mazeGenerator: MazeGenerator;
  private playerController: PlayerController;
  private shadowEntity: ShadowEntity;
  private uiManager: UIManager;
  private mazeData: MazeData | null = null;

  private clock: THREE.Clock;
  private elapsedTime: number = 0;
  private gameTimeRemaining: number = 120;
  private isGameRunning: boolean = false;
  private isGameOver: boolean = false;
  private gameHasStarted: boolean = false;

  private animationFrameId: number | null = null;

  private fogColor: number = 0x0A0E17;
  private ambientLight: THREE.AmbientLight | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;

  constructor() {
    this.canvasContainer = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.fogColor);
    this.scene.fog = new THREE.Fog(this.fogColor, 5, 30);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.canvasContainer.appendChild(this.renderer.domElement);

    this.mazeGenerator = new MazeGenerator(this.scene, MAZE_SIZE);
    this.shadowEntity = new ShadowEntity(this.scene, this.mazeGenerator);
    this.playerController = new PlayerController(
      this.camera,
      this.mazeGenerator,
      this.shadowEntity,
      this.renderer.domElement
    );
    this.uiManager = new UIManager(this.mazeGenerator);

    this.clock = new THREE.Clock();

    this.setupLighting();
    this.setupEventListeners();
    this.setupGameCallbacks();
    this.initGame();
  }

  private setupLighting(): void {
    this.ambientLight = new THREE.AmbientLight(0x4A90D9, 0.4);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(10, 15, 10);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -20;
    this.directionalLight.shadow.camera.right = 20;
    this.directionalLight.shadow.camera.top = 20;
    this.directionalLight.shadow.camera.bottom = -20;
    this.scene.add(this.directionalLight);

    const wallGlow = new THREE.HemisphereLight(0x4A90D9, 0x2D2D44, 0.3);
    this.scene.add(wallGlow);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize);

    document.getElementById('start-btn')?.addEventListener('click', () => {
      this.startGame();
    });

    document.getElementById('restart-btn-lose')?.addEventListener('click', () => {
      this.restartGame();
    });

    document.getElementById('restart-btn-win')?.addEventListener('click', () => {
      this.restartGame();
    });
  }

  private setupGameCallbacks(): void {
    this.playerController.setOnReform((cellX: number, cellZ: number) => {
      if (!this.isGameRunning || this.isGameOver) return;
      this.mazeGenerator.triggerReform(cellX, cellZ);
      this.shadowEntity.notifyReform();
    });

    this.playerController.setOnFragmentCollected(() => {
    });

    this.playerController.setOnReachExit(() => {
      if (!this.isGameOver && this.isGameRunning) {
        this.winGame();
      }
    });

    this.playerController.setOnShadowCaught(() => {
      if (!this.isGameOver && this.isGameRunning) {
        this.loseGame();
      }
    });
  }

  private handleResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private initGame(): void {
    this.mazeData = this.mazeGenerator.generate();
    this.playerController.reset();
    this.shadowEntity.reset(0, 0);
    this.gameTimeRemaining = 120;
    this.isGameOver = false;
    this.isGameRunning = false;
    this.elapsedTime = 0;
    this.clock = new THREE.Clock();
    this.clock.start();
    this.uiManager.reset();
    this.uiManager.showStartScreen();
  }

  private startGame(): void {
    this.gameHasStarted = true;
    this.isGameRunning = true;
    this.isGameOver = false;
    this.gameTimeRemaining = 120;
    this.elapsedTime = 0;
    this.clock = new THREE.Clock();
    this.clock.start();
    this.playerController.attachEventListeners();
    this.shadowEntity.activate();
    this.uiManager.showGameUI();
    this.animate();
  }

  private restartGame(): void {
    this.mazeGenerator.clearGeometry();
    this.shadowEntity.dispose();

    this.mazeGenerator = new MazeGenerator(this.scene, MAZE_SIZE);
    this.shadowEntity = new ShadowEntity(this.scene, this.mazeGenerator);

    this.playerController = new PlayerController(
      this.camera,
      this.mazeGenerator,
      this.shadowEntity,
      this.renderer.domElement
    );

    this.uiManager = new UIManager(this.mazeGenerator);
    this.setupGameCallbacks();

    this.mazeData = this.mazeGenerator.generate();
    this.playerController.reset();
    this.shadowEntity.reset(0, 0);

    this.gameTimeRemaining = 120;
    this.isGameOver = false;
    this.elapsedTime = 0;
    this.clock = new THREE.Clock();
    this.clock.start();

    this.playerController.attachEventListeners();
    this.shadowEntity.activate();

    this.uiManager.reset();
    this.uiManager.showGameUI();

    this.isGameRunning = true;
    this.animate();
  }

  private winGame(): void {
    this.isGameOver = true;
    this.isGameRunning = false;
    this.playerController.detachEventListeners();
    this.shadowEntity.deactivate();
    this.uiManager.showGameWin();
  }

  private loseGame(): void {
    this.isGameOver = true;
    this.isGameRunning = false;
    this.playerController.detachEventListeners();
    this.shadowEntity.deactivate();
    this.uiManager.showGameOver();
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    if (this.isGameRunning && !this.isGameOver) {
      this.elapsedTime += deltaTime;
      this.gameTimeRemaining -= deltaTime;

      if (this.gameTimeRemaining <= 0) {
        this.gameTimeRemaining = 0;
        this.loseGame();
        return;
      }

      this.playerController.update(deltaTime);
      this.shadowEntity.update(
        deltaTime,
        this.playerController.getPosition(),
        this.elapsedTime
      );
      this.mazeGenerator.update(deltaTime, this.elapsedTime);
    }

    const playerState = this.playerController.getState();
    const shadowState = this.shadowEntity.getState();
    const boostInfo = this.playerController.getBoostInfo();

    this.uiManager.update({
      timeRemaining: this.gameTimeRemaining,
      currentCell: playerState.currentCell,
      fragmentsCollected: this.playerController.getFragmentsCollected(),
      totalFragments: this.playerController.getTotalFragments(),
      playerCell: playerState.currentCell,
      exitCell: this.mazeData?.exit || null,
      shadowState: shadowState,
      boostInfo: boostInfo
    });

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.handleResize);
    this.playerController.detachEventListeners();

    this.mazeGenerator.clearGeometry();
    this.shadowEntity.dispose();

    this.renderer.dispose();
    this.canvasContainer.removeChild(this.renderer.domElement);
  }
}

let game: Game | null = null;

window.addEventListener('DOMContentLoaded', () => {
  game = new Game();
});

window.addEventListener('beforeunload', () => {
  if (game) {
    game.dispose();
    game = null;
  }
});

import * as THREE from 'three';
import { SceneManager, ISceneManager } from '../engine/scene';
import { TerrainManager, ITerrainManager } from '../engine/terrain';
import { ParticleManager, IParticleManager } from '../engine/particles';
import { PlayerController, IPlayerController } from './player';
import { HUDController, IHUDController } from './hud';

type GameState = 'menu' | 'playing' | 'gameover';

interface DifficultyLevel {
  name: string;
  minInterval: number;
  maxInterval: number;
  speed: number;
  minTime: number;
  maxTime: number;
}

const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  { name: '简单', minInterval: 2.5, maxInterval: 3.0, speed: 2.0, minTime: 0, maxTime: 60 },
  { name: '中等', minInterval: 1.8, maxInterval: 2.5, speed: 2.5, minTime: 60, maxTime: 120 },
  { name: '困难', minInterval: 1.2, maxInterval: 2.0, speed: 3.0, minTime: 120, maxTime: Infinity }
];

class Game {
  private sceneManager: ISceneManager;
  private terrainManager: TerrainManager;
  private particleManager: IParticleManager;
  private player: IPlayerController;
  private hud: IHUDController;
  
  private gameState: GameState = 'menu';
  private score: number = 0;
  private gameTime: number = 0;
  
  private fireballSpawnTimer: number = 0;
  private crystalSpawnTimer: number = 0;
  
  private readonly crystalMinInterval: number = 1.0;
  private readonly crystalMaxInterval: number = 2.0;
  
  private scrollSpeed: number = 25;
  private readonly baseScrollSpeed: number = 20;
  
  private cameraOffset: THREE.Vector3 = new THREE.Vector3(0, 10, 28);
  
  private currentDifficulty: number = 0;
  private lastDifficultyNotice: number = -1;
  private readonly difficultyNoticeInterval: number = 30;
  
  private readonly fireballSpawnDistance: number = 60;
  private readonly crystalSpawnDistance: number = 50;
  
  private debugMode: boolean = true;
  private debugTimer: number = 0;
  
  private frameCount: number = 0;
  private fps: number = 60;
  private fpsTimer: number = 0;
  private lastFrameTime: number = 0;

  constructor() {
    this.sceneManager = new SceneManager('game-canvas');
    this.terrainManager = new TerrainManager(this.sceneManager);
    this.particleManager = new ParticleManager(this.sceneManager);
    this.player = new PlayerController(this.sceneManager);
    this.hud = new HUDController();
    
    this.syncCanyonBounds();
    this.setupInitialCamera();
    
    this.setupEvents();
    this.showMenu();
    this.startGameLoop();
    
    if (this.debugMode) {
      console.log('[Game] 初始化完成');
      console.log(`  峡谷参数: 半宽=${this.terrainManager.canyonHalfWidth}, 安全半宽=${this.terrainManager.canyonHalfWidthSafe}`);
      console.log(`  相机初始位置: (${this.sceneManager.camera.position.x.toFixed(1)}, ${this.sceneManager.camera.position.y.toFixed(1)}, ${this.sceneManager.camera.position.z.toFixed(1)})`);
      this.logDebugInfo();
    }
  }

  private syncCanyonBounds(): void {
    const canyonHalfWidth = this.terrainManager.canyonHalfWidthSafe;
    const minHeight = -3;
    const maxHeight = 12;
    
    this.player.setCanyonBounds(canyonHalfWidth, minHeight, maxHeight);
    
    if (this.debugMode) {
      console.log('[Game] 同步峡谷边界:');
      console.log(`  玩家边界: X[-${canyonHalfWidth}~${canyonHalfWidth}], Y[${minHeight}~${maxHeight}]`);
      console.log(`  玩家碰撞半径: ${this.player.collisionRadius}`);
    }
  }

  private setupInitialCamera(): void {
    this.sceneManager.camera.fov = 95;
    this.sceneManager.camera.position.set(0, 10, 28);
    this.sceneManager.camera.lookAt(0, 1, -45);
    this.sceneManager.camera.updateProjectionMatrix();
    
    if (this.debugMode) {
      console.log(`[Game] 相机设置: FOV=${this.sceneManager.camera.fov}°`);
      console.log(`  近裁剪面: ${this.sceneManager.camera.near}, 远裁剪面: ${this.sceneManager.camera.far}`);
      const distance = 28;
      const aspect = this.sceneManager.camera.aspect;
      const fovRad = THREE.MathUtils.DEG2RAD * this.sceneManager.camera.fov / 2;
      const viewHeightAtPlayer = 2 * Math.tan(fovRad) * distance;
      const viewWidthAtPlayer = viewHeightAtPlayer * aspect;
      console.log(`  玩家位置处视野: 宽±${(viewWidthAtPlayer/2).toFixed(1)}单位, 高±${(viewHeightAtPlayer/2).toFixed(1)}单位`);
      console.log(`  墙壁位置: 左X=-12.5, 右X=12.5`);
      console.log(`  墙壁是否在视野内: 左${-12.5 >= -viewWidthAtPlayer/2}, 右${12.5 <= viewWidthAtPlayer/2}`);
    }
  }

  private setupEvents(): void {
    this.sceneManager.onResize(() => {
      this.hud.updateScale();
      this.sceneManager.camera.updateProjectionMatrix();
    });
    
    this.hud.onRestart(() => {
      this.restartGame();
    });
  }

  private showMenu(): void {
    this.gameState = 'menu';
    this.hud.showMainMenu(
      () => this.startGame(),
      () => this.showInstructions()
    );
  }

  private showInstructions(): void {
    this.hud.showInstructions(() => {
      this.hud.hideInstructions();
    });
  }

  private startGame(): void {
    this.gameState = 'playing';
    this.score = 0;
    this.gameTime = 0;
    this.currentDifficulty = 0;
    this.lastDifficultyNotice = -1;
    
    this.fireballSpawnTimer = 2;
    this.crystalSpawnTimer = 1.5;
    
    this.player.reset();
    this.player.position.set(0, 3, 0);
    this.particleManager.clearAll();
    
    this.updateDifficultySettings();
    
    this.hud.hideMainMenu();
    this.hud.hideGameOver();
    this.hud.setScore(this.score);
    this.hud.setHealth(this.player.health, this.player.maxHealth);
    
    this.setupInitialCamera();
    
    if (this.debugMode) {
      console.log('[Game] 游戏开始');
      console.log(`  初始难度: ${DIFFICULTY_LEVELS[0].name}`);
      console.log(`  火球参数: 间隔=${DIFFICULTY_LEVELS[0].minInterval}~${DIFFICULTY_LEVELS[0].maxInterval}s, 速度=${DIFFICULTY_LEVELS[0].speed}`);
    }
  }

  private restartGame(): void {
    this.hud.hideGameOver();
    this.startGame();
  }

  private gameOver(): void {
    this.gameState = 'gameover';
    this.hud.showGameOver(this.score);
    
    if (this.debugMode) {
      console.log('[Game] 游戏结束');
      console.log(`  最终得分: ${Math.floor(this.score)}`);
      console.log(`  生存时间: ${this.gameTime.toFixed(1)}s`);
      console.log(`  达到难度: ${DIFFICULTY_LEVELS[this.currentDifficulty].name}`);
    }
  }

  private updateDifficultySettings(): void {
    const level = DIFFICULTY_LEVELS[this.currentDifficulty];
    
    if (this.debugMode && this.gameTime > 0) {
      console.log(`[Game] 难度更新: ${level.name} (${this.gameTime.toFixed(1)}s)`);
      console.log(`  火球间隔: ${level.minInterval}~${level.maxInterval}s, 速度: ${level.speed}`);
    }
  }

  private updateDifficulty(delta: number): void {
    this.gameTime += delta;
    
    let newDifficulty = 0;
    for (let i = DIFFICULTY_LEVELS.length - 1; i >= 0; i--) {
      if (this.gameTime >= DIFFICULTY_LEVELS[i].minTime) {
        newDifficulty = i;
        break;
      }
    }
    
    if (newDifficulty !== this.currentDifficulty) {
      this.currentDifficulty = newDifficulty;
      this.updateDifficultySettings();
    }
    
    const noticeSlot = Math.floor(this.gameTime / this.difficultyNoticeInterval);
    if (noticeSlot > this.lastDifficultyNotice && this.gameTime > 1) {
      this.lastDifficultyNotice = noticeSlot;
      this.hud.showDifficultyNotice();
      
      if (this.debugMode) {
        console.log(`[Game] 难度提示触发: 游戏时间 ${this.gameTime.toFixed(1)}s, 第 ${noticeSlot} 次提示`);
      }
    }
  }

  private spawnFireball(): void {
    const playerPos = this.player.position;
    const canyonHalfWidth = this.terrainManager.canyonHalfWidthSafe;
    
    const rand = Math.random();
    let source: 'front' | 'left' | 'right';
    let spawnPos = new THREE.Vector3();
    
    spawnPos.z = playerPos.z - this.fireballSpawnDistance;
    
    if (rand < 0.33) {
      source = 'left';
      spawnPos.x = -canyonHalfWidth + 1 + Math.random() * 2;
      spawnPos.y = -2 + Math.random() * 10;
    } else if (rand < 0.66) {
      source = 'right';
      spawnPos.x = canyonHalfWidth - 1 - Math.random() * 2;
      spawnPos.y = -2 + Math.random() * 10;
    } else {
      source = 'front';
      spawnPos.x = (Math.random() - 0.5) * canyonHalfWidth * 0.8;
      spawnPos.y = 3 + Math.random() * 8;
    }
    
    const targetPos = new THREE.Vector3(
      playerPos.x + (Math.random() - 0.5) * 6,
      playerPos.y + (Math.random() - 0.5) * 4,
      playerPos.z
    );
    
    const level = DIFFICULTY_LEVELS[this.currentDifficulty];
    const speed = level.speed * 30;
    
    if (this.debugMode) {
      console.log(`[Game] 生成火球 (来源: ${source})`);
      console.log(`  难度: ${level.name}, 速度: ${speed.toFixed(1)}`);
      console.log(`  生成位置: (${spawnPos.x.toFixed(1)}, ${spawnPos.y.toFixed(1)}, ${spawnPos.z.toFixed(1)})`);
      console.log(`  目标位置: (${targetPos.x.toFixed(1)}, ${targetPos.y.toFixed(1)}, ${targetPos.z.toFixed(1)})`);
    }
    
    this.particleManager.spawnFireball(spawnPos, targetPos, speed, source);
  }

  private spawnCrystal(): void {
    const playerPos = this.player.position;
    const canyonHalfWidth = this.terrainManager.canyonHalfWidthSafe;
    
    const spawnPos = new THREE.Vector3();
    spawnPos.z = playerPos.z - this.crystalSpawnDistance;
    spawnPos.x = (Math.random() - 0.5) * (canyonHalfWidth - 2);
    spawnPos.y = -2 + Math.random() * 12;
    
    if (this.debugMode) {
      console.log(`[Game] 生成水晶`);
      console.log(`  位置: (${spawnPos.x.toFixed(1)}, ${spawnPos.y.toFixed(1)}, ${spawnPos.z.toFixed(1)})`);
    }
    
    this.particleManager.spawnCrystal(spawnPos);
  }

  private updateGame(delta: number): void {
    if (this.gameState !== 'playing') return;
    
    this.updateDifficulty(delta);
    
    this.player.update(delta);
    
    this.scrollSpeed = this.baseScrollSpeed + this.gameTime * 0.06;
    this.terrainManager.update(delta, this.scrollSpeed);
    
    this.player.position.z -= this.scrollSpeed * delta;
    
    this.particleManager.update(delta, this.player.position);
    
    const level = DIFFICULTY_LEVELS[this.currentDifficulty];
    
    this.fireballSpawnTimer -= delta;
    if (this.fireballSpawnTimer <= 0) {
      this.spawnFireball();
      this.fireballSpawnTimer = level.minInterval + 
        Math.random() * (level.maxInterval - level.minInterval);
      
      if (this.debugMode) {
        console.log(`[Game] 下一个火球将在 ${this.fireballSpawnTimer.toFixed(2)}s 后生成`);
      }
    }
    
    this.crystalSpawnTimer -= delta;
    if (this.crystalSpawnTimer <= 0) {
      this.spawnCrystal();
      this.crystalSpawnTimer = this.crystalMinInterval + 
        Math.random() * (this.crystalMaxInterval - this.crystalMinInterval);
    }
    
    if (this.particleManager.checkFireballCollision(this.player.position, this.player.collisionRadius)) {
      const isDead = this.player.takeDamage(10);
      this.hud.showDamageFlash();
      this.hud.setHealth(this.player.health, this.player.maxHealth);
      
      if (isDead) {
        this.gameOver();
      }
    }
    
    const crystalsCollected = this.particleManager.checkCrystalCollision(this.player.position, this.player.collisionRadius);
    if (crystalsCollected > 0) {
      for (let i = 0; i < crystalsCollected; i++) {
        this.player.heal(5);
        this.score += 50;
      }
      this.hud.setHealth(this.player.health, this.player.maxHealth);
      this.hud.setScore(this.score);
    }
    
    this.score += 6 * delta;
    this.hud.setScore(this.score);
    
    const cameraTarget = new THREE.Vector3(
      this.player.position.x * 0.3,
      this.player.position.y * 0.3 + this.cameraOffset.y,
      this.player.position.z + this.cameraOffset.z
    );
    
    this.sceneManager.camera.position.lerp(cameraTarget, 0.05);
    this.sceneManager.camera.lookAt(
      this.player.position.x * 0.2,
      this.player.position.y + 2,
      this.player.position.z - 40
    );
    
    this.fpsTimer += delta;
    this.frameCount++;
    this.lastFrameTime = delta * 1000;
    if (this.fpsTimer >= 1) {
      this.fps = this.frameCount / this.fpsTimer;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }
    
    if (this.debugMode) {
      this.debugTimer += delta;
      if (this.debugTimer > 5) {
        this.debugTimer = 0;
        this.logDebugInfo();
      }
    }
  }

  private startGameLoop(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      
      const delta = this.sceneManager.getDelta();
      const clampedDelta = Math.min(delta, 0.05);
      
      if (this.gameState === 'playing') {
        this.updateGame(clampedDelta);
      }
      
      this.sceneManager.render();
    };
    
    animate();
  }

  public logDebugInfo(): void {
    console.log('=================== 游戏调试信息 ===================');
    console.log(`[Game] 状态: ${this.gameState}`);
    console.log(`  游戏时间: ${this.gameTime.toFixed(1)}s`);
    console.log(`  当前得分: ${Math.floor(this.score)}`);
    console.log(`  当前难度: ${DIFFICULTY_LEVELS[this.currentDifficulty].name} (等级 ${this.currentDifficulty + 1}/${DIFFICULTY_LEVELS.length}`);
    console.log(`  滚动速度: ${this.scrollSpeed.toFixed(1)}`);
    console.log(`  火球间隔: ${DIFFICULTY_LEVELS[this.currentDifficulty].minInterval}~${DIFFICULTY_LEVELS[this.currentDifficulty].maxInterval}s, 速度: ${DIFFICULTY_LEVELS[this.currentDifficulty].speed}`);
    console.log(`  FPS: ${this.fps.toFixed(0)}, 帧时间: ${this.lastFrameTime.toFixed(1)}ms`);
    
    this.terrainManager.logDebugInfo();
    this.player.logDebugInfo();
    this.particleManager.logDebugInfo();
    
    console.log(`[Game] 相机信息:`);
    console.log(`  位置: (${this.sceneManager.camera.position.x.toFixed(1)}, ${this.sceneManager.camera.position.y.toFixed(1)}, ${this.sceneManager.camera.position.z.toFixed(1)})`);
    console.log(`  FOV: ${this.sceneManager.camera.fov}°, 宽高比: ${this.sceneManager.camera.aspect.toFixed(2)}`);
    console.log('============================================');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  (window as any).game = new Game();
});

import * as THREE from 'three';
import { SceneManager, ISceneManager } from '../engine/scene';
import { TerrainManager, ITerrainManager } from '../engine/terrain';
import { ParticleManager, IParticleManager } from '../engine/particles';
import { PlayerController, IPlayerController } from './player';
import { HUDController, IHUDController } from './hud';

type GameState = 'menu' | 'playing' | 'gameover';

class Game {
  private sceneManager: ISceneManager;
  private terrainManager: ITerrainManager;
  private particleManager: IParticleManager;
  private player: IPlayerController;
  private hud: IHUDController;
  
  private gameState: GameState = 'menu';
  private score: number = 0;
  private gameTime: number = 0;
  
  private fireballSpawnTimer: number = 0;
  private fireballMinInterval: number = 2.5;
  private fireballMaxInterval: number = 3;
  private fireballSpeed: number = 2;
  
  private crystalSpawnTimer: number = 0;
  private crystalMinInterval: number = 1;
  private crystalMaxInterval: number = 2;
  
  private scrollSpeed: number = 30;
  private cameraOffset: THREE.Vector3 = new THREE.Vector3(0, 7, 16);
  
  private difficultyLevel: number = 0;
  private lastDifficultyNotice: number = 0;

  constructor() {
    this.sceneManager = new SceneManager('game-canvas');
    this.terrainManager = new TerrainManager(this.sceneManager);
    this.particleManager = new ParticleManager(this.sceneManager);
    this.player = new PlayerController(this.sceneManager);
    this.hud = new HUDController();
    
    const canyonHalfWidth = this.terrainManager.getCanyonHalfWidth();
    this.player.setCanyonBounds(canyonHalfWidth - 2, -2, 12);
    
    this.setupEvents();
    this.setupInitialCamera();
    this.showMenu();
    this.startGameLoop();
  }

  private setupInitialCamera(): void {
    this.sceneManager.camera.position.set(0, 6, 16);
    this.sceneManager.camera.lookAt(0, 0, -20);
  }

  private setupEvents(): void {
    this.sceneManager.onResize(() => {
      this.hud.updateScale();
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
    this.difficultyLevel = 0;
    this.lastDifficultyNotice = 0;
    
    this.fireballMinInterval = 2.5;
    this.fireballMaxInterval = 3;
    this.fireballSpeed = 2;
    
    this.fireballSpawnTimer = 2;
    this.crystalSpawnTimer = 1;
    
    this.player.reset();
    this.player.position.set(0, 2, 0);
    this.player.mesh.scale.setScalar(1.5);
    this.particleManager.clearAll();
    
    this.hud.hideMainMenu();
    this.hud.hideGameOver();
    this.hud.setScore(this.score);
    this.hud.setHealth(this.player.health, this.player.maxHealth);
    
    this.setupInitialCamera();
  }

  private restartGame(): void {
    this.hud.hideGameOver();
    this.startGame();
  }

  private gameOver(): void {
    this.gameState = 'gameover';
    this.hud.showGameOver(this.score);
  }

  private updateDifficulty(delta: number): void {
    this.gameTime += delta;
    
    let newLevel = 0;
    if (this.gameTime >= 120) {
      newLevel = 2;
    } else if (this.gameTime >= 60) {
      newLevel = 1;
    }
    
    if (newLevel !== this.difficultyLevel) {
      this.difficultyLevel = newLevel;
      
      switch (this.difficultyLevel) {
        case 0:
          this.fireballMinInterval = 2.5;
          this.fireballMaxInterval = 3;
          this.fireballSpeed = 2;
          break;
        case 1:
          this.fireballMinInterval = 1.8;
          this.fireballMaxInterval = 2.5;
          this.fireballSpeed = 2.5;
          break;
        case 2:
          this.fireballMinInterval = 1.2;
          this.fireballMaxInterval = 2;
          this.fireballSpeed = 3;
          break;
      }
    }
    
    const noticeInterval = 30;
    const currentNoticeSlot = Math.floor(this.gameTime / noticeInterval);
    if (currentNoticeSlot > this.lastDifficultyNotice && this.gameTime > 1) {
      this.lastDifficultyNotice = currentNoticeSlot;
      this.hud.showDifficultyNotice();
    }
  }

  private spawnFireball(): void {
    const playerPos = this.player.position;
    const spawnDistance = 55;
    const canyonHalfWidth = this.terrainManager.getCanyonHalfWidth();
    
    const side = Math.floor(Math.random() * 3);
    
    let spawnPos = new THREE.Vector3();
    spawnPos.z = playerPos.z - spawnDistance;
    
    switch (side) {
      case 0:
        spawnPos.x = -canyonHalfWidth + 1 + Math.random() * 3;
        spawnPos.y = -1 + Math.random() * 10;
        break;
      case 1:
        spawnPos.x = canyonHalfWidth - 1 - Math.random() * 3;
        spawnPos.y = -1 + Math.random() * 10;
        break;
      case 2:
        spawnPos.x = (Math.random() - 0.5) * canyonHalfWidth * 0.8;
        spawnPos.y = 4 + Math.random() * 8;
        break;
    }
    
    const targetPos = new THREE.Vector3(
      playerPos.x + (Math.random() - 0.5) * 6,
      playerPos.y + (Math.random() - 0.5) * 4,
      playerPos.z
    );
    
    this.particleManager.spawnFireball(spawnPos, targetPos, this.fireballSpeed * 20);
  }

  private spawnCrystal(): void {
    const playerPos = this.player.position;
    const spawnDistance = 50;
    const canyonHalfWidth = this.terrainManager.getCanyonHalfWidth();
    
    const spawnPos = new THREE.Vector3();
    spawnPos.z = playerPos.z - spawnDistance;
    spawnPos.x = (Math.random() - 0.5) * (canyonHalfWidth - 4);
    spawnPos.y = -1 + Math.random() * 12;
    
    this.particleManager.spawnCrystal(spawnPos);
  }

  private updateGame(delta: number): void {
    if (this.gameState !== 'playing') return;
    
    this.updateDifficulty(delta);
    
    this.player.update(delta);
    
    this.scrollSpeed = 18 + this.gameTime * 0.06;
    this.terrainManager.update(delta, this.scrollSpeed);
    
    this.player.position.z -= this.scrollSpeed * delta;
    
    this.particleManager.update(delta, this.player.position);
    
    this.fireballSpawnTimer -= delta;
    if (this.fireballSpawnTimer <= 0) {
      this.spawnFireball();
      this.fireballSpawnTimer = this.fireballMinInterval + 
        Math.random() * (this.fireballMaxInterval - this.fireballMinInterval);
    }
    
    this.crystalSpawnTimer -= delta;
    if (this.crystalSpawnTimer <= 0) {
      this.spawnCrystal();
      this.crystalSpawnTimer = this.crystalMinInterval + 
        Math.random() * (this.crystalMaxInterval - this.crystalMinInterval);
    }
    
    if (this.particleManager.checkFireballCollision(this.player.position, 1.2)) {
      const isDead = this.player.takeDamage(10);
      this.hud.showDamageFlash();
      this.hud.setHealth(this.player.health, this.player.maxHealth);
      
      if (isDead) {
        this.gameOver();
      }
    }
    
    const crystalsCollected = this.particleManager.checkCrystalCollision(this.player.position, 1.8);
    if (crystalsCollected > 0) {
      for (let i = 0; i < crystalsCollected; i++) {
        this.player.heal(5);
        this.score += 50;
      }
      this.hud.setHealth(this.player.health, this.player.maxHealth);
      this.hud.setScore(this.score);
    }
    
    this.score += 5 * delta;
    this.hud.setScore(this.score);
    
    const cameraTarget = new THREE.Vector3(
      this.player.position.x * 0.3,
      this.player.position.y * 0.3 + this.cameraOffset.y,
      this.player.position.z + this.cameraOffset.z
    );
    
    this.sceneManager.camera.position.lerp(cameraTarget, 0.05);
    this.sceneManager.camera.lookAt(
      this.player.position.x * 0.2,
      this.player.position.y,
      this.player.position.z - 25
    );
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
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});

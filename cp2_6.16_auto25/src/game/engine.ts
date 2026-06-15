import { Player } from './entities/player';
import { Asteroid } from './entities/asteroid';
import { ParticleSystem } from './entities/particleSystem';
import { Renderer } from './rendering/renderer';
import { GameSocket } from '../network/socket';
import type { PlayerState, AsteroidState, MeteorState, ChatMessage, UpgradeType } from '../types';
import { ORE_NAMES } from '../types';

export class GameEngine {
  private renderer: Renderer;
  private socket: GameSocket;
  private particleSystem: ParticleSystem;
  private players: Map<number, Player> = new Map();
  private asteroids: Map<number, Asteroid> = new Map();
  private meteors: MeteorState[] = [];
  private localPlayerId: number | null = null;
  private keys: Record<string, boolean> = {};
  private chatMessages: ChatMessage[] = [];
  private chatInput: string = '';
  private isChatFocused: boolean = false;
  private gameTime: number = 30 * 60 * 1000;
  private alarmActive: boolean = false;
  private showUpgradePanel: boolean = false;
  private gameOver: boolean = false;
  private lastTime: number = 0;
  private highlightTime: number = 0;
  private animationFrameId: number | null = null;
  
  private readonly BASE_X: number = 1000;
  private readonly BASE_Y: number = 750;
  private readonly UPGRADES: UpgradeType[] = [
    {
      type: 'cargo',
      name: '货舱扩容',
      description: '增加5格货舱容量',
      cost: { iron: 10, copper: 5 }
    },
    {
      type: 'shield',
      name: '护盾强化',
      description: '护盾上限从100\n提升至150',
      cost: { crystal: 8 }
    },
    {
      type: 'mining',
      name: '采矿效率',
      description: '开采速度从10%/秒\n提升至15%/秒',
      cost: { crystal: 6, iron: 4 }
    }
  ];
  
  constructor(canvas: HTMLCanvasElement, socket: GameSocket) {
    this.renderer = new Renderer(canvas);
    this.socket = socket;
    this.particleSystem = new ParticleSystem();
    this.setupEventListeners(canvas);
    this.setupSocketHandlers();
  }
  
  private setupEventListeners(canvas: HTMLCanvasElement): void {
    window.addEventListener('keydown', (e) => {
      if (this.isChatFocused) {
        if (e.key === 'Enter') {
          if (this.chatInput.trim()) {
            this.socket.sendChat(this.chatInput.trim());
            this.chatInput = '';
          }
          this.isChatFocused = false;
        } else if (e.key === 'Escape') {
          this.isChatFocused = false;
          this.chatInput = '';
        } else if (e.key === 'Backspace') {
          this.chatInput = this.chatInput.slice(0, -1);
        } else if (e.key.length === 1) {
          this.chatInput += e.key;
        }
        return;
      }
      
      if (e.key === 'Enter') {
        this.isChatFocused = true;
        return;
      }
      
      if (e.key === 'Escape') {
        this.showUpgradePanel = false;
        return;
      }
      
      this.keys[e.key.toLowerCase()] = true;
      this.socket.sendInput(this.keys);
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.socket.sendInput(this.keys);
    });
    
    canvas.addEventListener('click', (e) => {
      if (this.gameOver || this.showUpgradePanel || this.isChatFocused) return;
      
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPos = this.renderer.screenToWorld(screenX, screenY);
      
      let closestAsteroid: AsteroidState | null = null;
      let closestDist = Infinity;
      
      this.asteroids.forEach((asteroid) => {
        const state = asteroid.getState();
        const dist = Math.hypot(worldPos.x - state.x, worldPos.y - state.y);
        if (dist < state.size + 10 && dist < closestDist) {
          closestDist = dist;
          closestAsteroid = state;
        }
      });
      
      if (closestAsteroid !== null) {
        this.socket.sendTargetAsteroid(closestAsteroid.id);
      }
    });
  }
  
  private setupSocketHandlers(): void {
    this.socket.on('init', (message) => {
      this.localPlayerId = message.playerId;
      
      message.players.forEach((playerState: PlayerState) => {
        this.players.set(playerState.id, new Player(playerState));
      });
      
      message.asteroids.forEach((asteroidState: AsteroidState) => {
        this.asteroids.set(asteroidState.id, new Asteroid(asteroidState));
      });
    });
    
    this.socket.on('playerJoin', (message) => {
      if (!this.players.has(message.player.id)) {
        this.players.set(message.player.id, new Player(message.player));
      }
    });
    
    this.socket.on('playerLeave', (message) => {
      this.players.delete(message.playerId);
    });
    
    this.socket.on('state', (message) => {
      this.gameTime = message.gameTime;
      this.alarmActive = message.alarmActive;
      this.meteors = message.meteors || [];
      
      message.players.forEach((playerState: PlayerState) => {
        const player = this.players.get(playerState.id);
        if (player) {
          player.update(playerState, 1 / 60, this.particleSystem);
        } else {
          this.players.set(playerState.id, new Player(playerState));
        }
      });
      
      const existingIds = new Set(message.asteroids.map((a: AsteroidState) => a.id));
      this.asteroids.forEach((_, id) => {
        if (!existingIds.has(id)) {
          this.asteroids.delete(id);
        }
      });
      
      message.asteroids.forEach((asteroidState: AsteroidState) => {
        const asteroid = this.asteroids.get(asteroidState.id);
        if (asteroid) {
          asteroid.update(asteroidState);
        } else {
          this.asteroids.set(asteroidState.id, new Asteroid(asteroidState));
        }
      });
    });
    
    this.socket.on('chat', (message) => {
      this.chatMessages.push({
        playerId: message.playerId,
        playerName: message.playerName,
        message: message.message,
        timestamp: message.timestamp
      });
      if (this.chatMessages.length > 50) {
        this.chatMessages.shift();
      }
    });
    
    this.socket.on('asteroidDestroyed', (message) => {
      this.particleSystem.spawnShockwave(message.x, message.y);
    });
    
    this.socket.on('asteroidMined', (message) => {
      if (message.newAsteroid) {
        this.asteroids.set(message.newAsteroid.id, new Asteroid(message.newAsteroid));
      }
    });
    
    this.socket.on('upgradeSuccess', (message) => {
      this.renderer.triggerUpgradeAnimation(message.upgradeType);
      const player = this.players.get(message.player.id);
      if (player) {
        player.update(message.player, 1 / 60, this.particleSystem);
      }
    });
    
    this.socket.on('playerDestroyed', () => {
      this.showUpgradePanel = false;
    });
    
    this.socket.on('meteorAlarm', () => {
      this.alarmActive = true;
    });
  }
  
  start(): void {
    this.lastTime = performance.now();
    this.gameLoop();
  }
  
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  private gameLoop(): void {
    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    
    this.highlightTime += deltaTime * 1000;
    
    this.update(deltaTime);
    this.render(deltaTime);
    
    if (this.gameTime <= 0) {
      this.gameOver = true;
    }
    
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }
  
  private update(deltaTime: number): void {
    if (this.gameOver) return;
    
    this.particleSystem.update(deltaTime);
    this.renderer.updateAnimations(deltaTime);
    
    const localPlayer = this.getLocalPlayer();
    if (localPlayer) {
      this.renderer.updateCamera(localPlayer.x, localPlayer.y);
      
      const distToBase = Math.hypot(localPlayer.x - this.BASE_X, localPlayer.y - this.BASE_Y);
      if (distToBase < 100 && !this.showUpgradePanel) {
        this.showUpgradePanel = true;
      } else if (distToBase >= 120 && this.showUpgradePanel) {
        this.showUpgradePanel = false;
      }
    }
  }
  
  private render(deltaTime: number): void {
    this.renderer.clear();
    this.renderer.drawNebulaBackground(deltaTime);
    
    this.renderer.drawBase();
    
    this.asteroids.forEach((asteroid) => {
      const localPlayer = this.getLocalPlayer();
      if (localPlayer) {
        this.renderer.drawAsteroid(asteroid.getState(), localPlayer.x, localPlayer.y, this.highlightTime);
      }
    });
    
    this.players.forEach((player, id) => {
      this.renderer.drawPlayer(player.getState(), id === this.localPlayerId);
    });
    
    this.meteors.forEach((meteor) => {
      this.renderer.drawMeteor(meteor, deltaTime, this.particleSystem);
    });
    
    this.renderer.drawParticles(this.particleSystem.getParticles());
    
    this.renderer.drawAlarmBorder(this.alarmActive);
    
    if (!this.gameOver) {
      this.renderer.drawScoreboard(Array.from(this.players.values()).map(p => p.getState()));
      this.renderer.drawCountdown(this.gameTime);
      
      const localPlayer = this.getLocalPlayer();
      if (localPlayer) {
        this.renderer.drawCargo(localPlayer);
      }
      
      this.renderer.drawChat(this.chatMessages);
      
      if (this.isChatFocused) {
        this.drawChatInput();
      }
      
      if (this.showUpgradePanel && localPlayer) {
        this.renderer.drawUpgradePanel(
          localPlayer,
          this.UPGRADES,
          null,
          (type) => this.handleUpgrade(type)
        );
      }
    } else {
      this.renderer.drawGameOver(
        Array.from(this.players.values()).map(p => p.getState()),
        () => this.restartGame()
      );
    }
  }
  
  private drawChatInput(): void {
    const panelX = 20;
    const panelY = this.renderer['canvas'].height - 20;
    const panelWidth = 200;
    
    this.renderer['ctx'].fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.renderer['ctx'].strokeStyle = '#00e5ff';
    this.renderer['ctx'].lineWidth = 1;
    this.renderer['roundRect'](panelX, panelY - 25, panelWidth, 25, 4);
    this.renderer['ctx'].fill();
    this.renderer['ctx'].stroke();
    
    this.renderer['ctx'].fillStyle = '#ffffff';
    this.renderer['ctx'].font = '12px Segoe UI';
    this.renderer['ctx'].textAlign = 'left';
    this.renderer['ctx'].fillText('> ' + this.chatInput + '_', panelX + 8, panelY - 8);
  }
  
  private getLocalPlayer(): PlayerState | null {
    if (this.localPlayerId === null) return null;
    const player = this.players.get(this.localPlayerId);
    return player ? player.getState() : null;
  }
  
  private handleUpgrade(type: string): void {
    this.socket.sendUpgrade(type);
  }
  
  private restartGame(): void {
    this.gameOver = false;
    this.gameTime = 30 * 60 * 1000;
    this.players.clear();
    this.asteroids.clear();
    this.meteors = [];
    this.chatMessages = [];
    this.particleSystem.clear();
    window.location.reload();
  }
}

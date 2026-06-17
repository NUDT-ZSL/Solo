import { NetworkManager } from './network';
import { CardGame } from './cardGame';
import { AIPlayer } from './aiPlayer';
import { GameStats } from '../shared/types';

class GameApp {
  private network: NetworkManager;
  private cardGame: CardGame;
  private aiPlayer: AIPlayer;
  
  private latencyValueEl: HTMLElement;
  private queueCountEl: HTMLElement;
  private gameOverPanel: HTMLElement;
  private gameOverTitle: HTMLElement;
  private avgLatencyEl: HTMLElement;
  private rollbackCountEl: HTMLElement;
  private successRateEl: HTMLElement;
  private restartBtn: HTMLElement;
  
  constructor() {
    this.network = new NetworkManager();
    this.cardGame = new CardGame(this.network);
    this.aiPlayer = new AIPlayer(this.network, this.cardGame);
    
    this.latencyValueEl = document.getElementById('latency-value')!;
    this.queueCountEl = document.getElementById('queue-count')!;
    this.gameOverPanel = document.getElementById('game-over-panel')!;
    this.gameOverTitle = document.getElementById('game-over-title')!;
    this.avgLatencyEl = document.getElementById('avg-latency')!;
    this.rollbackCountEl = document.getElementById('rollback-count')!;
    this.successRateEl = document.getElementById('success-rate')!;
    this.restartBtn = document.getElementById('restart-btn')!;
    
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    this.network.setLatencyUpdateCallback((latency, queueSize) => {
      this.updateLatencyDisplay(latency, queueSize);
    });
    
    this.network.setOnGameOver((winner) => {
      this.showGameOver(winner);
    });
    
    this.restartBtn.addEventListener('click', () => {
      this.restartGame();
    });
  }
  
  private updateLatencyDisplay(latency: number, queueSize: number): void {
    this.latencyValueEl.textContent = `延迟: ${latency}ms`;
    this.queueCountEl.textContent = queueSize.toString();
    
    this.latencyValueEl.classList.remove('green', 'yellow', 'red');
    if (latency < 100) {
      this.latencyValueEl.classList.add('green');
    } else if (latency <= 200) {
      this.latencyValueEl.classList.add('yellow');
    } else {
      this.latencyValueEl.classList.add('red');
    }
  }
  
  private showGameOver(winner: string): void {
    const stats = this.network.getStats();
    
    const isWinner = winner === this.network.getPlayerId();
    this.gameOverTitle.textContent = isWinner ? '🎉 你赢了！' : '😔 你输了...';
    this.gameOverTitle.style.color = isWinner ? '#66bb6a' : '#ef5350';
    
    const avgLatency = stats.latencySamples > 0 
      ? Math.round(stats.totalLatency / stats.latencySamples) 
      : 0;
    this.avgLatencyEl.textContent = avgLatency.toString();
    
    this.rollbackCountEl.textContent = stats.rollbackCount.toString();
    
    const successRate = stats.totalPlays > 0 
      ? Math.round((stats.successfulPlays / stats.totalPlays) * 100) 
      : 0;
    this.successRateEl.textContent = successRate.toString();
    
    this.gameOverPanel.classList.add('show');
  }
  
  private restartGame(): void {
    this.gameOverPanel.classList.remove('show');
    this.network.resetStats();
    
    this.network.sendAction('restart');
  }
  
  async start(): Promise<void> {
    try {
      const wsUrl = this.getWebSocketUrl();
      await this.network.connect(wsUrl);
      console.log('[GameApp] Game started');
    } catch (error) {
      console.error('[GameApp] Failed to start game:', error);
      alert('连接服务器失败，请确保后端已启动。');
    }
  }
  
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port === '3000' ? '3001' : window.location.port;
    return `${protocol}//${host}:${port}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new GameApp();
  app.start();
});

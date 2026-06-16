import { Card, GameState, NetworkStats, QueuedOperation } from '../shared/types';
import { NetworkManager } from './network';
import { AIPlayer } from './aiPlayer';

interface PendingPlay {
  sequence: number;
  card: Card;
  originalIndex: number;
  cardElement: HTMLElement;
}

export class CardGame {
  private container: HTMLElement;
  private network: NetworkManager;
  private aiPlayer: AIPlayer;
  private gameState: GameState | null = null;
  private playerId: string = 'player';
  private pendingPlays: Map<number, PendingPlay> = new Map();
  private stats: NetworkStats | null = null;
  private gameOver: boolean = false;
  private winner: string = '';
  private finalStats: any = null;

  private dragState: {
    card: Card | null;
    element: HTMLElement | null;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    originalIndex: number;
  } = { card: null, element: null, startX: 0, startY: 0, offsetX: 0, offsetY: 0, originalIndex: -1 };

  constructor(container: HTMLElement, network: NetworkManager) {
    this.container = container;
    this.network = network;
    this.aiPlayer = new AIPlayer(network);
    this.setupCallbacks();
    this.render();
  }

  private setupCallbacks(): void {
    this.network.onStateUpdate((state) => {
      this.gameState = state;
      this.gameOver = state.gameOver;
      if (state.gameOver && state.winner) {
        this.winner = state.winner;
      }
      this.aiPlayer.handleStateUpdate(state);
      this.render();
    });

    this.network.onAck((sequence, status, reason) => {
      this.handleAck(sequence, status, reason);
    });

    this.network.onStatsUpdate((stats) => {
      this.stats = stats;
      this.updateStatsPanel();
    });

    this.network.onGameOver((winner, stats) => {
      this.gameOver = true;
      this.winner = winner;
      this.finalStats = stats;
      this.render();
    });

    this.aiPlayer.onAIPlay((card) => {
      this.animateAIPlay(card);
    });
  }

  private handleAck(sequence: number, status: 'success' | 'rollback', reason?: string): void {
    const pending = this.pendingPlays.get(sequence);
    if (!pending) return;

    if (status === 'success') {
      this.pendingPlays.delete(sequence);
    } else {
      this.rollbackCard(pending);
      this.pendingPlays.delete(sequence);
    }
    this.render();
  }

  private rollbackCard(pending: PendingPlay): void {
    const flash = this.container.querySelector('.play-flash');
    if (flash) {
      flash.classList.add('rollback');
      setTimeout(() => flash.classList.remove('rollback'), 300);
    }

    if (this.gameState) {
      const player = this.gameState.players[this.playerId];
      if (player) {
        player.hand.splice(pending.originalIndex, 0, pending.card);
      }
    }
  }

  private render(): void {
    if (this.gameOver) {
      this.renderGameOver();
      return;
    }

    this.container.innerHTML = `
      <div class="game-container">
        <div class="stats-panel" id="statsPanel">
          <div class="latency-indicator" id="latencyIndicator">
            <span class="latency-label">延迟</span>
            <span class="latency-value" id="latencyValue">0ms</span>
          </div>
          <div class="queue-indicator">
            <span class="queue-label">队列</span>
            <span class="queue-value" id="queueValue">0</span>
          </div>
        </div>

        <div class="player-panel ai-panel" id="aiPanel">
          <div class="player-avatar ai-avatar">
            <div class="avatar-circle">AI</div>
          </div>
          <div class="player-info">
            <div class="player-name">AI对手</div>
            <div class="player-status" id="aiStatus">等待中</div>
            <div class="hand-count">手牌: <span id="aiHandCount">0</span></div>
            <div class="hp-bar-container">
              <div class="hp-bar" id="aiHpBar"></div>
              <span class="hp-text" id="aiHpText">30/30</span>
            </div>
          </div>
        </div>

        <div class="turn-indicator" id="turnIndicator">
          <span id="turnText">你的回合</span>
        </div>

        <div class="play-area" id="playArea">
          <div class="play-flash" id="playFlash"></div>
          <div class="last-played" id="lastPlayed"></div>
        </div>

        <div class="player-panel local-panel" id="localPanel">
          <div class="player-avatar local-avatar">
            <div class="avatar-circle local">你</div>
          </div>
          <div class="player-info">
            <div class="player-name">玩家</div>
            <div class="player-status" id="localStatus">准备出牌</div>
            <div class="hand-count">手牌: <span id="localHandCount">0</span></div>
            <div class="hp-bar-container">
              <div class="hp-bar" id="localHpBar"></div>
              <span class="hp-text" id="localHpText">30/30</span>
            </div>
          </div>
        </div>

        <div class="hand-area" id="handArea"></div>
      </div>
    `;

    this.updateUI();
    this.setupDragListeners();
  }

  private renderGameOver(): void {
    const stats = this.stats || { avgLatency: 0, rollbackCount: 0, validPlays: 0, totalPlays: 0 };
    const validRate = stats.totalPlays > 0 ? ((stats.validPlays / stats.totalPlays) * 100).toFixed(1) : '100.0';
    const winnerName = this.winner === this.playerId ? '玩家' : 'AI对手';

    this.container.innerHTML = `
      <div class="game-container">
        <div class="game-over-screen">
          <h1 class="game-over-title">${winnerName} 获胜!</h1>
          <div class="game-over-stats">
            <div class="stat-item">
              <span class="stat-label">平均延迟</span>
              <span class="stat-value">${stats.avgLatency.toFixed(0)}ms</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">回滚次数</span>
              <span class="stat-value">${stats.rollbackCount}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">有效出牌率</span>
              <span class="stat-value">${validRate}%</span>
            </div>
          </div>
          <button class="restart-btn" id="restartBtn">再来一局</button>
        </div>
      </div>
    `;

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        fetch('/api/reset', { method: 'POST' })
          .then(() => {
            this.gameOver = false;
            this.winner = '';
            this.finalStats = null;
            this.pendingPlays.clear();
          });
      });
    }
  }

  private updateUI(): void {
    if (!this.gameState) return;

    const localPlayer = this.gameState.players[this.playerId];
    const aiPlayer = this.gameState.players['ai'];

    if (localPlayer) {
      const localHpBar = document.getElementById('localHpBar');
      const localHpText = document.getElementById('localHpText');
      const localHandCount = document.getElementById('localHandCount');
      if (localHpBar && localHpText && localHandCount) {
        const hpPercent = (localPlayer.hp / localPlayer.maxHp) * 100;
        localHpBar.style.width = `${hpPercent}%`;
        localHpBar.className = `hp-bar ${this.getHpColorClass(hpPercent)}`;
        localHpText.textContent = `${localPlayer.hp}/${localPlayer.maxHp}`;
        localHandCount.textContent = localPlayer.hand.length.toString();
      }
    }

    if (aiPlayer) {
      const aiHpBar = document.getElementById('aiHpBar');
      const aiHpText = document.getElementById('aiHpText');
      const aiHandCount = document.getElementById('aiHandCount');
      const aiStatus = document.getElementById('aiStatus');
      if (aiHpBar && aiHpText && aiHandCount && aiStatus) {
        const hpPercent = (aiPlayer.hp / aiPlayer.maxHp) * 100;
        aiHpBar.style.width = `${hpPercent}%`;
        aiHpBar.className = `hp-bar ${this.getHpColorClass(hpPercent)}`;
        aiHpText.textContent = `${aiPlayer.hp}/${aiPlayer.maxHp}`;
        aiHandCount.textContent = aiPlayer.hand.length.toString();
        aiStatus.textContent = this.gameState.currentPlayerId === 'ai' ? '思考中...' : '等待中';
      }
    }

    const turnText = document.getElementById('turnText');
    if (turnText) {
      turnText.textContent = this.gameState.currentPlayerId === this.playerId ? '你的回合' : 'AI回合';
    }

    this.renderHand();
    this.updateStatsPanel();
    this.updateLastPlayed();
  }

  private getHpColorClass(percent: number): string {
    if (percent > 50) return 'hp-green';
    if (percent > 25) return 'hp-orange';
    return 'hp-red';
  }

  private updateStatsPanel(): void {
    if (!this.stats) return;

    const latencyValue = document.getElementById('latencyValue');
    const queueValue = document.getElementById('queueValue');
    const latencyIndicator = document.getElementById('latencyIndicator');

    if (latencyValue && queueValue && latencyIndicator) {
      latencyValue.textContent = `${this.stats.currentLatency}ms`;
      queueValue.textContent = this.stats.queueSize.toString();
      
      latencyIndicator.classList.remove('latency-green', 'latency-yellow', 'latency-red');
      if (this.stats.currentLatency < 100) {
        latencyIndicator.classList.add('latency-green');
      } else if (this.stats.currentLatency <= 200) {
        latencyIndicator.classList.add('latency-yellow');
      } else {
        latencyIndicator.classList.add('latency-red');
      }
    }
  }

  private updateLastPlayed(): void {
    if (!this.gameState || !this.gameState.lastPlayedCard) return;
    
    const lastPlayedEl = document.getElementById('lastPlayed');
    if (lastPlayedEl) {
      const card = this.gameState.lastPlayedCard;
      const typeLabel = card.type === 'attack' ? '攻击' : card.type === 'defense' ? '防御' : '技能';
      lastPlayedEl.innerHTML = `
        <div class="played-card">
          <div class="played-card-name">${card.name}</div>
          <div class="played-card-type">${typeLabel}</div>
          <div class="played-card-attack">${card.attack}</div>
        </div>
      `;
    }
  }

  private renderHand(): void {
    const handArea = document.getElementById('handArea');
    if (!handArea || !this.gameState) return;

    const player = this.gameState.players[this.playerId];
    if (!player) return;

    handArea.innerHTML = '';

    player.hand.forEach((card, index) => {
      const cardEl = this.createCardElement(card, index);
      handArea.appendChild(cardEl);
    });
  }

  private createCardElement(card: Card, index: number): HTMLElement {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.dataset.cardId = card.id;
    cardEl.dataset.index = index.toString();
    cardEl.draggable = false;

    const typeLabel = card.type === 'attack' ? '攻击' : card.type === 'defense' ? '防御' : '技能';
    cardEl.innerHTML = `
      <div class="card-inner">
        <div class="card-name">${card.name}</div>
        <div class="card-type">${typeLabel}</div>
        <div class="card-attack">⚔ ${card.attack}</div>
      </div>
    `;

    return cardEl;
  }

  private setupDragListeners(): void {
    const handArea = document.getElementById('handArea');
    if (!handArea) return;

    handArea.querySelectorAll('.card').forEach((cardEl) => {
      cardEl.addEventListener('mousedown', (e) => this.onDragStart(e, cardEl as HTMLElement));
    });

    document.addEventListener('mousemove', (e) => this.onDragMove(e));
    document.addEventListener('mouseup', (e) => this.onDragEnd(e));
  }

  private onDragStart(e: MouseEvent, cardEl: HTMLElement): void {
    if (!this.gameState || this.gameState.currentPlayerId !== this.playerId) return;
    if (this.gameOver) return;

    e.preventDefault();
    const cardId = cardEl.dataset.cardId;
    const index = parseInt(cardEl.dataset.index || '-1', 10);

    const player = this.gameState.players[this.playerId];
    if (!player) return;

    const card = player.hand.find(c => c.id === cardId);
    if (!card) return;

    this.dragState = {
      card,
      element: cardEl,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: 0,
      offsetY: 0,
      originalIndex: index
    };

    const rect = cardEl.getBoundingClientRect();
    this.dragState.offsetX = e.clientX - rect.left;
    this.dragState.offsetY = e.clientY - rect.top;

    cardEl.classList.add('dragging');
    cardEl.style.position = 'fixed';
    cardEl.style.zIndex = '1000';
    this.updateDragPosition(e.clientX, e.clientY);
  }

  private onDragMove(e: MouseEvent): void {
    if (!this.dragState.element || !this.dragState.card) return;
    this.updateDragPosition(e.clientX, e.clientY);
  }

  private updateDragPosition(x: number, y: number): void {
    if (!this.dragState.element) return;
    this.dragState.element.style.left = `${x - this.dragState.offsetX}px`;
    this.dragState.element.style.top = `${y - this.dragState.offsetY}px`;
  }

  private onDragEnd(e: MouseEvent): void {
    if (!this.dragState.element || !this.dragState.card) return;

    const playArea = document.getElementById('playArea');
    if (!playArea) {
      this.resetDrag();
      return;
    }

    const playRect = playArea.getBoundingClientRect();
    const isInPlayArea = (
      e.clientX >= playRect.left &&
      e.clientX <= playRect.right &&
      e.clientY >= playRect.top &&
      e.clientY <= playRect.bottom
    );

    if (isInPlayArea) {
      this.playCard(this.dragState.card, this.dragState.originalIndex, this.dragState.element);
    } else {
      this.resetDrag();
    }

    this.dragState = { card: null, element: null, startX: 0, startY: 0, offsetX: 0, offsetY: 0, originalIndex: -1 };
  }

  private resetDrag(): void {
    if (!this.dragState.element) return;
    this.dragState.element.classList.remove('dragging');
    this.dragState.element.style.position = '';
    this.dragState.element.style.left = '';
    this.dragState.element.style.top = '';
    this.dragState.element.style.zIndex = '';
  }

  private playCard(card: Card, originalIndex: number, cardEl: HTMLElement): void {
    if (!this.gameState) return;

    const sequence = this.network.sendPlayCard(this.playerId, card.id, originalIndex);
    if (sequence === null) {
      this.resetDrag();
      return;
    }

    this.pendingPlays.set(sequence, {
      sequence,
      card,
      originalIndex,
      cardElement: cardEl
    });

    const flash = document.getElementById('playFlash');
    if (flash) {
      flash.classList.add('play');
      setTimeout(() => flash.classList.remove('play'), 150);
    }

    const player = this.gameState.players[this.playerId];
    if (player) {
      player.hand.splice(originalIndex, 1);
    }

    this.animateCardToPlayArea(cardEl, () => {
      cardEl.remove();
    });

    this.render();
  }

  private animateCardToPlayArea(cardEl: HTMLElement, onComplete: () => void): void {
    const playArea = document.getElementById('playArea');
    if (!playArea) {
      onComplete();
      return;
    }

    const playRect = playArea.getBoundingClientRect();
    const targetX = playRect.left + playRect.width / 2 - 30;
    const targetY = playRect.top + playRect.height / 2 - 45;

    cardEl.style.transition = 'left 0.2s ease-out, top 0.2s ease-out, transform 0.2s ease-out, opacity 0.2s ease-out';
    cardEl.style.left = `${targetX}px`;
    cardEl.style.top = `${targetY}px`;
    cardEl.style.transform = 'scale(0.8)';
    cardEl.style.opacity = '0.6';

    setTimeout(() => {
      onComplete();
    }, 200);
  }

  private animateAIPlay(card: Card): void {
    const aiPanel = document.getElementById('aiPanel');
    const playArea = document.getElementById('playArea');
    if (!aiPanel || !playArea || this.gameOver) return;

    const aiCardEl = document.createElement('div');
    aiCardEl.className = 'card ai-card';
    const typeLabel = card.type === 'attack' ? '攻击' : card.type === 'defense' ? '防御' : '技能';
    aiCardEl.innerHTML = `
      <div class="card-inner">
        <div class="card-name">${card.name}</div>
        <div class="card-type">${typeLabel}</div>
        <div class="card-attack">⚔ ${card.attack}</div>
      </div>
    `;

    const aiRect = aiPanel.getBoundingClientRect();
    const playRect = playArea.getBoundingClientRect();

    aiCardEl.style.position = 'fixed';
    aiCardEl.style.left = `${aiRect.left + aiRect.width / 2 - 30}px`;
    aiCardEl.style.top = `${aiRect.top + 60}px`;
    aiCardEl.style.zIndex = '1000';
    aiCardEl.style.opacity = '0';
    aiCardEl.style.transform = 'scale(0.5)';

    document.body.appendChild(aiCardEl);

    requestAnimationFrame(() => {
      aiCardEl.style.transition = 'all 0.2s ease-out';
      aiCardEl.style.opacity = '1';
      aiCardEl.style.transform = 'scale(1)';
      aiCardEl.style.left = `${playRect.left + playRect.width / 2 - 30}px`;
      aiCardEl.style.top = `${playRect.top + playRect.height / 2 - 45}px`;
    });

    const flash = document.getElementById('playFlash');
    if (flash) {
      flash.classList.add('play');
      setTimeout(() => flash.classList.remove('play'), 150);
    }

    setTimeout(() => {
      aiCardEl.style.transition = 'opacity 0.3s ease-out';
      aiCardEl.style.opacity = '0';
      setTimeout(() => aiCardEl.remove(), 300);
    }, 800);
  }
}

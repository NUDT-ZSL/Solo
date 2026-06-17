import { NetworkClient, Card, GameState, GameAction, NetworkStats } from './network';
import { AIPlayer } from './aiPlayer';

interface FlyingCard {
  element: HTMLElement;
  card: Card;
  sequence: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number;
  isRollback: boolean;
}

const PLAYER_ID = 'player_local';
const AI_ID = 'player_ai';

class CardGame {
  private network: NetworkClient;
  private aiPlayer: AIPlayer;
  private gameState: GameState | null = null;

  private playerHandEl: HTMLElement;
  private aiHandEl: HTMLElement;
  private playZoneEl: HTMLElement;
  private turnIndicatorEl: HTMLElement;
  private latencyValueEl: HTMLElement;
  private queueCountEl: HTMLElement;
  private gameStatusEl: HTMLElement;
  private playerHpBarEl: HTMLElement;
  private playerHpTextEl: HTMLElement;
  private playerHandCountEl: HTMLElement;
  private aiHpBarEl: HTMLElement;
  private aiHpTextEl: HTMLElement;
  private aiHandCountEl: HTMLElement;
  private aiStatusEl: HTMLElement;
  private discardPileEl: HTMLElement;
  private statsPanelEl: HTMLElement;
  private restartBtnEl: HTMLElement;

  private pendingActions: Map<number, { card: Card; element: HTMLElement; originalIndex: number }> = new Map();
  private flyingCards: FlyingCard[] = [];
  private cardElements: Map<string, HTMLElement> = new Map();

  private draggedCard: { card: Card; element: HTMLElement; offsetX: number; offsetY: number } | null = null;
  private dragGhost: HTMLElement | null = null;

  private stats: NetworkStats = { avgLatency: 0, rollbackCount: 0, validActions: 0, totalActions: 0 };

  constructor() {
    this.network = new NetworkClient(PLAYER_ID);
    this.aiPlayer = new AIPlayer(AI_ID);

    this.playerHandEl = document.getElementById('player-hand')!;
    this.aiHandEl = document.getElementById('ai-hand')!;
    this.playZoneEl = document.getElementById('play-zone')!;
    this.turnIndicatorEl = document.getElementById('turn-indicator')!;
    this.latencyValueEl = document.getElementById('latency-value')!;
    this.queueCountEl = document.getElementById('queue-count')!;
    this.gameStatusEl = document.getElementById('game-status')!;
    this.playerHpBarEl = document.getElementById('player-hp-bar')!;
    this.playerHpTextEl = document.getElementById('player-hp-text')!;
    this.playerHandCountEl = document.getElementById('player-hand-count')!;
    this.aiHpBarEl = document.getElementById('ai-hp-bar')!;
    this.aiHpTextEl = document.getElementById('ai-hp-text')!;
    this.aiHandCountEl = document.getElementById('ai-hand-count')!;
    this.aiStatusEl = document.getElementById('ai-status')!;
    this.discardPileEl = document.getElementById('discard-pile')!;
    this.statsPanelEl = document.getElementById('stats-panel')!;
    this.restartBtnEl = document.getElementById('restart-btn')!;
  }

  async init(): Promise<void> {
    this.aiPlayer.setCallback((cardId) => {
      this.handleAIPlayCard(cardId);
    });

    this.network.setCallbacks(
      (action) => this.handleActionAck(action),
      (state) => this.handleStateSync(state),
      (sequence) => this.handleRollback(sequence),
      (winner) => this.handleGameOver(winner),
      () => this.handleConnect()
    );

    this.restartBtnEl.addEventListener('click', () => {
      location.reload();
    });

    this.setupDropZone();
    this.animate();

    try {
      const wsUrl = `ws://${window.location.hostname}:3001`;
      await this.network.connect(wsUrl);
    } catch (e) {
      this.gameStatusEl.textContent = '连接失败，请刷新重试';
      this.gameStatusEl.style.color = '#ef5350';
      console.error(e);
    }

    this.updateStatsDisplay();
    setInterval(() => this.updateStatsDisplay(), 200);
  }

  private handleConnect(): void {
    this.gameStatusEl.textContent = '已连接';
    this.gameStatusEl.style.color = '#66bb6a';
  }

  private handleStateSync(state: GameState): void {
    const prevState = this.gameState;
    this.gameState = state;

    this.aiPlayer.updateState(state);
    this.updateUI();

    if (prevState && state.players[AI_ID] && prevState.players[AI_ID]) {
      const prevHand = prevState.players[AI_ID].hand;
      const currHand = state.players[AI_ID].hand;
      if (currHand.length < prevHand.length && state.discardPile.length > (prevState.discardPile.length)) {
        this.playZoneEl.classList.add('flash-blue');
        setTimeout(() => this.playZoneEl.classList.remove('flash-blue'), 150);
      }
    }
  }

  private handleActionAck(action: GameAction): void {
    const pending = this.pendingActions.get(action.sequence);
    if (pending) {
      this.pendingActions.delete(action.sequence);
    }
  }

  private handleRollback(sequence: number): void {
    const pending = this.pendingActions.get(sequence);
    if (pending) {
      this.rollbackCard(pending.card, pending.element, pending.originalIndex);
      this.pendingActions.delete(sequence);
    }

    this.playZoneEl.classList.add('flash-red');
    setTimeout(() => this.playZoneEl.classList.remove('flash-red'), 300);
  }

  private handleGameOver(winner: string): void {
    const resultEl = document.getElementById('game-result')!;
    resultEl.textContent = winner === PLAYER_ID ? '🎉 你赢了！' : '😢 你输了';
    resultEl.style.color = winner === PLAYER_ID ? '#66bb6a' : '#ef5350';

    const finalStats = this.network.getStats();
    document.getElementById('avg-latency')!.textContent = `${finalStats.avgLatency}ms`;
    document.getElementById('rollback-count')!.textContent = finalStats.rollbackCount.toString();
    const validRate = finalStats.totalActions > 0
      ? Math.round((finalStats.validActions / finalStats.totalActions) * 100)
      : 0;
    document.getElementById('valid-rate')!.textContent = `${validRate}%`;

    this.statsPanelEl.style.display = 'block';
  }

  private handleAIPlayCard(cardId: string): void {
    if (!this.gameState) return;
    if (this.gameState.currentTurn !== AI_ID) return;

    const action = this.network.sendAction({
      type: 'PLAY_CARD',
      playerId: AI_ID,
      cardId,
    });

    if (action) {
      this.animateAICardPlay(cardId);
    }
  }

  private setupDropZone(): void {
    this.playZoneEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.playZoneEl.classList.add('drag-over');
    });

    this.playZoneEl.addEventListener('dragleave', () => {
      this.playZoneEl.classList.remove('drag-over');
    });

    this.playZoneEl.addEventListener('drop', (e) => {
      e.preventDefault();
      this.playZoneEl.classList.remove('drag-over');
      if (this.draggedCard) {
        this.playCard(this.draggedCard.card, this.draggedCard.element);
      }
      this.endDrag();
    });
  }

  private updateUI(): void {
    if (!this.gameState) return;

    const playerState = this.gameState.players[PLAYER_ID];
    const aiState = this.gameState.players[AI_ID];

    if (playerState) {
      this.renderPlayerHand(playerState.hand);
      this.updateHpBar(this.playerHpBarEl, this.playerHpTextEl, playerState.hp, playerState.maxHp);
      this.playerHandCountEl.textContent = playerState.hand.length.toString();
    }

    if (aiState) {
      this.renderAIHand(aiState.hand.length);
      this.updateHpBar(this.aiHpBarEl, this.aiHpTextEl, aiState.hp, aiState.maxHp);
      this.aiHandCountEl.textContent = aiState.hand.length.toString();
    }

    this.turnIndicatorEl.textContent = this.gameState.currentTurn === PLAYER_ID
      ? '轮到你出牌'
      : 'AI 思考中...';
    this.turnIndicatorEl.style.background = this.gameState.currentTurn === PLAYER_ID
      ? 'rgba(102, 187, 106, 0.2)'
      : 'rgba(255, 167, 38, 0.2)';
    this.turnIndicatorEl.style.borderColor = this.gameState.currentTurn === PLAYER_ID
      ? 'rgba(102, 187, 106, 0.5)'
      : 'rgba(255, 167, 38, 0.5)';

    this.discardPileEl.innerHTML = `弃牌<br/>${this.gameState.discardPile.length}`;
    this.aiStatusEl.textContent = this.aiPlayer.getIsThinking() ? '思考中...' : '在线';
  }

  private updateHpBar(barEl: HTMLElement, textEl: HTMLElement, hp: number, maxHp: number): void {
    const percent = Math.max(0, (hp / maxHp) * 100);
    barEl.style.width = `${percent}%`;

    if (percent > 50) {
      barEl.style.background = '#66bb6a';
    } else if (percent > 25) {
      barEl.style.background = '#ffa726';
    } else {
      barEl.style.background = '#ef5350';
    }

    textEl.textContent = `${hp} / ${maxHp}`;
  }

  private renderPlayerHand(hand: Card[]): void {
    const existingIds = new Set<string>();
    this.cardElements.forEach((el, id) => {
      const inPending = Array.from(this.pendingActions.values()).some(p => p.card.id === id);
      const inHand = hand.some(c => c.id === id);
      if (!inHand && !inPending && el.parentNode) {
        el.parentNode.removeChild(el);
        this.cardElements.delete(id);
      } else if (inHand || inPending) {
        existingIds.add(id);
      }
    });

    hand.forEach((card, index) => {
      if (!this.cardElements.has(card.id)) {
        const el = this.createCardElement(card, false);
        this.playerHandEl.appendChild(el);
        this.cardElements.set(card.id, el);
        this.setupCardDrag(card, el);
      }
    });
  }

  private renderAIHand(count: number): void {
    this.aiHandEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'card face-down';
      this.aiHandEl.appendChild(el);
    }
  }

  private createCardElement(card: Card, faceDown: boolean): HTMLElement {
    const el = document.createElement('div');
    el.className = 'card' + (faceDown ? ' face-down' : '');
    el.dataset.cardId = card.id;
    if (!faceDown) {
      el.textContent = `${card.name}\n${card.attack}`;
      el.style.whiteSpace = 'pre-line';
      el.style.textAlign = 'center';
      el.style.lineHeight = '1.2';
    }
    el.draggable = false;
    return el;
  }

  private setupCardDrag(card: Card, el: HTMLElement): void {
    el.addEventListener('mousedown', (e) => {
      if (!this.gameState || this.gameState.currentTurn !== PLAYER_ID) return;
      if (this.pendingActions.size > 0) return;

      const rect = el.getBoundingClientRect();
      this.draggedCard = {
        card,
        element: el,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      };

      this.dragGhost = el.cloneNode(true) as HTMLElement;
      this.dragGhost.style.position = 'fixed';
      this.dragGhost.style.left = `${rect.left}px`;
      this.dragGhost.style.top = `${rect.top}px`;
      this.dragGhost.style.zIndex = '1000';
      this.dragGhost.style.pointerEvents = 'none';
      this.dragGhost.classList.add('dragging');
      document.body.appendChild(this.dragGhost);

      el.style.opacity = '0.3';

      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
    });
  }

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.draggedCard || !this.dragGhost) return;
    this.dragGhost.style.left = `${e.clientX - this.draggedCard.offsetX}px`;
    this.dragGhost.style.top = `${e.clientY - this.draggedCard.offsetY}px`;
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (!this.draggedCard) return;

    const playZoneRect = this.playZoneEl.getBoundingClientRect();
    const isInPlayZone = e.clientX >= playZoneRect.left &&
      e.clientX <= playZoneRect.right &&
      e.clientY >= playZoneRect.top &&
      e.clientY <= playZoneRect.bottom;

    if (isInPlayZone) {
      this.playCard(this.draggedCard.card, this.draggedCard.element);
    }

    this.endDrag();
  };

  private endDrag(): void {
    if (this.dragGhost && this.dragGhost.parentNode) {
      this.dragGhost.parentNode.removeChild(this.dragGhost);
    }
    this.dragGhost = null;

    if (this.draggedCard) {
      this.draggedCard.element.style.opacity = '1';
    }
    this.draggedCard = null;

    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    this.playZoneEl.classList.remove('drag-over');
  }

  private playCard(card: Card, element: HTMLElement): void {
    if (!this.gameState || this.gameState.currentTurn !== PLAYER_ID) {
      this.shakeElement(element);
      return;
    }

    const action = this.network.sendAction({
      type: 'PLAY_CARD',
      playerId: PLAYER_ID,
      cardId: card.id,
    });

    if (!action) {
      this.shakeElement(element);
      return;
    }

    const originalIndex = Array.from(this.playerHandEl.children).indexOf(element);
    this.pendingActions.set(action.sequence, { card, element, originalIndex });

    this.animateCardToPlayZone(card, element, action.sequence);

    this.playZoneEl.classList.add('flash-blue');
    setTimeout(() => this.playZoneEl.classList.remove('flash-blue'), 150);
  }

  private shakeElement(el: HTMLElement): void {
    const originalTransform = el.style.transform;
    el.style.transform = 'translateX(0)';
    el.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(-3px)' },
      { transform: 'translateX(0)' },
    ], {
      duration: 250,
      easing: 'ease-out',
    });
  }

  private animateCardToPlayZone(card: Card, element: HTMLElement, sequence: number): void {
    const cardRect = element.getBoundingClientRect();
    const playZoneRect = this.playZoneEl.getBoundingClientRect();
    const containerRect = document.getElementById('game-container')!.getBoundingClientRect();

    const fromX = cardRect.left - containerRect.left;
    const fromY = cardRect.top - containerRect.top;
    const toX = playZoneRect.left - containerRect.left + playZoneRect.width / 2 - 30;
    const toY = playZoneRect.top - containerRect.top + playZoneRect.height / 2 - 45;

    const flyingEl = element.cloneNode(true) as HTMLElement;
    flyingEl.style.position = 'absolute';
    flyingEl.style.left = `${fromX}px`;
    flyingEl.style.top = `${fromY}px`;
    flyingEl.style.margin = '0';
    flyingEl.style.opacity = '0';
    flyingEl.classList.add('flying');
    flyingEl.style.zIndex = '50';
    document.getElementById('game-container')!.appendChild(flyingEl);

    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }

    this.flyingCards.push({
      element: flyingEl,
      card,
      sequence,
      fromX,
      fromY,
      toX,
      toY,
      startTime: performance.now(),
      duration: 200,
      isRollback: false,
    });
  }

  private animateAICardPlay(cardId: string): void {
    const containerRect = document.getElementById('game-container')!.getBoundingClientRect();
    const aiCards = this.aiHandEl.children;
    if (aiCards.length === 0) return;

    const sourceEl = aiCards[Math.floor(Math.random() * aiCards.length)] as HTMLElement;
    const sourceRect = sourceEl.getBoundingClientRect();
    const playZoneRect = this.playZoneEl.getBoundingClientRect();

    const fromX = sourceRect.left - containerRect.left;
    const fromY = sourceRect.top - containerRect.top;
    const toX = playZoneRect.left - containerRect.left + playZoneRect.width / 2 - 30;
    const toY = playZoneRect.top - containerRect.top + playZoneRect.height / 2 - 45;

    const fakeCard: Card = { id: cardId, name: 'AI', attack: 0, cost: 0 };
    const flyingEl = this.createCardElement(fakeCard, false);
    flyingEl.style.position = 'absolute';
    flyingEl.style.left = `${fromX}px`;
    flyingEl.style.top = `${fromY}px`;
    flyingEl.style.margin = '0';
    flyingEl.classList.add('flying');
    flyingEl.style.zIndex = '50';
    document.getElementById('game-container')!.appendChild(flyingEl);

    this.flyingCards.push({
      element: flyingEl,
      card: fakeCard,
      sequence: -1,
      fromX,
      fromY,
      toX,
      toY,
      startTime: performance.now(),
      duration: 200,
      isRollback: false,
    });
  }

  private rollbackCard(card: Card, _element: HTMLElement, originalIndex: number): void {
    const container = document.getElementById('game-container')!;
    const containerRect = container.getBoundingClientRect();

    const flyingCard = this.flyingCards.find(f => f.sequence > 0 && f.card.id === card.id);

    const playZoneRect = this.playZoneEl.getBoundingClientRect();
    const fromX = playZoneRect.left - containerRect.left + playZoneRect.width / 2 - 30;
    const fromY = playZoneRect.top - containerRect.top + playZoneRect.height / 2 - 45;

    const newEl = this.createCardElement(card, false);
    newEl.style.position = 'absolute';
    newEl.style.left = `${fromX}px`;
    newEl.style.top = `${fromY}px`;
    newEl.style.margin = '0';
    newEl.style.opacity = '0';
    newEl.classList.add('flying');
    container.appendChild(newEl);

    const handRect = this.playerHandEl.getBoundingClientRect();
    const cardWidth = 70;
    const toX = handRect.left - containerRect.left + originalIndex * cardWidth + 5;
    const toY = handRect.top - containerRect.top;

    if (flyingCard && flyingCard.element.parentNode) {
      flyingCard.element.parentNode.removeChild(flyingCard.element);
    }
    this.flyingCards = this.flyingCards.filter(f => f.card.id !== card.id);

    this.flyingCards.push({
      element: newEl,
      card,
      sequence: -2,
      fromX,
      fromY,
      toX,
      toY,
      startTime: performance.now(),
      duration: 400,
      isRollback: true,
    });

    setTimeout(() => {
      if (newEl.parentNode) {
        newEl.parentNode.removeChild(newEl);
      }
      if (!this.cardElements.has(card.id)) {
        const finalEl = this.createCardElement(card, false);
        const children = Array.from(this.playerHandEl.children);
        if (originalIndex >= children.length) {
          this.playerHandEl.appendChild(finalEl);
        } else {
          this.playerHandEl.insertBefore(finalEl, children[originalIndex]);
        }
        this.cardElements.set(card.id, finalEl);
        this.setupCardDrag(card, finalEl);
      }
    }, 400);
  }

  private animate(): void {
    const now = performance.now();
    const container = document.getElementById('game-container')!;

    this.flyingCards = this.flyingCards.filter(fc => {
      const elapsed = now - fc.startTime;
      const progress = Math.min(1, elapsed / fc.duration);

      if (fc.isRollback) {
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        fc.element.style.left = `${fc.fromX + (fc.toX - fc.fromX) * easeProgress}px`;
        fc.element.style.top = `${fc.fromY + (fc.toY - fc.fromY) * easeProgress}px`;
        fc.element.style.opacity = `${progress}`;
      } else {
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        fc.element.style.left = `${fc.fromX + (fc.toX - fc.fromX) * easeProgress}px`;
        fc.element.style.top = `${fc.fromY + (fc.toY - fc.fromY) * easeProgress}px`;
        fc.element.style.opacity = '1';
      }

      if (progress >= 1) {
        if (!fc.isRollback && fc.sequence > 0) {
          setTimeout(() => {
            if (fc.element.parentNode) {
              fc.element.style.transition = 'opacity 0.3s';
              fc.element.style.opacity = '0';
              setTimeout(() => {
                if (fc.element.parentNode) {
                  fc.element.parentNode.removeChild(fc.element);
                }
              }, 300);
            }
          }, 500);
        } else if (fc.sequence === -1) {
          if (fc.element.parentNode) {
            setTimeout(() => {
              fc.element.style.transition = 'opacity 0.3s';
              fc.element.style.opacity = '0';
              setTimeout(() => {
                if (fc.element.parentNode) {
                  fc.element.parentNode.removeChild(fc.element);
                }
              }, 300);
            }, 300);
          }
        }
        return fc.isRollback;
      }
      return true;
    });

    requestAnimationFrame(() => this.animate());
  }

  private updateStatsDisplay(): void {
    const latency = this.network.getCurrentLatency();
    this.latencyValueEl.textContent = `${latency}ms`;
    this.latencyValueEl.className = 'latency-value ' + (
      latency < 100 ? 'latency-green' :
      latency < 200 ? 'latency-yellow' : 'latency-red'
    );

    this.queueCountEl.textContent = this.network.getQueueSize().toString();

    this.stats = this.network.getStats();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new CardGame();
  game.init();
});

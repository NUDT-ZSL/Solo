import { NetworkManager, GameState, Card } from './network';

export class AIPlayer {
  private network: NetworkManager;
  private gameState: GameState | null = null;
  private isThinking: boolean = false;
  private aiDelayMin: number = 100;
  private aiDelayMax: number = 300;

  constructor(network: NetworkManager) {
    this.network = network;
    this.setupNetworkCallbacks();
  }

  private setupNetworkCallbacks() {
    this.network.setOnGameStart((state) => {
      this.gameState = state;
      this.isThinking = false;
    });

    this.network.setOnStateUpdate((state) => {
      this.gameState = state;
      
      if (state.currentTurn === 'ai' && !state.isGameOver && !this.isThinking) {
        this.thinkAndPlay();
      }
    });
  }

  private thinkAndPlay() {
    if (!this.gameState || this.gameState.isGameOver) return;
    if (this.gameState.currentTurn !== 'ai') return;

    this.isThinking = true;

    const delay = this.aiDelayMin + Math.random() * (this.aiDelayMax - this.aiDelayMin);

    setTimeout(() => {
      if (!this.gameState || this.gameState.isGameOver) {
        this.isThinking = false;
        return;
      }

      const bestCard = this.chooseBestCard();
      if (bestCard) {
        this.simulateAiPlay(bestCard);
      }

      this.isThinking = false;
    }, delay);
  }

  private chooseBestCard(): Card | null {
    if (!this.gameState) return null;

    const aiHandSize = this.gameState.opponentHandSize;
    if (aiHandSize === 0) return null;

    const dummyCards: Card[] = [];
    const suits = ['♠', '♥', '♦', '♣'];
    for (let i = 0; i < aiHandSize; i++) {
      dummyCards.push({
        id: `ai-dummy-${i}`,
        value: Math.floor(Math.random() * 10) + 1,
        suit: suits[Math.floor(Math.random() * 4)],
        attack: Math.floor(Math.random() * 10) + 1,
      });
    }

    let bestCard = dummyCards[0];
    let bestScore = -Infinity;

    for (const card of dummyCards) {
      let score = card.attack;

      if (this.gameState.yourHealth <= card.attack) {
        score += 100;
      }

      if (this.gameState.opponentHealth < this.gameState.opponentMaxHealth * 0.3) {
        score += card.attack * 0.5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }

    return bestCard;
  }

  private simulateAiPlay(card: Card) {
    console.log('AI 模拟出牌:', card);
  }

  setDelayRange(min: number, max: number) {
    this.aiDelayMin = min;
    this.aiDelayMax = max;
  }

  isAiThinking(): boolean {
    return this.isThinking;
  }
}

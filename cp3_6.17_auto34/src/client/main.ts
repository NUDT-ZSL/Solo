import { Card, GameState, NetworkStats, PlayerAction } from '../types';
import { networkClient } from './network';
import { cardGame } from './cardGame';
import { AIPlayer } from './aiPlayer';

const aiPlayer = new AIPlayer();
let currentGameState: GameState | null = null;
let currentStats: NetworkStats | null = null;
let gameOver = false;

const playerHealthBar = document.getElementById('playerHealth') as HTMLElement;
const aiHealthBar = document.getElementById('aiHealth') as HTMLElement;
const latencyValue = document.getElementById('latencyValue') as HTMLElement;
const queueCount = document.getElementById('queueCount') as HTMLElement;
const playerHandCount = document.getElementById('playerHandCount') as HTMLElement;
const aiHandCount = document.getElementById('aiHandCount') as HTMLElement;
const aiStatus = document.getElementById('aiStatus') as HTMLElement;
const turnIndicator = document.getElementById('turnIndicator') as HTMLElement;
const aiHand = document.getElementById('aiHand') as HTMLElement;
const playArea = document.getElementById('playArea') as HTMLElement;
const statsOverlay = document.getElementById('statsOverlay') as HTMLElement;
const gameResult = document.getElementById('gameResult') as HTMLElement;
const avgLatency = document.getElementById('avgLatency') as HTMLElement;
const rollbackCount = document.getElementById('rollbackCount') as HTMLElement;
const successRate = document.getElementById('successRate') as HTMLElement;
const restartBtn = document.getElementById('restartBtn') as HTMLElement;
const discardCount = document.getElementById('discardCount') as HTMLElement;

const MAX_HEALTH = 100;

function init(): void {
  cardGame.init('handArea');
  
  aiPlayer.init({
    onSimulatedPlay: handleAISimulatedPlay,
    onStatusChange: handleAIStatusChange,
  });

  networkClient.onStateUpdate = handleStateUpdate;
  networkClient.onRollback = handleRollback;
  networkClient.onStatsUpdate = handleStatsUpdate;

  restartBtn.addEventListener('click', handleRestart);

  networkClient.connect('ws://localhost:8080');

  updateUI();
}

function handleStateUpdate(state: GameState): void {
  currentGameState = state;
  
  if (state.playerHealth <= 0 || state.aiHealth <= 0) {
    handleGameOver(state);
    return;
  }

  updateUI();
}

function handleRollback(action: PlayerAction, reason: string): void {
  cardGame.rollbackCard(action);
  playArea.classList.add('flash-red');
  setTimeout(() => playArea.classList.remove('flash-red'), 300);
}

function handleStatsUpdate(stats: NetworkStats): void {
  currentStats = stats;
  updateLatencyDisplay(stats.avgLatency);
  updateQueueDisplay();
}

function handleAISimulatedPlay(card: Card): void {
  if (!currentGameState) return;
  
  const aiCardElements = aiHand.querySelectorAll('.ai-card');
  if (aiCardElements.length > 0) {
    const lastCard = aiCardElements[aiCardElements.length - 1] as HTMLElement;
    lastCard.classList.add('playing');
    setTimeout(() => {
      updateAIHand();
    }, 200);
  }
  
  playArea.classList.add('flash-blue');
  setTimeout(() => playArea.classList.remove('flash-blue'), 150);
}

function handleAIStatusChange(status: string): void {
  aiStatus.textContent = status;
  if (status.includes('思考') || status.includes('出牌')) {
    aiStatus.classList.add('connected');
  } else {
    aiStatus.classList.remove('connected');
  }
}

function handleGameOver(state: GameState): void {
  gameOver = true;
  aiPlayer.stop();
  
  const playerWon = state.aiHealth <= 0;
  gameResult.textContent = playerWon ? '🎉 你赢了！' : '😢 你输了';
  
  if (currentStats) {
    avgLatency.textContent = `${Math.round(currentStats.avgLatency)}ms`;
    rollbackCount.textContent = currentStats.rollbackCount.toString();
    successRate.textContent = `${(currentStats.successRate * 100).toFixed(1)}%`;
  }
  
  statsOverlay.classList.add('show');
}

function handleRestart(): void {
  gameOver = false;
  currentGameState = null;
  currentStats = null;
  
  statsOverlay.classList.remove('show');
  aiPlayer.reset();
  
  networkClient.disconnect();
  networkClient.connect('ws://localhost:8080');
  
  updateUI();
}

function updateUI(): void {
  if (!currentGameState) return;

  updateHealthBar(playerHealthBar, currentGameState.playerHealth);
  updateHealthBar(aiHealthBar, currentGameState.aiHealth);
  
  playerHandCount.textContent = currentGameState.playerHand.length.toString();
  aiHandCount.textContent = currentGameState.aiHand.length.toString();
  
  discardCount.textContent = currentGameState.discardPile.length.toString();
  
  turnIndicator.textContent = currentGameState.currentTurn === 'player' ? '你的回合' : 'AI回合';
  
  updateAIHand();
  
  if (currentStats) {
    updateLatencyDisplay(currentStats.avgLatency);
  }
  updateQueueDisplay();
}

function updateHealthBar(bar: HTMLElement, health: number): void {
  const percentage = Math.max(0, Math.min(100, (health / MAX_HEALTH) * 100));
  bar.style.width = `${percentage}%`;
  
  bar.classList.remove('full', 'half', 'low');
  
  if (percentage > 50) {
    bar.classList.add('full');
  } else if (percentage > 20) {
    bar.classList.add('half');
  } else {
    bar.classList.add('low');
  }
}

function updateLatencyDisplay(latency: number): void {
  latencyValue.textContent = `${Math.round(latency)}ms`;
  
  latencyValue.classList.remove('low', 'medium', 'high');
  
  if (latency < 100) {
    latencyValue.classList.add('low');
  } else if (latency <= 200) {
    latencyValue.classList.add('medium');
  } else {
    latencyValue.classList.add('high');
  }
}

function updateQueueDisplay(): void {
  const size = networkClient['actionQueue']?.length || 0;
  queueCount.textContent = size.toString();
}

function updateAIHand(): void {
  if (!currentGameState) return;
  
  aiHand.innerHTML = '';
  for (let i = 0; i < currentGameState.aiHand.length; i++) {
    const cardElement = document.createElement('div');
    cardElement.className = 'ai-card';
    aiHand.appendChild(cardElement);
  }
}

init();

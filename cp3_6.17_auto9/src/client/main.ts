import { CardGame } from './cardGame';
import { GameStats, PlayerState } from '../shared/types';

const LOCAL_PLAYER_ID = 'player-local';
const AI_PLAYER_ID = 'player-ai';

let game: CardGame;

function getHpColor(hp: number, maxHp: number): string {
  const ratio = hp / maxHp;
  if (ratio > 0.5) return '#66bb6a';
  if (ratio > 0.25) return '#ffa726';
  return '#ef5350';
}

function getLatencyColor(latency: number): string {
  if (latency < 100) return '#66bb6a';
  if (latency <= 200) return '#ffca28';
  return '#ef5350';
}

function updatePlayerPanel(player: PlayerState, isLocal: boolean): void {
  const prefix = isLocal ? 'local' : 'ai';
  const nameEl = document.getElementById(`${prefix}-name`) as HTMLElement;
  const hpBar = document.getElementById(`${prefix}-hp-bar`) as HTMLElement;
  const hpText = document.getElementById(`${prefix}-hp-text`) as HTMLElement;
  const handCount = document.getElementById(`${prefix}-hand-count`) as HTMLElement;

  if (nameEl) nameEl.textContent = player.nickname;
  if (hpBar) {
    hpBar.style.width = `${(player.hp / player.maxHp) * 100}%`;
    hpBar.style.backgroundColor = getHpColor(player.hp, player.maxHp);
  }
  if (hpText) hpText.textContent = `${player.hp} / ${player.maxHp}`;
  if (handCount) handCount.textContent = `手牌: ${player.hand.length}`;
}

function updateStatsPanel(): void {
  if (!game) return;
  const network = game.getNetwork();
  const latency = network.getCurrentLatency();
  const queueSize = network.getQueueSize();
  const rollbacks = network.getRollbackCount();

  const latencyEl = document.getElementById('latency-value') as HTMLElement;
  const queueEl = document.getElementById('queue-value') as HTMLElement;
  const rollbackEl = document.getElementById('rollback-value') as HTMLElement;

  if (latencyEl) {
    latencyEl.textContent = `${latency}ms`;
    latencyEl.style.color = getLatencyColor(latency);
  }
  if (queueEl) queueEl.textContent = String(queueSize);
  if (rollbackEl) rollbackEl.textContent = String(rollbacks);
}

function updateTurnIndicator(): void {
  const state = game.getState();
  if (!state) return;

  const turnEl = document.getElementById('turn-indicator') as HTMLElement;
  if (turnEl) {
    const isLocalTurn = state.currentTurn === LOCAL_PLAYER_ID;
    turnEl.textContent = isLocalTurn ? '轮到你出牌' : 'AI正在思考...';
    turnEl.className = `turn-indicator ${isLocalTurn ? 'local-turn' : 'ai-turn'}`;
  }
}

function showGameOverModal(stats: GameStats, winnerId: string): void {
  const modal = document.getElementById('game-over-modal') as HTMLElement;
  const winnerText = document.getElementById('winner-text') as HTMLElement;
  const avgLatency = document.getElementById('stat-avg-latency') as HTMLElement;
  const rollbackCount = document.getElementById('stat-rollbacks') as HTMLElement;
  const validRate = document.getElementById('stat-valid-rate') as HTMLElement;

  if (winnerText) {
    winnerText.textContent = winnerId === LOCAL_PLAYER_ID ? '🎉 你赢了！' : '💔 AI获胜';
  }
  if (avgLatency) avgLatency.textContent = `${stats.avgLatency}ms`;
  if (rollbackCount) rollbackCount.textContent = String(stats.rollbackCount);
  if (validRate) {
    const rate = stats.totalPlays > 0 ? Math.round((stats.validPlays / stats.totalPlays) * 100) : 0;
    validRate.textContent = `${rate}%`;
  }

  if (modal) modal.style.display = 'flex';
}

function setupUI(): void {
  const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }
}

function gameLoopUI(): void {
  const state = game.getState();
  if (state) {
    const localPlayer = state.players[LOCAL_PLAYER_ID];
    const aiPlayer = state.players[AI_PLAYER_ID];
    if (localPlayer) updatePlayerPanel(localPlayer, true);
    if (aiPlayer) updatePlayerPanel(aiPlayer, false);
    updateTurnIndicator();

    if (state.gameOver && state.winner) {
      // Handled via callback
    }
  }
  updateStatsPanel();
  requestAnimationFrame(gameLoopUI);
}

async function init(): Promise<void> {
  setupUI();

  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas not found');
    return;
  }

  canvas.width = 1280;
  canvas.height = 480;

  game = new CardGame(canvas, LOCAL_PLAYER_ID, AI_PLAYER_ID);

  game.setOnGameOver((stats) => {
    const state = game.getState();
    if (state && state.winner) {
      showGameOverModal(stats, state.winner);
    }
  });

  try {
    await game.connect();
    gameLoopUI();
    const loading = document.getElementById('loading') as HTMLElement;
    if (loading) loading.style.display = 'none';
  } catch (err) {
    console.error('Failed to connect:', err);
    const loading = document.getElementById('loading') as HTMLElement;
    if (loading) {
      loading.textContent = '连接服务器失败，请确保后端已启动 (npm run dev)';
      loading.style.color = '#ef5350';
    }
  }
}

document.addEventListener('DOMContentLoaded', init);

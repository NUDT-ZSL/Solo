import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  PlayerState,
  Player,
  ArrowDirection,
  WSMessage,
  GAME_CONFIG,
} from '../shared/types';
import {
  generateArrow,
  updateArrowPosition,
  isArrowOutOfBounds,
  handleKeyPress,
  calculateDamage,
  determineWinner,
  getDifficultyForTime,
  shouldGenerateArrow,
} from './gameLogic';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

function createInitialPlayerState(player: Player): PlayerState {
  return {
    id: uuidv4(),
    player,
    health: GAME_CONFIG.MAX_HEALTH,
    maxHealth: GAME_CONFIG.MAX_HEALTH,
    combo: 0,
    maxCombo: 0,
    isHit: false,
    isSpecialAttacking: false,
    connected: false,
    ready: false,
  };
}

function createInitialGameState(): GameState {
  return {
    phase: 'waiting',
    player1: createInitialPlayerState('player1'),
    player2: createInitialPlayerState('player2'),
    arrows: [],
    timeRemaining: GAME_CONFIG.GAME_DURATION,
    currentDifficulty: 0,
    winner: null,
    screenShake: false,
    fullscreenFlash: false,
  };
}

let gameState: GameState = createInitialGameState();
let lastUpdateTime = Date.now();
let lastArrowTimeP1 = 0;
let lastArrowTimeP2 = 0;
let gameLoopInterval: NodeJS.Timeout | null = null;
let timerInterval: NodeJS.Timeout | null = null;

function broadcastState() {
  const message: WSMessage = {
    type: 'game_state',
    payload: gameState,
  };
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function startGame() {
  gameState.phase = 'playing';
  gameState.timeRemaining = GAME_CONFIG.GAME_DURATION;
  gameState.arrows = [];
  gameState.currentDifficulty = 0;
  gameState.winner = null;
  gameState.player1 = { ...createInitialPlayerState('player1'), connected: true, ready: true };
  gameState.player2 = { ...createInitialPlayerState('player2'), connected: true, ready: true };
  lastUpdateTime = Date.now();
  lastArrowTimeP1 = Date.now();
  lastArrowTimeP2 = Date.now();

  startGameLoop();
  startTimer();
  broadcastState();
}

function startGameLoop() {
  if (gameLoopInterval) clearInterval(gameLoopInterval);

  gameLoopInterval = setInterval(() => {
    const now = Date.now();
    const deltaTime = (now - lastUpdateTime) / 1000;
    lastUpdateTime = now;

    gameState.currentDifficulty = getDifficultyForTime(gameState.timeRemaining);

    if (shouldGenerateArrow(lastArrowTimeP1, gameState.currentDifficulty, now)) {
      const newArrow = generateArrow('player1', gameState.currentDifficulty);
      gameState.arrows.push(newArrow);
      lastArrowTimeP1 = now;
    }

    if (shouldGenerateArrow(lastArrowTimeP2, gameState.currentDifficulty, now)) {
      const newArrow = generateArrow('player2', gameState.currentDifficulty);
      gameState.arrows.push(newArrow);
      lastArrowTimeP2 = now;
    }

    gameState.arrows = gameState.arrows
      .map((arrow) => updateArrowPosition(arrow, deltaTime))
      .filter((arrow) => !isArrowOutOfBounds(arrow));

    gameState.arrows.forEach((arrow) => {
      if (arrow.missed && !arrow.hit) {
        const defender = arrow.player === 'player1' ? gameState.player1 : gameState.player2;
        defender.health = Math.max(0, defender.health - GAME_CONFIG.MISS_DAMAGE);
        defender.isHit = true;
        defender.combo = 0;
        setTimeout(() => {
          defender.isHit = false;
          broadcastState();
        }, 200);
        arrow.hit = true;
      }
    });

    broadcastState();
  }, 1000 / 60);
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    gameState.timeRemaining--;

    if (gameState.timeRemaining <= 0) {
      endGame();
    }

    broadcastState();
  }, 1000);
}

function endGame() {
  if (gameLoopInterval) {
    clearInterval(gameLoopInterval);
    gameLoopInterval = null;
  }
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  gameState.phase = 'finished';
  gameState.winner = determineWinner(gameState.player1.health, gameState.player2.health);

  broadcastState();

  const gameOverMessage: WSMessage = {
    type: 'game_over',
    payload: {
      winner: gameState.winner,
      player1Health: gameState.player1.health,
      player2Health: gameState.player2.health,
    },
  };
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(gameOverMessage));
    }
  });
}

function processInput(player: Player, direction: ArrowDirection) {
  if (gameState.phase !== 'playing') return;

  const attacker = player === 'player1' ? gameState.player1 : gameState.player2;
  const defender = player === 'player1' ? gameState.player2 : gameState.player1;

  const { hitArrows, result, updatedArrows } = handleKeyPress(
    gameState.arrows,
    player,
    direction
  );

  gameState.arrows = updatedArrows;

  if (result && hitArrows.length > 0) {
    if (result !== 'miss') {
      attacker.combo++;
      attacker.maxCombo = Math.max(attacker.maxCombo, attacker.combo);

      const isSpecial = attacker.combo >= GAME_CONFIG.SPECIAL_COMBO_THRESHOLD;
      const damage = calculateDamage(result, isSpecial);

      defender.health = Math.max(0, defender.health - damage);
      defender.isHit = true;
      defender.combo = 0;

      if (isSpecial) {
        attacker.isSpecialAttacking = true;
        gameState.screenShake = true;
        gameState.fullscreenFlash = true;

        setTimeout(() => {
          attacker.isSpecialAttacking = false;
          gameState.screenShake = false;
          broadcastState();
        }, 500);

        setTimeout(() => {
          gameState.fullscreenFlash = false;
          broadcastState();
        }, 300);
      }

      setTimeout(() => {
        defender.isHit = false;
        broadcastState();
      }, 200);
    } else {
      attacker.combo = 0;
      attacker.health = Math.max(0, attacker.health - GAME_CONFIG.MISS_DAMAGE);
      attacker.isHit = true;
      setTimeout(() => {
        attacker.isHit = false;
        broadcastState();
      }, 200);
    }
  } else if (result === 'miss') {
    attacker.combo = 0;
    attacker.health = Math.max(0, attacker.health - GAME_CONFIG.MISS_DAMAGE);
    attacker.isHit = true;
    setTimeout(() => {
      attacker.isHit = false;
      broadcastState();
    }, 200);
  }

  if (gameState.player1.health <= 0 || gameState.player2.health <= 0) {
    endGame();
  }

  broadcastState();
}

function resetGame() {
  if (gameLoopInterval) {
    clearInterval(gameLoopInterval);
    gameLoopInterval = null;
  }
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  gameState = createInitialGameState();
  gameState.player1.connected = true;
  gameState.player2.connected = true;
  broadcastState();
}

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');

  if (wss.clients.size === 1) {
    gameState.player1.connected = true;
  } else if (wss.clients.size === 2) {
    gameState.player2.connected = true;
  }

  broadcastState();

  ws.on('message', (data: string) => {
    try {
      const message: WSMessage = JSON.parse(data);

      switch (message.type) {
        case 'player_ready':
          const player = message.payload.player as Player;
          if (player === 'player1') {
            gameState.player1.ready = true;
          } else {
            gameState.player2.ready = true;
          }

          if (gameState.player1.ready && gameState.player2.ready) {
            const matchMessage: WSMessage = {
              type: 'match_found',
              payload: {
                player1Ready: true,
                player2Ready: true,
              },
            };
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(matchMessage));
              }
            });
          }
          broadcastState();
          break;

        case 'start_game':
          if (gameState.phase === 'waiting' && gameState.player1.ready && gameState.player2.ready) {
            startGame();
          }
          break;

        case 'input':
          processInput(message.payload.player, message.payload.direction);
          break;

        case 'reset_game':
          resetGame();
          break;
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    gameState.player1.connected = wss.clients.size >= 1;
    gameState.player2.connected = wss.clients.size >= 2;
    broadcastState();
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
  console.log(`WebSocket server running on port ${PORT}`);
});

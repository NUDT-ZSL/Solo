export type PlayerId = 1 | 2;
export type PieceType = 'light' | 'shadow';
export type GameState = 'title' | 'playing' | 'paused' | 'gameover' | 'restart-confirm';

export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  id: number;
  player: PlayerId;
  type: PieceType;
  position: Position;
  alive: boolean;
  targetPosition?: Position;
  revealTimer: number;
  isRevealed: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface StarParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface GameData {
  boardSize: number;
  pieces: Piece[];
  currentPlayer: PlayerId;
  turn: number;
  gameState: GameState;
  winner: PlayerId | null;
  selectedPiece: Piece | null;
  particles: Particle[];
  maxParticles: number;
  stars: StarParticle[];
  trails: Map<number, TrailPoint[]>;
  shadowRevealInterval: number;
  shadowRevealDuration: number;
  shadowRevealTimer: number;
  mousePosition: Position;
  lastMoveTime: number;
  shadowCooldown: Map<PlayerId, number>;
}

export const BOARD_SIZE = 8;
export const CELL_SIZE = 60;
export const SHADOW_REVEAL_INTERVAL = 3000;
export const SHADOW_REVEAL_DURATION = 500;
export const MAX_PARTICLES = 150;
export const SHADOW_COOLDOWN = 5000;

const PIECE_COLORS = {
  1: { light: '#FFD700', shadow: '#1a1a2e' },
  2: { light: '#00FFFF', shadow: '#1a1a2e' }
};

let pieceIdCounter = 0;

function createPiece(player: PlayerId, type: PieceType, x: number, y: number): Piece {
  return {
    id: pieceIdCounter++,
    player,
    type,
    position: { x, y },
    alive: true,
    revealTimer: 0,
    isRevealed: false
  };
}

export function createInitialGameData(): GameData {
  const pieces: Piece[] = [];
  
  for (let i = 0; i < 4; i++) {
    pieces.push(createPiece(1, 'light', i * 2, 0));
    pieces.push(createPiece(1, 'light', i * 2 + 1, 1));
    pieces.push(createPiece(1, 'shadow', i * 2, 7));
    pieces.push(createPiece(1, 'shadow', i * 2 + 1, 6));
  }
  
  for (let i = 0; i < 4; i++) {
    pieces.push(createPiece(2, 'light', i * 2, 7));
    pieces.push(createPiece(2, 'light', i * 2 + 1, 6));
    pieces.push(createPiece(2, 'shadow', i * 2, 0));
    pieces.push(createPiece(2, 'shadow', i * 2 + 1, 1));
  }

  const stars: StarParticle[] = [];
  for (let i = 0; i < 50; i++) {
    stars.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.02 + 0.01,
      brightness: Math.random() * 0.5 + 0.3
    });
  }

  return {
    boardSize: BOARD_SIZE,
    pieces,
    currentPlayer: 1,
    turn: 1,
    gameState: 'title',
    winner: null,
    selectedPiece: null,
    particles: [],
    maxParticles: MAX_PARTICLES,
    stars,
    trails: new Map(),
    shadowRevealInterval: SHADOW_REVEAL_INTERVAL,
    shadowRevealDuration: SHADOW_REVEAL_DURATION,
    shadowRevealTimer: 0,
    mousePosition: { x: 0, y: 0 },
    lastMoveTime: 0,
    shadowCooldown: new Map([[1, 0], [2, 0]])
  };
}

export function isValidPosition(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

export function getPieceAt(gameData: GameData, x: number, y: number): Piece | undefined {
  return gameData.pieces.find(p => p.alive && p.position.x === x && p.position.y === y);
}

export function getLightPieces(gameData: GameData, player: PlayerId): Piece[] {
  return gameData.pieces.filter(p => p.alive && p.type === 'light' && p.player === player);
}

export function getShadowPieces(gameData: GameData, player: PlayerId): Piece[] {
  return gameData.pieces.filter(p => p.alive && p.type === 'shadow' && p.player === player);
}

export function getAlivePieces(gameData: GameData, player: PlayerId): Piece[] {
  return gameData.pieces.filter(p => p.alive && p.player === player);
}

export function canMoveLightPiece(gameData: GameData, piece: Piece, dx: number, dy: number): boolean {
  if (piece.type !== 'light' || !piece.alive) return false;
  
  const newX = piece.position.x + dx;
  const newY = piece.position.y + dy;
  
  if (!isValidPosition(newX, newY)) return false;
  
  const targetPiece = getPieceAt(gameData, newX, newY);
  if (targetPiece && targetPiece.player === piece.player) return false;
  
  return true;
}

export function moveLightPiece(gameData: GameData, piece: Piece, dx: number, dy: number): boolean {
  if (!canMoveLightPiece(gameData, piece, dx, dy)) return false;
  
  const oldX = piece.position.x;
  const oldY = piece.position.y;
  const newX = piece.position.x + dx;
  const newY = piece.position.y + dy;
  
  const trail = gameData.trails.get(piece.id) || [];
  trail.push({ x: oldX, y: oldY, alpha: 1 });
  if (trail.length > 5) trail.shift();
  gameData.trails.set(piece.id, trail);
  
  piece.position.x = newX;
  piece.position.y = newY;
  
  const targetPiece = getPieceAt(gameData, newX, newY);
  if (targetPiece && targetPiece.player !== piece.player) {
    capturePiece(gameData, piece, targetPiece);
  }
  
  return true;
}

export function capturePiece(gameData: GameData, attacker: Piece, target: Piece): void {
  target.alive = false;
  
  const centerX = target.position.x + 0.5;
  const centerY = target.position.y + 0.5;
  
  const color = attacker.player === 1 ? '#FFD700' : '#00FFFF';
  spawnParticles(gameData, centerX, centerY, color, 20);
  
  checkGameOver(gameData);
}

export function spawnParticles(gameData: GameData, x: number, y: number, color: string, count: number): void {
  for (let i = 0; i < count; i++) {
    if (gameData.particles.length >= gameData.maxParticles) {
      gameData.particles.shift();
    }
    
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = Math.random() * 0.1 + 0.05;
    
    gameData.particles.push({
      x: x * CELL_SIZE,
      y: y * CELL_SIZE,
      vx: Math.cos(angle) * speed * CELL_SIZE,
      vy: Math.sin(angle) * speed * CELL_SIZE,
      life: 1,
      maxLife: 1,
      color,
      size: Math.random() * 4 + 2
    });
  }
}

export function spawnShadowFog(gameData: GameData, x: number, y: number): void {
  for (let i = 0; i < 15; i++) {
    if (gameData.particles.length >= gameData.maxParticles) {
      gameData.particles.shift();
    }
    
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 0.03 + 0.02;
    
    gameData.particles.push({
      x: x * CELL_SIZE + CELL_SIZE / 2,
      y: y * CELL_SIZE + CELL_SIZE / 2,
      vx: Math.cos(angle) * speed * CELL_SIZE,
      vy: Math.sin(angle) * speed * CELL_SIZE,
      life: 1.5,
      maxLife: 1.5,
      color: '#1a1a2e',
      size: Math.random() * 8 + 4
    });
  }
}

export function moveShadowPieces(gameData: GameData, player: PlayerId): void {
  const shadows = getShadowPieces(gameData, player);
  const enemyPieces = getAlivePieces(gameData, player === 1 ? 2 : 1);
  
  for (const shadow of shadows) {
    if (!shadow.alive) continue;
    
    let nearestEnemy: Piece | null = null;
    let minDist = Infinity;
    
    for (const enemy of enemyPieces) {
      const dist = Math.abs(shadow.position.x - enemy.position.x) + Math.abs(shadow.position.y - enemy.position.y);
      if (dist < minDist) {
        minDist = dist;
        nearestEnemy = enemy;
      }
    }
    
    if (!nearestEnemy) continue;
    
    let movesLeft = 2;
    let currentX = shadow.position.x;
    let currentY = shadow.position.y;
    
    while (movesLeft > 0) {
      const dx = Math.sign(nearestEnemy.position.x - currentX);
      const dy = Math.sign(nearestEnemy.position.y - currentY);
      
      let moved = false;
      
      if (dx !== 0) {
        const newX = currentX + dx;
        if (isValidPosition(newX, currentY)) {
          const pieceAtTarget = gameData.pieces.find(p => 
            p.alive && p.position.x === newX && p.position.y === currentY && p.id !== shadow.id
          );
          
          if (!pieceAtTarget || pieceAtTarget.player !== player) {
            currentX = newX;
            moved = true;
            
            if (pieceAtTarget && pieceAtTarget.player !== player && pieceAtTarget.type === 'light') {
              pieceAtTarget.alive = false;
              shadow.alive = false;
              spawnShadowFog(gameData, currentX, currentY);
              checkGameOver(gameData);
              break;
            }
          }
        }
      }
      
      if (!moved && dy !== 0) {
        const newY = currentY + dy;
        if (isValidPosition(currentX, newY)) {
          const pieceAtTarget = gameData.pieces.find(p => 
            p.alive && p.position.x === currentX && p.position.y === newY && p.id !== shadow.id
          );
          
          if (!pieceAtTarget || pieceAtTarget.player !== player) {
            currentY = newY;
            moved = true;
            
            if (pieceAtTarget && pieceAtTarget.player !== player && pieceAtTarget.type === 'light') {
              pieceAtTarget.alive = false;
              shadow.alive = false;
              spawnShadowFog(gameData, currentX, currentY);
              checkGameOver(gameData);
              break;
            }
          }
        }
      }
      
      if (!moved) break;
      movesLeft--;
    }
    
    shadow.position.x = currentX;
    shadow.position.y = currentY;
  }
}

export function useShadowAbility(gameData: GameData, player: PlayerId): boolean {
  const cooldown = gameData.shadowCooldown.get(player) || 0;
  if (cooldown > 0) return false;
  
  const shadows = getShadowPieces(gameData, player);
  for (const shadow of shadows) {
    shadow.isRevealed = true;
    shadow.revealTimer = gameData.shadowRevealDuration;
  }
  
  moveShadowPieces(gameData, player);
  gameData.shadowCooldown.set(player, SHADOW_COOLDOWN);
  
  return true;
}

export function endTurn(gameData: GameData): void {
  const nextPlayer = gameData.currentPlayer === 1 ? 2 : 1;
  gameData.currentPlayer = nextPlayer as PlayerId;
  
  if (nextPlayer === 1) {
    gameData.turn++;
  }
  
  gameData.selectedPiece = null;
  
  if (!canPlayerMove(gameData, gameData.currentPlayer)) {
    gameData.gameState = 'gameover';
    gameData.winner = gameData.currentPlayer === 1 ? 2 : 1;
  }
}

export function canPlayerMove(gameData: GameData, player: PlayerId): boolean {
  const lightPieces = getLightPieces(gameData, player);
  
  for (const piece of lightPieces) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (canMoveLightPiece(gameData, piece, dx, dy)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

export function checkGameOver(gameData: GameData): void {
  const player1Lights = getLightPieces(gameData, 1);
  const player2Lights = getLightPieces(gameData, 2);
  
  if (player1Lights.length === 0) {
    gameData.gameState = 'gameover';
    gameData.winner = 2;
  } else if (player2Lights.length === 0) {
    gameData.gameState = 'gameover';
    gameData.winner = 1;
  }
}

export function updateGame(gameData: GameData, deltaTime: number): void {
  if (gameData.gameState !== 'playing') return;
  
  gameData.shadowRevealTimer += deltaTime;
  if (gameData.shadowRevealTimer >= gameData.shadowRevealInterval) {
    gameData.shadowRevealTimer = 0;
    for (const piece of gameData.pieces) {
      if (piece.type === 'shadow' && piece.alive) {
        piece.isRevealed = true;
        piece.revealTimer = gameData.shadowRevealDuration;
      }
    }
  }
  
  for (const piece of gameData.pieces) {
    if (piece.type === 'shadow' && piece.revealTimer > 0) {
      piece.revealTimer -= deltaTime;
      if (piece.revealTimer <= 0) {
        piece.isRevealed = false;
        piece.revealTimer = 0;
      }
    }
  }
  
  for (const [playerId, cooldown] of gameData.shadowCooldown) {
    if (cooldown > 0) {
      gameData.shadowCooldown.set(playerId as PlayerId, Math.max(0, cooldown - deltaTime));
    }
  }
  
  for (let i = gameData.particles.length - 1; i >= 0; i--) {
    const p = gameData.particles[i];
    p.x += p.vx * deltaTime / 16;
    p.y += p.vy * deltaTime / 16;
    p.life -= deltaTime / 1000;
    p.vx *= 0.98;
    p.vy *= 0.98;
    
    if (p.life <= 0) {
      gameData.particles.splice(i, 1);
    }
  }
  
  for (const [, trail] of gameData.trails) {
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].alpha -= deltaTime / 500;
      if (trail[i].alpha <= 0) {
        trail.splice(i, 1);
      }
    }
  }
  
  for (const star of gameData.stars) {
    star.y += star.speed * deltaTime / 16;
    if (star.y > 100) {
      star.y = 0;
      star.x = Math.random() * 100;
    }
  }
}

export function resetGame(gameData: GameData): void {
  pieceIdCounter = 0;
  const newData = createInitialGameData();
  Object.assign(gameData, newData);
  gameData.gameState = 'playing';
}

export function getPieceColor(piece: Piece): string {
  return PIECE_COLORS[piece.player][piece.type];
}

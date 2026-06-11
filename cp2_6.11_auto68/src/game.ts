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
  presetPath: Position[];
  pathIndex: number;
  revealTimer: number;
  isRevealed: boolean;
  revealPulse: number;
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
  active: boolean;
}

export interface StarParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
  twinkle: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
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
  particlePool: Particle[];
  maxParticles: number;
  stars: StarParticle[];
  trails: Map<number, TrailPoint[]>;
  ripples: Ripple[];
  shadowRevealInterval: number;
  shadowRevealDuration: number;
  shadowRevealTimer: number;
  shadowAutoMoveInterval: number;
  shadowAutoMoveTimer: number;
  mousePosition: Position;
  shadowCooldown: Map<PlayerId, number>;
  shadowMoveThisTurn: Map<PlayerId, boolean>;
}

export const BOARD_SIZE = 8;
export const CELL_SIZE = 60;
export const SHADOW_REVEAL_INTERVAL = 3000;
export const SHADOW_REVEAL_DURATION = 500;
export const SHADOW_AUTO_MOVE_INTERVAL = 2000;
export const MAX_PARTICLES = 150;
export const SHADOW_COOLDOWN = 5000;
export const MAX_RIPPLES = 20;

const PIECE_COLORS = {
  1: { light: '#FFD700', shadow: '#2a1a4a' },
  2: { light: '#00FFFF', shadow: '#1a2a4a' }
};

let pieceIdCounter = 0;

function generatePresetPath(player: PlayerId, startX: number, startY: number): Position[] {
  const path: Position[] = [];
  const direction = player === 1 ? -1 : 1;
  
  let x = startX;
  let y = startY;
  
  for (let i = 0; i < 20; i++) {
    const nextY = y + direction;
    if (nextY >= 0 && nextY < BOARD_SIZE) {
      y = nextY;
      path.push({ x, y });
    }
    
    if (i % 3 === 1) {
      const zigzag = i % 6 === 1 ? 1 : -1;
      const nextX = x + zigzag;
      if (nextX >= 0 && nextX < BOARD_SIZE) {
        x = nextX;
        path.push({ x, y });
      }
    }
  }
  
  return path;
}

function createPiece(player: PlayerId, type: PieceType, x: number, y: number): Piece {
  return {
    id: pieceIdCounter++,
    player,
    type,
    position: { x, y },
    alive: true,
    presetPath: type === 'shadow' ? generatePresetPath(player, x, y) : [],
    pathIndex: 0,
    revealTimer: 0,
    isRevealed: false,
    revealPulse: 0
  };
}

function createParticle(): Particle {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 1,
    color: '#FFFFFF',
    size: 2,
    active: false
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
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.02 + 0.005,
      brightness: Math.random() * 0.5 + 0.3,
      twinkle: Math.random() * Math.PI * 2
    });
  }

  const particlePool: Particle[] = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    particlePool.push(createParticle());
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
    particlePool,
    maxParticles: MAX_PARTICLES,
    stars,
    trails: new Map(),
    ripples: [],
    shadowRevealInterval: SHADOW_REVEAL_INTERVAL,
    shadowRevealDuration: SHADOW_REVEAL_DURATION,
    shadowRevealTimer: 0,
    shadowAutoMoveInterval: SHADOW_AUTO_MOVE_INTERVAL,
    shadowAutoMoveTimer: 0,
    mousePosition: { x: -100, y: -100 },
    shadowCooldown: new Map([[1, 0], [2, 0]]),
    shadowMoveThisTurn: new Map([[1, false], [2, false]])
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
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return false;
  if (dx === 0 && dy === 0) return false;
  
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
  for (let i = 0; i < 3; i++) {
    trail.push({ 
      x: oldX + dx * (i / 3), 
      y: oldY + dy * (i / 3), 
      alpha: 1 - i * 0.2 
    });
  }
  while (trail.length > 15) trail.shift();
  gameData.trails.set(piece.id, trail);
  
  piece.position.x = newX;
  piece.position.y = newY;
  
  const targetPiece = getPieceAt(gameData, newX, newY);
  if (targetPiece && targetPiece.player !== piece.player) {
    capturePiece(gameData, piece, targetPiece);
    return true;
  }
  
  return true;
}

export function capturePiece(gameData: GameData, attacker: Piece, target: Piece): void {
  target.alive = false;
  
  const centerX = target.position.x + 0.5;
  const centerY = target.position.y + 0.5;
  
  const color = attacker.player === 1 ? '#FFD700' : '#00FFFF';
  spawnParticles(gameData, centerX, centerY, color, 30);
  addRipple(gameData, centerX, centerY, color);
  
  checkGameOver(gameData);
}

function getParticleFromPool(gameData: GameData): Particle | null {
  for (const p of gameData.particlePool) {
    if (!p.active) {
      return p;
    }
  }
  if (gameData.particles.length > 0) {
    const oldest = gameData.particles.shift();
    if (oldest) {
      oldest.active = false;
      return oldest;
    }
  }
  return null;
}

export function spawnParticles(gameData: GameData, x: number, y: number, color: string, count: number): void {
  for (let i = 0; i < count; i++) {
    const p = getParticleFromPool(gameData);
    if (!p) break;
    
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = (Math.random() * 0.15 + 0.08) * CELL_SIZE;
    
    p.x = x * CELL_SIZE;
    p.y = y * CELL_SIZE;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.life = 1 + Math.random() * 0.5;
    p.maxLife = p.life;
    p.color = color;
    p.size = Math.random() * 5 + 2;
    p.active = true;
    
    gameData.particles.push(p);
  }
}

export function spawnShadowFog(gameData: GameData, x: number, y: number): void {
  for (let i = 0; i < 25; i++) {
    const p = getParticleFromPool(gameData);
    if (!p) break;
    
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 0.05 + 0.02) * CELL_SIZE;
    
    p.x = x * CELL_SIZE + CELL_SIZE / 2;
    p.y = y * CELL_SIZE + CELL_SIZE / 2;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.life = 2 + Math.random();
    p.maxLife = p.life;
    p.color = Math.random() > 0.5 ? '#1a1a2e' : '#2a2a4e';
    p.size = Math.random() * 10 + 5;
    p.active = true;
    
    gameData.particles.push(p);
  }
  
  addRipple(gameData, x + 0.5, y + 0.5, '#3a3a5e');
}

export function addRipple(gameData: GameData, x: number, y: number, color: string): void {
  if (gameData.ripples.length >= MAX_RIPPLES) {
    gameData.ripples.shift();
  }
  
  gameData.ripples.push({
    x: x * CELL_SIZE,
    y: y * CELL_SIZE,
    radius: 5,
    maxRadius: CELL_SIZE * 1.5,
    alpha: 0.8,
    color
  });
}

export function autoMoveShadowPieces(gameData: GameData): void {
  for (const player of [1, 2] as PlayerId[]) {
    const shadows = getShadowPieces(gameData, player);
    const enemyLightPieces = getLightPieces(gameData, player === 1 ? 2 : 1);
    
    for (const shadow of shadows) {
      if (!shadow.alive) continue;
      
      let targetX: number;
      let targetY: number;
      
      if (enemyLightPieces.length > 0) {
        let nearest: Piece | null = null;
        let minDist = Infinity;
        
        for (const enemy of enemyLightPieces) {
          const dist = Math.abs(shadow.position.x - enemy.position.x) + 
                       Math.abs(shadow.position.y - enemy.position.y);
          if (dist < minDist) {
            minDist = dist;
            nearest = enemy;
          }
        }
        
        if (nearest) {
          targetX = nearest.position.x;
          targetY = nearest.position.y;
        } else {
          targetX = shadow.presetPath[shadow.pathIndex]?.x ?? shadow.position.x;
          targetY = shadow.presetPath[shadow.pathIndex]?.y ?? shadow.position.y;
        }
      } else {
        if (shadow.pathIndex < shadow.presetPath.length) {
          targetX = shadow.presetPath[shadow.pathIndex].x;
          targetY = shadow.presetPath[shadow.pathIndex].y;
          shadow.pathIndex++;
        } else {
          continue;
        }
      }
      
      let movesLeft = 2;
      let currentX = shadow.position.x;
      let currentY = shadow.position.y;
      
      while (movesLeft > 0) {
        const dx = Math.sign(targetX - currentX);
        const dy = Math.sign(targetY - currentY);
        
        let moved = false;
        const tryDirections: [number, number][] = [];
        
        if (dx !== 0) tryDirections.push([dx, 0]);
        if (dy !== 0) tryDirections.push([0, dy]);
        if (dx !== 0 && dy !== 0) {
          tryDirections.push([dx, dy]);
        }
        
        for (const [moveDx, moveDy] of tryDirections) {
          const newX = currentX + moveDx;
          const newY = currentY + moveDy;
          
          if (!isValidPosition(newX, newY)) continue;
          
          const pieceAtTarget = gameData.pieces.find(p => 
            p.alive && p.position.x === newX && p.position.y === newY && p.id !== shadow.id
          );
          
          if (pieceAtTarget && pieceAtTarget.player === player) continue;
          
          if (pieceAtTarget && pieceAtTarget.player !== player) {
            if (pieceAtTarget.type === 'light') {
              pieceAtTarget.alive = false;
              shadow.alive = false;
              spawnShadowFog(gameData, newX, newY);
              checkGameOver(gameData);
              currentX = newX;
              currentY = newY;
              moved = true;
              movesLeft = 0;
              break;
            } else {
              continue;
            }
          }
          
          currentX = newX;
          currentY = newY;
          moved = true;
          break;
        }
        
        if (!moved) break;
        movesLeft--;
      }
      
      shadow.position.x = currentX;
      shadow.position.y = currentY;
      
      shadow.isRevealed = true;
      shadow.revealTimer = gameData.shadowRevealDuration;
      shadow.revealPulse = 1;
      addRipple(gameData, currentX + 0.5, currentY + 0.5, '#4a4a6a');
    }
  }
}

export function moveShadowPieces(gameData: GameData, player: PlayerId): void {
  const shadows = getShadowPieces(gameData, player);
  const enemyLightPieces = getLightPieces(gameData, player === 1 ? 2 : 1);
  
  for (const shadow of shadows) {
    if (!shadow.alive) continue;
    
    let targetX: number;
    let targetY: number;
    
    if (enemyLightPieces.length > 0) {
      let nearest: Piece | null = null;
      let minDist = Infinity;
      
      for (const enemy of enemyLightPieces) {
        const dist = Math.abs(shadow.position.x - enemy.position.x) + 
                     Math.abs(shadow.position.y - enemy.position.y);
        if (dist < minDist) {
          minDist = dist;
          nearest = enemy;
        }
      }
      
      if (nearest) {
        targetX = nearest.position.x;
        targetY = nearest.position.y;
      } else {
        continue;
      }
    } else {
      continue;
    }
    
    let movesLeft = 2;
    let currentX = shadow.position.x;
    let currentY = shadow.position.y;
    
    while (movesLeft > 0) {
      const dx = Math.sign(targetX - currentX);
      const dy = Math.sign(targetY - currentY);
      
      let moved = false;
      const tryDirections: [number, number][] = [];
      
      if (dx !== 0) tryDirections.push([dx, 0]);
      if (dy !== 0) tryDirections.push([0, dy]);
      
      for (const [moveDx, moveDy] of tryDirections) {
        const newX = currentX + moveDx;
        const newY = currentY + moveDy;
        
        if (!isValidPosition(newX, newY)) continue;
        
        const pieceAtTarget = gameData.pieces.find(p => 
          p.alive && p.position.x === newX && p.position.y === newY && p.id !== shadow.id
        );
        
        if (pieceAtTarget && pieceAtTarget.player === player) continue;
        
        if (pieceAtTarget && pieceAtTarget.player !== player) {
          if (pieceAtTarget.type === 'light') {
            pieceAtTarget.alive = false;
            shadow.alive = false;
            spawnShadowFog(gameData, newX, newY);
            checkGameOver(gameData);
            currentX = newX;
            currentY = newY;
            moved = true;
            movesLeft = 0;
            break;
          } else {
            continue;
          }
        }
        
        currentX = newX;
        currentY = newY;
        moved = true;
        break;
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
    shadow.revealTimer = gameData.shadowRevealDuration * 2;
    shadow.revealPulse = 1;
    addRipple(gameData, shadow.position.x + 0.5, shadow.position.y + 0.5, 
              player === 1 ? '#FFD700' : '#00FFFF');
  }
  
  moveShadowPieces(gameData, player);
  gameData.shadowCooldown.set(player, SHADOW_COOLDOWN);
  gameData.shadowMoveThisTurn.set(player, true);
  
  return true;
}

export function endTurn(gameData: GameData): void {
  const nextPlayer = gameData.currentPlayer === 1 ? 2 : 1;
  gameData.currentPlayer = nextPlayer as PlayerId;
  
  if (nextPlayer === 1) {
    gameData.turn++;
  }
  
  gameData.selectedPiece = null;
  
  if (!checkGameOver(gameData)) {
    if (!canPlayerMove(gameData, gameData.currentPlayer)) {
      gameData.gameState = 'gameover';
      gameData.winner = gameData.currentPlayer === 1 ? 2 : 1;
    }
  }
}

export function canPlayerMove(gameData: GameData, player: PlayerId): boolean {
  const lightPieces = getLightPieces(gameData, player);
  
  if (lightPieces.length === 0) return false;
  
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

export function checkGameOver(gameData: GameData): boolean {
  const player1Lights = getLightPieces(gameData, 1);
  const player2Lights = getLightPieces(gameData, 2);
  
  if (player1Lights.length === 0) {
    gameData.gameState = 'gameover';
    gameData.winner = 2;
    return true;
  } else if (player2Lights.length === 0) {
    gameData.gameState = 'gameover';
    gameData.winner = 1;
    return true;
  }
  
  return false;
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
        piece.revealPulse = 1;
      }
    }
  }
  
  gameData.shadowAutoMoveTimer += deltaTime;
  if (gameData.shadowAutoMoveTimer >= gameData.shadowAutoMoveInterval) {
    gameData.shadowAutoMoveTimer = 0;
    autoMoveShadowPieces(gameData);
  }
  
  for (const piece of gameData.pieces) {
    if (piece.type === 'shadow') {
      if (piece.revealTimer > 0) {
        piece.revealTimer -= deltaTime;
        piece.revealPulse = Math.min(1, piece.revealPulse - deltaTime / 1000);
        if (piece.revealTimer <= 0) {
          piece.isRevealed = false;
          piece.revealTimer = 0;
        }
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
    if (!p.active) {
      gameData.particles.splice(i, 1);
      continue;
    }
    
    p.x += p.vx * deltaTime / 16;
    p.y += p.vy * deltaTime / 16;
    p.life -= deltaTime / 1000;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.vy += 0.02 * deltaTime / 16;
    
    if (p.life <= 0) {
      p.active = false;
      gameData.particles.splice(i, 1);
    }
  }
  
  for (const [, trail] of gameData.trails) {
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].alpha -= deltaTime / 400;
      if (trail[i].alpha <= 0) {
        trail.splice(i, 1);
      }
    }
  }
  
  for (let i = gameData.ripples.length - 1; i >= 0; i--) {
    const r = gameData.ripples[i];
    r.radius += deltaTime * 0.15;
    r.alpha -= deltaTime / 800;
    
    if (r.alpha <= 0 || r.radius >= r.maxRadius) {
      gameData.ripples.splice(i, 1);
    }
  }
  
  for (const star of gameData.stars) {
    star.y += star.speed * deltaTime / 16;
    star.twinkle += deltaTime * 0.003;
    if (star.y > 100) {
      star.y = 0;
      star.x = Math.random() * 100;
    }
  }
}

export function resetGame(gameData: GameData): void {
  pieceIdCounter = 0;
  
  for (const p of gameData.particles) {
    p.active = false;
  }
  gameData.particles.length = 0;
  gameData.ripples.length = 0;
  gameData.trails.clear();
  
  const newData = createInitialGameData();
  Object.assign(gameData, newData);
  gameData.gameState = 'playing';
}

export function getPieceColor(piece: Piece): string {
  return PIECE_COLORS[piece.player][piece.type];
}

import { GameData, PlayerId, moveLightPiece, useShadowAbility, endTurn, getLightPieces, canMoveLightPiece, isValidPosition } from './game';

export interface KeyState {
  keys: Set<string>;
  justPressed: Set<string>;
}

export function createKeyState(): KeyState {
  return {
    keys: new Set(),
    justPressed: new Set()
  };
}

export function handleKeyDown(keyState: KeyState, key: string): void {
  const lowerKey = key.toLowerCase();
  if (!keyState.keys.has(lowerKey)) {
    keyState.justPressed.add(lowerKey);
  }
  keyState.keys.add(lowerKey);
}

export function handleKeyUp(keyState: KeyState, key: string): void {
  keyState.keys.delete(key.toLowerCase());
}

export function clearJustPressed(keyState: KeyState): void {
  keyState.justPressed.clear();
}

const PLAYER1_KEYS = {
  up: 'w',
  down: 's',
  left: 'a',
  right: 'd',
  ability: ' ',
  select: 'q'
};

const PLAYER2_KEYS = {
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  ability: 'enter',
  select: 'shift'
};

export function handlePlayerInput(
  gameData: GameData,
  keyState: KeyState,
  player: PlayerId
): boolean {
  if (gameData.gameState !== 'playing') return false;
  if (gameData.currentPlayer !== player) return false;
  
  const keys = player === 1 ? PLAYER1_KEYS : PLAYER2_KEYS;
  const lightPieces = getLightPieces(gameData, player);
  
  if (lightPieces.length === 0) return false;
  
  let selectedPiece = gameData.selectedPiece;
  
  if (!selectedPiece || selectedPiece.player !== player || selectedPiece.type !== 'light' || !selectedPiece.alive) {
    selectedPiece = lightPieces[0];
    gameData.selectedPiece = selectedPiece;
  }
  
  if (!selectedPiece || !selectedPiece.alive) return false;
  
  let dx = 0;
  let dy = 0;
  
  if (keyState.justPressed.has(keys.up)) dy = -1;
  else if (keyState.justPressed.has(keys.down)) dy = 1;
  else if (keyState.justPressed.has(keys.left)) dx = -1;
  else if (keyState.justPressed.has(keys.right)) dx = 1;
  
  if (dx !== 0 || dy !== 0) {
    const newX = selectedPiece.position.x + dx;
    const newY = selectedPiece.position.y + dy;
    
    if (!isValidPosition(newX, newY)) {
      return false;
    }
    
    if (!canMoveLightPiece(gameData, selectedPiece, dx, dy)) {
      return false;
    }
    
    if (moveLightPiece(gameData, selectedPiece, dx, dy)) {
      endTurn(gameData);
      return true;
    }
  }
  
  if (keyState.justPressed.has(keys.ability)) {
    if (useShadowAbility(gameData, player)) {
      endTurn(gameData);
      return true;
    }
  }
  
  if (keyState.justPressed.has(keys.select)) {
    const aliveLightPieces = lightPieces.filter(p => p.alive);
    if (aliveLightPieces.length > 1) return false;
    
    const currentIndex = aliveLightPieces.findIndex(p => p.id === selectedPiece?.id);
    const nextIndex = (currentIndex + 1) % aliveLightPieces.length;
    gameData.selectedPiece = aliveLightPieces[nextIndex];
  }
  
  return false;
}

export function handleMouseMove(gameData: GameData, x: number, y: number, boardOffset: { x: number; y: number }, cellSize: number): void {
  if (cellSize > 0) {
    gameData.mousePosition.x = (x - boardOffset.x) / cellSize;
    gameData.mousePosition.y = (y - boardOffset.y) / cellSize;
  }
}

export function handleMouseClick(gameData: GameData, x: number, y: number, boardOffset: { x: number; y: number }, cellSize: number): boolean {
  if (gameData.gameState !== 'playing') return false;
  if (cellSize <= 0) return false;
  
  const gridX = Math.floor((x - boardOffset.x) / cellSize);
  const gridY = Math.floor((y - boardOffset.y) / cellSize);
  
  if (!isValidPosition(gridX, gridY)) {
    return false;
  }
  
  const clickedPiece = gameData.pieces.find(p => 
    p.alive && p.position.x === gridX && p.position.y === gridY
  );
  
  if (clickedPiece) {
    if (clickedPiece.player === gameData.currentPlayer && clickedPiece.type === 'light') {
      gameData.selectedPiece = clickedPiece;
      return true;
    } else if (gameData.selectedPiece && gameData.selectedPiece.type === 'light' && gameData.selectedPiece.player === gameData.currentPlayer) {
      const dx = gridX - gameData.selectedPiece.position.x;
      const dy = gridY - gameData.selectedPiece.position.y;
      
      if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0)) {
        if (!isValidPosition(gridX, gridY)) {
          return false;
        }
        
        if (canMoveLightPiece(gameData, gameData.selectedPiece, dx, dy)) {
          if (moveLightPiece(gameData, gameData.selectedPiece, dx, dy)) {
            endTurn(gameData);
            return true;
          }
        }
      }
    }
  } else if (gameData.selectedPiece && gameData.selectedPiece.type === 'light' && gameData.selectedPiece.player === gameData.currentPlayer) {
    const dx = gridX - gameData.selectedPiece.position.x;
    const dy = gridY - gameData.selectedPiece.position.y;
    
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0)) {
      if (isValidPosition(gridX, gridY) && canMoveLightPiece(gameData, gameData.selectedPiece, dx, dy)) {
        if (moveLightPiece(gameData, gameData.selectedPiece, dx, dy)) {
          endTurn(gameData);
          return true;
        }
      }
    }
  }
  
  return false;
}

import {
  GameState,
  PlayerSide,
  GamePhase,
  CellType,
  FogState,
  Particle,
  ButtonDef,
  AiAction,
  BOARD_SIZE,
  CELL_SIZE,
  CELL_GAP,
  COLORS,
  TURN_TRANSITION_DURATION,
  TURN_TIME_LIMIT,
  MAX_TURNS,
  SUMMON_ANIM_DURATION,
  VINE_ANIM_DURATION,
  SPIRIT_PULSE_PERIOD,
  CAPTURE_DURATION,
  SELECT_HALO_PERIOD,
  MAX_MANA,
  SUMMON_MANA_COST,
  VINE_MANA_COST,
} from './types';
import { getPieceAt, countSpiritNodes, updateFog, updateFogAnimations } from './board';
import { movePiece, summonPiece, castVine, decrementEntangle, getAIAction } from './player';

export function createInitialState(): GameState {
  const board: GameState['board'] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    board[r] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      board[r][c] = {
        type: CellType.EMPTY,
        fogState: FogState.FULL,
        fogAlpha: 1.0,
        owner: null,
        captureProgress: 0,
        pulsePhase: Math.random() * Math.PI * 2,
      };
    }
  }

  const spiritCount = 8 + Math.floor(Math.random() * 3);
  const thornCount = 6 + Math.floor(Math.random() * 4);
  const used = new Set<string>();
  const startZones = new Set(['0,0', '0,1', '1,0', '1,1', '7,7', '7,6', '6,7', '6,6']);

  let placed = 0;
  while (placed < spiritCount) {
    const r = Math.floor(Math.random() * BOARD_SIZE);
    const c = Math.floor(Math.random() * BOARD_SIZE);
    const k = `${r},${c}`;
    if (!used.has(k) && !startZones.has(k)) {
      board[r][c].type = CellType.SPIRIT;
      used.add(k);
      placed++;
    }
  }

  placed = 0;
  while (placed < thornCount) {
    const r = Math.floor(Math.random() * BOARD_SIZE);
    const c = Math.floor(Math.random() * BOARD_SIZE);
    const k = `${r},${c}`;
    if (!used.has(k) && !startZones.has(k)) {
      board[r][c].type = CellType.THORN;
      used.add(k);
      placed++;
    }
  }

  const pieces = [
    { side: PlayerSide.GREEN, row: 0, col: 0, entangled: 0 },
    { side: PlayerSide.GREEN, row: 0, col: 1, entangled: 0 },
    { side: PlayerSide.GREEN, row: 1, col: 0, entangled: 0 },
    { side: PlayerSide.GREEN, row: 1, col: 1, entangled: 0 },
    { side: PlayerSide.AMBER, row: 7, col: 7, entangled: 0 },
    { side: PlayerSide.AMBER, row: 7, col: 6, entangled: 0 },
    { side: PlayerSide.AMBER, row: 6, col: 7, entangled: 0 },
    { side: PlayerSide.AMBER, row: 6, col: 6, entangled: 0 },
  ];

  updateFog(pieces, board, PlayerSide.GREEN);

  return {
    board,
    pieces,
    currentSide: PlayerSide.GREEN,
    turn: 1,
    maxTurns: MAX_TURNS,
    mana: [1, 1],
    scores: [0, 0],
    turnTimer: TURN_TIME_LIMIT,
    turnStartTime: Date.now(),
    selectedPiece: null,
    selectedCell: null,
    phase: GamePhase.TURN_TRANSITION,
    transitionAlpha: 0,
    transitionTimer: TURN_TRANSITION_DURATION,
    particles: [],
    summonAnim: null,
    vineAnim: null,
    aiActionQueue: [],
    aiActionDelay: 0,
    gameOverShown: false,
    winner: null,
    hoveredButton: null,
    buttonClickAnim: null,
    runeAngle: 0,
  };
}

export function updateGameState(state: GameState, dt: number): void {
  state.runeAngle += dt * 0.001;

  updateFogAnimations(state.board, dt);

  // Spirit pulse
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = state.board[r][c];
      if (cell.type === CellType.SPIRIT) {
        cell.pulsePhase += (dt / SPIRIT_PULSE_PERIOD) * Math.PI * 2;
      }
    }
  }

  // Capture progress
  for (const p of state.pieces) {
    const cell = state.board[p.row][p.col];
    if (cell.type === CellType.SPIRIT && cell.owner !== p.side) {
      cell.captureProgress += dt;
      if (cell.captureProgress >= CAPTURE_DURATION) {
        cell.owner = p.side;
        cell.captureProgress = 0;
        state.scores = countSpiritNodes(state.board);
      }
    } else {
      if (cell.type !== CellType.SPIRIT || cell.owner === p.side) {
        // reset if moved away
      }
    }
  }

  // Clear capture progress for cells without a piece
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = state.board[r][c];
      if (cell.type === CellType.SPIRIT) {
        const pieceHere = getPieceAt(state.pieces, r, c);
        if (!pieceHere) {
          cell.captureProgress = 0;
        } else if (pieceHere.side === cell.owner) {
          cell.captureProgress = 0;
        }
      }
    }
  }

  // Particles
  state.particles = state.particles.filter(p => {
    p.x += p.vx * dt * 0.001;
    p.y += p.vy * dt * 0.001;
    p.life -= dt;
    return p.life > 0;
  });

  // Summon animation
  if (state.summonAnim) {
    state.summonAnim.progress += dt;
    if (state.summonAnim.progress >= SUMMON_ANIM_DURATION) {
      state.summonAnim = null;
    }
  }

  // Vine animation
  if (state.vineAnim) {
    state.vineAnim.progress += dt;
    if (state.vineAnim.progress >= VINE_ANIM_DURATION) {
      state.vineAnim = null;
    }
  }

  // Button click animation
  if (state.buttonClickAnim) {
    state.buttonClickAnim.progress += dt;
    if (state.buttonClickAnim.progress >= 100) {
      state.buttonClickAnim = null;
    }
  }

  // Phase handling
  switch (state.phase) {
    case GamePhase.TURN_TRANSITION: {
      state.transitionTimer -= dt;
      const halfDuration = TURN_TRANSITION_DURATION / 2;
      if (state.transitionTimer > halfDuration) {
        state.transitionAlpha = 1 - (state.transitionTimer - halfDuration) / halfDuration;
      } else {
        state.transitionAlpha = state.transitionTimer / halfDuration;
      }
      if (state.transitionTimer <= 0) {
        state.transitionAlpha = 0;
        if (state.currentSide === PlayerSide.GREEN) {
          state.phase = GamePhase.PLAYER_TURN;
        } else {
          state.phase = GamePhase.AI_THINKING;
          state.aiActionQueue = getAIAction(state.board, state.pieces, state.mana[1], state.scores);
          state.aiActionDelay = 500;
        }
        state.turnStartTime = Date.now();
        state.turnTimer = TURN_TIME_LIMIT;
      }
      break;
    }

    case GamePhase.PLAYER_TURN: {
      const elapsed = (Date.now() - state.turnStartTime) / 1000;
      state.turnTimer = Math.max(0, TURN_TIME_LIMIT - elapsed);
      if (state.turnTimer <= 0) {
        endTurn(state);
      }
      break;
    }

    case GamePhase.AI_THINKING: {
      const elapsed = (Date.now() - state.turnStartTime) / 1000;
      state.turnTimer = Math.max(0, TURN_TIME_LIMIT - elapsed);

      state.aiActionDelay -= dt;
      if (state.aiActionDelay <= 0 && state.aiActionQueue.length > 0) {
        const action = state.aiActionQueue.shift()!;
        executeAIAction(state, action);
        state.aiActionDelay = 600;
      }
      if (state.aiActionQueue.length === 0 && state.aiActionDelay <= 0) {
        endTurn(state);
      }
      break;
    }

    case GamePhase.GAME_OVER:
      break;
  }
}

function executeAIAction(state: GameState, action: AiAction): void {
  switch (action.type) {
    case 'move': {
      if (action.piece && action.targetRow !== undefined && action.targetCol !== undefined) {
        movePiece(action.piece, action.targetRow, action.targetCol, state.pieces, state.board);
        updateFog(state.pieces, state.board, PlayerSide.AMBER);
      }
      break;
    }
    case 'summon': {
      if (action.targetRow !== undefined && action.targetCol !== undefined) {
        const result = summonPiece(
          PlayerSide.AMBER,
          action.targetRow,
          action.targetCol,
          state.mana[1],
          state.board,
          state.pieces
        );
        if (result.success) {
          state.mana[1] = result.newMana;
          state.summonAnim = {
            row: action.targetRow,
            col: action.targetCol,
            progress: 0,
          };
          spawnSummonParticles(state, action.targetRow, action.targetCol, COLORS.amber);
          state.scores = countSpiritNodes(state.board);
        }
      }
      break;
    }
    case 'vine': {
      if (action.targetPiece) {
        const result = castVine(PlayerSide.AMBER, action.targetPiece, state.mana[1]);
        if (result.success) {
          state.mana[1] = result.newMana;
          state.vineAnim = {
            row: action.targetPiece.row,
            col: action.targetPiece.col,
            progress: 0,
          };
        }
      }
      break;
    }
    case 'endTurn':
      endTurn(state);
      break;
  }
}

export function endTurn(state: GameState): void {
  // Check game over
  if (state.turn >= state.maxTurns && state.currentSide === PlayerSide.AMBER) {
    state.phase = GamePhase.GAME_OVER;
    const [g, a] = countSpiritNodes(state.board);
    state.scores = [g, a];
    state.winner = g > a ? PlayerSide.GREEN : a > g ? PlayerSide.AMBER : null;
    return;
  }

  // Switch side
  if (state.currentSide === PlayerSide.GREEN) {
    state.currentSide = PlayerSide.AMBER;
    state.mana[1] = Math.min(MAX_MANA, state.mana[1] + 1);
  } else {
    state.currentSide = PlayerSide.GREEN;
    state.turn++;
    state.mana[0] = Math.min(MAX_MANA, state.mana[0] + 1);
  }

  decrementEntangle(state.pieces);
  state.selectedPiece = null;
  state.selectedCell = null;
  state.phase = GamePhase.TURN_TRANSITION;
  state.transitionTimer = TURN_TRANSITION_DURATION;
  state.transitionAlpha = 0;

  if (state.turn > state.maxTurns) {
    state.phase = GamePhase.GAME_OVER;
    const [g, a] = countSpiritNodes(state.board);
    state.scores = [g, a];
    state.winner = g > a ? PlayerSide.GREEN : a > g ? PlayerSide.AMBER : null;
  }
}

export function handleClick(
  canvasX: number,
  canvasY: number,
  state: GameState,
  boardOriginX: number,
  boardOriginY: number
): void {
  if (state.phase !== GamePhase.PLAYER_TURN) return;

  const buttons = getButtons(state, boardOriginX, boardOriginY);
  for (const btn of buttons) {
    if (
      canvasX >= btn.x && canvasX <= btn.x + btn.w &&
      canvasY >= btn.y && canvasY <= btn.y + btn.h &&
      btn.enabled
    ) {
      handleButtonClick(btn.action, state);
      return;
    }
  }

  const col = Math.floor((canvasX - boardOriginX) / (CELL_SIZE + CELL_GAP));
  const row = Math.floor((canvasY - boardOriginY) / (CELL_SIZE + CELL_GAP));

  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    state.selectedPiece = null;
    state.selectedCell = null;
    return;
  }

  const cell = state.board[row][col];
  if (cell.fogAlpha > 0.7) {
    state.selectedPiece = null;
    state.selectedCell = null;
    return;
  }

  // If a piece is already selected, try to move
  if (state.selectedPiece) {
    const sp = state.selectedPiece;
    const dr = Math.abs(row - sp.row);
    const dc = Math.abs(col - sp.col);

    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      const success = movePiece(sp, row, col, state.pieces, state.board);
      if (success) {
        updateFog(state.pieces, state.board, PlayerSide.GREEN);
        state.scores = countSpiritNodes(state.board);
        state.selectedPiece = null;
        state.selectedCell = null;
        return;
      }
    }
  }

  // Select a piece
  const piece = getPieceAt(state.pieces, row, col);
  if (piece && piece.side === PlayerSide.GREEN) {
    state.selectedPiece = piece;
    state.selectedCell = { row, col };
  } else if (piece && piece.side === PlayerSide.AMBER && state.selectedPiece) {
    // Try vine cast on enemy piece
    if (state.mana[0] >= VINE_MANA_COST) {
      const result = castVine(PlayerSide.GREEN, piece, state.mana[0]);
      if (result.success) {
        state.mana[0] = result.newMana;
        state.vineAnim = { row: piece.row, col: piece.col, progress: 0 };
        state.selectedPiece = null;
        state.selectedCell = null;
      }
    }
  } else {
    state.selectedPiece = null;
    state.selectedCell = null;
  }
}

function handleButtonClick(action: string, state: GameState): void {
  state.buttonClickAnim = { action, progress: 0 };

  switch (action) {
    case 'endTurn':
      endTurn(state);
      break;
    case 'summon': {
      if (state.selectedCell) {
        const { row, col } = state.selectedCell;
        const result = summonPiece(
          PlayerSide.GREEN,
          row,
          col,
          state.mana[0],
          state.board,
          state.pieces
        );
        if (result.success) {
          state.mana[0] = result.newMana;
          state.summonAnim = { row, col, progress: 0 };
          spawnSummonParticles(state, row, col, COLORS.green);
          state.scores = countSpiritNodes(state.board);
          state.selectedPiece = null;
          state.selectedCell = null;
        }
      }
      break;
    }
    case 'vine': {
      state.selectedCell = null;
      break;
    }
  }
}

export function getButtons(state: GameState, boardX: number, boardY: number): ButtonDef[] {
  const btnY = boardY + BOARD_SIZE * (CELL_SIZE + CELL_GAP) + 20;
  const btnW = 130;
  const btnH = 40;
  const gap = 20;
  const totalW = 3 * btnW + 2 * gap;
  const startX = boardX + (BOARD_SIZE * (CELL_SIZE + CELL_GAP) - totalW) / 2;

  const canSummon =
    state.mana[0] >= SUMMON_MANA_COST &&
    state.selectedCell !== null &&
    state.board[state.selectedCell.row][state.selectedCell.col].type === CellType.SPIRIT &&
    state.board[state.selectedCell.row][state.selectedCell.col].owner === PlayerSide.GREEN &&
    !getPieceAt(state.pieces, state.selectedCell.row, state.selectedCell.col);

  const canVine = state.mana[0] >= VINE_MANA_COST;

  return [
    {
      x: startX,
      y: btnY,
      w: btnW,
      h: btnH,
      text: '结束回合',
      enabled: true,
      action: 'endTurn',
    },
    {
      x: startX + btnW + gap,
      y: btnY,
      w: btnW,
      h: btnH,
      text: `召唤(${SUMMON_MANA_COST} Mana)`,
      enabled: canSummon,
      action: 'summon',
    },
    {
      x: startX + 2 * (btnW + gap),
      y: btnY,
      w: btnW,
      h: btnH,
      text: `藤蔓(${VINE_MANA_COST} Mana)`,
      enabled: canVine,
      action: 'vine',
    },
  ];
}

function spawnSummonParticles(state: GameState, row: number, col: number, color: string): void {
  const cx = col * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
  const cy = row * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
  for (let i = 0; i < 20; i++) {
    const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3;
    const speed = 40 + Math.random() * 60;
    state.particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 600,
      maxLife: 600,
      color,
      size: 3 + Math.random() * 3,
    });
  }
}

export function handleHover(
  canvasX: number,
  canvasY: number,
  state: GameState,
  boardOriginX: number,
  boardOriginY: number
): void {
  const buttons = getButtons(state, boardOriginX, boardOriginY);
  state.hoveredButton = null;
  for (const btn of buttons) {
    if (
      canvasX >= btn.x && canvasX <= btn.x + btn.w &&
      canvasY >= btn.y && canvasY <= btn.y + btn.h
    ) {
      state.hoveredButton = btn.action;
      break;
    }
  }
}

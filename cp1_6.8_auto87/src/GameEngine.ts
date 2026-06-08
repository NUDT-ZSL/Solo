export interface Suggestion {
  x: number;
  y: number;
  winRate: number;
  scoreLead: number;
  order: number;
}

export interface Move {
  x: number;
  y: number;
  color: 'black' | 'white';
  moveNumber: number;
  winRate: number;
  prevWinRate: number;
  scoreLead: number;
  isKeyMoment: boolean;
  suggestions: Suggestion[];
  comment?: string;
  capturedStones: { x: number; y: number }[];
}

export interface Branch {
  name: string;
  moves: Move[];
  startMoveIndex: number;
}

export interface GameState {
  board: (null | 'black' | 'white')[][];
  moves: Move[];
  currentMoveIndex: number;
  branches: Branch[];
  currentBranchIndex: number;
  boardSize: number;
}

const BOARD_SIZE = 19;
const KEY_MOMENT_THRESHOLD = 0.05;

function createEmptyBoard(size: number): (null | 'black' | 'white')[][] {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

function cloneBoard(board: (null | 'black' | 'white')[][]): (null | 'black' | 'white')[][] {
  return board.map(row => [...row]);
}

function getOpponent(color: 'black' | 'white'): 'black' | 'white' {
  return color === 'black' ? 'white' : 'black';
}

function getGroup(
  board: (null | 'black' | 'white')[][],
  x: number,
  y: number,
  size: number
): { stones: { x: number; y: number }[]; liberties: number } {
  const color = board[y][x];
  if (!color) return { stones: [], liberties: 0 };

  const visited = new Set<string>();
  const stones: { x: number; y: number }[] = [];
  const libertySet = new Set<string>();
  const stack = [{ x, y }];

  while (stack.length > 0) {
    const pos = stack.pop()!;
    const key = `${pos.x},${pos.y}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (pos.x < 0 || pos.x >= size || pos.y < 0 || pos.y >= size) continue;

    const cell = board[pos.y][pos.x];
    if (cell === null) {
      libertySet.add(key);
      continue;
    }
    if (cell !== color) continue;

    stones.push(pos);
    stack.push({ x: pos.x + 1, y: pos.y });
    stack.push({ x: pos.x - 1, y: pos.y });
    stack.push({ x: pos.x, y: pos.y + 1 });
    stack.push({ x: pos.x, y: pos.y - 1 });
  }

  return { stones, liberties: libertySet.size };
}

function removeDeadStones(
  board: (null | 'black' | 'white')[][],
  color: 'black' | 'white',
  size: number
): { x: number; y: number }[] {
  const captured: { x: number; y: number }[] = [];
  const visited = new Set<string>();

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const key = `${x},${y}`;
      if (board[y][x] === color && !visited.has(key)) {
        const group = getGroup(board, x, y, size);
        group.stones.forEach(s => visited.add(`${s.x},${s.y}`));
        if (group.liberties === 0) {
          group.stones.forEach(s => {
            board[s.y][s.x] = null;
            captured.push(s);
          });
        }
      }
    }
  }

  return captured;
}

function isLegalMove(
  board: (null | 'black' | 'white')[][],
  x: number,
  y: number,
  color: 'black' | 'white',
  size: number,
  koPoint: { x: number; y: number } | null
): boolean {
  if (x < 0 || x >= size || y < 0 || y >= size) return false;
  if (board[y][x] !== null) return false;
  if (koPoint && koPoint.x === x && koPoint.y === y) return false;

  const testBoard = cloneBoard(board);
  testBoard[y][x] = color;
  const opponent = getOpponent(color);
  removeDeadStones(testBoard, opponent, size);

  const group = getGroup(testBoard, x, y, size);
  if (group.liberties === 0) return false;

  return true;
}

function calculateInfluence(
  board: (null | 'black' | 'white')[][],
  size: number
): number[][] {
  const influence: number[][] = Array.from({ length: size }, () =>
    Array(size).fill(0)
  );
  const radius = 5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] === null) continue;
      const sign = board[y][x] === 'black' ? 1 : -1;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius) {
            influence[ny][nx] += sign * (1 - dist / radius);
          }
        }
      }
    }
  }

  return influence;
}

function estimateWinRate(
  board: (null | 'black' | 'white')[][],
  size: number
): number {
  const influence = calculateInfluence(board, size);
  let blackTerritory = 0;
  let whiteTerritory = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (influence[y][x] > 0.5) blackTerritory++;
      else if (influence[y][x] < -0.5) whiteTerritory++;
      if (board[y][x] === 'black') blackTerritory += 0.5;
      else if (board[y][x] === 'white') whiteTerritory += 0.5;
    }
  }

  const total = blackTerritory + whiteTerritory;
  if (total === 0) return 0.5;
  const komi = 6.5;
  const blackScore = blackTerritory - komi;
  const whiteScore = whiteTerritory + komi;
  const scoreDiff = blackScore - whiteScore;
  return 1 / (1 + Math.exp(-scoreDiff / 15));
}

function generateSuggestions(
  board: (null | 'black' | 'white')[][],
  color: 'black' | 'white',
  size: number,
  winRate: number
): Suggestion[] {
  const candidates: { x: number; y: number; score: number }[] = [];
  const influence = calculateInfluence(board, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] !== null) continue;

      let score = 0;
      let hasNeighbor = false;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
          if (board[ny][nx] !== null) {
            hasNeighbor = true;
            const dist = Math.abs(dx) + Math.abs(dy);
            score += (3 - dist) * 0.3;
          }
        }
      }

      if (!hasNeighbor && y > 2 && y < size - 3 && x > 2 && x < size - 3) {
        score += 0.5;
      }

      score += Math.abs(influence[y][x]) * 0.3;

      const sign = color === 'black' ? 1 : -1;
      if (influence[y][x] * sign > 0.3) score += 0.5;

      if (score > 0) {
        candidates.push({ x, y, score });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  return candidates.slice(0, 3).map((c, i) => ({
    x: c.x,
    y: c.y,
    winRate: Math.max(0, Math.min(1, winRate + (3 - i) * 0.02 * (color === 'black' ? 1 : -1))),
    scoreLead: (3 - i) * 1.5 * (color === 'black' ? 1 : -1),
    order: i + 1,
  }));
}

interface SgfNode {
  properties: Record<string, string[]>;
  children: SgfNode[];
}

function parseSgf(content: string): SgfNode {
  let pos = 0;

  function skipWhitespace() {
    while (pos < content.length && /\s/.test(content[pos])) pos++;
  }

  function parseNode(): SgfNode {
    const node: SgfNode = { properties: {}, children: [] };

    while (pos < content.length) {
      skipWhitespace();
      if (pos >= content.length) break;

      if (content[pos] === ')') break;
      if (content[pos] === '(') {
        pos++;
        const child = parseNode();
        node.children.push(child);
        continue;
      }
      if (content[pos] === ';') {
        pos++;
        skipWhitespace();
      }

      const propMatch = /^[A-Z]+/.exec(content.slice(pos));
      if (!propMatch) break;

      const propName = propMatch[0];
      pos += propName.length;

      while (pos < content.length && content[pos] === '[') {
        pos++;
        let value = '';
        while (pos < content.length && content[pos] !== ']') {
          if (content[pos] === '\\' && pos + 1 < content.length) {
            pos++;
            value += content[pos];
          } else {
            value += content[pos];
          }
          pos++;
        }
        if (pos < content.length) pos++;

        if (!node.properties[propName]) {
          node.properties[propName] = [];
        }
        node.properties[propName].push(value);
      }
    }

    return node;
  }

  skipWhitespace();
  if (content[pos] === '(') pos++;
  if (content[pos] === ';') pos++;
  return parseNode();
}

function sgfCoordToXY(coord: string): { x: number; y: number } | null {
  if (!coord || coord === 'tt' || coord === '') return null;
  const x = coord.charCodeAt(0) - 97;
  const y = coord.charCodeAt(1) - 97;
  if (x < 0 || x >= 19 || y < 0 || y >= 19) return null;
  return { x, y };
}

function traverseSgf(
  node: SgfNode,
  board: (null | 'black' | 'white')[][],
  moves: Move[],
  branches: Branch[],
  moveNumber: number,
  color: 'black' | 'white',
  size: number
): { nextColor: 'black' | 'white'; nextMoveNumber: number } {
  let currentColor = color;
  let currentMoveNumber = moveNumber;

  const props = node.properties;

  if (props.B && props.B[0]) {
    const coord = sgfCoordToXY(props.B[0]);
    if (coord) {
      currentColor = 'black';
    }
  }
  if (props.W && props.W[0]) {
    const coord = sgfCoordToXY(props.W[0]);
    if (coord) {
      currentColor = 'white';
    }
  }

  const moveProp = currentColor === 'black' ? 'B' : 'W';
  const moveCoord = props[moveProp] ? sgfCoordToXY(props[moveProp][0]) : null;

  if (moveCoord) {
    const { x, y } = moveCoord;
    const prevWinRate = moves.length > 0 ? moves[moves.length - 1].winRate : 0.5;

    const testBoard = cloneBoard(board);
    testBoard[y][x] = currentColor;
    const captured = removeDeadStones(testBoard, getOpponent(currentColor), size);

    board[y][x] = currentColor;
    const capturedStones = removeDeadStones(board, getOpponent(currentColor), size);

    const winRate = estimateWinRate(board, size);
    const isKeyMoment = Math.abs(winRate - prevWinRate) >= KEY_MOMENT_THRESHOLD;
    const suggestions = generateSuggestions(board, getOpponent(currentColor), size, winRate);

    const move: Move = {
      x,
      y,
      color: currentColor,
      moveNumber: currentMoveNumber,
      winRate,
      prevWinRate,
      scoreLead: (winRate - 0.5) * 30,
      isKeyMoment,
      suggestions,
      capturedStones,
      comment: props.C ? props.C[0] : undefined,
    };

    moves.push(move);
    currentMoveNumber++;
    currentColor = getOpponent(currentColor);
  }

  if (props.AB) {
    props.AB.forEach(coord => {
      const pos = sgfCoordToXY(coord);
      if (pos) board[pos.y][pos.x] = 'black';
    });
  }
  if (props.AW) {
    props.AW.forEach(coord => {
      const pos = sgfCoordToXY(coord);
      if (pos) board[pos.y][pos.x] = 'white';
    });
  }

  if (node.children.length > 0) {
    const mainChild = node.children[0];
    const result = traverseSgf(mainChild, board, moves, branches, currentMoveNumber, currentColor, size);

    for (let i = 1; i < node.children.length; i++) {
      const branchMoves: Move[] = [];
      const branchBoard = cloneBoard(board);
      const branchName = `变化图 ${branches.length + 1}`;
      const startIdx = moves.length;

      traverseSgf(node.children[i], branchBoard, branchMoves, branches, currentMoveNumber, currentColor, size);

      if (branchMoves.length > 0) {
        branches.push({
          name: branchName,
          moves: branchMoves,
          startMoveIndex: startIdx,
        });
      }
    }

    return result;
  }

  return { nextColor: currentColor, nextMoveNumber: currentMoveNumber };
}

export class GameEngine {
  private state: GameState;

  constructor() {
    this.state = {
      board: createEmptyBoard(BOARD_SIZE),
      moves: [],
      currentMoveIndex: -1,
      branches: [],
      currentBranchIndex: 0,
      boardSize: BOARD_SIZE,
    };
  }

  loadSgf(sgfContent: string): void {
    this.state = {
      board: createEmptyBoard(BOARD_SIZE),
      moves: [],
      currentMoveIndex: -1,
      branches: [],
      currentBranchIndex: 0,
      boardSize: BOARD_SIZE,
    };

    try {
      const root = parseSgf(sgfContent);
      const board = createEmptyBoard(BOARD_SIZE);
      const moves: Move[] = [];
      const branches: Branch[] = [];

      traverseSgf(root, board, moves, branches, 1, 'black', BOARD_SIZE);

      this.state.board = board;
      this.state.moves = moves;
      this.state.branches = branches;

      if (moves.length > 0) {
        this.state.currentMoveIndex = moves.length - 1;
      }
    } catch (e) {
      console.error('SGF parsing error:', e);
    }
  }

  placeStone(x: number, y: number): Move | null {
    if (!isLegalMove(this.state.board, x, y, this.getCurrentColor(), this.state.boardSize, null)) {
      return null;
    }

    const color = this.getCurrentColor();
    const prevWinRate = this.state.moves.length > 0
      ? this.state.moves[this.state.moves.length - 1].winRate
      : 0.5;

    this.state.board[y][x] = color;
    const capturedStones = removeDeadStones(
      this.state.board,
      getOpponent(color),
      this.state.boardSize
    );

    const winRate = estimateWinRate(this.state.board, this.state.boardSize);
    const isKeyMoment = Math.abs(winRate - prevWinRate) >= KEY_MOMENT_THRESHOLD;
    const suggestions = generateSuggestions(
      this.state.board,
      getOpponent(color),
      this.state.boardSize,
      winRate
    );

    const move: Move = {
      x,
      y,
      color,
      moveNumber: this.state.moves.length + 1,
      winRate,
      prevWinRate,
      scoreLead: (winRate - 0.5) * 30,
      isKeyMoment,
      suggestions,
      capturedStones,
    };

    this.state.moves.push(move);
    this.state.currentMoveIndex = this.state.moves.length - 1;

    return move;
  }

  goToMove(index: number): void {
    if (index < -1 || index >= this.state.moves.length) return;

    this.state.board = createEmptyBoard(this.state.boardSize);
    this.state.currentMoveIndex = -1;

    const targetIndex = index + 1;
    for (let i = 0; i < targetIndex && i < this.state.moves.length; i++) {
      const move = this.state.moves[i];
      this.state.board[move.y][move.x] = move.color;
      for (const cap of move.capturedStones) {
        this.state.board[cap.y][cap.x] = null;
      }
    }

    this.state.currentMoveIndex = Math.min(index, this.state.moves.length - 1);
  }

  goForward(): void {
    if (this.state.currentMoveIndex < this.state.moves.length - 1) {
      this.goToMove(this.state.currentMoveIndex + 1);
    }
  }

  goBackward(): void {
    if (this.state.currentMoveIndex > -1) {
      this.goToMove(this.state.currentMoveIndex - 1);
    }
  }

  goToStart(): void {
    this.goToMove(-1);
  }

  goToEnd(): void {
    this.goToMove(this.state.moves.length - 1);
  }

  switchBranch(branchIndex: number): void {
    if (branchIndex < 0 || branchIndex >= this.state.branches.length) return;

    this.state.currentBranchIndex = branchIndex;
    const branch = this.state.branches[branchIndex];

    this.goToMove(branch.startMoveIndex - 1);

    const branchBoard = cloneBoard(this.state.board);
    for (const move of branch.moves) {
      branchBoard[move.y][move.x] = move.color;
      for (const cap of move.capturedStones) {
        branchBoard[cap.y][cap.x] = null;
      }
    }

    this.state.board = branchBoard;
    this.state.currentMoveIndex = branch.startMoveIndex + branch.moves.length - 1;
  }

  getCurrentColor(): 'black' | 'white' {
    if (this.state.moves.length === 0) return 'black';
    const lastMove = this.state.moves[this.state.currentMoveIndex >= 0 ? this.state.currentMoveIndex : this.state.moves.length - 1];
    return lastMove ? getOpponent(lastMove.color) : 'black';
  }

  getBoard(): (null | 'black' | 'white')[][] {
    return this.state.board;
  }

  getMoves(): Move[] {
    return this.state.moves;
  }

  getCurrentMoveIndex(): number {
    return this.state.currentMoveIndex;
  }

  getCurrentMove(): Move | null {
    if (this.state.currentMoveIndex < 0) return null;
    return this.state.moves[this.state.currentMoveIndex];
  }

  getBranches(): Branch[] {
    return this.state.branches;
  }

  getCurrentBranchIndex(): number {
    return this.state.currentBranchIndex;
  }

  getBoardSize(): number {
    return this.state.boardSize;
  }

  getState(): GameState {
    return { ...this.state };
  }
}

import { Board } from '../src/board';
import { PlayerController } from '../src/player';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ ${message}`);
}

function runPlayerTests(): void {
  console.log('=== PlayerController Tests ===\n');

  console.log('1. 初始化测试');
  let board = new Board();
  let playerCtrl = new PlayerController(board, 'pvp');
  assert(playerCtrl.getCurrentPlayer() === 'player1', '初始回合为玩家1');
  assert(playerCtrl.getMode() === 'pvp', '初始模式为双人对战');
  assert(playerCtrl.isAiTurn() === false, '双人模式下非AI回合');
  assert(playerCtrl.getPlayerName('player1') === '玩家1', '玩家1名称正确');
  assert(playerCtrl.getPlayerName('player2') === '玩家2', '玩家2名称正确');

  console.log('\n2. 回合切换测试');
  playerCtrl.switchTurn();
  assert(playerCtrl.getCurrentPlayer() === 'player2', '切换后为玩家2回合');
  playerCtrl.switchTurn();
  assert(playerCtrl.getCurrentPlayer() === 'player1', '再次切换后为玩家1回合');
  playerCtrl.resetTurn();
  assert(playerCtrl.getCurrentPlayer() === 'player1', 'resetTurn后为玩家1回合');

  console.log('\n3. PVP模式落子测试');
  board = new Board();
  playerCtrl = new PlayerController(board, 'pvp');
  assert(playerCtrl.handlePlayerMove(0, 0) === true, '玩家1可落子');
  assert(board.getCell(0, 0) === 'player1', '落子正确');
  playerCtrl.switchTurn();
  assert(playerCtrl.handlePlayerMove(1, 1) === true, '玩家2可落子');
  assert(board.getCell(1, 1) === 'player2', '玩家2落子正确');

  console.log('\n4. PVE模式AI回合测试');
  board = new Board();
  playerCtrl = new PlayerController(board, 'pve');
  assert(playerCtrl.getCurrentPlayer() === 'player1', 'PVE初始回合为玩家1');
  assert(playerCtrl.isAiTurn() === false, '玩家1回合非AI回合');
  assert(playerCtrl.handlePlayerMove(0, 0) === true, 'PVE中玩家1可落子');
  assert(playerCtrl.getPlayerName('player2') === 'AI', 'PVE中玩家2名称为AI');

  playerCtrl.switchTurn();
  assert(playerCtrl.getCurrentPlayer() === 'player2', '切换后为AI回合');
  assert(playerCtrl.isAiTurn() === true, '玩家2回合为AI回合');
  assert(playerCtrl.handlePlayerMove(1, 1) === false, 'AI回合时玩家不能操作');
  assert(board.getCell(1, 1) === null, '玩家不能在AI回合落子');

  console.log('\n5. PVE模式AI落子测试');
  board = new Board();
  playerCtrl = new PlayerController(board, 'pve');
  playerCtrl.switchTurn();
  let aiMoveCalled = false;
  playerCtrl.scheduleAiMove((_row, _col) => {
    aiMoveCalled = true;
  });
  playerCtrl.clearAiTimer();
  assert(aiMoveCalled === false, 'clearAiTimer后AI落子回调不会执行');

  board = new Board();
  for (let i = 0; i < 8; i++) {
    const r = Math.floor(i / 3);
    const c = i % 3;
    board.placePiece(r, c, 'player1');
  }
  playerCtrl = new PlayerController(board, 'pve');
  playerCtrl.switchTurn();
  assert(playerCtrl.isAiTurn() === true, 'AI回合');
  const emptyCells = board.getEmptyCells();
  assert(emptyCells.length === 1, '只剩1个空位');

  console.log('\n6. 模式切换测试');
  board = new Board();
  playerCtrl = new PlayerController(board, 'pvp');
  playerCtrl.switchTurn();
  assert(playerCtrl.getCurrentPlayer() === 'player2', '切换到玩家2');
  playerCtrl.setMode('pve');
  assert(playerCtrl.getMode() === 'pve', '模式切换为PVE');
  assert(playerCtrl.getCurrentPlayer() === 'player1', '切换模式后重置为玩家1回合');
  playerCtrl.setMode('pvp');
  assert(playerCtrl.getMode() === 'pvp', '模式切换回PVP');

  console.log('\n=== 所有PlayerController测试通过! ===\n');
}

runPlayerTests();

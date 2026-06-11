import { Board, GRID_SIZE } from '../src/board';
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`✓ ${message}`);
}
function runBoardTests() {
    console.log('=== Board Tests ===\n');
    let board = new Board();
    console.log('1. 初始化测试');
    const emptyState = board.getState();
    assert(emptyState.length === GRID_SIZE, '棋盘行数为3');
    assert(emptyState[0].length === GRID_SIZE, '棋盘列数为3');
    assert(emptyState.every(row => row.every(cell => cell === null)), '初始棋盘为空');
    assert(board.isFull() === false, '初始棋盘未满');
    assert(board.getEmptyCells().length === 9, '初始有9个空位');
    assert(board.checkWin() === null, '初始无胜者');
    assert(board.getResult() === null, '初始无结果');
    console.log('\n2. 落子测试');
    board = new Board();
    assert(board.placePiece(0, 0, 'player1') === true, '玩家1可落子(0,0)');
    assert(board.getCell(0, 0) === 'player1', '(0,0)位置为玩家1');
    assert(board.placePiece(0, 0, 'player2') === false, '已有棋子位置不能再落子');
    assert(board.placePiece(-1, 0, 'player1') === false, '越界行不能落子');
    assert(board.placePiece(0, 3, 'player1') === false, '越界列不能落子');
    assert(board.getEmptyCells().length === 8, '落子后剩8个空位');
    console.log('\n3. 胜负判定测试');
    board = new Board();
    board.placePiece(0, 0, 'player1');
    board.placePiece(0, 1, 'player1');
    board.placePiece(0, 2, 'player1');
    let winInfo = board.checkWin();
    assert(winInfo !== null, '横排三连能检测到胜利');
    assert(winInfo.winner === 'player1', '横排三连胜者为玩家1');
    assert(board.getResult() === 'player1', 'getResult返回玩家1');
    board = new Board();
    board.placePiece(0, 0, 'player2');
    board.placePiece(1, 0, 'player2');
    board.placePiece(2, 0, 'player2');
    winInfo = board.checkWin();
    assert(winInfo !== null, '竖排三连能检测到胜利');
    assert(winInfo.winner === 'player2', '竖排三连胜者为玩家2');
    board = new Board();
    board.placePiece(0, 0, 'player1');
    board.placePiece(1, 1, 'player1');
    board.placePiece(2, 2, 'player1');
    winInfo = board.checkWin();
    assert(winInfo !== null, '主对角线三连能检测到胜利');
    assert(winInfo.winner === 'player1', '主对角线三连胜者为玩家1');
    assert(winInfo.line.length === 3, '获胜线包含3个位置');
    board = new Board();
    board.placePiece(0, 2, 'player2');
    board.placePiece(1, 1, 'player2');
    board.placePiece(2, 0, 'player2');
    winInfo = board.checkWin();
    assert(winInfo !== null, '副对角线三连能检测到胜利');
    assert(winInfo.winner === 'player2', '副对角线三连胜者为玩家2');
    console.log('\n4. 平局测试');
    board = new Board();
    board.placePiece(0, 0, 'player1');
    board.placePiece(0, 1, 'player2');
    board.placePiece(0, 2, 'player1');
    board.placePiece(1, 0, 'player1');
    board.placePiece(1, 1, 'player2');
    board.placePiece(1, 2, 'player1');
    board.placePiece(2, 0, 'player2');
    board.placePiece(2, 1, 'player1');
    board.placePiece(2, 2, 'player2');
    assert(board.isFull() === true, '棋盘已满');
    assert(board.checkWin() === null, '满盘但无三连时无胜者');
    assert(board.getResult() === 'draw', '满盘无胜者为平局');
    console.log('\n5. 熵变重置（shuffle）测试');
    board = new Board();
    board.placePiece(0, 0, 'player1');
    board.placePiece(1, 1, 'player2');
    board.placePiece(2, 2, 'player1');
    const countsBefore = board.getPieceCounts();
    assert(countsBefore.player1 === 2, '重置前玩家1有2个棋子');
    assert(countsBefore.player2 === 1, '重置前玩家2有1个棋子');
    board.shuffle();
    const countsAfter = board.getPieceCounts();
    assert(countsAfter.player1 === 2, '重置后玩家1仍有2个棋子（数量不变）');
    assert(countsAfter.player2 === 1, '重置后玩家2仍有1个棋子（数量不变）');
    let hasDifferentPosition = false;
    const positions = {};
    positions['0-0'] = 'player1';
    positions['1-1'] = 'player2';
    positions['2-2'] = 'player1';
    const state = board.getState();
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const key = `${r}-${c}`;
            if (positions[key] !== undefined && state[r][c] !== positions[key]) {
                hasDifferentPosition = true;
            }
        }
    }
    console.log(`  (随机性测试: 棋子位置变化=${hasDifferentPosition} - 有时可能不变，属正常)`);
    board = new Board();
    board.placePiece(0, 0, 'player1');
    board.placePiece(1, 1, 'player1');
    board.placePiece(2, 2, 'player1');
    board.placePiece(0, 1, 'player2');
    const beforeCounts = board.getPieceCounts();
    for (let i = 0; i < 20; i++) {
        board.shuffle();
    }
    const afterCounts = board.getPieceCounts();
    assert(afterCounts.player1 === beforeCounts.player1, '多次重置后玩家1棋子数量始终不变');
    assert(afterCounts.player2 === beforeCounts.player2, '多次重置后玩家2棋子数量始终不变');
    console.log('\n6. 重置棋盘测试');
    board = new Board();
    board.placePiece(0, 0, 'player1');
    board.placePiece(1, 1, 'player2');
    board.resetBoard();
    assert(board.getEmptyCells().length === 9, 'resetBoard后棋盘为空');
    assert(board.checkWin() === null, 'resetBoard后无胜者');
    console.log('\n=== 所有Board测试通过! ===\n');
}
runBoardTests();

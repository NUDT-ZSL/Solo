export class PlayerController {
    constructor(board, mode = 'pvp') {
        this.aiDelay = 500;
        this.aiTimer = null;
        this.board = board;
        this.mode = mode;
        this.currentPlayer = 'player1';
    }
    getMode() {
        return this.mode;
    }
    setMode(mode) {
        this.mode = mode;
        this.resetTurn();
        this.clearAiTimer();
    }
    getCurrentPlayer() {
        return this.currentPlayer;
    }
    switchTurn() {
        this.currentPlayer = this.currentPlayer === 'player1' ? 'player2' : 'player1';
    }
    resetTurn() {
        this.currentPlayer = 'player1';
        this.clearAiTimer();
    }
    handlePlayerMove(row, col) {
        if (this.mode === 'pve' && this.currentPlayer === 'player2') {
            return false;
        }
        return this.makeMove(row, col);
    }
    handleAiMove(row, col) {
        if (this.mode !== 'pve' || this.currentPlayer !== 'player2') {
            return false;
        }
        return this.makeMove(row, col);
    }
    makeMove(row, col) {
        return this.board.placePiece(row, col, this.currentPlayer);
    }
    isAiTurn() {
        return this.mode === 'pve' && this.currentPlayer === 'player2';
    }
    scheduleAiMove(callback) {
        this.clearAiTimer();
        const emptyCells = this.board.getEmptyCells();
        if (emptyCells.length === 0)
            return;
        this.aiTimer = window.setTimeout(() => {
            const randomIndex = Math.floor(Math.random() * emptyCells.length);
            const [row, col] = emptyCells[randomIndex];
            callback(row, col);
            this.aiTimer = null;
        }, this.aiDelay);
    }
    clearAiTimer() {
        if (this.aiTimer !== null) {
            clearTimeout(this.aiTimer);
            this.aiTimer = null;
        }
    }
    getPlayerName(player) {
        if (this.mode === 'pve' && player === 'player2') {
            return 'AI';
        }
        return player === 'player1' ? '玩家1' : '玩家2';
    }
}

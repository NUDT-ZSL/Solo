export const PLAYER1_COLOR = '#4FC3F7';
export const PLAYER2_COLOR = '#FF7043';
export const GRID_SIZE = 3;
export class Board {
    constructor() {
        this.state = this.createEmptyState();
    }
    createEmptyState() {
        return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }).fill(null));
    }
    getState() {
        return this.state.map(row => [...row]);
    }
    getCell(row, col) {
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
            return null;
        }
        return this.state[row][col];
    }
    placePiece(row, col, player) {
        if (this.getCell(row, col) !== null) {
            return false;
        }
        this.state[row][col] = player;
        return true;
    }
    isFull() {
        return this.state.every(row => row.every(cell => cell !== null));
    }
    getEmptyCells() {
        const cells = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (this.state[r][c] === null) {
                    cells.push([r, c]);
                }
            }
        }
        return cells;
    }
    resetBoard() {
        this.state = this.createEmptyState();
    }
    shuffle() {
        const pieces = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                pieces.push(this.state[r][c]);
            }
        }
        for (let i = pieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }
        let idx = 0;
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                this.state[r][c] = pieces[idx++];
            }
        }
    }
    checkWin() {
        const lines = [
            [[0, 0], [0, 1], [0, 2]],
            [[1, 0], [1, 1], [1, 2]],
            [[2, 0], [2, 1], [2, 2]],
            [[0, 0], [1, 0], [2, 0]],
            [[0, 1], [1, 1], [2, 1]],
            [[0, 2], [1, 2], [2, 2]],
            [[0, 0], [1, 1], [2, 2]],
            [[0, 2], [1, 1], [2, 0]],
        ];
        for (const line of lines) {
            const [a, b, c] = line;
            const piece = this.state[a[0]][a[1]];
            if (piece && piece === this.state[b[0]][b[1]] && piece === this.state[c[0]][c[1]]) {
                return { winner: piece, line };
            }
        }
        return null;
    }
    getResult() {
        const winInfo = this.checkWin();
        if (winInfo) {
            return winInfo.winner;
        }
        if (this.isFull()) {
            return 'draw';
        }
        return null;
    }
    getPieceCounts() {
        let player1 = 0;
        let player2 = 0;
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (this.state[r][c] === 'player1')
                    player1++;
                if (this.state[r][c] === 'player2')
                    player2++;
            }
        }
        return { player1, player2 };
    }
}
export function getPlayerColor(player) {
    return player === 'player1' ? PLAYER1_COLOR : PLAYER2_COLOR;
}

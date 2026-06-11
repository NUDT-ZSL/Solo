"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const board_1 = require("./board");
const player_1 = require("./player");
const effect_1 = require("./effect");
class Game {
    constructor() {
        this.lastTime = 0;
        this.animationId = 0;
        this.cellSize = 0;
        this.boardOffsetX = 0;
        this.boardOffsetY = 0;
        this.padding = 20;
        this.gridGap = 8;
        this.frameCount = 0;
        this.fpsUpdateTime = 0;
        this.canvas = document.getElementById('gameCanvas');
        const ctx = this.canvas.getContext('2d');
        if (!ctx)
            throw new Error('Failed to get canvas context');
        this.ctx = ctx;
        this.board = new board_1.Board();
        this.playerController = new player_1.PlayerController(this.board, 'pvp');
        this.effectSystem = new effect_1.EffectSystem();
        this.state = 'playing';
        this.scores = { player1: 0, player2: 0 };
        this.turnDotElement = document.getElementById('turnDot');
        this.turnTextElement = document.getElementById('turnText');
        this.player1ScoreElement = document.getElementById('player1Score');
        this.player2ScoreElement = document.getElementById('player2Score');
        this.modeToggleElement = document.getElementById('modeToggle');
        this.resetBtnElement = document.getElementById('resetBtn');
        this.gameResultElement = document.getElementById('gameResult');
        this.resultTextElement = document.getElementById('resultText');
        this.resizeCanvas();
        this.bindEvents();
        this.updateUI();
        this.startGameLoop();
    }
    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        const displaySize = rect.width;
        this.cellSize = (displaySize - this.padding * 2 - this.gridGap * 2) / board_1.GRID_SIZE;
        this.boardOffsetX = this.padding;
        this.boardOffsetY = this.padding;
    }
    bindEvents() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleClick(touch);
        }, { passive: false });
        this.modeToggleElement.addEventListener('click', () => this.toggleMode());
        this.resetBtnElement.addEventListener('click', () => this.resetGame());
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    handleClick(e) {
        if (this.state !== 'playing')
            return;
        if (this.playerController.isAiTurn())
            return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const boardWidth = board_1.GRID_SIZE * this.cellSize + (board_1.GRID_SIZE - 1) * this.gridGap;
        const boardHeight = board_1.GRID_SIZE * this.cellSize + (board_1.GRID_SIZE - 1) * this.gridGap;
        if (x < this.boardOffsetX || x > this.boardOffsetX + boardWidth ||
            y < this.boardOffsetY || y > this.boardOffsetY + boardHeight) {
            return;
        }
        const offsetX = x - this.boardOffsetX;
        const offsetY = y - this.boardOffsetY;
        const cellWithGap = this.cellSize + this.gridGap;
        const col = Math.floor(offsetX / cellWithGap);
        const row = Math.floor(offsetY / cellWithGap);
        if (row < 0 || row >= board_1.GRID_SIZE || col < 0 || col >= board_1.GRID_SIZE)
            return;
        const cellInnerX = offsetX - col * cellWithGap;
        const cellInnerY = offsetY - row * cellWithGap;
        if (cellInnerX < 0 || cellInnerX > this.cellSize || cellInnerY < 0 || cellInnerY > this.cellSize) {
            return;
        }
        this.processMove(row, col);
    }
    processMove(row, col) {
        if (this.board.getCell(row, col) !== null)
            return;
        const success = this.playerController.handlePlayerMove(row, col);
        if (!success)
            return;
        this.effectSystem.startPieceAnimation(row, col);
        setTimeout(() => {
            this.handlePostMove();
        }, 200);
    }
    handlePostMove() {
        const result = this.checkGameResult();
        if (result) {
            this.handleGameResult(result);
            return;
        }
        this.triggerReset(() => {
            const resultAfterReset = this.checkGameResult();
            if (resultAfterReset) {
                this.handleGameResult(resultAfterReset);
                return;
            }
            this.finishTurn();
        });
    }
    finishTurn() {
        this.playerController.switchTurn();
        this.updateUI();
        if (this.playerController.isAiTurn() && this.state === 'playing') {
            this.playerController.scheduleAiMove((row, col) => {
                this.processAiMove(row, col);
            });
        }
    }
    processAiMove(row, col) {
        if (this.state !== 'playing')
            return;
        if (this.board.getCell(row, col) !== null)
            return;
        const success = this.playerController.handleAiMove(row, col);
        if (!success)
            return;
        this.effectSystem.startPieceAnimation(row, col);
        setTimeout(() => {
            this.handlePostMove();
        }, 200);
    }
    checkGameResult() {
        const winInfo = this.board.checkWin();
        if (winInfo)
            return winInfo;
        if (this.board.isFull())
            return 'draw';
        return null;
    }
    handleGameResult(result) {
        this.state = 'gameOver';
        if (result !== 'draw') {
            this.effectSystem.startVictoryGlow(result.line);
            if (result.winner === 'player1') {
                this.scores.player1++;
            }
            else {
                this.scores.player2++;
            }
            this.updateScoreUI();
            if (this.scores.player1 >= 2 || this.scores.player2 >= 2) {
                this.state = 'matchOver';
                this.showMatchResult(result.winner);
                return;
            }
        }
        this.showRoundResult(result);
    }
    showRoundResult(result) {
        let text = '';
        if (result === 'draw') {
            text = '平局！';
        }
        else {
            text = `${this.playerController.getPlayerName(result.winner)} 获胜！`;
        }
        this.resultTextElement.textContent = text;
        this.gameResultElement.classList.remove('hidden');
        setTimeout(() => {
            if (this.state === 'gameOver') {
                this.startNewRound();
            }
        }, 2000);
    }
    showMatchResult(winner) {
        const name = this.playerController.getPlayerName(winner);
        this.resultTextElement.textContent = `${name} 最终获胜！`;
        this.gameResultElement.classList.remove('hidden');
    }
    startNewRound() {
        this.gameResultElement.classList.add('hidden');
        this.board.resetBoard();
        this.effectSystem.clearAll();
        this.playerController.resetTurn();
        this.state = 'playing';
        this.updateUI();
    }
    triggerReset(callback) {
        this.state = 'resetting';
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        this.effectSystem.spawnBurstParticles(centerX, centerY, 40);
        this.effectSystem.startBoardFadeOut();
        const FADE_DURATION = 300;
        setTimeout(() => {
            this.board.shuffle();
            this.effectSystem.clearPieceAnimations();
            this.effectSystem.startBoardFadeIn();
            setTimeout(() => {
                this.state = 'playing';
                callback();
            }, FADE_DURATION);
        }, FADE_DURATION);
    }
    toggleMode() {
        const newMode = this.playerController.getMode() === 'pvp' ? 'pve' : 'pvp';
        this.playerController.setMode(newMode);
        this.modeToggleElement.textContent = newMode === 'pvp' ? '双人对战' : '人机对战';
        this.resetGame();
    }
    resetGame() {
        this.board.resetBoard();
        this.effectSystem.clearAll();
        this.playerController.resetTurn();
        this.scores = { player1: 0, player2: 0 };
        this.state = 'playing';
        this.gameResultElement.classList.add('hidden');
        this.updateUI();
        this.updateScoreUI();
    }
    updateUI() {
        const currentPlayer = this.playerController.getCurrentPlayer();
        this.turnDotElement.className = `turn-dot ${currentPlayer}`;
        this.turnTextElement.textContent = `${this.playerController.getPlayerName(currentPlayer)} 回合`;
    }
    updateScoreUI() {
        this.player1ScoreElement.textContent = String(this.scores.player1);
        this.player2ScoreElement.textContent = String(this.scores.player2);
    }
    startGameLoop() {
        this.lastTime = performance.now();
        const loop = (time) => {
            const deltaTime = Math.min(time - this.lastTime, 50);
            this.lastTime = time;
            this.updateFPS(deltaTime);
            this.effectSystem.update(deltaTime);
            this.render();
            this.animationId = requestAnimationFrame(loop);
        };
        this.animationId = requestAnimationFrame(loop);
    }
    updateFPS(deltaTime) {
        this.frameCount++;
        this.fpsUpdateTime += deltaTime;
        if (this.fpsUpdateTime >= 1000) {
            Math.round(this.frameCount * 1000 / this.fpsUpdateTime);
            this.frameCount = 0;
            this.fpsUpdateTime = 0;
        }
    }
    render() {
        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        this.ctx.clearRect(0, 0, width, height);
        this.drawBackground(width, height);
        this.drawBoard(width, height);
        this.drawPieces();
        this.drawVictoryGlow();
        this.drawParticles();
        this.drawFPS(width, height);
    }
    drawBackground(width, height) {
        const gradient = this.ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 1.5);
        gradient.addColorStop(0, 'rgba(74, 59, 26, 0.3)');
        gradient.addColorStop(1, 'rgba(13, 13, 13, 0.1)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);
    }
    drawBoard(_width, _height) {
        const boardOpacity = this.effectSystem.getBoardOpacity();
        for (let row = 0; row < board_1.GRID_SIZE; row++) {
            for (let col = 0; col < board_1.GRID_SIZE; col++) {
                const x = this.boardOffsetX + col * (this.cellSize + this.gridGap);
                const y = this.boardOffsetY + row * (this.cellSize + this.gridGap);
                this.ctx.save();
                this.ctx.globalAlpha = 0.7 * boardOpacity;
                this.ctx.fillStyle = '#2A1F0D';
                this.ctx.beginPath();
                this.roundRect(x, y, this.cellSize, this.cellSize, 8);
                this.ctx.fill();
                this.ctx.globalAlpha = boardOpacity;
                this.ctx.shadowColor = '#D4AF37';
                this.ctx.shadowBlur = 10;
                this.ctx.strokeStyle = '#D4AF37';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.roundRect(x, y, this.cellSize, this.cellSize, 8);
                this.ctx.stroke();
                this.ctx.restore();
            }
        }
    }
    drawPieces() {
        const boardOpacity = this.effectSystem.getBoardOpacity();
        const state = this.board.getState();
        for (let row = 0; row < board_1.GRID_SIZE; row++) {
            for (let col = 0; col < board_1.GRID_SIZE; col++) {
                const piece = state[row][col];
                if (!piece)
                    continue;
                const scale = this.effectSystem.getPieceScale(row, col);
                const x = this.boardOffsetX + col * (this.cellSize + this.gridGap) + this.cellSize / 2;
                const y = this.boardOffsetY + row * (this.cellSize + this.gridGap) + this.cellSize / 2;
                const radius = 30 * scale;
                this.ctx.save();
                this.ctx.globalAlpha = boardOpacity;
                this.ctx.shadowColor = (0, board_1.getPlayerColor)(piece);
                this.ctx.shadowBlur = 15;
                this.ctx.fillStyle = (0, board_1.getPlayerColor)(piece);
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }
        }
    }
    drawVictoryGlow() {
        const glow = this.effectSystem.getVictoryGlow();
        if (glow.intensity <= 0 || !glow.line)
            return;
        const firstCell = glow.line[0];
        const lastCell = glow.line[2];
        const x1 = this.boardOffsetX + firstCell[1] * (this.cellSize + this.gridGap) + this.cellSize / 2;
        const y1 = this.boardOffsetY + firstCell[0] * (this.cellSize + this.gridGap) + this.cellSize / 2;
        const x2 = this.boardOffsetX + lastCell[1] * (this.cellSize + this.gridGap) + this.cellSize / 2;
        const y2 = this.boardOffsetY + lastCell[0] * (this.cellSize + this.gridGap) + this.cellSize / 2;
        const winInfo = this.board.checkWin();
        if (!winInfo)
            return;
        this.ctx.save();
        this.ctx.globalAlpha = glow.intensity * 0.6;
        this.ctx.strokeStyle = (0, board_1.getPlayerColor)(winInfo.winner);
        this.ctx.lineWidth = 6;
        this.ctx.lineCap = 'round';
        this.ctx.shadowColor = (0, board_1.getPlayerColor)(winInfo.winner);
        this.ctx.shadowBlur = 20;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        this.ctx.restore();
    }
    drawParticles() {
        const particles = this.effectSystem.getParticles();
        for (const p of particles) {
            const alpha = p.life / p.maxLife;
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 5;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }
    drawFPS(_width, _height) {
        return;
    }
    roundRect(x, y, w, h, r) {
        this.ctx.moveTo(x + r, y);
        this.ctx.lineTo(x + w - r, y);
        this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        this.ctx.lineTo(x + w, y + h - r);
        this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.ctx.lineTo(x + r, y + h);
        this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        this.ctx.lineTo(x, y + r);
        this.ctx.quadraticCurveTo(x, y, x + r, y);
    }
    destroy() {
        cancelAnimationFrame(this.animationId);
        this.playerController.clearAiTimer();
    }
}
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
